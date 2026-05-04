/**
 * 供应商相关 API
 * @module subPackage-supplier/services/supplier
 */

var requestUtil = require('../../lib/request');



var gbDisGetAllSuppliers = function (id) {
  return requestUtil.get('nxjrdhsupplier/gbDisGetAllSuppliers/' + id);
};

/**
 * 批发商商品指定「蔬东坡」供货商等字段更新
 * POST gbdistributergoods/disUpdateDisGoodsGb
 */
var disUpdateDisGoodsGb = function (goods) {
  return requestUtil.post('gbdistributergoods/disUpdateDisGoodsGb', goods);
};


/**
 * 按类型与采购方等条件查询采购明细
 * POST gbdistributerpurchasebatch/disGetPurchaseDetaiTypeWithId
 */
var disGetPurchaseDetaiTypeWithId = function (data) {
  return requestUtil.post('gbdistributerpurchasebatch/disGetPurchaseDetaiTypeWithId', {
    startDate: data.startDate,
    stopDate: data.stopDate,
    disId: data.disId,
    purUserId: data.purUserId,
    type: data.type,
    supplierId: data.supplierId,
  }, { useUrlParams: true });
};

/**
 * 获取供应商列表（表格单分页形式）
 * POST nxjrdhsupplier/depGetSupplier
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

var disGetDepGoodsGbPageWithSupplier = function (data) {
  return requestUtil.post('gbdepartmentdisgoods/disGetDepGoodsGbPageWithSupplier', data, { useUrlParams: true });
};

var disGetDepGoodsCataGbWithSupplier = function (data) {
  return requestUtil.post('gbdepartmentdisgoods/disGetDepGoodsCataGbWithSupplier', data, { useUrlParams: true });
};
module.exports = {
  depGetSupplier: depGetSupplier,
  deleteGbDisSuppler: deleteGbDisSuppler,
  addGbSupplierBlack: addGbSupplierBlack,
  updateJrdhSupplier: updateJrdhSupplier,
  disGetPurchaseDetaiTypeWithId: disGetPurchaseDetaiTypeWithId,
  disGetDepGoodsCataGbWithSupplier: disGetDepGoodsCataGbWithSupplier,
  disGetDepGoodsGbPageWithSupplier: disGetDepGoodsGbPageWithSupplier,
  gbDisGetAllSuppliers: gbDisGetAllSuppliers,
  disUpdateDisGoodsGb: disUpdateDisGoodsGb,
};
