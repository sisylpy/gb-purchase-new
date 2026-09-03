/**
 * 备料管理 P1-P4 正式接口。
 *
 * 统一复用 lib/request，不维护第二套登录态、域名或网络层。这里仅负责：
 * 1. 按正式 Controller 组装路径；2. 同时校验 HTTP 状态与响应体业务码；
 * 3. 将后端原始错误信息保留给页面展示。
 */
var http = require('../lib/request');

function asCode(value) {
  if (value === null || typeof value === 'undefined' || value === '') return 0;
  var parsed = Number(value);
  return isNaN(parsed) ? value : parsed;
}

function normalizeError(error) {
  if (error && error.preparationError) return error;
  var response = error || {};
  var body = response.data || response.result || {};
  var httpStatus = Number(response.statusCode || response.status || 0);
  var businessCode = asCode(body.code);
  var status = httpStatus >= 200 && httpStatus < 300 && Number(businessCode) !== 0
    ? Number(businessCode)
    : Number(httpStatus || businessCode || 0);
  var message = body.msg || body.message || response.errMsg || '请求失败，请稍后重试';
  return {
    preparationError: true,
    authenticationFailure: !!response.authenticationFailure,
    status: status,
    code: Number(businessCode) !== 0 ? businessCode : asCode(status),
    message: String(message),
    raw: error,
  };
}

function call(path, data, method, options) {
  var opts = Object.assign({
    method: method || 'GET',
    showErrorToast: false,
  }, options || {});
  if (opts.method !== 'GET' && !opts.contentType) {
    opts.contentType = 'application/json';
  }
  return http.request(path, data || {}, opts).then(function (response) {
    var body = response && response.result ? response.result : {};
    if (asCode(body.code) !== 0) {
      return Promise.reject(normalizeError({
        statusCode: 200,
        data: body,
      }));
    }
    return body.data;
  }).catch(function (error) {
    return Promise.reject(normalizeError(error));
  });
}

function compactQuery(query) {
  var result = {};
  Object.keys(query || {}).forEach(function (key) {
    var value = query[key];
    if (value !== null && typeof value !== 'undefined' && value !== '') {
      result[key] = value;
    }
  });
  return result;
}

function get(path, query) {
  return call(path, compactQuery(query), 'GET');
}

function post(path, body) {
  return call(path, body, 'POST');
}

function put(path, body) {
  return call(path, body, 'PUT');
}

function createIdempotencyKey(prefix) {
  var random = Math.random().toString(36).slice(2, 10);
  return String(prefix || 'PREP') + '-' + Date.now() + '-' + random;
}

function queryString(params) {
  var parts = [];
  Object.keys(params || {}).forEach(function (key) {
    var value = params[key];
    if (value !== null && typeof value !== 'undefined' && value !== '') {
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(value)));
    }
  });
  return parts.length ? '?' + parts.join('&') : '';
}

// 普通门店轻量备料：不传分销商、部门或操作人，范围由正式登录身份决定。
function getStorePreparationHome() {
  return get('preparation/store/home');
}

function listStoreProducts(status) {
  return get('preparation/store/products', { status: status });
}

function getStoreProduct(id) {
  return get('preparation/store/products/' + id);
}

function createStoreProduct(body) {
  return post('preparation/store/products', body);
}

function updateStoreProduct(id, body) {
  return put('preparation/store/products/' + id, body);
}

function changeStoreProductStatus(id, enabled, rowVersion) {
  return post('preparation/store/products/' + id + '/' + (enabled ? 'enable' : 'disable'), {
    rowVersion: rowVersion,
  });
}

function getStoreRecipe(productId) {
  return get('preparation/store/products/' + productId + '/recipe');
}

function searchStoreIngredientOptions(productId, keyword, excludeRawGoodsIds) {
  var normalizedKeyword = String(keyword || '').trim();
  if (!normalizedKeyword) return Promise.resolve([]);
  return get('preparation/store/products/' + productId + '/ingredient-options', {
    keyword: normalizedKeyword,
    excludeRawGoodsIds: (excludeRawGoodsIds || []).join(','),
  });
}

function saveStoreRecipe(productId, body) {
  return put('preparation/store/products/' + productId + '/recipe', body);
}

function listStoreLossMaterials(productId) {
  return get('preparation/store/products/' + productId + '/loss-materials');
}

function listStoreLossStocks(productId, recipeComponentId) {
  return get('preparation/store/products/' + productId + '/loss-materials/' + recipeComponentId + '/stock-batches');
}

function createStoreRawLoss(body) {
  return post('preparation/store/losses', body);
}

function listStoreRawLosses(productId) {
  return get('preparation/store/losses', { productId: productId });
}

// P1：部门能力、中间制品、单位换算和版本化配方。
function listCapabilities(distributerId, departmentId) {
  return get('preparation/p1/department-capabilities', {
    distributerId: distributerId,
    departmentId: departmentId,
  });
}

function listProducts(distributerId, status) {
  return get('preparation/p1/intermediate-products', {
    distributerId: distributerId,
    status: status,
  });
}

function getProduct(id, distributerId) {
  return get('preparation/p1/intermediate-products/' + id, { distributerId: distributerId });
}

function createProduct(body) {
  return post('preparation/p1/intermediate-products', body);
}

function updateProduct(id, body) {
  return put('preparation/p1/intermediate-products/' + id, body);
}

function changeProductStatus(id, enabled, body) {
  return post('preparation/p1/intermediate-products/' + id + '/' + (enabled ? 'enable' : 'disable'), body);
}

function listConversions(params) {
  return get('preparation/p1/unit-conversions', params);
}

function saveConversion(body) {
  return put('preparation/p1/unit-conversions', body);
}

function disableConversion(id, body) {
  return post('preparation/p1/unit-conversions/' + id + '/disable', body);
}

function createIntermediateRecipe(body) {
  return post('preparation/p1/intermediate-recipes', body);
}

function getIntermediateRecipe(recipeId, distributerId, versionId) {
  return get('preparation/p1/intermediate-recipes/' + recipeId, {
    distributerId: distributerId,
    versionId: versionId,
  });
}

function listIntermediateVersions(recipeId, distributerId) {
  return get('preparation/p1/intermediate-recipes/' + recipeId + '/versions', {
    distributerId: distributerId,
  });
}

function saveIntermediateDraft(recipeId, versionId, body) {
  return put('preparation/p1/intermediate-recipes/' + recipeId + '/versions/' + versionId + '/draft', body);
}

function intermediateVersionAction(recipeId, versionId, action, body) {
  return post('preparation/p1/intermediate-recipes/' + recipeId + '/versions/' + versionId + '/' + action, body);
}

function getFoodRecipeByFood(foodId, distributerId) {
  return get('preparation/p1/food-recipes/by-food/' + foodId, { distributerId: distributerId });
}

function enableVersionedFood(foodId, body) {
  return post('preparation/p1/food-recipes/foods/' + foodId + '/enable-versioned', body);
}

function getFoodRecipe(recipeId, distributerId, versionId) {
  return get('preparation/p1/food-recipes/' + recipeId, {
    distributerId: distributerId,
    versionId: versionId,
  });
}

function listFoodVersions(recipeId, distributerId) {
  return get('preparation/p1/food-recipes/' + recipeId + '/versions', { distributerId: distributerId });
}

function saveFoodDraft(recipeId, versionId, body) {
  return put('preparation/p1/food-recipes/' + recipeId + '/versions/' + versionId + '/draft', body);
}

function foodVersionAction(recipeId, versionId, action, body) {
  return post('preparation/p1/food-recipes/' + recipeId + '/versions/' + versionId + '/' + action, body);
}

function listFoodEffectiveIntervals(recipeId, distributerId, storeDepartmentId) {
  return get('preparation/p1/food-recipes/' + recipeId + '/effective-intervals', {
    distributerId: distributerId,
    storeDepartmentId: storeDepartmentId,
  });
}

function selectFoodEffectiveVersion(storeDepartmentId, foodId, businessDate) {
  return get('preparation/p1/food-recipes/effective-selection', {
    storeDepartmentId: storeDepartmentId,
    foodId: foodId,
    businessDate: businessDate,
  });
}

function previewFoodEffectiveInterval(recipeId, versionId, body) {
  return post(
    'preparation/p1/food-recipes/' + recipeId + '/versions/' + versionId
      + '/effective-intervals/preview',
    body
  );
}

function confirmFoodEffectiveInterval(recipeId, versionId, body) {
  return post(
    'preparation/p1/food-recipes/' + recipeId + '/versions/' + versionId
      + '/effective-intervals/confirm',
    body
  );
}

function confirmFoodEffectiveIntervalWithReplacement(recipeId, versionId, body) {
  return post(
    'preparation/p1/food-recipes/' + recipeId + '/versions/' + versionId
      + '/effective-intervals/confirm-with-replacement',
    body
  );
}

function previewRemoveFoodEffectiveInterval(recipeId, intervalId, body) {
  return post(
    'preparation/p1/food-recipes/' + recipeId + '/effective-intervals/' + intervalId
      + '/remove-preview',
    body
  );
}

function confirmRemoveFoodEffectiveInterval(recipeId, intervalId, body) {
  return post(
    'preparation/p1/food-recipes/' + recipeId + '/effective-intervals/' + intervalId
      + '/remove-confirm',
    body
  );
}

function listHistoricalReceiptBatches(params) {
  return get('cost-accounting/historical-theory-prices/receipt-batches', params || {});
}

function resolveHistoricalTheoryPrice(params) {
  return get('cost-accounting/historical-theory-prices/resolve', params || {});
}

function getDishDailyCostReport(params) {
  return get('cost-accounting/daily-costs/report', params || {});
}

function previewHistoricalReceiptCorrection(stockBatchId, body) {
  return post(
    'cost-accounting/historical-theory-prices/receipt-batches/' + stockBatchId
      + '/corrections/preview',
    body
  );
}

function confirmHistoricalReceiptCorrection(stockBatchId, body) {
  return post(
    'cost-accounting/historical-theory-prices/receipt-batches/' + stockBatchId
      + '/corrections/confirm',
    body
  );
}

function listRawGoodsReplacements(params) {
  return get('cost-accounting/raw-goods-replacements', params || {});
}

function previewRawGoodsReplacement(body) {
  return post('cost-accounting/raw-goods-replacements/preview', body);
}

function confirmRawGoodsReplacement(body) {
  return post('cost-accounting/raw-goods-replacements/confirm', body);
}

function previewRemoveRawGoodsReplacement(intervalId, body) {
  return post('cost-accounting/raw-goods-replacements/' + intervalId + '/remove-preview', body);
}

function confirmRemoveRawGoodsReplacement(intervalId, body) {
  return post('cost-accounting/raw-goods-replacements/' + intervalId + '/remove-confirm', body);
}

// P2：生产批次、领料、完成和领料冲销。
function createBatch(body) {
  return post('preparation/p2/batches', body);
}

function listBatches(params) {
  return get('preparation/p2/batches', params);
}

function getBatch(batchId, distributerId) {
  return get('preparation/p2/batches/' + batchId, { distributerId: distributerId });
}

function listPublishedRecipeVersions(productId, distributerId) {
  return get('preparation/p2/intermediate-products/' + productId + '/published-recipe-versions', {
    distributerId: distributerId,
  });
}

function listRequiredMaterials(batchId, distributerId) {
  return get('preparation/p2/batches/' + batchId + '/required-materials', {
    distributerId: distributerId,
  });
}

function listCandidateStocks(batchId, componentId, distributerId) {
  return get('preparation/p2/batches/' + batchId + '/recipe-components/' + componentId + '/stock-batches', {
    distributerId: distributerId,
  });
}

function issueMaterials(batchId, body) {
  return post('preparation/p2/batches/' + batchId + '/issue', body);
}

function reverseIssue(batchId, body) {
  return post('preparation/p2/batches/' + batchId + '/issue-reversal', body);
}

function completeBatch(batchId, body) {
  return post('preparation/p2/batches/' + batchId + '/complete', body);
}

function getCostTrace(batchId, distributerId) {
  return get('preparation/p2/batches/' + batchId + '/cost-trace', { distributerId: distributerId });
}

// P3：用于菜品、废弃和冲销。
function listAvailableBatches(productId, distributerId, departmentId) {
  return get('preparation/p3/intermediate-products/' + productId + '/available-batches', {
    distributerId: distributerId,
    departmentId: departmentId,
  });
}

function createFoodUse(body) {
  return post('preparation/p3/food-production-facts', body);
}

function listFoodUses(params) {
  return get('preparation/p3/food-production-facts', params);
}

function getFoodUse(factId, distributerId) {
  return get('preparation/p3/food-production-facts/' + factId, { distributerId: distributerId });
}

function reverseFoodUse(factId, body) {
  return post('preparation/p3/food-production-facts/' + factId + '/reversal', body);
}

function createDiscard(batchId, body) {
  return post('preparation/p3/intermediate-batches/' + batchId + '/discards', body);
}

function listDiscards(params) {
  return get('preparation/p3/discards', params);
}

function getDiscard(discardId, distributerId) {
  return get('preparation/p3/discards/' + discardId, { distributerId: distributerId });
}

function reverseDiscard(discardId, body) {
  return post('preparation/p3/discards/' + discardId + '/reversal', body);
}

// P4：成本证据与备料损耗。
function getFoodCostAnalysis(foodId, params) {
  return get('preparation/p4/foods/' + foodId + '/cost-analysis', params);
}

function getFoodCostEvidence(foodId, params) {
  return get('preparation/p4/foods/' + foodId + '/cost-evidence', params);
}

function getLossAnalysis(productId, params) {
  return get('preparation/p4/intermediate-products/' + productId + '/loss-analysis', params);
}

// 复用既有商品、菜品正式数据作为选择器数据源。
function searchRawGoods(distributerId, keyword) {
  return call('gbdistributergoods/queryDisGoodsByQuickSearchGb', {
    disId: distributerId,
    searchStr: keyword || '',
  }, 'POST', {
    useUrlParams: true,
    contentType: 'application/x-www-form-urlencoded',
  });
}

function getRawGoods(goodsId) {
  return get('gbdistributergoods/gbDisGetGoodsDetail/' + goodsId).then(function (payload) {
    return payload && payload.goodsInfo ? payload.goodsInfo : payload;
  });
}

function listFoodTree(distributerId) {
  return get('gbdistributerfood/disGetFood/' + distributerId);
}

function getFoodDetail(foodId) {
  return get('gbdistributerfood/getFoodByFoodId/' + foodId);
}

function getLegacyFoodGoods(foodId, days) {
  return get('gbdistributerfoodgoods/getFoodGoodsList/' + foodId, {
    days: days || 30,
  });
}

module.exports = {
  normalizeError: normalizeError,
  createIdempotencyKey: createIdempotencyKey,
  queryString: queryString,
  getStorePreparationHome: getStorePreparationHome,
  listStoreProducts: listStoreProducts,
  getStoreProduct: getStoreProduct,
  createStoreProduct: createStoreProduct,
  updateStoreProduct: updateStoreProduct,
  changeStoreProductStatus: changeStoreProductStatus,
  getStoreRecipe: getStoreRecipe,
  searchStoreIngredientOptions: searchStoreIngredientOptions,
  saveStoreRecipe: saveStoreRecipe,
  listStoreLossMaterials: listStoreLossMaterials,
  listStoreLossStocks: listStoreLossStocks,
  createStoreRawLoss: createStoreRawLoss,
  listStoreRawLosses: listStoreRawLosses,
  listCapabilities: listCapabilities,
  listProducts: listProducts,
  getProduct: getProduct,
  createProduct: createProduct,
  updateProduct: updateProduct,
  changeProductStatus: changeProductStatus,
  listConversions: listConversions,
  saveConversion: saveConversion,
  disableConversion: disableConversion,
  createIntermediateRecipe: createIntermediateRecipe,
  getIntermediateRecipe: getIntermediateRecipe,
  listIntermediateVersions: listIntermediateVersions,
  saveIntermediateDraft: saveIntermediateDraft,
  intermediateVersionAction: intermediateVersionAction,
  getFoodRecipeByFood: getFoodRecipeByFood,
  enableVersionedFood: enableVersionedFood,
  getFoodRecipe: getFoodRecipe,
  listFoodVersions: listFoodVersions,
  saveFoodDraft: saveFoodDraft,
  foodVersionAction: foodVersionAction,
  listFoodEffectiveIntervals: listFoodEffectiveIntervals,
  selectFoodEffectiveVersion: selectFoodEffectiveVersion,
  previewFoodEffectiveInterval: previewFoodEffectiveInterval,
  confirmFoodEffectiveInterval: confirmFoodEffectiveInterval,
  confirmFoodEffectiveIntervalWithReplacement: confirmFoodEffectiveIntervalWithReplacement,
  previewRemoveFoodEffectiveInterval: previewRemoveFoodEffectiveInterval,
  confirmRemoveFoodEffectiveInterval: confirmRemoveFoodEffectiveInterval,
  resolveHistoricalTheoryPrice: resolveHistoricalTheoryPrice,
  getDishDailyCostReport: getDishDailyCostReport,
  listHistoricalReceiptBatches: listHistoricalReceiptBatches,
  previewHistoricalReceiptCorrection: previewHistoricalReceiptCorrection,
  confirmHistoricalReceiptCorrection: confirmHistoricalReceiptCorrection,
  listRawGoodsReplacements: listRawGoodsReplacements,
  previewRawGoodsReplacement: previewRawGoodsReplacement,
  confirmRawGoodsReplacement: confirmRawGoodsReplacement,
  previewRemoveRawGoodsReplacement: previewRemoveRawGoodsReplacement,
  confirmRemoveRawGoodsReplacement: confirmRemoveRawGoodsReplacement,
  createBatch: createBatch,
  listBatches: listBatches,
  getBatch: getBatch,
  listPublishedRecipeVersions: listPublishedRecipeVersions,
  listRequiredMaterials: listRequiredMaterials,
  listCandidateStocks: listCandidateStocks,
  issueMaterials: issueMaterials,
  reverseIssue: reverseIssue,
  completeBatch: completeBatch,
  getCostTrace: getCostTrace,
  listAvailableBatches: listAvailableBatches,
  createFoodUse: createFoodUse,
  listFoodUses: listFoodUses,
  getFoodUse: getFoodUse,
  reverseFoodUse: reverseFoodUse,
  createDiscard: createDiscard,
  listDiscards: listDiscards,
  getDiscard: getDiscard,
  reverseDiscard: reverseDiscard,
  getFoodCostAnalysis: getFoodCostAnalysis,
  getFoodCostEvidence: getFoodCostEvidence,
  getLossAnalysis: getLossAnalysis,
  searchRawGoods: searchRawGoods,
  getRawGoods: getRawGoods,
  listFoodTree: listFoodTree,
  getFoodDetail: getFoodDetail,
  getLegacyFoodGoods: getLegacyFoodGoods,
};
