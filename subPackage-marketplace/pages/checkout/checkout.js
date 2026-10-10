var api = require('../../services/api');
var session = require('../../services/session');
var routes = require('../../utils/routes');
var pageUtil = require('../../utils/page');

function createKey() { return 'wx-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10); }

Page({
  data: { cart: { groups: [], lineCount: 0, merchantCount: 0, totalAmount: '0.00' }, remark: '', submitting: false, idempotencyKey: '' },
  onLoad: function () { this.setData({ idempotencyKey: createKey() }); this.load(); },
  load: function () {
    var that = this;
    session.requireLogin(function () { return api.cart(); }).then(function (cart) {
      if (!cart.lineCount) { wx.showModal({ title: '无法提交', content: '购物车中没有商品', showCancel: false, success: function () { wx.navigateBack(); } }); return; }
      that.setData({ cart: cart });
    }).catch(function () {});
  },
  back: function () { wx.navigateBack(); },
  inputRemark: function (e) { this.setData({ remark: e.detail.value }); },
  submit: function () {
    var that = this;
    if (that.data.submitting || !that.data.cart.lineCount) return;
    var ids = [];
    (that.data.cart.groups || []).forEach(function (group) { (group.lines || []).forEach(function (line) { ids.push(line.cartLineId); }); });
    that.setData({ submitting: true });
    api.submitOrder({ idempotencyKey: that.data.idempotencyKey, cartLineIds: ids, remark: that.data.remark }).then(function (order) {
      wx.showToast({ title: '订单已提交并自动分单', icon: 'success' });
      setTimeout(function () { wx.redirectTo({ url: routes.ORDER_DETAIL + '?orderId=' + order.orderId }); }, 700);
    }).catch(function (error) { that.setData({ submitting: false }); pageUtil.showError(error, '订单提交失败'); });
  }
});
