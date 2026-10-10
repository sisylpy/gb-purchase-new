var api = require('../../services/api');
var routes = require('../../utils/routes');
var pageUtil = require('../../utils/page');

Page({
  data: { categoryId: null, categoryName: '', keyword: '', merchants: [], loading: true },
  onLoad: function (options) {
    this.setData({ categoryId: options.categoryId ? Number(options.categoryId) : null, categoryName: decodeURIComponent(options.categoryName || ''), keyword: decodeURIComponent(options.keyword || '') });
    this.load();
  },
  load: function () {
    var that = this;
    that.setData({ loading: true });
    api.merchants(that.data.categoryId, that.data.keyword).then(function (rows) { that.setData({ merchants: rows || [], loading: false }); }).catch(function (error) { that.setData({ loading: false }); pageUtil.showError(error); });
  },
  back: function () { wx.navigateBack(); },
  inputKeyword: function (e) { this.setData({ keyword: e.detail.value }); },
  search: function () { this.load(); },
  openMerchant: function (e) {
    wx.navigateTo({ url: routes.MERCHANT + '?merchantId=' + e.currentTarget.dataset.item.merchantId + (this.data.categoryId ? '&categoryId=' + this.data.categoryId : '') });
  }
});
