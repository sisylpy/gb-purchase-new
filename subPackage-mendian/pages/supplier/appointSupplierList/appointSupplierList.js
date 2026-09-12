var load = require('../../../../lib/load.js');

import {
  gbDisGetAllSuppliers,
} from '../../../../services/supplier.js';


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
   
    gbDisGetAllSuppliers(this.data.disId).then(res => {
      load.showLoading("获取供货商")
      if (res.result.code == 0) {
        load.hideLoading();this.setData({
          supplierArr: res.result.data,
        })
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },


  choiceSupplier(e) {
    var supplierItem = e.currentTarget.dataset.item;
    this.getOpenerEventChannel().emit('supplierSelected', supplierItem);
    wx.navigateBack({ delta: 1 });
  },

  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  },

})
