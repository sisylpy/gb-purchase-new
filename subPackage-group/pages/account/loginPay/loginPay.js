const globalData = getApp().globalData;
import apiUrl from '../../../../config/index.js'
var load = require('../../../../lib/load.js');

// import {
//   gbLogin
// } from '../../../../lib/apiDistributer'

Page({


  /**
   * 页面的初始数据
   */
  data: {

    restaurantName: '',
    phone: '',
    address: '',
    avatarUrl: '' // 选

  },

  onShow() {
     // 推荐直接用新API
     let windowInfo = wx.getWindowInfo();
     let globalData = getApp().globalData;
     this.setData({
       windowWidth: windowInfo.windowWidth * globalData.rpxR,
       windowHeight: windowInfo.windowHeight * globalData.rpxR,
       navBarHeight: globalData.navBarHeight * globalData.rpxR,
     });

    var userInfo = wx.getStorageSync('userInfo');
   if(userInfo){
     wx.redirectTo({
       url: '../payList/payList',
     })
   }

  },

  onLoad: function (options) {
    this.setData({
      url: apiUrl.server,
    })
 
    this._aaa();
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


  toBack() {
    wx.navigateBack({delta: 1});
  },

})
