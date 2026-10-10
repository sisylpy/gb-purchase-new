var api = require('../../services/api');
var routes = require('../../utils/routes');
var pageUtil = require('../../utils/page');

Page({
  data: { loading: true, market: {}, categories: [], merchants: [], notice: '', keyword: '', cartCount: 0 },
  onLoad: function () { this.load(); },
  onShow: function () { this.refreshCartCount(); },
  load: function () {
    var that = this;
    api.home().then(function (data) {
      var categories = (data.categories || []).map(function (item) {
        item.initial = (item.categoryName || '类').charAt(0);
        return item;
      });
      that.setData({ loading: false, market: data.market || {}, categories: categories, merchants: data.recommendedMerchants || [], notice: data.notice || '' });
      if (data.market && data.market.marketId) wx.setStorageSync('marketplaceMarketId', data.market.marketId);
    }).catch(function (error) { that.setData({ loading: false }); pageUtil.showError(error, '市场信息加载失败'); });
  },
  refreshCartCount: function () {
    if (!wx.getStorageSync('marketplaceResidentToken')) return;
    var that = this;
    api.cart().then(function (cart) { that.setData({ cartCount: cart.lineCount || 0 }); }).catch(function () {});
  },
  inputKeyword: function (e) { this.setData({ keyword: e.detail.value }); },
  search: function () { wx.navigateTo({ url: routes.MERCHANT_LIST + '?keyword=' + encodeURIComponent(this.data.keyword || '') }); },
  openCategory: function (e) {
    var item = e.currentTarget.dataset.item;
    wx.navigateTo({ url: routes.MERCHANT_LIST + '?categoryId=' + item.categoryId + '&categoryName=' + encodeURIComponent(item.categoryName) });
  },
  openMerchant: function (e) {
    var item = e.currentTarget.dataset.item;
    wx.navigateTo({ url: routes.MERCHANT + '?merchantId=' + item.merchantId });
  }
});
