/**
 * AI 添加商品 — POST ai/goods-add/analyze | confirm
 * （config.apiUrl 已含 /api/ 前缀时，等价于文档中的 /api/ai/goods-add/...）
 * 成功时 data 还可含 persistedGoods、gbDistributerGoods、gbDepartmentDisGoods 等
 */
var request = require('../../lib/request');

var analyze = function (data) {
  return request.post('ai/goods-add/analyze', data);
};

var confirm = function (data) {
  return request.post('ai/goods-add/confirm', data);
};

module.exports = {
  analyze: analyze,
  confirm: confirm,
};
