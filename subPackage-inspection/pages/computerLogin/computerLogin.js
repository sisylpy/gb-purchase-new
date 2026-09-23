var app = getApp();
var api = require('../../../services/franchiseInspection');

Page({
  data: {
    navBarHeight: 0,
    submitting: false,
    error: '',
    approved: false,
  },

  onLoad: function () {
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR });
  },

  scanLoginQrCode: function () {
    var that = this;
    if (this.data.submitting || this.data.approved) return;
    wx.scanCode({
      onlyFromCamera: true,
      scanType: ['qrCode'],
      success: function (result) {
        var code = that.parseLoginCode(result && result.result);
        if (!code) {
          that.setData({ error: '这不是精彩账本加盟经营工作台的登录二维码' });
          return;
        }
        that.approve(code);
      },
      fail: function (error) {
        if (error && String(error.errMsg || '').indexOf('cancel') >= 0) return;
        that.setData({ error: '未能识别二维码，请重新扫描' });
      },
    });
  },

  parseLoginCode: function (value) {
    var matched = /^jczb-franchise:\/\/web-login\?code=([23456789A-HJ-NP-Z]{8})$/i
      .exec(String(value || '').trim());
    return matched ? decodeURIComponent(matched[1]).toUpperCase() : '';
  },

  approve: function (code) {
    var that = this;
    if (!code || this.data.submitting) return;
    wx.showModal({
      title: '确认电脑端登录',
      content: '确认后，刚才扫描二维码的电脑将进入你的加盟经营工作台。',
      confirmText: '确认登录',
      success: function (result) {
        if (!result.confirm) return;
        that.setData({ submitting: true, error: '' });
        api.ensureToken(false).then(function () {
          return api.approveWebLogin(code);
        }).then(function () {
          that.setData({ submitting: false, approved: true });
        }).catch(function (error) {
          that.setData({
            submitting: false,
            error: error && error.message ? error.message : '登录确认失败，请在电脑端重新获取二维码',
          });
        });
      },
    });
  },

  toBack: function () { wx.navigateBack(); },
});
