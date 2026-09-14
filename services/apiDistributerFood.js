/**
 * 菜品/Food 模块 API（group + mendian 子包共用）
 * @module services/apiDistributerFood
 */
import apiUrl from '../config/index.js';
var load = require('../lib/load.js');

export const depGeFoodBusiness = (data) => {
  return new Promise((resolve, reject) => {
    var parts = [
      'disId=' + encodeURIComponent(String(data.disId)),
      'depFatherId=' + encodeURIComponent(String(data.depFatherId)),
      'startDate=' + encodeURIComponent(String(data.startDate)),
      'stopDate=' + encodeURIComponent(String(data.stopDate)),
    ];
    if (data.sortBy != null && data.sortBy !== '') {
      parts.push('sortBy=' + encodeURIComponent(String(data.sortBy)));
    }
    if (data.sortOrder != null && data.sortOrder !== '') {
      parts.push('sortOrder=' + encodeURIComponent(String(data.sortOrder)));
    }
    if (data.subDepId != null && data.subDepId !== '' && data.subDepId !== undefined && !isNaN(Number(data.subDepId))) {
      parts.push('subDepId=' + encodeURIComponent(String(Number(data.subDepId))));
    }
    if (data.viewMode) {
      parts.push('viewMode=' + encodeURIComponent(String(data.viewMode)));
    }
    wx.request({
      url: apiUrl.apiUrl + 'gbdepfood/depGeFoodBusiness',
      method: 'POST',
      data: parts.join('&'),
      header: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      success: (res) => {
        resolve({ result: res.data });
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      },
    });
  });
};

export const getFoodBusinessDiagnosis = (data) => {
  return new Promise((resolve, reject) => {
    var parts = [
      'disId=' + encodeURIComponent(String(data.disId)),
      'depFatherId=' + encodeURIComponent(String(data.depFatherId)),
      'foodId=' + encodeURIComponent(String(data.foodId)),
      'startDate=' + encodeURIComponent(String(data.startDate)),
      'stopDate=' + encodeURIComponent(String(data.stopDate)),
    ];
    if (data.subDepId != null && data.subDepId !== '') parts.push('subDepId=' + encodeURIComponent(String(data.subDepId)));
    wx.request({
      url: apiUrl.apiUrl + 'gbdepfood/getFoodBusinessDiagnosis',
      method: 'POST',
      data: parts.join('&'),
      header: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      success: (res) => resolve({ result: res.data }),
      fail: (e) => { reject(e); load.hideLoading(); },
    });
  });
};

export const downLoadDepFood = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepfood/downLoadDepFood',
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data });
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      },
    });
  });
};

export const cancleDownloadFood = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepfood/cancleDownloadFood',
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data });
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      },
    });
  });
};

export const dishIngredientDashboard = (data) => {
  var body = {
    startDate: data.startDate,
    stopDate: data.stopDate,
    disId: data.disId,
    depFatherId: data.depFatherId,
    foodId: data.foodId,
    trendGranularity: data.trendGranularity != null && data.trendGranularity !== '' ? data.trendGranularity : 'month',
  };
  if (data.trendStartDate) body.trendStartDate = data.trendStartDate;
  if (data.trendEndDate) body.trendEndDate = data.trendEndDate;
  if (data.primaryDisGoodsId != null && data.primaryDisGoodsId !== '') {
    body.primaryDisGoodsId = data.primaryDisGoodsId;
  }
  if (data.subDepId != null && data.subDepId !== '') {
    body.subDepId = data.subDepId;
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbDishCostAnalysis/dishIngredientDashboard',
      method: 'POST',
      data: body,
      header: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      success: (res) => {
        resolve({ result: res.data });
      },
      fail: (e) => {
        reject(e);
      },
    });
  });
};

export const getFoodList = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerfood/getFoodList/' + data,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data });
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      },
    });
  });
};

export const disGetFood = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerfood/disGetFood/' + data,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data });
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      },
    });
  });
};

export const menuCategoryBusinessOverview = (data) => {
  return new Promise((resolve, reject) => {
    var params = [
      'distributerId=' + encodeURIComponent(String(data.distributerId)),
      'scopeMode=' + encodeURIComponent(String(data.scopeMode)),
    ];
    if (data.departmentId != null) {
      params.push('departmentId=' + encodeURIComponent(String(data.departmentId)));
    }
    if (data.days != null) {
      params.push('days=' + encodeURIComponent(String(data.days)));
    }
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerfood/menu-category-business-overview?' + params.join('&'),
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data });
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      },
    });
  });
};

export const menuFoodBusinessDetail = (data) => {
  return new Promise((resolve, reject) => {
    var params = [
      'distributerId=' + encodeURIComponent(String(data.distributerId)),
      'scopeMode=' + encodeURIComponent(String(data.scopeMode)),
      'foodId=' + encodeURIComponent(String(data.foodId)),
    ];
    if (data.departmentId != null && data.departmentId !== '') {
      params.push('departmentId=' + encodeURIComponent(String(data.departmentId)));
    }
    if (data.startDate != null && data.startDate !== '' && data.stopDate != null && data.stopDate !== '') {
      params.push('startDate=' + encodeURIComponent(String(data.startDate)));
      params.push('stopDate=' + encodeURIComponent(String(data.stopDate)));
    } else if (data.days != null) {
      params.push('days=' + encodeURIComponent(String(data.days)));
    }
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerfood/menu-food-business-detail?' + params.join('&'),
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data });
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      },
    });
  });
};

export const menuCategoryDishBusinessList = (data) => {
  return new Promise((resolve, reject) => {
    var params = [
      'distributerId=' + encodeURIComponent(String(data.distributerId)),
      'scopeMode=' + encodeURIComponent(String(data.scopeMode)),
      'categoryId=' + encodeURIComponent(String(data.categoryId)),
    ];
    if (data.departmentId != null && data.departmentId !== '') {
      params.push('departmentId=' + encodeURIComponent(String(data.departmentId)));
    }
    if (data.days != null) {
      params.push('days=' + encodeURIComponent(String(data.days)));
    }
    if (data.sortBy != null && data.sortBy !== '') {
      params.push('sortBy=' + encodeURIComponent(String(data.sortBy)));
    }
    if (data.sortOrder != null && data.sortOrder !== '') {
      params.push('sortOrder=' + encodeURIComponent(String(data.sortOrder)));
    }
    if (data.keyword != null && data.keyword !== '') {
      params.push('keyword=' + encodeURIComponent(String(data.keyword)));
    }
    if (data.roleFilter != null && data.roleFilter !== '') {
      params.push('roleFilter=' + encodeURIComponent(String(data.roleFilter)));
    }
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerfood/menu-category-food-business-list?' + params.join('&'),
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data });
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      },
    });
  });
};
