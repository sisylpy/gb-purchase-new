/**
 * AI 对话页（算账版）— 布局与交互参考 Google Gemini 浅色客户端
 *
 * 接口：
 * - getRecommendedTopics()     GET ai/chat/topics
 * - createConversation(opts)   POST ai/chat/conversation（STORE / GROUP + distributerId）
 * - sendMessage(...)           POST /ai/chat/send（当前默认）
 * - sendMessageStream(...)     POST /ai/chat/stream（保留在 _sendMessageViaStream，未接主路径）
 * - getHistory(...)            GET ai/chat/history/{id}
 * - endConversation(...)       POST ai/chat/end/{id}
 * - getTopicsHistoryByUserId   GET ai/chat/topics/history/{userId}
 * - getTopicMessages(topicId)  GET ai/chat/topic/{topicId}/messages（topicId = conversationId）
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

/**
 * 从登录态解析创建会话参数（单店 STORE / 集团 GROUP）
 * @param {Object} userInfo wx.getStorageSync('userInfo')
 * @param {Object} options 页面 onLoad options（可传 type）
 */
function buildConversationCreateOptions(userInfo, options) {
  options = options || {};
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
  var admin端说明 =
    isGroupManagerApp
      ? '集团管理端(0)'
      : isStoreManagerApp
        ? '门店管理端(11)'
        : isStoreOrderApp
          ? '部门用户端(12)'
          : '未知/其他(' + String(rawAdmin) + ')';

  console.log('[AI对话][范围判定] 原始登录态', {
    gbDuAdmin: userInfo.gbDuAdmin,
    应用端: admin端说明,
    gbDepartmentUserId: userInfo.gbDepartmentUserId,
    gbDuDepartmentId: userInfo.gbDuDepartmentId,
    gbDepartmentId: userInfo.gbDepartmentId,
    departmentId选用原始值: departmentIdRaw,
    gbDuDistributerId: userInfo.gbDuDistributerId,
    disInfoGbDistributerId: disInfo.gbDistributerId,
    distributerId选用原始值: distributerIdRaw,
    解析后: { userId: userId, departmentId: dDep, distributerId: dDis },
  });

  if (!userId) {
    console.log('[AI对话][范围判定] 结果: 无法创建 — 无有效 userId');
    return null;
  }
  
  var typeOpt = options.type;
  if (typeOpt !== undefined && typeOpt !== null && typeOpt !== '') {
    var t = Number(typeOpt);
    typeOpt = isNaN(t) ? undefined : t;
  } else {
    typeOpt = undefined;
  }
  // 未传则按后端约定：0=普通聊天（入口未带 ?type= 时与「算账版」默认一致）
  if (typeOpt === undefined) {
    typeOpt = 0;
  }

  var opts;
  var reason;

  // 集团管理端(0)：全集团 GROUP，必须带 distributerId
  if (isGroupManagerApp) {
    if (!dDis) {
      console.log('[AI对话][范围判定] 结果: 无法创建 — 集团管理端须提供 distributerId(disId)');
      return null;
    }
    reason = '集团 GROUP（集团管理端 gbDuAdmin=0 + distributerId）';
    opts = {
      userId: userId,
      scopeMode: 'GROUP',
      distributerId: dDis,
      type: typeOpt,
    };
  } else if (isStoreManagerApp || isStoreOrderApp) {
    // 门店管理端(11)、部门用户端(12)：单店 STORE，优先 departmentId
    if (dDep) {
      reason =
        '单店 STORE（' +
        (isStoreManagerApp ? '门店管理端(11)' : '部门用户端(12)') +
        '，有 departmentId）';
      opts = {
        userId: userId,
        departmentId: dDep,
        type: typeOpt,
      };
    } else if (dDis) {
      reason =
        '集团 GROUP（' +
        (isStoreManagerApp ? '门店管理端(11)' : '部门用户端(12)') +
        '无 departmentId，仅用 distributerId 兜底）';
      opts = {
        userId: userId,
        scopeMode: 'GROUP',
        distributerId: dDis,
        type: typeOpt,
      };
    } else {
      console.log('[AI对话][范围判定] 结果: 无法创建 — 门店/部门端无有效 departmentId 与 distributerId');
      return null;
    }
  } else if (dDep) {
    // 未知 gbDuAdmin：与旧逻辑兼容，有部门则单店
    reason = '单店 STORE（未知应用端类型，有 departmentId 兜底）';
    opts = {
      userId: userId,
      departmentId: dDep,
      type: typeOpt,
    };
  } else if (dDis) {
    reason = '集团 GROUP（未知应用端类型，仅有 distributerId 兜底）';
    opts = {
      userId: userId,
      scopeMode: 'GROUP',
      distributerId: dDis,
      type: typeOpt,
    };
  } else {
    console.log('[AI对话][范围判定] 结果: 无法创建 — 既无 departmentId 也无 distributerId');
    return null;
  }

  console.log('[AI对话][范围判定] 结果:', reason, '→ 请求参数', opts);
  return opts;
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
    conversationCreateOpts: null,
  },

  onLoad: function (options) {
    var that = this;
    options = options || {};
    var userInfo = wx.getStorageSync('userInfo') || {};
    var departmentId = userInfo.gbDuDepartmentId || userInfo.gbDepartmentId;
    var userId = userInfo.gbDepartmentUserId;
    var createOpts = buildConversationCreateOptions(userInfo, options);
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
      conversationCreateOpts: createOpts,
    });

    that._loadTopics();

    if (createOpts) {
      that._initConversation();
    } else {
      that.setData({ isLoading: false });
      wx.showToast({ title: '未获取到登录或门店信息', icon: 'none' });
    }
  },

  onUnload: function () {
    this._stopAssistantTypewriter();
    if (this._streamScrollTimer) {
      clearTimeout(this._streamScrollTimer);
      this._streamScrollTimer = null;
    }
    if (this._streamCtl && this._streamCtl.abort) {
      this._streamCtl.abort();
      this._streamCtl = null;
    }
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
    var createOpts = that.data.conversationCreateOpts;
    if (!createOpts || !createOpts.userId) {
      that.setData({ isLoading: false });
      wx.showToast({ title: '未获取到登录信息', icon: 'none' });
      return;
    }

    console.log('[AI对话] 创建对话 POST 参数 =', createOpts);

    ai
      .createConversation(createOpts)
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
      var cleaned = aiRichText.stripStreamingQuoteArtifacts(content);
      var trimmed = String(cleaned).trim();
      return {
        id: msg.id || msg.gbAiMessageId,
        role: role,
        content: cleaned,
        time: msg.createTime || msg.gbAiMessageCreateTime || msg.createdAt || '',
        richNodes: role === 'assistant' && trimmed ? aiRichText.markdownToRichHtml(cleaned) : '',
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

  /** 停止模拟打字机（整段 message 场景） */
  _stopAssistantTypewriter: function () {
    if (this._assistantTypewriterTimer) {
      clearTimeout(this._assistantTypewriterTimer);
      this._assistantTypewriterTimer = null;
    }
    this._assistantTypewriterActive = false;
  },

  /**
   * 后端只推 message、不推 delta 时，在前端逐字展示；结束时由 _replaceAiMessage 再套富文本。
   * @param {boolean} plainStream 为 true 时仅更新纯文本（richNodes 置空），减轻 setData+Markdown 压力
   */
  _startAssistantTypewriter: function (msgId, fullRaw, plainStream) {
    var that = this;
    that._stopAssistantTypewriter();
    var full = String(fullRaw == null ? '' : fullRaw);
    if (!full.length) {
      return;
    }
    plainStream = plainStream !== false;
    var i = 0;
    var step = 3;
    var ms = 28;
    that._assistantTypewriterActive = true;

    function stepOnce() {
      if (that._assistantTypewriterTimer) {
        clearTimeout(that._assistantTypewriterTimer);
        that._assistantTypewriterTimer = null;
      }
      if (i >= full.length) {
        that._stopAssistantTypewriter();
        if (String(full).trim()) {
          that._replaceAiMessage(msgId, full);
        }
        return;
      }
      i = Math.min(full.length, i + step);
      that._patchAssistantPlain(msgId, full.slice(0, i), true, plainStream);
      if (i >= full.length) {
        that._stopAssistantTypewriter();
        if (String(full).trim()) {
          that._replaceAiMessage(msgId, full);
        }
        return;
      }
      that._assistantTypewriterTimer = setTimeout(stepOnce, ms);
    }

    stepOnce();
  },

  /**
   * 流式 POST /ai/chat/stream（当前未接主路径，保留便于以后切回）
   */
  _sendMessageViaStream: function (message, aiMsg) {
    var that = this;
    var assistantBuffer = '';
    var flushTimer = null;
    var THROTTLE_MS = 48;
    var streamHadDelta = false;

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
        that._patchAssistantPlain(aiMsg.id, assistantBuffer, true, false);
      }, THROTTLE_MS);
    }

    var streamBody = { message: message };
    var uid = that.data.userId;
    if (uid !== undefined && uid !== null && uid !== '' && Number(uid) > 0) {
      streamBody.userId = Number(uid);
    }

    var handlers = {
      onDelta: function (delta) {
        streamHadDelta = true;
        assistantBuffer += delta || '';
        if (assistantBuffer.length > 0) {
          scheduleFlush();
        }
      },
      onMessage: function (full) {
        assistantBuffer = full || '';
        clearFlushTimer();
        if (streamHadDelta) {
          that._patchAssistantPlain(aiMsg.id, assistantBuffer, true, false);
        } else {
          that._startAssistantTypewriter(aiMsg.id, assistantBuffer, true);
        }
      },
      onDone: function () {
        clearFlushTimer();
        if (that._assistantTypewriterActive) {
          return;
        }
        that._patchAssistantPlain(aiMsg.id, assistantBuffer, false, false);
        var t = (assistantBuffer || '').trim();
        if (!t) {
          var list = that.data.messages || [];
          for (var i = list.length - 1; i >= 0; i--) {
            if (list[i].id === aiMsg.id && list[i].role === 'assistant') {
              t = (list[i].content || '').trim();
              break;
            }
          }
        }
        if (!t) {
          console.warn('[AI对话] onDone 无正文，结束加载态不覆盖');
          var list2 = that.data.messages || [];
          var ix = -1;
          for (var j = 0; j < list2.length; j++) {
            if (list2[j].id === aiMsg.id && list2[j].role === 'assistant') {
              ix = j;
              break;
            }
          }
          if (ix >= 0) {
            var p = {};
            p['messages[' + ix + '].isLoading'] = false;
            that.setData(p);
          }
          return;
        }
        that._replaceAiMessage(aiMsg.id, t);
      },
      onError: function (msg) {
        clearFlushTimer();
        that._stopAssistantTypewriter();
        wx.showToast({ title: msg || '生成失败', icon: 'none' });
      },
    };

    var ctl = ai.sendMessageStream(that.data.conversationId, streamBody, handlers);
    that._streamCtl = ctl;
    ctl.promise
      .then(function () {
        that._streamCtl = null;
      })
      .catch(function (err) {
        that._streamCtl = null;
        that._stopAssistantTypewriter();
        if (err && err.type === 'aborted') {
          return;
        }
        if (err && err.type === 'http' && err.statusCode === 401) {
          return;
        }
        if (err && err.type === 'sse') {
          that._replaceAiMessage(aiMsg.id, err.message || '抱歉，暂时无法回复，请稍后再试。');
          return;
        }
        return ai.sendMessage(that.data.conversationId, { message: message }).then(function (res) {
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
        });
      })
      .catch(function () {
        that._replaceAiMessage(aiMsg.id, '网络异常，请检查网络后重试。');
      })
      .finally(function () {
        that._sending = false;
        that.setData({ isSending: false });
      });

    that._scrollToBottom();
  },

  /**
   * 发送一条用户消息
   * @param {string} [presetText] 若传入则使用该文案发送（子问题一键发送）；否则用输入框内容
   */
  _sendMessage: function (presetText) {
    var that = this;
    that._stopAssistantTypewriter();
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
      },
      function () {
        var sendBody = { message: message };
        var uid = that.data.userId;
        if (uid !== undefined && uid !== null && uid !== '' && Number(uid) > 0) {
          sendBody.userId = Number(uid);
        }

        ai.sendMessage(that.data.conversationId, sendBody)
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

        that._scrollToBottom();

        /* 若改回流式：that._sendMessageViaStream(message, aiMsg); */
      }
    );
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

  _replaceAiMessage: function (msgId, content) {
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
    if (this._streamScrollTimer) {
      clearTimeout(this._streamScrollTimer);
      this._streamScrollTimer = null;
    }
    this.setData(patch);
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
