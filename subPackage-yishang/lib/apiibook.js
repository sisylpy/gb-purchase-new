import Promise from './bluebird'
import apiUrl from '../config.js'
var load = require('./load.js');




//

/**
 * 批发商商品类别列表
 * @param {*} data 
 */
export const gbDisGetDisFatherGoodsByGrandId = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerfathergoods/gbDisGetDisFatherGoodsByGrandId' ,
      method: 'POST',
      data:{
        fatherId: data.fatherId,
        gbDisId: data.gbDisId,
        
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
        wx.showToast({
          title: '请检查网络',
        })
       
      }
    })
  })
}


/**
 * 批发商商品类别列表
 * @param {*} data 
 */
export const gbDisGetDisFatherGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerfathergoods/gbDisGetDisFatherGoods' ,
      method: 'POST',
      data:{
        fatherId: data.fatherId,
        gbDisId: data.gbDisId,
        limit: data.limit,
        page: data.page
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
        wx.showToast({
          title: '请检查网络',
        })
       
      }
    })
  })
}


/**
 * 批发商商品类别列表
 * @param {*} data 
 */
export const gbGetDisFatherGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerfathergoods/gbGetDisFatherGoods' ,
      method: 'POST',
      data:{
        disId: data.disId,
        fatherId: data.fatherId,
        limit: data.limit,
        page: data.page,
        gbDisId: data.gbDisId
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
        wx.showToast({
          title: '请检查网络',
        })
       
      }
    })
  })
}


/**
 * 批发商商品类别列表
 * @param {*} data 
 */
export const getDisGoodsCata = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerfathergoods/getDisGoodsCata/' + data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
        })
       
      }
    })
  })
}
/**
 * 批发商商品类别列表
 * @param {*} data 
 */
export const gbDisGetDisCataGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerfathergoods/gbDisGetDisCataGoods' ,
      method: 'POST',
            data:{
              nxDisId: data.nxDisId,
              gbDisId: data.gbDisId,
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
        wx.showToast({
          title: '请检查网络',
        })
       
      }
    })
  })
}


// /**
//  * 批发商商品类别列表
//  * @param {*} data 
//  */
// export const disGetDisFatherGoods = (data) => {
//   return new Promise((resolve, reject) => {
//     wx.request({
//       url: apiUrl.apiUrl + 'nxdistributerfathergoods/disGetDisFatherGoods' ,
//       method: 'POST',
//       data:{
//         disId: data.disId,
//         fatherId: data.fatherId,
//       },
//       header: {
//         "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
//       },
//       success: (res) => {
//         resolve({ result: res.data })
//       },
//       fail: (e) => {
//         reject(e);
//         load.hideLoading();
//         wx.showToast({
//           title: '请检查网络',
//         })
       
//       }
//     })
//   })
// }
//




export const deleteFatherGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerfathergoods/deleteFatherGoods/' + data,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
        
      }
    })
  })
}


export const updateFatherGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerfathergoods/updateFatherGoods',
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
        
      }
    })
  })
}

export const updateInitStockData = (filePathList, depId,disId ) => { 
  return new Promise((resolve, reject) => {
     wx.uploadFile({
       url: apiUrl.apiUrl + 'gbdepartmentgoodsstock/updateInitStockData',//演示域名、自行配置
       filePath: filePathList,
       name: 'file',
       header: {
         "Content-Type": "multipart/form-data"
       },
       formData: {
        depId: depId,
        disId: disId,
       },
       success: function (res) {
         resolve({ result: res.data })

       },
       fail: function (e) {
         reject(e);
         load.hideLoading();
       },
 
     })
   })
 }
 
export const updateFatherGoodsGb = (filePathList, goodsName,goodsId ) => { 
  return new Promise((resolve, reject) => {
     wx.uploadFile({
       url: apiUrl.apiUrl + 'gbdistributerfathergoods/updateFatherGoodsGb',//演示域名、自行配置
       filePath: filePathList[0],
       name: 'file',
       header: {
         "Content-Type": "multipart/form-data"
       },
       formData: {
        goodsName: goodsName,
        goodsId: goodsId,
       },
       success: function (res) {
         resolve({ result: res.data })

       },
       fail: function (e) {
         reject(e);
         load.hideLoading();
       },
 
     })
   })
 }
 



export const saveFather = (filePathList, goodsName,fatherId, sort, id ) => { 
  return new Promise((resolve, reject) => {
     wx.uploadFile({
       url: apiUrl.apiUrl + 'nxgoods/saveFather',//演示域名、自行配置
       filePath: filePathList[0],
       name: 'file',
       header: {
         "Content-Type": "multipart/form-data"
       },
       formData: {
        goodsName: goodsName,
        fatherId: fatherId,
        sort: sort,
        id: id,
       },
       success: function (res) {
         resolve({ result: res.data })

       },
       fail: function (e) {
         reject(e);
         load.hideLoading();
       },
 
     })
   })
 }


 export const updateFather = (filePathList, goodsName, id ) => { 
  return new Promise((resolve, reject) => {
     wx.uploadFile({
       url: apiUrl.apiUrl + 'nxgoods/updateFather',//演示域名、自行配置
       filePath: filePathList[0],
       name: 'file',
       header: {
         "Content-Type": "multipart/form-data"
       },
       formData: {
        goodsName: goodsName,
        id: id,
       },
       success: function (res) {
         resolve({ result: res.data })

       },
       fail: function (e) {
         reject(e);
         load.hideLoading();
       },
 
     })
   })
 }



export const updateFatherName = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxgoods/updateFatherName',
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
        
      }
    })
  })
}


export const saveFatherGoodsGb = (filePathList, goodsName,fatherId, disId, color ) => { 
  return new Promise((resolve, reject) => {
     wx.uploadFile({
       url: apiUrl.apiUrl + 'gbdistributerfathergoods/saveFatherGoodsGb',//演示域名、自行配置
       filePath: filePathList[0],
       name: 'file',
       header: {
         "Content-Type": "multipart/form-data"
       },
       formData: {
        goodsName: goodsName,
        fatherId: fatherId,
        disId: disId,
        color: color
       },
       success: function (res) {
         resolve({ result: res.data })

       },
       fail: function (e) {
         reject(e);
         load.hideLoading();
       },
 
     })
   })
 }
 
export const deleteNxGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxgoods/deleteNxGoods/' + data,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
        
      }
    })
  })
}
/**
 * 
 * 删除nxGods
 * @param {*} data 
 */
export const deleteGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxgoods/deleteGoods/' + data,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
        
      }
    })
  })
}

/**
 * 获取nxGoods
 * @param {*} data 
 */
export const getNxGoodsInfo = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxgoods/getNxGoodsInfo/' + data,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
        
      }
    })
  })
}

export const editNxGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxgoods/editNxGoods',
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
        
      }
    })
  })
}

/**
 * 保存nxGoods
 * @param {*} data 
 */
export const saveNxGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxgoods/saveNxGoods',
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
        
      }
    })
  })
}


/**
 * 搜索类别商品
 * @param {*} data 
 */
export const queryCategoryGoodsByQuickSearch = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxgoods/queryCategoryGoodsByQuickSearch',
      method: 'POST',
      data: {
        "searchStr": data.searchStr,
        "fatherId": data.fatherId
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}

/**
 * 搜索商品
 * @param {*} data 
 */
export const queryGoodsByQuickSearch = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxgoods/queryGoodsByQuickSearch/' + data,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}

/**
 * 获取订货单位
 * @param {*} data 
 */
export const getStandardList = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxstandard/list/' + data,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}



/**
 * 
 * @param {*} data 
 */
export const deleteAlias = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxalias/deleteAlias/' + data,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}
/**
 * 
 * @param {*} data 
 */
export const updateAlias = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxalias/updateAlias',
      method: 'POST',
      data: data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}
/**
 * 添加nxGoods的standard
 * @param {*} data 
 */
export const saveAlias = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxalias/saveAlias',
      method: 'POST',
      data: data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}

/////////

/**
 * 
 * @param {*} data 
 */
export const deleteStandard = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxstandard/deleteStandard/' + data,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}
/**
 * 
 * @param {*} data 
 */
export const updateStandard = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxstandard/updateStandard',
      method: 'POST',
      data: data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}
/**
 * 添加nxGoods的standard
 * @param {*} data 
 */
export const saveStandard = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxstandard/saveNxStandard',
      method: 'POST',
      data: data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}


/**
 * 删除批发商商品
 * @param {*} data 
 */
export const canclePostDgnGoodsGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributergoods/canclePostDgnGoodsGb',
      method: 'POST',
      data: {
        "disId" : data.disId,
        "disGoodsId": data.disGoodsId,
        "disGoodsFatherId" : data.disGoodsFatherId,
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
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}

// /**
//  * 保存批发商商品
//  * @param {*} data 
//  */
// export const downDisGoods = (data) => {
//   return new Promise((resolve, reject) => {
//     wx.request({
//       url: apiUrl.apiUrl + 'gbdistributergoods/postDgnGoods',
//       method: 'POST',
//       data: data,
//       success: (res) => {
//         resolve({ result: res.data })
//       },
//       fail: (e) => {
//         reject(e);
//         load.hideLoading();
//         wx.showToast({
//           title: '请检查网络',
//           icon: 'none'
//         })
//       }
//     })
//   })
// }



/**
 * 保存批发商商品
 * @param {*} data 
 */
export const postDgnGoodsForNx = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributergoods/postDgnGoodsForNx',
      method: 'POST',
      data: {
        "disGoodsId": data.disGoodsId,
        "gbDisId": data.gbDisId,
        "depId" : data.depId
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
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}

/**
 * 批发商获取ibook商品列表
 * @param {*} data 
 */
export const disGetIbookGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributergoods/disGetIbookGoods',
      method: 'POST',
      data: {
        "fatherId": data.fatherId,
        "limit": data.limit,
        "page": data.page,
        "disId": data.disId,
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
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}
//

/**
 * ibook 大类列表
 * @param {*} data 
 */
export const getGoodsSubNamesByFatherIdGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributergoods/getGoodsSubNamesByFatherIdGb/' + data,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}

/**
 * ibook 大类列表
 * @param {*} data 
 */
export const getSubNameByFatherId = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxgoods/getGoodsSubNamesByFatherId/' + data,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}


/**
 * ibook 封皮列表
 */
export const getiBook = () => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxgoods/getiBookCover',
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
        
      }
    })
  })
}
