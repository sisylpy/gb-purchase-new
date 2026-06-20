const globalData = getApp().globalData;
var app = getApp()
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil.js')

import apiUrl from '../../../../config/index.js'

import {
  disGetPayList,
  disPayUser,
} from '../../../../services/apiDistributerPay.js'

var gbLogin = require('../../../../services/apiDistributerGbUser.js').gbLogin;

let itemWidth = 0;
let windowWidth = 0;

Page({



  onShow: function () {

    // 推荐直接用新API
    let windowInfo = wx.getWindowInfo();
    let globalData = getApp().globalData;
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
    });

    if (this.data.disId) {
      this._initData();
    }
  },


  /**
   * 页面的初始数据
   */
  data: {

    tabs: [
      
      {
        name: "用户",
        amount: "",
        amountOk: "",
      }, {
        name: "流量",
        amount: "",
        amountOk: "",
      }, 
    ],
    sliderOffset: 0,
    sliderOffsets: [],
    sliderLeft: 0,

    swipeIndex: 0,
    currentTab: 0,
    quantity: -1,

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

    var disInfoValue = wx.getStorageSync('disInfo');
    if (disInfoValue) {
      this.setData({
        disInfo: disInfoValue,
        disId: disInfoValue.gbDistributerId,
        subtotal: "1.0"
      })
    }
    else{
      this.setData({
        showLogin: true,
      })
    }

    var userInfo = wx.getStorageSync('userInfo');
    if(userInfo){
      this.setData({
        userInfo: userInfo
      })
    }
    this.setData({
      rpxR: globalData.rpxR,
      url: apiUrl.server,
      type:  options.type,
      startDate: dateUtils.getFirstDateInMonth(),
      stopDate: dateUtils.getArriveDate(0),
    })

   
    // this._initData();
  
  },



  _initData(){
    var data = {
      disId: this.data.disId,
    }
   load.showLoading("获取数据中");
    disGetPayList(data).then(res =>{
      load.hideLoading();
      if(res.result.code ==0){
        this.setData({
          payArr: res.result.data,
        })
      }

    })
  },


  _aaa(){
    wx.login({
      success: (res) => {
       this.setData({
         code: res.code
       })
      },

      fail: (res => {
        wx.showToast({
          title: '请重新操作',
          icon: 'none'
        })
      })
    })
  },

  //swiper one before
  _userLogin() {
    wx.login({
      success: (resLogin) => {
        gbLogin(resLogin.code)
          .then((res) => {
            if (res.result.code !== -1) {
              wx.setStorageSync('disInfo', res.result.data.disInfo);
              wx.setStorageSync('userInfo', res.result.data.depUserInfo);
              wx.navigateTo({
                url: '../payList/payList',
              })
              //跳转到首页
            } else {
              wx.redirectTo({
                url: '/pages/tro/tro',
              })
            }
          })
      }
    })
  },

  toPay(e){
    var subtotal = e.currentTarget.dataset.item.gbGdpPaySubtotal;
    var payId = e.currentTarget.dataset.item.gbDistributerPayId;
    var that = this;
    var data = {
      payId: payId,
      openId: this.data.userInfo.gbDuWxOpenId,
      subtotal: subtotal,
    }
   
    disPayUser(data)
      .then(res => {
        if (res.result.code == 0) {
          var map = res.result.map;
       
          wx.requestPayment({
            nonceStr: map.nonceStr,
            package: map.package,
            signType: "MD5",
            timeStamp: map.timeStamp,
            paySign: map.paySign,

            success: function (resPay) {

              that._initData()
              
           
            },
            fail: function (res) {
              

            }
          })


        }
      })


  },

  toPayDetail(){
  wx.navigateTo({
    url: '../payDetail/payDetail',
  })
  },


  toPayPage(){
    wx.navigateTo({
      url: '../payPage/payPage',
    })
  },


  toBack(){
    wx.navigateBack({
      delta: 1
    })
  },


})