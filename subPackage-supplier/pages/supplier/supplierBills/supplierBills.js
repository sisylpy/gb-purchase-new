const globalData = getApp().globalData;
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil');

import apiUrl from '../../../../config/index.js'


import {
  disGetGbSupplierBillsWithStatus,
} from '../../../../services/apiDistributer.js'




Page({


  onShow(){
    var supplierItem = wx.getStorageSync('supplierItem');
    if (supplierItem) {
      this.setData({
        supplier: supplierItem,
        supplierId: supplierItem.nxJrdhSupplierId,
        supplierName: supplierItem.nxJrdhsSupplierName,
      })
    }
   

    if(this.data.update){
      var myDate = wx.getStorageSync('myDate');
      if(myDate){
       // 如果是自定义日期，传递具体的开始和结束日期
       var dateRange;
       if (myDate.name === 'custom') {
         dateRange = dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate);
       } else {
         dateRange = dateUtils.getDateRange(myDate.name);
       }
       this.setData({
         startDate: dateRange.startDate,
         stopDate: dateRange.stopDate,
         dateType: myDate.dateType,
         hanzi: myDate.hanzi || dateRange.name,
         update: false,
       })
  
      }
      
      this._initData();
     }

  },

  /**
   * 页面的初始数据
   */
  data: {
   
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      status: options.type,
      supplierId: options.supplierId,
      value: options.value,
      
    })

    var myDate = wx.getStorageSync('myDate');
    if(myDate){
      // 如果是自定义日期，传递具体的开始和结束日期
      var dateRange;
      if (myDate.name === 'custom') {
        dateRange = dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate);
      } else {
        dateRange = dateUtils.getDateRange(myDate.name);
      }
      
    
      this.setData({
        startDate: dateRange.startDate,
        stopDate: dateRange.stopDate,
        dateType: myDate.dateType,
        hanzi: myDate.hanzi || dateRange.name,
      })
    }else{
      this.setData({
        dateType: 'month',
        startDate: dateUtils.getFirstDateInMonth(),
        stopDate: dateUtils.getArriveDate(0),
        hanzi:  "本月",
      })
    }
    var userInfoValue = wx.getStorageSync('userInfo');
    if (userInfoValue) {
      this.setData({
        userInfo: userInfoValue,
        disId: userInfoValue.gbDuDistributerId,
      })
    }
    this._initData();
  },

  _initData() {
    load.showLoading("获取账单")
    var data = {
      status: this.data.status,
      supplierId: this.data.supplierId,
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      disId: this.data.disId
    }
    disGetGbSupplierBillsWithStatus(data).then(res => {
      console.log(res.result.data)
      if (res.result.code == 0) {
        load.hideLoading();
        this.setData({
          billArr: res.result.data
        })
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
        this.setData({
          applyArr: []
        })
      }
    })
  },


  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },

  
  openBatchDetail(e) {
    wx.setStorageSync('batchItem', e.currentTarget.dataset.item);
    var value = e.currentTarget.dataset.value;
    wx.navigateTo({
      url: '../myPurchaseDetail/myPurchaseDetail?batchId=' + e.currentTarget.dataset.id
       +'&value=' + value,
    })
  },


  toSettle(){
    wx.navigateTo({
      url: '../settleAccount/settleAccount?supplierId=' + this.data.supplierId,
    })
  },


  toDatePage(){
    this.setData({
      update: true,
    })
    wx.navigateTo({
      url: '../../sel/date/date?dateType=' + this.data.dateType + '&startDate='
       + this.data.startDate + '&stopDate=' + this.data.stopDate, 
    })
  },


 onUnload(){
   
 }















})