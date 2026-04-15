/**
 * 门店子包 Food 模块 API (Gb后端)
 * 来源：subPackage-mendian/wailaii/apiDistributerGb.js
 */
import apiUrl from '../../config.js'
var load = require('../../lib/load.js');

// ===== addFood 页面 =====
export const saveGbFood = (filePathList, foodName, fatherId, disId, price, method) => {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: apiUrl.apiUrl + 'gbdistributerfood/saveGbFood',
      filePath: filePathList[0],
      name: 'file',
      header: {
        "Content-Type": "multipart/form-data"
      },
      formData: {
        foodName: foodName,
        fatherId: fatherId,
        disId: disId,
        price: price,
        method: method
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

export const updateFoodWithFile = (filePathList, id, foodName, price, method) => {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: apiUrl.apiUrl + 'gbdistributerfood/updateFoodWithFile',
      filePath: filePathList[0],
      name: 'file',
      header: {
        "Content-Type": "multipart/form-data"
      },
      formData: {
        id: id,
        foodName: foodName,
        price: price,
        method: method,
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

export const updateFood = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerfood/updateFood',
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

export const queryDisGoodsByQuickSearchGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributergoods/queryDisGoodsByQuickSearchGb',
      method: 'POST',
      data: {
        disId: data.disId,
        searchStr: data.searchStr,
      },
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

// ===== addFoodFather 页面 =====
export const saveGbFoodFather = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerfood/saveGbFoodFather',
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

export const updateGbFood = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerfood/updateGbFood',
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

// ===== addRaw 页面 =====
export const saveGbFoodGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerfoodgoods/saveGbFoodGoods',
      method: 'POST',
      data,
      header: {
        "content-type": 'application/json'
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

export const deleteGbFoodGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerfoodgoods/deleteGbFoodGoods/' + data,
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

export const updateGbFoodGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerfoodgoods/updateGbFoodGoods',
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

// ===== foodList 页面 =====
export const deleteFood = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerfood/deleteFood',
      method: 'POST',
      data: {
        id: data.id,
      },
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
