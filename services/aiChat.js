/**
 * AI 对话 API 接口
 * 对应后端: AiChatController
 *
 * 接口清单:
 * 1. createConversation(opts) 或 (departmentId, userId, type) - 创建/恢复对话
 * 2. sendMessage(conversationId, msg)          - 发送消息（非流式）
 * 3. getHistory(conversationId)               - 获取对话历史
 * 4. endConversation(conversationId)          - 结束对话（触发记忆提取）
 */

var requestUtil = require('../lib/request');

/**
 * 创建或恢复对话
 * POST ai/chat/conversation?userId=…&departmentId=…&distributerId=…&scopeMode=…&type=…
 */
var createConversation = function (a, b, c) {
  var opts;
  if (a !== null && typeof a === 'object' && !Array.isArray(a) && a.userId != null) {
    opts = a;
  } else {
    opts = { departmentId: a, userId: b, type: c };
  }

  var qs =
    'userId=' +
    encodeURIComponent(opts.userId) +
    (opts.departmentId !== undefined && opts.departmentId !== null && opts.departmentId !== ''
      ? '&departmentId=' + encodeURIComponent(opts.departmentId)
      : '') +
    (opts.scopeMode !== undefined && opts.scopeMode !== null && opts.scopeMode !== ''
      ? '&scopeMode=' + encodeURIComponent(opts.scopeMode)
      : '') +
    (opts.distributerId !== undefined && opts.distributerId !== null && opts.distributerId !== ''
      ? '&distributerId=' + encodeURIComponent(opts.distributerId)
      : '') +
    (opts.type !== undefined && opts.type !== null && opts.type !== ''
      ? '&type=' + encodeURIComponent(opts.type)
      : '');

  return requestUtil.post('ai/chat/conversation?' + qs, {}, { useUrlParams: true });
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
