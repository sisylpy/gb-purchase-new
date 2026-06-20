/**
 * subPackage-group 统一 API
 * 汇总本子包 pages 所用接口，风格对齐 subPackage-ai/services/api.js（request + 注释清单）
 *
 * 部分与部门订单/配送标准重复的方法直接复用 services/depOrder.js，保证路径与主包一致。
 *
 * 接口清单:
 * ====== 商品搜索 searchGoods ======
 * queryDisGoodsByQuickSearchGb(data)     POST gbdistributergoods/queryDisGoodsByQuickSearchGb
 *
 * ====== 商品列表 resGoods ======
 * disGetDepGoodsCataGb(data)             POST gbdepartmentdisgoods/disGetDepGoodsCataGb
 * disGetDepGoodsGbPage(data)             POST gbdepartmentdisgoods/disGetDepGoodsGbPage
 *
 * ====== 商品详情 disGoodsDetail ======
 * gbDisGetGoodsDetail(id)               GET  gbdistributergoods/gbDisGetGoodsDetail/{id}
 * gbDisGetAllNxDistributerAndSupplier(disId) GET gbdistributergoods/gbDisGetAllNxDistributerAndSupplier/{disId}
 *
 * ====== 商品操作页 disGoodsPage ======
 * gbDisSaveStandard(data)                POST gbdistributerstandard/gbDisSaveStandard
 * gbDisUpdateStandard(data)              POST gbdistributerstandard/gbDisUpdateStandard
 * gbDisDeleteStandard(id)                GET  gbdistributerstandard/gbDisDeleteStandard/{id}
 * saveDisAlias(data)                     POST gbdistributeralias/saveDisAlias
 * updateDisAlias(data)                   POST gbdistributeralias/updateDisAlias
 * disDeleteAlias(id)                     GET  gbdistributeralias/disDeleteAlias/{id}
 * disUpdateDisGoodsGb(goods)                   POST gbdistributergoods/disUpdateDisGoodsGb
 * disUpdateDisGoodsBasicGb(goods)        POST gbdistributergoods/disUpdateDisGoodsBasicGb
 * canclePostDgnGoodsGb(data)             POST gbdistributergoods/canclePostDgnGoodsGb
 *
 * ====== 商品分析 goodsFenxi ======
 * getGbPurGoodsFenxi(data)               POST gbdistributerpurchasegoods/getGbPurGoodsFenxi
 *
 * ====== 商品订货流水 goodsOrderList ======
 * getDisGoodsOrderDayJingjinig(data)     POST gbdistributerpurchasegoods/getDisGoodsOrderDayJingjinig
 *
 * ====== 批发商商品库存流水 stockGoodsList ======
 * getDisGoodsBusiness(data)              POST gbdepartmentgoodsstock/getDisGoodsBusiness
 * deleteReduceItem(id)                  GET  gbdepartmentgoodsstockreduce/deleteReduceItem/{id}
 * deleteReduceAttachment(attachId)      GET  gbdepartmentgoodsstockreduceattachment/delAttem/{attachId}
 * changeDepStockToAnotherDep(data)       POST gbdepartmentgoodsstock/changeDepStockToAnotherDep
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

var disUpdateDisGoodsBasicGb = function (goods) {
  return request.post('gbdistributergoods/disUpdateDisGoodsBasicGb', goods);
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

// ============================================================
// 导出
// ============================================================

module.exports = {
  queryDisGoodsByQuickSearchGb: queryDisGoodsByQuickSearchGb,
  disGetDepGoodsCataGb: disGetDepGoodsCataGb,
  disGetDepGoodsGbPage: disGetDepGoodsGbPage,
  gbDisGetGoodsDetail: gbDisGetGoodsDetail,
  gbDisGetAllNxDistributerAndSupplier: gbDisGetAllNxDistributerAndSupplier,
  disUpdateDisGoodsGb: disUpdateDisGoodsGb,
  disUpdateDisGoodsBasicGb: disUpdateDisGoodsBasicGb,
  gbDisSaveStandard: gbDisSaveStandard,
  gbDisUpdateStandard: gbDisUpdateStandard,
  gbDisDeleteStandard: gbDisDeleteStandard,
  saveDisAlias: saveDisAlias,
  updateDisAlias: updateDisAlias,
  disDeleteAlias: disDeleteAlias,
  canclePostDgnGoodsGb: canclePostDgnGoodsGb,
  getGbPurGoodsFenxi: getGbPurGoodsFenxi,
  getDisGoodsOrderDayJingjinig: getDisGoodsOrderDayJingjinig,
  getDisGoodsBusiness: getDisGoodsBusiness,
  deleteReduceItem: deleteReduceItem,
  deleteReduceAttachment: deleteReduceAttachment,
  changeDepStockToAnotherDep: changeDepStockToAnotherDep,
};
