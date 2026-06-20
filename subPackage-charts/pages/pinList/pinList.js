/**
 * 我的图钉 - 用户所有图钉列表页面
 *
 * API：
 * - listMyPins({ page, pageSize })  GET /ai/work-pins/mine
 * - deletePin(pinId, userId)         DELETE /ai/work-pins/{pinId}?userId=
 *
 * 返回字段：pinId / conversationId / conversationTitle / messageId / runId /
 *           sourceType / title / preview / primaryCardType / cardCount / hasCards / createdAt
 */

var ai = require('../../services/api');

var PAGE_SIZE = 20;

Page({
  data: {
    pins: [],
    loading: false,
    refreshing: false,
    loadingMore: false,
    page: 1,
    total: 0,
    hasMore: false,
    navBarHeight: 0,
    userId: 0,
    departmentId: 0,
    distributerId: 0,
  },

  onLoad: function () {
    // 从 storage 读取用户信息（与 workRecord 一致的取法）
    var userInfo = wx.getStorageSync('userInfo') || {};
    var disInfo = wx.getStorageSync('disInfo') || {};
    var mendianInfo = wx.getStorageSync('mendianInfo') || {};

    var userId = userInfo.gbDepartmentUserId || 0;
    var departmentId = userInfo.gbDuDepartmentId || userInfo.gbDepartmentId || mendianInfo.gbDepartmentId || 0;
    var distributerId = userInfo.gbDuDistributerId || disInfo.gbDistributerId || 0;


    this.setData({
      navBarHeight: getApp().globalData.navBarHeight,
      userId: userId,
      departmentId: departmentId,
      distributerId: distributerId,
    });
    this.loadPins();
  },

  onShow: function () {
    // 每次返回该页时刷新首页
    this.loadPins(true);
  },

  // ========== 加载图钉列表 ==========

  /**
   * @param {boolean} reset - 是否重置分页（首页加载 / 下拉刷新）
   */
  loadPins: function (reset) {
    var that = this;
    var userId = that.data.userId;

    if (reset) {
      that.setData({ page: 1, loading: true, refreshing: false });
    }


    if (!userId) {
      console.warn('[图钉列表] loadPins 跳过: 无有效 userId');
      that.setData({ loading: false, refreshing: false });
      return;
    }

    if (!reset && !that.data.loading) {
      that.setData({ loading: true });
    }

    var params = {
      userId: userId,
      page: that.data.page,
      pageSize: PAGE_SIZE,
    };

    // 可选筛选参数
    if (that.data.departmentId) {
      params.departmentId = that.data.departmentId;
    }
    if (that.data.distributerId) {
      params.distributerId = that.data.distributerId;
    }

    ai.listMyPins(params)
      .then(function (res) {

        // 后端 R 包装：res.result = { code, data } → 解包取 data
        var result = res.result || {};
        var body = result.data || result;

        // 解析分页响应: { total, page, pageSize, items }
        var items = [];
        var total = 0;
        var page = that.data.page;

        if (body && Array.isArray(body.items)) {
          items = body.items;
          total = Number(body.total) || 0;
          page = Number(body.page) || page;
        } else if (Array.isArray(body)) {
          // 裸数组兜底
          items = body;
          total = items.length;
        }


        // 映射字段
        var pins = items.map(function (item) {
          return that._mapPinItem(item);
        }).filter(Boolean);


        // 合并或替换列表
        var finalPins;
        if (page === 1) {
          finalPins = pins;
        } else {
          finalPins = that.data.pins.concat(pins);
        }

        var hasMore = finalPins.length < total;

        that.setData({
          pins: finalPins,
          page: page,
          total: total,
          hasMore: hasMore,
          loading: false,
          refreshing: false,
          loadingMore: false,
        });

      })
      .catch(function (err) {
        console.error('[图钉列表] 加载失败', err);
        console.error('[图钉列表] 错误详情: status=' + (err && err.status) + ', message=' + (err && err.message));
        that.setData({
          loading: false,
          refreshing: false,
          loadingMore: false,
        });
        wx.showToast({ title: '加载图钉列表失败', icon: 'none' });
      });
  },

  // ========== 下拉刷新 ==========

  onRefresh: function () {
    this.setData({ refreshing: true, page: 1 });
    this.loadPins(true);
  },

  // ========== 上拉加载更多 ==========

  onScrollToLower: function () {
    var that = this;
    if (that.data.loadingMore || !that.data.hasMore || that.data.loading) return;

    that.setData({
      loadingMore: true,
      page: that.data.page + 1,
    });
    that.loadPins(false);
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

  // ========== 映射后端 DTO → 前端展示 Pin ==========
  // 接口返回字段：pinId, conversationId, conversationTitle, messageId,
  //               runId, sourceType, title, preview, primaryCardType, cardCount, hasCards, createdAt

  _mapPinItem: function (row) {
    if (!row || typeof row !== 'object') return null;

    var pinId = row.pinId != null ? Number(row.pinId) : NaN;
    if (!isFinite(pinId)) return null;

    var createdAt = row.createdAt || '';

    // 直接透传接口原始字段，不做转换和丢弃
    // 接口字段：pinId, conversationId, conversationTitle, messageId, runId,
    //          sourceType, title, preview, primaryCardType, cardCount, hasCards, createdAt
    return {
      pinId: pinId,
      conversationId: row.conversationId,
      conversationTitle: row.conversationTitle || '',
      messageId: row.messageId,
      runId: row.runId,
      sourceType: row.sourceType || '',
      title: row.title || '',
      preview: row.preview || '',
      primaryCardType: row.primaryCardType || '',
      cardCount: row.cardCount,
      hasCards: row.hasCards,
      createdAt: createdAt,
      // 仅添加展示用的计算字段
      _timeLabel: this._formatTime(createdAt),
      _sortTime: createdAt ? new Date(createdAt).getTime() : 0,
      _displayTitle: row.title || row.conversationTitle || row.preview || '未命名图钉',
    };
  },

  // ========== 查看图钉（跳转到图钉详情页） ==========

  onViewPin: function (e) {
    var pinId = e.currentTarget.dataset.pinId;
    if (!pinId) return;

    wx.navigateTo({
      url: '/subPackage-charts/pages/pinDetail/pinDetail?pinId=' + pinId,
    });
  },

  // ========== 更多操作菜单 ==========

  onMoreTap: function (e) {
    var that = this;
    var pinId = e.currentTarget.dataset.pinId;

    if (!pinId) return;

    wx.showActionSheet({
      itemList: ['删除图钉'],
      itemColor: '#fa5151',
      success: function (res) {
        if (res.tapIndex === 0) {
          that._confirmDeletePin(pinId);
        }
      },
    });
  },

  // ========== 删除图钉 ==========

  _confirmDeletePin: function (pinId) {
    var that = this;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该图钉吗？',
      confirmText: '删除',
      confirmColor: '#fa5151',
      success: function (modalRes) {
        if (modalRes.confirm) {
          that._doDeletePin(pinId);
        }
      },
    });
  },

  _doDeletePin: function (pinId) {
    var that = this;
    var userId = that.data.userId;
    if (!userId) {
      wx.showToast({ title: '未获取到登录信息', icon: 'none' });
      console.warn('[图钉列表] 删除跳过: 无有效 userId');
      return;
    }

    wx.showLoading({ title: '删除中…', mask: true });

    ai.deletePin(pinId, userId)
      .then(function (res) {
        wx.hideLoading();
        wx.showToast({ title: '已删除', icon: 'success', duration: 1500 });

        // 从列表中移除，并更新 total
        var pins = that.data.pins.filter(function (p) {
          return p.pinId !== pinId;
        });
        that.setData({
          pins: pins,
          total: Math.max(0, (that.data.total || 1) - 1),
        });
      })
      .catch(function (err) {
        wx.hideLoading();
        console.error('[图钉列表] 删除失败, pinId=' + pinId, err);
        var errMsg = '删除失败';
        if (err && err.message) errMsg = err.message;
        else if (err && err.data && err.data.message) errMsg = err.data.message;
        wx.showToast({ title: errMsg, icon: 'none', duration: 2500 });
      });
  },

  // ========== 返回 ==========

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  },
});
