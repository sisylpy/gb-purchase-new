/**
 * subPackage-ai 专用 API（仅导出本子包实际使用的方法）
 */
var aiChatApi = require('../../services/aiChatApi');

module.exports = {
  getRevenueStats: aiChatApi.getRevenueStats,
  getAiProfile: aiChatApi.getAiProfile,
  updateAiProfile: aiChatApi.updateAiProfile,
};
