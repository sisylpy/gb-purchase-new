var app = getApp();
var api = require('../../../services/franchiseInspection');

Page({
  data: {
    navBarHeight: 0,
    userCode: '',
    submitting: false,
    error: '',
    approved: false,
  },

  onLoad: function () {
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR });
  },

  inputCode: function (event) {
    this.setData({
      userCode: String(event.detail.value || '').replace(/\s+/g, '').toUpperCase().slice(0, 8),
      error: '',
      approved: false,
    });
  },

  approve: function () {
    var that = this;
    var code = String(this.data.userCode || '').trim();
    if (code.length !== 8 || this.data.submitting) return;
    wx.showModal({
      title: '确认电脑端登录',
      content: '确认后，正在显示此登录码的电脑将进入你的加盟总部工作台。',
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
            error: error && error.message ? error.message : '登录确认失败，请重新获取登录码',
          });
        });
      },
    });
  },

  toBack: function () { wx.navigateBack(); },
});
