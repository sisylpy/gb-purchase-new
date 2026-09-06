/**
 * 平台饭店登录态：与 home 页共用 Storage 键名
 */
var config = require('../config/index');

function saveLoginSession(data) {
  if (!data) return;
  var marketId = data.marketId != null ? data.marketId : config.DEFAULT_MARKET_ID;
  wx.setStorageSync('userInfo', data.depUserInfo);
  wx.setStorageSync('disInfo', data.disInfo);
  wx.setStorageSync('mendianInfo', data.depInfo);
  wx.setStorageSync('depInfo', data.depInfo);
  wx.setStorageSync('marketId', marketId);
  wx.setStorageSync('platformMarketId', marketId);
  if (data.depInfo) {
    wx.setStorageSync('orderDepInfo', data.depInfo);
  }
}

function clearLoginSession() {
  wx.removeStorageSync('userInfo');
  wx.removeStorageSync('disInfo');
  wx.removeStorageSync('mendianInfo');
  wx.removeStorageSync('depInfo');
  wx.removeStorageSync('orderDepInfo');
  wx.removeStorageSync('marketId');
  wx.removeStorageSync('platformMarketId');
}

function isLoggedIn() {
  return !!wx.getStorageSync('userInfo');
}

function parseBody(res) {
  var body = res && res.result;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return null;
    }
  }
  return body;
}

module.exports = {
  saveLoginSession: saveLoginSession,
  clearLoginSession: clearLoginSession,
  isLoggedIn: isLoggedIn,
  parseBody: parseBody,
};
