var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');

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
      row.todayLossText = util.formatMoney(row.todayRawLossCost, '¥0.00');
      row.monthLossText = util.formatMoney(row.monthRawLossCost, '¥0.00');
      that.setData({ loading: false, stats: row });
    }).catch(function (error) {
      that.setData({ loading: false, error: error.message || '备料数据加载失败' });
    });
  },

  go: function (event) {
    var target = event.currentTarget.dataset.target;
    var paths = {
      create: '/subPackage-preparation/pages/storeProductForm/storeProductForm',
      products: '/subPackage-preparation/pages/storeProducts/storeProducts',
      loss: '/subPackage-preparation/pages/storeLoss/storeLoss',
      records: '/subPackage-preparation/pages/storeLossRecords/storeLossRecords',
    };
    if (paths[target]) wx.navigateTo({ url: paths[target] });
  },

  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
