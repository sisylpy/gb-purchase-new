var app = getApp();
var api = require('../../../../services/franchiseInspection');
var util = require('../../../../utils/franchiseInspection');

Page({
  data: {
    navBarHeight: 0,
    restaurantName: '',
    loading: false,
    upgradeCode: '',
    expiresAt: '',
    error: '',
  },

  onLoad: function () {
    var mendian = wx.getStorageSync('mendianInfo') || {};
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      restaurantName: mendian.gbDepartmentName || '当前餐馆',
    });
  },

  createCode: function () {
    if (this.data.loading) return;
    this.setData({ loading: true, error: '' });
    api.createRestaurantUpgradeTicket({
      idempotencyKey: util.persistentKey('restaurant-franchise-upgrade', 'restaurant-upgrade'),
    }).then(function (data) {
      this.setData({
        loading: false,
        upgradeCode: data.upgradeCode,
        expiresAt: String(data.expiresAt || '').replace('T', ' ').slice(0, 16),
      });
    }.bind(this)).catch(function (error) {
      this.setData({ loading: false, error: error.message || '升级码生成失败，请稍后重试' });
    }.bind(this));
  },

  copyCode: function () {
    if (!this.data.upgradeCode) return;
    wx.setClipboardData({ data: this.data.upgradeCode });
  },

  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
