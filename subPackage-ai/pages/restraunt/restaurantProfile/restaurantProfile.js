/**
 * 餐厅经营看板
 *
 * 接口: getRevenueStats(departmentId)
 * setData({ profile, dashboard, stats }) 与接口字段一致；
 * 页面展示以 dashboard 分模块为主，WXML 直接绑定路径，不在此拼装业务对象。
 */

var ai = require('../../../services/api');

Page({

  data: {
    navBarHeight: 0,
    isLoading: true,
    hasData: false,
    errorMsg: '',
    departmentId: 0,

    profile: null,
    dashboard: null,
    stats: null,

    animReady: false,
  },

  onLoad: function () {
    var globalData = getApp().globalData;
    var navBarHeight = globalData.statusBarHeight + (globalData.menuButtonInfo.height + (globalData.menuButtonInfo.top - globalData.statusBarHeight) * 2);

    this.setData({
      navBarHeight: navBarHeight * globalData.rpxR,
    });

    var mendianInfo = wx.getStorageSync('mendianInfo');
    if (mendianInfo) {
      this.setData({ departmentId: mendianInfo.gbDepartmentId });
      this.loadData();
    } else {
      var userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        this.setData({ departmentId: userInfo.gbDuDepartmentId || userInfo.gbDepartmentId });
        this.loadData();
      } else {
        this.setData({ isLoading: false, errorMsg: '无法获取门店信息' });
      }
    }
  },

  onShow: function () {
    if (this.data.departmentId > 0) {
      this.loadData();
    }
  },

  loadData: function () {
    var that = this;
    this.setData({ isLoading: true });

    ai.getRevenueStats(this.data.departmentId)
      .then(function (res) {
        var r = res.result || {};
        var ok = r.code == 0 && (r.stats != null || r.dashboard != null);
        if (!ok) {
          that.setData({
            isLoading: false,
            hasData: false,
            errorMsg: r.msg || '暂无数据',
            profile: null,
            dashboard: null,
            stats: null,
          });
          return;
        }

        that.setData({
          profile: r.profile || null,
          dashboard: r.dashboard || null,
          stats: r.stats || null,
          hasData: true,
          isLoading: false,
        });

        setTimeout(function () {
          that.setData({ animReady: true });
        }, 300);
      })
      .catch(function () {
        that.setData({ isLoading: false, errorMsg: '加载失败' });
      });
  },

  toEditProfile: function () {
    wx.navigateTo({
      url: '/subPackage-ai/pages/restraunt/restaurantEdit/restaurantEdit',
    });
  },

  toAiChat: function () {
    wx.navigateTo({
      url: '/subPackage-ai/pages/ai/aiChat/aiChat',
    });
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  },
});
