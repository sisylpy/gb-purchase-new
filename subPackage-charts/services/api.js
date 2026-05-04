/**
 * 日看板 / 商品看板 模块 API
 * 集中管理所有统计看板相关的接口
 */
var request = require('../../lib/request');
var apiUrl = require('../../config/index');
var depOrder = require('../../services/depOrder');



// ===================== 日看板 =====================

/**
 * 获取日看板汇总数据
 * 页面：statistic/index/index
 */
var disGetPurchaseDate = function (data) {
  return request.post('gbdistributerpurchasegoods/disGetPurchaseDate', {
    startDate: data.startDate,
    stopDate: data.stopDate,
    disId: data.disId,
    purUserId: data.purUserId,
    supplierId: data.supplierId
  }, { useUrlParams: true });
};

/**
 * 获取采购明细（按采购员/供应商分类）
 * 页面：statistic/purchaseDeatil/purchaseDeatil
 */
var disGetPurchaseDetailType = function (data) {
  return request.post('gbdistributerpurchasebatch/disGetPurchaseDetailType', {
    startDate: data.startDate,
    stopDate: data.stopDate,
    disId: data.disId,
    supplierIds: data.supplierIds,
    purUserIds: data.purUserIds,
    type: data.type,
    greatId: data.greatId
  }, { useUrlParams: true });
};

// ===================== 按日期成本 =====================

/**
 * 获取商品成本统计（汇总）
 * 页面：statistic/costGoodsByDate/costGoodsByDate
 */
var getGbGoodsCostStatistics = function (data) {
  return request.post('gbdepartmentgoodsstockreduce/getGbGoodsCostStatistics', {
    startDate: data.startDate,
    stopDate: data.stopDate,
    disId: data.disId,
    greatId: data.greatId,
    searchDepId: data.searchDepId
  }, { useUrlParams: true });
};

/**
 * 获取商品成本明细列表（分页）
 * 页面：statistic/costGoodsByDate/costGoodsByDate
 */
var getGoodsCostBySearchDate = function (data) {
  return request.post('gbdepartmentgoodsstockreduce/getGoodsCostBySearchDate', {
    startDate: data.startDate,
    stopDate: data.stopDate,
    type: data.type,
    disId: data.disId,
    searchDepId: data.searchDepId,
    page: data.page,
    limit: data.limit,
    greatId: data.greatId
  }, { useUrlParams: true });
};

/**
 * 商品制作/损耗/废弃等按日汇总（成本分析）
 * 页面：cost/goodsFenxiCost/goodsFenxiCost
 * POST gbdepartmentgoodsstockreduce/getGoodsReduceWithDayData
 */
var getGoodsReduceWithDayData = function (data) {
  return request.post('gbdepartmentgoodsstockreduce/getGoodsReduceWithDayData', {
    startDate: data.startDate,
    stopDate: data.stopDate,
    disGoodsId: data.disGoodsId,
    searchDepId: data.searchDepId != null && data.searchDepId !== '' ? String(data.searchDepId) : '-1',
  }, { useUrlParams: true });
};

/**
 * 菜品成本 / 出库分析
 * POST gbDishCostAnalysis/report
 * reportKind: salesDish（默认）| outboundQty
 * 页面：cost/costGoodsFenxi/costGoodsFenxi
 */
var getGbDishCostAnalysisReport = function (data) {
  var rk = (data.reportKind || 'salesDish').toString();
  var body = {
    startDate: data.startDate,
    stopDate: data.stopDate,
    disId: data.disId,
    searchDepId: data.searchDepId != null && data.searchDepId !== '' ? String(data.searchDepId) : '-1',
    reportKind: rk,
  };
  if (data.depFatherId != null && data.depFatherId !== '') {
    body.depFatherId = String(data.depFatherId);
  }
  return request.post('gbDishCostAnalysis/report', body, { useUrlParams: true });
};


/**
 * 菜品成本
 * 页面：cost/footGoodsFenxi/foodGoodsFenxi
 */
var getGbIngredientAnalysis = function (data) {
  var body = {
    sortBy: data.sortBy,
    sortOrder: data.sortOrder != null && data.sortOrder !== '' ? data.sortOrder : undefined,
    startDate: data.startDate,
    stopDate: data.stopDate,
    disId: data.disId,
    searchDepId: data.searchDepId != null && data.searchDepId !== '' ? String(data.searchDepId) : '-1',
  };
  if (data.depFatherId != null && data.depFatherId !== '') {
    body.depFatherId = String(data.depFatherId);
  }
  if (data.endDate != null && data.endDate !== '') {
    body.endDate = data.endDate;
  }
  return request.post('gbDishCostAnalysis/ingredientAnalysis', body, { useUrlParams: true });
};



/**
 * 菜品成本 / 出库分析
 * POST gbDishCostAnalysis/report
 * 页面：cost/costGoodsFenxi/costGoodsFenxi
 */
var outboundIngredientAnalysis = function (data) {
  var body = {
    sortBy: data.sortBy,
    sortOrder: data.sortOrder != null && data.sortOrder !== '' ? data.sortOrder : undefined,
    startDate: data.startDate,
    stopDate: data.stopDate,
    disId: data.disId,
    searchDepId: data.searchDepId != null && data.searchDepId !== '' ? String(data.searchDepId) : '-1',
  };
  if (data.depFatherId != null && data.depFatherId !== '') {
    body.depFatherId = String(data.depFatherId);
  }
  if (data.endDate != null && data.endDate !== '') {
    body.endDate = data.endDate;
  }
  if (data.goodsNameSearch != null && String(data.goodsNameSearch).trim() !== '') {
    body.goodsNameSearch = String(data.goodsNameSearch).trim();
  }
  if (data.page != null && data.page !== '') {
    body.page = data.page;
  }
  if (data.pageSize != null && data.pageSize !== '') {
    body.pageSize = data.pageSize;
  }
  return request.post('gbDishCostAnalysis/outboundIngredientAnalysis', body, { useUrlParams: true });
};
/**
 * 获取损耗商品统计
 * 页面：
 */
var getGbCostGoodsStatistics = function (data) {
  return request.post('gbdistributerpurchasegoods/getGbCostGoodsStatistics', {
    supplierIds: data.supplierIds,
    purUserIds: data.purUserIds,
    disId: data.disId,
    startDate: data.startDate,
    stopDate: data.stopDate,
    greatId: data.greatId || -1
  }, { useUrlParams: true });
};

// ===================== 商品看板 =====================

/**
 * 获取商品看板汇总（按类别）
 * 页面：statistic/indexGoods/indexGoods
 */
var disGetPurchaseCata = function (data) {
  return request.post('gbdistributerpurchasegoods/disGetPurchaseCata', {
    disId: data.disId,
    startDate: data.startDate,
    stopDate: data.stopDate,
    supplierId: data.supplierId,
    purUserId: data.purUserId
  }, { useUrlParams: true });
};

// ===================== 按日期采购 =====================

/**
 * 获取采购统计汇总（按日期）
 * 页面：statistic/purGoodsByDate/purGoodsByDate
 */
var getGbPurGoodsStatisticsSeachDate = function (data) {
  return request.post('gbdistributerpurchasegoods/getGbPurGoodsStatisticsSeachDate', {
    supplierId: data.supplierId,
    purUserId: data.purUserId,
    disId: data.disId,
    startDate: data.startDate,
    stopDate: data.stopDate,
    greatId: data.greatId
  }, { useUrlParams: true });
};

/**
 * 获取采购商品明细列表（分页）
 * 页面：statistic/purGoodsByDate/purGoodsByDate
 */
var getGbPurGoodsListSearchDate = function (data) {
  return request.post('gbdistributerpurchasegoods/getGbPurGoodsListSearchDate', {
    supplierId: data.supplierId,
    purUserId: data.purUserId,
    disId: data.disId,
    startDate: data.startDate,
    stopDate: data.stopDate,
    page: data.page,
    limit: data.limit,
    greatId: data.greatId
  }, { useUrlParams: true });
};

// ===================== 库存商品 =====================

/**
 * 获取库存商品列表（分页）
 * 页面：statistic/stockPurGoods/stockPurGoods
 */
var getGbStockPurGoods = function (data) {
  return request.post('gbdepartmentgoodsstock/getGbStockPurGoods', {
    supplierId: data.supplierId,
    purUserId: data.purUserId,
    disId: data.disId,
    startDate: data.startDate,
    stopDate: data.stopDate,
    page: data.page,
    limit: data.limit,
    greatId: data.greatId
  }, { useUrlParams: true });
};

// ===================== 库存管理 =====================

/**
 * 获取库存汇总（按时间维度）
 * 页面：stock/index/index
 */
var getMendianStockTypePeriod = function (data) {
  return request.post('gbdepartmentgoodsstock/getMendianStockTypePeriod', {
    disId: data.disId,
    whichDay: data.whichDay,
    searchDepIds: data.searchDepIds != null ? String(data.searchDepIds) : '',
    searchDepId: data.searchDepId != null ? String(data.searchDepId) : '',
    type: data.type || 0
  }, { useUrlParams: true });
};

/**
 * 按品类ID查库存明细
 * 页面：stock/stockList/stockList
 */
var disGetDayStockByGreatId = function (data) {
  return request.post('gbdepartmentgoodsstock/disGetDayStockByGreatId', {
    searchDepId: data.searchDepId,
    disId: data.disId,
    greatId: data.greatId,
    whichDay: data.whichDay,
    type: data.type
  }, { useUrlParams: true });
};

/**
 * 按日期查库存
 * 页面：stock/stockListOneDay/stockListOneDay
 */
var disGetDayStockBySearchDay = function (data) {
  return request.post('gbdepartmentgoodsstock/disGetDayStockBySearchDay', {
    searchDepId: data.searchDepId,
    disId: data.disId,
    searchDate: data.searchDate
  }, { useUrlParams: true });
};

/**
 * 查商品库存列表
 * 页面：stock 相关页面
 */
var depGetGoodsStockListAll = function (data) {
  return request.post('gbdepartmentgoodsstock/depGetGoodsStockListAll', {
    searchDepIds: data.searchDepIds,
    disGoodsId: data.disGoodsId,
    dateDuring: data.dateDuring
  }, { useUrlParams: true });
};

/**
 * 库存调拨
 * 页面：库存调拨操作
 */
var changeDepStockToAnotherDep = function (data) {
  return request.post('gbdepartmentgoodsstock/changeDepStockToAnotherDep', {
    stockId: data.stockId,
    toDepId: data.toDepId
  }, { useUrlParams: true });
};

/**
 * 出库确认
 * 页面：库存操作
 */
var saveDepProduceGoodsStock = function (data) {
  return request.post('gbdepartmentgoodsstock/saveDepProduceGoodsStock', data, { useUrlParams: true });
};

/**
 * 损耗记录
 * 页面：库存操作
 */
var saveDepLossGoodsStock = function (data) {
  return request.post('gbdepartmentgoodsstock/saveDepLossGoodsStock', data, { useUrlParams: true });
};

/**
 * 废弃记录
 * 页面：库存操作
 */
var saveDepWasteGoodsStock = function (data) {
  return request.post('gbdepartmentgoodsstock/saveDepWasteGoodsStock', data, { useUrlParams: true });
};

/**
 * 退货记录
 * 页面：库存操作
 */
var saveDepReturnGoodsStock = function (data) {
  return request.post('gbdepartmentgoodsstock/saveDepReturnGoodsStock', data, { useUrlParams: true });
};

// ===================== 报表 report（pages/report） =====================

/**
 * 获取服务器日期维度（日/周/月）
 * 页面：report/dateReport/dateReport
 * GET gbdistributer/getDate
 */
var getDate = depOrder.getDate;

/**
 * 用户经营类报表列表
 * GET gbreport/getDisUserReportsBusiness/{userId}
 */
var getDisUserReportsBusiness = function (userId) {
  return request.get('gbreport/getDisUserReportsBusiness/' + userId);
};

/**
 * 用户成本报表列表
 * GET gbreport/getDisUserReportsCost/{userId}
 */
var getDisUserReportsCost = function (userId) {
  return request.get('gbreport/getDisUserReportsCost/' + userId);
};

/**
 * 用户采购报表列表
 * GET gbreport/getDisUserReportsPurchase/{userId}
 */
var getDisUserReportsPurchase = function (userId) {
  return request.get('gbreport/getDisUserReportsPurchase/' + userId);
};

/**
 * 用户库存报表列表
 * GET gbreport/getDisUserReportsStock/{userId}
 */
var getDisUserReportsStock = function (userId) {
  return request.get('gbreport/getDisUserReportsStock/' + userId);
};

/**
 * 删除报表（方法名与历史接口一致：delte）
 * GET gbreport/delteReport/{repId}
 */
var delteReport = function (repId) {
  return request.get('gbreport/delteReport/' + repId);
};

/**
 * 保存成本/经营报表配置
 * POST gbreport/saveReportCost
 * 页面：report/subDepCost/subDepCost
 */
var saveReportCost = function (data) {
  return request.post(
    'gbreport/saveReportCost',
    {
      gbRepDisUserId: data.gbRepDisUserId,
      gbRepIds: data.gbRepIds,
      gbRepType: data.gbRepType,
      gbRepStartDate: data.gbRepStartDate,
      gbRepStopDate: data.gbRepStopDate,
    },
  );
};

/**
 * 部门下供货商列表（采购报表选供应商）
 * POST nxjrdhsupplier/depGetSupplier
 * 注：不可从 subPackage-charts require 供应商分包内模块，故接口放在本包 api
 */
var depGetSupplier = function (data) {
  return request.post('nxjrdhsupplier/depGetSupplier', {
    startDate: data.startDate,
    stopDate: data.stopDate,
    depId: data.depId,
  }, { useUrlParams: true });
};

// ===================== 每日营业额 =====================

/**
 * 获取每日营业额数据
 * 页面：sales/dailyTurnover/dailyTurnover
 */
var getDailyTurnover = function (data) {
  return request.get('ai/daily-revenue/list/' + data.departmentId, {
    startDate: data.startDate,
    endDate: data.endDate
  });
};

/**
 * 保存单条日营业额
 * 页面：sales/addTurnover/addTurnover
 */
var saveDailyTurnover = function (data) {
  return request.post('ai/daily-revenue/save', data);
};

/**
 * 批量保存日营业额
 * 页面：sales/addTurnover/addTurnover
 */
var saveBatchDailyTurnover = function (list) {
  return request.post('ai/daily-revenue/save-batch', list);
};

/**
 * 上传Excel批量导入日营业额
 * 页面：sales/addTurnover/addTurnover
 */
var uploadTurnoverExcel = function (filePath, departmentId, distributerId) {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: apiUrl.apiUrl + 'ai/daily-revenue/upload-excel',
      filePath: filePath,
      name: 'file',
      formData: {
        departmentId: departmentId,
        distributerId: distributerId
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data);
          resolve({ result: data });
        } catch (e) {
          resolve({ result: res.data });
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

/**
 * 提交某日菜品销量（份数）及日营业额指标
 * POST gbdepfood/submitDailyFoodSalesAndRevenue
 */
var submitDailyFoodSalesAndRevenue = function (body) {
  return request.post('gbdepfood/submitDailyFoodSalesAndRevenue', body);
};

/**
 * 获取某日菜品销量及日营收（用于回填）
 * POST gbdepfood/getDailyFoodSalesAndRevenue
 * body: depFatherId、distributerId 必填；recordDate 可选。
 * data: submitShape → 回填编辑表单；dailyRevenue → 只读展示 gb_ai_daily_revenue；
 * lineCount → 有效销量行数。
 */
var getDailyFoodSalesAndRevenue = function (body) {
  var payload = {
    depFatherId: body.depFatherId,
    distributerId: body.distributerId,
  };
  if (body.recordDate != null && body.recordDate !== '') {
    payload.recordDate = body.recordDate;
  }
  return request.post('gbdepfood/getDailyFoodSalesAndRevenue', payload);
};

/**
 * 更新（与 submit 请求体一致，后端内部仍走 upsert）
 * POST gbdepfood/updateDailyFoodSalesAndRevenue
 */
var updateDailyFoodSalesAndRevenue = function (body) {
  return request.post('gbdepfood/updateDailyFoodSalesAndRevenue', body);
};

module.exports = {
  // 报表 report
  getDate: getDate,
  getDisUserReportsBusiness: getDisUserReportsBusiness,
  getDisUserReportsCost: getDisUserReportsCost,
  getDisUserReportsPurchase: getDisUserReportsPurchase,
  getDisUserReportsStock: getDisUserReportsStock,
  delteReport: delteReport,
  saveReportCost: saveReportCost,
  depGetSupplier: depGetSupplier,
  // 每日营业额
  getDailyTurnover: getDailyTurnover,
  saveDailyTurnover: saveDailyTurnover,
  saveBatchDailyTurnover: saveBatchDailyTurnover,
  uploadTurnoverExcel: uploadTurnoverExcel,
  submitDailyFoodSalesAndRevenue: submitDailyFoodSalesAndRevenue,
  getDailyFoodSalesAndRevenue: getDailyFoodSalesAndRevenue,
  updateDailyFoodSalesAndRevenue: updateDailyFoodSalesAndRevenue,
  // 日看板
  disGetPurchaseDate: disGetPurchaseDate,
  disGetPurchaseDetailType: disGetPurchaseDetailType,
  // 按日期成本
  getGbGoodsCostStatistics: getGbGoodsCostStatistics,
  getGoodsCostBySearchDate: getGoodsCostBySearchDate,
  getGoodsReduceWithDayData: getGoodsReduceWithDayData,
  getGbDishCostAnalysisReport: getGbDishCostAnalysisReport,
  getGbCostGoodsStatistics: getGbCostGoodsStatistics,
  // 商品看板
  disGetPurchaseCata: disGetPurchaseCata,
  // 按日期采购
  getGbPurGoodsStatisticsSeachDate: getGbPurGoodsStatisticsSeachDate,
  getGbPurGoodsListSearchDate: getGbPurGoodsListSearchDate,
  // 库存商品
  getGbStockPurGoods: getGbStockPurGoods,
  // 库存管理
  getMendianStockTypePeriod: getMendianStockTypePeriod,
  disGetDayStockByGreatId: disGetDayStockByGreatId,
  disGetDayStockBySearchDay: disGetDayStockBySearchDay,
  depGetGoodsStockListAll: depGetGoodsStockListAll,
  changeDepStockToAnotherDep: changeDepStockToAnotherDep,
  saveDepProduceGoodsStock: saveDepProduceGoodsStock,
  saveDepLossGoodsStock: saveDepLossGoodsStock,
  saveDepWasteGoodsStock: saveDepWasteGoodsStock,
  saveDepReturnGoodsStock: saveDepReturnGoodsStock,
  getGbIngredientAnalysis: getGbIngredientAnalysis,
  outboundIngredientAnalysis: outboundIngredientAnalysis
};
