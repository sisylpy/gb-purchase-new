/**
 * 平台订单（Phase 2a submitLine：无配送商，直接保存待分配订单）
 */
var requestUtil = require('../../lib/request');
var platformCart = require('../utils/platformCart');

var NX_OPTS = { backend: 'nx', showErrorToast: false };

function buildBaseParams() {
  var ctx = platformCart.getBuyerContext();
  return {
    marketId: ctx.marketId,
    departmentId: ctx.gbDepartmentId,
    orderUserId: ctx.gbOrderUserId
  };
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

function isOk(body) {
  return body && body.code === 0;
}

function listTodayLines(extra) {
  var payload = Object.assign({}, buildBaseParams(), extra || {});
  console.log('[platformOrder] listTodayLines request', payload);
  return requestUtil.post('platform/customer/orders/listTodayLines', payload, NX_OPTS);
}

function deleteLineCustomer(orderId) {
  var payload = Object.assign({}, buildBaseParams(), { orderId: orderId });
  console.log('[platformOrder] deleteLine', payload);
  return requestUtil.post('platform/customer/orders/deleteLine', payload, NX_OPTS);
}

function submitLine(params) {
  var payload = Object.assign({}, buildBaseParams(), params || {});
  console.log('[platformOrder] submitLine', payload);
  return requestUtil.post('platform/customer/orders/submitLine', payload, NX_OPTS);
}

function updateLineCustomer(orderId, detail) {
  var payload = Object.assign({}, buildBaseParams(), {
    orderId: orderId,
    quantity: detail.quantity,
    standard: detail.standard,
    remark: detail.remark || ''
  });
  console.log('[platformOrder] updateLine', payload);
  return requestUtil.post('platform/customer/orders/updateLine', payload, NX_OPTS);
}

function updateLine(orderId, detail) {
  return updateLineCustomer(orderId, detail);
}

function deleteLine(orderId) {
  console.log('[platformOrder] deleteLine', orderId);
  return requestUtil.request('nxdepartmentorders/delete/' + orderId, {}, Object.assign({
    method: 'GET'
  }, NX_OPTS));
}

module.exports = {
  submitLine: submitLine,
  updateLine: updateLine,
  deleteLine: deleteLine,
  deleteLineCustomer: deleteLineCustomer,
  updateLineCustomer: updateLineCustomer,
  listTodayLines: listTodayLines,
  parseBody: parseBody,
  isOk: isOk
};
