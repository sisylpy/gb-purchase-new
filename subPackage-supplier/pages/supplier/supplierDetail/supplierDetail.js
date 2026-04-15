// pages/bg-light/bg-light.js
const globalData = getApp().globalData;

var load = require('../../../../../lib/load.js');
var dateUtils = require ('../../../../../lib/dateUtil.js');

let windowWidth = 0;
let itemWidth = 0;

// import {
//   disGetGbSupplierBills,
// } from '../../../../../lib/apiDistributerGb'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    showChoice: false,

    

    
  },

  
  onShow(){
    if(this.data.toSettle){
      this._initData();
    }
 },
  
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
  
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      supplierId: options.supplierId,
      supplierName: options.supplierName,
    
    })
    this._initData();  
  },

  _initData(){
   
    var data = {
      disId: this.data.disId,
      supplierId: this.data.supplierId
    }
    disGetGbSupplierBills(data).then(res => {
      console.log(res.result.data)
      if (res.result.code == 0) {
        load.hideLoading();
        this.setData({
          billArr: res.result.data,
          totalSettle: res.result.data[3].listTotal,
          unSettleSubtotal: res.result.data[3].unSettleSubtotal,
          toSettle: false
        })

        var that = this;
        var query = wx.createSelectorQuery();
        //选择id
        query.select('#mjltest').boundingClientRect()
        query.exec(function (res) {
          that.setData({
            maskHeight: res[0].height * globalData.rpxR + 50
          })
        })
      }else{
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



  toSettleBills(e){
    this.setData({
      toSettle: true
    })
    wx.navigateTo({
      url: '../settleAccount/settleAccount?supplierId=' + this.data.supplierId,
    })

  },
  
  openBatchDetail(e){
    wx.navigateTo({
      url: '../myPurchaseDetail/myPurchaseDetail?batchId=' + e.currentTarget.dataset.id,
    })
  },


  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  }
  








})