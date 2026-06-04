const globalData = getApp().globalData;
// var load = require('../../../../../lib/load.js');

// import {
//   gbPurchaserGetSupplier,
//   disUpdateDisGoodsGb
// } from '../../../../../lib/apiDistributer'

import {
  depGetAllSupplier,
  disUpdateDisGoodsGb,
} from '../../../../services/supplier.js'


Page({

  onShow(){
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
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
        type: options.type,
    })
    
    var userInfoValue = wx.getStorageSync('userInfo');
    if (userInfoValue) {
      this.setData({
        userInfo: userInfoValue
      })
    }
    var disInfo = wx.getStorageSync('disInfo');
    if (disInfo) {
      this.setData({
        disInfo: disInfo,
        disId: disInfo.gbDistributerId,
      })
    }
    var mendianInfo = wx.getStorageSync('mendianInfo');
    if (mendianInfo) {
      this.setData({
        depId: mendianInfo.gbDepartmentId,
      })
    }
    this._initData();
  },

  _initData(){
    depGetAllSupplier(this.data.depId).then(res => {
      load.showLoading("获取供货商")
      if (res.result.code == 0) {
        load.hideLoading();
        this.setData({
          supplierArr: res.result.data,
        })
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },


  choiceSupplier(e) {
    var supplierItem = e.currentTarget.dataset.item;
    console.log(e);
     var goodsItem = wx.getStorageSync('disGoods');
     var aaa = supplierItem.nxJrdhSupplierId;
     goodsItem.gbDgGbSupplierId = aaa;
     goodsItem.gbDgGoodsType = 21;
     goodsItem.gbDgGbDepartmentId = this.data.depId,
     goodsItem.gbDgNxDistributerId = -1;
     goodsItem.gbDgNxDistributerGoodsId = -1;
    disUpdateDisGoodsGb(goodsItem).then(res =>{
     
      if(res.result.code == 0){
        wx.navigateBack({
          delta: 2,
        })
      }else{
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
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