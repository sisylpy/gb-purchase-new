/**
 * 供应商相关 API（主包共享模块）
 * 供 subPackage-goods、subPackage-group 等分包引用
 * @module services/supplier
 */

var requestUtil = require('../lib/request');

/**
 * 获取部门的所有供应商
 * GET nxjrdhsupplier/depGetAllSupplier/{depId}
 */
var depGetAllSupplier = function (depId) {
  return requestUtil.get('nxjrdhsupplier/depGetAllSupplier/' + depId);
};

/**
 * 批发商商品指定供货商等字段更新
 * POST gbdistributergoods/disUpdateDisGoodsGb
 */
var disUpdateDisGoodsGb = function (goods) {
  return requestUtil.post('gbdistributergoods/disUpdateDisGoodsGb', goods);
};

module.exports = {
  depGetAllSupplier: depGetAllSupplier,
  disUpdateDisGoodsGb: disUpdateDisGoodsGb,
};
