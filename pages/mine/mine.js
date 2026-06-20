/**
 * 京采市场 - 我的 Tab
 */
var pageLayout = require('../../lib/pageLayout');

Page({
  data: {
    userInfo: null,
    mendianInfo: null,
    statusBarHeight: 20,
    scrollTopPadding: 64
  },

  onShow: function () {
    pageLayout.applyPlatformTabLayout(this, 'mine', {
      headerKind: 'profile'
    });
    this.setData({
      userInfo: wx.getStorageSync('userInfo'),
      mendianInfo: wx.getStorageSync('mendianInfo')
    });
  }
});
