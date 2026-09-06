var requestUtil = require('../lib/request');
var platformSession = require('./platformSession');
var config = require('../config/index');

var REGISTER_URL = '/subPackage-platform/pages/register/register';

function gbLoginIndex(code) {
  return requestUtil.get('gbdepartmentuser/gbLoginIndex/' + code);
}

/**
 * 点击商品/加购前：已登录则通过；未注册则跳转注册页。
 * @returns {Promise<boolean>} true 可继续，false 已跳转注册
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
            var data = Object.assign({}, body.data, { marketId: config.DEFAULT_MARKET_ID });
            platformSession.saveLoginSession(data);
            resolve(true);
            return;
          }
          if (body && body.code === -1) {
            wx.navigateTo({ url: REGISTER_URL });
            resolve(false);
            return;
          }
          wx.showToast({ title: (body && body.msg) || '请先注册饭店账号', icon: 'none' });
          wx.navigateTo({ url: REGISTER_URL });
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
  ensureRegisteredForGoods: ensureRegisteredForGoods,
  REGISTER_URL: REGISTER_URL,
};
