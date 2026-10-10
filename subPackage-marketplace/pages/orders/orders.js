var api = require('../../services/api');
var session = require('../../services/session');
var routes = require('../../utils/routes');
var pageUtil = require('../../utils/page');

Page({
  data: { orders: [], loading: true },
  onShow: function () { this.load(); },
  load: function () {
    var that = this; that.setData({ loading: true });
    session.requireLogin(function () { return api.orders(); }).then(function (rows) {
      rows = (rows || []).map(function (item) { item.statusText = pageUtil.orderStatus(item.orderStatus); return item; });
      that.setData({ orders: rows, loading: false });
    }).catch(function () { that.setData({ loading: false }); });
  },
  open: function (e) { wx.navigateTo({ url: routes.ORDER_DETAIL + '?orderId=' + e.currentTarget.dataset.id }); },
  goHome: function () { wx.reLaunch({ url: routes.HOME }); }
});
