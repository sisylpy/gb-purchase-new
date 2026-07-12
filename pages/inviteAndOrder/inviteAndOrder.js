

const app = getApp()
const globalData = getApp().globalData;
var requestUtil = require('../../lib/request');

Page({

  
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


  },

  
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: requestUtil.getServerUrl(),
    })
    var disInfo = wx.getStorageSync('disInfo');
    if(disInfo){
      this.setData({
        disInfo: disInfo
      })
    }

  },


  pasteAppToNx(){
    var disId = this.data.disInfo.gbDistributerId;
    var disName = this.data.disInfo.gbDistributerName;
    console.log('disId=' + disId)
     var url = 'weixin://dl/business/?appid=wx87baf9dcf935518a&path=pages/loginInvite/loginInvite&query=gbDisId='+ disId +'&disName=' + disName +'&env_version=release';
    wx.setClipboardData({
      data: url,
      success() {
        wx.showToast({
          title: '链接已复制，请发送给配送商',
          icon: 'success',
          duration: 2000
        });
      },
      fail() {
        wx.showToast({
          title: '复制失败，请重试',
          icon: 'error',
          duration: 2000
        });
      }
    });
    

  },

  
  toBack(){
    wx.navigateBack({delta: 1});
  }









})