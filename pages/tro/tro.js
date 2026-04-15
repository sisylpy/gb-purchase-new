/**
 * 引导介绍页 - 迁移自老项目 pages/tro/tro.js
 * 使用 CommonJS 统一模块规范
 */

var app = getApp();
var requestUtil = require('../../lib/request');

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    canIUseGetUserProfile: false,
    currentSlide: 0,
    autoplay: true,
    url: "",
  },

  onShow: function () {
    var windowInfo = wx.getWindowInfo();
    var globalData = app.globalData;
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      autoplay: false,
    });

    setTimeout(function () {
      this.setData({
        autoplay: true,
        currentSlide: 0,
      });
    }.bind(this), 100);
  },

  onLoad: function (options) {
    this.setData({
      windowWidth: app.globalData.windowWidth * app.globalData.rpxR,
      windowHeight: app.globalData.windowHeight * app.globalData.rpxR,
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      url: requestUtil.getServerUrl(),
    });
  },

  onSwiperChange: function (e) {
    var current = e.detail.current;
    this.setData({ currentSlide: current });
  },

  toNext: function () {
    wx.navigateTo({
      url: '../register/register',
    });
  },
});
