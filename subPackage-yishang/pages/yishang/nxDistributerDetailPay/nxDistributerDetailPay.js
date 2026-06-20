const globalData = getApp().globalData;

import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil')

let windowWidth = 0;
let itemWidth = 0;


import {
  disGetNxDistributerBills,
  getNxDistributerFatherGoodsPeisong
} from '../../../../lib/apiDistributerGb'


Page({

  /**
   * 页面的初始数据
   */
  data: {
    
   

  },

  onShow(){
    if(this.data.updateMyDate){
      var myDate = wx.getStorageSync('myDate');
      if(myDate){
        this.setData({
          startDate: myDate.startDate,
          stopDate: myDate.stopDate,
          dateType: myDate.dateType,
        })
      }
      this._getAccountBills();
    }
    var fil = wx.getStorageSync('myDate');
    if(fil){
      this.setData({
        filterShow: true
      })
    }else{
      this.setData({
        filterShow: false
      })
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {


    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
        disId: value.gbDistributerEntity.gbDistributerId,
        userInfo: value,

      })
      
    }
    var disValue = wx.getStorageSync('disInfo');
    if (disValue) {
      this.setData({
        disInfo: disValue
      })
    }
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      nxDisId: options.nxDisId,
      nxDistributerName: options.name,
      toDepId: options.toDepId,
      customerArr: [],
      gbDisId: options.gbDisId
    })
    var fil = wx.getStorageSync('myDate');
    console.log(fil)
    if(fil){
      this.setData({
        filterShow: true,
        startDate: myDate.startDate,
        stopDate: myDate.stopDate,
        dateType: myDate.dateType,
      })
    }else{
      this.setData({
        filterShow: false,
        startDate: dateUtils.getFirstDateInMonth(),
        stopDate: dateUtils.getArriveDate(0),
        dateType: 'month',
      })
      
    }
    this._initData();
    this.clueOffset();

  },


  _initData() {
    var data = {
      nxDisId: this.data.nxDisId,
      gbDisId: this.data.gbDisId,
      status: 6,
      startDate: this.data.startDate,
      stopDate: this.data.stopDate
    }
    disGetNxDistributerBills(data).then(res => {
      console.log(res.result.data)
      if (res.result.code == 0) {
        load.hideLoading();
        this.setData({
          deliveryBillArr: res.result.data.bill,
          total : res.result.data.total,
          count : res.result.data.count,
        })
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
        this.setData({
          deliveryBillArr: []
        })
      }
    })
  },

  openDeliveryDetail(e) {
    wx.navigateTo({
      url: '../../../../subPackage/pages/data/issuePage/issuePage?billId=' + e.currentTarget.dataset.id +
        '&depFatherId=' + e.currentTarget.dataset.depid,
    })
  },


  /**
   * 计算偏移量
   */
  clueOffset() {
    var that = this;
    wx.getSystemInfo({
      success: function (res) {
        itemWidth = Math.ceil(res.windowWidth / that.data.tabs.length);
        let tempArr = [];
        for (let i in that.data.tabs) {
          console.log(i)
          tempArr.push(itemWidth * i);
        }
        // tab 样式初始化
        windowWidth = res.windowWidth;
        that.setData({
          sliderLeft: (res.windowWidth / that.data.tabs.length - 50) / 2,
          sliderOffsets: tempArr,
          sliderOffset: 0,
          sliderLeft: 0,
        });
      }
    });
  },

  /**
   * tabItme点击
   */
  onTab1Click(event) {
    let index = event.currentTarget.dataset.index;
    this.setData({
      sliderOffset: this.data.sliderOffsets[index],
      tab1Index: index,
      itemIndex: index,

    })
  },


  /**
   * 动画结束时会触发 animationfinish 事件
   */
  animationfinish(event) {
    this.setData({
      sliderOffset: this.data.sliderOffsets[event.detail.current],
      tab1Index: event.detail.current,
      goodsType: 'toDepartment',
    })

    if (this.data.tab1Index == 0) {
      this._initData();
    }

    if (this.data.tab1Index == 1) {

      this._getNxDisCata();
    }
   
  },

  _getNxDisCata(){
    load.showLoading("获取配送商品")
    var data = {
      nxDisId: this.data.nxDisId,
      depId: this.data.toDepId
    }
    getNxDistributerFatherGoodsPeisong(data).then(res => {
      console.log(res.result.data)
      if (res.result.code == 0) {
        load.hideLoading();
        this.setData({
          fatherArr: res.result.data

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


  toSettleBills(){

    wx.navigateTo({
      url: '../settleAccount/settleAccount?nxDisId=' + this.data.nxDisId +
      '&name=' + this.data.nxDistributerName + '&toDepId=' + this.data.toDepId + '&gbDisId=' + this.data.gbDisId,
    })

  },





  toBack(){
    wx.navigateBack({
      delta: 1
    })
  }


})