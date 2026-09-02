/**
 * subPackage-charts 专用 API
 * 仅导出本子包实际使用的方法；AI 对话等转发 aiChatApi，统计/库存在本包落地。
 */
var request = require('../../lib/request');
var apiUrl = require('../../config/index');
var aiChatApi = require('../../services/aiChatApi');
var depOrderApi = require('../../services/depOrder');

// ============================================================
// 本包专属：商品成本 / 库存 / 报表 / 营业额 / 工作记录
// ============================================================

var getGbGoodsCostStatistics = function (payload) {
  return request.post('gbdepartmentgoodsstockreduce/getGbGoodsCostStatistics', payload, { useUrlParams: true });
};

var getGoodsCostBySearchDate = function (payload) {
  return request.post('gbdepartmentgoodsstockreduce/getGoodsCostBySearchDate', payload, { useUrlParams: true });
};

var getGoodsReduceWithDayData = function (data) {
  return request.post('gbdepartmentgoodsstockreduce/getGoodsReduceWithDayData', {
    startDate: data.startDate,
    stopDate: data.stopDate,
    disGoodsId: data.disGoodsId,
    searchDepId: data.searchDepId != null && data.searchDepId !== '' ? String(data.searchDepId) : '-1',
  }, { useUrlParams: true });
};

var getGbStockPurGoods = function (payload) {
  return request.post('gbdepartmentgoodsstock/getGbStockPurGoods', payload, { useUrlParams: true });
};

var disGetDayStockBySearchDay = function (data) {
  return request.post('gbdepartmentgoodsstock/disGetDayStockBySearchDay', {
    searchDepId: data.searchDepId,
    disId: data.disId,
    searchDate: data.searchDate,
  }, { useUrlParams: true });
};

var depGetGoodsStockListAll = function (data) {
  return request.post('gbdepartmentgoodsstock/depGetGoodsStockListAll', {
    searchDepIds: data.searchDepIds,
    disGoodsId: data.disGoodsId,
    dateDuring: data.dateDuring,
  }, { useUrlParams: true });
};

var changeDepStockToAnotherDep = function (data) {
  return request.post('gbdepartmentgoodsstock/changeDepStockToAnotherDep', {
    stockId: data.stockId,
    toDepId: data.toDepId,
  }, { useUrlParams: true });
};

var submitDailyFoodSalesAndRevenue = function (payload) {
  return request.post('gbdepfood/submitDailyFoodSalesAndRevenue', payload);
};

var getDailyFoodSalesAndRevenue = function (body) {
  var payload = {
    depFatherId: body.depFatherId,
    distributerId: body.distributerId,
  };
  if (body.recordDate != null && body.recordDate !== '') {
    payload.recordDate = body.recordDate;
  }
  if (body.subDepId != null && body.subDepId !== '') {
    payload.subDepId = body.subDepId;
  }
  return request.post('gbdepfood/getDailyFoodSalesAndRevenue', payload);
};

var updateDailyFoodSalesAndRevenue = function (body) {
  return request.post('gbdepfood/updateDailyFoodSalesAndRevenue', body);
};

var depGetDepFoodList = function (depFatherId, subDepid) {
  var params = { depFatherId: depFatherId };
  if (subDepid != null && subDepid !== '') {
    params.subDepid = subDepid;
  }
  return request.get('gbdepfood/depGetDepFoodList', params);
};

var upsertDishSalesLine = function (payload) {
  return request.post('gbdepfood/upsertDishSalesLine', payload);
};

var deleteDishSalesLine = function (payload) {
  return request.post('gbdepfood/deleteDishSalesLine', payload);
};

var updateDailyRevenue = function (payload) {
  return request.post('ai/daily-revenue/update', payload);
};

var getDisUserReportsBusiness = function (userId) {
  return request.get('gbreport/getDisUserReportsBusiness/' + userId);
};

var getDisUserReportsCost = function (userId) {
  return request.get('gbreport/getDisUserReportsCost/' + userId);
};

var getDisUserReportsPurchase = function (userId) {
  return request.get('gbreport/getDisUserReportsPurchase/' + userId);
};

var getDisUserReportsStock = function (userId) {
  return request.get('gbreport/getDisUserReportsStock/' + userId);
};

var delteReport = function (repId) {
  return request.get('gbreport/delteReport/' + repId);
};

var saveReportCost = function (data) {
  return request.post('gbreport/saveReportCost', {
    gbRepDisUserId: data.gbRepDisUserId,
    gbRepIds: data.gbRepIds,
    gbRepType: data.gbRepType,
    gbRepStartDate: data.gbRepStartDate,
    gbRepStopDate: data.gbRepStopDate,
  });
};

var depGetSupplier = function (data) {
  return request.post('nxjrdhsupplier/depGetSupplier', {
    startDate: data.startDate,
    stopDate: data.stopDate,
    depId: data.depId,
  }, { useUrlParams: true });
};

var saveDailyTurnover = function (data) {
  return request.post('ai/daily-revenue/save', data);
};

var saveBatchDailyTurnover = function (list) {
  return request.post('ai/daily-revenue/save-batch', list);
};

var uploadTurnoverExcel = function (filePath, departmentId, distributerId) {
  return new Promise(function (resolve, reject) {
    wx.uploadFile({
      url: apiUrl.apiUrl + 'ai/daily-revenue/upload-excel',
      filePath: filePath,
      name: 'file',
      formData: {
        departmentId: departmentId,
        distributerId: distributerId,
      },
      success: function (res) {
        try {
          resolve({ result: JSON.parse(res.data) });
        } catch (e) {
          resolve({ result: res.data });
        }
      },
      fail: reject,
    });
  });
};

var getWorkRecordConversation = function (params) {
  return request.get('ai/work-records/conversation', params, { showErrorToast: false });
};

var listWorkRecords = function (params) {
  return request.get('ai/work-records', params, { showErrorToast: false });
};

var createWorkRecord = function (payload) {
  return request.post('ai/work-records', payload);
};

var getWorkRecordCategories = function (params) {
  return request.get('ai/work-records/categories', params, { showErrorToast: false });
};

var retryAiWorkRecord = function (recordId, params) {
  return request.post('ai/work-records/' + recordId + '/retry-ai', params);
};

var getWorkRecordSourceCard = function (recordId, params) {
  return request.get('ai/work-records/' + recordId + '/source-card', params, { showErrorToast: false });
};

var updateWorkRecord = function (recordId, userId, payload) {
  return request.request('ai/work-records/' + recordId + '?userId=' + userId, payload, { method: 'PUT' });
};

var deleteWorkRecord = function (recordId, userId) {
  return request.request('ai/work-records/' + recordId + '?userId=' + userId, {}, { method: 'DELETE' });
};

module.exports = {
  // AI 对话（Run + SSE）
  createAiRun: aiChatApi.createAiRun,
  connectAiRunSse: aiChatApi.connectAiRunSse,
  stopAiRun: aiChatApi.stopAiRun,
  getAiRun: aiChatApi.getAiRun,
  listConversations: aiChatApi.listConversations,
  getConversationMessages: aiChatApi.getConversationMessages,
  listAdvisors: aiChatApi.listAdvisors,
  getAdvisorDetail: aiChatApi.getAdvisorDetail,
  // 图钉 & 工作笔记
  createWorkRecordFromBusinessCard: aiChatApi.createWorkRecordFromBusinessCard,
  pinMessage: aiChatApi.pinMessage,
  unpinMessage: aiChatApi.unpinMessage,
  pinCard: aiChatApi.pinCard,
  listMyPins: aiChatApi.listMyPins,
  deletePin: aiChatApi.deletePin,
  getPinDetail: aiChatApi.getPinDetail,
  createWorkNote: aiChatApi.createWorkNote,
  listMyWorkNotes: aiChatApi.listMyWorkNotes,
  getWorkNoteDetail: aiChatApi.getWorkNoteDetail,
  updateWorkNote: aiChatApi.updateWorkNote,
  deleteWorkNote: aiChatApi.deleteWorkNote,
  pushWorkNoteToAnnouncement: aiChatApi.pushWorkNoteToAnnouncement,
  pushWorkRecordToAnnouncement: aiChatApi.pushWorkRecordToAnnouncement,
  // 营业额
  getDailyTurnover: aiChatApi.getDailyTurnover,
  saveDailyTurnover: saveDailyTurnover,
  saveBatchDailyTurnover: saveBatchDailyTurnover,
  uploadTurnoverExcel: uploadTurnoverExcel,
  getDailyBoard: aiChatApi.getDailyBoard,
  ignoreNewGoodsRecipeReview: aiChatApi.ignoreNewGoodsRecipeReview,
  // 日看板 / 采购统计
  disGetPurchaseDate: aiChatApi.disGetPurchaseDate,
  disGetPurchaseDetailType: aiChatApi.disGetPurchaseDetailType,
  disGetPurchaseCata: aiChatApi.disGetPurchaseCata,
  getGbPurGoodsStatisticsSeachDate: aiChatApi.getGbPurGoodsStatisticsSeachDate,
  getGbPurGoodsListSearchDate: aiChatApi.getGbPurGoodsListSearchDate,
  // 成本 / 菜品分析
  getGbGoodsCostStatistics: getGbGoodsCostStatistics,
  getGoodsCostBySearchDate: getGoodsCostBySearchDate,
  getGoodsReduceWithDayData: getGoodsReduceWithDayData,
  getGbIngredientAnalysis: aiChatApi.getGbIngredientAnalysis,
  outboundIngredientAnalysis: aiChatApi.outboundIngredientAnalysis,
  // 库存
  getGbStockPurGoods: getGbStockPurGoods,
  getMendianStockTypePeriod: aiChatApi.getMendianStockTypePeriod,
  disGetDayStockByGreatId: aiChatApi.disGetDayStockByGreatId,
  disGetDayStockBySearchDay: disGetDayStockBySearchDay,
  depGetGoodsStockListAll: depGetGoodsStockListAll,
  changeDepStockToAnotherDep: changeDepStockToAnotherDep,
  saveDepProduceGoodsStock: depOrderApi.saveDepProduceGoodsStock,
  saveDepLossGoodsStock: depOrderApi.saveDepLossGoodsStock,
  saveDepReturnGoodsStock: depOrderApi.saveDepReturnGoodsStock,
  saveDepWasteGoodsStock: depOrderApi.saveDepWasteGoodsStock,
  // 菜品销量
  submitDailyFoodSalesAndRevenue: submitDailyFoodSalesAndRevenue,
  getDailyFoodSalesAndRevenue: getDailyFoodSalesAndRevenue,
  updateDailyFoodSalesAndRevenue: updateDailyFoodSalesAndRevenue,
  depGetDepFoodList: depGetDepFoodList,
  upsertDishSalesLine: upsertDishSalesLine,
  deleteDishSalesLine: deleteDishSalesLine,
  updateDailyRevenue: updateDailyRevenue,
  // 报表
  getDate: depOrderApi.getDate,
  getDisUserReportsBusiness: getDisUserReportsBusiness,
  getDisUserReportsCost: getDisUserReportsCost,
  getDisUserReportsPurchase: getDisUserReportsPurchase,
  getDisUserReportsStock: getDisUserReportsStock,
  delteReport: delteReport,
  saveReportCost: saveReportCost,
  depGetSupplier: depGetSupplier,
  // 工作记录
  getWorkRecordConversation: getWorkRecordConversation,
  listWorkRecords: listWorkRecords,
  createWorkRecord: createWorkRecord,
  getWorkRecordCategories: getWorkRecordCategories,
  retryAiWorkRecord: retryAiWorkRecord,
  getWorkRecordSourceCard: getWorkRecordSourceCard,
  updateWorkRecord: updateWorkRecord,
  deleteWorkRecord: deleteWorkRecord,
};
