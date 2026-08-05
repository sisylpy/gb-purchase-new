const globalData = getApp().globalData;
var app = getApp()
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil.js')

import apiUrl from '../../../../config/index.js'
// import {
//   disGetCouponList,
// } from '../../../../lib/apiDistributer'



Page({

  onShow: function () {

    // 推荐直接用新API
    let windowInfo = wx.getWindowInfo();
    let globalData = getApp().globalData;
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
    });


  },

  /**
   * 页面的初始数据
   */
  data: {

    

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

    var disInfoValue = wx.getStorageSync('disInfo');
    if (disInfoValue) {
      this.setData({
        disInfo: disInfoValue,
        disId: disInfoValue.gbDistributerId,
     
      })
    }
   
    var userInfo = wx.getStorageSync('userInfo');
    if(userInfo){
      this.setData({
        userInfo: userInfo
      })
    }
    this.setData({
      rpxR: globalData.rpxR,
      url: apiUrl.server,
      todayDate: dateUtils.getArriveDate(0),
     
    })

   
    // this._initData();
  
  },



  _initData(){
    var data = {
      disId: this.data.disId,
    }
   load.showLoading("获取数据中");
   disGetCouponList(data).then(res =>{
      load.hideLoading();
      if(res.result.code ==0){
        this.setData({
          payArr: res.result.data,
        })
      }

    })
  },



  toBack(){
    wx.navigateBack({
      delta: 1
    })
  },
})
