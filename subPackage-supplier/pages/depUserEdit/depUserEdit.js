var load = require('../../../lib/load.js');
import apiUrl from '../../../config/index.js'

import {
  updateJrdhUser,
  getJrdhUser
} from '../../../services/depOrder'

Page({

  onShow: function () {
    let windowInfo = wx.getWindowInfo();
    let globalData = getApp().globalData;
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
    });
  },

  data: {
    canSave: false,
    imgChanged: false,
  },

  onLoad: function (options) {
    this.setData({
      url: apiUrl.server,
    })

    var nxJrdhSellerValue = wx.getStorageSync('jrdhUserInfo');
    if (nxJrdhSellerValue) {
      this.setData({
        jrdhUserInfo: nxJrdhSellerValue,
        userName: nxJrdhSellerValue.nxJrdhWxNickName,
        src: this.data.url + nxJrdhSellerValue.nxJrdhWxAvartraUrl
      })
    }
  },

  choiceImg: function (e) {
    var _this = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        _this.setData({
          src: res.tempFilePaths,
          isSelectImg: true,
          imgChanged: true,
          canSave: true
        })
      },
    })
  },

  getUserName(e) {
    if (e.detail.value !== this.data.jrdhUserInfo.nxJrdhWxNickName) {
      this.setData({
        userName: e.detail.value,
        canSave: true,
      })
    }
  },

  save() {
    var that = this;
    var userName = this.data.userName;
    var userId = this.data.jrdhUserInfo.nxJrdhUserId;
    var tempFilePath = null;
    if (this.data.imgChanged && this.data.src) {
      var src = this.data.src;
      tempFilePath = Array.isArray(src) ? src[0] : src;
    }
    load.showLoading('保存修改内容');
    updateJrdhUser(userName, userId, tempFilePath).then(function (res) {
      load.hideLoading();
      var raw = res.result;
      var result = typeof raw === 'string' ? (function () {
        try {
          return JSON.parse(raw);
        } catch (e) {
          return {};
        }
      })() : raw;
      if (result.code === 0) {
        if (result.data) {
          wx.setStorageSync('jrdhUserInfo', result.data);
          var pages = getCurrentPages();
          var prev = pages[pages.length - 2];
          if (prev) {
            prev.setData({ jrdhUserInfo: result.data });
          }
          wx.navigateBack({ delta: 1 });
        } else {
          getJrdhUser(that.data.jrdhUserInfo.nxJrdhUserId).then(function (r2) {
            if (r2.result.code == 0) {
              wx.setStorageSync('jrdhUserInfo', r2.result.data);
              var pages = getCurrentPages();
              var prev = pages[pages.length - 2];
              if (prev) {
                prev.setData({ jrdhUserInfo: r2.result.data });
              }
              wx.navigateBack({ delta: 1 });
            }
          });
        }
      } else {
        wx.showToast({
          title: result.msg || '保存失败',
          icon: 'none',
        });
      }
    }).catch(function () {
      load.hideLoading();
      wx.showToast({ title: '网络异常，请重试', icon: 'none' });
    });
  },

  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },
})
