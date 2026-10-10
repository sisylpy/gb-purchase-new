var api = require('./api');
var inflight = null;

function ensureLogin() {
  if (wx.getStorageSync('marketplaceResidentToken')) return Promise.resolve(true);
  if (inflight) return inflight;
  inflight = new Promise(function (resolve, reject) {
    wx.login({
      success: function (login) {
        if (!login.code) { reject(new Error('微信登录未返回登录码')); return; }
        api.wechatLogin(login.code).then(function (session) {
          wx.setStorageSync('marketplaceResidentToken', session.token);
          wx.setStorageSync('marketplaceResident', session);
          resolve(true);
        }).catch(reject);
      },
      fail: reject
    });
  }).then(function (result) { inflight = null; return result; }, function (error) { inflight = null; throw error; });
  return inflight;
}

function requireLogin(action) {
  return ensureLogin().then(action).catch(function (err) {
    wx.showModal({ title: '暂时无法登录', content: (err && err.message) || '请稍后重试', showCancel: false });
    throw err;
  });
}

module.exports = { ensureLogin: ensureLogin, requireLogin: requireLogin };
