const globalData = getApp().globalData;
var load = require('../../lib/load.js');
var apiUrl = require('../../config/index.js');
const { gbLogin } = require('../../services/apiDistributerGbUser.js');

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    canIUseGetUserProfile: false,
    currentSlide: 0, // Swiper 当前页
    autoplay: true,
    url: "",
  },
  onShow: function () {
     // 推荐直接用新API
     let windowInfo = wx.getWindowInfo();
     let globalData = getApp().globalData;
     this.setData({
       windowWidth: windowInfo.windowWidth * globalData.rpxR,
       windowHeight: windowInfo.windowHeight * globalData.rpxR,
       navBarHeight: globalData.navBarHeight * globalData.rpxR,
       statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
     });


    this.setData({
      autoplay: false, // 停止自动切换
    });
  
    // 延迟启动 autoplay，确保 swiper 正常加载后重启
    setTimeout(() => {
      this.setData({
        autoplay: true,
        currentSlide: 0,

      });
    }, 100); // 延迟 100ms
  },

  
  onLoad: function (options) {
    this.setData({
      url: apiUrl.server,
      disId: options.disId,
      disName: options.disName,

    })

    this._userLogin();
 
  },


  //swiper one before
  _userLogin() {
    wx.login({
      success: (resLogin) => {
        gbLogin(resLogin.code)
          .then((res) => {
            if (res.result.code !== -1) {
              console.log(res.result.data)
              this.setData({
                disInfo: res.result.data.disInfo,
                userDisId: res.result.data.disInfo.gbDistributerId
              })
              wx.setStorageSync('disInfo', res.result.data.disInfo);
              wx.setStorageSync('userInfo', res.result.data.depUserInfo);
              if(this.data.userDisId == this.data.disId){
                this.setData({
                  inviter: true,
                })
              }else{
                wx.redirectTo({
                  url: '../index/index',
                })
              }
              //跳转到首页
            } else {
               this.setData({
                 inviter: false
               })
            }
          })
      }
    })
  },

  toEditUser(){
    wx.redirectTo({
      url: '../index/index',
    })
  },

  onSwiperChange(e) {
    const current = e.detail.current;
    this.setData({ currentSlide: current });
  },

  toNext(){

    wx.navigateTo({
      url: '../inviteRegister/inviteRegister?disId=' + this.data.disId,
    })

    
  
  },

  
});
