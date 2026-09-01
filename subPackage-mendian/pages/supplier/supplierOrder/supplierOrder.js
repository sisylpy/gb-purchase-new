

var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
import apiUrl from '../../../../config/index.js'

import {
  saveDisPurGoodsBatchGbSupplier
} from '../../../../services/depOrder'

import {
  depGetAllSupplier
} from '../../../../services/supplier'

function normalizeNxResponseData(data) {
  if (data && typeof data === 'object') {
    return data;
  }
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (e) {
      return {};
    }
  }
  return {};
}

Page({


  
  data: {
    
    supplierArr:[]
  },

  onShow(){
   
  },

  onLoad(options) {


    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      depName: options.depName,
      url: apiUrl.server,
    })

    var mendianInfo = wx.getStorageSync('mendianInfo');
    if(mendianInfo){
      this.setData({
        depId: mendianInfo.gbDepartmentId,
    })
  }
  var userInfo = wx.getStorageSync('userInfo');
  if(userInfo){
    this.setData({
      userInfo: userInfo,
  })
}
  var arr = wx.getStorageSync('selArr');
  if(arr){
   this.setData({
    selArr: arr,
   })
  }
    this._initData();

  },

_initData(){

  depGetAllSupplier(this.data.depId).then(res => {
    load.showLoading("获取库房")
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





_getPurSelArr() {
  var arr = this.data.selArr;
  var temp = [];
  if (arr.length > 0) {
    for (var i = 0; i < arr.length; i++) {arr[i].item.purchaseDepartmentEntity = null;
      arr[i].item.purchaseDepartmentUser = null;
      arr[i].item.wasteDepartmentEntities = null;
      temp.push(arr[i].item);
    }
  }
  return temp;
},

 saveNxBatch(e){
   var supplier = e.currentTarget.dataset.item;
  var arr = this.data.selArr;
  var batch = {
    gbDpbPurUserId: this.data.userInfo.gbDepartmentUserId,
    gbDpbDistributerId: this.data.userInfo.gbDuDistributerId,
    gbDpbPurDepartmentId: this.data.depId,
    gbDpbUserAdminType: 11,
    gbDPGEntities: arr,
    gbDpbPurchaseType: 0,
    gbDpbBuyUserOpenId: this.data.userInfo.gbDuWxOpenId,
    gbDpbBuyUserId: this.data.userInfo.gbDepartmentUserId,
    gbDpbSupplierId: supplier.nxJrdhSupplierId,
    gbDpbNxDistributerId: supplier.nxJrdhsNxDistributerId

  };
  load.showLoading("保存订货");
  saveDisPurGoodsBatchGbSupplier(batch).then(res => {
    if (res.result.code != 0) {
      load.hideLoading();
      wx.showToast({ title: res.result.msg || '保存订货失败', icon: 'none' });
      return;
    }
    var batchId = Number(res.result.data || 0);
    var nxDisId = Number(res.result.nxDisId || batch.gbDpbNxDistributerId || 0);
    if (batchId <= 0 || nxDisId <= 0) {
      load.hideLoading();
      wx.navigateBack({delta: 1});
      return;
    }
    wx.request({
      url: apiUrl.nxApiUrl + 'nxdistributergoods/nxDisImportJczbBatch',
      method: 'POST',
      data: { batchId: batchId, nxDisId: nxDisId },
      header: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      dataType: 'json',
      success: function (nxRes) {
        load.hideLoading();
        var nxData = normalizeNxResponseData(nxRes.data);
        if (Number(nxData.code) === 0) {
          wx.navigateBack({delta: 1});
        } else {
          wx.showToast({
            title: nxData.msg || '订货已保存，转配送失败',
            icon: 'none'
          });
        }
      },
      fail: function () {
        load.hideLoading();
        wx.showToast({ title: '订货已保存，转配送失败', icon: 'none' });
      }
    });

  })


 },

toBack() {
  wx.navigateBack({
    delta: 1,
  })
},





})
