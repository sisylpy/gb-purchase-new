/**
 * AI 模块统一 API 接口（主包）
 * 对应后端控制器: AiRunController, AiConversationController
 *
 * 放置于主包 services，供主包页面与子包 shim（subPackage-ai/services/api.js）共用；
 * 主包页面禁止 require 分包内 JS，故逻辑在此落地。
 *
 * 接口清单:
 * ====== AI 对话（新版 Run + SSE） ======
 * createAiRun(payload)              - POST /ai/runs 创建 Run（首轮不传 conversationId 自动建会话）
 * connectAiRunSse(runId, handlers)  - GET  /ai/runs/{runId}/events（SSE 命名事件流）
 * stopAiRun(runId)                  - POST /ai/runs/{runId}/stop 停止生成
 * listConversations(userId, page, pageSize) - GET /ai/conversations 会话列表
 * getConversationMessages(convId, userId)   - GET /ai/conversations/{id}/messages 会话消息
 *
 * ====== 营业额统计 (ai/daily-revenue) ======
 * getRevenueStats(departmentId[, { startDate, endDate }]) - 获取营业额统计
 */

var request = require('../lib/request');

// ============================================================
// 通用工具
// ============================================================

var LOG_SSE = '[AI SSE]';

/** 为 true 时打印每条 chunk，默认关 */
var AI_SSE_DEBUG_CHUNK = false;

/**
 * 找到 bytes 中最后一个完整 UTF-8 字符的结束位置
 * @returns {number} 完整字节的数量（剩余字节是不完整的尾部）
 */
function findUtf8CutPoint(bytes) {
  var i = bytes.length - 1;
  while (i >= 0) {
    var b = bytes[i];
    if (b < 0x80) {
      return bytes.length;
    }
    if (b >= 0xC0) {
      var need = b >= 0xF0 ? 4 : b >= 0xE0 ? 3 : 2;
      if (bytes.length - i >= need) {
        return bytes.length;
      }
      return i;
    }
    i--;
  }
  return 0;
}

/**
 * UTF-8 流式解码（避免多字节字符跨 chunk 截断）
 */
function createUtf8StreamDecoder() {
  if (typeof TextDecoder !== 'undefined') {
    var dec = new TextDecoder('utf-8');
    return {
      push: function (bin) {
        var u8 = bin instanceof Uint8Array ? bin : new Uint8Array(bin);
        return dec.decode(u8, { stream: true });
      },
      end: function () {
        return dec.decode();
      },
    };
  }

  var tail = [];

  function bytesToString(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) {
      s += String.fromCharCode(bytes[i]);
    }
    try {
      return decodeURIComponent(escape(s));
    } catch (e) {
      console.warn(LOG_SSE, 'fallback UTF-8 decode error', e);
      return s;
    }
  }

  return {
    push: function (bin) {
      var bytes = bin instanceof Uint8Array ? bin : new Uint8Array(bin);

      if (tail.length) {
        var combined = new Uint8Array(tail.length + bytes.length);
        combined.set(tail, 0);
        combined.set(bytes, tail.length);
        bytes = combined;
        tail = [];
      }

      var cut = findUtf8CutPoint(bytes);
      if (cut < bytes.length) {
        tail = Array.from(bytes.slice(cut));
        bytes = bytes.slice(0, cut);
      }

      return bytesToString(bytes);
    },
    end: function () {
      if (!tail.length) return '';
      var result = bytesToString(tail);
      tail = [];
      return result;
    },
  };
}

function utf8ChunkToString(decoder, raw) {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string') return raw;
  var u8;
  if (raw instanceof ArrayBuffer) {
    u8 = new Uint8Array(raw);
  } else if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView && ArrayBuffer.isView(raw)) {
    u8 = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
  } else {
    try {
      u8 = new Uint8Array(raw);
    } catch (e) {
      console.warn(LOG_SSE, '无法解码 chunk，类型:', typeof raw, e);
      return '';
    }
  }
  return decoder.push(u8);
}

// ============================================================
// AI Run（新版）
// ============================================================

/**
 * 创建 AI Run
 * POST /ai/runs
 * @param {{ userId: number, departmentId?: number, distributerId?: number, scopeMode?: string, conversationId?: number, message: string }} payload
 * @returns {Promise<{ runId: number, conversationId?: number, status?: string }>}
 */
var createAiRun = function (payload) {
  return request.post('ai/runs', payload).then(function (res) {
    var result = res.result;
    // 兼容 CommonResult 包装
    var raw = result;
    if (raw && raw.code !== undefined && raw.data !== undefined) {
      raw = raw.data;
    }
    // 解析 runId / conversationId / messageId
    var runIdRaw = raw.runId || raw.run_id;
    var runId = typeof runIdRaw === 'number' ? runIdRaw : Number(runIdRaw);
    if (!runId || isNaN(runId)) {
      throw new Error('创建 Run 失败：响应中缺少 runId');
    }
    var cidRaw = raw.conversationId || raw.conversation_id;
    var conversationId;
    if (cidRaw !== undefined && cidRaw !== null) {
      var n = typeof cidRaw === 'number' ? cidRaw : Number(cidRaw);
      if (!isNaN(n)) conversationId = n;
    }
    var msgIdRaw = raw.messageId || raw.message_id || raw.assistantMessageId || raw.assistant_message_id;
    var messageId;
    if (msgIdRaw !== undefined && msgIdRaw !== null) {
      var m = typeof msgIdRaw === 'number' ? msgIdRaw : Number(msgIdRaw);
      if (!isNaN(m)) messageId = m;
    }
    var status = typeof raw.status === 'string' ? raw.status : undefined;
    return { runId: runId, conversationId: conversationId, status: status, messageId: messageId };
  });
};

/**
 * 停止 AI Run
 * POST /ai/runs/{runId}/stop
 */
var stopAiRun = function (runId) {
  return request.post('ai/runs/' + runId + '/stop', {});
};

// ============================================================
// 会话列表 & 消息（新版）
// ============================================================

/**
 * 获取会话列表
 * GET /ai/conversations?userId=&page=&pageSize=
 */
var listConversations = function (userId, page, pageSize) {
  page = page || 1;
  pageSize = pageSize || 20;
  return request.get('ai/conversations', {
    userId: userId,
    page: page,
    pageSize: pageSize,
  }, { showErrorToast: false }).then(function (res) {
    var result = res.result;
    // 兼容 CommonResult 包装
    var body = result;
    if (body && body.code !== undefined && body.data !== undefined) {
      body = body.data;
    }
    var items = [];
    var total = 0;
    if (body && Array.isArray(body.items)) {
      items = body.items;
      total = body.total || items.length;
    } else if (Array.isArray(body)) {
      items = body;
      total = body.length;
    }
    return { items: items, total: total, page: page, pageSize: pageSize };
  });
};

/**
 * 获取某个会话的消息
 * GET /ai/conversations/{conversationId}/messages?userId=
 */
var getConversationMessages = function (conversationId, userId) {
  return request.get('ai/conversations/' + conversationId + '/messages', {
    userId: userId,
  }, { showErrorToast: false }).then(function (res) {
    var result = res.result;
    // 兼容 CommonResult 包装
    var body = result;
    if (body && body.code !== undefined && body.data !== undefined) {
      body = body.data;
    }
    var messages = [];
    var cid = conversationId;
    if (body && Array.isArray(body.messages)) {
      messages = body.messages;
      if (body.conversationId) cid = body.conversationId;
    } else if (Array.isArray(body)) {
      messages = body;
    }
    return { conversationId: cid, messages: messages };
  });
};

// ============================================================
// SSE 连接（新版命名事件）
// ============================================================

/**
 * 新版 SSE 命名事件列表（与桌面端 sse.ts NAMED_SSE_EVENTS 对齐）
 */
var NAMED_SSE_EVENTS = [
  'run_started',
  'agent_started',
  'agent_finished',
  'tool_started',
  'tool_finished',
  'review_started',
  'review_finished',
  'answer_delta',
  'run_finished',
  'error',
  'agent_observation',
];

/**
 * 从 SSE JSON 载荷中提取 answer_delta 文本
 * 联调契约：data.text → data.delta → data.chunk → data.content → text → displayText
 */
function extractAnswerDeltaText(flat) {
  var data = flat.data && typeof flat.data === 'object' ? flat.data : undefined;
  if (data) {
    if (typeof data.text === 'string' && data.text.length > 0) return data.text;
    var fallbacks = ['delta', 'chunk', 'content'];
    for (var fi = 0; fi < fallbacks.length; fi++) {
      var v = data[fallbacks[fi]];
      if (typeof v === 'string' && v.length > 0) return v;
    }
  }
  if (typeof flat.text === 'string' && flat.text.length > 0) return flat.text;
  return typeof flat.displayText === 'string' ? flat.displayText : '';
}

/**
 * 推断步骤状态
 */
function inferStepStatus(event, raw) {
  var s = (raw || '').toLowerCase();
  if (event === 'error' || s === 'failed' || s === 'error') return 'failed';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'pending') return 'pending';
  if (s === 'running') return 'running';
  if (s === 'success' || s === 'completed' || s === 'succeeded') return 'success';
  if (event.endsWith('_finished')) return 'success';
  if (event.endsWith('_started')) return 'running';
  return 'success';
}

/**
 * 将 SSE 信封转为步骤事件对象
 */
function mapFlatToStep(flat, event) {
  var display = flat.displayText || '';
  if (!display && flat.data && typeof flat.data === 'object') {
    var msg = flat.data.message;
    if (typeof msg === 'string') display = msg;
  }
  // 提取 cardPayload：兼容 flat.cardPayload 和 flat.data.cardPayload
  var cardPayload = null;
  if (flat.cardPayload && flat.cardPayload.cardType) {
    cardPayload = flat.cardPayload;
  } else if (flat.data && flat.data.cardPayload && flat.data.cardPayload.cardType) {
    cardPayload = flat.data.cardPayload;
  } else if (Array.isArray(flat.cards) && flat.cards.length > 0 && flat.cards[0].cardType) {
    cardPayload = flat.cards[0];
  } else if (flat.data && Array.isArray(flat.data.cards) && flat.data.cards.length > 0 && flat.data.cards[0].cardType) {
    cardPayload = flat.data.cards[0];
  }
  // 提取 answerPreview（优先 flat.answerPreview，其次 flat.data.answerPreview）
  var answerPreview = null;
  if (typeof flat.answerPreview === 'string' && flat.answerPreview.trim()) {
    answerPreview = flat.answerPreview;
  } else if (flat.data && typeof flat.data.answerPreview === 'string' && flat.data.answerPreview.trim()) {
    answerPreview = flat.data.answerPreview;
  }
  // 提取 contextSummary（优先 flat.contextSummary，其次 flat.data.contextSummary）
  var contextSummary = flat.contextSummary || (flat.data && flat.data.contextSummary) || null;

  return {
    event: event,
    runId: Number(flat.runId || 0),
    agent: flat.agent || '',
    tool: flat.tool || '',
    displayText: display,
    status: inferStepStatus(event, flat.status),
    timestamp: flat.timestamp || new Date().toISOString(),
    cardPayload: cardPayload,
    answerPreview: answerPreview,
    contextSummary: contextSummary,
  };
}

/**
 * 处理 SSE 信封（与桌面端 handleFlatEnvelope 对齐）
 * @param {Object} flat - 解析后的 JSON 对象
 * @param {string} fallbackEvent - SSE event 行的值
 * @param {Object} handlers - 回调集合
 */
function handleFlatEnvelope(flat, fallbackEvent, handlers) {
  var ev = (typeof flat.event === 'string' && flat.event) ? flat.event : '';
  if (!ev && fallbackEvent && fallbackEvent !== 'message') ev = fallbackEvent;
  if (!ev) return;

  // 调试用：透传原始事件
  if (handlers.onRawEvent) handlers.onRawEvent(flat, ev);

  if (ev === 'answer_delta') {
    var chunk = extractAnswerDeltaText(flat);
    if (chunk && handlers.onDelta) handlers.onDelta(chunk);
    return;
  }

  if (ev === 'run_finished') {
    if (handlers.onStep) handlers.onStep(mapFlatToStep(flat, ev));
    if (handlers.onFinished) handlers.onFinished();
    return;
  }

  if (ev === 'error') {
    if (handlers.onStep) handlers.onStep(mapFlatToStep(flat, 'error'));
    if (handlers.onError) handlers.onError(flat.displayText || 'SSE error');
    return;
  }

  // 其他事件：run_started, agent_started, tool_started 等
  if (handlers.onStep) handlers.onStep(mapFlatToStep(flat, ev));
}

/**
 * 连接 AI Run SSE 事件流
 * GET /ai/runs/{runId}/events
 *
 * 小程序用 wx.request + enableChunked 实现，逐 chunk 解析 SSE 命名事件。
 *
 * @param {number} runId
 * @param {Object} handlers
 * @param {function(Object)} [handlers.onStep]  - 步骤事件回调
 * @param {function(string)} [handlers.onDelta]  - 增量文本回调
 * @param {function()} [handlers.onFinished]     - run_finished 回调
 * @param {function(string)} [handlers.onError]  - 错误回调
 * @returns {{ promise: Promise, abort: function() }}
 */
var connectAiRunSse = function (runId, handlers) {
  handlers = handlers || {};
  var apiUrl = request.apiUrl || '';
  var url = apiUrl + 'ai/runs/' + runId + '/events';
  var token = wx.getStorageSync('token');
  var header = {
    Accept: 'text/event-stream, */*;q=0.9',
  };
  if (token) {
    header.Authorization = token;
  }

  var userAborted = false;
  var reqTask = null;

  var promise = new Promise(function (resolve, reject) {
    var decoder = createUtf8StreamDecoder();
    var sseBuffer = '';
    var settled = false;
    var finishedNotified = false;
    var receivedChunk = false;

    function notifyFinished() {
      if (finishedNotified) return;
      finishedNotified = true;
      if (handlers.onFinished) handlers.onFinished();
    }

    /**
     * 将 SSE 文本流按 \n\n 分块，解析出命名事件 JSON，分发给 handleFlatEnvelope
     */
    function feedText(text) {
      if (settled) return;
      if (!text) return;
      sseBuffer += text.replace(/\r\n/g, '\n');
      var blocks = sseBuffer.split('\n\n');
      sseBuffer = blocks.pop() || '';

      for (var i = 0; i < blocks.length; i++) {
        if (settled) return;
        var block = blocks[i];
        if (!block || !block.trim()) continue;

        // 解析 SSE 块：提取 event 和 data 行
        var lines = block.trim().split('\n');
        var eventName = '';
        var dataLines = [];

        for (var li = 0; li < lines.length; li++) {
          var line = lines[li].trim();
          if (!line || line.charAt(0) === ':') continue;
          var colonIdx = line.indexOf(':');
          if (colonIdx < 0) continue;
          var fieldName = line.slice(0, colonIdx).trim().toLowerCase();
          var fieldValue = line.slice(colonIdx + 1);
          if (fieldValue.charAt(0) === ' ') fieldValue = fieldValue.slice(1);

          if (fieldName === 'event') {
            eventName = fieldValue.trim();
          } else if (fieldName === 'data') {
            dataLines.push(fieldValue);
          }
        }

        // data 行拼接后解析 JSON
        var dataStr = dataLines.join('\n').trim();
        if (!dataStr) continue;

        var flat;
        try {
          flat = JSON.parse(dataStr);
        } catch (e) {
          console.warn(LOG_SSE, 'skip frame (invalid JSON)', { eventName: eventName, e: e });
          continue;
        }

        if (AI_SSE_DEBUG_CHUNK) {
          console.log(LOG_SSE, 'event:', eventName, 'dataLen:', dataStr.length);
        }

        handleFlatEnvelope(flat, eventName, handlers);
      }
    }

    console.log(LOG_SSE, '开始 SSE 连接', url);

    reqTask = wx.request({
      url: url,
      method: 'GET',
      header: header,
      responseType: 'arraybuffer',
      enableChunked: true,
      timeout: 180000,
      success: function (res) {
        if (settled) return;
        console.log(LOG_SSE, '请求结束', {
          statusCode: res.statusCode,
          receivedChunk: receivedChunk,
        });

        var tail = decoder.end();
        if (tail) feedText(tail);

        // 处理非 chunked 降级（整包返回）
        if (!receivedChunk && res.data != null && res.data !== '') {
          if (typeof res.data === 'string') {
            feedText(res.data);
          } else if (typeof res.data === 'object') {
            // 可能后端直接返回了 JSON（非 SSE），尝试当作单帧处理
            handleFlatEnvelope(res.data, 'message', handlers);
          }
        }

        // flush 剩余 buffer
        if ((sseBuffer || '').trim()) {
          feedText('\n\n');
        }

        if (res.statusCode === 401) {
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          wx.redirectTo({ url: '/pages/register/register' });
          settled = true;
          reject({ type: 'http', statusCode: 401 });
          return;
        }
        if (res.statusCode !== 200) {
          settled = true;
          reject({ type: 'http', statusCode: res.statusCode });
          return;
        }
        if (!finishedNotified) {
          notifyFinished();
        }
        settled = true;
        resolve();
      },
      fail: function (err) {
        console.warn(LOG_SSE, 'request fail', err);
        if (settled) return;
        settled = true;
        if (userAborted) {
          reject({ type: 'aborted' });
        } else {
          reject({ type: 'network', err: err });
        }
      },
    });

    if (!reqTask || typeof reqTask.onChunkReceived !== 'function') {
      try {
        if (reqTask && reqTask.abort) reqTask.abort();
      } catch (e0) {}
      settled = true;
      reject({ type: 'no_chunk' });
      return;
    }

    reqTask.onChunkReceived(function (res) {
      if (settled) return;
      receivedChunk = true;
      try {
        var chunkText = utf8ChunkToString(decoder, res.data);
        if (AI_SSE_DEBUG_CHUNK) {
          var rawLen = res.data && res.data.byteLength !== undefined ? res.data.byteLength : 0;
          console.log(LOG_SSE, 'chunk rawLen', rawLen, 'decodedLen', chunkText.length);
        }
        feedText(chunkText);
      } catch (e) {
        console.error(LOG_SSE, 'chunk 异常', e);
        if (!settled) {
          settled = true;
          reject({ type: 'network', err: e });
        }
      }
    });
  });

  return {
    promise: promise,
    abort: function () {
      userAborted = true;
      try {
        if (reqTask && reqTask.abort) reqTask.abort();
      } catch (e) {}
    },
  };
};

// ============================================================
// 门店画像 (已移除：餐厅画像业务下线)
// ============================================================

// ============================================================
// 营业额统计
// ============================================================

/**
 * 获取营业额统计
 * GET ai/daily-revenue/stats/{departmentId}?startDate=&endDate=
 */
var getRevenueStats = function (departmentId, query) {
  query = query || {};
  var data = {};
  if (query.startDate) data.startDate = query.startDate;
  if (query.endDate) data.endDate = query.endDate;
  return request.get('ai/daily-revenue/stats/' + departmentId, data);
};

/**
 * 获取日营业额完整数据（含 summary、dailyRows）
 * GET ai/daily-revenue/list/{departmentId}?startDate=&endDate=&subDepId=&distributerId=
 * @param {{ departmentId: number, startDate: string, endDate: string, subDepId?: string|number, distributerId?: string|number }} params
 */
var getDailyTurnover = function (params) {
  params = params || {};
  var query = {};
  if (params.startDate) query.startDate = params.startDate;
  if (params.endDate) query.endDate = params.endDate;
  if (params.subDepId !== null && params.subDepId !== undefined && params.subDepId !== '') query.subDepId = params.subDepId;
  if (params.distributerId !== null && params.distributerId !== undefined && params.distributerId !== '') query.distributerId = params.distributerId;
  return request.get('ai/daily-revenue/list/' + params.departmentId, query);
};

// ============================================================
// AI 对话（旧版 chat controller）
// 从 services/aiChat.js 合并，供子包 aiChat/groupAiChat 页面使用
// ============================================================

/**
 * 创建或恢复对话
 * POST ai/chat/conversation?userId=…&departmentId=…&distributerId=…&scopeMode=…&type=…
 */
var createConversation = function (a, b, c) {
  var opts;
  if (a !== null && typeof a === 'object' && !Array.isArray(a) && a.userId != null) {
    opts = a;
  } else {
    opts = { departmentId: a, userId: b, type: c };
  }

  var qs =
    'userId=' +
    encodeURIComponent(opts.userId) +
    (opts.departmentId !== undefined && opts.departmentId !== null && opts.departmentId !== ''
      ? '&departmentId=' + encodeURIComponent(opts.departmentId)
      : '') +
    (opts.scopeMode !== undefined && opts.scopeMode !== null && opts.scopeMode !== ''
      ? '&scopeMode=' + encodeURIComponent(opts.scopeMode)
      : '') +
    (opts.distributerId !== undefined && opts.distributerId !== null && opts.distributerId !== ''
      ? '&distributerId=' + encodeURIComponent(opts.distributerId)
      : '') +
    (opts.type !== undefined && opts.type !== null && opts.type !== ''
      ? '&type=' + encodeURIComponent(opts.type)
      : '');

  return request.post('ai/chat/conversation?' + qs, {}, { useUrlParams: true });
};

/**
 * 发送消息（非流式）
 * POST ai/chat/send?conversationId=xxx
 */
var sendMessage = function (conversationId, messageOrPayload) {
  var messageObj = typeof messageOrPayload === 'object' && messageOrPayload !== null && !Array.isArray(messageOrPayload)
    ? messageOrPayload
    : { message: messageOrPayload };
  return request.post('ai/chat/send?conversationId=' + conversationId, messageObj, { useUrlParams: true });
};

/**
 * 流式发送消息（SSE）
 * POST ai/chat/stream?conversationId=xxx
 * 使用 wx.request + enableChunked 实现
 */
var sendMessageStream = function (conversationId, payload, handlers) {
  handlers = handlers || {};
  var apiUrl = request.apiUrl || '';
  var url = apiUrl + 'ai/chat/stream?conversationId=' + conversationId;
  var token = wx.getStorageSync('token');
  var header = {};
  if (token) {
    header.Authorization = token;
  }

  var userAborted = false;
  var reqTask = null;

  var promise = new Promise(function (resolve, reject) {
    var decoder = createUtf8StreamDecoder();
    var sseBuffer = '';
    var settled = false;
    var finishedNotified = false;
    var receivedChunk = false;

    function notifyFinished() {
      if (finishedNotified) return;
      finishedNotified = true;
      if (handlers.onFinished) handlers.onFinished();
    }

    function feedText(text) {
      if (settled) return;
      if (!text) return;
      sseBuffer += text.replace(/\r\n/g, '\n');
      var blocks = sseBuffer.split('\n\n');
      sseBuffer = blocks.pop() || '';

      for (var i = 0; i < blocks.length; i++) {
        if (settled) return;
        var block = blocks[i];
        if (!block || !block.trim()) continue;

        var lines = block.trim().split('\n');
        var dataLines = [];

        for (var li = 0; li < lines.length; li++) {
          var line = lines[li].trim();
          if (!line || line.charAt(0) === ':') continue;
          var colonIdx = line.indexOf(':');
          if (colonIdx < 0) continue;
          var fieldName = line.slice(0, colonIdx).trim().toLowerCase();
          var fieldValue = line.slice(colonIdx + 1);
          if (fieldValue.charAt(0) === ' ') fieldValue = fieldValue.slice(1);

          if (fieldName === 'data') {
            dataLines.push(fieldValue);
          }
        }

        var dataStr = dataLines.join('\n').trim();
        if (!dataStr) continue;

        try {
          var obj = JSON.parse(dataStr);
          if (obj.finished || obj.done || obj.status === 'done') {
            notifyFinished();
            settled = true;
            resolve();
            return;
          }
          var chunk = obj.chunk || obj.delta || obj.content || obj.text || '';
          if (chunk && handlers.onDelta) handlers.onDelta(chunk);
          if (obj.error) {
            settled = true;
            reject({ type: 'sse', message: obj.error });
            return;
          }
        } catch (e) {
          // 非 JSON 行，当作纯文本
          if (handlers.onDelta) handlers.onDelta(dataStr);
        }
      }
    }

    reqTask = wx.request({
      url: url,
      method: 'POST',
      header: header,
      data: payload,
      enableChunked: true,
      timeout: 180000,
      success: function (res) {
        if (settled) return;

        var tail = decoder.end();
        if (tail) feedText(tail);

        if (!receivedChunk && res.data != null && res.data !== '') {
          if (typeof res.data === 'string') {
            feedText(res.data);
          } else if (typeof res.data === 'object') {
            if (res.data.content && handlers.onDelta) handlers.onDelta(res.data.content);
          }
        }

        if ((sseBuffer || '').trim()) {
          feedText('\n\n');
        }

        if (!finishedNotified) {
          notifyFinished();
        }
        settled = true;
        resolve();
      },
      fail: function (err) {
        if (settled) return;
        settled = true;
        if (userAborted) {
          reject({ type: 'aborted' });
        } else {
          reject({ type: 'network', err: err });
        }
      },
    });

    if (!reqTask || typeof reqTask.onChunkReceived !== 'function') {
      try {
        if (reqTask && reqTask.abort) reqTask.abort();
      } catch (e0) {}
      settled = true;
      reject({ type: 'no_chunk' });
      return {};
    }

    reqTask.onChunkReceived(function (res) {
      if (settled) return;
      receivedChunk = true;
      try {
        var chunkText = utf8ChunkToString(decoder, res.data);
        feedText(chunkText);
      } catch (e) {
        if (!settled) {
          settled = true;
          reject({ type: 'network', err: e });
        }
      }
    });
  });

  return {
    promise: promise,
    abort: function () {
      userAborted = true;
      try {
        if (reqTask && reqTask.abort) reqTask.abort();
      } catch (e) {}
    },
  };
};

/**
 * 获取对话历史
 * GET ai/chat/history/{conversationId}
 */
var getHistory = function (conversationId) {
  return request.get('ai/chat/history/' + conversationId);
};

/**
 * 结束对话（触发记忆提取）
 * POST ai/chat/end/{conversationId}
 */
var endConversation = function (conversationId) {
  return request.post('ai/chat/end/' + conversationId, {}, { useUrlParams: true });
};

// ============================================================
// 智能体详情（统一顾问详情，含推荐问题 questionTopics）
// ============================================================

/**
 * 获取启用中的智能体列表。前端按稳定的 advisor code 解析数据库主键，
 * 避免数据库重建后自增 ID 改变导致入口失效。
 * GET /api/ai/advisors
 * @returns {Promise}
 */
var listAdvisors = function () {
  return request.get('ai/advisors', {}, { showErrorToast: false });
};

/**
 * 获取 Run 详情（含 menuOperationAnswerPlan 等卡片数据）
 * GET /api/ai/runs/{runId}
 * @param {number|string} runId
 * @returns {Promise}
 */
var getAiRun = function (runId) {
  return request.get('ai/runs/' + runId, {}, { showErrorToast: false });
};

/**
 * 获取智能体详情（含推荐问题列表）
 * GET /api/ai/advisors/{advisorId}?scene=MINIAPP
 * 返回 data.questionTopics[] → 每个含 title / questions[]
 * @param {number} advisorId 智能体 ID（如菜单经营顾问 = 13）
 * @returns {Promise}
 */
var getAdvisorDetail = function (advisorId) {
  return request.get('ai/advisors/' + advisorId, { scene: 'MINIAPP' }, { showErrorToast: false });
};

/**
 * 获取手机端普通 AI 能力目录（完整可问范围导航）
 * GET /api/ai/capability-map
 * 返回 data[] → capabilities[].exampleQuestions[] 为 { text, contractId }。
 * @returns {Promise}
 */
var getCapabilityMap = function () {
  return request.get('ai/capability-map', {}, { showErrorToast: false });
};

// ============================================================
// 成本分析 - 菜品配料分析
// ============================================================

/**
 * 按菜品维度的配料分析
 * POST gbDishCostAnalysis/ingredientAnalysis
 */
var getGbIngredientAnalysis = function (payload) {
  return request.post('gbDishCostAnalysis/ingredientAnalysis', payload, { useUrlParams: true });
};

/**
 * 按分销商商品（配料）维度的出库分析
 * POST gbDishCostAnalysis/outboundIngredientAnalysis
 */
var outboundIngredientAnalysis = function (payload) {
  return request.post('gbDishCostAnalysis/outboundIngredientAnalysis', payload, { useUrlParams: true });
};

// ============================================================
// 采购日期统计
// ============================================================

/**
 * 获取分销商采购日期统计数据
 * POST gbdistributerpurchasegoods/disGetPurchaseDate
 */
var disGetPurchaseDate = function (payload) {
  return request.post('gbdistributerpurchasegoods/disGetPurchaseDate', payload, { useUrlParams: true });
};

/**
 * 获取分销商采购批次明细（按采购员/供货商维度）
 * POST gbdistributerpurchasebatch/disGetPurchaseDetailType
 */
var disGetPurchaseDetailType = function (payload) {
  return request.post('gbdistributerpurchasebatch/disGetPurchaseDetailType', payload, { useUrlParams: true });
};

/**
 * 获取分销商采购分类统计数据
 * POST gbdistributerpurchasegoods/disGetPurchaseCata
 */
var disGetPurchaseCata = function (payload) {
  return request.post('gbdistributerpurchasegoods/disGetPurchaseCata', payload, { useUrlParams: true });
};

/**
 * 按日期获取采购商品统计（汇总）
 * POST gbdistributerpurchasegoods/getGbPurGoodsStatisticsSeachDate
 */
var getGbPurGoodsStatisticsSeachDate = function (payload) {
  return request.post('gbdistributerpurchasegoods/getGbPurGoodsStatisticsSeachDate', payload, { useUrlParams: true });
};

/**
 * 按日期获取采购商品列表（分页）
 * POST gbdistributerpurchasegoods/getGbPurGoodsListSearchDate
 */
var getGbPurGoodsListSearchDate = function (payload) {
  return request.post('gbdistributerpurchasegoods/getGbPurGoodsListSearchDate', payload, { useUrlParams: true });
};

// ============================================================
// 工作记录 — 从业务卡片记入
// ============================================================

/**
 * 从业务卡片记入工作记录
 * POST /api/ai/work-records/from-business-card
 *
 * source 五元组（conversationId/messageId/runId/cardType/itemKey）用于幂等；
 * biz_fact_snapshot / sourceCard 仍由服务端从 message cards_json 解析，不接受前端 payload。
 *
 * @param {{ userId: number, departmentId: number, distributerId?: number,
 *           sourceConversationId: number, sourceMessageId: number, sourceRunId?: number,
 *           sourceCardType: string, sourceItemKey: string,
 *           editedTitle?: string, title?: string,
 *           editedContent?: string, content?: string,
 *           categoryCode?: string }} payload
 *   editedTitle/title → gb_wr_title（editedTitle 优先）；editedContent/content → gb_wr_raw_content；
 *   categoryCode 可选，须为 ACTIVE 分类编码。幂等重复提交返回同 recordId，不更新 title/content。
 */
var createWorkRecordFromBusinessCard = function (payload) {
  return request.post('ai/work-records/from-business-card', payload, { showErrorToast: false });
};

// ============================================================
// 图钉 — 消息图钉 与 卡片级图钉（Answer Pin / Card Pin）
// ============================================================

/**
 * 添加消息级图钉（整条 AI 回复）
 * POST /api/ai/messages/{messageId}/pin?userId=
 * body 为空 {} → 后端视为 MESSAGE 级 pin
 * @param {number|string} messageId - 服务端消息 ID
 * @param {number} userId
 * @returns {Promise<{ code: number, data: { pinned: boolean, pinId: number|null, duplicated?: boolean } }>}
 */
var pinMessage = function (messageId, userId) {
  return request.request('ai/messages/' + messageId + '/pin?userId=' + userId, {}, { method: 'POST' });
};

/**
 * 取消消息级图钉
 * DELETE /api/ai/messages/{messageId}/pin?userId=
 * @param {number|string} messageId - 服务端消息 ID
 * @param {number} userId
 * @returns {Promise<{ code: number, data: { pinned: boolean, pinId: number|null } }>}
 */
var unpinMessage = function (messageId, userId) {
  return request.request('ai/messages/' + messageId + '/pin?userId=' + userId, {}, { method: 'DELETE' });
};

/**
 * 添加卡片级图钉（只 pin 单张业务卡）
 * POST /api/ai/messages/{messageId}/pin?userId=
 * body 必传：{ pinScope, cardInstanceId, cardType, cardTitle, cardKey?, cardIndex? }
 * @param {number|string} messageId - 服务端消息 ID
 * @param {number} userId
 * @param {{ pinScope: string, cardInstanceId: string, cardType: string, cardTitle: string,
 *           cardKey?: string, cardIndex?: number }} body
 * @returns {Promise<{ code: number, data: { pinned: boolean, pinId: number|null, duplicated?: boolean } }>}
 */
var pinCard = function (messageId, userId, body) {
  return request.request('ai/messages/' + messageId + '/pin?userId=' + userId, body || {}, { method: 'POST' });
};

/**
 * 获取用户的所有图钉列表（跨会话）— 新接口 /mine
 * GET /api/ai/work-pins/mine
 * 自动限制当前 userId，支持 conversationId / sourceType 可选筛选
 * @param {Object} params - { page?: number, pageSize?: number, conversationId?, sourceType? }
 * @returns {Promise<{ result: { total, page, pageSize, items: Array } }>}
 */
var listMyPins = function (params) {
  return request.get('ai/work-pins/mine', params || {}, { showErrorToast: false });
};

/**
 * 删除图钉
 * DELETE /api/ai/work-pins/{pinId}?userId=
 * @param {number|string} pinId
 * @param {number|string} userId
 * @returns {Promise}
 */
var deletePin = function (pinId, userId) {
  return request.request('ai/work-pins/' + pinId + '?userId=' + userId, {}, { method: 'DELETE' });
};

/**
 * 获取图钉详情（独立快照）
 * GET /api/ai/work-pins/{pinId}?userId={userId}
 * @param {number|string} pinId
 * @param {number} userId
 * @returns {Promise<{ result: { code, data: { pinId, title, sourceTextSnapshot, sourceAnswerPreview, cards, cardsSnapshotJson, primaryCardType, cardCount, conversationId, messageId, runId, createdAt } } }>}
 */
var getPinDetail = function (pinId, userId) {
  return request.get('ai/work-pins/' + pinId, { userId: userId }, { showErrorToast: false });
};

// ============================================================
// 集团门店部门
// ============================================================


// ============================================================
// 门店库存按时间段分类统计
// ============================================================

/**
 * 门店库存按时间段分类统计
 * POST /gbdepartmentgoodsstock/getMendianStockTypePeriod
 * @param {{ disId: number, whichDay: number, depFatherId: number, searchSubDepIds?: string }} payload
 */
var getMendianStockTypePeriod = function (payload) {
  return request.post('gbdepartmentgoodsstock/getMendianStockTypePeriod', payload, { useUrlParams: true });
};

/**
 * 根据大类ID查询商品库存按时间段分类统计
 * POST /gbdepartmentgoodsstock/disGetDayStockByGreatId
 * @param {{ disId?: number, depFatherId: number, searchSubDepIds?: string, greatId: string, whichDay: number, type?: number }} payload
 */
var disGetDayStockByGreatId = function (payload) {
  return request.post('gbdepartmentgoodsstock/disGetDayStockByGreatId', payload, { useUrlParams: true });
};

// ============================================================
// 商品成本统计（subPackage-charts 使用）
// ============================================================

/**
 * 商品成本汇总（生产 / 损耗 / 损失）
 * POST /gbdepartmentgoodsstockreduce/getGbGoodsCostStatistics
 */
var getGbGoodsCostStatistics = function (payload) {
  return request.post('gbdepartmentgoodsstockreduce/getGbGoodsCostStatistics', payload, { useUrlParams: true });
};

/**
 * 商品成本按日期搜索（分页）
 * POST /gbdepartmentgoodsstockreduce/getGoodsCostBySearchDate
 */
var getGoodsCostBySearchDate = function (payload) {
  return request.post('gbdepartmentgoodsstockreduce/getGoodsCostBySearchDate', payload, { useUrlParams: true });
};

// ============================================================
// 报表（subPackage-charts 使用）
// ============================================================

/**
 * 获取用户报表 - 营业统计
 * GET /gbreport/getDisUserReportsBusiness/{userId}
 */
var getDisUserReportsBusiness = function (userId) {
  return request.get('gbreport/getDisUserReportsBusiness/' + userId);
};

/**
 * 获取用户报表 - 成本统计
 * GET /gbreport/getDisUserReportsCost/{userId}
 */
var getDisUserReportsCost = function (userId) {
  return request.get('gbreport/getDisUserReportsCost/' + userId);
};

/**
 * 获取用户报表 - 采购统计
 * GET /gbreport/getDisUserReportsPurchase/{userId}
 */
var getDisUserReportsPurchase = function (userId) {
  return request.get('gbreport/getDisUserReportsPurchase/' + userId);
};

/**
 * 获取用户报表 - 库存统计
 * GET /gbreport/getDisUserReportsStock/{userId}
 */
var getDisUserReportsStock = function (userId) {
  return request.get('gbreport/getDisUserReportsStock/' + userId);
};



// ============================================================
// 工作笔记（Work Note）— 店长可记录自己看法的笔记
// ============================================================

/**
 * 创建笔记
 * POST /ai/work-notes
 * @param {{ userId: number, title: string, content: string, conversationId?: number, messageId?: number, runId?: number }} payload
 * @returns {Promise}
 */
var createWorkNote = function (payload) {
  return request.post('ai/work-notes', payload, { showErrorToast: false });
};

/**
 * 获取当前用户全部工作笔记（跨会话，分页；不含完整快照）
 * GET /ai/work-notes/mine
 * @param {Object} params - { userId: number, page?: number, pageSize?: number, conversationId?, noteType? }
 * @returns {Promise<{ result: { total, page, pageSize, items: Array } }>}
 */
var listMyWorkNotes = function (params) {
  return request.get('ai/work-notes/mine', params || {}, { showErrorToast: false });
};

/**
 * 删除工作笔记（软删除）
 * DELETE /ai/work-notes/{noteId}?userId=
 * @param {number|string} noteId
 * @param {number|string} userId
 * @returns {Promise}
 */
var deleteWorkNote = function (noteId, userId) {
  return request.request('ai/work-notes/' + noteId + '?userId=' + userId, {}, { method: 'DELETE' });
};

/**
 * 获取工作笔记详情（含完整 content / sourceTextSnapshot）
 * GET /ai/work-notes/{noteId}?userId=
 * @param {number|string} noteId
 * @param {number|string} userId
 * @returns {Promise}
 */
var getWorkNoteDetail = function (noteId, userId) {
  return request.get('ai/work-notes/' + noteId, { userId: userId }, { showErrorToast: false });
};

/**
 * 更新工作笔记
 * PUT /ai/work-notes/{noteId}
 * @param {number|string} noteId
 * @param {number|string} userId
 * @param {{ title: string, content: string }} payload
 * @returns {Promise}
 */
var updateWorkNote = function (noteId, userId, payload) {
  return request.request('ai/work-notes/' + noteId + '?userId=' + userId, payload, { method: 'PUT' });
};

/**
 * 推送工作笔记到店内公告
 * POST /store-announcements/from-note/{noteId}
 * @param {number|string} noteId
 * @param {{ userId: number, departmentId?: number, distributerId?: number, title?: string }} payload
 * @returns {Promise}
 */
var pushWorkNoteToAnnouncement = function (noteId, payload) {
  return request.post('store-announcements/from-note/' + noteId, payload, { showErrorToast: false });
};

/**
 * 推送工作记录到店内公告
 * POST /store-announcements/from-work-record/{recordId}
 * @param {number|string} recordId
 * @param {{ userId: number, departmentId?: number, distributerId?: number, title?: string }} payload
 * @returns {Promise}
 */
var pushWorkRecordToAnnouncement = function (recordId, payload) {
  return request.post('store-announcements/from-work-record/' + recordId, payload, { showErrorToast: false });
};

// ============================================================
// 店内公告栏
// ============================================================

/**
 * 查询店内公告列表
 * GET /store-announcements?userId=&departmentId=&distributerId=&page=1&pageSize=50
 * @param {{ userId: number, departmentId?: number, distributerId?: number, page?: number, pageSize?: number }} params
 * @returns {Promise}
 */
var listStoreAnnouncements = function (params) {
  return request.get('store-announcements', params, { showErrorToast: false }).then(function (res) {
    var raw = res && res.result;
    if (raw && raw.code !== undefined && raw.data !== undefined) {
      return { result: raw.data, header: res.header };
    }
    return res;
  });
};

/**
 * 删除自己发布的店内公告（后端软删除）。
 * DELETE /store-announcements/{announcementId}
 */
var deleteStoreAnnouncement = function (announcementId, params) {
  var query = [
    'userId=' + encodeURIComponent(params.userId),
    'departmentId=' + encodeURIComponent(params.departmentId),
  ];
  if (params.distributerId) {
    query.push('distributerId=' + encodeURIComponent(params.distributerId));
  }
  return request.request(
    'store-announcements/' + announcementId + '?' + query.join('&'),
    {},
    { method: 'DELETE', showErrorToast: false }
  );
};

/**
 * 获取每日公告牌
 * GET /store-announcements/daily-board
 * @param {{ userId: number, departmentId: number, distributerId: number, boardType: string, asOfDate?: string, page?: number, pageSize?: number }} params
 * @returns {Promise}
 */
var getDailyBoard = function (params) {
  return request.get('store-announcements/daily-board', params, { showErrorToast: false }).then(function (res) {
    var raw = res && res.result;
    if (raw && raw.code !== undefined && raw.data !== undefined) {
      return { result: raw.data, header: res.header };
    }
    return res;
  });
};

/**
 * 新入库商品明确不需要加入菜品/中间料配方。
 * POST /store-announcements/recipe-review/{taskId}/ignore
 */
var ignoreNewGoodsRecipeReview = function (taskId, payload) {
  return request.post(
    'store-announcements/recipe-review/' + taskId + '/ignore',
    payload,
    { showErrorToast: false }
  );
};

// ============================================================
// 导出
// ============================================================

module.exports = {
  // AI 对话（旧版 chat controller）
  createConversation: createConversation,
  sendMessage: sendMessage,
  sendMessageStream: sendMessageStream,
  getHistory: getHistory,
  endConversation: endConversation,
  // AI 对话（新版 Run + SSE）
  createAiRun: createAiRun,
  connectAiRunSse: connectAiRunSse,
  stopAiRun: stopAiRun,
  getAiRun: getAiRun,
  listConversations: listConversations,
  getConversationMessages: getConversationMessages,
  // 营业额统计
  getRevenueStats: getRevenueStats,
  getDailyTurnover: getDailyTurnover,
  // 智能体详情（统一顾问详情，含推荐问题 questionTopics）
  listAdvisors: listAdvisors,
  getAdvisorDetail: getAdvisorDetail,
  // 手机端普通 AI 能力目录（完整可问范围导航）
  getCapabilityMap: getCapabilityMap,
  // 成本分析 - 菜品配料分析
  getGbIngredientAnalysis: getGbIngredientAnalysis,
  outboundIngredientAnalysis: outboundIngredientAnalysis,
  // 采购日期统计
  disGetPurchaseDate: disGetPurchaseDate,
  disGetPurchaseCata: disGetPurchaseCata,
  disGetPurchaseDetailType: disGetPurchaseDetailType,
  getGbPurGoodsStatisticsSeachDate: getGbPurGoodsStatisticsSeachDate,
  getGbPurGoodsListSearchDate: getGbPurGoodsListSearchDate,
  // 门店库存按时间段分类统计
  getMendianStockTypePeriod: getMendianStockTypePeriod,
  disGetDayStockByGreatId: disGetDayStockByGreatId,
  // 商品成本统计
  getGbGoodsCostStatistics: getGbGoodsCostStatistics,
  getGoodsCostBySearchDate: getGoodsCostBySearchDate,
  // 报表
  getDisUserReportsBusiness: getDisUserReportsBusiness,
  getDisUserReportsCost: getDisUserReportsCost,
  getDisUserReportsPurchase: getDisUserReportsPurchase,
  getDisUserReportsStock: getDisUserReportsStock,
  // 工作记录 — 从业务卡片记入
  createWorkRecordFromBusinessCard: createWorkRecordFromBusinessCard,
  // 图钉 — 消息图钉 & 卡片级图钉
  pinMessage: pinMessage,
  unpinMessage: unpinMessage,
  pinCard: pinCard,
  // 图钉 — 列表 & 删除 & 详情
  listMyPins: listMyPins,
  deletePin: deletePin,
  getPinDetail: getPinDetail,
  // 工作笔记
  createWorkNote: createWorkNote,
  listMyWorkNotes: listMyWorkNotes,
  getWorkNoteDetail: getWorkNoteDetail,
  updateWorkNote: updateWorkNote,
  deleteWorkNote: deleteWorkNote,
  pushWorkNoteToAnnouncement: pushWorkNoteToAnnouncement,
  pushWorkRecordToAnnouncement: pushWorkRecordToAnnouncement,
  // 店内公告栏
  listStoreAnnouncements: listStoreAnnouncements,
  deleteStoreAnnouncement: deleteStoreAnnouncement,
  getDailyBoard: getDailyBoard,
  ignoreNewGoodsRecipeReview: ignoreNewGoodsRecipeReview,
};
