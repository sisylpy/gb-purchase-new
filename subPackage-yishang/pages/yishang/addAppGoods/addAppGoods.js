const globalData = getApp().globalData;
var app = getApp()
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil');

import apiUrl from '../../../../config.js'


import {

  peisongDepGetNxDistributer,
  peisongDepDeleteNxDistributer,
  addAppGoods
} from '../../../../lib/apiDistributerGb.js'


Page({


  onLoad() {

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      // navBarHeight: 160,
      url: apiUrl.server,
    })

    var value = wx.getStorageSync('disInfo');
    if (value) {
      this.setData({
        disInfo: value,
        disId: value.gbDistributerId,
        appSupplierDepId: value.appSupplierDepartment.gbDepartmentId
      })

      this._initData();
    }

  },

  /**
   * 获取客户订单
   */
  _initData() {
    load.showLoading("获取今日订单");
    peisongDepGetNxDistributer(this.data.appSupplierDepId).then(res => {
      load.hideLoading();
      console.log(res.result.data)
      console.log("herree")
      if (res.result.code == 0) {
        this.setData({
          nxDisArr: res.result.data,

        })

      } else {
        wx.showToast({
          title: res.result.msg,
          duration: 1000,
        })
      }
    })
  },


applyAppGoods(e){
  var goods = wx.getStorageSync('disGoods');
  var  ids = [];
  var id = goods.gbDistributerGoodsId
  ids.push(id);
  if(ids){
    var data ={
      ids: ids,
      nxDisId: e.currentTarget.dataset.id,
    }
    addAppGoods(data).then(res =>{
      if(res.result.code == 0){
        wx.navigateBack({delta: 2});
      }
    })

  }
},


  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },






})