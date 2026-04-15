const globalData = getApp().globalData;
var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'


// import {
//   jjPurchaserUserUpdateWithFile,
//   updateJjPurchaserUser,
//   disLogin
// } from '../../../../lib/apiDistributer'

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
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      url: apiUrl.server,

    })

    var supplierItem = wx.getStorageSync('supplierItem');
    if (supplierItem) {
      this.setData({
        supplierItem: supplierItem,
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
        })
        console.log("savefileleel");
        var filePathList = _this.data.src;
        var userName = _this.data.userInfo.gbDuWxNickName;
        var userId = _this.data.userInfo.gbDepartmentUserId;
        var depId = _this.data.userInfo.gbDuDepartmentFatherId;
        load.showLoading("保存修改内容")
        jjPurchaserUserUpdateWithFile(filePathList, userName, userId).then(res => {
          const jsonObject = JSON.parse(res.result);
          console.log("jsobdjdd", jsonObject.data)
          load.hideLoading();
          if (jsonObject.code === 0) {
            _this.setData({
              userInfo: jsonObject.data,
            })
            let pages = getCurrentPages();
          let prevPage = pages[pages.length - 4];
          prevPage.setData({
            userInfo: jsonObject.data
          })
            wx.setStorageSync('userInfo', jsonObject.data)
            
          }else{
            wx.showToast({
              title: '修改失败',
              icon: 'none'
            })
          }   
        })
        // _this._checkSave();
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
    if(e.detail.value !== this.data.userInfo.gbDuWxNickName && e.detail.value.length > 0){
      var data = "userInfo.gbDuWxNickName";
      this.setData({
        [data]: e.detail.value,
        canSave: true,
      })
    }else{
      this.setData({
        [data]: "",
        canSave: false
      })
    }
   

  },

/**
 * 保存修改内容
 */
  save() {

    updateJjPurchaserUser(this.data.userInfo).then(res => {
      if (res.result.code == 0) {
      load.hideLoading();
      let pages = getCurrentPages();
      let prevPage = pages[pages.length - 4];
      prevPage.setData({
        userInfo: res.result.data
      })
        wx.setStorageSync('userInfo', res.result.data)
        wx.navigateBack({delta: 1});
    }else{
      load.hideLoading();
      wx.showToast({
        title: '获取信息失败',
        icon: 'none'
      })
    }
    })
  },

  

  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  }
  

   






})