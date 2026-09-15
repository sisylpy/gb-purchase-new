/**
 * AI 对话页（算账版）— 布局与交互参考 Google Gemini 浅色客户端
 *
 * 接口（新版 Run API）：
 * - listAdvisors()                      GET ai/advisors（按稳定 code 解析主键）
 * - getAdvisorDetail(advisorId)        GET ai/advisors/{id}?scene=MINIAPP（统一顾问详情，含推荐问题）
 * - createAiRun(payload)               POST /ai/runs
 * - connectAiRunSse(runId, handlers)   GET  /ai/runs/{runId}/events（SSE 命名事件流）
 * - stopAiRun(runId)                   POST /ai/runs/{runId}/stop
 * - listConversations(userId)          GET /ai/conversations
 * - getConversationMessages(convId)    GET /ai/conversations/{id}/messages
 */

var ai = require('../../services/api');
var aiRichText = require('../../../utils/aiRichText');
var cardNormalizer = require('../../utils/cardNormalizer');
var aiChatHelpers = require('../../utils/aiChatHelpers');
var workRecordCardTypes = require('../../utils/workRecordCardTypes');
var workRecordDraftUtil = require('../../utils/workRecordDraftUtil');


var MENU_OPERATION_ADVISOR_ID = aiChatHelpers.MENU_OPERATION_ADVISOR_ID;
var DEFAULT_ADVISOR_CODE = aiChatHelpers.DEFAULT_ADVISOR_CODE;
var MENU_OPERATION_ADVISOR_CODE = aiChatHelpers.MENU_OPERATION_ADVISOR_CODE;
var findAdvisorByCode = aiChatHelpers.findAdvisorByCode;
var extractSuggestedTopicsPayload = aiChatHelpers.extractSuggestedTopicsPayload;
var normalizeSuggestedTopic = aiChatHelpers.normalizeSuggestedTopic;
var buildRunPayloadBase = aiChatHelpers.buildRunPayloadBase;
var normalizeConversationRow = aiChatHelpers.normalizeConversationRow;
var isWorkRecordConversation = aiChatHelpers.isWorkRecordConversation;
var cleanContextSummary = aiChatHelpers.cleanContextSummary;

/** 仅识别明确的人工客服诉求，避免把“人工智能”等普通问题误判为转人工。 */
function isCustomerServiceRequest(text) {
  var normalized = String(text || '').replace(/\s+/g, '');
  if (!normalized) return false;
  return /(转人工|人工客服|真人客服|人工服务|找人工|联系人工|接入人工|转接人工|找客服|联系客服|接入客服|转接客服|客服入口|客服链接|客服在哪|怎么找客服)/.test(normalized);
}

Page({
  data: {
    windowHeight: 600,
    statusBarHeight: 20,
    navBarHeight: 64,
    departmentId: 0,
    userId: 0,
    userInitial: '?',
    heroTitle: '你好，我是AI助手',
    heroSubtitle: '可以帮你看采购、库存、菜单和整体经营，还能直接回答问题',
    greetLine1: '你好',
    conversationId: null,
    isLoading: true,
    isSending: false,
    _sending: false,
    historyLoaded: false,
    messages: [],
    inputValue: '',
    inputFocus: false,
    inputSelectionStart: -1,
    inputSelectionEnd: -1,
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
    workRecordConversation: null, // threadKind == WORK_RECORD 的会话（固定入口）
    /** 创建 Run 的基础参数（userId / departmentId / distributerId / scopeMode） */
    runPayloadBase: null,
    /** SSE 阶段文案列表（新 stage 会把旧 stage 向上滚动） */
    streamingStages: [],
    /** 当前 Run ID */
    currentRunId: null,
    /** 页面标题（如 "菜单经营顾问"），空则使用默认 "经营看板" */
    pageTitle: '',
    /** 智能体数据库主键；可兼容 URL advisorId，也可由 advisorCode 动态解析 */
    advisorId: null,
    /** 智能体稳定业务键；数据库重建后仍保持不变 */
    advisorCode: DEFAULT_ADVISOR_CODE,
    /** 是否展示调试 JSON */
    showDebugJson: false,
    /** 已记入店长日志的卡片 key 集合（防重复） */
    _recordedCardKeys: {},
    /** 记入店长日志请求中 */
    _recordingCard: false,
    /** 已固定的卡片 key 集合（防重复） */
    _pinnedCardKeys: {},
    /** 图钉请求中 */
    _pinningCard: false,
    /** 工作笔记弹窗 */
    showNoteDialog: false,
    noteDialogTitle: '',
    noteDialogContent: '',
    noteDialogSnapshot: '',
    noteDialogAnswerPreview: '',
    noteDialogMessageId: null,
    noteDialogRunId: null,
    noteDialogCardType: '',
    noteDialogCardInstanceId: '',
    noteDialogCardTitle: '',
    /** 添加到工作笔记请求中 */
    _notingCard: false,
    /** 已添加工作笔记的卡片 key 集合（防重复） */
    _notedCardKeys: {},
    /** 加入店长工作记录编辑弹窗 */
    showWorkRecordDialog: false,
    workRecordDialogTitle: '',
    workRecordDialogContent: '',
    workRecordDialogCategory: '',
    workRecordDialogCardType: '',
    workRecordDialogCardData: null,
    workRecordDialogCardTitle: '',
    workRecordDialogCardSubtitle: '',
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
    var heroTitle = '你好，我是AI助手';
    var heroSubtitle = '可以帮你看采购、库存、菜单和整体经营，还能直接回答问题';

    // 兼容旧 advisorId，同时优先支持不会随数据库重建变化的 advisorCode。
    var advisorId = null;
    if (options.advisorId) {
      var parsed = Number(options.advisorId);
      if (!isNaN(parsed) && parsed > 0) advisorId = parsed;
    }
    var advisorCode = options.advisorCode
      ? decodeURIComponent(options.advisorCode).trim().toUpperCase()
      : '';
    if (!advisorId && !advisorCode) advisorCode = DEFAULT_ADVISOR_CODE;
    var pageTitle = options.pageTitle ? decodeURIComponent(options.pageTitle) : '';

    // 菜单模式下调整问候语
    if (advisorCode === MENU_OPERATION_ADVISOR_CODE || advisorId === MENU_OPERATION_ADVISOR_ID) {
      greetLine1 = '菜单经营顾问';
      heroTitle = '你好，我是菜单经营顾问';
      heroSubtitle = '可以帮你看菜单整体经营、菜品销量与毛利情况';
    } else if (pageTitle) {
      heroTitle = '你好，我是' + pageTitle;
    }

    var sys = wx.getSystemInfoSync();
    var sb = sys.statusBarHeight || 20;
    var appGlobal = getApp().globalData || {};
    var navBarHeight = Number(appGlobal.navBarHeight) || (sb + 44);
    var drawerPad = sb + 44;
    var drawerHeadApprox = 52;
    that.setData({
      url: getApp().globalData.server || config.server,
      departmentId: departmentId,
      userId: userId,
      userInitial: initial,
      greetLine1: greetLine1,
      heroTitle: heroTitle,
      heroSubtitle: heroSubtitle,
      windowHeight: sys.windowHeight,
      statusBarHeight: sb,
      navBarHeight: navBarHeight,
      drawerPaddingTop: drawerPad,
      drawerScrollHeight: Math.max(200, sys.windowHeight - drawerPad - drawerHeadApprox),
      runPayloadBase: payload,
      isLoading: false,
      advisorId: advisorId,
      advisorCode: advisorCode,
      pageTitle: pageTitle,
    });

    // 直接传参，避免 setData 异步导致页面数据尚未更新。
    that._loadTopics(advisorId, advisorCode);
  },

  onUnload: function () {
    this._cleanupSse();
  },

  /**
   * 从能力导航页返回时，读取待填入的问题到输入框（不覆盖用户已输入内容，不自动发送）。
   */
  onShow: function () {
    var pending = wx.getStorageSync('aiCapabilityQuestion');
    if (pending) {
      wx.removeStorageSync('aiCapabilityQuestion');
      if (!this.data.inputValue) {
        this.setData({ inputValue: pending, inputFocus: true });
      }
    }
  },

  /**
   * 拉取推荐问题（老板常问）
   * @param {number|null} [forcedAdvisorId] 兼容旧入口传入的数据库主键
   * @param {string} [forcedAdvisorCode] 稳定顾问 code（推荐）
   */
  _loadTopics: function (forcedAdvisorId, forcedAdvisorCode) {
    var that = this;
    var advisorId = forcedAdvisorId || that.data.advisorId;
    var advisorCode = String(forcedAdvisorCode || that.data.advisorCode || DEFAULT_ADVISOR_CODE)
      .trim()
      .toUpperCase();

    var loadDetail = function (resolvedAdvisorId) {
      return ai.getAdvisorDetail(resolvedAdvisorId)
      .then(function (res) {
        var result = res.result;
        var detail = result && result.data;
        that._applyAdvisorIdentity(detail || { advisorId: resolvedAdvisorId, code: advisorCode });
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
      });
    };

    var requestPromise;
    if (advisorId) {
      requestPromise = loadDetail(advisorId);
    } else {
      requestPromise = ai.listAdvisors().then(function (res) {
        var advisor = findAdvisorByCode(res && res.result, advisorCode);
        var resolvedId = advisor && Number(advisor.advisorId || advisor.id);
        if (!resolvedId) {
          throw new Error('advisor code not found: ' + advisorCode);
        }
        that._applyAdvisorIdentity(advisor);
        return loadDetail(resolvedId);
      });
    }

    return requestPromise
      .catch(function () {
        // 接口失败时隐藏推荐问题模块，不影响聊天
        console.log('[AI对话] 推荐问题加载失败，隐藏模块，advisorCode=' + advisorCode);
        that.setData({ topics: [], topicPageTitle: '', topicPageSubtitle: '' });
      });
  },

  _applyAdvisorIdentity: function (advisor) {
    advisor = advisor || {};
    var advisorId = Number(advisor.advisorId || advisor.id || 0) || null;
    var advisorCode = String(advisor.advisorCode || advisor.code || this.data.advisorCode || '')
      .trim()
      .toUpperCase();
    var advisorName = advisor.advisorName || advisor.name || '';
    var updates = {
      advisorId: advisorId,
      advisorCode: advisorCode,
    };
    if (advisorCode === MENU_OPERATION_ADVISOR_CODE) {
      updates.greetLine1 = '菜单经营顾问';
      updates.heroTitle = '你好，我是菜单经营顾问';
      updates.heroSubtitle = '可以帮你看菜单整体经营、菜品销量与毛利情况';
    } else if (this.data.pageTitle) {
      updates.heroTitle = '你好，我是' + this.data.pageTitle;
    } else if (advisorName) {
      updates.heroTitle = '你好，我是' + advisorName;
    }
    this.setData(updates);
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
      var cards = rawCards ? cardNormalizer.normalizeCards(rawCards) : null;
      // 提取 answerPreview / contextSummary（历史消息）
      var answerPreview = msg.answerPreview || '';
      var contextSummary = cleanContextSummary(msg.contextSummary);
      // 提取 realId：使用与 _syncRealMessageId 一致的字段匹配（6 个候选字段）
      var realId = msg.id
        || msg.gbAiMessageId
        || msg.messageId
        || msg.msgId
        || msg.aiMessageId
        || msg._id;
      // 提取 runId：使用与 _syncRealMessageId 一致的字段匹配
      var runId = msg.runId
        || msg.gbAiMessageRunId
        || msg.run_id
        || msg.run
        || null;
      return {
        id: realId,
        role: role,
        content: cleaned,
        time: msg.createTime || msg.gbAiMessageCreateTime || msg.createdAt || '',
        richNodes: role === 'assistant' && trimmed ? aiRichText.markdownToRichHtml(cleaned) : '',
        cards: cards,
        answerPreview: answerPreview,
        contextSummary: contextSummary,
        runId: runId,
        // 历史消息天然有真实 messageId（与 _syncRealMessageId 使用相同的字段匹配）
        _realMessageReady: !!realId,
      };
    });
  },

  onOpenDrawerTap: function () {
    this.setData({ drawerOpen: true });
    this._loadConversationHistoryList();
  },

  /** 打开京采账本企业微信人工客服。 */
  onCustomerServiceTap: function () {
    if (typeof wx.openCustomerServiceChat !== 'function') {
      wx.showToast({ title: '请更新微信后联系客服', icon: 'none', duration: 2500 });
      return;
    }
    try {
      wx.openCustomerServiceChat({
        extInfo: {
          url: 'https://work.weixin.qq.com/kfid/kfce23df54c35579b3f',
        },
        corpId: 'ww9778dea409045fe6',
        fail: function (error) {
          var message = error && error.errMsg ? String(error.errMsg) : '';
          if (message.indexOf('cancel') === -1) {
            wx.showToast({ title: '客服暂时无法打开，请稍后重试', icon: 'none', duration: 2500 });
          }
        },
      });
    } catch (error) {
      wx.showToast({ title: '请更新微信后联系客服', icon: 'none', duration: 2500 });
    }
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
      that.setData({ conversationHistoryList: [], workRecordConversation: null, conversationHistoryLoading: false });
      return;
    }
    that.setData({ conversationHistoryLoading: true });
    ai
      .listConversations(userId, 1, 20)
      .then(function (res) {
        var items = res.items || [];
        console.log('[历史对话] 原始 items:', JSON.stringify(items));
        var all = items
          .map(function (raw) {
            var n = normalizeConversationRow(raw);
            console.log('[历史对话] normalize:', n.id, 'threadKind=', n.threadKind, 'rawKeys=', Object.keys(raw).filter(function (k) { return /thread|kind|type/i.test(k); }));
            return n;
          })
          .filter(function (x) {
            return x.id !== undefined && x.id !== null && x.id !== '';
          });
        console.log('[历史对话] all after normalize:', JSON.stringify(all.map(function (x) { return { id: x.id, title: x.title, threadKind: x.threadKind }; })));
        // 分离 WORK_RECORD 会话（固定入口）
        var wr = null;
        var list = all.filter(function (x) {
          if (isWorkRecordConversation(x)) {
            wr = x;
            return false;
          }
          return true;
        });
        console.log('[历史对话] wr=', wr ? JSON.stringify(wr) : null, 'list.length=', list.length);
        that.setData({ conversationHistoryList: list, workRecordConversation: wr, conversationHistoryLoading: false });
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
    var parsed = this._parseTemplateQuestion(text);
    if (parsed.hasPlaceholder) {
      this.setData({ drawerOpen: false, drawerExpandedTopicId: '' });
      this._fillInputWithTemplate(parsed);
    } else {
      this.setData({ drawerOpen: false, drawerExpandedTopicId: '' });
      this._sendMessage(text);
    }
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

  /**
   * 点击「店长日志」固定入口 — 跳转到店长日志页
   */
  onWorkRecordTap: function () {
    this.setData({ drawerOpen: false, drawerExpandedTopicId: '' });
    wx.navigateTo({
      url: '../workRecord/workRecord',
    });
  },

  /**
   * 点击「店内公告」入口 — 跳转到公告栏
   */
  onStoreAnnouncementTap: function () {
    this.setData({ drawerOpen: false, drawerExpandedTopicId: '' });
    wx.navigateTo({
      url: '../storeAnnouncement/storeAnnouncement?boardType=MANAGER_DAILY_BOARD',
    });
  },

  /**
   * 点击「图钉」入口 — 跳转到图钉列表页
   */
  onOpenPinList: function () {
    this.setData({ drawerOpen: false, drawerExpandedTopicId: '' });
    wx.navigateTo({
      url: '../pinList/pinList',
    });
  },

  /**
   * 点击「笔记」入口 — 跳转到工作笔记列表页
   */
  onOpenNoteList: function () {
    this.setData({ drawerOpen: false, drawerExpandedTopicId: '' });
    wx.navigateTo({
      url: '../workNoteList/workNoteList',
    });
  },

  /**
   * 点击「查看全部可问范围」入口 — 跳转到完整能力导航页
   */
  onOpenCapabilityMap: function () {
    this.setData({ drawerOpen: false, drawerExpandedTopicId: '' });
    wx.navigateTo({
      url: '../aiCapabilityMap/aiCapabilityMap',
    });
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
      inputFocus: false,
      inputSelectionStart: -1,
      inputSelectionEnd: -1,
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
    // 去除 $ 占位符符号（用户可能未替换完，完整去除所有 $）
    message = message.replace(/\$/g, '');
    if (!message || that.data.isSending || that._sending) {
      if (!message && !that.data.isSending && !that._sending) {
        wx.showToast({ title: '请先输入内容', icon: 'none', duration: 1500 });
      }
      return;
    }

    if (isCustomerServiceRequest(message)) {
      that._showCustomerServiceReply(message);
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
        inputFocus: false,
        inputSelectionStart: -1,
        inputSelectionEnd: -1,
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

  /** 用户明确要求转人工时，直接在对话中提供企微客服入口。 */
  _showCustomerServiceReply: function (message) {
    var that = this;
    var now = Date.now();
    that._cleanupSse();
    that._sending = false;
    var userMsg = {
      id: now,
      role: 'user',
      content: message,
      time: '',
      richNodes: '',
    };
    var aiMsg = {
      id: now + 1,
      role: 'assistant',
      content: '好的，我帮你联系人工客服。',
      isLoading: false,
      time: '',
      richNodes: '',
      showCustomerService: true,
      _realMessageReady: false,
    };
    that.setData(
      {
        historyLoaded: true,
        expandedTopicId: '',
        drawerOpen: false,
        drawerExpandedTopicId: '',
        inputValue: '',
        inputFocus: false,
        inputSelectionStart: -1,
        inputSelectionEnd: -1,
        isSending: false,
        messages: that.data.messages.concat([userMsg, aiMsg]),
        streamingStages: [],
        currentRunId: null,
      },
      function () {
        that._scrollToBottom();
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
          pendingContextSummary = cleanContextSummary(step.contextSummary);
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

          // 如果 createAiRun 返回了 messageId，直接绑定真实 ID
          if (runResult && runResult.messageId) {
            that._applyRealMessageId(aiMsgId, runResult.messageId, runId);
          } else {
            // 否则异步从后端同步真实的数据库 messageId
            that._syncRealMessageId(aiMsgId);
          }
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
              var cs = (result && result.contextSummary) ? cleanContextSummary(result.contextSummary) : pendingContextSummary;
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
    // 存储当前 runId（用于"记入店长日志"等操作）
    if (that.data.currentRunId) {
      patch['messages[' + idx + '].runId'] = that.data.currentRunId;
    }
    // 统一处理 cards
    if (cards && Array.isArray(cards) && cards.length > 0) {
      var normalized = cardNormalizer.normalizeCards(cards);
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
    // 标记 messageId 尚未与后端同步
    if (cards && Array.isArray(cards) && cards.length > 0) {
      patch['messages[' + idx + ']._realMessageReady'] = false;
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
    var normalized = cardNormalizer.normalizeCards(cards);
    if (!normalized || normalized.length === 0) return;
    var patch = {};
    patch['messages[' + idx + '].cards'] = normalized;
    // 存储当前 runId
    if (that.data.currentRunId) {
      patch['messages[' + idx + '].runId'] = that.data.currentRunId;
    }
    if (answerPreview !== undefined) {
      patch['messages[' + idx + '].answerPreview'] = answerPreview || '';
    }
    if (contextSummary !== undefined) {
      patch['messages[' + idx + '].contextSummary'] = contextSummary || null;
    }
    // 标记 messageId 尚未与后端同步
    patch['messages[' + idx + ']._realMessageReady'] = false;
    this.setData(patch);
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
    this.setData({
      inputValue: e.detail.value,
      // 用户手动输入时清除占位符选择状态
      inputSelectionStart: -1,
      inputSelectionEnd: -1,
    });
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
  /**
   * 检测问题文本是否包含占位符 $xxx$
   * 返回 { hasPlaceholder, cleanText, cursorPos }
   * - cleanText: 已去除 $xxx$ 的文本
   * - cursorPos: 光标应定位的位置（原占位符起始处）
   */
  _parseTemplateQuestion: function (text) {
    var match = text.match(/\$([^$]+)\$/);
    if (!match) return { hasPlaceholder: false };
    return {
      hasPlaceholder: true,
      cleanText: text.replace(/\$([^$]+)\$/, ''), // 去掉整个 $xxx$
      cursorPos: match.index, // 光标放在占位符原来的位置
    };
  },

  /** 将模板问题填入输入框，去掉 $xxx$，光标定位到占位符位置 */
  _fillInputWithTemplate: function (parsed) {
    this.setData({
      inputValue: parsed.cleanText,
      inputFocus: true,
      // selection-start === selection-end → 光标定位到该位置，不选中
      inputSelectionStart: parsed.cursorPos,
      inputSelectionEnd: parsed.cursorPos,
    });
  },

  /**
   * 点击子问题：若有占位符 $xxx$ 则填入输入框，否则直接发送
   */
  onQuestionTap: function (e) {
    var text = e.currentTarget.dataset.text;
    var clickable = e.currentTarget.dataset.clickable !== false;
    if (!text || !clickable) return;
    var parsed = this._parseTemplateQuestion(text);
    if (parsed.hasPlaceholder) {
      this._fillInputWithTemplate(parsed);
    } else {
      this._sendMessage(text);
    }
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

  /**
   * SSE 结束后异步从后端拉取消息列表，用真实的数据库 messageId 替换本地临时 id
   * @param {number} localMsgId - SSE 阶段分配的临时 id（Date.now()）
   * @param {number} [retryCount] - 内部重试计数（最多 5 次）
   */
  _syncRealMessageId: function (localMsgId, retryCount) {
    var that = this;
    var conversationId = that.data.conversationId;
    var userId = that.data.userId;
    retryCount = retryCount || 0;

    if (!conversationId || !userId) {
      console.log('[AI对话] _syncRealMessageId 跳过：缺少 conversationId 或 userId');
      return;
    }

    if (retryCount >= 5) {
      console.log('[AI对话] _syncRealMessageId 达到最大重试次数，放弃同步', localMsgId);
      return;
    }

    // 首次延迟 800ms，后续逐次递增 1s
    var delay = retryCount === 0 ? 800 : 1000 + retryCount * 1000;

    setTimeout(function () {
      ai.getConversationMessages(conversationId, userId)
        .then(function (res) {
          var backendMsgs = res.messages || [];
          if (!backendMsgs.length) {
            console.log('[AI对话] _syncRealMessageId：后端无消息（第' + (retryCount + 1) + '次）');
            that._syncRealMessageId(localMsgId, retryCount + 1);
            return;
          }

          var list = that.data.messages;
          // 找到本地消息的下标
          var localIdx = -1;
          for (var i = list.length - 1; i >= 0; i--) {
            if (list[i].id === localMsgId) {
              localIdx = i;
              break;
            }
          }
          if (localIdx < 0) {
            // 可能已被前次调用成功替换为真实ID，无需重试
            return;
          }

          // 取后端最后一条 assistant 消息作为匹配
          var lastBackend = null;
          for (var j = backendMsgs.length - 1; j >= 0; j--) {
            var role = backendMsgs[j].role || backendMsgs[j].gbAiMessageRole;
            if (role === 'assistant') {
              lastBackend = backendMsgs[j];
              break;
            }
          }
          if (!lastBackend) {
            console.log('[AI对话] _syncRealMessageId：后端无 assistant 消息（第' + (retryCount + 1) + '次）');
            that._syncRealMessageId(localMsgId, retryCount + 1);
            return;
          }

          // 尝试多种可能的 realId 字段名
          var realId = lastBackend.id
            || lastBackend.gbAiMessageId
            || lastBackend.messageId
            || lastBackend.msgId
            || lastBackend.aiMessageId
            || lastBackend._id;
          var realRunId = lastBackend.runId || lastBackend.gbAiMessageRunId || lastBackend.run_id || lastBackend.run;

          if (!realId) {
            // 首次失败时打印全量 keys 便于排查
            console.log('[AI对话] _syncRealMessageId：后端消息缺少真实 id（第' + (retryCount + 1) + '次）');
            console.log('[AI对话] _syncRealMessageId 后端消息 keys:', Object.keys(lastBackend).join(', '));
            console.log('[AI对话] _syncRealMessageId 后端消息 sample:', JSON.stringify(lastBackend).substring(0, 500));
            that._syncRealMessageId(localMsgId, retryCount + 1);
            return;
          }

          var patch = {};
          patch['messages[' + localIdx + '].id'] = realId;
          if (realRunId) {
            patch['messages[' + localIdx + '].runId'] = realRunId;
          }
          patch['messages[' + localIdx + ']._realMessageReady'] = true;
          that.setData(patch);

          // 同步更新 _recordedCardKeys（dedupKey 中使用了 messageId）
          var recorded = that.data._recordedCardKeys || {};
          var newRecorded = {};
          var hasRemap = false;
          var oldIdStr = String(localMsgId);
          var newIdStr = String(realId);
          for (var key in recorded) {
            if (recorded.hasOwnProperty(key)) {
              if (key.indexOf(oldIdStr + '|') === 0) {
                newRecorded[key.replace(oldIdStr, newIdStr)] = recorded[key];
                hasRemap = true;
              } else {
                newRecorded[key] = recorded[key];
              }
            }
          }
          if (hasRemap) {
            that.setData({ _recordedCardKeys: newRecorded });
            console.log('[AI对话] _syncRealMessageId 已迁移 _recordedCardKeys');
          }

          // 同步更新 _pinnedCardKeys（dedupKey 中使用了 messageId）
          var pinned = that.data._pinnedCardKeys || {};
          var newPinned = {};
          var hasPinRemap = false;
          for (var pk in pinned) {
            if (pinned.hasOwnProperty(pk)) {
              if (pk.indexOf(oldIdStr + '|') === 0) {
                newPinned[pk.replace(oldIdStr, newIdStr)] = pinned[pk];
                hasPinRemap = true;
              } else {
                newPinned[pk] = pinned[pk];
              }
            }
          }
          if (hasPinRemap) {
            that.setData({ _pinnedCardKeys: newPinned });
            console.log('[AI对话] _syncRealMessageId 已迁移 _pinnedCardKeys');
          }

          console.log('[AI对话] _syncRealMessageId 成功：local=' + localMsgId + ' → real=' + realId + ', runId=' + realRunId + '（第' + (retryCount + 1) + '次）');
        })
        .catch(function (err) {
          console.log('[AI对话] _syncRealMessageId 接口失败（第' + (retryCount + 1) + '次）', err);
          that._syncRealMessageId(localMsgId, retryCount + 1);
        });
    }, delay);
  },

  /**
   * 直接用已知真实 messageId 替换本地临时 id（无需异步拉取）
   * @param {number} localMsgId
   * @param {number} realId
   * @param {number} [realRunId]
   */
  _applyRealMessageId: function (localMsgId, realId, realRunId) {
    var that = this;
    var list = that.data.messages;
    var localIdx = -1;
    for (var i = list.length - 1; i >= 0; i--) {
      if (list[i].id === localMsgId) {
        localIdx = i;
        break;
      }
    }
    if (localIdx < 0) {
      console.log('[AI对话] _applyRealMessageId：未找到本地消息', localMsgId);
      return;
    }
    var patch = {};
    patch['messages[' + localIdx + '].id'] = realId;
    if (realRunId) {
      patch['messages[' + localIdx + '].runId'] = realRunId;
    }
    patch['messages[' + localIdx + ']._realMessageReady'] = true;
    that.setData(patch);
    console.log('[AI对话] _applyRealMessageId 成功：local=' + localMsgId + ' → real=' + realId + ', runId=' + realRunId);
  },

  // ========== 加入工作记录（from-business-card 主链） ==========

  /** 在消息列表中查找 displayCard */
  _findDisplayCard: function (messageId, cardType) {
    var messages = this.data.messages || [];
    for (var i = 0; i < messages.length; i++) {
      if (messages[i].id !== messageId) continue;
      var cards = messages[i].cards || [];
      for (var j = 0; j < cards.length; j++) {
        if (cards[j].cardType === cardType) return cards[j];
      }
    }
    return null;
  },

  /**
   * 从业务卡片打开「加入店长工作记录」编辑弹窗（不立即 POST）
   * 支持两种触发方式：
   * 1. 页面级按钮（data-*）：cardType + itemKey 从 data 读取
   * 2. 组件级事件（triggerEvent）：cardType + itemKey 从 e.detail 读取
   */
  onRecordToWorkRecord: function (e) {
    var that = this;
    if (that._recordingCard || that.data.showWorkRecordDialog) return;

    var detail = e.detail || {};
    var cardType = detail.cardType || e.currentTarget.dataset.cardType || '';
    var rawItemKey = detail.itemKey || e.currentTarget.dataset.itemKey || '__CARD__';
    var fromRowTrigger = !!(detail.itemKey && detail.itemKey !== '__CARD__');
    var itemKey = workRecordCardTypes.resolveSourceItemKey(cardType, rawItemKey, fromRowTrigger);
    var messageId = detail.messageId || e.currentTarget.dataset.messageId;
    var runId = detail.runId || e.currentTarget.dataset.runId;

    if (!cardType) {
      wx.showToast({ title: '卡片类型缺失', icon: 'none' });
      return;
    }
    if (!workRecordCardTypes.isWorkRecordCardType(cardType)) {
      wx.showToast({ title: '暂不支持加入工作记录', icon: 'none', duration: 2500 });
      return;
    }

    var messages = that.data.messages;
    var msg = null;
    if (messageId) {
      for (var i = 0; i < messages.length; i++) {
        if (messages[i].id === messageId) {
          msg = messages[i];
          break;
        }
      }
    }
    if (!runId && msg && msg.runId) runId = msg.runId;
    if (!runId) runId = that.data.currentRunId;

    var runPayloadBase = that.data.runPayloadBase;
    if (!runPayloadBase || !runPayloadBase.userId) {
      wx.showToast({ title: '未获取到登录信息', icon: 'none' });
      return;
    }
    if (!that.data.conversationId) {
      wx.showToast({ title: '会话信息缺失', icon: 'none' });
      return;
    }
    if (!messageId) {
      wx.showToast({ title: '消息信息缺失', icon: 'none' });
      return;
    }
    if (msg && !msg._realMessageReady) {
      wx.showToast({ title: '消息正在同步中，请稍候再试', icon: 'none', duration: 2000 });
      return;
    }

    var displayCard = that._findDisplayCard(messageId, cardType);
    var cardData = displayCard ? displayCard.cardData : null;
    var draft = workRecordDraftUtil.buildWorkRecordDraft(cardType, cardData, {
      sourceItemKey: itemKey,
      cardTitle: displayCard ? displayCard._cardTitle : '',
      suggestedCategoryName: (displayCard && displayCard.suggestedCategoryName) || '',
    });

    var req = {
      userId: runPayloadBase.userId,
      departmentId: runPayloadBase.departmentId,
      sourceConversationId: Number(that.data.conversationId),
      sourceMessageId: Number(messageId),
      sourceCardType: cardType,
      sourceItemKey: itemKey,
    };
    if (runId) req.sourceRunId = Number(runId);
    if (runPayloadBase.distributerId) req.distributerId = runPayloadBase.distributerId;

    var dedupKey = messageId + '|' + cardType + '|' + itemKey;
    that._workRecordPending = {
      req: req,
      dedupKey: dedupKey,
      messageId: messageId,
      cardType: cardType,
      itemKey: itemKey,
      existingRecord: (that.data._recordedCardKeys || {})[dedupKey] || null,
    };

    that.setData({
      showWorkRecordDialog: true,
      workRecordDialogTitle: draft.title || '',
      workRecordDialogContent: draft.content || '',
      workRecordDialogCategory: draft.suggestedCategoryName || '',
      workRecordDialogCardType: cardType,
      workRecordDialogCardData: cardData,
      workRecordDialogCardTitle: (displayCard && (displayCard._cardTitle || (cardData && cardData.title))) || '',
      workRecordDialogCardSubtitle: (displayCard && displayCard.cardData && displayCard.cardData.subtitle) || '',
    });
  },

  onWorkRecordTitleInput: function (e) {
    this.setData({ workRecordDialogTitle: (e.detail && e.detail.value) || '' });
  },

  onWorkRecordContentInput: function (e) {
    this.setData({ workRecordDialogContent: (e.detail && e.detail.value) || '' });
  },

  onCloseWorkRecordDialog: function () {
    this._workRecordPending = null;
    this.setData({
      showWorkRecordDialog: false,
      workRecordDialogTitle: '',
      workRecordDialogContent: '',
      workRecordDialogCategory: '',
      workRecordDialogCardType: '',
      workRecordDialogCardData: null,
      workRecordDialogCardTitle: '',
      workRecordDialogCardSubtitle: '',
    });
  },

  /** 弹窗确认保存 → POST from-business-card */
  onConfirmWorkRecord: function () {
    var that = this;
    if (that._recordingCard) return;

    var pending = that._workRecordPending;
    if (!pending || !pending.req) {
      wx.showToast({ title: '请重新打开编辑弹窗', icon: 'none' });
      return;
    }

    var title = (that.data.workRecordDialogTitle || '').trim();
    var content = (that.data.workRecordDialogContent || '').trim();
    if (!title) {
      wx.showToast({ title: '请填写记录标题', icon: 'none' });
      return;
    }
    if (!content) {
      wx.showToast({ title: '请填写主要内容', icon: 'none' });
      return;
    }

    var req = Object.assign({}, pending.req, {
      editedTitle: title,
      editedContent: content,
    });

    var dedupKey = pending.dedupKey;
    var messageId = pending.messageId;
    var cardType = pending.cardType;
    var itemKey = pending.itemKey;
    var existingRecord = pending.existingRecord;

    that._recordingCard = true;
    wx.showLoading({ title: 'AI整理中…', mask: false });

    console.log('@@[WORK_RECORD_DEBUG] createWorkRecordFromBusinessCard 请求', JSON.stringify({
      url: 'POST /ai/work-records/from-business-card',
      body: req,
      cardType: cardType,
      existingRecordId: existingRecord ? existingRecord.recordId : null,
    }));

    ai.createWorkRecordFromBusinessCard(req)
      .then(function (res) {
        wx.hideLoading();
        that._recordingCard = false;

        var result = res.result || res;
        if (result && result.code !== undefined && result.code !== 0 && result.code !== '0') {
          var errorCode = result.errorCode || '';
          if (errorCode === 'CARD_UNSUPPORTED') {
            wx.showToast({ title: '暂不支持加入工作记录', icon: 'none', duration: 2500 });
            console.error('[AI对话] 加入工作记录 CARD_UNSUPPORTED', { cardType: cardType, itemKey: itemKey });
            return;
          }
          var bizErrMsg = result.msg || result.message || ('业务错误 code=' + result.code);
          if (errorCode) bizErrMsg = bizErrMsg + ' (' + errorCode + ')';
          wx.showToast({ title: bizErrMsg, icon: 'none', duration: 2500 });
          console.error('[AI对话] 加入工作记录业务错误', { cardType: cardType, itemKey: itemKey, errorCode: result.code, errorMsg: bizErrMsg });
          return;
        }

        var data = result;
        if (data && data.code !== undefined && data.data !== undefined) {
          data = data.data;
        }
        var recordId = data.recordId || data.id || null;
        if (data.confirmationStatus === 'PENDING_CONFIRMATION') {
          if (data.aiStatus !== 'SUCCESS') {
            wx.showToast({ title: data.aiErrorCode || 'AI整理失败，请重试', icon: 'none' });
            return;
          }
          that.onCloseWorkRecordDialog();
          wx.navigateTo({
            url: '../workRecordConfirm/workRecordConfirm?recordId=' + recordId,
          });
          return;
        }
        var isDuplicate = !!(data.duplicated)
          || (existingRecord && existingRecord.recordId && recordId && String(existingRecord.recordId) === String(recordId));

        var recorded = that.data._recordedCardKeys || {};
        recorded[dedupKey] = { recordId: recordId, time: Date.now() };

        var patch = { _recordedCardKeys: recorded };
        var messages = that.data.messages;
        var msgIdx = -1;
        for (var mi = 0; mi < messages.length; mi++) {
          if (messages[mi].id === messageId) { msgIdx = mi; break; }
        }
        if (msgIdx >= 0 && messages[msgIdx].cards) {
          for (var ci = 0; ci < messages[msgIdx].cards.length; ci++) {
            if (messages[msgIdx].cards[ci].cardType === cardType) {
              patch['messages[' + msgIdx + '].cards[' + ci + ']._cardRecorded'] = true;
              if (recordId) {
                patch['messages[' + msgIdx + '].cards[' + ci + ']._workRecordId'] = recordId;
              }
              break;
            }
          }
        }

        that._workRecordPending = null;
        patch.showWorkRecordDialog = false;
        patch.workRecordDialogTitle = '';
        patch.workRecordDialogContent = '';
        patch.workRecordDialogCategory = '';
        patch.workRecordDialogCardType = '';
        patch.workRecordDialogCardData = null;
        patch.workRecordDialogCardTitle = '';
        patch.workRecordDialogCardSubtitle = '';
        that.setData(patch);

        if (!isDuplicate) {
          wx.showToast({ title: '已加入工作记录', icon: 'success', duration: 2000 });
        }
        console.log('[AI对话] 加入工作记录成功', {
          cardType: cardType, itemKey: itemKey, recordId: recordId, duplicated: isDuplicate
        });
      })
      .catch(function (err) {
        wx.hideLoading();
        that._recordingCard = false;
        var errMsg = '加入工作记录失败';
        var errCode = '';
        if (err && err.data) {
          errCode = err.data.errorCode || '';
          errMsg = err.data.msg || err.data.message || errMsg;
          if (errCode === 'CARD_UNSUPPORTED') {
            errMsg = '暂不支持加入工作记录';
          } else if (errCode) {
            errMsg = errMsg + ' (' + errCode + ')';
          }
        } else if (err && err.message) errMsg = err.message;
        else if (err && typeof err === 'string') errMsg = err;

        wx.showToast({ title: errMsg, icon: 'none', duration: 2500 });
        console.error('[AI对话] 加入工作记录失败', { cardType: cardType, itemKey: itemKey, err: err });
      });
  },

  /** 已加入工作记录后，跳转店长工作记录页 */
  onViewWorkRecord: function () {
    wx.navigateTo({
      url: '../workRecord/workRecord',
    });
  },

  // ========== 卡级图钉 ==========

  /**
   * 从业务卡片切换图钉状态
   * 卡片级图钉：传 body 含 pinScope / cardInstanceId / cardType / cardTitle
   * 如果 cardInstanceId 为空则回退到消息级图钉（空 body）
   */
  onCardPinToggle: function (e) {
    var that = this;
    if (that._pinningCard) return;

    // 从 dataset 获取参数
    var cardType = e.currentTarget.dataset.cardType || '';
    var itemKey = e.currentTarget.dataset.itemKey || '__CARD__';
    var messageId = e.currentTarget.dataset.messageId;
    var cardInstanceId = e.currentTarget.dataset.cardInstanceId || '';
    var cardTitleRaw = e.currentTarget.dataset.cardTitleRaw || '';
    var cardIndex = e.currentTarget.dataset.cardIndex;
    var cardKey = e.currentTarget.dataset.cardKey || '';

    // ====== 图钉调试日志：请求参数 ======
    console.log('@@[PIN_DEBUG] onCardPinToggle 触发 - 请求参数', JSON.stringify({
      cardType: cardType,
      messageId: messageId,
      cardInstanceId: cardInstanceId,
      cardTitleRaw: cardTitleRaw,
      cardIndex: cardIndex,
      cardKey: cardKey,
      isCardMode: !!cardInstanceId,
      currentlyPinned: (that.data._pinnedCardKeys || {})[messageId + '|' + cardType + '|' + itemKey] ? true : false,
      conversationId: that.data.conversationId,
      fullDataset: JSON.stringify(e.currentTarget.dataset),
    }));

    if (!cardType) {
      wx.showToast({ title: '卡片类型缺失', icon: 'none' });
      return;
    }

    // 校验必要参数
    var runPayloadBase = that.data.runPayloadBase;
    if (!runPayloadBase || !runPayloadBase.userId) {
      wx.showToast({ title: '未获取到登录信息', icon: 'none' });
      return;
    }
    if (!that.data.conversationId) {
      wx.showToast({ title: '会话信息缺失', icon: 'none' });
      return;
    }
    if (!messageId) {
      wx.showToast({ title: '消息信息缺失', icon: 'none' });
      return;
    }

    // 查找消息，确保 _realMessageReady
    var messages = that.data.messages;
    var msg = null;
    var msgIdx = -1;
    for (var i = 0; i < messages.length; i++) {
      if (messages[i].id === messageId) {
        msg = messages[i];
        msgIdx = i;
        break;
      }
    }

    if (msg && !msg._realMessageReady) {
      wx.showToast({ title: '消息正在同步中，请稍候再试', icon: 'none', duration: 2000 });
      return;
    }

    // 防重复提交（cardInstanceId 区分同一消息里同 cardType 的不同卡片）
    var dedupKey = messageId + '|' + cardType + '|' + (cardInstanceId || itemKey) + '|__PIN__';
    var pinnedKeys = that.data._pinnedCardKeys || {};
    var currentlyPinned = !!pinnedKeys[dedupKey];

    // 图钉使用服务端 messageId（真实 ID）
    var serverMessageId = messageId;
    if (msg && msg._realMessageReady) {
      serverMessageId = messageId;
    }

    that._pinningCard = true;
    wx.showLoading({ title: currentlyPinned ? '取消中…' : '固定中…', mask: false });

    var userId = runPayloadBase.userId;

    // 判断使用卡片级还是消息级图钉：有 cardInstanceId 则使用卡片级
    var isCardMode = !!cardInstanceId;

    var apiCall;
    if (currentlyPinned) {
      // 取消图钉：如果有 pinId 则直接按 pinId 删除（适用于卡片级和消息级）
      var savedPin = pinnedKeys[dedupKey];
      var savedPinId = savedPin && savedPin.pinId;
      if (savedPinId) {
        apiCall = ai.deletePin(savedPinId, userId);
      } else if (isCardMode) {
        // 卡片级但没有 pinId（异常），尝试用消息级 unpin
        apiCall = ai.unpinMessage(serverMessageId, userId);
      } else {
        apiCall = ai.unpinMessage(serverMessageId, userId);
      }
    } else {
      // 添加图钉
      if (isCardMode) {
        // 卡片级图钉：传 body
        var pinBody = {
          pinScope: 'CARD',
          cardInstanceId: cardInstanceId,
          cardType: cardType,
          cardTitle: cardTitleRaw || cardType,
        };
        if (cardKey) pinBody.cardKey = cardKey;
        if (cardIndex !== undefined && cardIndex !== '') {
          pinBody.cardIndex = typeof cardIndex === 'number' ? cardIndex : Number(cardIndex);
        }
        apiCall = ai.pinCard(serverMessageId, userId, pinBody);
        // ====== 图钉调试日志：卡片级请求 ======
        console.log('@@[PIN_DEBUG] 卡片级图钉请求', JSON.stringify({
          url: 'POST /api/ai/messages/' + serverMessageId + '/pin?userId=' + userId,
          body: pinBody,
          messageId: serverMessageId,
          userId: userId,
        }));
      } else {
        // 消息级图钉（空 body）
        apiCall = ai.pinMessage(serverMessageId, userId);
        console.log('@@[PIN_DEBUG] 消息级图钉请求', JSON.stringify({
          url: 'POST /api/ai/messages/' + serverMessageId + '/pin?userId=' + userId,
          body: {},
        }));
      }
    }

    apiCall
      .then(function (res) {
        wx.hideLoading();
        that._pinningCard = false;

        var result = res.result || res;

        // 业务错误判断：code 必须 === 0 才算成功
        if (result && result.code !== undefined && result.code !== 0 && result.code !== '0') {
          var bizErrMsg = result.msg || result.message || ('业务错误 code=' + result.code);
          wx.showToast({ title: bizErrMsg, icon: 'none', duration: 2500 });
          console.error('[AI对话] 图钉操作业务错误', {
            cardType: cardType, messageId: messageId, errorCode: result.code, errorMsg: bizErrMsg, isCardMode: isCardMode
          });
          return;
        }

        // 兼容 CommonResult 包装
        var data = result;
        if (data && data.code !== undefined && data.data !== undefined) {
          data = data.data;
        }

        var newPinned = !!data.pinned;
        var pinId = data.pinId || null;

        // ====== 图钉调试日志：成功响应 ======
        console.log('@@[PIN_DEBUG] 图钉操作成功 - 完整响应', JSON.stringify({
          cardType: cardType,
          messageId: messageId,
          serverMessageId: serverMessageId,
          cardInstanceId: cardInstanceId,
          isCardMode: isCardMode,
          newPinned: newPinned,
          pinId: pinId,
          duplicated: !!data.duplicated,
          dataKeys: data ? Object.keys(data) : [],
          fullData: JSON.stringify(data),
          fullResult: JSON.stringify(result),
        }));

        // 更新 _pinnedCardKeys
        var updatedPinned = that.data._pinnedCardKeys || {};
        if (newPinned) {
          updatedPinned[dedupKey] = { pinId: pinId, time: Date.now() };
        } else {
          delete updatedPinned[dedupKey];
        }

        // 只更新匹配 cardType 的那张卡片的 pin 状态
        var patch = { _pinnedCardKeys: updatedPinned };
        if (msgIdx >= 0 && msg.cards) {
          for (var ci = 0; ci < msg.cards.length; ci++) {
            if (msg.cards[ci].cardType === cardType) {
              patch['messages[' + msgIdx + '].cards[' + ci + ']._cardPinned'] = newPinned;
              break;
            }
          }
        }
        that.setData(patch);

        if (data.duplicated) {
          wx.showToast({ title: '该图钉已存在', icon: 'none', duration: 2000 });
        } else if (newPinned) {
          wx.showToast({ title: '已添加图钉', icon: 'success', duration: 2000 });
        } else {
          wx.showToast({ title: '已取消图钉', icon: 'success', duration: 2000 });
        }

        console.log('[AI对话] 图钉操作成功', {
          cardType: cardType, messageId: messageId, pinned: newPinned, pinId: pinId, isCardMode: isCardMode
        });
      })
      .catch(function (err) {
        wx.hideLoading();
        that._pinningCard = false;
        var errMsg = '操作失败';
        if (err && err.message) errMsg = err.message;
        else if (err && err.data && err.data.message) errMsg = err.data.message;
        else if (err && typeof err === 'string') errMsg = err;

        wx.showToast({
          title: errMsg,
          icon: 'none',
          duration: 2500,
        });

        console.error('[AI对话] 图钉操作失败', err, { isCardMode: isCardMode });
      });
  },

  // ========== 添加到工作笔记 ==========

  /**
   * @deprecated 业务卡片已统一走「加入工作记录」，勿从卡片操作区调用
   */
  onAddToWorkNote: function () {
    console.warn('[AI对话] onAddToWorkNote 已停用：业务卡片请使用「加入工作记录」');
    wx.showToast({ title: '请使用「加入工作记录」', icon: 'none', duration: 2000 });
  },

  /**
   * 关闭笔记弹窗
   */
  onCloseNoteDialog: function () {
    this.setData({
      showNoteDialog: false,
      noteDialogTitle: '',
      noteDialogContent: '',
      noteDialogSnapshot: '',
      noteDialogAnswerPreview: '',
      noteDialogMessageId: null,
      noteDialogRunId: null,
      noteDialogCardType: '',
      noteDialogCardInstanceId: '',
      noteDialogCardTitle: '',
    });
  },

  /**
   * 笔记标题输入
   */
  onNoteTitleInput: function (e) {
    this.setData({ noteDialogTitle: e.detail.value });
  },

  /**
   * 笔记内容输入
   */
  onNoteContentInput: function (e) {
    this.setData({ noteDialogContent: e.detail.value });
  },

  /**
   * 确认保存笔记
   */
  onConfirmAddNote: function () {
    wx.showToast({ title: '请使用卡片「加入工作记录」', icon: 'none', duration: 2000 });
    this.setData({ showNoteDialog: false });
  },
});
