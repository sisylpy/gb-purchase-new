var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil');
var apiUrl = require('../../../../config/index.js');
var apiDistributer = require('../../../../services/apiDistributer');

Page({

  onShow: function () {
    if (this.data.update) {
      var myDate = wx.getStorageSync('myDate');
      if (myDate) {
        this.setData({
          startDate: dateUtils.getDateRange(myDate.name).startDate,
          stopDate: dateUtils.getDateRange(myDate.name).stopDate,
          dateType: myDate.dateType,
          hanzi: myDate.hanzi,
        });
      }
      this._initData();
    }
  },

  onLoad: function (options) {
    var globalData = getApp().globalData;

    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        disId: userInfo.gbDuDistributerId,
        userInfo: userInfo,
      });
    }

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      purUserId: options.purUserId,
      startDate: options.startDate,
      stopDate: options.stopDate,
      dateType: options.dateType
    });

    var purUserItem = wx.getStorageSync('purUserItem');
    if (purUserItem) {
      this.setData({
        purUserItem: purUserItem
      });
    }

    this._initData();
  },

  _initData: function () {
    var _this = this;
    var data = {
      disId: this.data.disId,
      purUserId: this.data.purUserId,
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
    };

    load.showLoading("获取数据中");
    apiDistributer.getPurUserDate(data)
      .then(function (res) {
        if (res.result.code == 0) {
          load.hideLoading();
          _this.setData({
            purUser: res.result.data,
            zicaiArr: res.result.data.zicaiArr
          });
        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg || '获取数据失败',
            icon: 'none'
          });
        }
      })
      .catch(function (error) {
        load.hideLoading();
        console.error('API调用失败:', error);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      });
  },

  toDetail: function (e) {
    var day = e.currentTarget.dataset.item.day;
    var value = e.currentTarget.dataset.item.zicai;
    wx.navigateTo({
      url: '../purUserDayDeatil/purUserDayDeatil?date=' + day + '&value=' + value + '&purUserId=' + this.data.purUserId,
    });
  },

  toDatePage: function () {
    this.setData({
      update: false,
    });
    wx.navigateTo({
      url: '../../sel/searchDate/searchDate?startDate=' + this.data.startDate +
        '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType,
    });
  },

  toBack: function () {
    wx.navigateBack({
      delta: 1,
    });
  },

  onUnload: function () {
    wx.removeStorageSync('supplierItem');
    wx.removeStorageSync('purUserItem');
  },

});
