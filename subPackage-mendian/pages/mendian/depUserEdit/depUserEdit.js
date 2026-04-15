const globalData = getApp().globalData;
var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'


// import {
//   updateGbDepUserWithFile,
//   updateGbDepUser,
// } from '../../../../lib/apiDepOrder'

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

    //如果修改了图片
    if (this.data.imgChanged) {
      var filePathList = this.data.src;
      var userName = this.data.userName;
      var userId = this.data.userInfo.gbDepartmentUserId;
      var depId = this.data.userInfo.gbDuDepartmentId
      load.showLoading("保存修改内容")
      updateGbDepUserWithFile(filePathList, userName, userId,depId).then(res => {
        console.log("updateRetturrnDAta", res.result);

        let result = res.result;
        if (typeof result === 'string') {
          try {
            result = JSON.parse(result);
          } catch (e) {
            // 解析失败，处理异常
            wx.showToast({
              title: '返回数据格式错误',
              icon: 'none'
            });
            return;
          }
        }
        console.log("ressusososoosolutttttt===", result.data)
        if (result.code === 0) {
          load.hideLoading();
          this.setData({
            imgChanged: false
          })
          // ...
          wx.setStorageSync('userInfo', result.data);  
          var pages = getCurrentPages();
         
          var prevPage2 = pages[pages.length - 2];
          prevPage2.setData({
            userInfo: result.data,
          })
         
          wx.navigateBack({
            delta: 1
          })
        }


      })
    } else {
      //没有修改图片
      var userName = this.data.userName;
      var userId = this.data.userInfo.gbDepartmentUserId;
      var depId = this.data.userInfo.gbDuDepartmentId;
      var data = {
        userName: userName,
        userId: userId,
        depId: depId
      }
      load.showLoading("保存修改内容");
      updateGbDepUser(data).then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
        
          var pages = getCurrentPages();
          var prevPage = pages[pages.length - 2];
          prevPage.setData({
           userInfo: res.result.data.userInfo,
         
          })
        
         
          wx.navigateBack({
            delta: 1
          })
          wx.setStorageSync('depInfo', res.result.data.depInfo);
          wx.setStorageSync('userInfo', res.result.data.userInfo);

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
      detail: 1
    })
  }








})