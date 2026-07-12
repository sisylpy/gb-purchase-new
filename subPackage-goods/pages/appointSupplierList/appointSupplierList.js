const globalData = getApp().globalData;
var load = require('../../../lib/load.js');


import {
  depGetAllSupplier,
  updateDepGoods,
} from '../../../services/supplier.js'


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
      purDepId: options.purDepId,
    })
    this._initData();
  },

  _initData(){
    var depGoods = wx.getStorageSync('depGoods');
    // 获取当前已选中的供货商ID
    var currentSupplierId = null;
    if (depGoods) {
      currentSupplierId = depGoods.gbDdgGbSupplierId
        || (depGoods.gbDepAppointSupplierEntity && depGoods.gbDepAppointSupplierEntity.nxJrdhSupplierId);
    }

    depGetAllSupplier(this.data.purDepId).then(res => {
      load.showLoading("获取供货商")
      if (res.result.code == 0) {
        load.hideLoading();
        var supplierArr = res.result.data || [];
        // 给已选中的供货商设置 isSelected 标记
        supplierArr = supplierArr.map(function(item) {
          if (currentSupplierId && item.nxJrdhSupplierId == currentSupplierId) {
            item.isSelected = true;
          } else {
            item.isSelected = false;
          }
          return item;
        });
        this.setData({
          supplierArr: supplierArr,
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
    var depGoods = wx.getStorageSync('depGoods');
    if (!depGoods || typeof depGoods !== 'object' || !depGoods.gbDepartmentDisGoodsId) {
      wx.showToast({
        title: '部门商品信息缺失，请返回重试',
        icon: 'none'
      });
      return;
    }
    depGoods.gbDdgGbSupplierId = supplierItem.nxJrdhSupplierId;
    depGoods.gbDdgGoodsType = 21;
    if (this.data.purDepId) {
      depGoods.gbDdgGbDepartmentId = this.data.purDepId;
    }
    load.showLoading('保存供货商');
    updateDepGoods(depGoods).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        wx.removeStorageSync('depGoods');
        wx.navigateBack({
          delta: 1,
        })
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    }).catch(() => {
      load.hideLoading();
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    });
  },

  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  },

})
