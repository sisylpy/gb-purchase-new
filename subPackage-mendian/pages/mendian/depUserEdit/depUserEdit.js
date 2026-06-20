const globalData = getApp().globalData;
var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config/index.js'

const { updateGbDepUserWithFile } = require('../../../../services/apiGbDepartmentUser.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {

    canSave: false,
    imgChanged: false,


  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,

    })

    var depInfo = wx.getStorageSync('depInfo');
    if (depInfo) {
      this.setData({
        depInfo: depInfo,
      })
    }

    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        userName: userInfo.gbDuWxNickName,
        src: this.data.url + userInfo.gbDuWxAvartraUrl,
      })

    }

  },


  //选择图片
  choiceImg: function (e) {
    var _this = this;

    wx.chooseImage({
      count: 1, // 最多可以选择的图片张数，默认9
      sizeType: ['original', 'compressed'], // original 原图，compressed 压缩图，默认二者都有
      sourceType: ['album', 'camera'], // album 从相册选图，camera 使用相机，默认二者都有
      success: function (res) {
        _this.setData({
          src: res.tempFilePaths,
          isSelectImg: true,
          imgChanged: true,
          canSave: true
        })
      },
      fail: function () {
        // fail
      },
      complete: function () {
        // complete
      }
    })

  },


  /**
   * 获取用户名
   * @param {*} e 
   */
  getUserName(e) {
    if (e.detail.value !== this.data.userInfo.gbDuWxNickName) {
      this.setData({
        userName: e.detail.value,
        canSave: true,
      })
    } else {
      if (this.data.src == this.data.url + this.data.userInfo.gbDuWxAvartraUrl) {
        this.setData({
          canSave: false
        })
      }

    }


  },

  /**
   * 修改显示周期
   * @param {}} e 
   */
  radioChange: function (e) {
    this.setData({
      weeks: e.detail.value,
      canSave: true,
    })
  },

  /**
   * 保存修改内容
   */
  save() {
    var that = this;
    var userName = this.data.userName;
    var userId = this.data.userInfo.gbDepartmentUserId;
    var depId = this.data.userInfo.gbDuDepartmentId;
    var tempFilePath = null;
    if (this.data.imgChanged && this.data.src) {
      var src = this.data.src;
      tempFilePath = Array.isArray(src) ? src[0] : src;
    }
    load.showLoading('保存修改内容');
    updateGbDepUserWithFile(userName, userId, depId, tempFilePath).then(function (res) {
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
        var d = result.data;
        var userInfo = d && d.userInfo ? d.userInfo : d;
        var depInfo = d && d.depInfo ? d.depInfo : null;
        if (depInfo) {
          wx.setStorageSync('depInfo', depInfo);
        }
        wx.setStorageSync('userInfo', userInfo);
        that.setData({ imgChanged: false });
        var pages = getCurrentPages();
        var prev = pages[pages.length - 2];
        if (prev) {
          prev.setData({ userInfo: userInfo });
        }
        wx.navigateBack({ delta: 1 });
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
      delta: 1
    })
  }








})