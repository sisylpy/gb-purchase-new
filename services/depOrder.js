/**
 * 部门订单相关 API
 * @module services/depOrder
 * 
 * ⚠️ 路径必须和老项目 apiDepOrder.js 完全一致
 */

var requestUtil = require('../lib/request');

var getPurchaseGoodsGbWithTabCount = function (disId) {
  return requestUtil.get('gbdistributerpurchasegoods/getPurchaseGoodsGbWithTabCount/' + disId);
};

var saveDisPurGoodsBatchGb = function (data) {
  return requestUtil.post('gbdistributerpurchasebatch/saveDisPurGoodsBatchGb', data);
};

var purUserSaveMendain = function (data) {
  return requestUtil.post('gbdepartment/purUserSaveMendain', data, { useUrlParams: true });
};

var puraserReturnPurGoods = function (data) {
  return requestUtil.post('gbdistributerpurchasegoods/puraserReturnPurGoods', data, { useUrlParams: true });
};

var receiveGbBatchItem = function (id) {
  return requestUtil.get('gbdistributerpurchasebatch/receiveGbBatchItem/' + id);
};

var receiveGbBatch = function (id) {
  return requestUtil.get('gbdistributerpurchasebatch/receiveGbBatch/' + id);
};

var jingjingGetBuyingGoodsGb = function (disId) {
  return requestUtil.get('gbdistributerpurchasebatch/jingjingGetBuyingGoodsGb/' + disId);
};

var jingjingGetBuyingGoodsGbWithNx = function (disId) {
  return requestUtil.get('gbdistributerpurchasebatch/jingjingGetBuyingGoodsGbWithNx/' + disId);
};

var deleteDisPurBatchGbItem = function (id) {
  return requestUtil.get('gbdistributerpurchasebatch/deleteDisPurBatchGbItem/' + id);
};

var deleteDisPurAndNxDataItem = function (id) {
  return requestUtil.get('gbdistributerpurchasegoods/deleteDisPurAndNxDataItem/' + id);
};

var addAutoOrderGoods = function (data) {
  return requestUtil.post('gbdistributergoods/addAutoOrderGoods', data, { useUrlParams: true });
};

var cancleTuihuoByPurGoodsId = function (id) {
  return requestUtil.get('gbdepartmentgoodsstockreduce/cancleTuihuoByPurGoodsId/' + id);
};

// ===== chefOrder 页面需要的 API =====

var updateOrderGbJj = function (data) {
  return requestUtil.post('gbdepartmentorders/updateOrderGbJj', data);
};

var updateOrderGbJjSx = function (data) {
  return requestUtil.post('gbdepartmentorders/updateOrderGbJjSx', data, { useUrlParams: true });
};

var deleteOrderGb = function (id) {
  return requestUtil.get('gbdepartmentorders/deleteOrderGb/' + id);
};

var depGetApplyAiByTime = function (id) {
  return requestUtil.get('gbdepartmentorders/depGetApplyAiByTime/' + id);
};

var depGetApplyAiFather = function (id) {
  return requestUtil.get('gbdepartmentorders/depGetApplyAiFather/' + id);
};

var depReceiveStock = function (id) {
  return requestUtil.get('gbdistributerpurchasebatch/depReceiveStock/' + id);
};

var depSearchTodayOrders = function (data) {
  return requestUtil.post('gbdepartmentorders/depSearchTodayOrders', data, { useUrlParams: true });
};


var gbDisSaveStandard = function (data) {
  return requestUtil.post('gbdistributerstandard/gbDisSaveStandard', data);
};

var gbDisDeleteStandard = function (id) {
  return requestUtil.get('gbdistributerstandard/gbDisDeleteStandard/' + id);
};

var createDepartmentOrderForJj = function (data) {
  return requestUtil.post('gbdepartmentorders/createDepartmentOrderForJj', data);
};

var saveGbOrderJjSx = function (data) {
  return requestUtil.post('gbdepartmentorders/saveOrdersGbJjSx', data);
};

var createDepartmentOrderWithNewDepDisGoods = function (data) {
  return requestUtil.post('gbdepartmentorders/createDepartmentOrderWithNewDepDisGoods', data);
};

var saveOrdersGbJjAndSaveDepGoodsSx = function (data) {
  return requestUtil.post('gbdepartmentorders/saveOrdersGbJjAndSaveDepGoodsSx', data);
};

var createDepartmentOrderFromNxGoodsImport = function (data) {
  return requestUtil.post('gbdistributergoods/createDepartmentOrderFromNxGoodsImport', data);
};

var saveOrdersGbJjAndSaveGoodsSx = function (data) {
  return requestUtil.post('gbdistributergoods/saveOrdersGbJjAndSaveGoodsSx', data);
};

var gbDisGetGoodsDetail = function (id) {
  return requestUtil.get('gbdistributergoods/gbDisGetGoodsDetail/' + id);
};

var getDate = function () {
  return requestUtil.get('gbdistributer/getDate');
};

// ===== resGoodsAi 页面需要的 API =====

var depGetDepGoodsGbPage = function (data) {
  return requestUtil.post('gbdepartmentdisgoods/depGetDepGoodsGbPage', data, { useUrlParams: true });
};

var depGetDepGoodsCataGb = function (data) {
  return requestUtil.post('gbdepartmentdisgoods/depGetDepGoodsCataGb', data, { useUrlParams: true });
};

var gbGetNxGoodsCataGoods = function (data) {
  return requestUtil.post('nxgoods/gbGetNxGoodsCataGoods', data, { useUrlParams: true });
};

var gbDepGetNxGoodsByGreatGrandId = function (data) {
  return requestUtil.post('nxgoods/gbDepGetNxGoodsByGreatGrandId', data, { useUrlParams: true });
};


var saveNxStandard = function (data) {
  return requestUtil.post('nxstandard/saveNxStandard', data, { useUrlParams: true });
};

var changeStockStars = function (data) {
  return requestUtil.post('gbdepartmentgoodsstock/changeStockStars', data, { useUrlParams: true });
};

var saveDepProduceGoodsStock = function (data) {
  return requestUtil.post('gbdepartmentdisgoods/saveDepProduceGoodsStock', data);
};

var saveDepLossGoodsStock = function (data) {
  return requestUtil.post('gbdepartmentdisgoods/saveDepLossGoodsStock', data);
};

var reduceAttachmentSaveWithFile = function (filePathList, userName, id) {
  return requestUtil.uploadFile(
    'gbdepartmentgoodsstockreduceattachment/reduceAttachmentSaveWithFile',
    filePathList[0],
    'file',
    { userName: userName, id: id }
  );
};

var saveDepReturnGoodsStock = function (data) {
  return requestUtil.post('gbdepartmentdisgoods/saveDepReturnGoodsStock', data);
};

var saveDepWasteGoodsStock = function (data) {
  return requestUtil.post('gbdepartmentdisgoods/saveDepWasteGoodsStock', data);
};

var deleteDepGoods = function (id) {
  return requestUtil.get('gbdepartmentdisgoods/deleteDepGoods/' + id);
};

var getDisGoodsStock = function (id) {
  return requestUtil.get('gbdepartmentgoodsstock/getDisGoodsStock/' + id);
};

var queryDepDisGoodsByQuickSearchGb = function (data) {
  return requestUtil.post('nxgoods/queryDepDisGoodsByQuickSearchGb', data, { useUrlParams: true });
};

var queryDepDisGoodsByQuickSearchJj = function (data) {
  return requestUtil.post('nxdistributergoods/queryDepDisGoodsByQuickSearchJj', data, { useUrlParams: true });
};

var depGetDepGoodsGb = function () {
  return requestUtil.get('gbdepartmentdisgoods/depGetDepGoodsGb');
};

var disGetDepGoodsCataGb = function (data) {
  return requestUtil.post('gbdepartmentdisgoods/disGetDepGoodsCataGb', data, { useUrlParams: true });
};

var disGetDepGoodsCataGbWithSupplier = function (data) {
  return requestUtil.post('gbdepartmentdisgoods/disGetDepGoodsCataGbWithSupplier', data, { useUrlParams: true });
};

var disGetDepGoodsGbPage = function (data) {
  return requestUtil.post('gbdepartmentdisgoods/disGetDepGoodsGbPage', data, { useUrlParams: true });
};

var disGetDepGoodsGbPageWithSupplier = function (data) {
  return requestUtil.post('gbdepartmentdisgoods/disGetDepGoodsGbPageWithSupplier', data, { useUrlParams: true });
};

var getPurchaseGoodsGbWithTabCountWithNxDisId = function (data) {
  return requestUtil.post('gbdistributerpurchasegoods/getPurchaseGoodsGbWithTabCountWithNxDisId', data, { useUrlParams: true });
};

var saveGbDisGoodsLinshi = function (data) {
  return requestUtil.post('gbdistributergoods/saveGbDisGoodsLinshi', data, { useUrlParams: true });
};

var saveLinshiGoodsGb = function (filePathList, goodsName, standard, detail, disId, toDepId, depId) {
  return requestUtil.uploadFile(
    'gbdistributergoods/saveLinshiGoodsGb',
    filePathList[0],
    'file',
    { goodsName, standard, detail, disId, toDepId, depId }
  );
};

var depPasteSearchGoods = function (data) {
  return requestUtil.post('gbdepartmentorders/depPasteSearchGoods', data, { useUrlParams: true });
};

var reduceAttachmentSaveWithFileStar = function (filePathList, userName, id, stars, userId) {
  return requestUtil.uploadFile(
    'gbdepartmentgoodsstock/reduceAttachmentSaveWithFileStar',
    filePathList[0],
    'file',
    { userName, id, stars, userId }
  );
};

var getNxDisGoodsIdsByGreatId = function (id) {
  return requestUtil.get('nxdistributerfathergoods/getNxDisGoodsIdsByGreatId/' + id);
};

// ===== gbOrderBatch 页面需要的 API =====

var supplierEditBatchGb = function (data) {
  return requestUtil.get('gbdistributerpurchasebatch/supplierEditBatchGb/' + data);
};

var sellerFinishPurchaseGoodsBatchGb = function (data) {
  return requestUtil.post('gbdistributerpurchasebatch/sellerFinishPurchaseGoodsBatchGb', data);
};

var sellUserReadDisBatchGb = function (data) {
  return requestUtil.post('gbdistributerpurchasebatch/sellUserReadDisBatchGb', data);
};

var getDisPurchaseGoodsBatchGb = function (data) {
  return requestUtil.get('gbdistributerpurchasebatch/getDisPurchaseGoodsBatchGb/' + data);
};

var supplierDeleteDisPurBatchGbItem = function (data) {
  return requestUtil.get('gbdistributerpurchasebatch/supplierDeleteDisPurBatchGbItem/' + data);
};

var supplierInitWeightPurItem = function (data) {
  return requestUtil.get('gbdistributerpurchasegoods/supplierInitWeightPurItem/' + data);
};

var whichJrdhUserLoginGbJj = function (data) {
  return requestUtil.post('gbdepartmentuser/whichJrdhUserLoginGbJj', data, { useUrlParams: true });
};

var jrdhSellerRegisterWithFileGbJj = function (filePathList, userName, code, admin, gbDisId, buyUserId, gbDepId) {
  return requestUtil.uploadFile(
    'nxjrdhuser/jrdhSellerRegisterWithFileGbJj',
    filePathList[0],
    'file',
    { userName, code, admin, gbDisId, buyUserId, gbDepId }
  );
};

// ===== gbOrderWeight 页面需要的 API =====

var gbOrderOutWeight = function (data, options) {
  return requestUtil.post('gbdepartmentorders/gbOrderOutWeight', data, options);
};

var supplierGetUnWeightOutPurGoods = function (data) {
  return requestUtil.get('gbdistributerpurchasegoods/supplierGetUnWeightOutPurGoods/' + data);
};

// ===== gbOrderBatchReturn 页面需要的 API =====

var supplierGetPrintBatchGb = function (data) {
  return requestUtil.get('gbdistributerpurchasebatch/supplierGetPrintBatchGb/' + data);
};

var sellerReceiveReturnBill = function (data) {
  return requestUtil.post('gbdistributerpurchasebatch/sellerReceiveReturnBill', data);
};

// ===== depUserEdit 页面需要的 API =====

var getJrdhUser = function (data) {
  return requestUtil.get('nxjrdhuser/getJrdhUser/' + data);
};

/**
 * 更新昵称；可选 multipart 头像。与后端统一路径 nxjrdhuser/updateJrdhUser（原为双路径合并）。
 * @param {string} userName
 * @param {number|string} userId
 * @param {string} [tempFilePath] 本地临时文件路径，传入则走 wx.uploadFile
 */
var updateJrdhUser = function (userName, userId, tempFilePath) {
  var path = 'nxjrdhuser/updateJrdhUser';
  if (tempFilePath) {
    return requestUtil.uploadFile(path, tempFilePath, 'file', {
      userName: userName,
      userId: userId,
    });
  }
  return requestUtil.post(path, { userName: userName, userId: userId }, { useUrlParams: true });
};

// ===== supplierOrder 页面需要的 API =====

var saveDisPurGoodsBatchGbSupplier = function (data) {
  return requestUtil.post('gbdistributerpurchasebatch/saveDisPurGoodsBatchGbSupplier', data);
};

// ===== jinriListWithLogin 页面需要的 API =====

var indexJrdhUserLoginJj = function (data) {
  return requestUtil.get('nxjrdhuser/indexJrdhUserLoginJj/' + data);
};

var sellerDistributerPurchaseBatchsGb = function (data) {
  return requestUtil.post('gbdistributerpurchasebatch/sellerDistributerPurchaseBatchsGb', data, { useUrlParams: true });
};

// ===== gbOrderInput 页面需要的 API =====

var sellerUpdatePurGoods = function (data) {
  return requestUtil.post('gbdistributerpurchasegoods/sellerUpdatePurGoods', data);
};

// ===== settlePageGb 页面需要的 API =====

/**
 * 完成账单结算
 * POST gbdistributerpurchasebatch/finishPayPurchaseBatchGb
 */
var finishPayPurchaseBatchGb = function (data) {
  return requestUtil.post('gbdistributerpurchasebatch/finishPayPurchaseBatchGb', {
    ids: data.ids,
    gbDisId: data.gbDisId,
    total: data.total,
    supplierId: data.supplierId,
    userId: data.userId
  }, { useUrlParams: true });
};

module.exports = {
  getPurchaseGoodsGbWithTabCount: getPurchaseGoodsGbWithTabCount,
  saveDisPurGoodsBatchGb: saveDisPurGoodsBatchGb,
  purUserSaveMendain: purUserSaveMendain,
  puraserReturnPurGoods: puraserReturnPurGoods,
  receiveGbBatchItem: receiveGbBatchItem,
  receiveGbBatch: receiveGbBatch,
  jingjingGetBuyingGoodsGb: jingjingGetBuyingGoodsGb,
  jingjingGetBuyingGoodsGbWithNx: jingjingGetBuyingGoodsGbWithNx,
  deleteDisPurBatchGbItem: deleteDisPurBatchGbItem,
  deleteDisPurAndNxDataItem: deleteDisPurAndNxDataItem,
  addAutoOrderGoods: addAutoOrderGoods,
  cancleTuihuoByPurGoodsId: cancleTuihuoByPurGoodsId,
  // chefOrder 需要的 API
  updateOrderGbJj: updateOrderGbJj,
  updateOrderGbJjSx: updateOrderGbJjSx,
  deleteOrderGb: deleteOrderGb,
  depGetApplyAiByTime: depGetApplyAiByTime,
  depGetApplyAiFather: depGetApplyAiFather,
  depReceiveStock: depReceiveStock,
  depSearchTodayOrders: depSearchTodayOrders,
  gbDisSaveStandard: gbDisSaveStandard,
  gbDisDeleteStandard: gbDisDeleteStandard,
  createDepartmentOrderForJj: createDepartmentOrderForJj,
  saveGbOrderJjSx: saveGbOrderJjSx,
  createDepartmentOrderWithNewDepDisGoods: createDepartmentOrderWithNewDepDisGoods,
  saveOrdersGbJjAndSaveDepGoodsSx: saveOrdersGbJjAndSaveDepGoodsSx,
  createDepartmentOrderFromNxGoodsImport: createDepartmentOrderFromNxGoodsImport,
  saveOrdersGbJjAndSaveGoodsSx: saveOrdersGbJjAndSaveGoodsSx,
  gbDisGetGoodsDetail: gbDisGetGoodsDetail,
  getDate: getDate,
  // resGoodsAi 需要的 API
  depGetDepGoodsGbPage: depGetDepGoodsGbPage,
  depGetDepGoodsCataGb: depGetDepGoodsCataGb,
  gbGetNxGoodsCataGoods: gbGetNxGoodsCataGoods,
  gbDepGetNxGoodsByGreatGrandId: gbDepGetNxGoodsByGreatGrandId,
  saveNxStandard: saveNxStandard,
  changeStockStars: changeStockStars,
  saveDepProduceGoodsStock: saveDepProduceGoodsStock,
  saveDepLossGoodsStock: saveDepLossGoodsStock,
  reduceAttachmentSaveWithFile: reduceAttachmentSaveWithFile,
  saveDepReturnGoodsStock: saveDepReturnGoodsStock,
  saveDepWasteGoodsStock: saveDepWasteGoodsStock,
  deleteDepGoods: deleteDepGoods,
  getDisGoodsStock: getDisGoodsStock,
  queryDepDisGoodsByQuickSearchGb: queryDepDisGoodsByQuickSearchGb,
  queryDepDisGoodsByQuickSearchJj: queryDepDisGoodsByQuickSearchJj,
  depGetDepGoodsGb: depGetDepGoodsGb,
  disGetDepGoodsCataGb: disGetDepGoodsCataGb,
  disGetDepGoodsCataGbWithSupplier: disGetDepGoodsCataGbWithSupplier,
  disGetDepGoodsGbPage: disGetDepGoodsGbPage,
  disGetDepGoodsGbPageWithSupplier: disGetDepGoodsGbPageWithSupplier,
  getPurchaseGoodsGbWithTabCountWithNxDisId: getPurchaseGoodsGbWithTabCountWithNxDisId,
  saveGbDisGoodsLinshi: saveGbDisGoodsLinshi,
  saveLinshiGoodsGb: saveLinshiGoodsGb,
  depPasteSearchGoods: depPasteSearchGoods,
  reduceAttachmentSaveWithFileStar: reduceAttachmentSaveWithFileStar,
  getNxDisGoodsIdsByGreatId: getNxDisGoodsIdsByGreatId,
  // gbOrderBatch 需要的 API
  supplierEditBatchGb: supplierEditBatchGb,
  sellerFinishPurchaseGoodsBatchGb: sellerFinishPurchaseGoodsBatchGb,
  sellUserReadDisBatchGb: sellUserReadDisBatchGb,
  getDisPurchaseGoodsBatchGb: getDisPurchaseGoodsBatchGb,
  supplierDeleteDisPurBatchGbItem: supplierDeleteDisPurBatchGbItem,
  supplierInitWeightPurItem: supplierInitWeightPurItem,
  whichJrdhUserLoginGbJj: whichJrdhUserLoginGbJj,
  jrdhSellerRegisterWithFileGbJj: jrdhSellerRegisterWithFileGbJj,
  // gbOrderWeight 需要的 API
  gbOrderOutWeight: gbOrderOutWeight,
  supplierGetUnWeightOutPurGoods: supplierGetUnWeightOutPurGoods,
  // gbOrderBatchReturn 需要的 API
  supplierGetPrintBatchGb: supplierGetPrintBatchGb,
  sellerReceiveReturnBill: sellerReceiveReturnBill,
  // supplierOrder 需要的 API
  saveDisPurGoodsBatchGbSupplier: saveDisPurGoodsBatchGbSupplier,
  // depUserEdit 需要的 API
  getJrdhUser: getJrdhUser,
  updateJrdhUser: updateJrdhUser,
  // jinriListWithLogin 需要的 API
  indexJrdhUserLoginJj: indexJrdhUserLoginJj,
  sellerDistributerPurchaseBatchsGb: sellerDistributerPurchaseBatchsGb,
  // gbOrderInput 需要的 API
  sellerUpdatePurGoods: sellerUpdatePurGoods,
  // settlePageGb 需要的 API
  finishPayPurchaseBatchGb: finishPayPurchaseBatchGb,
};
