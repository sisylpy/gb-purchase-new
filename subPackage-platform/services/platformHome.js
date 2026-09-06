/**
 * 京采市场平台首页 API（走 nx / nongxinle 后端）
 * @module services/platformHome
 */
var requestUtil = require('../../lib/request');
var config = require('../../config/index');

var NX_OPTS = { backend: 'nx', showErrorToast: false };
var NX_SERVER = config.nxServer;

var DEFAULT_MARKET_ID = 1;
var EMPTY_MARKET = {
  marketName: '—',
  notice: '',
  noticeSub: ''
};
var DEFAULT_CATEGORY_ICONS = [
  '/images/goods.png',
  '/images/book.png',
  '/images/dish.png',
  '/images/home/caigou1.png',
  '/images/icons_warehouse.png',
  '/images/goods.png',
  '/images/dish.png',
  '/images/setup.png',
  '/images/all_selects.png'
];

function parseResultBody(res) {
  var body = res && res.result;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return null;
    }
  }
  return body;
}

function isOk(body) {
  return body && body.code === 0;
}

function getPayload(body) {
  if (!body) return null;
  if (body.data !== undefined && body.data !== null) return body.data;
  return body;
}

function normalizeMarket(raw) {
  if (!raw || typeof raw !== 'object') return EMPTY_MARKET;
  return {
    marketName: raw.marketName || EMPTY_MARKET.marketName,
    notice: raw.notice || '',
    noticeSub: raw.noticeSub || raw.noticeSubTitle || ''
  };
}

function normalizeDepartment(raw, fallbackName) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    departmentName: raw.departmentName || raw.gbDepartmentName || fallbackName || '当前饭店',
    address: raw.address || raw.gbDepartmentAddress || raw.gbDepartmentPickAddr || ''
  };
}

function normalizeSuppliers(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return list.map(function (item) {
    var id = item.distributerId != null ? item.distributerId : item.supplierId;
    var logo = item.logo || item.distributerLogo || '';
    if (logo && logo.indexOf('/') !== 0 && logo.indexOf('http') !== 0) {
      logo = NX_SERVER + logo;
    }
    return {
      distributerId: id,
      distributerName: item.distributerName || item.supplierName || item.name || '批发商',
      mainCategories: item.mainCategories || item.categorySummary || item.categories || '',
      goodsCount: item.goodsCount != null ? item.goodsCount : (item.skuCount != null ? item.skuCount : 0),
      isActive: item.isActive != null ? item.isActive : (item.goodsCount > 0 ? 1 : 0),
      address: item.address || '',
      logo: logo
    };
  }).filter(function (item) {
    return item.distributerId != null;
  });
}

function normalizeCategories(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return list.map(function (item, index) {
    var icon = item.icon || item.iconUrl || '';
    if (icon && icon.indexOf('/') !== 0 && icon.indexOf('http') !== 0) {
      icon = NX_SERVER + icon;
    }
    if (!icon) {
      icon = DEFAULT_CATEGORY_ICONS[index % DEFAULT_CATEGORY_ICONS.length];
    }
    var id = item.categoryId != null ? item.categoryId : item.id;
    return {
      categoryId: id,
      categoryName: item.categoryName || item.name || '分类',
      icon: icon,
      goodsCount: item.goodsCount != null ? item.goodsCount : (item.skuCount != null ? item.skuCount : 0)
    };
  }).filter(function (item) {
    return item.categoryId != null;
  });
}

function buildParams() {
  var mendianInfo = wx.getStorageSync('mendianInfo') || {};
  var userInfo = wx.getStorageSync('userInfo') || {};
  return {
    marketId: wx.getStorageSync('platformMarketId') || DEFAULT_MARKET_ID,
    departmentId: mendianInfo.gbDepartmentId || null,
    customerUserId: userInfo.gbDepartmentUserId || null
  };
}

function fetchHomeInit(params) {
  return requestUtil.post('platform/customer/home/init', params || {}, NX_OPTS);
}

function fetchMarketSuppliers(params) {
  var payload = Object.assign({ page: 1, limit: 20 }, params || {});
  return requestUtil.post('platform/customer/market/suppliers', payload, NX_OPTS);
}

function fetchGoodsCategories(params) {
  return requestUtil.post('platform/customer/goods/categories', params || {}, NX_OPTS);
}

function fetchOutstanding(params) {
  if (!params || !params.departmentId) {
    return Promise.resolve(null);
  }
  return requestUtil.post('platform/customer/bills/outstanding', params, NX_OPTS);
}

function loadHomePageData() {
  var params = buildParams();
  var fallbackDeptName = (wx.getStorageSync('mendianInfo') || {}).gbDepartmentName;

  return Promise.all([
    fetchHomeInit(params).catch(function () { return null; }),
    fetchMarketSuppliers(params).catch(function () { return null; }),
    fetchGoodsCategories(params).catch(function () { return null; }),
    fetchOutstanding(params).catch(function () { return null; })
  ]).then(function (results) {
    var initRes = results[0];
    var suppliersRes = results[1];
    var categoriesRes = results[2];
    var outstandingRes = results[3];

    var initBody = parseResultBody(initRes);
    var suppliersBody = parseResultBody(suppliersRes);
    var categoriesBody = parseResultBody(categoriesRes);
    var outstandingBody = parseResultBody(outstandingRes);

    var initData = isOk(initBody) ? getPayload(initBody) : null;
    var initFromApi = !!initData;
    var suppliersFromApi = isOk(suppliersBody);
    var categoriesFromApi = isOk(categoriesBody);

    var market = initFromApi
      ? normalizeMarket(initData && initData.market)
      : EMPTY_MARKET;

    var currentDepartment = normalizeDepartment(
      initData && (initData.currentDepartment || initData.department),
      fallbackDeptName
    );

    var searchPlaceholder = (initData && initData.search && initData.search.placeholder)
      || '搜索油菜、圆白菜、馒头、白醋';

    var suppliers = suppliersFromApi
      ? (normalizeSuppliers(getPayload(suppliersBody)) || [])
      : [];

    var categories = categoriesFromApi
      ? (normalizeCategories(getPayload(categoriesBody)) || [])
      : [];

    if (!currentDepartment) {
      currentDepartment = {
        departmentName: fallbackDeptName || '请选择饭店',
        address: ''
      };
    }

    var outstandingData = isOk(outstandingBody) ? getPayload(outstandingBody) : null;
    var outstandingBill = outstandingData && outstandingData.mostUrgent
      ? outstandingData.mostUrgent
      : (initData && initData.outstandingBill ? initData.outstandingBill : null);
    var hasOutstandingBill = !!(outstandingData && outstandingData.hasOutstanding)
      || (initData && initData.hasOutstandingBill === true);

    return {
      market: market,
      currentDepartment: currentDepartment,
      searchPlaceholder: searchPlaceholder,
      summary: initData && initData.summary ? initData.summary : null,
      hasOutstandingBill: hasOutstandingBill,
      outstandingBill: outstandingBill,
      outstandingSummary: outstandingData,
      suppliers: suppliers,
      categories: categories,
      initFromApi: initFromApi,
      suppliersFromApi: suppliersFromApi,
      categoriesFromApi: categoriesFromApi
    };
  });
}

module.exports = {
  fetchHomeInit: fetchHomeInit,
  fetchMarketSuppliers: fetchMarketSuppliers,
  fetchGoodsCategories: fetchGoodsCategories,
  loadHomePageData: loadHomePageData,
  parseResultBody: parseResultBody,
  isOk: isOk
};
