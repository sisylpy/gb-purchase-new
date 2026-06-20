
var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
var app = getApp()
var dateUtils = require('../../../../utils/dateUtil');
import apiUrl from '../../../../config'


import {
  gbDepGetDistibuterInfo,
  addNxAndGbBusiness,
  delteNxAndGbBusiness
 } from '../../../../lib/apiDepOrder.js'
 
 
 Page({

  onShow(){
    
    let windowInfo = wx.getWindowInfo();
  let globalData = getApp().globalData;
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
    });
  },

  /**
   * 页面的初始数据
   */
  data: {
    goodsPrice: 0,
    payMethond: 0,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

    
    var disInfo = wx.getStorageSync('disInfo');
    if (disInfo) {
      this.setData({
        disInfo: disInfo,
        gbDisId: disInfo.gbDistributerId,
        depId: disInfo.appSupplierDepartment.gbDepartmentId,
      })
    }
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      url: apiUrl.server,
      disId: options.disId     
    })
    this._initData();

  },

  _initData(){
    var data = {
      nxDisId: this.data.disId,
      gbDepId: this.data.depId,
      gbDisId: this.data.gbDisId
    }
    gbDepGetDistibuterInfo(data)
    .then(res =>{
      if(res.result.code == 0){
        this.setData({
          dis: res.result.data,
        })
      }
    })
  },

  toNxGoods(){
    console.log("todtoototo")
    wx.setStorageSync('nxDisInfo', this.data.dis)
    wx.navigateTo({
      url: '../nxDistributerGoods/nxDistributerGoods?nxDisId=' + this.data.disId,
    })
  },


  addBusiness(e){
    var data = {
      nxDgdGbDistributerId: this.data.disInfo.gbDistributerId,
      nxDgdNxDistributerId: e.currentTarget.dataset.id,
      nxDgdGbDepId: this.data.disInfo.appSupplierDepartment.gbDepartmentId,
      nxDgdGbPayMethod: this.data.payMethond,
      nxDgdGbGoodsPrice: this.data.goodsPrice,
      nxDgdStatus: -1,  
    }

    load.showLoading("添加中")
    addNxAndGbBusiness(data).then(res => {
      if(res.result.code == 0){
        load.hideLoading();
        let pages = getCurrentPages();
        let prevPage = pages[pages.length - 2];
        prevPage.setData({
          update: true
        })
         wx.navigateBack({
           delta: 1,
         })

      }
    })
  },



  /**
   * 邀请采购员
   * @param {*} options 
   */
  onShareAppMessage: function (options) {
   console.log("nxDid");
   wx.setStorageSync('nxDisInfo', this.data.dis)
    return {
      title: "向你推荐专业的饭店采购小程序", // 默认是小程序的名称(可以写slogan等)
      path: '/pages/inviteAndOrder/inviteAndOrder',
      imageUrl: this.data.url + this.data.img,
    }
  },


  delteBusiness(e){
    delteNxAndGbBusiness(e.currentTarget.dataset.id).then(res =>{
      if(res.result.code == 0){
        wx.showToast({
          title: '已删除',
        })
        var data = "dis.nxDistributerGbDistributerEntity";
        this.setData({
          [data]: null,
        })
      }
    })

  },

  fixedPrice(e){
     console.log(e.currentTarget.dataset.type)
      this.setData({
        goodsPrice: e.currentTarget.dataset.type 
      })
    
  },

  payMethod(e){
    console.log(e.currentTarget.dataset.type)
      this.setData({
        payMethond: e.currentTarget.dataset.type
      })
    
  },

  havePhone(e){
    var phone = e.currentTarget.dataset.phone;
    wx.makePhoneCall({
      phoneNumber: phone, //此号码仅用于测试 。
      success: function () {
        console.log("拨打电话成功！")
      },
      fail: function () {
        console.log("拨打电话失败！")
      }
    })
  },


  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  }

})