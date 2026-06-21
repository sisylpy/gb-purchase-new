/**
 * 购物车结算：checkoutPreview → checkoutPay → wx.requestPayment → payment/status → billPending
 * 开发模式保留 checkoutConfirm mock（隐藏入口）
 */
var appConfig = require('../../config/index');
var platformCart = require('../../utils/platformCart');
var platformCartApi = require('../../services/platformCart');

var PAYMENT_POLL_MAX = 12;
var PAYMENT_POLL_INTERVAL_MS = 1500;

Page({
  data: {
    loading: true,
    confirming: false,
    paying: false,
    paymentStatusText: '',
    isDev: appConfig.ENV === 'dev',
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
    var payAmount = data.payAmount || data.knownTotal || '';
    var billId = data.billId || data.outstandingBillId || '';
    var detail = body.msg || body.message || '您有未结清采购单，请先处理';
    if (billId) {
      detail += '\n\n采购单 #' + billId;
    }
    if (payAmount) {
      detail += '\n待支付 ¥' + payAmount;
    }
    detail += '\n\n处理完该单后，才能对新购物车商品 checkoutPay。';
    wx.showModal({
      title: '无法结算',
      content: detail,
      confirmText: '去处理',
      cancelText: '返回',
      success: function (res) {
        if (res.confirm) {
          wx.redirectTo({ url: '/pages/billPending/billPending?from=block&billId=' + billId });
        }
      }
    });
  },

  _buildCheckoutPayload: function (checkoutToken) {
    var ctx = platformCart.getBuyerContext();
    var dateUtil = require('../../utils/dateUtil');
    return {
      marketId: ctx.marketId,
      gbDepartmentId: ctx.gbDepartmentId,
      gbDepartmentFatherId: ctx.gbDepartmentFatherId,
      gbDistributerId: ctx.gbDistributerId,
      gbOrderUserId: ctx.gbOrderUserId,
      deliveryDate: dateUtil.getArriveDate(0),
      remark: '',
      orderIds: this.data.orderIds,
      checkoutToken: checkoutToken,
      openId: ctx.openId || (wx.getStorageSync('userInfo') || {}).gbDuWxOpenId || ''
    };
  },

  _buildBillFromPayData: function (data) {
    return {
      billId: data.billId,
      billTradeNo: data.outTradeNo || data.billTradeNo,
      knownTotal: data.knownTotal || data.payAmount,
      knownPayAmount: data.knownTotal || data.payAmount,
      paidTotal: data.paidTotal != null ? data.paidTotal : (data.knownTotal || data.payAmount),
      pendingPriceItemCount: data.pendingPriceItemCount,
      pendingItemCount: data.pendingPriceItemCount,
      supplementDue: data.supplementDue || '0.00',
      payStatus: data.payStatus || data.billPayStatus,
      billPayState: data.payStatus || data.billPayStatus,
      lines: data.lines || []
    };
  },

  _buildBillFromStatus: function (statusData) {
    return {
      billId: statusData.billId,
      billTradeNo: statusData.outTradeNo,
      knownTotal: statusData.knownTotal,
      knownPayAmount: statusData.knownTotal,
      paidTotal: statusData.knownTotal,
      pendingPriceItemCount: statusData.pendingPriceItemCount,
      pendingItemCount: statusData.pendingPriceItemCount,
      supplementDue: '0.00',
      payStatus: statusData.billPayStatus,
      billPayState: statusData.billPayStatus,
      lines: []
    };
  },

  _gotoBillPending: function (bill) {
    wx.setStorageSync('platformLastSubmitBill', bill);
    platformCart.refreshTabBadgeFromServer();
    wx.setStorageSync('ordersActiveTab', 'formal');
    wx.redirectTo({
      url: '/pages/billPending/billPending?from=checkout&billId=' + bill.billId
    });
  },

  _pollPaymentStatus: function (paymentId, outTradeNo, checkoutToken, attempt) {
    var that = this;
    var ctx = platformCart.getBuyerContext();
    attempt = attempt || 0;

    if (attempt >= PAYMENT_POLL_MAX) {
      that.setData({ confirming: false, paying: false, paymentStatusText: '' });
      wx.showModal({
        title: '支付处理中',
        content: '微信支付已成功，采购单生成中，请稍后在「我的订货」查看或联系客服。',
        showCancel: false,
        confirmText: '返回购物车',
        success: function () {
          wx.switchTab({ url: '/pages/orders/orders' });
        }
      });
      return;
    }

    that.setData({
      paying: true,
      paymentStatusText: '支付处理中（' + (attempt + 1) + '/' + PAYMENT_POLL_MAX + '）...'
    });

    platformCartApi.queryPaymentStatus({
      paymentId: paymentId,
      outTradeNo: outTradeNo,
      checkoutToken: checkoutToken,
      gbDepartmentId: ctx.gbDepartmentId
    }).then(function (body) {
      if (!platformCartApi.isOk(body) || !body.data) {
        setTimeout(function () {
          that._pollPaymentStatus(paymentId, outTradeNo, checkoutToken, attempt + 1);
        }, PAYMENT_POLL_INTERVAL_MS);
        return;
      }
      var statusData = body.data;
      console.log('[checkout] payment/status', statusData);

      if (statusData.status === 'SUCCESS' && statusData.billId) {
        that.setData({ confirming: false, paying: false, paymentStatusText: '' });
        that._gotoBillPending(that._buildBillFromStatus(statusData));
        return;
      }

      if (statusData.status === 'CANCELLED' || statusData.status === 'EXPIRED'
          || statusData.status === 'FAILED') {
        that.setData({ confirming: false, paying: false, paymentStatusText: '' });
        wx.showToast({
          title: statusData.message || '支付未完成，请重新结算',
          icon: 'none'
        });
        return;
      }

      setTimeout(function () {
        that._pollPaymentStatus(paymentId, outTradeNo, checkoutToken, attempt + 1);
      }, PAYMENT_POLL_INTERVAL_MS);
    }).catch(function () {
      setTimeout(function () {
        that._pollPaymentStatus(paymentId, outTradeNo, checkoutToken, attempt + 1);
      }, PAYMENT_POLL_INTERVAL_MS);
    });
  },

  _invokeWxPay: function (payData) {
    var that = this;
    var wxPayParams = payData.wxPayParams || {};
    console.log('[checkout] wx.requestPayment params', wxPayParams);

    if (!wxPayParams.timeStamp || !wxPayParams.nonceStr || !wxPayParams.package || !wxPayParams.paySign) {
      that.setData({ confirming: false, paying: false });
      wx.showToast({ title: '微信支付参数不完整', icon: 'none' });
      that._cancelPayment(payData, '支付参数异常');
      return;
    }

    wx.requestPayment({
      timeStamp: String(wxPayParams.timeStamp),
      nonceStr: wxPayParams.nonceStr,
      package: wxPayParams.package,
      signType: wxPayParams.signType || 'MD5',
      paySign: wxPayParams.paySign,
      success: function () {
        console.log('[checkout] wx.requestPayment success paymentId=', payData.paymentId);
        that._pollPaymentStatus(payData.paymentId, payData.outTradeNo, payData.checkoutToken, 0);
      },
      fail: function (err) {
        console.log('[checkout] wx.requestPayment fail', err);
        var errMsg = (err && err.errMsg) ? err.errMsg : '支付已取消';
        if (errMsg.indexOf('cancel') >= 0 || errMsg.indexOf('取消') >= 0) {
          that._cancelPayment(payData, '支付已取消，可重新结算');
        } else {
          that.setData({ confirming: false, paying: false, paymentStatusText: '' });
          wx.showModal({
            title: '微信支付失败',
            content: errMsg + '\n\n模拟器可能无法调起支付，请用真机调试。',
            showCancel: false
          });
        }
      }
    });
  },

  _cancelPayment: function (payData, toastMsg) {
    var that = this;
    var ctx = platformCart.getBuyerContext();
    platformCartApi.cancelPayment({
      paymentId: payData.paymentId,
      outTradeNo: payData.outTradeNo,
      gbDepartmentId: ctx.gbDepartmentId
    }).then(function (body) {
      console.log('[checkout] payment/cancel result', body);
      that.setData({ confirming: false, paying: false, paymentStatusText: '' });
      if (platformCartApi.isOk(body)) {
        wx.showToast({ title: toastMsg || (body.data && body.data.message) || '支付已取消', icon: 'none' });
      } else {
        wx.showToast({ title: (body && body.msg) || toastMsg || '支付已取消', icon: 'none' });
      }
    }).catch(function () {
      that.setData({ confirming: false, paying: false, paymentStatusText: '' });
      wx.showToast({ title: toastMsg || '支付已取消', icon: 'none' });
    });
  },

  onConfirmCheckout: function () {
    if (this.data.confirming || this.data.paying || !this.data.previewReady) return;

    var ctx = platformCart.getBuyerContext();
    if (!ctx.gbDepartmentId) {
      wx.showToast({ title: '请先登录并选择饭店', icon: 'none' });
      return;
    }
    if (!ctx.openId) {
      wx.showToast({ title: '未获取到微信 openId，请重新登录', icon: 'none' });
      return;
    }
    if (Number(this.data.payAmount) <= 0) {
      wx.showToast({ title: '本次应付金额须大于 0', icon: 'none' });
      return;
    }

    var checkoutToken = platformCart.genUuid();
    var payload = this._buildCheckoutPayload(checkoutToken);
    var that = this;

    this.setData({ confirming: true, paymentStatusText: '创建支付...' });
    platformCartApi.checkoutPay(payload).then(function (body) {
      if (body.code === 4001) {
        that.setData({ confirming: false, paymentStatusText: '' });
        that._handleBlocked(body);
        return;
      }
      if (!platformCartApi.isOk(body) || !body.data) {
        that.setData({ confirming: false, paymentStatusText: '' });
        console.error('[checkout] checkoutPay failed', body);
        wx.showModal({
          title: '创建支付失败',
          content: (body && (body.msg || body.message)) || '请查看控制台或后端日志',
          showCancel: false
        });
        return;
      }

      var data = body.data;
      console.log('[checkout] checkoutPay response', data);

      if (data.billId) {
        that.setData({ confirming: false, paymentStatusText: '' });
        that._gotoBillPending(that._buildBillFromPayData(data));
        return;
      }

      var payMeta = {
        paymentId: data.paymentId,
        outTradeNo: data.outTradeNo,
        checkoutToken: data.checkoutToken || checkoutToken
      };
      that.setData({ paymentStatusText: '调起微信支付...' });
      that._invokeWxPay(Object.assign({}, data, payMeta));
    }).catch(function (err) {
      console.error('[checkout] checkoutPay error', err);
      that.setData({ confirming: false, paymentStatusText: '' });
      wx.showModal({
        title: '创建支付失败',
        content: '网络异常或后端未响应，请确认 Tomcat 已重启',
        showCancel: false
      });
    });
  },

  /** 开发模式：跳过微信，直接 mock checkoutConfirm */
  onMockConfirmCheckout: function () {
    if (!this.data.isDev || this.data.confirming) return;
    var ctx = platformCart.getBuyerContext();
    if (!ctx.gbDepartmentId) {
      wx.showToast({ title: '请先登录并选择饭店', icon: 'none' });
      return;
    }
    var payload = this._buildCheckoutPayload(platformCart.genUuid());
    delete payload.openId;

    var that = this;
    this.setData({ confirming: true });
    platformCartApi.checkoutConfirm(payload).then(function (body) {
      that.setData({ confirming: false });
      if (body.code === 4001) {
        that._handleBlocked(body);
        return;
      }
      if (!platformCartApi.isOk(body)) {
        wx.showToast({ title: body.msg || 'mock 结算失败', icon: 'none' });
        return;
      }
      var bill = that._buildBillFromPayData(body.data || {});
      wx.setStorageSync('platformLastSubmitBill', bill);
      platformCart.refreshTabBadgeFromServer();
      wx.showModal({
        title: 'Mock 结算成功',
        content: 'billId=' + bill.billId + '（仅开发模式）',
        showCancel: false,
        success: function () {
          that._gotoBillPending(bill);
        }
      });
    }).catch(function () {
      that.setData({ confirming: false });
      wx.showToast({ title: 'mock 结算失败', icon: 'none' });
    });
  }
});
