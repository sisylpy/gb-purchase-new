/**
 * 门店子包 Food 模块 API (Gb后端)
 * 来源：subPackage-mendian/wailaii/apiDistributerGb.js
 */
import apiUrl from '../../config/index.js'
var load = require('../../lib/load.js');

// ===== addFood 页面 =====
const normalizeSaveGbFoodResult = (data) => {
  if (typeof data === 'string') return data
  if (data && typeof data === 'object') return JSON.stringify(data)
  return String(data)
}

export const saveGbFood = (filePathList, foodName, fatherId, disId, price, method, targetGrossMarginRate, grossMarginFloatAbs) => {
  const firstPath = Array.isArray(filePathList)
    ? filePathList[0]
    : filePathList
  const hasFile = !!(firstPath && String(firstPath).length > 0)

  return new Promise((resolve, reject) => {
    const onSuccess = (res) => {
      resolve({ result: normalizeSaveGbFoodResult(res.data) })
    }
    if (hasFile) {
      wx.uploadFile({
        url: apiUrl.apiUrl + 'gbdistributerfood/saveGbFood',
        filePath: firstPath,
        name: 'file',
        header: {
          'Content-Type': 'multipart/form-data'
        },
        formData: {
          foodName: foodName,
          fatherId: fatherId,
          disId: disId,
          price: price,
          method: method != null ? method : '',
          targetGrossMarginRate: targetGrossMarginRate != null ? targetGrossMarginRate : '',
          grossMarginFloatAbs: grossMarginFloatAbs != null ? grossMarginFloatAbs : ''
        },
        success: onSuccess,
        fail: (e) => {
          reject(e)
          load.hideLoading()
        }
      })
    } else {
      wx.request({
        url: apiUrl.apiUrl + 'gbdistributerfood/saveGbFood',
        method: 'POST',
        header: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
        },
        data: {
          foodName: foodName,
          fatherId: fatherId,
          disId: disId,
          price: price,
          method: method != null ? method : '',
          targetGrossMarginRate: targetGrossMarginRate != null ? targetGrossMarginRate : '',
          grossMarginFloatAbs: grossMarginFloatAbs != null ? grossMarginFloatAbs : ''
        },
        success: onSuccess,
        fail: (e) => {
          reject(e)
          load.hideLoading()
        }
      })
    }
  })
}

export const updateFoodWithFile = (filePathList, id, foodName, price, method, targetGrossMarginRate, grossMarginFloatAbs) => {
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
        targetGrossMarginRate: targetGrossMarginRate != null ? targetGrossMarginRate : '',
        grossMarginFloatAbs: grossMarginFloatAbs != null ? grossMarginFloatAbs : ''
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

/** 更新菜品毛利率（仅提交 gbDistributerFoodId / gbDfTargetGrossMarginRate / gbDfGrossMarginFloatAbs） */
export const updateGrossMargin = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerfood/updateGrossMargin',
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
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
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

/** 菜品配料搜索（带 foodId，与后端 quickSearchDisGoodsForFoodIngredient 对应） */
export const quickSearchDisGoodsForFoodIngredient = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerfoodgoods/quickSearchDisGoodsForFoodIngredient',
      method: 'POST',
      data: {
        disId: data.disId != null ? String(data.disId) : '',
        searchStr: data.searchStr != null ? String(data.searchStr) : '',
        foodId: data.foodId != null ? data.foodId : '',
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
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
export const saveGbFoodGoodsItem = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerfoodgoods/saveGbFoodGoodsItem',
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

/** 根据 foodId 获取菜品完整信息 */
export const getFoodByFoodId = (foodId) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerfood/getFoodByFoodId/' + foodId,
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



/** 根据 foodId 获取菜品配料列表 */
export const getFoodGoodsList = (foodId) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerfoodgoods/getFoodGoodsList/' + foodId,
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

export const reStartFood = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerfood/reStartFood/' + data,
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