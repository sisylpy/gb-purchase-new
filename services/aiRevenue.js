/**
 * 日营业额统计 API
 * 
 * 接口清单:
 * 1. getRevenueStats(departmentId[, { startDate, endDate }]) - 获取营业额统计（天平看板数据）
 */

var requestUtil = require('../lib/request');

/**
 * 获取营业额统计
 * 返回 { stats: {...}, profile: {...} }
 *
 * @param {{ startDate?: string, endDate?: string }} [query] yyyy-MM-dd
 */
var getRevenueStats = function (departmentId, query) {
  query = query || {};
  var data = {};
  if (query.startDate) data.startDate = query.startDate;
  if (query.endDate) data.endDate = query.endDate;
  return requestUtil.get('ai/daily-revenue/stats/' + departmentId, data);
};

module.exports = {
  getRevenueStats: getRevenueStats
};
