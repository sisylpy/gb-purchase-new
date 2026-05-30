/**
 * AI 对话页（算账版）— 布局与交互参考 Google Gemini 浅色客户端
 *
 * 接口（新版 Run API）：
 * - getAdvisorDetail(advisorId)        GET ai/advisors/{id}?scene=MINIAPP（统一顾问详情，含推荐问题）
 * - createAiRun(payload)               POST /ai/runs
 * - connectAiRunSse(runId, handlers)   GET  /ai/runs/{runId}/events（SSE 命名事件流）
 * - stopAiRun(runId)                   POST /ai/runs/{runId}/stop
 * - listConversations(userId)          GET /ai/conversations
 * - getConversationMessages(convId)    GET /ai/conversations/{id}/messages
 */

var ai = require('../../../services/api');
var aiRichText = require('../../../utils/aiRichText');

/**
 * 与后端 depUser 应用端类型一致（gbDuAdmin）
 * GROUP_MANAGER_APP=0 集团管理端；STORE_MANAGER_APP=11 门店管理端；STORE_ORDER_APP=12 部门用户端
 */
var GB_DU_ADMIN_GROUP_MANAGER_APP = 0;
var GB_DU_ADMIN_STORE_MANAGER_APP = 11;
var GB_DU_ADMIN_STORE_ORDER_APP = 12;


/** 菜单经营顾问固定 advisorId */
var MENU_OPERATION_ADVISOR_ID = 13;

/** 与后端 topic id 对齐，用于 pill 左侧 emoji */
function emojiForTopicId(id) {
  var map = {
    'dish-profit': '🍲',
    'procurement-structure': '💰',
    'profit-gap': '📉',
    'weekly-checkup': '📋',
  };
  return map[id] || '✨';
}

/**
 * 将 commonWorkflows 转换为 topic 格式（兜底展示）
 * 每个 workflow 作为一个 topic，topic 下包含一个可点击问题，text 为 workflow.title
 */
function mapWorkflowsToTopics(workflows) {
  if (!workflows || !Array.isArray(workflows) || !workflows.length) return null;
  return workflows.map(function (wf) {
    var enabled = wf.enabled !== false;
    var status = (wf.status || 'ACTIVE').toUpperCase();
    var clickable = enabled && status !== 'COMING_SOON';
    return {
      title: wf.title || '',
      description: wf.description || '',
      questions: [{
        text: wf.title || '',
        clickable: clickable,
        status: status,
        workflowCode: wf.workflowCode || '',
        questionCode: wf.workflowCode || '',
        id: wf.workflowId || wf.workflowCode || ('wf_' + (wf.title || '').substring(0, 20)),
      }],
    };
  });
}

/**
 * 从统一顾问详情接口响应中提取 questionTopics 数组
 * GET /api/ai/advisors/{advisorId}?scene=MINIAPP
 * 响应格式: CommonResult<{ questionTopics?: Array, commonWorkflows?: Array }>
 * 优先 questionTopics，为空时回退 commonWorkflows
 */
function extractSuggestedTopicsPayload(result) {
  if (!result) return null;
  var code = result.code;
  if (code !== undefined && code !== 0 && code !== '0') return null;
  var d = result.data;
  // 优先 questionTopics
  if (d && Array.isArray(d.questionTopics) && d.questionTopics.length > 0) return d.questionTopics;
  // 兜底：commonWorkflows → topic 格式
  var wfTopics = mapWorkflowsToTopics(d && d.commonWorkflows);
  if (wfTopics) return wfTopics;
  // 兼容旧格式
  if (d && Array.isArray(d.questionTopics)) return d.questionTopics;
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.topics)) return d.topics;
  return null;
}

/** 子问题规范化（统一顾问详情接口格式，使用 clickable 替代 enabled） */
function normalizeSuggestedQuestion(raw) {
  var text = raw.text || '';
  var status = (raw.status || 'ACTIVE').toUpperCase();
  var clickable = raw.clickable !== false && status !== 'COMING_SOON';
  var id = raw.id || raw.questionCode || ('q_' + text.substring(0, 20));
  return {
    id: id,
    text: text,
    status: status,
    clickable: clickable,
    // 用于展示和后续埋点，前端不参与路由
    workflowCode: raw.workflowCode || '',
    questionCode: raw.questionCode || '',
    // 兼容旧字段（debug only，前端不参与路由）
    intentHint: raw.intentHint || '',
    contractHint: raw.contractHint || '',
  };
}

/** 主题规范化（新接口格式） */
function normalizeSuggestedTopic(raw, index) {
  var title = raw.title || '';
  var description = raw.description || '';
  var qArr = raw.questions || [];
  var questions = (Array.isArray(qArr) ? qArr : []).map(normalizeSuggestedQuestion);
  return {
    id: raw.topicId || raw.id || String(index),
    title: title,
    description: description,
    questions: questions,
    emoji: emojiForTopicId(raw.topicId || raw.id || String(index)),
  };
}

/**
 * 从登录态解析 Run 请求的基础参数
 * @param {Object} userInfo wx.getStorageSync('userInfo')
 * @returns {{ userId, scopeMode, departmentId?, distributerId? } | null}
 */
function buildRunPayloadBase(userInfo) {
  var disInfo = wx.getStorageSync('disInfo') || {};
  var distributerIdRaw = userInfo.gbDuDistributerId || disInfo.gbDistributerId;
  var departmentIdRaw = userInfo.gbDuDepartmentId || userInfo.gbDepartmentId;

  function positiveNum(v) {
    if (v === null || v === undefined || v === '') return null;
    var n = Number(v);
    if (isNaN(n) || n <= 0) return null;
    return n;
  }

  var userId = positiveNum(userInfo.gbDepartmentUserId);
  var dDep = positiveNum(departmentIdRaw);
  var dDis = positiveNum(distributerIdRaw);

  var rawAdmin = userInfo.gbDuAdmin;
  var adminNum =
    rawAdmin === null || rawAdmin === undefined || rawAdmin === ''
      ? NaN
      : Number(rawAdmin);
  var isGroupManagerApp = adminNum === GB_DU_ADMIN_GROUP_MANAGER_APP;
  var isStoreManagerApp = adminNum === GB_DU_ADMIN_STORE_MANAGER_APP;
  var isStoreOrderApp = adminNum === GB_DU_ADMIN_STORE_ORDER_APP;

  if (!userId) {
    console.log('[AI对话][范围判定] 结果: 无法创建 — 无有效 userId');
    return null;
  }

  var payload;

  // 集团管理端(0)：全集团 GROUP
  if (isGroupManagerApp) {
    if (!dDis) {
      console.log('[AI对话][范围判定] 结果: 无法创建 — 集团管理端须提供 distributerId');
      return null;
    }
    payload = { userId: userId, scopeMode: 'GROUP', distributerId: dDis };
  } else if (isStoreManagerApp || isStoreOrderApp) {
    if (dDep) {
      payload = { userId: userId, scopeMode: 'STORE', departmentId: dDep };
    } else if (dDis) {
      payload = { userId: userId, scopeMode: 'GROUP', distributerId: dDis };
    } else {
      console.log('[AI对话][范围判定] 结果: 无法创建 — 门店/部门端无有效 departmentId 与 distributerId');
      return null;
    }
  } else if (dDep) {
    payload = { userId: userId, scopeMode: 'STORE', departmentId: dDep };
  } else if (dDis) {
    payload = { userId: userId, scopeMode: 'GROUP', distributerId: dDis };
  } else {
    console.log('[AI对话][范围判定] 结果: 无法创建 — 既无 departmentId 也无 distributerId');
    return null;
  }

  console.log('[AI对话][Run参数]', payload);
  return payload;
}

function normalizeConversationRow(raw) {
  return {
    id: raw.id || raw.gbAiConversationId || raw.conversationId || raw.topicId,
    title:
      raw.title ||
      raw.topicTitle ||
      raw.summary ||
      raw.lastMessage ||
      raw.gbAiConversationTitle ||
      '对话',
    time:
      raw.updateTime ||
      raw.updatedAt ||
      raw.gbAiConversationUpdateTime ||
      raw.createTime ||
      raw.gbAiConversationCreateTime ||
      '',
  };
}

Page({
  data: {
    windowHeight: 600,
    statusBarHeight: 20,
    departmentId: 0,
    userId: 0,
    userInitial: '?',
    greetLine1: '你好',
    conversationId: null,
    isLoading: true,
    isSending: false,
    _sending: false,
    historyLoaded: false,
    messages: [],
    inputValue: '',
    scrollToView: '',
    topics: [],
    topicPageTitle: '',
    topicPageSubtitle: '',
    expandedTopicId: '',
    drawerOpen: false,
    drawerExpandedTopicId: '',
    drawerPaddingTop: 88,
    drawerScrollHeight: 400,
    conversationHistoryList: [],
    conversationHistoryLoading: false,
    /** 创建 Run 的基础参数（userId / departmentId / distributerId / scopeMode） */
    runPayloadBase: null,
    composerFocused: false,
    /** SSE 阶段文案 */
    streamingStage: '',
    /** 当前 Run ID */
    currentRunId: null,
    /** 页面标题（如 "菜单经营顾问"），空则使用默认 "经营看板" */
    pageTitle: '',
    /** 智能体 ID，用于加载推荐问题；由 URL 参数 advisorId 传入 */
    advisorId: null,
  },

  onLoad: function (options) {
    var that = this;
    options = options || {};
    var userInfo = wx.getStorageSync('userInfo') || {};
    var departmentId = userInfo.gbDuDepartmentId || userInfo.gbDepartmentId;
    var userId = userInfo.gbDepartmentUserId;
    var payload = buildRunPayloadBase(userInfo);
    var nick = userInfo.gbDuWxNickName || userInfo.nickName || '';
    var initial = '?';
    if (nick) {
      initial = nick.length === 1 ? nick : nick.charAt(nick.length - 1);
    }
    var greetLine1 = nick ? nick + '，你好' : '你好';

    // 从 URL 参数解析 advisorId 与 pageTitle（菜单经营顾问等固定入口传入）
    var advisorId = null;
    if (options.advisorId) {
      var parsed = Number(options.advisorId);
      if (!isNaN(parsed) && parsed > 0) advisorId = parsed;
    }
    var pageTitle = options.pageTitle ? decodeURIComponent(options.pageTitle) : '';

    // 菜单模式下调整问候语
    if (advisorId === MENU_OPERATION_ADVISOR_ID) {
      greetLine1 = '菜单经营顾问';
    }

    var sys = wx.getSystemInfoSync();
    var sb = sys.statusBarHeight || 20;
    var drawerPad = sb + 44;
    var drawerHeadApprox = 52;
    that.setData({
      departmentId: departmentId,
      userId: userId,
      userInitial: initial,
      greetLine1: greetLine1,
      windowHeight: sys.windowHeight,
      statusBarHeight: sb,
      drawerPaddingTop: drawerPad,
      drawerScrollHeight: Math.max(200, sys.windowHeight - drawerPad - drawerHeadApprox),
      runPayloadBase: payload,
      isLoading: false,
      advisorId: advisorId,
      pageTitle: pageTitle,
    });

    // 直接传参，避免 setData 异步导致 that.data.advisorId 尚未更新
    that._loadTopics(advisorId);
  },

  onUnload: function () {
    this._cleanupSse();
  },

  /**
   * 拉取推荐问题（老板常问）
   * @param {number|null} [forcedAdvisorId] 外部传入的 advisorId（如菜单顾问13），优先使用
   */
  _loadTopics: function (forcedAdvisorId) {
    var that = this;
    // 优先使用外部传入的 advisorId（避免 setData 异步时序问题）
    // 未传入时回退到原有逻辑：门店端用 departmentId，集团端用 distributerId
    var advisorId = forcedAdvisorId || that.data.advisorId;
    if (!advisorId) {
      advisorId = that.data.departmentId;
      var runBase = that.data.runPayloadBase;
      if (runBase && runBase.scopeMode === 'GROUP' && runBase.distributerId) {
        advisorId = runBase.distributerId;
      }
    }
    if (!advisorId) {
      that.setData({ topics: [], topicPageTitle: '', topicPageSubtitle: '' });
      return;
    }
    ai
      .getAdvisorDetail(advisorId)
      .then(function (res) {
        var result = res.result;
        var rawTopics = extractSuggestedTopicsPayload(result);
        if (!rawTopics || !rawTopics.length) {
          that.setData({
            topics: [],
            topicPageTitle: '',
            topicPageSubtitle: '',
          });
          return;
        }
        var topics = rawTopics
          .map(function (t, index) { return normalizeSuggestedTopic(t, index); })
          .filter(function (t) {
            return t.title && t.questions.length > 0;
          });
        that.setData({
          topicPageTitle: '',
          topicPageSubtitle: '',
          topics: topics,
        });
      })
      .catch(function () {
        // 接口失败时隐藏推荐问题模块，不影响聊天
        console.log('[AI对话] 推荐问题加载失败，隐藏模块');
        that.setData({ topics: [], topicPageTitle: '', topicPageSubtitle: '' });
      });
  },

  /** 将接口消息列表转为页面消息结构 */
  _mapRawMessagesToView: function (rawList) {
    var that = this;
    return (rawList || []).map(function (msg) {
      var role = msg.role || msg.gbAiMessageRole;
      var content = msg.content || msg.gbAiMessageContent || '';
      var cleaned = aiRichText.stripStreamingQuoteArtifacts(content);
      var trimmed = String(cleaned).trim();
      // 提取 cards：优先用 msg.cards（新统一格式），兼容旧 cardPayload
      var rawCards = null;
      if (Array.isArray(msg.cards) && msg.cards.length > 0) {
        rawCards = msg.cards;
      } else if (msg.cardPayload && msg.cardPayload.cardType) {
        // 兼容旧格式：归一化为新结构再包裹成数组
        var normalized = that._normalizeLegacyCard(msg.cardPayload);
        if (normalized) {
          rawCards = [normalized];
        }
      }
      var cards = rawCards ? that._normalizeCards(rawCards) : null;
      return {
        id: msg.id || msg.gbAiMessageId,
        role: role,
        content: cleaned,
        time: msg.createTime || msg.gbAiMessageCreateTime || msg.createdAt || '',
        richNodes: role === 'assistant' && trimmed ? aiRichText.markdownToRichHtml(cleaned) : '',
        cards: cards,
      };
    });
  },

  onOpenDrawerTap: function () {
    this.setData({ drawerOpen: true });
    this._loadConversationHistoryList();
  },

  onDrawerMaskTap: function () {
    this.setData({ drawerOpen: false, drawerExpandedTopicId: '' });
  },

  onDrawerCloseTap: function () {
    this.setData({ drawerOpen: false, drawerExpandedTopicId: '' });
  },

  /** 遮罩上滑动不穿透底层 */
  onDrawerTouchMove: function () {},

  _loadConversationHistoryList: function () {
    var that = this;
    var userId = that.data.userId;
    if (!userId) {
      that.setData({ conversationHistoryList: [], conversationHistoryLoading: false });
      return;
    }
    that.setData({ conversationHistoryLoading: true });
    ai
      .listConversations(userId, 1, 20)
      .then(function (res) {
        var items = res.items || [];
        var list = items
          .map(normalizeConversationRow)
          .filter(function (x) {
            return x.id !== undefined && x.id !== null && x.id !== '';
          });
        that.setData({ conversationHistoryList: list, conversationHistoryLoading: false });
      })
      .catch(function () {
        that.setData({ conversationHistoryLoading: false });
        wx.showToast({ title: '历史列表加载失败', icon: 'none' });
      });
  },

  onDrawerTopicHeaderTap: function (e) {
    var id = e.currentTarget.dataset.id;
    if (!id) return;
    var next = this.data.drawerExpandedTopicId === id ? '' : id;
    this.setData({ drawerExpandedTopicId: next });
  },

  onDrawerQuestionTap: function (e) {
    var text = e.currentTarget.dataset.text;
    var clickable = e.currentTarget.dataset.clickable !== false;
    if (!text || !clickable) return;
    this.setData({ drawerOpen: false, drawerExpandedTopicId: '' });
    this._fillInput(text);
  },

  onHistoryConversationTap: function (e) {
    var id = e.currentTarget.dataset.id;
    if (id === undefined || id === null || id === '') return;
    if (String(id) === String(this.data.conversationId)) {
      this.setData({ drawerOpen: false, drawerExpandedTopicId: '' });
      return;
    }
    this._switchToConversation(id);
  },

  _switchToConversation: function (conversationId) {
    var that = this;
    // 关闭当前 SSE
    that._cleanupSse();

    wx.showLoading({ title: '加载中', mask: true });
    ai
      .getConversationMessages(conversationId, that.data.userId)
      .then(function (res) {
        wx.hideLoading();
        var messages = res.messages || [];
        if (!messages.length) {
          wx.showToast({ title: '暂无消息', icon: 'none' });
          return;
        }
        var viewMessages = that._mapRawMessagesToView(messages);
        that.setData({
          conversationId: conversationId,
          messages: viewMessages,
          historyLoaded: true,
          drawerOpen: false,
          drawerExpandedTopicId: '',
          expandedTopicId: '',
          scrollToView: '',
        });
        that._scrollToBottom();
      })
      .catch(function () {
        wx.hideLoading();
        wx.showToast({ title: '加载失败', icon: 'none' });
      });
  },

  /** 新建对话：清空消息，回到空会话首页 */
  onNewConversationTap: function () {
    this._cleanupSse();
    this.setData({
      conversationId: null,
      messages: [],
      drawerOpen: false,
      drawerExpandedTopicId: '',
      inputValue: '',
      isSending: false,
      _sending: false,
    });
  },

  // ========== 发送消息 & SSE（新版 Run API） ==========

  /**
   * 清理 SSE 资源
   */
  _cleanupSse: function () {
    if (this._streamScrollTimer) {
      clearTimeout(this._streamScrollTimer);
      this._streamScrollTimer = null;
    }
    if (this._sseCtl && this._sseCtl.abort) {
      this._sseCtl.abort();
      this._sseCtl = null;
    }
    this.setData({ streamingStage: '', currentRunId: null });
  },

  /**
   * 发送一条用户消息
   * 流程：POST /ai/runs → GET /ai/runs/{runId}/events（SSE）
   * @param {string} [presetText] 若传入则使用该文案发送；否则用输入框内容
   */
  _sendMessage: function (presetText) {
    var that = this;
    var message =
      presetText !== undefined && presetText !== null && String(presetText).length > 0
        ? String(presetText).trim()
        : that.data.inputValue.trim();
    if (!message || that.data.isSending || that._sending) {
      if (!message && !that.data.isSending && !that._sending) {
        wx.showToast({ title: '请先输入内容', icon: 'none', duration: 1500 });
      }
      return;
    }

    // 关闭上一次 SSE
    that._cleanupSse();

    var runPayloadBase = that.data.runPayloadBase;
    if (!runPayloadBase || !runPayloadBase.userId) {
      wx.showToast({ title: '未获取到登录信息', icon: 'none' });
      return;
    }

    that._sending = true;

    var userMsg = {
      id: Date.now(),
      role: 'user',
      content: message,
      time: '',
      richNodes: '',
    };
    var aiMsg = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '',
      isLoading: true,
      time: '',
      richNodes: '',
    };
    var messages = that.data.messages.concat([userMsg, aiMsg]);
    that.setData(
      {
        historyLoaded: true,
        expandedTopicId: '',
        drawerOpen: false,
        drawerExpandedTopicId: '',
        inputValue: '',
        isSending: true,
        messages: messages,
        streamingStage: '',
      },
      function () {
        that._scrollToBottom();

        // 构建 createAiRun payload
        var payload = Object.assign({}, runPayloadBase, { message: message });
        if (that.data.conversationId) {
          payload.conversationId = that.data.conversationId;
        }

        ai
          .createAiRun(payload)
          .then(function (result) {
            console.log('[AI对话] createAiRun 返回', result);
            var runId = result.runId;
            var newCid = result.conversationId;

            // 回填 conversationId（首轮从后端获取）
            if (newCid && !that.data.conversationId) {
              that.setData({ conversationId: newCid });
            }

            that.setData({ currentRunId: runId });

            // 连接 SSE
            that._connectSse(runId, aiMsg.id);
          })
          .catch(function (err) {
            console.error('[AI对话] createAiRun 失败', err);
            var errMsg = (err && err.message) ? err.message : '请求失败，请重试';
            that._replaceAiMessage(aiMsg.id, errMsg);
            that._sending = false;
            that.setData({ isSending: false, streamingStage: '' });
          });
      }
    );
  },

  /**
   * 连接 SSE 事件流
   */
  _connectSse: function (runId, aiMsgId) {
    var that = this;
    var assistantBuffer = '';
    var flushTimer = null;
    var THROTTLE_MS = 48;
    /** SSE 过程中累积的统一 cards 数组 */
    var pendingCards = null;

    function clearFlushTimer() {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
    }

    function scheduleFlush() {
      if (flushTimer) return;
      flushTimer = setTimeout(function () {
        flushTimer = null;
        that._patchAssistantPlain(aiMsgId, assistantBuffer, true, false);
      }, THROTTLE_MS);
    }

    var handlers = {
      onStep: function (step) {
        console.log('[AI对话] onStep event:', step.event);
        // 更新阶段文案
        var stage = '';
        if (step.event === 'run_started') stage = '正在理解问题...';
        else if (step.event === 'agent_started') stage = '正在分析问题...';
        else if (step.event === 'tool_started') stage = '正在查询业务数据...';
        else if (step.event === 'review_started') stage = '正在审核回答质量...';
        else if (step.event === 'agent_finished') stage = '分析完成...';
        else if (step.event === 'tool_finished') stage = '数据查询完成...';
        if (stage) {
          that.setData({ streamingStage: stage });
        }
        // 优先级 1: event.data.cards（SSE 新出口）
        var stepData = step.data || {};
        var rawCards = (stepData.cards) || (step.cards) || null;
        if (rawCards && Array.isArray(rawCards) && rawCards.length > 0) {
          pendingCards = rawCards;
          console.log('[AI对话] onStep ✅ 捕获 cards[], 数量:', pendingCards.length, 'cardTypes:', pendingCards.map(function(c) { return c.cardType; }));
        }
        // 优先级 2: 兼容旧 event.data.cardPayload（归一化为 cards[]）
        if (!pendingCards) {
          var old = stepData.cardPayload || step.cardPayload || null;
          if (old && old.cardType) {
            var normalized = that._normalizeLegacyCard(old);
            if (normalized) {
              pendingCards = [normalized];
              console.log('[AI对话] onStep ✅ 从旧 cardPayload 归一化, cardType:', normalized.cardType, 'payload=', Object.keys(normalized.payload || {}));
            }
          }
        }
      },
      onDelta: function (delta) {
        assistantBuffer += delta || '';
        that.setData({ streamingStage: '正在生成回答...' });
        if (assistantBuffer.length > 0) {
          scheduleFlush();
        }
      },
      onFinished: function () {
        clearFlushTimer();
        that._patchAssistantPlain(aiMsgId, assistantBuffer, false, false);
        var t = (assistantBuffer || '').trim();

        console.log('[AI对话] onFinished, pendingCards:', pendingCards ? pendingCards.length : 0);

        function finishUp(cards) {
          console.log('[AI对话] finishUp cards 数量:', cards ? cards.length : 0);
          if (t) {
            that._replaceAiMessage(aiMsgId, t, cards);
          } else {
            that._patchAssistantPlain(aiMsgId, assistantBuffer, false, false);
            if (cards && cards.length > 0) {
              that._patchCardPayload(aiMsgId, cards);
            }
          }
          that._sending = false;
          that.setData({ isSending: false, streamingStage: '', currentRunId: null });
        }

        if (pendingCards && pendingCards.length > 0) {
          finishUp(pendingCards);
        } else {
          // SSE 中没有 cards，尝试从 run detail 获取
          console.log('[AI对话] onFinished SSE 无 cards，调用 getAiRun fallback...');
          ai.getAiRun(runId)
            .then(function (res) {
              var result = res.result || res;
              // 优先级 1: result.cards（新出口）
              var fallbackCards = result.cards || (result.data && result.data.cards) || null;
              if (fallbackCards && Array.isArray(fallbackCards) && fallbackCards.length > 0) {
                console.log('[AI对话] getAiRun fallback cards[], 数量:', fallbackCards.length);
                finishUp(fallbackCards);
                return;
              }
              // 优先级 2: 兼容旧 result.cardPayload
              var old = result.cardPayload || (result.data && result.data.cardPayload) || null;
              if (old && old.cardType) {
                var normalized = that._normalizeLegacyCard(old);
                if (normalized) {
                  console.log('[AI对话] getAiRun fallback 从旧 cardPayload 归一化:', normalized.cardType);
                  finishUp([normalized]);
                  return;
                }
              }
              finishUp(null);
            })
            .catch(function (err) {
              console.log('[AI对话] getAiRun fallback 失败', err);
              finishUp(null);
            });
        }
      },
      onError: function (errMsg) {
        clearFlushTimer();
        var finalContent = assistantBuffer || errMsg || '生成失败，请稍后再试';
        that._replaceAiMessage(aiMsgId, finalContent);
        that._sending = false;
        that.setData({ isSending: false, streamingStage: '', currentRunId: null });
      },
    };

    var ctl = ai.connectAiRunSse(runId, handlers);
    that._sseCtl = ctl;

    ctl.promise
      .then(function () {
        that._sseCtl = null;
      })
      .catch(function (err) {
        that._sseCtl = null;
        if (err && err.type === 'aborted') return;
        if (err && err.type === 'http' && err.statusCode === 401) return;
        if (err && err.type === 'no_chunk') {
          that._replaceAiMessage(aiMsgId, '当前微信版本不支持流式传输，请更新微信');
          that._sending = false;
          that.setData({ isSending: false, streamingStage: '', currentRunId: null });
        }
      });
  },

  /** 停止生成 */
  onStopGeneratingTap: function () {
    var that = this;
    var runId = that.data.currentRunId;
    console.log('[AI对话] 用户停止生成, runId =', runId);
    if (runId) {
      ai.stopAiRun(runId).catch(function () {});
    }
    that._cleanupSse();
    // 将当前正在生成的消息结束加载态
    var messages = that.data.messages;
    for (var i = messages.length - 1; i >= 0; i--) {
      if (messages[i].isLoading) {
        var patch = {};
        patch['messages[' + i + '].isLoading'] = false;
        that.setData(patch);
        break;
      }
    }
    that._sending = false;
    that.setData({ isSending: false, streamingStage: '', currentRunId: null });
  },

  _patchAssistantPlain: function (msgId, content, stillLoading, plainStream) {
    var list = this.data.messages;
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === msgId && list[i].role === 'assistant') {
        idx = i;
        break;
      }
    }
    if (idx < 0) {
      console.warn('[AI对话] patch 未找到助手气泡 msgId=', msgId, 'messagesLen=', list.length);
      return;
    }
    var cleaned = aiRichText.stripStreamingQuoteArtifacts(content);
    var trimmed = String(cleaned).trim();
    var richNodes = '';
    if (!plainStream && trimmed) {
      richNodes = aiRichText.markdownToRichHtml(cleaned);
    }
    var patch = {};
    patch['messages[' + idx + '].content'] = cleaned;
    patch['messages[' + idx + '].isLoading'] = !!stillLoading;
    patch['messages[' + idx + '].richNodes'] = richNodes;
    this.setData(patch);
    var self = this;
    if (self._streamScrollTimer) clearTimeout(self._streamScrollTimer);
    self._streamScrollTimer = setTimeout(function () {
      self._streamScrollTimer = null;
      self._scrollToBottom();
    }, 300);
  },

  _replaceAiMessage: function (msgId, content, cards) {
    var that = this;
    var list = that.data.messages;
    var idx = -1;
    var role = '';
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === msgId) {
        idx = i;
        role = list[i].role || '';
        break;
      }
    }
    if (idx < 0) return;
    var cleaned = aiRichText.stripStreamingQuoteArtifacts(content);
    var trimmed = String(cleaned).trim();
    var richNodes =
      role === 'assistant' && trimmed ? aiRichText.markdownToRichHtml(cleaned) : '';
    var patch = {};
    patch['messages[' + idx + '].content'] = cleaned;
    patch['messages[' + idx + '].isLoading'] = false;
    patch['messages[' + idx + '].richNodes'] = richNodes;
    // 统一处理 cards：每张 card 通过 _resolveDisplayCard 提取 cardData
    if (cards && Array.isArray(cards) && cards.length > 0) {
      console.log('[AI对话] _replaceAiMessage 处理 cards, 数量:', cards.length);
      var normalized = that._normalizeCards(cards);
      console.log('[AI对话] _replaceAiMessage normalized cards:', normalized ? normalized.length : 0);
      if (normalized && normalized.length > 0) {
        patch['messages[' + idx + '].cards'] = normalized;
      }
    }
    if (that._streamScrollTimer) {
      clearTimeout(that._streamScrollTimer);
      that._streamScrollTimer = null;
    }
    that.setData(patch);
    that._scrollToBottom();
  },

  /**
   * 向指定 AI 消息写入 cards（无正文时使用）
   */
  _patchCardPayload: function (msgId, cards) {
    console.log('[AI对话] _patchCardPayload 进入, msgId:', msgId, 'cards:', cards ? cards.length : 0);
    if (!cards || !Array.isArray(cards) || cards.length === 0) return;
    var that = this;
    var list = this.data.messages;
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === msgId && list[i].role === 'assistant') {
        idx = i;
        break;
      }
    }
    if (idx < 0) return;
    var normalized = that._normalizeCards(cards);
    if (!normalized || normalized.length === 0) return;
    var patch = {};
    patch['messages[' + idx + '].cards'] = normalized;
    this.setData(patch);
  },

  /**
   * 旧 cardPayload → 新 cards[] 结构归一化
   * 旧结构: { cardType, title, subtitle, chartType, data, source }
   * 新结构: { cardType, title, subtitle, chartType, payload, source }
   * 归一化: payload = old.payload || old.data
   */
  _normalizeLegacyCard: function (old) {
    if (!old || !old.cardType) return null;
    return {
      cardType: old.cardType,
      title: old.title || '',
      subtitle: old.subtitle || '',
      chartType: old.chartType || '',
      payload: old.payload || old.data || null,
      source: old.source || '',
    };
  },

  /**
   * 标准化 cards 数组：每张卡通过 _resolveDisplayCard 提取 cardData
   * 统一输入格式：[{ cardType, title, subtitle, chartType, payload }]
   * 统一输出格式：[{ cardType, cardData }]
   */
  _normalizeCards: function (cards) {
    if (!cards || !Array.isArray(cards)) return null;
    var that = this;
    console.log('[AI对话] _normalizeCards 输入数量:', cards.length);
    return cards.map(function (card) {
      return that._resolveDisplayCard(card);
    }).filter(Boolean);
  },

  /**
   * 解析单个 card：从 card.payload 提取 cardData
   * card 统一格式：{ cardType, title, subtitle, chartType, payload }
   * 输出：{ cardType, cardData }
   */
  _resolveDisplayCard: function (card) {
    if (!card || !card.cardType) {
      console.log('[AI对话] _resolveDisplayCard ❌ card 无效或缺少 cardType');
      return null;
    }
    // 兼容：payload = card.payload（新格式）|| card.data（旧 cardPayload 格式）
    var payload = card.payload || card.data || null;
    console.log('[AI对话] _resolveDisplayCard cardType:', card.cardType, 'hasPayload:', !!payload);

    if (card.cardType === 'MENU_PORTFOLIO_QUADRANT_CARD') {
      // payload.categories 必须是数组且长度为 4（四象限）
      if (!payload || !Array.isArray(payload.categories) || payload.categories.length !== 4) {
        console.log('[AI对话] _resolveDisplayCard ⚠️ 四象限卡 categories 不合法, categories:', payload && payload.categories ? payload.categories.length : 'N/A');
        return null;
      }
      // 饼图数据字段：categoryName / count / ratio
      // 组件需要 { title, subtitle, totalDishCount, categories }
      return {
        cardType: card.cardType,
        cardData: {
          title: card.title || payload.title || '菜单结构四象限',
          subtitle: card.subtitle || payload.subtitle || '本轮菜单内相对分层（销量与实际利润中位数阈值，非绝对行业标准）',
          totalDishCount: payload.totalDishCount || 0,
          categories: payload.categories,
        },
      };
    }

    if (card.cardType === 'DISH_COST_ANALYSIS_CARD') {
      return {
        cardType: card.cardType,
        cardData: payload,
      };
    }

    if (card.cardType === 'DISH_SALES_CARD') {
      return {
        cardType: card.cardType,
        cardData: payload,
      };
    }

    // 未知 cardType：直接透传 payload
    console.log('[AI对话] _resolveDisplayCard 未知 cardType，透传:', card.cardType);
    return {
      cardType: card.cardType,
      cardData: payload,
    };
  },

  _scrollToBottom: function () {
    var that = this;
    setTimeout(function () {
      var len = that.data.messages.length;
      if (len > 0) {
        that.setData({ scrollToView: 'msg-' + (len - 1) });
      }
    }, 100);
  },

  onInputChange: function (e) {
    this.setData({ inputValue: e.detail.value });
  },

  onComposerFocus: function () {
    this.setData({ composerFocused: true });
  },

  onComposerBlur: function () {
    this.setData({ composerFocused: false });
  },

  onSendTap: function () {
    this._sendMessage();
  },

  /** 点击主题行：展开 / 收起子问题列表 */
  onTopicHeaderTap: function (e) {
    var id = e.currentTarget.dataset.id;
    if (!id) return;
    var next = this.data.expandedTopicId === id ? '' : id;
    this.setData({ expandedTopicId: next });
  },

  /**
   * 点击子问题：填入输入框并聚焦，不自动发送
   * clickable=false / COMING_SOON 的问题灰态不可点击
   */
  onQuestionTap: function (e) {
    var text = e.currentTarget.dataset.text;
    var clickable = e.currentTarget.dataset.clickable !== false;
    if (!text || !clickable) return;
    this._fillInput(text);
  },

  /**
   * 将问题文本填入底部输入框并聚焦
   */
  _fillInput: function (text) {
    this.setData({ inputValue: text, composerFocused: true });
  },

  onMenuTap: function () {
    var that = this;
    wx.showActionSheet({
      itemList: ['返回上一页'],
      success: function (res) {
        if (res.tapIndex === 0) {
          that.toBack();
        }
      },
    });
  },

  onProfileTap: function () {
    // 与 Gemini 一致：头像为状态展示，无跳转
  },

  toBack: function () {
    wx.navigateBack();
  },
});
