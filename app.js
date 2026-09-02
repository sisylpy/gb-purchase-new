// app.js
var config = require('./config/index');

function getLegacySystemInfo() {
  if (typeof wx.getSystemInfoSync !== 'function') {
    return {};
  }
  try {
    return wx.getSystemInfoSync() || {};
  } catch (error) {
    console.warn('[app] getSystemInfoSync unavailable:', error);
    return {};
  }
}

function getWindowInfo(legacyInfo) {
  if (typeof wx.getWindowInfo === 'function') {
    try {
      return wx.getWindowInfo() || legacyInfo;
    } catch (error) {
      console.warn('[app] getWindowInfo failed, use compatibility data:', error);
    }
  }
  return legacyInfo;
}

function getDeviceInfo(legacyInfo) {
  if (typeof wx.getDeviceInfo === 'function') {
    try {
      return wx.getDeviceInfo() || legacyInfo;
    } catch (error) {
      console.warn('[app] getDeviceInfo failed, use compatibility data:', error);
    }
  }
  return legacyInfo;
}

function getMenuButtonInfo(statusBarHeight, navBarContentHeight, windowWidth) {
  if (typeof wx.getMenuButtonBoundingClientRect === 'function') {
    try {
      var rect = wx.getMenuButtonBoundingClientRect();
      if (rect && Number(rect.bottom) > Number(rect.top)) {
        return rect;
      }
    } catch (error) {
      console.warn('[app] getMenuButtonBoundingClientRect failed, use compatibility data:', error);
    }
  }

  var top = statusBarHeight + 4;
  var height = Math.max(navBarContentHeight - 8, 32);
  return {
    top: top,
    bottom: top + height,
    left: Math.max(windowWidth - 96, 0),
    right: Math.max(windowWidth - 8, 0),
    width: 88,
    height: height,
  };
}

function positiveNumber(value, fallback) {
  var result = Number(value);
  return isFinite(result) && result > 0 ? result : fallback;
}

App({
  onLaunch: function () {
    console.log('[app] 当前环境:', config.ENV, '| apiUrl:', config.apiUrl, '| server:', config.server);

    var legacyInfo = getLegacySystemInfo();
    var windowInfo = getWindowInfo(legacyInfo);
    var device = getDeviceInfo(legacyInfo);
    var systemName = String(device.system || legacyInfo.system || '');
    var isIOS = systemName.indexOf('iOS') > -1;
    var windowWidth = positiveNumber(windowInfo.windowWidth || legacyInfo.windowWidth, 375);
    var windowHeight = positiveNumber(windowInfo.windowHeight || legacyInfo.windowHeight, 667);
    var screenWidth = positiveNumber(windowInfo.screenWidth || legacyInfo.screenWidth, windowWidth);
    var screenHeight = positiveNumber(windowInfo.screenHeight || legacyInfo.screenHeight, windowHeight);
    var statusBarHeight = Math.max(Number(windowInfo.statusBarHeight || legacyInfo.statusBarHeight) || 0, 0);
    var navBarContentHeight = isIOS ? 44 : 48;
    var menuButtonInfo = getMenuButtonInfo(statusBarHeight, navBarContentHeight, windowWidth);
    var navBarHeight = positiveNumber(
      Number(menuButtonInfo.bottom) + Number(menuButtonInfo.top) - statusBarHeight,
      statusBarHeight + navBarContentHeight
    );

    this.globalData = {
      windowWidth: windowWidth,
      windowHeight: windowHeight,
      screenHeight: screenHeight,
      screenWidth: screenWidth,
      statusBarHeight: statusBarHeight,
      rpxR: 750 / windowWidth,
      navBarContentHeight: navBarContentHeight,
      navBarHeight: navBarHeight,
      userInfo: null,
      menuButtonInfo: menuButtonInfo,
      server: config.server,
    };

    // 版本更新检测
    if (typeof wx.canIUse === 'function' && wx.canIUse('getUpdateManager')) {
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
