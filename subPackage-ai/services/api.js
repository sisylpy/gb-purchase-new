/**
 * AI 模块统一 API 接口
 * 对应后端控制器: AiChatController, GbAiRestaurantProfileController
 *
 * 接口清单:
 * ====== AI 对话 (AiChatController) ======
 * createConversation(opts) 或 createConversation(departmentId, userId, type) - 创建/恢复对话
 *   opts: { userId, departmentId?, distributerId?, scopeMode?: 'STORE'|'GROUP', type? }
 * sendMessage(conversationId, message)           - 发送消息（非流式，字符串）
 * sendMessage(conversationId, { message, userId? }) - 同上，可带 userId
 * sendMessageStream(conversationId, body, h)     - POST /ai/chat/stream（SSE），返回 { promise, abort }
 * getHistory(conversationId)                     - 获取对话历史
 * endConversation(conversationId)                 - 结束对话（触发记忆提取）
 * getRecommendedTopics()                          - GET 推荐主题包：{ title, subtitle, topics[{ id, title, description, questions[] }] }
 * getTopicsHistoryByUserId(userId)                - GET ai/chat/topics/history/{userId} 会话列表（更新时间倒序）
 * getTopicMessages(topicId)                     - GET ai/chat/topic/{topicId}/messages（topicId = conversationId）
 *
 * ====== 门店画像 (GbAiRestaurantProfileController) ======
 * getAiProfile(departmentId)   - 获取门店画像
 * updateAiProfile(data)         - 更新门店画像
 *
 * ====== 营业额统计 (ai/daily-revenue) ======
 * getRevenueStats(departmentId[, { startDate, endDate }]) - 获取营业额统计，日期 yyyy-MM-dd 可选与后端核销/日营收区间一致
 */

var request = require('../../lib/request');

// ============================================================
// AI 对话
// ============================================================

/**
 * 创建或恢复对话
 * POST ai/chat/conversation?userId=…&departmentId=…&distributerId=…&scopeMode=STORE|GROUP&type=0|1|2
 *
 * 兼容旧调用：createConversation(departmentId, userId, type)
 * 推荐：createConversation({ userId, departmentId?, distributerId?, scopeMode?, type? })
 */
var createConversation = function (a, b, c) {
  var opts;
  if (a !== null && typeof a === 'object' && !Array.isArray(a) && a.userId != null) {
    opts = a;
  } else {
    opts = { departmentId: a, userId: b, type: c };
  }

  var userId = opts.userId;
  var url = 'ai/chat/conversation?userId=' + encodeURIComponent(userId);

  if (opts.departmentId !== undefined && opts.departmentId !== null && opts.departmentId !== '') {
    url += '&departmentId=' + encodeURIComponent(opts.departmentId);
  }
  if (opts.scopeMode !== undefined && opts.scopeMode !== null && opts.scopeMode !== '') {
    url += '&scopeMode=' + encodeURIComponent(opts.scopeMode);
  }
  if (opts.distributerId !== undefined && opts.distributerId !== null && opts.distributerId !== '') {
    url += '&distributerId=' + encodeURIComponent(opts.distributerId);
  }
  if (opts.type !== undefined && opts.type !== null && opts.type !== '') {
    url += '&type=' + encodeURIComponent(opts.type);
  }

  return request.post(url, {});
};

/**
 * 发送消息（非流式）
 * POST ai/chat/send?conversationId=xxx
 */
var sendMessage = function (conversationId, messageOrBody) {
  var body;
  if (typeof messageOrBody === 'string') {
    body = { message: messageOrBody };
  } else if (messageOrBody != null && typeof messageOrBody === 'object') {
    body = Object.assign({ message: '' }, messageOrBody);
    if (body.message == null) {
      body.message = '';
    }
  } else {
    body = { message: '' };
  }
  return request.post('ai/chat/send?conversationId=' + encodeURIComponent(conversationId), body);
};

/**
 * UTF-8 流式解码（避免多字节字符跨 chunk 截断）
 */
var LOG_STREAM = '[AI流式]';
/** 为 true 时打印每条 chunk，易拖慢开发者工具甚至触发 timeout，默认关 */
var AI_STREAM_DEBUG_CHUNK = false;

function utf8ChunkToString(decoder, raw) {
  if (raw === null || raw === undefined) {
    return '';
  }
  if (typeof raw === 'string') {
    return raw;
  }
  var u8;
  if (raw instanceof ArrayBuffer) {
    u8 = new Uint8Array(raw);
  } else if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView && ArrayBuffer.isView(raw)) {
    u8 = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
  } else {
    try {
      u8 = new Uint8Array(raw);
    } catch (e) {
      console.warn(LOG_STREAM, '无法解码 chunk，类型:', typeof raw, e);
      return '';
    }
  }
  return decoder.push(u8);
}

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
  return {
    push: function (bin) {
      var bytes = bin instanceof Uint8Array ? bin : new Uint8Array(bin);
      var s = '';
      for (var i = 0; i < bytes.length; i++) {
        s += String.fromCharCode(bytes[i]);
      }
      try {
        return decodeURIComponent(escape(s));
      } catch (e) {
        return s;
      }
    },
    end: function () {
      return '';
    },
  };
}

/**
 * 后端在 data 字段内用 JSON 字符串字面量分包（例如 data:"钱"），需按行解析再拼接。
 */
function unwrapSseDataField(rest) {
  if (rest == null) return '';
  var s = String(rest);
  if (s.charAt(0) === ' ') s = s.slice(1);
  if (!s.length) return '';
  var normalized = s.replace(/\u201c/g, '"').replace(/\u201d/g, '"');
  /* 部分网关/JSON 包裹会把 UTF-16 片段压成 ""字""，去掉成对的外层 "" 再按 JSON 字符串解析 */
  while (normalized.length >= 4 && normalized.slice(0, 2) === '""' && normalized.slice(-2) === '""') {
    normalized = normalized.slice(2, -2);
  }
  if (!normalized.length || /^"+$/.test(normalized)) {
    return '';
  }
  if (normalized.charAt(0) === '"') {
    try {
      return JSON.parse(normalized);
    } catch (e) {
      if (normalized.length >= 2 && normalized.charAt(normalized.length - 1) === '"') {
        return normalized
          .slice(1, -1)
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      }
      return normalized;
    }
  }
  return normalized;
}

/**
 * 去掉 \n\n 分帧后块首残留的 "（常见于整条 body 被当成 JSON 字符串拼接进流）
 */
function normalizeSseEventBlock(block) {
  var b = String(block || '').replace(/\r\n/g, '\n').replace(/^\uFEFF/, '');
  b = b.trim();
  b = b.replace(/^["\s]+/, '');
  return b;
}

/**
 * body 被包成 JSON 字符串或未解码转义时，帧内仍是字面量 \\n、\\r（两字符），需还原为真换行再按行解析。
 */
function normalizeSseLiteralEscapes(s) {
  if (!s || s.indexOf('\\') < 0) {
    return s;
  }
  return String(s)
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n');
}

/** event 行里 event:delta\\ndata: 粘连时只取合法事件名 */
function sanitizeSseEventRest(rest) {
  var rv = String(rest == null ? '' : rest).trim();
  var lineBreak = rv.indexOf('\n');
  if (lineBreak >= 0) {
    rv = rv.slice(0, lineBreak).trim();
  }
  var bs = rv.indexOf('\\');
  if (bs >= 0) {
    rv = rv.slice(0, bs).trim();
  }
  var dataIdx = rv.toLowerCase().indexOf('data:');
  if (dataIdx > 0) {
    rv = rv.slice(0, dataIdx).trim();
  }
  return rv;
}

/**
 * 把一个 \\n\\n 分隔块解析为多条 { event, data }（支持块内多段 event/data；同事件多行 data 先 \\n 拼接）。
 */
function parseSseBlockToEvents(block) {
  var lines = normalizeSseEventBlock(block).split('\n');
  var out = [];
  var pendingEvent = '';
  var dataLines = [];

  function flush() {
    if (dataLines.length === 0) {
      return;
    }
    var parts = [];
    for (var di = 0; di < dataLines.length; di++) {
      var piece = dataLines[di];
      if (piece != null && String(piece).length > 0) {
        parts.push(String(piece));
      }
    }
    dataLines = [];
    if (parts.length === 0) {
      return;
    }
    var ev = (pendingEvent || 'delta').trim().toLowerCase();
    if (!ev) {
      ev = 'delta';
    }
    out.push({ event: ev, data: parts.join('\n') });
  }

  for (var j = 0; j < lines.length; j++) {
    var line = lines[j];
    line = line.replace(/^["\s]+/, '');
    if (line === '' || line.charAt(0) === ':') {
      continue;
    }
    var c = line.indexOf(':');
    if (c < 0) {
      continue;
    }
    var name = line.slice(0, c).trim();
    var nameLower = name.toLowerCase();
    var rest = line.slice(c + 1);
    if (nameLower === 'event') {
      flush();
      pendingEvent = sanitizeSseEventRest(rest);
    } else if (nameLower === 'data') {
      dataLines.push(unwrapSseDataField(rest));
    }
  }
  flush();
  return out;
}

/**
 * 流式发送 POST ai/chat/stream（SSE：delta / message / done / error）
 * @param {string|number} conversationId
 * @param {{ message: string, userId?: number, sourceTopicId?: string }} body
 * @param {{ onDelta?: function(string), onMessage?: function(string), onDone?: function(), onError?: function(string) }} handlers
 * @returns {{ promise: Promise<void>, abort: function() }}
 *
 * promise reject：{ type:'sse'|'http'|'network'|'no_chunk'|'aborted', message?, statusCode?, err? }
 */
var sendMessageStream = function (conversationId, body, handlers) {
  handlers = handlers || {};
  var apiUrl = request.apiUrl || '';
  var url = apiUrl + 'ai/chat/stream?conversationId=' + encodeURIComponent(conversationId);
  var token = wx.getStorageSync('token');
  var header = {
    'Content-Type': 'application/json',
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
    var doneNotified = false;
    var receivedChunk = false;
    /** 是否已向业务层递交代价正文（delta / message 且 data 非空） */
    var streamPayloadDispatched = false;

    function notifyDone() {
      if (doneNotified) return;
      doneNotified = true;
      if (handlers.onDone) handlers.onDone();
    }

    function feedText(text) {
      if (settled) return;
      if (!text) return;
      sseBuffer += text.replace(/\r\n/g, '\n');
      sseBuffer = normalizeSseLiteralEscapes(sseBuffer);
      var blocks = sseBuffer.split('\n\n');
      sseBuffer = blocks.pop() || '';
      for (var i = 0; i < blocks.length; i++) {
        if (settled) return;
        var b = blocks[i];
        if (!b || !b.trim()) continue;
        var events = parseSseBlockToEvents(b);
        for (var ei = 0; ei < events.length; ei++) {
          if (settled) return;
          var p = events[ei];
          var ev = (p.event || '').trim().toLowerCase();
          if (!ev && p.data != null && String(p.data).length > 0) {
            ev = 'delta';
            console.warn(LOG_STREAM, 'SSE 块无 event，按 delta 处理', (p.data || '').slice(0, 48));
          }
          if (!ev) {
            console.warn(LOG_STREAM, 'SSE 段缺少 event 且无 data，已跳过', (b || '').slice(0, 160));
            continue;
          }
          if (ev !== 'delta') {
            console.log(LOG_STREAM, '事件', ev, 'dataLen', (p.data || '').length);
          }
          if (ev === 'delta' && handlers.onDelta) {
            handlers.onDelta(p.data);
            if ((p.data || '').length) streamPayloadDispatched = true;
          } else if (ev === 'message' && handlers.onMessage) {
            handlers.onMessage(p.data);
            streamPayloadDispatched = true;
          } else if (ev === 'done') notifyDone();
          else if (ev === 'error') {
            var em = p.data || '服务异常';
            if (handlers.onError) handlers.onError(em);
            if (!settled) {
              settled = true;
              reject({ type: 'sse', message: em });
            }
            return;
          } else {
            console.warn(LOG_STREAM, '未识别的 event', ev);
          }
        }
      }
    }

    console.log(LOG_STREAM, '开始流式请求', url);

    reqTask = wx.request({
      url: url,
      method: 'POST',
      header: header,
      data: body,
      enableChunked: true,
      timeout: 180000,
      success: function (res) {
        if (settled) return;
        console.log(LOG_STREAM, '请求结束', {
          statusCode: res.statusCode,
          receivedChunk: receivedChunk,
          dataType: res.data == null ? 'null' : typeof res.data,
        });
        var tail = decoder.end();
        if (tail) feedText(tail);

        if (!receivedChunk && res.data != null && res.data !== '') {
          if (typeof res.data === 'string') {
            feedText(res.data);
          } else {
            var onceDec = createUtf8StreamDecoder();
            var whole = utf8ChunkToString(onceDec, res.data);
            if (whole) feedText(whole);
            var onceTail = onceDec.end();
            if (onceTail) feedText(onceTail);
          }
        }

        if ((sseBuffer || '').trim()) {
          feedText('\n\n');
        }
        if (!streamPayloadDispatched && (sseBuffer || '').trim()) {
          console.warn(
            LOG_STREAM,
            '流结束仍未解析到正文，sseBuffer 残留（前 200 字）:',
            (sseBuffer || '').slice(0, 200)
          );
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
        notifyDone();
        settled = true;
        resolve();
      },
      fail: function (err) {
        console.warn(LOG_STREAM, 'request fail', err);
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
        var raw = res.data;
        var chunkText = utf8ChunkToString(decoder, raw);
        if (AI_STREAM_DEBUG_CHUNK) {
          var rawLen =
            typeof raw === 'string'
              ? raw.length
              : raw && raw.byteLength !== undefined
                ? raw.byteLength
                : 0;
          console.log(LOG_STREAM, 'chunk', typeof raw, 'rawLen', rawLen, 'decodedLen', chunkText.length);
        }
        feedText(chunkText);
      } catch (e) {
        console.error(LOG_STREAM, 'chunk 异常', e);
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
  return request.post('ai/chat/end/' + conversationId, {});
};

/**
 * 获取首页推荐对话主题（算账版）
 * GET ai/chat/topics
 */
var getRecommendedTopics = function () {
  return request.get('ai/chat/topics', {}, { showErrorToast: false });
};

/**
 * 历史聊天主题列表（会话列表）
 * GET ai/chat/topics/history/{userId}
 */
var getTopicsHistoryByUserId = function (userId) {
  return request.get('ai/chat/topics/history/' + userId, {}, { showErrorToast: false });
};

/**
 * 某会话消息详情（topicId 即 conversationId）
 * GET ai/chat/topic/{topicId}/messages
 */
var getTopicMessages = function (topicId) {
  return request.get('ai/chat/topic/' + topicId + '/messages', {}, { showErrorToast: false });
};

// ============================================================
// 门店画像
// ============================================================

/**
 * 获取门店画像
 * GET gbairestaurantprofile/info/{departmentId}
 */
var getAiProfile = function (departmentId) {
  return request.get('gbairestaurantprofile/info/' + departmentId);
};

/**
 * 创建/更新门店画像
 * POST gbairestaurantprofile/saveProfile
 */
var updateAiProfile = function (data) {
  return request.post('gbairestaurantprofile/saveProfile', data);
};

// ============================================================
// 营业额统计
// ============================================================

/**
 * 获取营业额统计
 * GET ai/daily-revenue/stats/{departmentId}?startDate=&endDate=
 *
 * @param {number|string} departmentId 父部门 ID
 * @param {{ startDate?: string, endDate?: string }} [query] yyyy-MM-dd，可选；与核销、日营收统计区间对齐
 */
var getRevenueStats = function (departmentId, query) {
  query = query || {};
  var data = {};
  if (query.startDate) data.startDate = query.startDate;
  if (query.endDate) data.endDate = query.endDate;
  return request.get('ai/daily-revenue/stats/' + departmentId, data);
};

// ============================================================
// 导出
// ============================================================

module.exports = {
  // AI 对话
  createConversation: createConversation,
  sendMessage: sendMessage,
  sendMessageStream: sendMessageStream,
  getHistory: getHistory,
  endConversation: endConversation,
  getRecommendedTopics: getRecommendedTopics,
  getTopicsHistoryByUserId: getTopicsHistoryByUserId,
  getTopicMessages: getTopicMessages,
  // 门店画像
  getAiProfile: getAiProfile,
  updateAiProfile: updateAiProfile,
  // 营业额统计
  getRevenueStats: getRevenueStats,
};
