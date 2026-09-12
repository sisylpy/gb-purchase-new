var app = getApp();

Page({
  data: {
    navBarHeight: 0,
  },
  onLoad: function () {
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR });
  },
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
