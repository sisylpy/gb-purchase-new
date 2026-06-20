// pages/bg-light/bg-light.js
const globalData = getApp().globalData;

import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');


import {
  disGetNxDistributerUnPayBills,
  
} from '../../../../lib/apiDistributerGb'

import {
  
  disSettleNxDepartmentBills,
} from '../../../../lib/apiDepOrder'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    selAmount: 0,

    total: 0,
    selectArr: [],
    isTishi: false,
    startDate: -1,
    stopDate: -1,
  },

 

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    var value = wx.getStorageSync('userInfo');
    if (value) {

      this.setData({
        // disId: value.nxDistributerEntity.nxDistributerId,
        userInfo: value,
      })

     
    }
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      url: apiUrl.server,
      nxDisId: options.nxDisId,
      nxDistributerName: options.name,
      toDepId: options.toDepId,
      customerArr: [],
      gbDisId: options.gbDisId
    })
    this._initData();
  },


  _initData() {
    var data = {
      nxDisId: this.data.nxDisId,
      gbDisId: this.data.gbDisId,
      status: 4,
    }
    disGetNxDistributerUnPayBills(data).then(res => {
      console.log(res.result.data)
      if (res.result.code == 0) {
        load.hideLoading();
        this.setData({
          accountBillArr: res.result.data.arr,
          total : res.result.data.total,
        })
        
        
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
        this.setData({
          accountBillArr: []
        })
      }
    })
  },

  _getArr(arr){
    var list = [];

    if(arr.length > 0){
      for(var i = 0; i < arr.length; i++){
        if(arr[i].arr.length > 0){
          var billArr = arr[i].arr;
          console.log(billArr);
          for(var j = 0; j < billArr.length; j++){
          list.push(billArr[j]);
          }
        }
      }
    }
    this.setData({
      accountBillArr: list,
    })


  },

  selectBill(e) {
    var index = e.currentTarget.dataset.index;
    var isSelect = e.detail.value;
    var item = this.data.accountBillArr[index];
    var selectArr = this.data.selectArr;
    console.log(index);
    var selectId = this.data.accountBillArr[index].gbDistributerPurchaseBatchId;

    if (isSelect) {
      selectArr.push(item);
      this.setData({
        selectArr: selectArr
      })
    } else {
      selectArr.splice(selectArr.findIndex(item => item.gbDistributerPurchaseBatchId === selectId), 1);
      this.setData({
        selectArr: selectArr
      })
    }
    this._countTotal();
  },

  _countTotal() {
    var selectArr = this.data.selectArr;
    var temp = 0;
    for (var i = 0; i < selectArr.length; i++) {
      var itemTotal = Number(selectArr[i].gbDbTotal);
      console.log(selectArr[i]);
      console.log(Number(selectArr[i].gbDbTotal));
      temp = temp + itemTotal;
      console.log(temp);
    }
    this.setData({
      total: temp.toFixed(1),
      selAmount: selectArr.length
    })
  },

  settleBills() {
    this.setData({
      isTishi: true,
    })
  },

  cancleSettle() {
    this.setData({
      isTishi: false,
      selAmount: 0,
    })
    this._initData();

  },



  settleAccount() {

    
    var data = {
      gbDspDistributerId: this.data.userInfo.gbDuDistributerId,
      gbDspSupplierId: -1,
      gbDspNxDistributerId: this.data.nxDisId,
      gbDspPayUserId: this.data.userInfo.gbDepartmentUserId,
      gbDepartmentBillEntities: this.data.selectArr,
      gbDspPayTotal: this.data.total,
      gbDspPayUserOpenId: this.data.userInfo.gbDiuWxOpenId,
    }
    disSettleNxDepartmentBills(data).then(res => {
      this.setData({
        isTishi: false,
        selAmount: 0,
        total: ""
      })
      if (res.result.code == 0) {
        console.log(res);
        var map = res.result.map;
        wx.requestPayment({
          nonceStr: map.nonceStr,
          package: map.package,
          signType: "MD5",
          timeStamp: map.timeStamp,
          paySign: map.paySign,
          success: function (res) {
            var pages = getCurrentPages();
            var prevPage = pages[pages.length - 2]; //上一个页面
            //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
            prevPage.setData({
              update: true
            })
            wx.navigateBack({delta: 1})
          },
          fail: function (res) {
            console.log(res);
          }
        })
      }
    })
  },

  showOrHide(e) {
    console.log(e);
    var greatIndex = e.currentTarget.dataset.greatindex;
    var grandIndex = e.currentTarget.dataset.grandindex;
    for (var i = 0; i < this.data.depGoodsArr.length; i++) {

      for (var j = 0; j < this.data.depGoodsArr[i].fatherGoodsEntities.length; j++) {
        var itemShow = "depGoodsArr[" + i + "].fatherGoodsEntities[" + j + "].isShow";

        if (i != greatIndex || j != grandIndex) {
          this.setData({
            [itemShow]: false
          })
        }
      }
    }

    var show = this.data.depGoodsArr[greatIndex].fatherGoodsEntities[grandIndex].isShow;
    var itemShow = "depGoodsArr[" + greatIndex + "].fatherGoodsEntities[" + grandIndex + "].isShow";
    this.setData({
      [itemShow]: !show
    })
  },

  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  }






})