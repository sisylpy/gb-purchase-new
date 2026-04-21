

var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
import apiUrl from '../../../../config/index.js'

import {
  saveDisPurGoodsBatchGbSupplier
} from '../../../../services/depOrder'

import {
  depGetAllSupplier
} from '../../../../services/apiDistributer'

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

    var disInfo = wx.getStorageSync('disInfo');
    if(disInfo){
      this.setData({
        disInfo: disInfo,
        depId: disInfo.mendianDepartmentList[0].gbDepartmentId,
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
    for (var i = 0; i < arr.length; i++) {
      console.log("itetm==", arr[i].item)
      arr[i].item.purchaseDepartmentEntity = null;
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
    gbDpbDistributerId: this.data.disInfo.gbDistributerId,
    gbDpbPurDepartmentId: this.data.depId,
    gbDpbUserAdminType: 2,
    gbDPGEntities: arr,
    gbDpbPurchaseType: 2,
    gbDpbBuyUserOpenId: this.data.userInfo.gbDuWxOpenId,
    gbDpbBuyUserId: this.data.userInfo.gbDepartmentUserId,
    gbDpbSupplierId: supplier.nxJrdhSupplierId,
    gbDpbNxDistributerId: supplier.nxJrdhsNxDistributerId

  };

  console.log(batch);
  load.showLoading("保存订货")
  saveDisPurGoodsBatchGbSupplier(batch).then(res => {
    load.hideLoading();
    wx.navigateBack({delta: 1})

  })


 },

toBack() {
  wx.navigateBack({
    delta: 1,
  })
},





})