/**
 * 注册页面
 * 从老项目 register.js 迁移，适配新项目的模块引用方式
 */

var requestUtil = require('../../lib/request');
var distributorApi = require('../../services/distributor');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    restaurantName: '',
    phone: '',
    address: '',
    avatarUrl: '',
    agreed: false,
    showTerms: false,
    canRegister: false,
    navBarHeight: 0,
    code: '',
  },

  onShow: function () {
    var app = getApp();
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
    });

    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      wx.redirectTo({
        url: '../index/index',
      });
    }
  },

  onLoad: function (options) {
    this._aaa();
  },

  _aaa: function () {
    var that = this;
    wx.login({
      success: function (res) {
        that.setData({ code: res.code });
      },
      fail: function () {
        wx.showToast({
          title: '请重新操作',
          icon: 'none'
        });
      }
    });
  },

  onRestaurantNameInput: function (e) {
    var value = e.detail.value;
    this.setData({ restaurantName: value });
    this._updateCanRegister(value, this.data.agreed);
  },

  onPhoneInput: function (e) {
    this.setData({ phone: e.detail.value });
  },

  onAddressInput: function (e) {
    this.setData({ address: e.detail.value });
  },

  onGetPhoneNumber: function (e) {
    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      // 解密获取真实手机号的逻辑
    } else {
      wx.showToast({
        title: '您未授权获取手机号',
        icon: 'none'
      });
    }
  },

  onSubmit: function () {
    if (!this.data.restaurantName) {
      wx.showToast({ title: '请输入餐厅名称', icon: 'none' });
      return;
    }
    if (!this.data.phone) {
      wx.showToast({ title: '请输入联系电话', icon: 'none' });
      return;
    }
  },

  onChooseAvatar: function (e) {
    var that = this;
    var avatarUrl = e.detail.avatarUrl;

    if (!that.data.restaurantName) {
      wx.showToast({ title: '请输入餐厅名称', icon: 'none' });
      return;
    }
    if (!that.data.phone) {
      wx.showToast({ title: '请输入联系电话', icon: 'none' });
      return;
    }
    if (!that.data.agreed) {
      wx.showToast({ title: '请先阅读并同意充值条款', icon: 'none' });
      return;
    }

    that.setData({ avatarUrl: avatarUrl });
    wx.showLoading({ title: '注册小程序订货客户', mask: true });

    distributorApi.gbRegisterWithFile(
      that.data.avatarUrl,
      that.data.restaurantName,
      that.data.code,
      that.data.phone,
      that.data.address
    ).then(function (res) {
      wx.hideLoading();
      console.log('注册返回:', res.result);
      var jsonObject = JSON.parse(res.result);
      if (jsonObject.code === 0) {
        console.log('res', jsonObject);
        wx.setStorageSync('disInfo', jsonObject.data.disInfo);
        wx.setStorageSync('userInfo', jsonObject.data.depUserInfo);
        wx.redirectTo({
          url: '../index/index?depId=' + jsonObject.data.disInfo.mendianDepartmentList[0].gbDepartmentId,
        });
      } else {
        wx.hideLoading();
        wx.showToast({
          title: jsonObject.msg || '注册失败',
          icon: 'none'
        });
      }
    }).catch(function (err) {
      wx.hideLoading();
      console.error('注册异常', err);
      wx.showToast({
        title: '网络异常',
        icon: 'none'
      });
    });
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  },

  onAgreementChange: function (e) {
    var checked = e.detail.value.includes('agree');
    this.setData({ agreed: checked });
    this._updateCanRegister(this.data.restaurantName, checked);
  },

  _updateCanRegister: function (restaurantName, agreed) {
    var canRegister = restaurantName.trim().length > 0 && agreed;
    this.setData({ canRegister: canRegister });
  },

  showTermsModal: function () {
    this.setData({ showTerms: true });
  },

  hideTermsModal: function () {
    this.setData({ showTerms: false });
  },

  preventClose: function () {
    // 空函数，阻止事件冒泡
  },

});
