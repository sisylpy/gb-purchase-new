/**
 * AI 餐厅画像 API 接口
 * 对应后端: GbAiRestaurantProfileController
 * 对应表: gb_ai_restaurant_profile
 * 
 * 接口清单:
 * 1. getAiProfile(departmentId)  - 获取门店画像
 * 2. saveAiProfile(data)         - 创建/更新门店画像
 * 
 * 后端实体字段: restaurantId（不是 departmentId）
 * 前端传 departmentId，后端接口按 departmentId 查询
 */

var requestUtil = require('../lib/request');

/**
 * 获取门店画像
 * GET gbairestaurantprofile/info/{departmentId}
 * @param {number} departmentId - 门店ID
 */
var getAiProfile = function (departmentId) {
  return requestUtil.get('gbairestaurantprofile/info/' + departmentId);
};

/**
 * 创建/更新门店画像
 * POST gbairestaurantprofile/saveProfile
 * @param {Object} data - 画像数据（字段和后端实体对应）
 */
var saveAiProfile = function (data) {
  return requestUtil.post('gbairestaurantprofile/saveProfile', data, { useUrlParams: true });
};

module.exports = {
  getAiProfile: getAiProfile,
  saveAiProfile: saveAiProfile
};
