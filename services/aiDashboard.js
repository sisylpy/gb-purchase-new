/**
 * 智能经营看板 API 服务
 * @module services/aiDashboard
 */

var requestUtil = require('../lib/request');

/**
 * 获取并渲染智能经营看板
 * POST ai/dashboard/my/render
 */
var renderDashboard = function (data) {
  return requestUtil.post('ai/dashboard/my/render', data);
};

/**
 * 获取关注卡片类型目录
 * GET ai/dashboard/focus-widget-catalog
 */
var getFocusWidgetCatalog = function () {
  return requestUtil.get('ai/dashboard/focus-widget-catalog');
};

/**
 * 添加关注卡片
 * POST ai/dashboard/focus-widgets
 */
var addFocusWidget = function (data) {
  return requestUtil.post('ai/dashboard/focus-widgets', data);
};

/**
 * 修改关注卡片
 * PUT ai/dashboard/focus-widgets/{widgetId}
 */
var updateFocusWidget = function (widgetId, data) {
  return requestUtil.request('ai/dashboard/focus-widgets/' + widgetId, data, { method: 'PUT' });
};

/**
 * 删除关注卡片
 * DELETE ai/dashboard/focus-widgets/{widgetId}?userId=3
 */
var deleteFocusWidget = function (widgetId, userId) {
  return requestUtil.request('ai/dashboard/focus-widgets/' + widgetId + '?userId=' + userId, {}, { method: 'DELETE' });
};

/**
 * 修改模块配置
 * PUT ai/dashboard/modules/{moduleId}
 */
var updateModule = function (moduleId, data) {
  return requestUtil.request('ai/dashboard/modules/' + moduleId, data, { method: 'PUT' });
};

/**
 * 模块排序
 * PUT ai/dashboard/modules/reorder
 */
var reorderModules = function (data) {
  return requestUtil.request('ai/dashboard/modules/reorder', data, { method: 'PUT' });
};

module.exports = {
  renderDashboard: renderDashboard,
  getFocusWidgetCatalog: getFocusWidgetCatalog,
  addFocusWidget: addFocusWidget,
  updateFocusWidget: updateFocusWidget,
  deleteFocusWidget: deleteFocusWidget,
  updateModule: updateModule,
  reorderModules: reorderModules,
};
