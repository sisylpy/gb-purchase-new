var session = require('../../services/session');
var routes = require('../../utils/routes');
var pageUtil = require('../../utils/page');

Page({
  data: { resident: null, loggedIn: false },
  onShow: function () { var resident = wx.getStorageSync('marketplaceResident'); this.setData({ resident: resident || null, loggedIn: !!wx.getStorageSync('marketplaceResidentToken') }); },
  login: function () {
    var that = this;
    session.ensureLogin().then(function () { that.onShow(); wx.showToast({ title: '登录成功', icon: 'success' }); }).catch(function (error) { pageUtil.showError(error, '登录失败'); });
  },
  orders: function () { wx.reLaunch({ url: routes.ORDERS }); },
  clear: function () { wx.removeStorageSync('marketplaceResidentToken'); wx.removeStorageSync('marketplaceResident'); this.onShow(); }
});
