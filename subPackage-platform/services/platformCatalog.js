/**
 * 京采市场「全部类别」目录 API（nx / platform/customer/goods/catalog/*）
 */
var requestUtil = require('../../lib/request');
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
    nxGoodsCartonUnit: row.nxGoodsCartonUnit,
    nxDgWillPrice: row.nxDgWillPrice != null ? String(row.nxDgWillPrice) : ''
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

/** 目录行 → 订货弹窗 item（nx_goods 结构 + 单价 nxDgWillPrice） */
function buildModalItemFromCatalogRow(row) {
  var priceUtil = require('../../utils/priceUtil');
  if (!row) return row;
  var price = row.nxDgWillPrice != null ? String(row.nxDgWillPrice) : '';
  var priceValid = priceUtil.isValidDisplayPrice(price);
  var standard = row.nxGoodsStandardname || '';
  var item = Object.assign({}, row, {
    nxDgWillPrice: price,
    priceValidOne: priceValid,
    nxDgNxGoodsId: row.nxGoodsId,
    nxDgGoodsName: row.nxGoodsName || '',
    nxDgGoodsStandardname: standard,
    nxDgGoodsStandardWeight: row.nxGoodsStandardWeight || '',
    nxDgGoodsBrand: row.nxGoodsBrand || '',
    nxGoodsStandardEntities: standard ? [{ nxStandardName: standard }] : [],
    nxDistributerStandardEntities: []
  });
  return item;
}

module.exports = {
  fetchCatalogTree: fetchCatalogTree,
  fetchCatalogList: fetchCatalogList,
  mapCatalogRow: mapCatalogRow,
  buildModalItemFromCatalogRow: buildModalItemFromCatalogRow,
  parseBody: parseBody,
  isOk: isOk
};
