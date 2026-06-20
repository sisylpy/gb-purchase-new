/**
 * 京采市场「全部类别」目录 API（nx / platform/customer/goods/catalog/*）
 */
var requestUtil = require('../lib/request');
var platformCart = require('../utils/platformCart');

var NX_OPTS = { backend: 'nx', showErrorToast: false };

function buildParams(extra) {
  var ctx = platformCart.getBuyerContext();
  return Object.assign({
    marketId: ctx.marketId,
    departmentId: ctx.gbDepartmentId
  }, extra || {});
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

function fetchCatalogTree(params) {
  var payload = buildParams(params);
  console.log('[platformCatalog] fetchCatalogTree', payload);
  return requestUtil.post('platform/customer/goods/catalog/tree', payload, NX_OPTS);
}

function fetchCatalogList(params) {
  var payload = buildParams(params);
  console.log('[platformCatalog] fetchCatalogList', payload);
  return requestUtil.post('platform/customer/goods/catalog/list', payload, NX_OPTS);
}

/** 标准 nx 商品行；附带当日平台待分配订单（若有） */
function mapCatalogRow(row) {
  if (!row) return row;
  var item = {
    nxGoodsId: row.nxGoodsId,
    nxGoodsName: row.nxGoodsName,
    nxGoodsStandardname: row.nxGoodsStandardname,
    nxGoodsStandardWeight: row.nxGoodsStandardWeight,
    nxGoodsGrandId: row.nxGoodsGrandId,
    nxGoodsGreatGrandId: row.nxGoodsGreatGrandId,
    nxGoodsFile: row.nxGoodsFile,
    nxGoodsBrand: row.nxGoodsBrand,
    nxGoodsItemsPerCarton: row.nxGoodsItemsPerCarton,
    nxGoodsCartonUnit: row.nxGoodsCartonUnit
  };
  if (row.platformOrderId) {
    item.platformOrder = {
      orderId: row.platformOrderId,
      quantity: row.platformOrderQuantity,
      standard: row.platformOrderStandard
    };
  }
  return item;
}

module.exports = {
  fetchCatalogTree: fetchCatalogTree,
  fetchCatalogList: fetchCatalogList,
  mapCatalogRow: mapCatalogRow,
  parseBody: parseBody,
  isOk: isOk
};
