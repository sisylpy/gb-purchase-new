/**
 * 供应商相关 API
 * @module subPackage-supplier/services/supplier
 */

var requestUtil = require('../../lib/request');

/**
 * 获取供应商列表（表格单分页形式）
 * POST nxjrdhsupplier/depGetSupplierPage
 */
var depGetSupplier = function (data) {
  return requestUtil.post('nxjrdhsupplier/depGetSupplier', {
    startDate: data.startDate,
    stopDate: data.stopDate,
    depId: data.depId,
  }, { useUrlParams: true });
};

/**
 * 删除供应商
 * GET nxjrdhsupplier/deleteGbDisSuppler/{id}
 */
var deleteGbDisSuppler = function (id) {
  return requestUtil.get('nxjrdhsupplier/deleteGbDisSuppler/' + id);
};

/**
 * 添加供应商到黑名单
 * GET nxjrdhsupplier/addGbSupplierBlack/{id}
 */
var addGbSupplierBlack = function (id) {
  return requestUtil.get('nxjrdhsupplier/addGbSupplierBlack/' + id);
};

/**
 * 更新供应商信息
 * POST nxjrdhsupplier/updateJrdhSupplier
 */
var updateJrdhSupplier = function (data) {
  return requestUtil.post('nxjrdhsupplier/updateJrdhSupplier', data);
};

module.exports = {
  depGetSupplier: depGetSupplier,
  deleteGbDisSuppler: deleteGbDisSuppler,
  addGbSupplierBlack: addGbSupplierBlack,
  updateJrdhSupplier: updateJrdhSupplier,
};
