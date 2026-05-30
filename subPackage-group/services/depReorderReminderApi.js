/**
 * 订货习惯提醒分页（与 docs/gb-dep-reorder-reminder-api.md 一致）
 * POST gbdepartmentdisgoods/depReorderReminderPage
 * 服务端规则：库存过剩过滤时参考日均 = max(习惯或单次估算日均, aiReduceProductionDailyAvg 可解析且>0 时)，见文档 §5.8
 */

var request = require('../../lib/request');

/**
 * @param {Object} data
 * @param {number|string} data.depId 部门 ID
 * @param {number|string} data.page 页码，从 1 开始
 * @param {number|string} data.limit 每页条数
 * @param {number|string} [data.windowDays] 回溯天数，默认服务端 56
 * @param {number|string} [data.minTimes] 窗口内最少到货次数，默认服务端 2
 * @returns {Promise<{ result: { code: number, page?: object, msg?: string } }>}
 */
function depReorderReminderPage(data) {
  return request.post('gbdepartmentdisgoods/depReorderReminderPage', data, { useUrlParams: true });
}

module.exports = {
  depReorderReminderPage: depReorderReminderPage,
};
