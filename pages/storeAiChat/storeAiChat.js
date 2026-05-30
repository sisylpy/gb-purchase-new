
var ai = require('../../services/aiChatApi');
var aiRichText = require('../../utils/aiRichText');
var purchaseContext = require('../../lib/purchaseContext');
var pagesApi = require('../services/pages');

function normalizeConversationRow(raw) {
  return {
    id: raw.id || raw.gbAiConversationId || raw.conversationId,
    title:
      raw.title ||
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
    messages: [],
    inputValue: '',
    composerFocused: false,
    scrollToView: '',
    /** SSE 阶段文案 */
    streamingStage: '',
    /** 当前 Run ID */
    currentRunId: null,
    drawerOpen: false,
    drawerPaddingTop: 88,
    drawerScrollHeight: 400,
    conversationHistoryList: [],
    conversationHistoryLoading: false,
    /** 创建 Run 的基础参数（userId / departmentId / distributerId / scopeMode） */
    runPayloadBase: null,
    userAvatarUrl: '',
    /** 是否展示调试 JSON */
    showDebugJson: true,
  },

  onLoad: function (options) {
    var that = this;
    var sys = wx.getSystemInfoSync();
    var sb = sys.statusBarHeight || 20;

    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      that._initWithUserInfo(userInfo, sys, sb);
    } else {
      that.setData({
        isLoading: true,
        statusBarHeight: sb,
        windowHeight: sys.windowHeight,
        drawerPaddingTop: sb + 44,
        drawerScrollHeight: Math.max(200, sys.windowHeight - (sb + 44) - 120),
      });
      that._userLogin();
    }
  },

  /** 根据 userInfo 初始化页面 */
  _initWithUserInfo: function (userInfo, sys, sb) {
    var that = this;

    var disInfo = wx.getStorageSync('disInfo') || {};
    var userId = userInfo.gbDepartmentUserId;
    var departmentId = userInfo.gbDuDepartmentId || userInfo.gbDepartmentId;
    var distributerId = userInfo.gbDuDistributerId || disInfo.gbDistributerId;
    var admin = Number(userInfo.gbDuAdmin);
    console.log("admini==" , admin)

    var nick = userInfo.gbDuWxNickName || userInfo.nickName || '';
    var initial = '?';
    if (nick) {
      initial = nick.length === 1 ? nick : nick.charAt(nick.length - 1);
    }
    var greetLine1 = nick ? nick + '，你好' : '你好';

    var avatarUrl = userInfo.gbDuWxAvartraUrl || '';

    // 构建 runPayloadBase
    var payload = { userId: userId };

    if (admin === 0) {
      // 集团管理端
      payload.scopeMode = 'GROUP';
      payload.distributerId = distributerId;
    } else {
      // 门店端
      payload.scopeMode = 'STORE';
      payload.departmentId = departmentId;
    }

    var drawerPad = sb + 44;
    var drawerHeadApprox = 120;

    that.setData({
      userInfo: userInfo,
      userId: userId,
      departmentId: departmentId,
      userInitial: initial,
      greetLine1: greetLine1,
      statusBarHeight: sb,
      windowHeight: sys.windowHeight,
      drawerPaddingTop: drawerPad,
      drawerScrollHeight: Math.max(200, sys.windowHeight - drawerPad - drawerHeadApprox),
      runPayloadBase: payload,
      userAvatarUrl: avatarUrl,
      isLoading: false,
    });
  },

  /** 用户登录推断 */
  _userLogin: function () {
    var that = this;
    wx.login({
      success: function (resLogin) {
        pagesApi.gbLoginIndex(resLogin.code)
          .then(function (res) {
            console.log('[StoreAiChat] login ====', res.result);
            var result = res.result;
            if (result.code !== -1) {
              if (result.data !== 'noBuyer') {
                var userInfo = result.data.depUserInfo || result.data.userInfo || {};
                wx.setStorageSync('userInfo', userInfo);
                if (result.data.disInfo) {
                  wx.setStorageSync('disInfo', result.data.disInfo);
                }
                var sys = wx.getSystemInfoSync();
                var sb = sys.statusBarHeight || 20;
                that._initWithUserInfo(userInfo, sys, sb);
              } else {
                wx.redirectTo({
                  url: '/pages/register/register',
                });
              }
            } else {
              wx.showToast({ title: result.msg || '登录失败', icon: 'none' });
              that.setData({ isLoading: false });
            }
          })
          .catch(function (err) {
            console.error('[StoreAiChat] login 异常', err);
            that.setData({ isLoading: false });
            wx.showToast({ title: '网络异常，请重试', icon: 'none' });
          });
      },
      fail: function () {
        that.setData({ isLoading: false });
        wx.showToast({ title: '微信登录失败', icon: 'none' });
      },
    });
  },


  onUnload: function () {
    this._cleanupSse();
  },

  /** 清理 SSE 资源 */
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

  onEnterStoreForPurchaseTap: function (e) {
    var deptId = e.currentTarget.dataset.deptid;
    if (deptId === undefined || deptId === null || deptId === '') return;
    var list = this.data.groupMendianDepartments || [];
    var item = null;
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].gbDepartmentId) === String(deptId)) {
        item = list[i];
        break;
      }
    }
    if (!item) return;
    purchaseContext.setGroupSelectedStoreDepartment(item);
    wx.reLaunch({ url: '/pages/index/index' });
  },

  /**
   * 集团下门店部门列表
   */
  _loadGroupMendianDepartments: function (disId) {
    var that = this;
    if (!disId) return;
    ai.getDisDepartmentGbMendianJing(disId)
      .then(function (res) {
        var r = res.result;
        if (r && r.code == 0) {
          that.setData({
            groupMendianDepartments: r.data || [],
            groupMendianDepartmentsLoaded: true,
          });
        } else {
          that.setData({ groupMendianDepartmentsLoaded: true });
        }
      })
      .catch(function () {
        that.setData({ groupMendianDepartmentsLoaded: true });
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
      // 提取 cardPayload：兼容 message.cardPayload 和 message.cards[0]
      var cardPayload = null;
      if (msg.cardPayload && msg.cardPayload.cardType) {
        cardPayload = msg.cardPayload;
      } else if (Array.isArray(msg.cards) && msg.cards.length > 0 && msg.cards[0].cardType) {
        cardPayload = msg.cards[0];
      }
      return {
        id: msg.id || msg.messageId || msg.gbAiMessageId,
        role: role,
        content: cleaned,
        time: msg.createTime || msg.createdAt || '',
        richNodes: role === 'assistant' && trimmed ? aiRichText.markdownToRichHtml(cleaned) : '',
        cardPayload: cardPayload,
      };
    });
  },

  // ========== 抽屉 & 历史对话 ==========

  onOpenDrawerTap: function () {
    this.setData({ drawerOpen: true, drawerStoreListVisible: false });
    this._loadConversationHistoryList();
  },

  onDrawerMaskTap: function () {
    this.setData({ drawerOpen: false, drawerStoreListVisible: false });
  },

  onDrawerCloseTap: function () {
    this.setData({ drawerOpen: false, drawerStoreListVisible: false });
  },

  onDrawerToggleStoreListTap: function () {
    if (!this.data.isGroupManager) return;
    this.setData({ drawerStoreListVisible: !this.data.drawerStoreListVisible });
  },

  onDrawerStoreListDisabledTap: function () {
    wx.showToast({ title: '集团管理端可切换门店', icon: 'none' });
  },

  onDrawerHomeTap: function () {
    wx.reLaunch({ url: '/pages/index/index' });
  },

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

  onHistoryConversationTap: function (e) {
    var id = e.currentTarget.dataset.id;
    if (id === undefined || id === null || id === '') return;
    if (String(id) === String(this.data.conversationId)) {
      this.setData({ drawerOpen: false });
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
          drawerOpen: false,
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
      inputValue: '',
      isSending: false,
      _sending: false,
    });
  },

  // ========== 发送消息 & SSE ==========

  /**
   * 发送一条用户消息
   * 流程：POST /ai/runs → GET /ai/runs/{runId}/events（SSE）
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
        inputValue: '',
        isSending: true,
        messages: messages,
        streamingStage: '',
      },
      function () {
        that._scrollToBottom();

        // 构建 createAiRun payload
        var payload = Object.assign({}, runPayloadBase, { message: message });
        // 如果有 conversationId，带上（后续轮次）
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
            that.setData({ isSending: false, streamingStage: '' });
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
    /** SSE 过程中累积的 cardPayload */
    var pendingCardPayload = null;
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
          that.setData({ streamingStage: stage });
        }
        // 从 run_finished 或 agent_finished 事件中提取 cardPayload
        if (step.cardPayload && step.cardPayload.cardType) {
          pendingCardPayload = step.cardPayload;
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
        if (t) {
          that._replaceAiMessage(aiMsgId, t, pendingCardPayload);
        } else {
          // 无正文也结束加载态
          that._patchAssistantPlain(aiMsgId, assistantBuffer, false, false);
          // 即使无正文，也写入 cardPayload
          if (pendingCardPayload) {
            that._patchCardPayload(aiMsgId, pendingCardPayload);
          }
        }
        // 保存调试数据
        that._saveDebugData(aiMsgId, debugRunResult, debugEvents);
        that._sending = false;
        that.setData({ isSending: false, streamingStage: '', currentRunId: null });
      },
      onError: function (errMsg) {
        clearFlushTimer();
        var finalContent = assistantBuffer || errMsg || '生成失败，请稍后再试';
        that._replaceAiMessage(aiMsgId, finalContent);
        // 保存调试数据（即使出错也记录）
        that._saveDebugData(aiMsgId, debugRunResult, debugEvents);
        that._sending = false;
        that.setData({ isSending: false, streamingStage: '', currentRunId: null });
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
        // SSE 层面已通过 onError 回调处理，此处只做兜底
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

  // ========== 消息渲染辅助 ==========

  _patchAssistantPlain: function (msgId, content, stillLoading, plainStream) {
    var list = this.data.messages;
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === msgId && list[i].role === 'assistant') {
        idx = i;
        break;
      }
    }
    if (idx < 0) return;
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

  _replaceAiMessage: function (msgId, content, cardPayload) {
    var list = this.data.messages;
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
    if (cardPayload && cardPayload.cardType) {
      patch['messages[' + idx + '].cardPayload'] = cardPayload;
    }
    if (this._streamScrollTimer) {
      clearTimeout(this._streamScrollTimer);
      this._streamScrollTimer = null;
    }
    this.setData(patch);
    this._scrollToBottom();
  },

  /** 向指定 AI 消息写入 cardPayload */
  _patchCardPayload: function (msgId, cardPayload) {
    if (!cardPayload || !cardPayload.cardType) return;
    var list = this.data.messages;
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === msgId && list[i].role === 'assistant') {
        idx = i;
        break;
      }
    }
    if (idx < 0) return;
    var patch = {};
    patch['messages[' + idx + '].cardPayload'] = cardPayload;
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

  // ========== 输入交互 ==========

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

  onMenuTap: function () {
    var that = this;
    wx.showActionSheet({
      itemList: ['新建对话', '返回上一页'],
      success: function (res) {
        if (res.tapIndex === 0) {
          that.onNewConversationTap();
        } else if (res.tapIndex === 1) {
          that.toBack();
        }
      },
    });
  },

  onProfileTap: function () {},

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
