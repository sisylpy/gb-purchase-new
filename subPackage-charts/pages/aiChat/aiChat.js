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

var ai = require('../../services/api');
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
    /** SSE 阶段文案列表（新 stage 会把旧 stage 向上滚动） */
    streamingStages: [],
    /** 当前 Run ID */
    currentRunId: null,
    /** 页面标题（如 "菜单经营顾问"），空则使用默认 "经营看板" */
    pageTitle: '',
    /** 智能体 ID，用于加载推荐问题；由 URL 参数 advisorId 传入 */
    advisorId: null,
    /** 是否展示调试 JSON */
    showDebugJson: true,
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
      // 提取 cards
      var rawCards = null;
      if (Array.isArray(msg.cards) && msg.cards.length > 0) {
        rawCards = msg.cards;
      }
      var cards = rawCards ? that._normalizeCards(rawCards) : null;
      // 提取 answerPreview / contextSummary（历史消息）
      var answerPreview = msg.answerPreview || '';
      var contextSummary = that._cleanContextSummary(msg.contextSummary);
      return {
        id: msg.id || msg.gbAiMessageId,
        role: role,
        content: cleaned,
        time: msg.createTime || msg.gbAiMessageCreateTime || msg.createdAt || '',
        richNodes: role === 'assistant' && trimmed ? aiRichText.markdownToRichHtml(cleaned) : '',
        cards: cards,
        answerPreview: answerPreview,
        contextSummary: contextSummary,
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
    this._sendMessage(text);
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
    this.setData({ streamingStages: [], currentRunId: null });
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
        streamingStages: ['正在连接...'],
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

            // 连接 SSE（传入 createAiRun 原始结果用于调试）
            that._connectSse(runId, aiMsg.id, result);
          })
          .catch(function (err) {
            console.error('[AI对话] createAiRun 失败', err);
            var errMsg = (err && err.message) ? err.message : '请求失败，请重试';
            that._replaceAiMessage(aiMsg.id, errMsg);
            that._sending = false;
            that.setData({ isSending: false, streamingStages: [] });
          });
      }
    );
  },

  /**
   * 连接 SSE 事件流
   */
  _connectSse: function (runId, aiMsgId, runResult) {
    var that = this;
    var assistantBuffer = '';
    var flushTimer = null;
    var THROTTLE_MS = 48;
    /** SSE 过程中累积的统一 cards 数组 */
    var pendingCards = null;
    /** SSE 过程中累积的 answerPreview / contextSummary */
    var pendingAnswerPreview = null;
    var pendingContextSummary = null;
    /** 调试用：createAiRun 返回结果 */
    var debugRunResult = runResult || null;
    /** 调试用：收集所有原始 SSE 事件 */
    var debugEvents = [];

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
        // 更新阶段文案
        var stage = '';
        if (step.event === 'run_started') stage = '正在理解问题...';
        else if (step.event === 'agent_started') stage = '正在分析问题...';
        else if (step.event === 'tool_started') stage = '正在查询业务数据...';
        else if (step.event === 'review_started') stage = '正在审核回答质量...';
        else if (step.event === 'agent_finished') stage = '分析完成...';
        else if (step.event === 'tool_finished') stage = '数据查询完成...';
        if (stage) {
          var prev = that.data.streamingStages || [];
          // 避免重复 push 相同文案
          if (prev.length === 0 || prev[prev.length - 1] !== stage) {
            that.setData({ streamingStages: prev.concat([stage]) });
          }
        }

        // 捕获 answerPreview / contextSummary（后续事件覆盖前值）
        if (step.answerPreview) {
          pendingAnswerPreview = step.answerPreview;
        }
        if (step.contextSummary) {
          pendingContextSummary = that._cleanContextSummary(step.contextSummary);
        }

        // 捕获 cards（SSE step.data.cards）
        var stepData = step.data || {};
        var rawCards = stepData.cards || step.cards || null;
        if (rawCards && Array.isArray(rawCards) && rawCards.length > 0) {
          pendingCards = rawCards;
        }
      },
      onDelta: function (delta) {
        assistantBuffer += delta || '';
        var stage = '正在生成回答...';
        var prev = that.data.streamingStages || [];
        if (prev.length === 0 || prev[prev.length - 1] !== stage) {
          that.setData({ streamingStages: prev.concat([stage]) });
        }
        if (assistantBuffer.length > 0) {
          scheduleFlush();
        }
      },
      onFinished: function () {
        clearFlushTimer();
        that._patchAssistantPlain(aiMsgId, assistantBuffer, false, false);
        var t = (assistantBuffer || '').trim();

        var finalCtxSummary = pendingContextSummary || null;
        var finalAnswerPreview = pendingAnswerPreview || '';

        function finishUp(cards, answerPreview, contextSummary) {
          if (t) {
            that._replaceAiMessage(aiMsgId, t, cards, answerPreview, contextSummary);
          } else {
            that._patchAssistantPlain(aiMsgId, assistantBuffer, false, false);
            if (cards && cards.length > 0) {
              that._patchCardPayload(aiMsgId, cards, answerPreview, contextSummary);
            }
          }
          that._saveDebugData(aiMsgId, debugRunResult, debugEvents);
          that._sending = false;
          that.setData({ isSending: false, streamingStages: [], currentRunId: null });
        }

        if (pendingCards && pendingCards.length > 0) {
          finishUp(pendingCards, finalAnswerPreview, finalCtxSummary);
        } else {
          // SSE 中没有 cards，尝试从 run detail 获取
          ai.getAiRun(runId)
            .then(function (res) {
              var result = res.result || res;
              // run detail 中提取 answerPreview / contextSummary
              var ap = (result && typeof result.answerPreview === 'string') ? result.answerPreview : (finalAnswerPreview || '');
              var cs = (result && result.contextSummary) ? that._cleanContextSummary(result.contextSummary) : pendingContextSummary;
              // 提取 cards
              var fallbackCards = result.cards || (result.data && result.data.cards) || null;
              if (fallbackCards && Array.isArray(fallbackCards) && fallbackCards.length > 0) {
                finishUp(fallbackCards, ap, cs);
                return;
              }
              finishUp(null, '', null);
            })
            .catch(function (err) {
              console.log('[AI对话] getAiRun fallback 失败', err);
              finishUp(null, '', '');
            });
        }
      },
      onError: function (errMsg) {
        clearFlushTimer();
        var finalContent = assistantBuffer || errMsg || '生成失败，请稍后再试';
        that._replaceAiMessage(aiMsgId, finalContent);
        // 保存调试数据（即使出错也记录）
        that._saveDebugData(aiMsgId, debugRunResult, debugEvents);
        that._sending = false;
        that.setData({ isSending: false, streamingStages: [], currentRunId: null });
      },
      /** 调试用：收口每个原始 SSE 事件 */
      onRawEvent: function (flat, ev) {
        debugEvents.push({
          event: ev,
          data: flat,
        });
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
          that.setData({ isSending: false, streamingStages: [], currentRunId: null });
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
    that.setData({ isSending: false, streamingStages: [], currentRunId: null });
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

  _replaceAiMessage: function (msgId, content, cards, answerPreview, contextSummary) {
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
      var normalized = that._normalizeCards(cards);
      if (normalized && normalized.length > 0) {
        patch['messages[' + idx + '].cards'] = normalized;
      }
    }
    // 存储 answerPreview / contextSummary（有业务卡片时展示）
    if (answerPreview !== undefined) {
      patch['messages[' + idx + '].answerPreview'] = answerPreview || '';
    }
    if (contextSummary !== undefined) {
      patch['messages[' + idx + '].contextSummary'] = contextSummary || null;
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
  _patchCardPayload: function (msgId, cards, answerPreview, contextSummary) {
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
    if (answerPreview !== undefined) {
      patch['messages[' + idx + '].answerPreview'] = answerPreview || '';
    }
    if (contextSummary !== undefined) {
      patch['messages[' + idx + '].contextSummary'] = contextSummary || null;
    }
    this.setData(patch);
  },

  /**
   * 清洗 contextSummary：去除 contextBar 中的重复日期、过滤长文占位
   * 返回清洗后的 contextSummary 副本（或 null）
   */
  _cleanContextSummary: function (cs) {
    if (!cs || typeof cs !== 'object') return null;
    var cleaned = cs.contextBar;
    if (cleaned && typeof cleaned === 'string') {
      cleaned = cleaned.trim();
      // 去掉重复日期段：YYYY-MM-DD~YYYY-MM-DD MM/DD-MM/DD → MM/DD-MM/DD
      cleaned = cleaned.replace(/\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}\s+(\d{2}\/\d{2}\s*[-–—]\s*\d{2}\/\d{2})/g, '$1');
      // 过滤长文占位句
      if (/^门店沿用|^【查询范围】|^下面按本门店/.test(cleaned)) {
        cleaned = '';
      }
    }
    return {
      contextBar: cleaned || '',
      storeText: cs.storeText || '',
      timeText: cs.timeText || '',
      dateRangeText: cs.dateRangeText || '',
      scopeText: cs.scopeText || '',
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
    console.log('[AI对话] _resolveDisplayCard dc.cardType:', card.cardType, 'card:', JSON.stringify(card));
    var payload = card.payload || null;

    if (card.cardType === 'MENU_PORTFOLIO_QUADRANT_CARD') {
      var cats = (payload && Array.isArray(payload.categories)) ? payload.categories : [];
      // 空状态：返回带 emptyReason 的 cardData，让组件显示提示文案
      if (cats.length === 0) {
        return {
          cardType: card.cardType,
          cardData: {
            title: card.title || '菜单结构四象限',
            subtitle: '',
            totalDishCount: 0,
            categories: [],
            emptyReason: card.subtitle || (payload && payload.noDataReason) || '该时间范围内暂无菜品数据，暂不能做菜单结构分析',
          },
        };
      }
      // 正常数据
      return {
        cardType: card.cardType,
        cardData: {
          title: card.title || payload.title || '菜单结构四象限',
          subtitle: card.subtitle || payload.subtitle || '本轮菜单内相对分层（销量与实际利润中位数阈值，非绝对行业标准）',
          totalDishCount: payload.totalDishCount || 0,
          categories: cats,
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

    if (card.cardType === 'MENU_HIGH_SALES_LOW_MARGIN_CARD') {
      // EMPTY 空态：payload.status === "EMPTY"
      var isEmpty = payload && payload.status === 'EMPTY';
      return {
        cardType: card.cardType,
        cardData: {
          title: card.title || payload.title || '畅销低利菜',
          totalRiskDishCount: payload ? payload.totalRiskDishCount : 0,
          summary: payload ? payload.summary : '',
          dishes: payload && Array.isArray(payload.dishes) ? payload.dishes : [],
          empty: isEmpty,
        },
      };
    }

    if (card.cardType === 'MENU_ACTION_RECOMMENDATION_CARD') {

      var isEmpty2 = payload && payload.status === 'EMPTY';

      // AI presentation 字段（优先 mainSummary，fallback 到 summary）
      var aiContent = {
        mainSummary: payload ? (payload.mainSummary || payload.summary || '') : '',
        keyFindings: (payload && Array.isArray(payload.keyFindings)) ? payload.keyFindings : [],
        focusSections: (payload && Array.isArray(payload.focusSections)) ? payload.focusSections : [],
        nextSteps: (payload && Array.isArray(payload.nextSteps)) ? payload.nextSteps : [],
        supportingEvidence: (payload && Array.isArray(payload.supportingEvidence)) ? payload.supportingEvidence : [],
        capabilityBoundaryZh: payload ? (payload.capabilityBoundaryZh || '') : '',
      };

      return {
        cardType: card.cardType,
        cardData: {
          title: card.title || (payload && payload.title) || '菜单优化方案',
          shopName: payload ? (payload.scopeLabel || payload.shopName || '') : '',
          timeLabel: payload ? (payload.timeLabel || '') : '',
          aiContent: aiContent,
          empty: isEmpty2,
        },
      };
    }

    if (card.cardType === 'DISH_PROFIT_PRESCRIPTION_CARD') {

      // 子容器
      var pricing = (payload && payload.pricing && typeof payload.pricing === 'object') ? payload.pricing : null;
      var margin = (payload && payload.margin && typeof payload.margin === 'object') ? payload.margin : null;
      var sp = (payload && payload.suggestedPrice && typeof payload.suggestedPrice === 'object') ? payload.suggestedPrice : null;
      var diagnosis = (payload && payload.diagnosis && typeof payload.diagnosis === 'object') ? payload.diagnosis : null;

      // 辅助：从多个容器中按候选字段名取值（左侧容器优先）
      var _getMulti = function () {
        var args = Array.prototype.slice.call(arguments);
        var names = args[args.length - 1]; // 最后一个参数是候选字段名数组
        for (var ci = 0; ci < args.length - 1; ci++) {
          var obj = args[ci];
          if (!obj) continue;
          for (var ni = 0; ni < names.length; ni++) {
            var v = obj[names[ni]];
            if (v !== undefined && v !== null) return v;
          }
        }
        return undefined;
      };

      // 能力边界 → 中文提示
      var caps = payload && payload.capabilityLimits;
      var capabilityHints = [];
      if (caps && typeof caps === 'object' && !Array.isArray(caps)) {
        if (caps.crossStoreDishRank === 'NOT_IN_P1') capabilityHints.push('暂不支持跨门店菜品排名对比');
        if (caps.latestPurchasePrice === 'NOT_IN_P1') capabilityHints.push('暂不包含最新采购价');
        if (caps.externalMarketBenchmark === 'NOT_IN_P1') capabilityHints.push('暂不包含外部市场价格基准');
      }

      return {
        cardType: card.cardType,
        cardData: {
          title: card.title || (payload && payload.title) || '菜品价格与配方诊断',
          dishName: payload ? (payload.dishName || '') : '',
          status: payload ? (payload.status || '') : '',
          diagnosisSummary: (diagnosis && diagnosis.headlineZh) || (payload && payload.summary) || '',
          // 价格建议 — 按真实路径：pricing → margin → 顶层
          currentPrice: _getMulti(pricing, margin, payload, ['salesUnitPrice', 'listPricePerPortion', 'currentPrice', 'salePrice']),
          actualCostPerPortion123: _getMulti(margin, pricing, payload, ['actualCostPerPortion123', 'actualCostPerPortion', 'actualCost']),
          targetGrossMarginRate: _getMulti(sp, margin, payload, ['targetGrossMarginRate', 'grossMarginStandardTarget', 'targetMarginRate']),
          suggestedPrice: _getMulti(sp, payload, ['suggestedPricePerPortion', 'suggestedPrice', 'advisedPrice']),
          formulaId: _getMulti(sp, payload, ['formulaId', 'formula']) || '',
          // 成本差异 — 按真实路径：margin → 顶层
          theoreticalCostPerPortion: _getMulti(margin, payload, ['theoryCostPerPortion', 'theoreticalCostPerPortion']),
          costGapPerPortion: _getMulti(margin, payload, ['diffCostPerPortion', 'costGapPerPortion', 'costGap']),
          costGapRate: _getMulti(margin, payload, ['costGapRate', 'gapRate']),
          // 配料复核
          ingredientRows: (payload && Array.isArray(payload.ingredientRows)) ? payload.ingredientRows : [],
          // 行动建议
          recommendedActions: (payload && Array.isArray(payload.recommendedActions)) ? payload.recommendedActions
            : (payload && Array.isArray(payload.actions)) ? payload.actions : [],
          // 能力边界（已转为中文提示数组）
          capabilityHints: capabilityHints,
        },
      };
    }

    // 原料采购明细卡
    if (card.cardType === 'PURCHASE_GOODS_DETAIL_CARD') {
      return {
        cardType: card.cardType,
        cardData: Object.assign({
          title: card.title || '',
          timeLabel: (payload && payload.timeLabel) || '',
          reportLabel: card.subtitle || (payload && payload.reportLabel) || '',
          scopeLabel: (payload && payload.scopeLabel) || '',
          emptyReason: (payload && payload.emptyReason) || '',
          totalPurchaseAmount: (payload && payload.totalPurchaseAmount != null) ? payload.totalPurchaseAmount : null,
          purchaseOrderCount: (payload && payload.purchaseOrderCount != null) ? payload.purchaseOrderCount : 0,
          status: (payload && payload.status) || 'OK',
          items: (payload && Array.isArray(payload.items)) ? payload.items : [],
          warnings: (payload && Array.isArray(payload.warnings)) ? payload.warnings : [],
        }, payload),
      };
    }

    // 营业额卡
    if (card.cardType === 'REVENUE_REPORT_CARD') {
      return {
        cardType: card.cardType,
        cardData: payload,
      };
    }

    // 采购核验卡 — 后端字段统一命名为 unitPriceChangedItems，映射到原有 priceAnomalyItems
    if (card.cardType === 'PURCHASE_CHECK_CARD') {
      var rawItems = (payload && Array.isArray(payload.unitPriceChangedItems)) ? payload.unitPriceChangedItems : [];
      var priceItems = rawItems.map(function(item) {
        return {
          goodsName: item.goodsName || item.name || '',
          standardName: item.standardName || '',
          currentUnitPrice: item.currentUnitPrice || '',
          previousUnitPrice: item.previousUnitPrice || '',
          changePercent: item.priceChangePercent || '',
          reason: item.reason || '',
        };
      });
      return {
        cardType: card.cardType,
        cardData: Object.assign({}, payload, {
          priceAnomalyItems: priceItems,
          unitPriceChangedItems: rawItems,
        }),
      };
    }

    // 库存核销卡 — 后端字段 ingredientDiffItems 映射到原有 topDiffItems
    if (card.cardType === 'STOCK_RECONCILE_CARD') {
      var rawDiffItems = (payload && Array.isArray(payload.ingredientDiffItems)) ? payload.ingredientDiffItems : [];
      var diffItems = rawDiffItems.map(function(item) {
        return {
          foodName: item.ingredientName || item.foodName || '',
          theoryCost: item.theoryUsage || item.theoryCost || '',
          actualCost: item.actualUsage || item.actualCost || '',
          diffUsage: item.diffUsage || '',
          diffCostAmount: item.diffCostAmount || '',
        };
      });
      return {
        cardType: card.cardType,
        cardData: Object.assign({}, payload, {
          topDiffItems: diffItems,
          topDiffItemCount: payload.ingredientDiffItemCount || rawDiffItems.length,
          ingredientDiffItems: rawDiffItems,
        }),
      };
    }

    // 订货提醒卡
    if (card.cardType === 'REORDER_REMINDER_CARD') {
      return {
        cardType: card.cardType,
        cardData: payload,
      };
    }

    // 菜品销量排行卡
    if (card.cardType === 'DISH_SALES_RANKING_CARD') {
      var timeText = (payload && payload.timeDisplayText) || (payload && payload.timeLabel) || '';
      var baseTitle = card.title || '菜品排行';
      var combinedTitle = timeText ? timeText + '·' + baseTitle : baseTitle;
      var metricLabel = (payload && payload.metricLabel) || '';
      var subtitle = card.subtitle || (metricLabel ? '按' + metricLabel + '排序' : '');
      return {
        cardType: card.cardType,
        cardData: {
          title: combinedTitle,
          subtitle: subtitle,
          payload: payload || {},
        },
      };
    }

    // 菜品成本/利润排行卡
    if (card.cardType === 'DISH_PROFIT_COST_RANKING_CARD') {
      var timeText2 = (payload && payload.timeDisplayText) || (payload && payload.timeLabel) || '';
      var baseTitle2 = card.title || '菜品成本排行';
      var combinedTitle2 = timeText2 ? timeText2 + '·' + baseTitle2 : baseTitle2;
      var metricLabel2 = (payload && payload.metricLabel) || '';
      var subtitle2 = card.subtitle || (metricLabel2 ? '按' + metricLabel2 + '排序' : '');
      return {
        cardType: card.cardType,
        cardData: {
          title: combinedTitle2,
          subtitle: subtitle2,
          payload: payload || {},
        },
      };
    }

    // 菜品利润排行卡（与 DISH_PROFIT_COST_RANKING_CARD 结构一致，chartType=TABLE）
    if (card.cardType === 'DISH_PROFIT_RANKING_CARD') {
      var timeText3 = (payload && payload.timeDisplayText) || (payload && payload.timeLabel) || '';
      var baseTitle3 = card.title || '菜品利润排行';
      var combinedTitle3 = timeText3 ? timeText3 + '·' + baseTitle3 : baseTitle3;
      var metricLabel3 = (payload && payload.metricLabel) || '';
      var subtitle3 = card.subtitle || (metricLabel3 ? '按' + metricLabel3 + '排序' : '');
      return {
        cardType: card.cardType,
        cardData: {
          title: combinedTitle3,
          subtitle: subtitle3,
          payload: payload || {},
        },
      };
    }

    // 菜品配料可支撑天数卡
    if (card.cardType === 'DISH_INGREDIENT_COVER_DAYS_CARD') {
      var title4 = card.title || (payload ? (payload.dishName || '') + '·配料可支撑天数' : '配料可支撑天数');
      var subtitle4 = card.subtitle || (payload ? (payload.stockSnapshotLabel || '') : '');
      return {
        cardType: card.cardType,
        cardData: Object.assign({}, payload, {
          title: title4,
          subtitle: subtitle4,
        }),
      };
    }

    // 库存风险关注列表卡
    if (card.cardType === 'WAREHOUSE_INVENTORY_RISK_LIST_CARD') {
      var title5 = card.title || '库存风险关注列表';
      var subtitle5 = card.subtitle || (payload ? (payload.stockSnapshotLabel || payload.timeLabel || '') : '');
      return {
        cardType: card.cardType,
        cardData: Object.assign({}, payload, {
          title: title5,
          subtitle: subtitle5,
        }),
      };
    }

    // 库房库存排行卡（账面库存金额偏低/偏高商品）
    if (card.cardType === 'WAREHOUSE_STOCK_RANKING_CARD') {
      var title6 = card.title || '账面库存排行';
      var subtitle6 = card.subtitle || (payload ? (payload.stockSnapshotLabel || payload.timeLabel || '') : '');
      return {
        cardType: card.cardType,
        cardData: Object.assign({}, payload, {
          title: title6,
          subtitle: subtitle6,
        }),
      };
    }

    // 原料可支撑菜品覆盖卡（GOODS → DISH 反向链路）
    if (card.cardType === 'GOODS_SUPPORTED_DISH_COVER_CARD') {
      var title7 = card.title || (payload ? (payload.goodsName || '') + '·可支撑菜品' : '原料可支撑菜品');
      var subtitle7 = card.subtitle || (payload ? (payload.stockSnapshotLabel || '') : '');
      return {
        cardType: card.cardType,
        cardData: Object.assign({}, payload, {
          title: title7,
          subtitle: subtitle7,
        }),
      };
    }

    // 库存临期/过期风险卡
    if (card.cardType === 'WAREHOUSE_NEAR_EXPIRY_RISK_CARD') {
      var title8 = card.title || '库存临期/过期风险';
      var subtitle8 = card.subtitle || (payload ? (payload.stockSnapshotLabel || payload.timeLabel || '') : '');
      return {
        cardType: card.cardType,
        cardData: Object.assign({}, payload, {
          title: title8,
          subtitle: subtitle8,
        }),
      };
    }

    // 库存监督/诊断卡
    if (card.cardType === 'WAREHOUSE_INVENTORY_SUPERVISION_CARD') {
      var title9 = card.title || '库存监督/诊断';
      var subtitle9 = card.subtitle || (payload ? (payload.stockSnapshotLabel || payload.timeLabel || '') : '');
      return {
        cardType: card.cardType,
        cardData: Object.assign({}, payload, {
          title: title9,
          subtitle: subtitle9,
        }),
      };
    }

    // 采购经营分析卡
    if (card.cardType === 'PURCHASE_GOODS_BUSINESS_ANALYSIS_CARD') {
      return {
        cardType: card.cardType,
        cardData: Object.assign({}, payload, {
          title: card.title || '',
          subtitle: card.subtitle || '',
        }),
      };
    }

    // 未知 cardType：直接透传 payload
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
   * 点击子问题：直接发送，不再经过输入框
   * clickable=false / COMING_SOON 的问题灰态不可点击
   */
  onQuestionTap: function (e) {
    var text = e.currentTarget.dataset.text;
    var clickable = e.currentTarget.dataset.clickable !== false;
    if (!text || !clickable) return;
    this._sendMessage(text);
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

  // ========== 调试 JSON ==========

  /** 切换调试 JSON 显示 */
  toggleDebugJson: function () {
    this.setData({ showDebugJson: !this.data.showDebugJson });
  },

  /** 将调试数据存入 AI 消息 */
  _saveDebugData: function (aiMsgId, runResult, events) {
    var list = this.data.messages;
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === aiMsgId && list[i].role === 'assistant') {
        idx = i;
        break;
      }
    }
    if (idx < 0) return;

    var payload = {
      runResult: runResult,
      sseEvents: events || [],
    };
    var jsonText = '';
    try {
      jsonText = JSON.stringify(payload, null, 2);
    } catch (e) {
      jsonText = String(payload);
    }

    var patch = {};
    patch['messages[' + idx + '].debugRunResult'] = runResult;
    patch['messages[' + idx + '].debugSseEvents'] = events || [];
    patch['messages[' + idx + '].debugJsonText'] = jsonText;
    this.setData(patch);
  },

  /** 复制调试 JSON 到剪贴板 */
  onCopyDebugJson: function (e) {
    var msgId = e.currentTarget.dataset.msgid;
    var msg = null;
    var list = this.data.messages;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === msgId) {
        msg = list[i];
        break;
      }
    }
    if (!msg) {
      wx.showToast({ title: '未找到消息', icon: 'none' });
      return;
    }
    var payload = {
      runId: msg.runId || '',
      role: msg.role,
      debugRunResult: msg.debugRunResult,
      debugSseEvents: msg.debugSseEvents,
      content: typeof msg.content === 'string' ? msg.content.slice(0, 200) : msg.content,
    };
    var text;
    try {
      text = JSON.stringify(payload, null, 2);
    } catch (e2) {
      text = String(payload);
    }
    wx.setClipboardData({
      data: text,
      success: function () {
        wx.showToast({ title: '已复制 Debug JSON', icon: 'success', duration: 1500 });
      },
      fail: function () {
        wx.showToast({ title: '复制失败', icon: 'none' });
      },
    });
  },
});
