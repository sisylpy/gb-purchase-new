var api = require('../../services/api');
var session = require('../../services/session');
var routes = require('../../utils/routes');
var pageUtil = require('../../utils/page');

Page({
  data: { merchantId: null, categoryId: null, merchant: {}, goods: [], keyword: '', loading: true, addingId: null },
  onLoad: function (options) { this.setData({ merchantId: Number(options.merchantId), categoryId: options.categoryId ? Number(options.categoryId) : null }); this.load(); },
  load: function () {
    var that = this; that.setData({ loading: true });
    api.merchantGoods(that.data.merchantId, that.data.categoryId, that.data.keyword).then(function (data) { that.setData({ merchant: data.merchant || {}, goods: data.goods || [], loading: false }); }).catch(function (error) { that.setData({ loading: false }); pageUtil.showError(error); });
  },
  back: function () { wx.navigateBack(); },
  inputKeyword: function (e) { this.setData({ keyword: e.detail.value }); },
  search: function () { this.load(); },
  add: function (e) {
    var that = this, goods = e.currentTarget.dataset.item;
    if (that.data.addingId) return;
    that.setData({ addingId: goods.goodsId });
    session.requireLogin(function () { return api.putCart(goods.goodsId, 1, ''); }).then(function () {
      wx.showToast({ title: '已加入统一购物车', icon: 'success' });
    }).catch(function () {}).then(function () { that.setData({ addingId: null }); });
  },
  openCart: function () { wx.navigateTo({ url: routes.CART }); }
});
