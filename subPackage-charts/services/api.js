/**
 * subPackage-charts 专用 API
 * 从主包 aiChatApi 继承所有方法 + 本包专属扩展
 */
var request = require('../../lib/request');
var aiChatApi = require('../../services/aiChatApi');

// ============================================================
// 本包专属：商品成本统计
// ============================================================

var getGbGoodsCostStatistics = function (payload) {
  return request.post('gbdepartmentgoodsstockreduce/getGbGoodsCostStatistics', payload, { useUrlParams: true });
};

var getGoodsCostBySearchDate = function (payload) {
  return request.post('gbdepartmentgoodsstockreduce/getGoodsCostBySearchDate', payload, { useUrlParams: true });
};

// ============================================================
// 本包专属：菜品销量 & 营业额
// ============================================================

/**
 * 提交某日菜品销量（份数）及日营业额指标
 * POST /gbdepfood/submitDailyFoodSalesAndRevenue
 * @RequestBody JSON
 */
var submitDailyFoodSalesAndRevenue = function (payload) {
  return request.post('gbdepfood/submitDailyFoodSalesAndRevenue', payload);
};

/**
 * 获取某日菜品销售 + 同日营业额表单字段
 * POST /gbdepfood/getDailyFoodSalesAndRevenue
 * @RequestBody JSON
 */
var getDailyFoodSalesAndRevenue = function (payload) {
  return request.post('gbdepfood/getDailyFoodSalesAndRevenue', payload);
};

/**
 * 修改某日菜品销售 + 同日营业额
 * POST /gbdepfood/updateDailyFoodSalesAndRevenue
 * @RequestBody JSON
 */
var updateDailyFoodSalesAndRevenue = function (payload) {
  return request.post('gbdepfood/updateDailyFoodSalesAndRevenue', payload);
};

// ============================================================
// 本包专属：报表
// ============================================================

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

// ============================================================
// 显式合并导出（避免转发 require 被缓存）
// ============================================================
var api = {};
var key;
for (key in aiChatApi) {
  if (aiChatApi.hasOwnProperty(key)) {
    api[key] = aiChatApi[key];
  }
}
api.getGbGoodsCostStatistics = getGbGoodsCostStatistics;
api.getGoodsCostBySearchDate = getGoodsCostBySearchDate;
api.submitDailyFoodSalesAndRevenue = submitDailyFoodSalesAndRevenue;
api.getDailyFoodSalesAndRevenue = getDailyFoodSalesAndRevenue;
api.updateDailyFoodSalesAndRevenue = updateDailyFoodSalesAndRevenue;
api.getDisUserReportsBusiness = getDisUserReportsBusiness;
api.getDisUserReportsCost = getDisUserReportsCost;
api.getDisUserReportsPurchase = getDisUserReportsPurchase;
api.getDisUserReportsStock = getDisUserReportsStock;

module.exports = api;
