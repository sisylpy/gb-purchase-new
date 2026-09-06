/**
 * 平台购物车 / Checkout / 支付意图 API（走 nx / nongxinle 后端）
 */
var requestUtil = require('../../lib/request');
var platformCart = require('../utils/platformCart');

var NX_OPTS = { backend: 'nx' };

function parseBody(res) {
  var body = res && res.result;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  return body || {};
}

function isOk(body) {
  return body && body.code === 0;
}

function buildCartBaseParams() {
  var ctx = platformCart.getBuyerContext();
  return {
    marketId: ctx.marketId,
    gbDepartmentId: ctx.gbDepartmentId
  };
}

/** 购物车列表：仅 status=-1 临时行 */
function listLines(extra) {
  var payload = Object.assign({}, buildCartBaseParams(), extra || {});
  console.log('[platformCartApi] POST cart/lines/list', payload);
  return requestUtil.post('platform/customer/cart/lines/list', payload, NX_OPTS).then(function (res) {
    return parseBody(res);
  });
}

/** 修改购物车临时行（status=-1） */
function updateLine(nxOrderId, fields) {
  var payload = Object.assign({}, buildCartBaseParams(), {
    nxOrderId: nxOrderId,
    quantity: fields.quantity,
    standard: fields.standard,
    remark: fields.remark != null ? fields.remark : ''
  });
  console.log('[platformCartApi] POST cart/lines/update', payload);
  return requestUtil.post('platform/customer/cart/lines/update', payload, Object.assign({
    showLoading: true,
    loadingText: '保存中...'
  }, NX_OPTS)).then(function (res) {
    return parseBody(res);
  });
}

/** 删除购物车临时行（status=-1） */
function deleteLine(nxOrderId) {
  var payload = Object.assign({}, buildCartBaseParams(), { nxOrderId: nxOrderId });
  console.log('[platformCartApi] POST cart/lines/delete', payload);
  return requestUtil.post('platform/customer/cart/lines/delete', payload, Object.assign({
    showLoading: true,
    loadingText: '删除中...'
  }, NX_OPTS)).then(function (res) {
    return parseBody(res);
  });
}

function submitBySupplier(payload) {
  console.log('[platformCartApi] POST cart/submitBySupplier', payload);
  return requestUtil.post('platform/customer/cart/submitBySupplier', payload, Object.assign({
    showLoading: true,
    loadingText: '加入购物车...'
  }, NX_OPTS)).then(function (res) {
    return parseBody(res);
  });
}

/** 结算预览：已知价 / 未知价分组，不写库 */
function checkoutPreview(orderIds) {
  var payload = Object.assign({}, buildCartBaseParams(), {
    orderIds: orderIds || []
  });
  console.log('[platformCartApi] POST cart/checkout/preview', payload);
  return requestUtil.post('platform/customer/cart/checkout/preview', payload, Object.assign({
    showLoading: true,
    loadingText: '结算预览...'
  }, NX_OPTS)).then(function (res) {
    return parseBody(res);
  });
}

/** 结算确认：生成 bill，购物车行转正式（本地 mock 联调） */
function checkoutConfirm(payload) {
  console.log('[platformCartApi] POST cart/checkout/confirm', payload);
  return requestUtil.post('platform/customer/cart/checkout/confirm', payload, Object.assign({
    showLoading: true,
    loadingText: '提交结算...'
  }, NX_OPTS)).then(function (res) {
    return parseBody(res);
  });
}

/** 结算支付：PENDING + 微信 JSAPI prepay（生产主链） */
function checkoutPay(payload) {
  console.log('[platformCartApi] POST cart/checkout/pay', payload);
  return requestUtil.post('platform/customer/cart/checkout/pay', payload, Object.assign({
    showLoading: true,
    loadingText: '创建支付...'
  }, NX_OPTS)).then(function (res) {
    var body = parseBody(res);
    console.log('[platformCartApi] checkoutPay response', body);
    return body;
  });
}

/** 查询 checkout 支付状态（支付成功后轮询 billId） */
function queryPaymentStatus(payload) {
  var req = Object.assign({}, buildCartBaseParams(), payload || {});
  console.log('[platformCartApi] POST cart/checkout/payment/status', req);
  return requestUtil.post('platform/customer/cart/checkout/payment/status', req, NX_OPTS).then(function (res) {
    return parseBody(res);
  });
}

/** 取消 PENDING 支付（用户取消 wx.requestPayment） */
function cancelPayment(payload) {
  var req = Object.assign({}, buildCartBaseParams(), payload || {});
  console.log('[platformCartApi] POST cart/checkout/payment/cancel', req);
  return requestUtil.post('platform/customer/cart/checkout/payment/cancel', req, Object.assign({
    showLoading: true,
    loadingText: '取消支付...'
  }, NX_OPTS)).then(function (res) {
    return parseBody(res);
  });
}

function payFirst(payload) {
  return requestUtil.post('platform/customer/bill/payFirst', payload, Object.assign({
    showLoading: true,
    loadingText: '创建支付...'
  }, NX_OPTS)).then(function (res) {
    return parseBody(res);
  });
}

function paySupplement(payload) {
  return requestUtil.post('platform/customer/bill/paySupplement', payload, Object.assign({
    showLoading: true,
    loadingText: '创建补款...'
  }, NX_OPTS)).then(function (res) {
    return parseBody(res);
  });
}

module.exports = {
  listLines: listLines,
  updateLine: updateLine,
  deleteLine: deleteLine,
  submitBySupplier: submitBySupplier,
  checkoutPreview: checkoutPreview,
  checkoutConfirm: checkoutConfirm,
  checkoutPay: checkoutPay,
  queryPaymentStatus: queryPaymentStatus,
  cancelPayment: cancelPayment,
  payFirst: payFirst,
  paySupplement: paySupplement,
  parseBody: parseBody,
  isOk: isOk
};
