var api = require('../../services/api');
var session = require('../../services/session');
var routes = require('../../utils/routes');
var pageUtil = require('../../utils/page');

Page({
  data: { cart: { groups: [], lineCount: 0, merchantCount: 0, totalAmount: '0.00' }, loading: true, changingId: null },
  onShow: function () { this.load(); },
  load: function () {
    var that = this; that.setData({ loading: true });
    session.requireLogin(function () { return api.cart(); }).then(function (cart) { that.setData({ cart: cart, loading: false }); }).catch(function () { that.setData({ loading: false }); });
  },
  change: function (e) {
    var that = this, line = e.currentTarget.dataset.line, delta = Number(e.currentTarget.dataset.delta), next = pageUtil.quantity(line.quantity) + delta;
    if (that.data.changingId) return;
    if (next <= 0) { that.removeLine(line.cartLineId); return; }
    that.setData({ changingId: line.cartLineId });
    session.requireLogin(function () { return api.putCart(line.goodsId, next, line.remark || ''); }).then(function (cart) { that.setData({ cart: cart, changingId: null }); }).catch(function () { that.setData({ changingId: null }); });
  },
  remove: function (e) { this.removeLine(e.currentTarget.dataset.id); },
  removeLine: function (id) {
    var that = this;
    wx.showModal({ title: '移除商品', content: '确认从购物车移除这件商品吗？', success: function (result) {
      if (!result.confirm) return;
      session.requireLogin(function () { return api.removeCart(id); }).then(function (cart) { that.setData({ cart: cart }); }).catch(function () {});
    }});
  },
  checkout: function () {
    if (!this.data.cart.lineCount) { wx.showToast({ title: '购物车还是空的', icon: 'none' }); return; }
    wx.navigateTo({ url: routes.CHECKOUT });
  },
  goHome: function () { wx.reLaunch({ url: routes.HOME }); }
});
