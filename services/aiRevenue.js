/**
 * 日营业额统计 API
 * 
 * 接口清单:
 * 1. getRevenueStats(departmentId) - 获取营业额统计（天平看板数据）
 */

var requestUtil = require('../lib/request');

/**
 * 获取营业额统计
 * 返回 { stats: {...}, profile: {...} }
 */
var getRevenueStats = function (departmentId) {
  return requestUtil.get('ai/daily-revenue/stats/' + departmentId);
};

module.exports = {
  getRevenueStats: getRevenueStats
};
