/**
 * 平台客户采购单（gb_department_bill）API
 */
var requestUtil = require('../lib/request');
var platformCart = require('../utils/platformCart');

var NX_OPTS = { backend: 'nx', showErrorToast: false };

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

function buildBaseParams(extra) {
  var ctx = platformCart.getBuyerContext();
  return Object.assign({
    marketId: ctx.marketId,
    departmentId: ctx.gbDepartmentId
  }, extra || {});
}

/** 今日/日期范围内采购单列表 */
function listBills(extra) {
  var payload = buildBaseParams(extra);
  return requestUtil.post('platform/customer/bills/list', payload, NX_OPTS).then(function (res) {
    return parseBody(res);
  });
}

/** 采购单明细（bill + lines） */
function billDetail(billId) {
  var payload = buildBaseParams({ billId: billId });
  return requestUtil.post('platform/customer/bills/detail', payload, NX_OPTS).then(function (res) {
    return parseBody(res);
  });
}

/** 待处理采购单（首页弹窗） */
function listOutstanding(extra) {
  var payload = buildBaseParams(extra);
  return requestUtil.post('platform/customer/bills/outstanding', payload, NX_OPTS).then(function (res) {
    return parseBody(res);
  });
}

module.exports = {
  listBills: listBills,
  billDetail: billDetail,
  listOutstanding: listOutstanding,
  parseBody: parseBody,
  isOk: isOk
};
