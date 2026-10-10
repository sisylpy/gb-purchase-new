var request = require('../../lib/request');
var config = require('../../config/index');

var OPTS = { backend: 'nx', handleUnauthorized: false };

function parse(res) {
  var body = res && res.result;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }
  if (!body || body.code !== 0) throw new Error((body && body.msg) || '服务暂不可用');
  return body.data;
}

function isUnauthorized(error) {
  return !!(error && Number(error.statusCode) === 401);
}

function clearResidentSession() {
  wx.removeStorageSync('marketplaceResidentToken');
  wx.removeStorageSync('marketplaceResident');
}

function post(path, data, authKind, loadingText) {
  var headers = {};
  if (authKind === 'resident') headers['X-Marketplace-Resident-Token'] = wx.getStorageSync('marketplaceResidentToken');
  if (authKind === 'merchant') headers['X-Marketplace-Merchant-Token'] = wx.getStorageSync('marketplaceMerchantToken');
  return request.post('marketplace/' + path, data || {}, Object.assign({}, OPTS, {
    headers: headers,
    showLoading: !!loadingText,
    loadingText: loadingText || ''
  })).then(parse).catch(function (error) {
    if (authKind === 'resident' && isUnauthorized(error)) {
      clearResidentSession();
      error.marketplaceUnauthorized = true;
      error.message = '登录已失效，请重新登录';
    }
    throw error;
  });
}

function marketId() {
  return Number(wx.getStorageSync('marketplaceMarketId') || config.MARKETPLACE_DEFAULT_MARKET_ID || 1);
}

module.exports = {
  marketId: marketId,
  home: function () { return post('public/home', { marketId: marketId() }); },
  merchants: function (categoryId, keyword) { return post('public/merchants', { marketId: marketId(), categoryId: categoryId || null, keyword: keyword || '' }); },
  merchantGoods: function (merchantId, categoryId, keyword) { return post('public/merchant/goods', { marketId: marketId(), merchantId: Number(merchantId), categoryId: categoryId || null, keyword: keyword || '' }); },
  wechatLogin: function (code) { return post('resident/auth/wechat', { marketId: marketId(), code: code }); },
  cart: function () { return post('resident/cart', {}, 'resident'); },
  putCart: function (goodsId, quantity, remark) { return post('resident/cart/put', { goodsId: Number(goodsId), quantity: quantity, remark: remark || '' }, 'resident', '加入购物车'); },
  removeCart: function (cartLineId) { return post('resident/cart/remove', { cartLineId: cartLineId }, 'resident'); },
  submitOrder: function (payload) { return post('resident/orders/submit', payload, 'resident', '提交订单'); },
  orders: function () { return post('resident/orders', {}, 'resident'); },
  orderDetail: function (orderId) { return post('resident/orders/detail', { orderId: orderId }, 'resident'); }
};
