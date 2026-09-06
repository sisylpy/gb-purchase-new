/**
 * 京采平台 - 我的 Tab（子包）
 */
var pageLayout = require('../../../lib/pageLayout');
var platformCart = require('../../utils/platformCart');

Page({
  data: {
    userInfo: null,
    mendianInfo: null,
    statusBarHeight: 20,
    scrollTopPadding: 64,
    cartBadge: ''
  },

  onShow: function () {
    var that = this;
    pageLayout.applyPlatformTabLayout(this, 'mine', {
      headerKind: 'profile'
    });
    this.setData({
      userInfo: wx.getStorageSync('userInfo'),
      mendianInfo: wx.getStorageSync('mendianInfo')
    });
    platformCart.refreshTabBadgeFromServer().then(function (count) {
      that.setData({
        cartBadge: count > 0 ? (count > 99 ? '99+' : String(count)) : ''
      });
    });
  }
});
