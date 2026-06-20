const globalData = getApp().globalData;
var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config'

import {
  sellerAndBuyerGetAccountBillsGb,
  getDisInfo,
} from '../../../../lib/apiDistributerGb'


let windowWidth = 0;
let itemWidth = 0;


Page({


  /**
   * 页面的初始数据
   */
  data: {
    update: false,
    tab1Index: 0,
    itemIndex: 0,
    sliderOffset: 0,
    sliderOffsets: [],
    sliderLeft: 0,
    tabs: [{
        id: 0,
        words: "未配送"
      },
      {
        id: 1,
        words: "配送中"
      },
      {
        id: 2,
        words: "配送完成"
      },
      {
        id: 3,
        words: "付款完成"
      }, {
        id: 4,
        words: "配送商品"
      }

    ],
    showReason: false,
    nxDisInfo: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      nxDisId: options.nxDisId,
      url: apiUrl.server,
      customerArr: [],
      gbDisId: options.gbDisId,
     
    })

    var disInfo  = wx.getStorageSync('disInfo');
    if(disInfo){
      this.setData({
        disInfo: disInfo
      })
    }
    
    getDisInfo(this.data.disInfo.nxDistributerEntity.nxDistributerId).then(res =>{
      if(res.result.code == 0){
        this.setData({
          nxDisInfo: res.result.data
        })
      }
    })
    // var disInfo = wx.getStorageSync('nxDisItem');
    // if(disInfo){
    //   this.setData({
    //     nxDisInfo: disInfo
    //   })
    // }
    this._getAccountBills();
  },

  _getAccountBills(){
    var data = {
      disId : this.data.nxDisId,
      gbDisId : this.data.gbDisId,
      nxCommId: -1,
     }
     load.showLoading("获取账单")
     sellerAndBuyerGetAccountBillsGb(data).then(res => {
      load.hideLoading()
      console.log(res.result.data);
      if(res.result.code == 0){
        var total = 0;
        for(var i = 0; i < res.result.data.arr.length; i++){
          total = total + res.result.data.arr[i].arr.length;
        }
        this.setData({
          accountBillArr: res.result.data.arr,
          totalSettle: res.result.data.total,
          totalArr: total
        })
       
      }else{
        wx.showToast({
          title:  res.result.msg,
          icon: "none"
        })
      }
    })
   },


  openAccountBill(e){
   console.log("ee",e);

    wx.navigateTo({
      url: '../issuePage/issuePage?billId=' + e.currentTarget.dataset.id + '&depFatherId=' 
      + e.currentTarget.dataset.depid,
    })
  },


//   openAccountBill(e){
//     var id = e.currentTarget.dataset.id;
//     var dep = e.currentTarget.dataset.dep;
//     var depHasSubs = dep.gbDepartmentSubAmount;
//     wx.setStorageSync('nxDisItem', this.data.nxDisInfo);
//     console.log(dep);
//     wx.navigateTo({
//       url: '../issuePage/issuePage?billId=' + id+'&depHasSubs=' + depHasSubs  + '&depFatherId=' + dep.gbDepartmentFatherId + '&depName=' + dep.gbDepartmentName,
//     })
// },



toPhone(e){
  wx.makePhoneCall({
    phoneNumber:  e.currentTarget.dataset.phone, // 需要拨打的电话号码
    success: function (res) {
      console.log('拨打电话成功', res);
    },
    fail: function (err) {
      console.error('拨打电话失败', err);
    }
  });
},



  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },



















})