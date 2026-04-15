/**
 * AI 对话页面（钱多多老师）
 * 用户与 AI 营销军师进行对话咨询
 * 
 * 接口（来自 aiChat）:
 * 1. createConversation(departmentId, userId) - 创建/恢复对话
 * 2. sendMessage(conversationId, msg)          - 发送消息（非流式）
 * 3. getHistory(conversationId)               - 获取对话历史
 * 4. endConversation(conversationId)          - 结束对话（触发记忆提取）
 */

var load = require('../../../../lib/load.js');
var ai = require('../../../services/api');

Page({

  // ============================================
  // 数据定义
  // ============================================

  data: {
    navBarHeight: 0,
    windowWidth: 0,
    windowHeight: 0,

    // 门店信息
    departmentId: 0,
    userId: 0,
    departmentName: '',

    // 对话状态
    conversationId: null,
    isLoading: true,
    isSending: false,
    _sending: false, // 同步锁，防止重复发送
    historyLoaded: false,

    // 消息列表
    messages: [],

    // 输入
    inputValue: '',

    // 滚动到底部用
    scrollToView: '',
  },

  // ============================================
  // 生命周期
  // ============================================

  onLoad: function () {
    var that = this;
    var userInfo = wx.getStorageSync('userInfo') || {};
    var departmentId = userInfo.gbDuDepartmentId;
    var userId = userInfo.gbDepartmentUserId;

    that.setData({
      departmentId: departmentId,
      userId: userId,
    });

    // 获取导航栏高度
    var systemInfo = wx.getSystemInfoSync();
    that.setData({
      windowWidth: systemInfo.windowWidth,
      windowHeight: systemInfo.windowHeight,
      navBarHeight: (systemInfo.statusBarHeight || 20) * 2 + 88,
    });

    // 创建/恢复对话
    if (departmentId) {
      that._initConversation();
    } else {
      that.setData({ isLoading: false });
      wx.showToast({ title: '未获取到门店信息', icon: 'none' });
    }
  },

  onUnload: function () {
    // 退出页面时结束对话，触发记忆提取
    var conversationId = this.data.conversationId;
    if (conversationId) {
      ai.endConversation(conversationId).catch(function () { });
    }
  },

  // ============================================
  // 对话管理
  // ============================================

  /** 创建或恢复对话 */
  _initConversation: function () {
    var that = this;
    var departmentId = that.data.departmentId;
    var userId = that.data.userId;

    console.log('[AI对话] 创建对话, departmentId =', departmentId, ', userId =', userId, ', type =', that.data.currentType);

    ai.createConversation(departmentId, userId, that.data.currentType)
      .then(function (res) {
        console.log('[AI对话] createConversation 返回 res =', res);
        var result = res.result;
        console.log('[AI对话] result =', JSON.stringify(result));
        
        // 兼容多种返回格式：
        // 格式1: { code: 0, data: { id: 1, ... } }
        // 格式2: { code: 0, data: { data: { id: 1, ... } } } 
        // 格式3: { id: 1, ... } (直接返回对话对象)
        var convData = null;
        if (result.code == 0 && result.data) {
          convData = result.data;
        } else if (result.code == 0 && result.id) {
          convData = result;
        } else if (result.id) {
          convData = result;
        }

        if (convData) {
          that.setData({
            conversationId: convData.id || convData.gbAiConversationId || convData.conversationId,
            isLoading: false,
          });
          console.log('[AI对话] 对话创建成功, conversationId =', convData.id || convData.gbAiConversationId || convData.conversationId);
          that._loadHistory();
        } else {
          console.log('[AI对话] 对话创建失败, result =', result);
          that.setData({ isLoading: false });
          wx.showToast({ title: '创建对话失败', icon: 'none' });
        }
      })
      .catch(function (err) {
        console.log('[AI对话] 创建对话异常, err =', err);
        that.setData({ isLoading: false });
        wx.showToast({ title: '网络异常，请重试', icon: 'none' });
      });
  },

  /** 加载历史消息 */
  _loadHistory: function () {
    var that = this;
    var conversationId = that.data.conversationId;
    if (!conversationId) return;

    ai.getHistory(conversationId)
      .then(function (res) {
        console.log('[AI对话] _loadHistory 返回, messages.length =', that.data.messages.length);
        // 如果已经有本地消息（用户已发送），不覆盖
        if (that.data.messages.length > 0) {
          console.log('[AI对话] 已有本地消息，跳过历史覆盖');
          return;
        }
        var result = res.result;
        console.log('[AI对话] 历史消息数据:', result);
        if (result.code == 0 && result.data) {
          var list = result.data.map(function (msg) {
            return {
              id: msg.id || msg.gbAiMessageId,
              role: msg.role || msg.gbAiMessageRole,
              content: msg.content || msg.gbAiMessageContent || '',
              time: msg.createTime || msg.gbAiMessageCreateTime || msg.createdAt || '',
            };
          });
          console.log('[AI对话] 加载历史消息:', list.length, '条');
          that.setData({ messages: list, historyLoaded: true });
          that._scrollToBottom();
        }
      })
      .catch(function (err) {
        console.log('[AI对话] 加载历史失败:', err);
        that.setData({ historyLoaded: true });
      });
  },

  /** 发送消息 */
  _sendMessage: function () {
    var that = this;
    var message = that.data.inputValue.trim();
    console.log('[AI对话] _sendMessage, message =', message, ', conversationId =', that.data.conversationId, ', isSending =', that.data.isSending);
    if (!message || that.data.isSending || !that.data.conversationId || that._sending) return;
    that._sending = true;

    // 标记已开始发送，阻止历史消息覆盖
    that.setData({ historyLoaded: true });

    // 添加用户消息到列表
    var userMsg = {
      id: Date.now(),
      role: 'user',
      content: message,
      time: '',
    };
    var messages = that.data.messages.concat([userMsg]);
    that.setData({
      inputValue: '',
      isSending: true,
      messages: messages,
    });
    that._scrollToBottom();

    // 添加 AI 占位消息
    var aiMsg = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '',
      isLoading: true,
      time: '',
    };
    messages = messages.concat([aiMsg]);
    that.setData({ messages: messages });
    that._scrollToBottom();

    // 调用接口
    ai.sendMessage(that.data.conversationId, message)
      .then(function (res) {
        console.log('[AI对话] sendMessage 返回 res =', res);
        var result = res.result;
        var content = '';
        if (result.code == 0 && result.data) {
          content = result.data.content || result.data.gbAiMessageContent || '';
        } else if (result.code == 0 && result.gbAiMessageContent) {
          content = result.gbAiMessageContent;
        } else {
          content = result.msg || '抱歉，暂时无法回复，请稍后再试。';
        }
        console.log('[AI对话] AI 回复 content =', content);
        // 用真实回复替换占位消息
        that._replaceAiMessage(aiMsg.id, content);
      })
      .catch(function () {
        that._replaceAiMessage(aiMsg.id, '网络异常，请检查网络后重试。');
      })
      .finally(function () {
        that._sending = false;
        that.setData({ isSending: false });
      });
  },

  /** 用真实回复替换占位消息 */
  _replaceAiMessage: function (msgId, content) {
    var messages = this.data.messages;
    for (var i = 0; i < messages.length; i++) {
      if (messages[i].id === msgId) {
        messages[i].content = content;
        messages[i].isLoading = false;
        break;
      }
    }
    this.setData({ messages: messages });
    this._scrollToBottom();
  },

  /** 滚动到底部 */
  _scrollToBottom: function () {
    var that = this;
    setTimeout(function () {
      var len = that.data.messages.length;
      if (len > 0) {
        that.setData({ scrollToView: 'msg-' + (len - 1) });
      }
    }, 100);
  },

  // ============================================
  // 事件处理
  // ============================================

  /** 输入框内容变化 */
  onInputChange: function (e) {
    this.setData({ inputValue: e.detail.value });
  },

  /** 发送按钮点击 */
  onSendTap: function () {
    this._sendMessage();
  },

  /** 快捷问题点击 —— 创建对应类型的新对话 */
  onQuickTap: function (e) {
    var type = e.currentTarget.dataset.type;
    this.setData({
      currentType: type,
      isLoading: true,
      messages: [],
      conversationId: null,
      historyLoaded: false,
    });
    this._initConversation();
  },

  /** 返回上一页 */
  toBack: function () {
    wx.navigateBack();
  },
});
