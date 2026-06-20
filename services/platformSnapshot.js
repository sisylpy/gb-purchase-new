/**
 * 京采市场「快照商品」API（nx / platform/customer/goods/snapshot/*）
 */
var requestUtil = require('../lib/request');
var platformCart = require('../utils/platformCart');
var catalogApi = require('./platformCatalog');

var NX_OPTS = { backend: 'nx', showErrorToast: false };

function buildParams(extra) {
  var ctx = platformCart.getBuyerContext();
  return Object.assign({
    marketId: ctx.marketId,
    departmentId: ctx.gbDepartmentId
  }, extra || {});
}

function fetchSnapshotList(params) {
  var payload = buildParams(params);
  console.log('[platformSnapshot] fetchSnapshotList', payload);
  return requestUtil.post('platform/customer/goods/snapshot/list', payload, NX_OPTS);
}

function mapSnapshotRow(row) {
  if (!row) return row;
  var item = catalogApi.mapCatalogRow(row);
  item.lastOrderQuantity = row.lastOrderQuantity != null ? row.lastOrderQuantity : row.snapshotQuantity;
  item.lastOrderStandard = row.lastOrderStandard || row.snapshotStandard || '';
  item.lastOrderDate = row.lastOrderDate || row.snapshotDate || '';
  item.orderCount = row.orderCount != null ? row.orderCount : row.snapshotOrderCount;
  return item;
}

module.exports = {
  fetchSnapshotList: fetchSnapshotList,
  mapSnapshotRow: mapSnapshotRow,
  parseBody: catalogApi.parseBody,
  isOk: catalogApi.isOk
};
