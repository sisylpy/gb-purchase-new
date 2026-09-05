/**
 * 图钉详情页 — 展示完整的图钉快照内容
 *
 * API：
 * - getPinDetail(pinId, userId)  GET /ai/work-pins/{pinId}?userId=
 * - deletePin(pinId, userId)      DELETE /ai/work-pins/{pinId}?userId=
 *
 * 返回字段：pinId / title / sourceTextSnapshot / sourceAnswerPreview /
 *           cards / cardsSnapshotJson / primaryCardType / cardCount /
 *           conversationId / messageId / runId / createdAt
 */
var ai = require('../../services/api');
var cardNormalizer = require('../../utils/cardNormalizer');

Page({
  data: {
    navBarHeight: 0,
    userId: 0,
    pinId: null,
    loading: false,
    error: '',
    // 详情数据
    title: '',
    sourceText: '',
    sourceAnswerPreview: '',
    cards: [],
    conversationId: null,
    messageId: null,
    runId: null,
    createdAt: '',
    _timeLabel: '',
    // 删除中防重复
    _deleting: false,
  },

  onLoad: function (options) {
    var that = this;
    options = options || {};
    var pinId = options.pinId ? Number(options.pinId) : null;

    var userInfo = wx.getStorageSync('userInfo') || {};
    var userId = userInfo.gbDepartmentUserId || 0;

    console.log('[图钉详情] onLoad pinId=' + pinId + ', userId=' + userId);

    that.setData({
      navBarHeight: getApp().globalData.navBarHeight || 88,
      userId: userId,
      pinId: pinId,
    });

    if (!pinId) {
      that.setData({ error: '缺少图钉 ID' });
      return;
    }
    if (!userId) {
      that.setData({ error: '未获取到登录信息' });
      return;
    }

    that._loadDetail();
  },

  // ========== 加载详情 ==========

  _loadDetail: function () {
    var that = this;
    var pinId = that.data.pinId;
    var userId = that.data.userId;

    that.setData({ loading: true, error: '' });

    console.log('[图钉详情] 请求 getPinDetail, pinId=' + pinId + ', userId=' + userId);
    ai.getPinDetail(pinId, userId)
      .then(function (res) {
        console.log('[图钉详情] getPinDetail 原始返回', JSON.stringify(res));

        var result = res.result || {};
        var data = result.data || result;

        // 业务错误
        if (result.code !== undefined && result.code !== 0 && result.code !== '0') {
          var errMsg = result.msg || result.message || '图钉内容加载失败';
          that.setData({ loading: false, error: errMsg });
          wx.showToast({ title: errMsg, icon: 'none' });
          return;
        }

        var title = data.title || '';
        var sourceText = data.sourceTextSnapshot || '';
        var sourceAnswerPreview = data.sourceAnswerPreview || '';
        var rawCards = data.cards || [];
        var conversationId = data.conversationId || null;
        var messageId = data.messageId || null;
        var runId = data.runId || null;
        var createdAt = data.createdAt || '';

        // ====== 图钉调试日志：详情原始数据 ======
        console.log('@@[PIN_DEBUG] pinDetail 原始返回数据', JSON.stringify({
          pinId: pinId,
          title: title,
          cardCount: data.cardCount,
          cardsRawLength: rawCards.length,
          cardsRawTypes: rawCards.map(function(c) { return c.cardType || '?'; }),
          cardsRawTitles: rawCards.map(function(c) { return c.title || ''; }),
          cardsRawInstanceIds: rawCards.map(function(c) { return c.cardInstanceId || '(missing)'; }),
          sourceType: data.sourceType,
          pinScope: data.pinScope || '(missing)',
          conversationId: conversationId,
          messageId: messageId,
          allDataKeys: Object.keys(data),
        }));

        // 标准化 cards（复用聊天页面的卡片解析逻辑）
        var cards = cardNormalizer.normalizeCards(rawCards) || [];

        console.log('[图钉详情] 解析完成', {
          title: title,
          sourceTextLen: sourceText.length,
          cardsLen: cards.length,
          conversationId: conversationId,
        });

        that.setData({
          loading: false,
          title: title,
          sourceText: sourceText,
          sourceAnswerPreview: sourceAnswerPreview,
          cards: cards,
          conversationId: conversationId,
          messageId: messageId,
          runId: runId,
          createdAt: createdAt,
          _timeLabel: that._formatTime(createdAt),
        });
      })
      .catch(function (err) {
        console.error('[图钉详情] 加载失败', err);
        that.setData({ loading: false, error: '图钉内容加载失败' });
        wx.showToast({ title: '图钉内容加载失败', icon: 'none' });
      });
  },

  // ========== 格式化时间 ==========

  _formatTime: function (iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var now = new Date();
    var diff = now.getTime() - d.getTime();
    var minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return minutes + '分钟前';
    var hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + '小时前';
    var days = Math.floor(hours / 24);
    if (days < 7) return days + '天前';
    var year = d.getFullYear();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  },

  // ========== 查看原对话 ==========

  onViewConversation: function () {
    var conversationId = this.data.conversationId;
    if (!conversationId) {
      wx.showToast({ title: '来源对话信息缺失', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/subPackage-charts/pages/aiChat/aiChat?loadConversationId=' + conversationId,
    });
  },

  // ========== 删除图钉 ==========

  onDeletePin: function () {
    var that = this;
    var pinId = that.data.pinId;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除该图钉吗？',
      confirmText: '删除',
      confirmColor: '#fa5151',
      success: function (modalRes) {
        if (modalRes.confirm) {
          that._doDelete();
        }
      },
    });
  },

  _doDelete: function () {
    var that = this;
    var pinId = that.data.pinId;
    var userId = that.data.userId;

    if (that.data._deleting) return;
    if (!pinId || !userId) {
      wx.showToast({ title: '参数缺失', icon: 'none' });
      return;
    }

    that.data._deleting = true;
    wx.showLoading({ title: '删除中…', mask: true });

    console.log('[图钉详情] 删除 pinId=' + pinId + ', userId=' + userId);
    ai.deletePin(pinId, userId)
      .then(function (res) {
        console.log('[图钉详情] 删除成功', JSON.stringify(res));
        wx.hideLoading();
        wx.showToast({ title: '已删除', icon: 'success', duration: 1500 });
        // 延迟返回上一页，让 toast 显示
        setTimeout(function () {
          wx.navigateBack({ delta: 1 });
        }, 1500);
      })
      .catch(function (err) {
        wx.hideLoading();
        that.data._deleting = false;
        var errMsg = '删除失败';
        if (err && err.message) errMsg = err.message;
        else if (err && err.data && err.data.message) errMsg = err.data.message;
        console.error('[图钉详情] 删除失败', err);
        wx.showToast({ title: errMsg, icon: 'none', duration: 2500 });
      });
  },

  // ========== 返回 ==========

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  },
});
