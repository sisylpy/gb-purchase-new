var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
var dateUtils = require('../../../../lib/dateUtil');
var depOrder = require('../../../../services/depOrder.js');

import apiUrl from '../../../../config/index.js'

Page({

  onShow(){
    if(this.data.update){
      
      var myDate = wx.getStorageSync('myDate');if(myDate){
        this.setData({
          startDate: myDate.startDate,
          stopDate: myDate.stopDate,
          dateType: myDate.dateType,
        })
      }
      this._getInitData();
     
    }
    
  },
  
  /**
   * 页面的初始数据
   */
  data: {

    type: "goods",
    typeString: "",
    showSearch: false

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
      supplierId: options.supplierId,
      goodsId: options.goodsId,
      from: options.from,
    
    })

    var myDate = wx.getStorageSync('myDate');
    if(myDate){
      this.setData({
        startDate: dateUtils.getDateRange(myDate.name).startDate,
        stopDate: dateUtils.getDateRange(myDate.name).stopDate,
        dateType: myDate.dateType,
        hanzi:  myDate.hanzi,
      })
    }else{
      this.setData({
        dateType: 'month',
        startDate: dateUtils.getFirstDateInMonth(),
        stopDate: dateUtils.getArriveDate(0),
        hanzi:  "本月",
      })
    }
    var supplierInfo = wx.getStorageSync('supplierItem');
    if(supplierInfo){
      this.setData({
        supplierInfo: supplierInfo
      })
    }
   
      this._getInitData();
    
  },

  _getInitData() {
    var data = {
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      supplierId: this.data.supplierId,
      goodsId: this.data.goodsId
      
    }
    load.showLoading("获取数据中");
    depOrder.supplierGetStars(data)
      .then(res => {
        load.hideLoading();if (res.result.code == 0) {
          this.setData({
            arr: res.result.data.arr,
            supplierInfo: res.result.data.supplierInfo,
            tuihuoSubtotal: res.result.data.tuihuoSubtotal,
            tuihuoCount: res.result.data.tuihuoCount,
           
          })
        }
      }) 
  },


  toDatePage(){
    this.setData({
      update: true,
    })
    wx.navigateTo({
      url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType,
    })
  },


  showDialogBtn(e){
    this.setData({
      showStarDialage: true,
      showGoods: e.currentTarget.dataset.item,
    })
  },

  cancle(){
    this.setData({
      showStarDialage: false,
      showGoods: "",
    })
  },

  

  toBack() {
    if(this.data.from == 'supplier'){
      wx.navigateBack({
        delta: 1,
      })
      
    }else{
      wx.redirectTo({
        url: '../../../../pages/index/index',
      })
    }
   
  },

  onUnload(){
    
  }

})
