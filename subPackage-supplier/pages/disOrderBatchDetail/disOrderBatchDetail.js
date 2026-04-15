var load = require('../../../lib/load.js');
const globalData = getApp().globalData;
import apiUrl from '../../../config.js'

import {
  getDisPurchaseGoodsBatchGb,
} from '../../../services/depOrder'

Page({

  onShow() {
    let windowInfo = wx.getWindowInfo();
    let globalData = getApp().globalData;
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      statusBarHeight: windowInfo.statusBarHeight * globalData.rpxR,
    });
    this._getInitData();
  },

  data: {
    bottomHeight: 300,
    formHeight: 450,
    formHeightBuyer: 520,
    headerHeight: 80,
  },

  onLoad: function (options) {
    this.setData({
      url: apiUrl.server,
      avatarUrl: "",
      batchId: options.batchId,
      retName: options.retName,
      disId: options.disId,
      buyUserId: options.buyUserId,
    })
  },

  _getInitData() {
    load.showLoading("获取订货商品")
    var that = this;
    getDisPurchaseGoodsBatchGb(this.data.batchId)
      .then(res => {
        console.log(res)
        load.hideLoading();
        if (res.result.code == 0) {
          that.setData({
            batch: res.result.data,
            batchStatus: res.result.data.gbDpbStatus,
          })
        } else {
          wx.showToast({
            title: '没有订货',
            icon: 'none'
          })
        }
      })
  },

  toBack(){
    wx.navigateBack({delta: 1});
  },
})
