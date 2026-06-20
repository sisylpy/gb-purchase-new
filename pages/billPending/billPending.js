/**
 * 采购单详情（checkoutConfirm 已含已知价支付，此处仅展示状态；补款另走 paySupplement）
 */
var platformCart = require('../../utils/platformCart');
var platformCartApi = require('../../services/platformCart');
var platformBillUi = require('../../utils/platformBillUi');

function num(v) {
  var n = Number(v);
  return isNaN(n) ? 0 : n;
}

Page({
  data: {
    bill: null,
    billLines: [],
    knownTotal: '0.00',
    paidTotal: '0.00',
    supplementDue: '0.00',
    pendingPriceItemCount: 0,
    supplierName: '',
    billPayState: '',
    statusText: '',
    pendingNotice: '',
    showSupplementBtn: false,
    showMockHint: false
  },

  onLoad: function (options) {
    var bill = wx.getStorageSync('platformLastSubmitBill') || null;
    var outstanding = wx.getStorageSync('platformOutstandingBill') || null;

    if (options && options.from === 'block' && outstanding) {
      bill = this._normalizeOutstanding(outstanding);
    } else if (options && options.billId) {
      if (!(bill && String(bill.billId) === String(options.billId))) {
        if (outstanding && String(outstanding.billId) === String(options.billId)) {
          bill = this._normalizeOutstanding(outstanding);
        }
      }
    }
    if (!bill && outstanding) {
      bill = this._normalizeOutstanding(outstanding);
    }
    this._applyBill(bill);
  },

  _normalizeOutstanding: function (info) {
    var supplementDue = info.supplementDue != null ? info.supplementDue : '0.00';
    return {
      billId: info.billId || info.outstandingBillId,
      billPayState: info.billPayState || info.payStatus,
      payPhase: info.payPhase,
      knownTotal: info.knownTotal || info.knownPayAmount || info.payAmount || '0.00',
      paidTotal: info.paidTotal != null ? info.paidTotal : (info.knownTotal || info.payAmount || '0.00'),
      supplementDue: supplementDue,
      supplierName: info.supplierName,
      pendingPriceItemCount: info.pendingPriceItemCount || info.pendingItemCount || 0,
      lines: info.lines || []
    };
  },

  _formatBillLine: function (line) {
    var pending = line.priceConfirmStatus === 'PENDING';
    return {
      goodsName: line.goodsName || '',
      quantity: line.quantity || '',
      standard: line.standard || '',
      priceConfirmStatus: line.priceConfirmStatus,
      priceText: pending ? '待称重确认' : ('¥' + (line.lineSubtotal || '0.00')),
      assignText: line.assignStatus === 'ASSIGNED' ? '已指定批发商' : '待平台分配批发商'
    };
  },

  _resolvePaidTotal: function (bill) {
    var known = bill.knownTotal || bill.knownPayAmount || '0.00';
    var paid = bill.paidTotal;
    if (paid != null && paid !== '' && num(paid) > 0) {
      return String(paid);
    }
    // checkoutConfirm 语义：已知价已在确认时支付
    return known;
  },

  _applyBill: function (bill) {
    if (!bill) {
      wx.showToast({ title: '暂无采购单信息', icon: 'none' });
      return;
    }
    var knownTotal = bill.knownTotal || bill.knownPayAmount || '0.00';
    var paidTotal = this._resolvePaidTotal(bill);
    var supplementDue = bill.supplementDue != null ? String(bill.supplementDue) : '0.00';
    var pendingCount = bill.pendingPriceItemCount != null
      ? bill.pendingPriceItemCount
      : (bill.pendingItemCount || 0);
    var ui = platformBillUi.buildBillPendingView(bill);
    var lines = (bill.lines || []).map(this._formatBillLine.bind(this));

    this.setData({
      bill: bill,
      billLines: lines,
      knownTotal: knownTotal,
      paidTotal: paidTotal,
      supplementDue: supplementDue,
      pendingPriceItemCount: pendingCount,
      supplierName: bill.supplierName || '',
      billPayState: bill.billPayState || bill.payStatus || '',
      statusText: ui.statusText,
      pendingNotice: ui.pendingNotice,
      showSupplementBtn: num(supplementDue) > 0
    });
  },

  onMockSupplementPay: function () {
    if (!this.data.showSupplementBtn) return;
    var bill = this.data.bill;
    if (!bill || !bill.billId) return;
    var ctx = platformCart.getBuyerContext();
    var that = this;
    platformCartApi.paySupplement({
      billId: bill.billId,
      gbDepartmentId: ctx.gbDepartmentId,
      openId: (wx.getStorageSync('userInfo') || {}).gbDuWxOpenId || 'o-test'
    }).then(function (body) {
      if (body.code !== 0) {
        wx.showToast({ title: body.msg || '创建补款失败', icon: 'none' });
        return;
      }
      var data = body.data || {};
      if (data.mockPay) {
        that.setData({ showMockHint: true });
        wx.showModal({
          title: '测试补款意图',
          content: '补款支付功能即将接入，当前为测试意图。\n\noutTradeNo: ' + (data.outTradeNo || ''),
          showCancel: false,
          confirmText: '知道了'
        });
      }
    });
  },

  onViewFormalOrders: function () {
    wx.setStorageSync('ordersActiveTab', 'formal');
    wx.switchTab({ url: '/pages/orders/orders' });
  }
});
