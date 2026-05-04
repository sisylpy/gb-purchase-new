/**
 * 门店订货 resGoodsAi 使用的 HTTP 接口（从 services/depOrder.js 拷贝，路径与参数须与之一致）
 * 页面只依赖本子包；若你从 depOrder 中删除下列接口，请同步改 chefOrder / resGoodsSearch 等仍引用 depOrder 的页面。
 */

var request = require('../../lib/request');

// ===== gbdepartmentorders / gbdistributergoods =====


var queryDepDisGoodsByQuickSearchGb = function (data) {
  return request.post('nxgoods/queryDepDisGoodsByQuickSearchGb', data, { useUrlParams: true });
};
var createDepartmentOrderForJj = function (data) {
  return request.post('gbdepartmentorders/createDepartmentOrderForJj', data);
};

var createDepartmentOrderWithNewDepDisGoods = function (data) {
  return request.post('gbdepartmentorders/createDepartmentOrderWithNewDepDisGoods', data);
};

var createDepartmentOrderFromNxGoodsImport = function (data) {
  return request.post('gbdistributergoods/createDepartmentOrderFromNxGoodsImport', data);
};

var updateOrderGbJj = function (data) {
  return request.post('gbdepartmentorders/updateOrderGbJj', data, { useUrlParams: true });
};

var deleteOrderGb = function (id) {
  return request.get('gbdepartmentorders/deleteOrderGb/' + id);
};

// ===== gbdepartmentdisgoods =====

var depGetDepGoodsGbPage = function (data) {
  return request.post('gbdepartmentdisgoods/depGetDepGoodsGbPage', data, { useUrlParams: true });
};

var depGetDepGoodsCataGb = function (data) {
  return request.post('gbdepartmentdisgoods/depGetDepGoodsCataGb', data, { useUrlParams: true });
};

/**
 * 部门库存调整（统一）：制作 produce / 损耗 loss / 退货 return / 废弃 waste
 * POST gbdepartmentdisgoods/saveDepGoodsStockAdjust
 * 请求体：{ kind, stock }，stock 为部门库存实体字段（同原四个接口入参）
 */
var saveDepGoodsStockAdjust = function (kind, stock) {
  return request.post('gbdepartmentdisgoods/saveDepGoodsStockAdjust', {
    kind: kind,
    stock: stock,
  });
};

var deleteDepGoods = function (id) {
  return request.get('gbdepartmentdisgoods/deleteDepGoods/' + id);
};

// ===== nxgoods / nxstandard =====

var gbGetNxGoodsCataGoods = function (data) {
  return request.post('nxgoods/gbGetNxGoodsCataGoods', data || {}, { useUrlParams: true });
};

var gbDepGetNxGoodsByGreatGrandId = function (data) {
  return request.post('nxgoods/gbDepGetNxGoodsByGreatGrandId', data, { useUrlParams: true });
};


var saveNxStandard = function (data) {
  return request.post('nxstandard/saveNxStandard', data, { useUrlParams: true });
};

// ===== gbdistributerstandard =====

var gbDisSaveStandard = function (data) {
  return request.post('gbdistributerstandard/gbDisSaveStandard', data, { useUrlParams: true });
};

var gbDisDeleteStandard = function (id) {
  return request.get('gbdistributerstandard/gbDisDeleteStandard/' + id);
};

// ===== gbdepartmentgoodsstock / attachment =====

var changeStockStars = function (data) {
  return request.post('gbdepartmentgoodsstock/changeStockStars', data, { useUrlParams: true });
};

var reduceAttachmentSaveWithFile = function (filePathList, userName, id) {
  return request.uploadFile(
    'gbdepartmentgoodsstockreduceattachment/reduceAttachmentSaveWithFile',
    filePathList[0],
    'file',
    { userName: userName, id: id }
  );
};

module.exports = {
  depGetDepGoodsCataGb: depGetDepGoodsCataGb,
  depGetDepGoodsGbPage: depGetDepGoodsGbPage,
  createDepartmentOrderFromNxGoodsImport: createDepartmentOrderFromNxGoodsImport,
  createDepartmentOrderWithNewDepDisGoods: createDepartmentOrderWithNewDepDisGoods,
  createDepartmentOrderForJj: createDepartmentOrderForJj,
  updateOrderGbJj: updateOrderGbJj,
  deleteOrderGb: deleteOrderGb,
  gbGetNxGoodsCataGoods: gbGetNxGoodsCataGoods,
  gbDepGetNxGoodsByGreatGrandId: gbDepGetNxGoodsByGreatGrandId,
  gbDisSaveStandard: gbDisSaveStandard,
  saveNxStandard: saveNxStandard,
  gbDisDeleteStandard: gbDisDeleteStandard,
  changeStockStars: changeStockStars,
  saveDepGoodsStockAdjust: saveDepGoodsStockAdjust,
  reduceAttachmentSaveWithFile: reduceAttachmentSaveWithFile,
  deleteDepGoods: deleteDepGoods,
  queryDepDisGoodsByQuickSearchGb: queryDepDisGoodsByQuickSearchGb
};
