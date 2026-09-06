var routes = require('../../utils/routes');

Page({
  toRegister: function () {
    wx.navigateTo({ url: routes.REGISTER });
  },
});
