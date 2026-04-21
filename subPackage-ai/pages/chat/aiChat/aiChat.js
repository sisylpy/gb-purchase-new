/**
 * AI 对话页（算账版）— 布局与交互参考 Google Gemini 浅色客户端
 *
 * 接口：
 * - getRecommendedTopics()     GET ai/chat/topics
 * - createConversation(...)    POST ai/chat/conversation
 * - sendMessage(...)           POST ai/chat/send
 * - getHistory(...)            GET ai/chat/history/{id}
 * - endConversation(...)       POST ai/chat/end/{id}
 * - getTopicsHistoryByUserId   GET ai/chat/topics/history/{userId}
 * - getTopicMessages(topicId)  GET ai/chat/topic/{topicId}/messages（topicId = conversationId）
 */

var ai = require('../../../services/api');
var aiRichText = require('../../../utils/aiRichText');

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
 * 解析 R.ok().put("data", { title, subtitle, topics })
 * 兼容旧版：data 为数组 或 data.topics
 */
function extractTopicsPayload(result) {
  if (!result) return null;
  if (Array.isArray(result)) {
    return { title: '', subtitle: '', topics: result };
  }
  var code = result.code;
  if (code !== undefined && code !== 0 && code !== '0') return null;
  var d = result.data;
  if (!d) return null;
  if (Array.isArray(d)) {
    return { title: '', subtitle: '', topics: d };
  }
  if (typeof d === 'object' && Array.isArray(d.topics)) {
    return {
      title: d.title || '',
      subtitle: d.subtitle || '',
      topics: d.topics,
    };
  }
  return null;
}

/** 子问题：question(id, 短标题, 发送文案) */
function normalizeQuestion(raw) {
  var id = raw.id || '';
  var label = raw.title || raw.label || raw.name || raw.summary || '';
  var prompt = raw.prompt || raw.content || raw.text || raw.message || '';
  return {
    id: id || String(label || Math.random()),
    label: label,
    prompt: prompt,
  };
}

/** 主题卡片 + questions 列表 */
function normalizeTopic(raw) {
  var id = raw.id || raw.topicId || raw.key || '';
  var title = raw.title || raw.topicTitle || '';
  var description = raw.description || raw.desc || '';
  var qArr = raw.questions || raw.questionList || [];
  var questions = [];
  if (Array.isArray(qArr)) {
    questions = qArr.map(normalizeQuestion).filter(function (q) {
      return q.prompt || q.label;
    });
  }
  if (questions.length === 0) {
    var legacy =
      raw.suggestedPrompt || raw.suggestedGuide || raw.prompt || raw.guide || raw.suggest || '';
    if (legacy) {
      questions.push({ id: 'legacy', label: title || '开始对话', prompt: legacy });
    }
  }
  return {
    id: id || String(title || Math.random()),
    title: title,
    description: description,
    questions: questions,
    emoji: emojiForTopicId(id),
  };
}

/** 从 R 中取出消息数组（getHistory / getTopicMessages 共用） */
function extractMessageListFromResult(result) {
  if (!result) return null;
  if (result.code != 0 && result.code !== '0') return null;
  var d = result.data;
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.data)) return d.data;
  if (d && Array.isArray(d.messages)) return d.messages;
  if (d && Array.isArray(d.list)) return d.list;
  return null;
}

/** 从 R 中取出会话列表 */
function extractConversationHistoryFromResult(result) {
  if (!result) return [];
  if (result.code != 0 && result.code !== '0') return [];
  var d = result.data;
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.data)) return d.data;
  if (d && Array.isArray(d.list)) return d.list;
  if (d && Array.isArray(d.records)) return d.records;
  return [];
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
  },

  onLoad: function () {
    var that = this;
    var userInfo = wx.getStorageSync('userInfo') || {};
    var departmentId = userInfo.gbDuDepartmentId;
    var userId = userInfo.gbDepartmentUserId;
    var nick = userInfo.gbDuWxNickName || userInfo.nickName || '';
    var initial = '?';
    if (nick) {
      initial = nick.length === 1 ? nick : nick.charAt(nick.length - 1);
    }
    var greetLine1 = nick ? nick + '，你好' : '你好';

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
    });

    that._loadTopics();

    if (departmentId) {
      that._initConversation();
    } else {
      that.setData({ isLoading: false });
      wx.showToast({ title: '未获取到门店信息', icon: 'none' });
    }
  },

  onUnload: function () {
    var conversationId = this.data.conversationId;
    if (conversationId) {
      ai.endConversation(conversationId).catch(function () {});
    }
  },

  /** 拉取推荐主题包：title / subtitle / topics[].questions[] */
  _loadTopics: function () {
    var that = this;
    ai
      .getRecommendedTopics()
      .then(function (res) {
        var result = res.result;
        var payload = extractTopicsPayload(result);
        if (!payload) {
          that.setData({
            topics: [],
            topicPageTitle: '',
            topicPageSubtitle: '',
          });
          return;
        }
        var topics = (payload.topics || [])
          .map(normalizeTopic)
          .filter(function (t) {
            return t.title;
          });
        that.setData({
          topicPageTitle: payload.title || '',
          topicPageSubtitle: payload.subtitle || '',
          topics: topics,
        });
      })
      .catch(function () {
        wx.showToast({ title: '主题加载失败', icon: 'none' });
      });
  },

  _initConversation: function () {
    var that = this;
    var departmentId = that.data.departmentId;
    var userId = that.data.userId;

    console.log('[AI对话] 创建对话, departmentId =', departmentId, ', userId =', userId);

    ai
      .createConversation(departmentId, userId, undefined)
      .then(function (res) {
        console.log('[AI对话] createConversation 返回 res =', res);
        var result = res.result;

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
          console.log(
            '[AI对话] 对话创建成功, conversationId =',
            convData.id || convData.gbAiConversationId || convData.conversationId
          );
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

  /** 将接口消息列表转为页面消息结构 */
  _mapRawMessagesToView: function (rawList) {
    var that = this;
    return (rawList || []).map(function (msg) {
      var role = msg.role || msg.gbAiMessageRole;
      var content = msg.content || msg.gbAiMessageContent || '';
      return {
        id: msg.id || msg.gbAiMessageId,
        role: role,
        content: content,
        time: msg.createTime || msg.gbAiMessageCreateTime || msg.createdAt || '',
        richNodes: role === 'assistant' ? aiRichText.markdownToRichHtml(content) : '',
      };
    });
  },

  _loadHistory: function () {
    var that = this;
    var conversationId = that.data.conversationId;
    if (!conversationId) return;

    ai
      .getHistory(conversationId)
      .then(function (res) {
        if (that.data.messages.length > 0) {
          return;
        }
        var result = res.result;
        if (result.code == 0) {
          var rawList = extractMessageListFromResult(result);
          if (rawList && rawList.length) {
            var list = that._mapRawMessagesToView(rawList);
            that.setData({ messages: list, historyLoaded: true });
            that._scrollToBottom();
          }
        }
      })
      .catch(function () {
        that.setData({ historyLoaded: true });
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
      .getTopicsHistoryByUserId(userId)
      .then(function (res) {
        var rows = extractConversationHistoryFromResult(res.result);
        var list = rows
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
    var prompt = e.currentTarget.dataset.prompt;
    if (!prompt) return;
    this.setData({ drawerOpen: false, drawerExpandedTopicId: '' });
    this._sendMessage(prompt);
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
    wx.showLoading({ title: '加载中', mask: true });
    ai
      .getTopicMessages(conversationId)
      .then(function (res) {
        wx.hideLoading();
        var result = res.result;
        var rawList = extractMessageListFromResult(result);
        if (!rawList || !rawList.length) {
          wx.showToast({ title: '暂无消息', icon: 'none' });
          return;
        }
        var messages = that._mapRawMessagesToView(rawList);
        that.setData({
          conversationId: conversationId,
          messages: messages,
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

  /**
   * 发送一条用户消息
   * @param {string} [presetText] 若传入则使用该文案发送（子问题一键发送）；否则用输入框内容
   */
  _sendMessage: function (presetText) {
    var that = this;
    var message =
      presetText !== undefined && presetText !== null && String(presetText).length > 0
        ? String(presetText).trim()
        : that.data.inputValue.trim();
    if (!message || that.data.isSending || that._sending) return;
    if (!that.data.conversationId) {
      wx.showToast({ title: '正在连接，请稍候', icon: 'none' });
      return;
    }
    that._sending = true;
    that.setData({
      historyLoaded: true,
      expandedTopicId: '',
      drawerOpen: false,
      drawerExpandedTopicId: '',
    });

    var userMsg = {
      id: Date.now(),
      role: 'user',
      content: message,
      time: '',
      richNodes: '',
    };
    var messages = that.data.messages.concat([userMsg]);
    that.setData({
      inputValue: '',
      isSending: true,
      messages: messages,
    });
    that._scrollToBottom();

    var aiMsg = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '',
      isLoading: true,
      time: '',
      richNodes: '',
    };
    messages = messages.concat([aiMsg]);
    that.setData({ messages: messages });
    that._scrollToBottom();

    ai
      .sendMessage(that.data.conversationId, message)
      .then(function (res) {
        var result = res.result;
        var content = '';
        if (result.code == 0 && result.data) {
          content = result.data.content || result.data.gbAiMessageContent || '';
        } else if (result.code == 0 && result.gbAiMessageContent) {
          content = result.gbAiMessageContent;
        } else {
          content = result.msg || '抱歉，暂时无法回复，请稍后再试。';
        }
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

  _replaceAiMessage: function (msgId, content) {
    var messages = this.data.messages;
    for (var i = 0; i < messages.length; i++) {
      if (messages[i].id === msgId) {
        messages[i].content = content;
        messages[i].isLoading = false;
        if (messages[i].role === 'assistant') {
          messages[i].richNodes = aiRichText.markdownToRichHtml(content);
        } else {
          messages[i].richNodes = '';
        }
        break;
      }
    }
    this.setData({ messages: messages });
    this._scrollToBottom();
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

  /** 点击子问题：直接发送该条引导语 */
  onQuestionTap: function (e) {
    var prompt = e.currentTarget.dataset.prompt;
    if (!prompt) return;
    this._sendMessage(prompt);
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
