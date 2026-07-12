var load = require('../../../lib/load.js');
const globalData = getApp().globalData;
import apiUrl from '../../../config/index.js';

import {
  getDisPurchaseGoodsBatchGb,
  sellUserReadDisBatchGb,
  sellerReceiveReturnBill,
} from '../../../services/depOrder';

import dateUtil from '../../../lib/dateUtil.js';
const { SUPPLIER_SUBSCRIBE_TMPL_IDS } = require('../../../lib/subscribeTemplates.js');

Page({

  onShow() {
    this._updateLayoutMetrics(getApp().globalData);
  },

  _updateLayoutMetrics(globalData) {
    globalData = globalData || getApp().globalData;
    var windowWidth = globalData.windowWidth * globalData.rpxR;
    var windowHeight = globalData.windowHeight * globalData.rpxR;
    var statusBarHeight = globalData.statusBarHeight * globalData.rpxR;
    this.setData({
      windowWidth: windowWidth,
      windowHeight: windowHeight,
      statusBarHeight: statusBarHeight,
    });
  },

  data: {
    isTishi: false,
    billCancle: false,
    retName: '',
    batchId: null,
    batch: null,
    batchStatus: null,
    returnTotal: '0.00',
    from: '',
    url: '',
    todayDate: '',
    jrdhUserInfo: null,
  },

  onLoad: function (options) {
    this._updateLayoutMetrics(globalData);
    this.setData({
      url: apiUrl.server,
      todayDate: dateUtil.getWhichOnlyDate(0),
      batchId: options.batchId,
      retName: options.retName || '',
      from: options.from || '',
    });

    if (options.from === 'notification') {
      console.log('[订阅通知落地] gbOrderBatchReturn', {
        batchId: options.batchId,
        retName: options.retName,
        from: options.from,
      });
    }

    var jrdhUserInfo = wx.getStorageSync('jrdhUserInfo');
    if (jrdhUserInfo) {
      this.setData({ jrdhUserInfo: jrdhUserInfo });
    }
    this._getInitData();
  },

  _returnSubtotalFromBatch(batch) {
    if (!batch) {
      return 0;
    }
    if (batch.gbDpbSubtotal !== null && batch.gbDpbSubtotal !== undefined && batch.gbDpbSubtotal !== '') {
      var batchTotal = Number(batch.gbDpbSubtotal);
      if (!isNaN(batchTotal) && batchTotal > 0) {
        return Math.round(batchTotal * 100) / 100;
      }
    }
    var sum = 0;
    var list = batch.gbDPGEntities || [];
    for (var i = 0; i < list.length; i++) {
      var st = list[i].gbDpgBuySubtotal;
      if (st !== null && st !== undefined && st !== '' && !isNaN(Number(st))) {
        sum += Number(st);
      }
    }
    return Math.round(sum * 100) / 100;
  },

  _applyBatchData(batch) {
    var returnTotal = this._returnSubtotalFromBatch(batch);
    this.setData({
      batch: batch,
      batchStatus: batch.gbDpbStatus,
      disId: batch.gbDpbDistributerId,
      returnTotal: returnTotal.toFixed(2),
    });
  },

  _getInitData() {
    var that = this;
    load.showLoading('获取退货商品');
    getDisPurchaseGoodsBatchGb(this.data.batchId)
      .then(function (res) {
        load.hideLoading();
        if (res.result.code == 0) {
          that._applyBatchData(res.result.data);
          if (res.result.data.gbDpbStatus == -1) {
            that._shareUserRead();
          }
        } else {
          that.setData({ billCancle: true });
          wx.showToast({
            title: '退货已取消，3秒后跳转...',
            icon: 'none',
            duration: 3000,
          });
          setTimeout(function () {
            wx.redirectTo({
              url: '../jinriListWithLogin/jinriListWithLogin',
            });
          }, 3000);
        }
      });
  },

  _shareUserRead() {
    var that = this;
    var batch = that.data.batch;
    if (!batch || !that.data.jrdhUserInfo) {
      return;
    }
    batch.gbDpbSellUserId = that.data.jrdhUserInfo.nxJrdhUserId;
    batch.gbDpbSellUserOpenId = that.data.jrdhUserInfo.nxJrdhWxOpenId;
    sellUserReadDisBatchGb(batch)
      .then(function (res) {
        if (res.result.code == 0) {
          that._applyBatchData(res.result.data);
          setTimeout(function () {
            that.requestSubscribeMessage();
          }, 500);
        }
      });
  },

  requestSubscribeMessage() {
    wx.requestSubscribeMessage({
      tmplIds: SUPPLIER_SUBSCRIBE_TMPL_IDS,
      success: function () {},
      fail: function () {},
    });
  },

  showShareTishi() {
    this.setData({ isTishi: true });
  },

  radioChange(e) {
    this.setData({
      ['batch.gbDpbPayType']: parseInt(e.detail.value, 10),
    });
  },

  cancelCostBatch() {
    this.setData({ isTishi: false });
  },

  saveTuihuo() {
    var that = this;
    sellerReceiveReturnBill(this.data.batch)
      .then(function (res) {
        if (res.result.code == 0) {
          wx.redirectTo({
            url: '../jinriListWithLogin/jinriListWithLogin',
          });
          setTimeout(function () {
            that.requestSubscribeMessage();
          }, 500);
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none',
          });
        }
      });
  },

  toCancleBack() {
    wx.redirectTo({
      url: '../jinriListWithLogin/jinriListWithLogin',
    });
  },

  toBack() {
    wx.setStorageSync('returnSupplierId', this.data.batch ? this.data.batch.gbDpbSupplierId : null);
    if (this.data.from == 'supplier') {
      var pages = getCurrentPages();
      if (pages.length > 1) {
        var prevPage = pages[pages.length - 2];
        prevPage.setData({
          supplierId: this.data.batch ? this.data.batch.gbDpbSupplierId : null,
        });
      }
      wx.navigateBack({ delta: 1 });
    } else if (this.data.from == 'notification') {
      wx.redirectTo({
        url: '../jinriListWithLogin/jinriListWithLogin',
      });
    } else {
      wx.redirectTo({
        url: '../../../../pages/index/index',
      });
    }
  },

});
