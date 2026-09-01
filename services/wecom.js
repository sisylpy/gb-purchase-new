/** 京采账本在企业微信内打开时，静默绑定当前企微成员。 */
var requestUtil = require('../lib/request');

function qyLoginCode() {
  return new Promise(function (resolve, reject) {
    if (!wx.qy || typeof wx.qy.login !== 'function') {
      resolve('');
      return;
    }
    wx.qy.login({
      success: function (res) {
        resolve(res && res.code ? res.code : '');
      },
      fail: reject,
    });
  });
}

function syncCurrentMember() {
  return qyLoginCode().then(function (code) {
    if (!code) {
      return { supported: false, bound: false };
    }
    return requestUtil.post('wecom/jczb/bind', { code: code }, {
      showErrorToast: false,
    }).then(function (res) {
      return (res.result && res.result.data) || { supported: true, bound: false };
    });
  });
}

module.exports = {
  syncCurrentMember: syncCurrentMember,
};
