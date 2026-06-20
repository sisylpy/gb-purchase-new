/**
 * 购物车结算：checkoutPreview → checkoutConfirm → billPending
 */
var platformCart = require('../../utils/platformCart');
var platformCartApi = require('../../services/platformCart');
var platformBillUi = require('../../utils/platformBillUi');

Page({
  data: {
    loading: true,
    confirming: false,
    orderIds: [],
    confirmedLines: [],
    pendingPriceLines: [],
    knownTotal: '0.00',
    pendingPriceItemCount: 0,
    payAmount: '0.00',
    notice: '',
    previewReady: false
  },

  onLoad: function (options) {
    var ids = [];
    try {
      ids = JSON.parse(decodeURIComponent(options.orderIds || '[]'));
    } catch (e) {
      ids = [];
    }
    if (!ids.length) {
      wx.showToast({ title: '未选择商品', icon: 'none' });
      setTimeout(function () { wx.navigateBack(); }, 800);
      return;
    }
    this.setData({ orderIds: ids });
    this._loadPreview(ids);
  },

  _loadPreview: function (orderIds) {
    var that = this;
    this.setData({ loading: true });
    platformCartApi.checkoutPreview(orderIds).then(function (body) {
      if (!platformCartApi.isOk(body) || !body.data) {
        wx.showToast({ title: (body && body.msg) || '结算预览失败', icon: 'none' });
        that.setData({ loading: false });
        return;
      }
      var data = body.data;
      that.setData({
        loading: false,
        previewReady: true,
        confirmedLines: (data.confirmedLines || []).map(platformCart.formatCartLine),
        pendingPriceLines: (data.pendingPriceLines || []).map(platformCart.formatCartLine),
        knownTotal: data.knownTotal || '0.00',
        pendingPriceItemCount: data.pendingPriceItemCount || 0,
        payAmount: data.payAmount || data.knownTotal || '0.00',
        notice: data.notice || '部分商品需称重确认，后续可能产生补款'
      });
    }).catch(function () {
      that.setData({ loading: false });
      wx.showToast({ title: '结算预览失败', icon: 'none' });
    });
  },

  _handleBlocked: function (body) {
    var data = body.data || {};
    wx.setStorageSync('platformOutstandingBill', data);
    wx.showModal({
      title: '无法结算',
      content: body.msg || body.message || '您有未结清采购单，请先处理',
      confirmText: '去处理',
      cancelText: '返回',
      success: function (res) {
        if (res.confirm) {
          wx.redirectTo({ url: '/pages/billPending/billPending?from=block' });
        }
      }
    });
  },

  onConfirmCheckout: function () {
    if (this.data.confirming || !this.data.previewReady) return;
    var ctx = platformCart.getBuyerContext();
    if (!ctx.gbDepartmentId) {
      wx.showToast({ title: '请先登录并选择饭店', icon: 'none' });
      return;
    }
    var dateUtil = require('../../utils/dateUtil');
    var payload = {
      marketId: ctx.marketId,
      gbDepartmentId: ctx.gbDepartmentId,
      gbDepartmentFatherId: ctx.gbDepartmentFatherId,
      gbDistributerId: ctx.gbDistributerId,
      gbOrderUserId: ctx.gbOrderUserId,
      deliveryDate: dateUtil.getArriveDate(0),
      remark: '',
      orderIds: this.data.orderIds,
      checkoutToken: platformCart.genUuid()
    };

    var that = this;
    this.setData({ confirming: true });
    platformCartApi.checkoutConfirm(payload).then(function (body) {
      that.setData({ confirming: false });
      if (body.code === 4001) {
        that._handleBlocked(body);
        return;
      }
      if (!platformCartApi.isOk(body)) {
        wx.showToast({ title: body.msg || '结算失败', icon: 'none' });
        return;
      }
      var data = body.data || {};
      var bill = {
        billId: data.billId,
        billTradeNo: data.billTradeNo,
        knownTotal: data.knownTotal,
        knownPayAmount: data.knownTotal,
        paidTotal: data.paidTotal,
        pendingPriceItemCount: data.pendingPriceItemCount,
        pendingItemCount: data.pendingPriceItemCount,
        supplementDue: data.supplementDue,
        payStatus: data.payStatus,
        billPayState: data.payStatus,
        lines: data.lines || []
      };
      wx.setStorageSync('platformLastSubmitBill', bill);
      platformCart.refreshTabBadgeFromServer();

      var ui = platformBillUi.buildCheckoutConfirmContent(bill);
      wx.showModal({
        title: ui.title,
        content: ui.content,
        confirmText: ui.payLabel || '查看采购单',
        cancelText: '返回购物车',
        success: function (res) {
          if (res.confirm) {
            wx.setStorageSync('ordersActiveTab', 'formal');
            wx.redirectTo({
              url: '/pages/billPending/billPending?from=checkout&billId=' + bill.billId
            });
          } else {
            wx.switchTab({ url: '/pages/orders/orders' });
          }
        }
      });
    }).catch(function () {
      that.setData({ confirming: false });
      wx.showToast({ title: '结算失败', icon: 'none' });
    });
  }
});
