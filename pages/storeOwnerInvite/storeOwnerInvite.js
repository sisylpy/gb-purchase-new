const globalData = getApp().globalData;
var franchiseApi = require('../../services/franchiseInspection');

Page({
  data: {
    lookup: '',
    loading: true,
    saving: false,
    summary: null,
    userName: '',
    error: '',
    relayMode: false,
  },

  onLoad: function (options) {
    var lookup = String(options.inviteToken || options.inviteCode || options.scene || '').trim();
    this.setData({
      lookup: lookup,
      relayMode: String(options.relay || '') === '1',
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
    });
    if (!lookup) {
      this.setData({ loading: false, error: '门店邀请无效' });
      return;
    }
    this.loadSummary();
  },

  loadSummary: function () {
    var that = this;
    this.setData({ loading: true, error: '' });
    franchiseApi.getStoreOwnerInvitationSummary(this.data.lookup).then(function (summary) {
      that.setData({ loading: false, summary: summary });
    }).catch(function (error) {
      that.setData({ loading: false, error: error.message || '邀请信息加载失败' });
    });
  },

  inputName: function (event) {
    this.setData({ userName: event.detail.value, error: '' });
  },

  accept: function () {
    if (this.data.saving || !this.data.summary || !this.data.summary.acceptable) return;
    var userName = String(this.data.userName || '').trim();
    if (!userName) {
      this.setData({ error: '请输入本店老板姓名' });
      return;
    }
    var that = this;
    this.setData({ saving: true, error: '' });
    wx.showLoading({ title: '正在注册门店' });
    franchiseApi.acceptStoreOwnerInvitation(this.data.lookup, { userName: userName }).then(function () {
      wx.hideLoading();
      wx.showToast({ title: '注册成功', icon: 'success' });
      setTimeout(function () { wx.reLaunch({ url: '/pages/index/index' }); }, 500);
    }).catch(function (error) {
      wx.hideLoading();
      that.setData({ saving: false, error: error.message || '注册失败，请重试' });
    });
  },

  onShareAppMessage: function () {
    var summary = this.data.summary || {};
    return {
      title: (summary.storeName || '门店') + '邀请你注册精彩账本',
      path: '/pages/storeOwnerInvite/storeOwnerInvite?inviteToken=' + encodeURIComponent(this.data.lookup),
    };
  },

  toBack: function () {
    if (this.data.relayMode && wx.navigateBackMiniProgram) {
      wx.navigateBackMiniProgram();
      return;
    }
    wx.navigateBack({ delta: 1 });
  },
});
