const globalData = getApp().globalData;
var load = require('../../../lib/load.js');
import apiUrl from '../../../config.js'

import {
  updateJrdhUserWithFile,
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
    if (this.data.imgChanged) {
      var that = this;
      var filePathList = this.data.src;
      var userName = this.data.userName;
      var userId = this.data.jrdhUserInfo.nxJrdhUserId;
      load.showLoading("保存修改内容")
      updateJrdhUserWithFile(filePathList, userName, userId).then(res => {
        load.hideLoading();
        console.log(res)
        if (res.result == '{"code":0}') {
          getJrdhUser(that.data.jrdhUserInfo.nxJrdhUserId)
            .then(res => {
              if (res.result.code == 0) {
                wx.setStorageSync('jrdhUserInfo', res.result.data);
                var pages = getCurrentPages();
                var prevPage1 = pages[pages.length - 2];
                prevPage1.setData({
                  jrdhUserInfo: res.result.data,
                })
                wx.navigateBack({
                  delta: 1
                })
              }
            })
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
      })
    } else {
      var userName = this.data.userName;
      var userId = this.data.jrdhUserInfo.nxJrdhUserId;
      var data = {
        userName: userName,
        userId: userId,
      }
      load.showLoading("保存修改内容");
      updateJrdhUser(data).then(res => {
        if (res.result.code == 0) {
          console.log(res)
          load.hideLoading();
          wx.setStorageSync('jrdhUserInfo', res.result.data);
          var pages = getCurrentPages();
          var prevPage1 = pages[pages.length - 2];
          prevPage1.setData({
            jrdhUserInfo: res.result.data,
          })
          wx.navigateBack({
            delta: 1
          })
        } else {
          load.hideLoading();
          wx.showToast({
            title: '获取信息失败',
            icon: 'none'
          })
        }
      })
    }
  },

  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },
})
