/**
 * subPackage-goods 统一 API
 * 汇总本子包 pages 所用接口；部分方法复用 services/depOrder.js
 */

var request = require('../../lib/request');
var depOrder = require('../../services/depOrder');

// ============================================================
// 复用 depOrder（路径已在主包校验）
// ============================================================

var disGetDepGoodsCataGb = depOrder.disGetDepGoodsCataGb;
var disGetDepGoodsGbPage = depOrder.disGetDepGoodsGbPage;
var gbDisGetGoodsDetail = depOrder.gbDisGetGoodsDetail;
var gbDisSaveStandard = depOrder.gbDisSaveStandard;
var gbDisDeleteStandard = depOrder.gbDisDeleteStandard;

// ============================================================
// 本子包专用
// ============================================================



var storeGetDepGoodsGbPage = function (data) {
  return request.post('gbdepartmentdisgoods/storeGetDepGoodsGbPage', data, { useUrlParams: true });
};

var storeGetDepGoodsCataGb = function (data) {
  return request.post('gbdepartmentdisgoods/storeGetDepGoodsCataGb', data, { useUrlParams: true });
};


var queryDisGoodsByQuickSearchGb = function (data) {
  return request.post(
    'gbdistributergoods/queryDisGoodsByQuickSearchGb',
    { disId: data.disId, searchStr: data.searchStr },
    { useUrlParams: true }
  );
};

var gbDisGetAllNxDistributerAndSupplier = function (disId) {
  return request.get('gbdistributergoods/gbDisGetAllNxDistributerAndSupplier/' + disId);
};

var disUpdateDisGoodsGb = function (goods) {
  return request.post('gbdistributergoods/disUpdateDisGoodsGb', goods);
};

var updateGbGoods = function (goods) {
  return request.post('gbdistributergoods/updateGbGoods', goods);
};

var updateGbGoodsPullOff = function (data) {
  return request.post('gbdistributergoods/updateGbGoodsPullOff', data);
};

var gbDisUpdateStandard = function (data) {
  return request.post('gbdistributerstandard/gbDisUpdateStandard', data);
};

var saveDisAlias = function (data) {
  return request.post('gbdistributeralias/saveDisAlias', data, { useUrlParams: true });
};

var updateDisAlias = function (data) {
  return request.post('gbdistributeralias/updateDisAlias', data, { useUrlParams: true });
};

var disDeleteAlias = function (id) {
  return request.get('gbdistributeralias/disDeleteAlias/' + id);
};

var canclePostDgnGoodsGb = function (data) {
  return request.post('gbdistributergoods/canclePostDgnGoodsGb', data, { useUrlParams: true });
};

var getGbPurGoodsFenxi = function (data) {
  return request.post(
    'gbdepartmentgoodsstockreduce/getGbPurGoodsFenxi',
    {
      startDate: data.startDate,
      stopDate: data.stopDate,
      disGoodsId: data.disGoodsId,
      supplierId: data.supplierId,
      purUserId: data.purUserId,
    },
    { useUrlParams: true }
  );
};

/** 方法名与历史 lib 一致（后端若实际为 Jingjing 请改路径字符串） */
var getDisGoodsOrderDayJingjinig = function (data) {
  return request.post(
    'gbdepartmentorders/getDisGoodsOrderDayJingjinig',
    {
      disGoodsId: data.disGoodsId,
      startDate: data.startDate,
      stopDate: data.stopDate,
      depId: data.depId,
      searchDepIds: data.searchDepIds,
    },
    { useUrlParams: true }
  );
};

/** 批发商商品在区间内的库存业务流水（stockGoodsList） */
var getDisGoodsBusiness = function (data) {
  return request.post(
    'gbdepartmentgoodsstock/getDisGoodsBusiness',
    {
      disGoodsId: data.disGoodsId,
      startDate: data.startDate,
      stopDate: data.stopDate,
    },
    { useUrlParams: true }
  );
};

/** 删除一条库存减少记录（stockGoodsList） */
var deleteReduceItem = function (id) {
  return request.get('gbdepartmentgoodsstockreduce/deleteReduceItem/' + id);
};

/** 删除损耗/星级附件；页面方法名 delAttem 对应此接口 */
var deleteReduceAttachment = function (attachId) {
  return request.get('gbdepartmentgoodsstockreduceattachment/delAttem/' + attachId);
};

/** 库存调拨至其他部门（stockGoodsList） */
var changeDepStockToAnotherDep = function (data) {
  return request.post(
    'gbdepartmentgoodsstock/changeDepStockToAnotherDep',
    {
      stockId: data.stockId,
      toDepId: data.toDepId,
    },
    { useUrlParams: true }
  );
};

/** 根据部门商品ID查询部门商品详情 */
var getDepGoodsDetail = function (depGoodsId) {
  return request.post('gbdepartmentdisgoods/getDepGoodsDetail', { depGoodsId: depGoodsId }, { useUrlParams: true });
};

/** 更新部门商品（必须包含 gbDepartmentDisGoodsId） */
var updateDepGoods = function (depGoods) {
  return request.post('gbdepartmentdisgoods/updateDepGoods', depGoods);
};

// ============================================================
// 导出
// ============================================================

module.exports = {
  queryDisGoodsByQuickSearchGb: queryDisGoodsByQuickSearchGb,
  disGetDepGoodsCataGb: disGetDepGoodsCataGb,
  storeGetDepGoodsCataGb: storeGetDepGoodsCataGb,
  storeGetDepGoodsGbPage: storeGetDepGoodsGbPage,
  disGetDepGoodsGbPage: disGetDepGoodsGbPage,
  gbDisGetGoodsDetail: gbDisGetGoodsDetail,
  gbDisGetAllNxDistributerAndSupplier: gbDisGetAllNxDistributerAndSupplier,
  disUpdateDisGoodsGb: disUpdateDisGoodsGb,
  gbDisSaveStandard: gbDisSaveStandard,
  gbDisUpdateStandard: gbDisUpdateStandard,
  gbDisDeleteStandard: gbDisDeleteStandard,
  saveDisAlias: saveDisAlias,
  updateDisAlias: updateDisAlias,
  disDeleteAlias: disDeleteAlias,
  updateGbGoods: updateGbGoods,
  updateGbGoodsPullOff: updateGbGoodsPullOff,
  canclePostDgnGoodsGb: canclePostDgnGoodsGb,
  getGbPurGoodsFenxi: getGbPurGoodsFenxi,
  getDisGoodsOrderDayJingjinig: getDisGoodsOrderDayJingjinig,
  getDisGoodsBusiness: getDisGoodsBusiness,
  deleteReduceItem: deleteReduceItem,
  deleteReduceAttachment: deleteReduceAttachment,
  changeDepStockToAnotherDep: changeDepStockToAnotherDep,
  getDepGoodsDetail: getDepGoodsDetail,
  updateDepGoods: updateDepGoods,
};
