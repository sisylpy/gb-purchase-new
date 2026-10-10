var api = require('../../services/api');
var session = require('../../services/session');
var pageUtil = require('../../utils/page');

Page({
  data: { orderId: null, order: {}, loading: true },
  onLoad: function (options) { this.setData({ orderId: Number(options.orderId) }); this.load(); },
  load: function () {
    var that = this;
    session.requireLogin(function () { return api.orderDetail(that.data.orderId); }).then(function (order) {
      order.statusText = pageUtil.orderStatus(order.orderStatus);
      (order.merchantOrders || []).forEach(function (child) { child.statusText = pageUtil.orderStatus(child.fulfillmentStatus); });
      that.setData({ order: order, loading: false });
    }).catch(function () { that.setData({ loading: false }); });
  },
  back: function () { wx.navigateBack({ fail: function () { wx.reLaunch({ url: '/subPackage-marketplace/pages/orders/orders' }); } }); }
});
