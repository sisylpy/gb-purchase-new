var load = require('../../../../lib/load.js');
var apiUrl = require('../../../../config.js');
var apiDistributer = require('../../../../services/apiDistributer');

// ========================
// 本页面使用的接口方法（来自 apiDistributer）
// ========================
// apiDistributer.updateJjPurchaserUser(data)                    POST  gbdepartmentuser/updateJjPurchaserUser                    更新采购员信息
// apiDistributer.jjPurchaserUserUpdateWithFile(files, name, id) POST  gbdepartmentuser/jjPurchaserUserUpdateWithFile (uploadFile)  上传图片修改采购员
// ========================

Page({

  /** 页面初始数据 */
  data: {
    canSave: false,
    imgChanged: false,
  },

  /** 监听页面加载 */
  onLoad: function (options) {
    var globalData = getApp().globalData;
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
    });

    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
      });
    }
  },

  /** 选择图片并上传修改头像 */
  choiceImg: function (e) {
    var _this = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        _this.setData({
          src: res.tempFilePaths,
        });
        var filePathList = _this.data.src;
        var userName = _this.data.userInfo.gbDuWxNickName;
        var userId = _this.data.userInfo.gbDepartmentUserId;
        load.showLoading("保存修改内容");
        apiDistributer.jjPurchaserUserUpdateWithFile(filePathList, userName, userId).then(function (res) {
          var jsonObject = JSON.parse(res.result);
          load.hideLoading();
          if (jsonObject.code === 0) {
            _this.setData({
              userInfo: jsonObject.data,
            });
            var pages = getCurrentPages();
            var prevPage = pages[pages.length - 4];
            if (prevPage) {
              prevPage.setData({
                userInfo: jsonObject.data
              });
            }
            wx.setStorageSync('userInfo', jsonObject.data);
          } else {
            wx.showToast({
              title: '修改失败',
              icon: 'none'
            });
          }
        });
      },
      fail: function () {
        // 取消选择
      },
      complete: function () {
        // 完成
      }
    });
  },

  /** 获取用户名输入 */
  getUserName: function (e) {
    if (e.detail.value !== this.data.userInfo.gbDuWxNickName && e.detail.value.length > 0) {
      var data = "userInfo.gbDuWxNickName";
      this.setData({
        data: e.detail.value,
        canSave: true,
      });
    } else {
      var data2 = "userInfo.gbDuWxNickName";
      this.setData({
        data2: "",
        canSave: false
      });
    }
  },

  /** 保存修改内容 */
  save: function () {
    var _this = this;
    apiDistributer.updateJjPurchaserUser(this.data.userInfo).then(function (res) {
      if (res.result.code == 0) {
        load.hideLoading();
        var pages = getCurrentPages();
        var prevPage = pages[pages.length - 4];
        if (prevPage) {
          prevPage.setData({
            userInfo: res.result.data
          });
        }
        wx.setStorageSync('userInfo', res.result.data);
        wx.navigateBack({ delta: 1 });
      } else {
        load.hideLoading();
        wx.showToast({
          title: '获取信息失败',
          icon: 'none'
        });
      }
    });
  },

  /** 返回上一页 */
  toBack: function () {
    wx.navigateBack({
      delta: 1,
    });
  }

});
