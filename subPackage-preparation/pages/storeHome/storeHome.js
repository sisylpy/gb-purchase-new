var app = getApp();
var api = require('../../../services/preparation');

Page({
  data: {
    navBarHeight: 0,
    loading: true,
    error: '',
    stats: null,
  },

  onLoad: function () {
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR });
  },

  onShow: function () { this.loadHome(); },

  onPullDownRefresh: function () {
    this.loadHome().then(function () { wx.stopPullDownRefresh(); });
  },

  loadHome: function () {
    var that = this;
    this.setData({ loading: true, error: '' });
    return api.getStorePreparationHome().then(function (row) {
      row = row || {};
      that.setData({ loading: false, stats: row });
    }).catch(function (error) {
      that.setData({ loading: false, error: error.message || '中间料数据加载失败' });
    });
  },

  go: function (event) {
    var target = event.currentTarget.dataset.target;
    var paths = {
      create: '/subPackage-preparation/pages/storeProductForm/storeProductForm',
      products: '/subPackage-preparation/pages/storeProducts/storeProducts',
    };
    if (paths[target]) wx.navigateTo({ url: paths[target] });
  },

  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
