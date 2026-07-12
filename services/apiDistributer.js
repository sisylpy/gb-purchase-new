/**
 * 分销商/部门用户相关 API（从老项目 apiDistributer.js 迁移）
 * @module services/apiDistributer
 */

var requestUtil = require('../lib/request');

// ========================
// 接口方法
// ========================

/**
 * 删除用户
 * GET gbdepartmentuser/deleteDepUser/{id}
 */
var deleteDepUser = function (id) {
  return requestUtil.get('gbdepartmentuser/deleteDepUser/' + id);
};

/**
 * 更新采购员信息
 * POST gbdepartmentuser/updateJjPurchaserUser
 */
var updateJjPurchaserUser = function (data) {
  return requestUtil.post('gbdepartmentuser/updateJjPurchaserUser', data, { useUrlParams: true });
};

/**
 * 上传图片修改采购员信息
 * 使用 wx.uploadFile，不走 requestUtil.js 封装
 */
var jjPurchaserUserUpdateWithFile = function (filePathList, userName, userId) {
  return new Promise(function (resolve, reject) {
    wx.uploadFile({
      url: requestUtil.apiUrl + 'gbdepartmentuser/jjPurchaserUserUpdateWithFile',
      filePath: filePathList[0],
      name: 'file',
      header: {
        "Content-Type": "multipart/form-data"
      },
      formData: {
        userName: userName,
        userId: userId,
      },
      success: function (res) {
        resolve({ result: res.data });
      },
      fail: function (e) {
        reject(e);
      }
    });
  });
};

/**
 * 获取采购员每日采购数据
 * POST gbdistributerpurchasegoods/getPurUserDate
 */
var getPurUserDate = function (data) {
  return requestUtil.post('gbdistributerpurchasegoods/getPurUserDate', {
    disId: data.disId,
    purUserId: data.purUserId,
    startDate: data.startDate,
    stopDate: data.stopDate,
  }, { useUrlParams: true });
};

/**
 * 获取采购员商品采购记录
 * POST gbdistributerpurchasegoods/getPurchaseUserGoods
 */
var getPurchaseUserGoods = function (data) {
  return requestUtil.post('gbdistributerpurchasegoods/getPurchaseUserGoods', {
    purUserId: data.purUserId,
    startDate: data.startDate,
    stopDate: data.stopDate,
  }, { useUrlParams: true });
};

/**
 * 获取采购商品统计
 * POST gbdistributerpurchasegoods/getGbPurGoodsStatisticsForDis
 */
var getGbPurGoodsStatisticsForDis = function (data) {
  return requestUtil.post('gbdistributerpurchasegoods/getGbPurGoodsStatisticsForDis', {
    purUserIds: data.purUserIds,
    supplierIds: data.supplierIds,
    disId: data.disId,
    startDate: data.startDate,
    stopDate: data.stopDate,
    greatId: data.greatId || -1,
  }, { useUrlParams: true });
};

/**
 * 获取商品采购明细列表
 * POST gbdistributerpurchasegoods/getGbPurGoodsDetailList
 */
var getGbPurGoodsDetailList = function (data) {
  return requestUtil.post('gbdistributerpurchasegoods/getGbPurGoodsDetailList', {
    disGoodsId: data.disGoodsId,
    startDate: data.startDate,
    stopDate: data.stopDate,
  }, { useUrlParams: true });
};

/**
 * 获取损耗商品统计
 * POST gbdepartmentgoodsstockreduce/getGbCostGoodsStatistics
 */
var getGbCostGoodsStatistics = function (data) {
  return requestUtil.post('gbdepartmentgoodsstockreduce/getGbCostGoodsStatistics', {
    supplierIds: data.supplierIds,
    purUserIds: data.purUserIds,
    disId: data.disId,
    startDate: data.startDate,
    stopDate: data.stopDate,
    greatId: data.greatId || -1,
  }, { useUrlParams: true });
};

// ===== settlePageGb 页面需要的 API =====

/**
 * 获取供货商账单列表（按状态筛选）
 * POST gbdistributerpurchasebatch/disGetGbSupplierBillsWithStatus
 */
var disGetGbSupplierBillsWithStatus = function (data) {
  return requestUtil.post('gbdistributerpurchasebatch/disGetGbSupplierBillsWithStatus', {
    supplierId: data.supplierId,
    status: data.status,
    startDate: data.startDate,
    stopDate: data.stopDate,
    disId: data.disId
  }, { useUrlParams: true });
};

// ===== myPurchaseDetail 页面需要的 API =====

/**
 * 获取采购批次详情
 * GET gbdistributerpurchasebatch/getDisPurchaseGoodsBatchDetail/{id}
 */
var getDisPurchaseGoodsBatchDetail = function (id) {
  return requestUtil.get('gbdistributerpurchasebatch/getDisPurchaseGoodsBatchDetail/' + id);
};

module.exports = {
  deleteDepUser: deleteDepUser,
  updateJjPurchaserUser: updateJjPurchaserUser,
  jjPurchaserUserUpdateWithFile: jjPurchaserUserUpdateWithFile,
  getPurUserDate: getPurUserDate,
  getPurchaseUserGoods: getPurchaseUserGoods,
  getGbPurGoodsStatisticsForDis: getGbPurGoodsStatisticsForDis,
  getGbPurGoodsDetailList: getGbPurGoodsDetailList,
  getGbCostGoodsStatistics: getGbCostGoodsStatistics,
  // settlePageGb 需要的 API
  disGetGbSupplierBillsWithStatus: disGetGbSupplierBillsWithStatus,
  // myPurchaseDetail 需要的 API
  getDisPurchaseGoodsBatchDetail: getDisPurchaseGoodsBatchDetail,
};
