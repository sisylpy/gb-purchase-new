/**
 * AI 模块统一 API 接口
 * 对应后端控制器: AiChatController, GbAiRestaurantProfileController
 *
 * 接口清单:
 * ====== AI 对话 (AiChatController) ======
 * createConversation(departmentId, userId, type) - 创建/恢复对话
 * sendMessage(conversationId, message)           - 发送消息（非流式）
 * getHistory(conversationId)                     - 获取对话历史
 * endConversation(conversationId)                 - 结束对话（触发记忆提取）
 *
 * ====== 门店画像 (GbAiRestaurantProfileController) ======
 * getAiProfile(departmentId)   - 获取门店画像
 * updateAiProfile(data)         - 更新门店画像
 *
 * ====== 营业额统计 (ai/daily-revenue) ======
 * getRevenueStats(departmentId) - 获取营业额统计
 */

var request = require('../../lib/request');

// ============================================================
// AI 对话
// ============================================================

/**
 * 创建或恢复对话
 * POST ai/chat/conversation?departmentId=xxx&userId=xxx&type=0|1|2
 */
var createConversation = function (departmentId, userId, type) {
  var url = 'ai/chat/conversation?departmentId=' + departmentId + '&userId=' + userId;
  if (type !== undefined && type !== null && type !== '') {
    url += '&type=' + type;
  }
  return request.post(url, {});
};

/**
 * 发送消息（非流式）
 * POST ai/chat/send?conversationId=xxx
 */
var sendMessage = function (conversationId, message) {
  return request.post('ai/chat/send?conversationId=' + conversationId, { message: message });
};

/**
 * 获取对话历史
 * GET ai/chat/history/{conversationId}
 */
var getHistory = function (conversationId) {
  return request.get('ai/chat/history/' + conversationId);
};

/**
 * 结束对话（触发记忆提取）
 * POST ai/chat/end/{conversationId}
 */
var endConversation = function (conversationId) {
  return request.post('ai/chat/end/' + conversationId, {});
};

// ============================================================
// 门店画像
// ============================================================

/**
 * 获取门店画像
 * GET gbairestaurantprofile/info/{departmentId}
 */
var getAiProfile = function (departmentId) {
  return request.get('gbairestaurantprofile/info/' + departmentId);
};

/**
 * 创建/更新门店画像
 * POST gbairestaurantprofile/saveProfile
 */
var updateAiProfile = function (data) {
  return request.post('gbairestaurantprofile/saveProfile', data);
};

// ============================================================
// 营业额统计
// ============================================================

/**
 * 获取营业额统计
 * GET ai/daily-revenue/stats/{departmentId}
 */
var getRevenueStats = function (departmentId) {
  return request.get('ai/daily-revenue/stats/' + departmentId);
};

// ============================================================
// 导出
// ============================================================

module.exports = {
  // AI 对话
  createConversation: createConversation,
  sendMessage: sendMessage,
  getHistory: getHistory,
  endConversation: endConversation,
  // 门店画像
  getAiProfile: getAiProfile,
  updateAiProfile: updateAiProfile,
  // 营业额统计
  getRevenueStats: getRevenueStats,
};
