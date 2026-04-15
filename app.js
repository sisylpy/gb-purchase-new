// app.js
var config = require('./config/index');

App({
  onLaunch: function () {
    console.log('[app] 当前环境:', config.ENV, '| apiUrl:', config.apiUrl, '| server:', config.server);

    var windowInfo = wx.getWindowInfo();
    var device = wx.getDeviceInfo();
    var isIOS = device.system.indexOf('iOS') > -1;

    var menuButtonInfo = wx.getMenuButtonBoundingClientRect();
    var statusBarHeight = windowInfo.statusBarHeight;
    var navBarHeight = menuButtonInfo.bottom + menuButtonInfo.top - statusBarHeight;

    this.globalData = {
      windowWidth: windowInfo.windowWidth,
      windowHeight: windowInfo.windowHeight,
      screenHeight: windowInfo.screenHeight,
      screenWidth: windowInfo.screenWidth,
      statusBarHeight: statusBarHeight,
      rpxR: 750 / windowInfo.windowWidth,
      navBarContentHeight: isIOS ? 44 : 48,
      navBarHeight: navBarHeight,
      userInfo: null,
      menuButtonInfo: menuButtonInfo,
      server: config.server,
    };

    // 版本更新检测
    if (wx.canIUse('getUpdateManager')) {
      var updateManager = wx.getUpdateManager();
      updateManager.onUpdateReady(function () {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: function (res) {
            if (res.confirm) {
              updateManager.applyUpdate();
            }
          }
        });
      });
      updateManager.onUpdateFailed(function () {
        wx.showModal({
          title: '更新提示',
          content: '新版本下载失败，请检查网络设置',
          showCancel: false
        });
      });
    }
  },

  globalData: {}
});
