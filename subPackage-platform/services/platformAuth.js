var requestUtil = require('../../lib/request');
var platformSession = require('./platformSession');
var platformConfig = require('../config');
var routes = require('../utils/routes');

function gbLoginIndex(code) {
  return requestUtil.get('gbdepartmentuser/gbLoginIndex/' + code);
}

/**
 * 首页静默登录：已注册则写入 Storage；未注册则游客浏览。
 */
function tryBootstrapLogin() {
  if (platformSession.isLoggedIn()) {
    return Promise.resolve({ status: 'ok' });
  }
  return new Promise(function (resolve) {
    wx.login({
      success: function (resLogin) {
        gbLoginIndex(resLogin.code).then(function (res) {
          var body = platformSession.parseBody(res);
          if (body && body.code === 0 && body.data) {
            var data = Object.assign({}, body.data, { marketId: platformConfig.DEFAULT_MARKET_ID });
            platformSession.saveLoginSession(data);
            resolve({ status: 'ok', data: data });
            return;
          }
          if (body && body.code === -1) {
            resolve({ status: 'guest' });
            return;
          }
          if (body && body.data === 'noBuyer') {
            resolve({ status: 'noBuyer' });
            return;
          }
          resolve({ status: 'guest' });
        }).catch(function () {
          resolve({ status: 'guest' });
        });
      },
      fail: function () {
        resolve({ status: 'guest' });
      },
    });
  });
}

/**
 * 点击商品/加购前：已登录则通过；未注册则跳转注册页。
 * @returns {Promise<boolean>}
 */
function ensureRegisteredForGoods() {
  if (platformSession.isLoggedIn()) {
    return Promise.resolve(true);
  }
  return new Promise(function (resolve) {
    wx.login({
      success: function (resLogin) {
        gbLoginIndex(resLogin.code).then(function (res) {
          var body = platformSession.parseBody(res);
          if (body && body.code === 0 && body.data) {
            var data = Object.assign({}, body.data, { marketId: platformConfig.DEFAULT_MARKET_ID });
            platformSession.saveLoginSession(data);
            resolve(true);
            return;
          }
          wx.navigateTo({ url: routes.REGISTER + '?from=goods' });
          resolve(false);
        }).catch(function () {
          wx.showToast({ title: '网络异常', icon: 'none' });
          resolve(false);
        });
      },
      fail: function () {
        wx.showToast({ title: '微信登录失败', icon: 'none' });
        resolve(false);
      },
    });
  });
}

module.exports = {
  gbLoginIndex: gbLoginIndex,
  tryBootstrapLogin: tryBootstrapLogin,
  ensureRegisteredForGoods: ensureRegisteredForGoods,
};
