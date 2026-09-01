var request = require('../lib/request');

function qyLoginCode() {
  return new Promise(function (resolve, reject) {
    if (!wx.qy || typeof wx.qy.login !== 'function') {
      reject(new Error('请从企业微信工作台或企微通知进入'));
      return;
    }
    wx.qy.login({
      success: function (res) {
        if (res && res.code) resolve(res.code);
        else reject(new Error('未获取到企微身份'));
      },
      fail: reject,
    });
  });
}

function postWithMember(path, data) {
  return qyLoginCode().then(function (code) {
    return request.post('wecom/jczb/support/temp-goods/' + path,
      Object.assign({}, data || {}, { code: code }), { showErrorToast: false });
  });
}

module.exports = {
  list: function (scope) {
    return postWithMember('list', { scope: scope || 'OPEN' });
  },
  claim: function (taskId) {
    return postWithMember('claim', { taskId: taskId });
  },
  release: function (taskId) {
    return postWithMember('release', { taskId: taskId });
  },
  searchCatalog: function (keyword) {
    return postWithMember('catalog/search', { keyword: keyword, page: 1, pageSize: 30 });
  },
  promote: function (taskId, nxGoodsId) {
    return postWithMember('promote', { taskId: taskId, nxGoodsId: nxGoodsId });
  },
  createSiblingAndPromote: function (taskId, referenceNxGoodsId) {
    return postWithMember('create-sibling-and-promote', {
      taskId: taskId,
      referenceNxGoodsId: referenceNxGoodsId,
    });
  },
};
