var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
var app = getApp()
var load = require('../../../../lib/load.js');

import apiUrl from '../../../../config.js'

import {
  peisongDepGetGbOrders,
  
} from '../../../../lib/apiDistributerGb.js'



Page({

  /**
   * 页面的初始数据
   */
  data: {
    limit: 10,
    totalPage: 0,
    totalCount: 0,
    currentPage: 1,    
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      gbDisId: options.gbDisId,
      goodsId: options.goodsId,
      url: apiUrl.server,
      startDate: -1,
      stopDate: -1,
    })

    var userInfo = wx.getStorageSync('userInfo');
    if(userInfo){
      this.setData({
        userInfo: userInfo,
        gbDisId: userInfo.gbDuDistributerId
      })
    }
    var disGoods = wx.getStorageSync('disGoods');
    if(disGoods){
      this.setData({
        disGoods: disGoods
      })
    }
   this._initData();

  },
/**
     * 获取客户订单
     */
    _initData() {
      load.showLoading("获取今日订单");
      var data = {
        gbDisId: this.data.gbDisId,
        nxDisGoodsId: this.data.goodsId,
        startDate: this.data.startDate,
        stopDate: this.data.stopDate
      }
      peisongDepGetGbOrders(data).then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          this.setData({
            orderArr: res.result.data,
          })
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none',
          })
        }
      })
    },

  


  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  },



})