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


  toShixian1(){
     
  wx.navigateTo({
    url: '/subPackage-yishang/pages/yishang/nxDistributerGoods/nxDistributerGoods',
  })
  },

  // xiadan
  toShixian(e) {
    var mendianInfo = wx.getStorageSync('mendianInfo');
    if (mendianInfo && mendianInfo.gbDepartmentSubAmount > 1) {
      this.setData({
        showChoice: true,
      })
    } else if (mendianInfo) {


      wx.setStorageSync('depInfo', mendianInfo.gbDepartmentEntityList[0]);
      var depName = mendianInfo.gbDepartmentEntityList[0].gbDepartmentName;
      // wx.navigateTo({
      //   url: '/subPackage-yishang/pages/yishang/nxDistributerGoods/nxDistributerGoods?depId=' + this.data.depId + '&disId=' + this.data.disId + '&depName=' + depName,
      // })
      wx.navigateTo({
        url: '/subPackage-yishang/pages/yishang/nxDistributerGoods/nxDistributerGoods?depId=' + this.data.depId + '&disId=' + this.data.disId + '&depName=' + depName + '&nxDisId=' + e.currentTarget.dataset.item.nxGducNxDistributerId,
      })
    }

  },


  choiceSubDep(e) {

    var dep = e.currentTarget.dataset.item;
    var depId = dep.gbDepartmentId;
    var depName = dep.gbDepartmentName;
    this.setData({
      showChoice: false,
    })
    wx.setStorageSync('depInfo', dep);
    wx.navigateTo({
      url: '../../yishang/nxDistributerGoods/nxDistributerGoods?depId=' + depId + '&disId=' + this.data.disId +
        '&depName=' + depName,
    })


  },
  choiceMendian(e) {
    var dep = e.currentTarget.dataset.item;
    var depId = dep.gbDepartmentId;
    var depName = dep.gbDepartmentName;
    this.setData({
      showChoice: false,
    })
    wx.setStorageSync('depInfo', dep);
    wx.navigateTo({
      url: '../../yishang/nxDistributerGoods/nxDistributerGoods?depId=' + depId + '&disId=' + this.data.disId +
        '&depName=' + depName,
    })

  },



  toShixianTishi(){
    wx.showToast({
      title: '还没有到生效时间',
      icon: 'none'
    })
  }

})