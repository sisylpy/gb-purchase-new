/**
 * 门店子包 Food 模块 API
 * 来源：subPackage-mendian/wailaii/apiDistributer.js
 */
import apiUrl from '../../config/index.js'
var load = require('../../lib/load.js');

// ===== allFood 页面 =====
export const depGetAllFood = (data) => {
  return new Promise((resolve, reject) => {
    var req = {
      disId: data.disId,
      depFatherId: data.depFatherId,
      startDate: data.startDate,
      stopDate: data.stopDate,
    };
    if (data.sortBy != null && data.sortBy !== '') {
      req.sortBy = data.sortBy;
    }
    if (data.sortOrder != null && data.sortOrder !== '') {
      req.sortOrder = data.sortOrder;
    }
    wx.request({
      url: apiUrl.apiUrl + 'gbdepfood/depGetAllFood',
      method: 'POST',
      data: req,
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}

export const downLoadDepFood = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepfood/downLoadDepFood',
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}

export const cancleDownloadFood = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepfood/cancleDownloadFood',
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}

/** 单菜配料看板 POST /gbDishCostAnalysis/dishIngredientDashboard 见 docs/gb-dish-ingredient-dashboard-api.md */
export const dishIngredientDashboard = (data) => {
  var body = {
    startDate: data.startDate,
    endDate: data.endDate,
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

// ===== foodList 页面 =====
export const getFoodList = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerfood/getFoodList/' + data,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}

// ===== index 页面 =====
export const disGetFood = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerfood/disGetFood/' + data,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}
