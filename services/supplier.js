/**
 * 供应商相关 API（主包共享，各分包可引用）
 * @module services/supplier
 */

var request = require('../lib/request');

var depGetAllSupplier = function (depId) {
  return request.get('nxjrdhsupplier/depGetAllSupplier/' + depId);
};

var gbDisGetAllSuppliers = function (id) {
  return request.get('nxjrdhsupplier/gbDisGetAllSuppliers/' + id);
};

var disUpdateDisGoodsGb = function (goods) {
  return request.post('gbdistributergoods/disUpdateDisGoodsGb', goods);
};

var updateDepGoods = function (depGoods) {
  return request.post('gbdepartmentdisgoods/updateDepGoods', depGoods);
};

var disGetPurchaseDetaiTypeWithId = function (data) {
  return request.post('gbdistributerpurchasebatch/disGetPurchaseDetaiTypeWithId', {
    startDate: data.startDate,
    stopDate: data.stopDate,
    disId: data.disId,
    purUserId: data.purUserId,
    type: data.type,
    supplierId: data.supplierId,
  }, { useUrlParams: true });
};

var depGetSupplier = function (data) {
  return request.post('nxjrdhsupplier/depGetSupplier', {
    startDate: data.startDate,
    stopDate: data.stopDate,
    depId: data.depId,
  }, { useUrlParams: true });
};

var deleteGbDisSuppler = function (id) {
  return request.get('nxjrdhsupplier/deleteGbDisSuppler/' + id);
};

var addGbSupplierBlack = function (id) {
  return request.get('nxjrdhsupplier/addGbSupplierBlack/' + id);
};

var updateJrdhSupplier = function (data) {
  return request.post('nxjrdhsupplier/updateJrdhSupplier', data);
};

var disGetDepGoodsGbPageWithSupplier = function (data) {
  return request.post('gbdepartmentdisgoods/disGetDepGoodsGbPageWithSupplier', data, { useUrlParams: true });
};

var disGetDepGoodsCataGbWithSupplier = function (data) {
  return request.post('gbdepartmentdisgoods/disGetDepGoodsCataGbWithSupplier', data, { useUrlParams: true });
};

module.exports = {
  depGetAllSupplier: depGetAllSupplier,
  gbDisGetAllSuppliers: gbDisGetAllSuppliers,
  disUpdateDisGoodsGb: disUpdateDisGoodsGb,
  updateDepGoods: updateDepGoods,
  disGetPurchaseDetaiTypeWithId: disGetPurchaseDetaiTypeWithId,
  depGetSupplier: depGetSupplier,
  deleteGbDisSuppler: deleteGbDisSuppler,
  addGbSupplierBlack: addGbSupplierBlack,
  updateJrdhSupplier: updateJrdhSupplier,
  disGetDepGoodsGbPageWithSupplier: disGetDepGoodsGbPageWithSupplier,
  disGetDepGoodsCataGbWithSupplier: disGetDepGoodsCataGbWithSupplier,
};
