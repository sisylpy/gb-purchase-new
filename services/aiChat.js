/**
 * AI 对话 API 接口
 * 对应后端: AiChatController
 *
 * 接口清单:
 * 1. createConversation(departmentId, userId) - 创建/恢复对话
 * 2. sendMessage(conversationId, msg)          - 发送消息（非流式）
 * 3. getHistory(conversationId)               - 获取对话历史
 * 4. endConversation(conversationId)          - 结束对话（触发记忆提取）
 */

var requestUtil = require('../lib/request');

/**
 * 创建或恢复对话
 * POST ai/chat/conversation?departmentId=xxx&userId=xxx&type=0|1|2
 * @param {number} departmentId - 门店ID
 * @param {number} userId - 用户ID
 * @param {number} type - 对话类型：0-经营分析 1-促销活动 2-公众号文章
 * @returns {Promise<Object>} 对话对象 { id, departmentId, status, ... }
 */
var createConversation = function (departmentId, userId, type) {
  var url = 'ai/chat/conversation?departmentId=' + departmentId + '&userId=' + userId;
  if (type !== undefined && type !== null && type !== '') {
    url += '&type=' + type;
  }
  return requestUtil.post(url, {}, { useUrlParams: true });
};

/**
 * 发送消息（非流式）
 * POST ai/chat/send?conversationId=xxx
 * @param {number} conversationId - 对话ID
 * @param {string} message - 用户消息内容
 * @returns {Promise<Object>} AI 回复消息对象 { id, role, content, ... }
 */
var sendMessage = function (conversationId, message) {
  return requestUtil.post('ai/chat/send?conversationId=' + conversationId, { message: message }, { useUrlParams: true });
};

/**
 * 获取对话历史
 * GET ai/chat/history/{conversationId}
 * @param {number} conversationId - 对话ID
 * @returns {Promise<Array>} 消息列表 [{ id, role, content, createdAt, ... }]
 */
var getHistory = function (conversationId) {
  return requestUtil.get('ai/chat/history/' + conversationId);
};

/**
 * 结束对话（触发记忆提取）
 * POST ai/chat/end/{conversationId}
 * @param {number} conversationId - 对话ID
 */
var endConversation = function (conversationId) {
  return requestUtil.post('ai/chat/end/' + conversationId, {}, { useUrlParams: true });
};

module.exports = {
  createConversation: createConversation,
  sendMessage: sendMessage,
  getHistory: getHistory,
  endConversation: endConversation
};
