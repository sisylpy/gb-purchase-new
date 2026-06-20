import Promise from './bluebird'
import apiUrl from '../config.js'

var load = require('./load.js');


//


/**
 * 添加进货商品，修改订单状态
 * @param {*} data 
 */
export const getBrandForPrompts = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/getBrandForPrompts' ,
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




export const cancleTuihuoByPurGoodsId = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentgoodsstockreduce/cancleTuihuoByPurGoodsId/' +data,
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


export const supplierGetUnWeightOutPurGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasegoods/supplierGetUnWeightOutPurGoods/' +data,
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


export const gbOrderOutWeight = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentorders/gbOrderOutWeight',
      method: 'POST',
      data:{
        orderId: data.orderId,
        weight: data.weight,
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



export const updateGbDepUserWithFile = (filePathList, userName,userId , depId ) => { 
  return new Promise((resolve, reject) => {
     wx.uploadFile({
       url: apiUrl.apiUrl + 'gbdepartmentuser/updateGbDepUserWithFile',//演示域名、自行配置
       filePath: filePathList[0],
       name: 'file',
       header: {
         "Content-Type": "multipart/form-data"
       },
       formData: {
        userName: userName,
        userId: userId,
        depId: depId,
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

 
 export const updateGbDepUser = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentuser/updateGbDepUser' ,
      method: 'POST',
      data: {
        userName: data.userName,
        userId: data.userId,
        depId: data.depId
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





export const addAutoOrderGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributergoods/addAutoOrderGoods',
      method: 'POST',
      data:{
        supplierId: data.supplierId,
        goodsId: data.goodsId,
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


export const depSearchTodayOrders = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentorders/depSearchTodayOrders',
      method: 'POST',
      data:{
        depFatherId: data.depFatherId,
        depId: data.depId,
        searchStr: data.searchStr
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

export const addRecord = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpaylist/addRecord',
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



export const jingjingGetBuyingGoodsGbWithNx = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/jingjingGetBuyingGoodsGbWithNx/' +data,
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


export const deleteDepGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentdisgoods/deleteDepGoods/' +data,
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



export const depReceiveStock = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/depReceiveStock/' +data,
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


export const getNxGoodsIdsByGreatId = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxgoods/getNxGoodsIdsByGreatId/' +data,
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

export const getNxDisGoodsIdsByGreatId = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerfathergoods/getNxDisGoodsIdsByGreatId/' +data,
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



export const depGetTodayRecordSeconds = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpaylist/depGetTodayRecordSeconds/' + data,
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
 * 批发商商品类别列表
 * @param {*} data 
 */
export const nxDepGetDisCataGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerfathergoods/nxDepGetDisCataGoods' ,
      method: 'POST',
      data:{
        nxDisId: data.nxDisId,
        depId: data.depId,
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



export const disGetDepGoodsCataGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentdisgoods/disGetDepGoodsCataGb' ,
      method: 'POST',
      data:{
        disId: data.disId,
        goodsType: data.goodsType
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

export const disGetDepGoodsCataGbWithSupplier = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentdisgoods/disGetDepGoodsCataGbWithSupplier' ,
      method: 'POST',
      data:{
        disId: data.disId,
        supplierId: data.supplierId
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


export const depGetDepGoodsCataGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentdisgoods/depGetDepGoodsCataGb' ,
      method: 'POST',
      data:{
        disId: data.disId,
        depId: data.depId
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
 * 打印销售单据
 * @param {*} data 
 */
export const depPasteSearchGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentorders/depPasteSearchGoods',
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


export const queryDepDisGoodsByQuickSearchJj = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/queryDepDisGoodsByQuickSearchJj',
      method: 'POST',
      data: {
        disId: data.disId,
        searchStr: data.searchStr,
        depId: data.depId,
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
          icon: 'none',
        })
      }
    })
  })
}



export const getAccountApplysGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentbill/getAccountApplysGb' ,
      method: 'POST',
      data: {
        depFatherId: data.depFatherId,
        billId: data.billId
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
          icon: 'none',
        })
      }
    })
  })
}

export const finishShixianBill = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/finishShixianBill' ,
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


export const deleteDisBatchGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/deleteDisBatchGb/' + data,
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
 * 获取订货组部门
 * @param {*} data 
 */
export const getSubDepartmentsGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartment/getSubDepartmentsGb/' + data,
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

export const sellerReceiveReturnBill = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/sellerReceiveReturnBill',
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
        })
      }
    })
  })
}




export const getJrdhUser = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxjrdhuser/getJrdhUser/' + data,
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


export const updateJrdhUser = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxjrdhuser/updateJrdhUser',
      method: 'POST',
      data:{
        userName: data.userName,
        userId: data.userId,
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


export const updateJrdhUserWithFile = (filePathList, userName,userId ) => { 
  return new Promise((resolve, reject) => {
     wx.uploadFile({
       url: apiUrl.apiUrl + 'nxjrdhuser/updateJrdhUserWithFile',//演示域名、自行配置
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
         resolve({ result: res.data })
        
      
       },
       fail: function (e) {
         reject(e);
         load.hideLoading();
       },
 
     })
   })
 }




export const supplierEditBatchGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/supplierEditBatchGb/' + data,
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



export const finishPayPurchaseBatchGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/finishPayPurchaseBatchGb',
      method: 'POST',
      data: {
        ids: data.ids,                    // 批次ID字符串，逗号分隔
        gbDisId: data.gbDisId,           // 配送商ID
        total: data.total,                // 总金额
        supplierId: data.supplierId,      // 供应商ID
        userId: data.userId               // 用户ID
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


export const disCheckUnPayBillsGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/disCheckUnPayBillsGb',
      method: 'POST',
      data:{
        disId: data.disId,
        supplierId: data.supplierId,
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



export const sellerDistributerPurchaseBatchsGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/sellerDistributerPurchaseBatchsGb',
      method: 'POST',
      data:{
        disId: data.disId,
        supplierId: data.supplierId,
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


export const indexJrdhUserLoginJj = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxjrdhuser/indexJrdhUserLoginJj/' + data,   
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


export const sellerFinishPurchaseGoodsBatchGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/sellerFinishPurchaseGoodsBatchGb' ,
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
        })
      }
    })
  })
}




export const sellerUpdatePurGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasegoods/sellerUpdatePurGoods' ,
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
        })
      }
    })
  })
}




export const sellUserReadDisBatchGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/sellUserReadDisBatchGb',
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


export const jrdhSellerRegisterWithFileGbJj = (filePathList, userName, code,admin,gbDisId,buyUserId, gbDepId) => { 
  return new Promise((resolve, reject) => {
     wx.uploadFile({
       url: apiUrl.apiUrl + 'nxjrdhuser/jrdhSellerRegisterWithFileGbJj',//演示域名、自行配置
       filePath: filePathList[0],
       name: 'file',
       header: {
         "Content-Type": "multipart/form-data"
       },
       formData: {
        userName: userName,
        code: code,
        admin: admin,
        gbDisId: gbDisId,
        buyUserId: buyUserId,
        gbDepId: gbDepId,
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




export const getDisPurchaseGoodsBatchGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/getDisPurchaseGoodsBatchGb/' + data ,
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


export const whichJrdhUserLoginGbJj = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentuser/whichJrdhUserLoginGbJj',  
      method: 'POST',    
      data: {
        gbDisId: data.gbDisId,
        code: data.code,
        batchId: data.batchId,
        gbDepId: data.gbDepId,
        buyUserId: data.buyUserId
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


export const delAttem = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentgoodsstock/delAttem/' +data  ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none',
        })
      }
    })
  })
}



export const supplierGetStars = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentgoodsstock/supplierGetStars' ,
      method: 'POST',
      data: {
        supplierId: data.supplierId,
        goodsId: data.goodsId,
        startDate: data.startDate,
        stopDate: data.stopDate,
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
          icon: 'none',
        })
      }
    })
  })
}


export const purUserGetStars = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentgoodsstock/purUserGetStars' ,
      method: 'POST',
      data: {
        purUserId: data.purUserId,
        goodsId: data.goodsId,
        startDate: data.startDate,
        stopDate: data.stopDate,
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
          icon: 'none',
        })
      }
    })
  })
}


export const purUserGetRetrunGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentgoodsstock/purUserGetRetrunGoods' ,
      method: 'POST',
      data: {
        purUserId: data.purUserId,
        startDate: data.startDate,
        stopDate: data.stopDate,
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
          icon: 'none',
        })
      }
    })
  })
}

export const puraserReturnPurGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasegoods/puraserReturnPurGoods'  ,
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
          icon: 'none',
        })
      }
    })
  })
}

export const finishSharePurGoodsBatchReturn = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/finishSharePurGoodsBatchReturn/' + data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none',
        })
      }
    })
  })
}
export const deleteReduceItem = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentgoodsstockreduce/deleteReduceItem/' + data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none',
        })
      }
    })
  })
}



export const getDisGoodsBusiness = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentgoodsstock/getDisGoodsBusiness' ,
      method: 'POST',
      data: {
        disGoodsId: data.disGoodsId,
        startDate: data.startDate,
        stopDate: data.stopDate,
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
          icon: 'none',
        })
      }
    })
  })
}



export const getDepGoodsBusiness = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentgoodsstock/getDepGoodsBusiness' ,
      method: 'POST',
      data: {
        depGoodsId: data.depGoodsId,
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
          icon: 'none',
        })
      }
    })
  })
}



export const getWhichDayReduce = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentgoodsstockreduce/getWhichDayReduce',
      method: 'POST',
      data: {
        startDate: data.startDate,
        stopDate: data.stopDate,
        searchDepId: data.searchDepId,
        disGoodsId: data.disGoodsId,
        type: data.type,
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
          icon: 'none',
        })
      }
    })
  })
}




export const getGoodsEchartsByGoodsGreatId = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentgoodsdaily/getGoodsEchartsByGoodsGreatId' ,
      method: 'POST',
      data: {    
        startDate: data.startDate,
        stopDate: data.stopDate,       
        disGoodsGreatId: data.disGoodsGreatId,
        type: data.type,
       disId: data.disId,
       echartsType: data.echartsType,
       searchDepIds: data.searchDepIds,
       searchDepId: data.searchDepId
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
          icon: 'none',
        })
      }
    })
  })
}


export const getGoodsCostBySearchDate = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentgoodsdaily/getGoodsCostBySearchDate' ,
      method: 'POST',
      data: {    
        startDate: data.startDate,
        stopDate: data.stopDate,       
       
        type: data.type,
       disId: data.disId,
       searchDepId: data.searchDepId,
       page: data.page,
       limit: data.limit,
       greatId: data.greatId

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
          icon: 'none',
        })
      }
    })
  })
}


export const getGbGoodsCostStatistics = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentgoodsdaily/getGbGoodsCostStatistics' ,
      method: 'POST',
      data: {    
        startDate: data.startDate,
        stopDate: data.stopDate, 
       disId: data.disId,
       greatId: data.greatId,
       searchDepId: data.searchDepId
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
          icon: 'none',
        })
      }
    })
  })
}


// 


export const disGetPurchaseCata = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasegoods/disGetPurchaseCata' ,
      method: 'POST',
      data: {
        disId: data.disId,
        startDate: data.startDate,
        stopDate: data.stopDate,
        supplierId: data.supplierId,
        purUserId: data.purUserId,
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
          icon: 'none',
        })
      }
    })
  })
}

export const disGetDepGoodsDailyTotal = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentgoodsdaily/disGetDepGoodsDailyTotal' ,
      method: 'POST',
      data: {
        disId: data.disId,
        startDate: data.startDate,
        stopDate: data.stopDate,
        type: data.type,
        fenxiType: data.fenxiType,
        searchDepIds: data.searchDepIds,
        searchDepId: data.searchDepId,
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
          icon: 'none',
        })
      }
    })
  })
}





export const saveReportCost = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbreport/saveReportCost' ,
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
          icon: 'none',
        })
      }
    })
  })
}


export const delteReport = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbreport/delteReport/' + data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none',
        })
      }
    })
  })
}


export const getDisUserReports = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbreport/getDisUserReports' ,
      method: 'POST',
      data: {    
        startDate: data.startDate,
        stopDate: data.stopDate,
        disId: data.disId,
        userId: data.userId,
      
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
          icon: 'none',
        })
      }
    })
  })
}


export const getDisUserReportsPurchase = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbreport/getDisUserReportsPurchase/' + data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none',
        })
      }
    })
  })
}

export const getDisUserReportsStock = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbreport/getDisUserReportsStock/' + data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none',
        })
      }
    })
  })
}

//

export const getDisUserReportsBusiness = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbreport/getDisUserReportsBusiness/' + data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none',
        })
      }
    })
  })
}


export const getDisUserReportsCost = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbreport/getDisUserReportsCost/' + data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none',
        })
      }
    })
  })
}

//

export const disGetPurUserDate = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasegoods/disGetPurUserDate',
      method: 'POST',
      data: {
        startDate: data.startDate,
        stopDate: data.stopDate,
        disId: data.disId,
        purUserId: data.purUserId,
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

export const disGetPurchaseDate = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasegoods/disGetPurchaseDate',
      method: 'POST',
      data: {
        startDate: data.startDate,
        stopDate: data.stopDate,
        disId: data.disId,
        purUserId: data.purUserId,
        supplierId: data.supplierId
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





export const getPurchaseUserGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/getPurchaseUserGoods',
      method: 'POST',
      data: {
        startDate: data.startDate,
        stopDate: data.stopDate,
        purUserId: data.purUserId,
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
          icon: 'none',
        })
      }
    })
  })
}



export const disGetPurchaseDetailType = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/disGetPurchaseDetailType',
      method: 'POST',
      data: {
        startDate: data.startDate,
        stopDate: data.stopDate,
        disId: data.disId,
        supplierIds: data.supplierIds,
        purUserIds: data.purUserIds,
        type: data.type,
        greatId: data.greatId,
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
          icon: 'none',
        })
      }
    })
  })
}



export const disGetPurchaseDetaiTypeWithId = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/disGetPurchaseDetaiTypeWithId',
      method: 'POST',
      data: {
        startDate: data.startDate,
        stopDate: data.stopDate,
        disId: data.disId,
        supplierId: data.supplierId,
        purUserId: data.purUserId,
        type: data.type,
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
          icon: 'none',
        })
      }
    })
  })
}



export const getNxGoodsFenxi = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasegoods/getNxGoodsFenxi' ,
      method: 'POST',
      data: {
        gbDisId: data.gbDisId,
        nxDisId: data.nxDisId,
        startDate: data.startDate,
        stopDate: data.stopDate,
        type: data.type
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
          icon: 'none',
        })
      }
    })
  })
}


//



export const getGbPurGoodsFenxi = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasegoods/getGbPurGoodsFenxi' ,
      method: 'POST',
      data: {
        disGoodsId: data.disGoodsId,
        startDate: data.startDate,
        stopDate: data.stopDate,
        supplierId: data.supplierId,
        purUserId: data.purUserId,
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
          icon: 'none',
        })
      }
    })
  })
}

export const getJrdhGoodsFenxi = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasegoods/getJrdhGoodsFenxi' ,
      method: 'POST',
      data: {
        gbDisId: data.gbDisId,
        supplierId: data.supplierId,
        startDate: data.startDate,
        stopDate: data.stopDate,
        type: data.type,
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
          icon: 'none',
        })
      }
    })
  })
}


export const changeStockStars = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentgoodsstock/changeStockStars' ,
      method: 'POST',
      data: {
        id: data.id,
        stars: data.stars,
        userId: data.userId
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
          icon: 'none',
        })
      }
    })
  })
}

export const reduceAttachmentSaveWithFile = (filePathList, userName, id ) => { 
  return new Promise((resolve, reject) => {
     wx.uploadFile({
       url: apiUrl.apiUrl + 'gbdepartmentgoodsstockreduceattachment/reduceAttachmentSaveWithFile',//演示域名、自行配置
       filePath: filePathList[0],
       name: 'file',
       formData: {
        userName: userName,
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


 export const reduceAttachmentSaveWithFileStar = (filePathList, userName, id,stars, userId ) => { 
  return new Promise((resolve, reject) => {
     wx.uploadFile({
       url: apiUrl.apiUrl + 'gbdepartmentgoodsstock/reduceAttachmentSaveWithFileStar',//演示域名、自行配置
       filePath: filePathList[0],
       name: 'file',
       formData: {
        userName: userName,
        id: id,
        stars,
        userId
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



 export const saveDepWasteGoodsStock = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentgoodsstock/saveDepWasteGoodsStock' ,
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
          icon: 'none',
        })
      }
    })
  })
}

 export const saveDepReturnGoodsStock = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentgoodsstock/saveDepReturnGoodsStock' ,
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
          icon: 'none',
        })
      }
    })
  })
}





export const saveDepProduceGoodsStock = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentgoodsstock/saveDepProduceGoodsStock' ,
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
          icon: 'none',
        })
      }
    })
  })
}

export const saveDepLossGoodsStock = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentgoodsstock/saveDepLossGoodsStock' ,
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
          icon: 'none',
        })
      }
    })
  })
}


export const getDisGoodsStock = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentgoodsstock/getDisGoodsStock/' + data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none',
        })
      }
    })
  })
}




export const getDisGoodsOrderDayJingjinig = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentgoodsstock/getDisGoodsOrderDayJingjinig' ,
      method: 'POST',
      data: {
        disGoodsId: data.disGoodsId,
        startDate: data.startDate,
        stopDate: data.stopDate,
        depId: data.depId,
        searchDepIds: data.searchDepIds
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
          icon: 'none',
        })
      }
    })
  })
}



//

export const getDisGoodsPurListJingjing = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasegoods/getDisGoodsPurListJingjing' ,
      method: 'POST',
      data: {
        disGoodsId: data.disGoodsId,
        startDate: data.startDate,
        stopDate: data.stopDate,
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
          icon: 'none',
        })
      }
    })
  })
}



export const getDisGoodsBusinessTypeJj = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentgoodsstock/getDisGoodsBusinessTypeJj' ,
      method: 'POST',
      data: {
        disGoodsId: data.disGoodsId,
        startDate: data.startDate,
        stopDate: data.stopDate,
        disId: data.disId,
        searchDepIds: data.searchDepIds
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
          icon: 'none',
        })
      }
    })
  })
}


/**
 * 删除批发商订货规格
 * @param {*} data 
 */
export const gbDisDeleteStandard = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerstandard/gbDisDeleteStandard/' + data ,
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





export const getDate = () => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributer/getDate' ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none',
        })
      }
    })
  })
}



export const saveNxStandard = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxstandard/saveNxStandard',
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
          icon: 'none',
        })
      }
    })
  })
}

export const purUserSaveMendain = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartment/purUserSaveMendain',
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
          icon: 'none',
        })
      }
    })
  })
}






export const saveGbDisGoodsLinshi = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributergoods/saveGbDisGoodsLinshi',
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
          icon: 'none',
        })
      }
    })
  })
}




export const saveLinshiGoodsGb = (filePathList, goodsName,standard, detail,disId, toDepId, depId ) => { 
  return new Promise((resolve, reject) => {
     wx.uploadFile({
       url: apiUrl.apiUrl + 'gbdistributergoods/saveLinshiGoodsGb',//演示域名、自行配置
       filePath: filePathList[0],
       name: 'file',
       header: {
         "Content-Type": "multipart/form-data"
       },
       formData: {
        goodsName: goodsName,
        standard: standard,
        detail: detail,
        disId: disId,
        toDepId: toDepId,
        depId: depId
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



export const queryDepDisGoodsByQuickSearchGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxgoods/queryDepDisGoodsByQuickSearchGb',
      method: 'POST',
      data: {
        disId: data.disId,
        searchStr: data.searchStr,
        depId: data.depId
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
          icon: 'none',
        })
      }
    })
  })
}





export const gbDepGetNxFatherGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxgoods/gbDepGetNxFatherGoods' ,
      method: 'POST',
      data:{
        depId: data.depId,
        fatherId: data.fatherId,
        limit: data.limit,
        page: data.page,
        disId: data.disId
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


export const saveGbOrderJj = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentorders/saveOrdersGbJj' ,
      method: 'POST',
      data: data,
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


export const saveGbOrderJjSx = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentorders/saveOrdersGbJjSx' ,
      method: 'POST',
      data: data,
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

export const saveOrdersGbJjAndSaveDepGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentorders/saveOrdersGbJjAndSaveDepGoods' ,
      method: 'POST',
      data: data,
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



export const saveOrdersGbJjAndSaveDepGoodsSx = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentorders/saveOrdersGbJjAndSaveDepGoodsSx' ,
      method: 'POST',
      data: data,
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

export const saveOrdersGbJjAndSaveGoodsSx = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributergoods/saveOrdersGbJjAndSaveGoodsSx' ,
      method: 'POST',
      data: data,
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


export const saveOrdersGbJjAndSaveGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributergoods/saveOrdersGbJjAndSaveGoods' ,
      method: 'POST',
      data: data,
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



/**
 * 删除订货申请
 * @param {*} data 
 */
export const deleteOrderGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentorders/deleteOrderGb/' + data ,
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




/**
 * 添加批发商订货规格
 * @param {*} data 
 */
export const gbDisSaveStandard = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerstandard/gbDisSaveStandard' ,
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
        })
      }
    })
  })
}

//
/**
 * 修改订货申请
 * @param {*} data 
 */
export const updateOrderGbJjSx = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentorders/updateOrderGbJjSx' ,
      method: 'POST',
      data:{
        id: data.id,
        standard: data.standard,
        weight: data.weight,
        remark: data.remark
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



//
/**
 * 修改订货申请
 * @param {*} data 
 */
export const updateOrderGbJj = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentorders/updateOrderGbJj' ,
      method: 'POST',
      data:{
        id: data.id,
        standard: data.standard,
        weight: data.weight,
        remark: data.remark
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




export const gbDepGetNxCataGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxgoods/gbDepGetNxCataGoods' ,
      method: 'POST',
    
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


export const depGetApplyAiFather = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentorders/depGetApplyAiFather/' +data ,
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


//



export const subDepGetApplyAiFather = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentorders/subDepGetApplyAiFather/' +data ,
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


export const subDepGetApplyAiByTime = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentorders/subDepGetApplyAiByTime/' +data ,
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


export const depGetApplyAiByTime = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentorders/depGetApplyAiByTime/' +data ,
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


export const depGetDepGoodsGbPage = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentdisgoods/depGetDepGoodsGbPage' ,
      method: 'POST',
      data:{
        depId: data.depId,
        limit: data.limit,
        page: data.page,
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

export const disGetDepGoodsGbPage = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentdisgoods/disGetDepGoodsGbPage' ,
      method: 'POST',
      data:{
        disId: data.disId,
        limit: data.limit,
        page: data.page,
        goodsType: data.goodsType
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

export const disGetDepGoodsGbPageWithSupplier = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentdisgoods/disGetDepGoodsGbPageWithSupplier' ,
      method: 'POST',
      data:{
        disId: data.disId,
        limit: data.limit,
        page: data.page,
        supplierId: data.supplierId
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
/**
 * 部门获取订货群配送商品
 * @param {*} data 
 */
export const depGetDepGoodsGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentdisgoods/depGetDepGoodsGb' ,
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





export const finishSharePurGoodsBatchIsAuto = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/finishSharePurGoodsBatchIsAuto',
      method: 'POST',
      data:{
        batchId: data.batchId,
        isAuto: data.isAuto,
        payType: data.payType
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
export const finishSharePurGoodsBatch = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/finishSharePurGoodsBatch',
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
        })
      }
    })
  })
}


//



export const shixianGetAppOrders = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentorders/shixianGetAppOrders',
      method: 'POST',
      data:{
        disId: data.disId,
        depId: data.depId,
        appDepId: data.appDepId,
        nxDisId: data.nxDisId
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


export const gbGetAppOrders = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentorders/gbGetAppOrders',
      method: 'POST',
      data:{
        disId: data.disId,
        depId: data.depId,
        appDepId: data.appDepId,
        nxDisId: data.nxDisId
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

//


export const deleteDisPurAndNxDataItem = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasegoods/deleteDisPurAndNxDataItem/' + data,
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


//


export const supplierDeleteDisPurBatchGbItem = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/supplierDeleteDisPurBatchGbItem/' + data,
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

//

export const receiveGbBatch = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/receiveGbBatch/' + data,
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


export const receiveGbBatchItem = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/receiveGbBatchItem/' + data,
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


export const deleteDisPurBatchGbItem = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/deleteDisPurBatchGbItem/' + data,
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


export const supplierInitWeightPurItem = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/supplierInitWeightPurItem/' + data,
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


export const jingjingGetBuyingGoodsGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/jingjingGetBuyingGoodsGb/' + data ,
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
 * 批发商管理员注册
 * @param {} data 
 */
export const saveDisPurGoodsBatchGbSupplier = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/saveDisPurGoodsBatchGbSupplier',
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
        })
      }
    })
  })
}

/**
 * 批发商管理员注册
 * @param {} data 
 */
export const saveDisPurGoodsBatchGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/saveDisPurGoodsBatchGb',
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
        })
      }
    })
  })
}

//


export const getPurchaseGoodsGbWithTabCountWithNxDisId = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasegoods/getPurchaseGoodsGbWithTabCountWithNxDisId',
      method: 'POST',
      data:{
        depId: data.depId,
        disId: data.disId,
        appDepId: data.appDepId,
        nxDisId: data.nxDisId
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


export const getPurchaseGoodsGbWithTabCount = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasegoods/getPurchaseGoodsGbWithTabCount/' + data,
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




export const disGetPayListDetail = (data) => { 
  return new Promise((resolve, reject) => {
     wx.request({
       url: apiUrl.apiUrl + 'gbdistributerpaylist/disGetPayListDetail' ,//演示域
       method: 'POST',
       data:{
         disId: data.disId,
         limit: data.limit,
         page: data.page,
         type: data.type,
       },
       header: {
         "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
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



export const disPayUser = (data) => { 
  return new Promise((resolve, reject) => {
     wx.request({
       url: apiUrl.apiUrl + 'gbdistributerpay/disPayUser',//演示域
       method: 'POST',
       data: {
        payId: data.payId,
        openId: data.openId,
        subtotal: data.subtotal
       },
       header: {
         "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
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

// 




export const getGbPurGoodsStatisticsForDis = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasegoods/getGbPurGoodsStatisticsForDis',
      method: 'POST',
      data: {
        supplierIds: data.supplierIds,
        purUserIds: data.purUserIds,
        disId: data.disId,
        startDate: data.startDate,
        stopDate: data.stopDate
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: function (res) {
        resolve({ result: res.data })
      },
      fail: function (e) {
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

export const getGbCostGoodsStatistics = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentgoodsstockreduce/getGbCostGoodsStatistics',
      method: 'POST',
      data: {
        supplierIds: data.supplierIds,
        purUserIds: data.purUserIds,
        disId: data.disId,
        startDate: data.startDate,
        stopDate: data.stopDate
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: function (res) {
        resolve({ result: res.data })
      },
      fail: function (e) {
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


export const getGbPurGoodsStatistics = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasegoods/getGbPurGoodsStatistics',
      method: 'POST',
      data: {
        supplierId: data.supplierId,
        purUserId: data.purUserId,
        disId: data.disId,
        startDate: data.startDate,
        stopDate: data.stopDate,
        greatId: data.greatId,
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: function (res) {
        resolve({ result: res.data })
      },
      fail: function (e) {
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




export const getGbPurGoodsStatisticsSeachDate = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasegoods/getGbPurGoodsStatisticsSeachDate',
      method: 'POST',
      data: {
        supplierId: data.supplierId,
        purUserId: data.purUserId,
        disId: data.disId,
        startDate: data.startDate,
        stopDate: data.stopDate,
        greatId: data.greatId
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: function (res) {
        resolve({ result: res.data })
      },
      fail: function (e) {
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


// 分页获取商品列表（包含图表数据）


export const getGbStockPurGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasegoods/getGbStockPurGoods',
      method: 'POST',
      data: {
        supplierId: data.supplierId,
        purUserId: data.purUserId,
        disId: data.disId,
        startDate: data.startDate,
        stopDate: data.stopDate,
        page: data.page,
        limit: data.limit,
        greatId: data.greatId
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: function (res) {
        resolve({ result: res.data })
      },
      fail: function (e) {
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


export const getGbPurGoodsDetailList = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasegoods/getGbPurGoodsDetailList',
      method: 'POST',
      data: {
        disGoodsId: data.disGoodsId,
        startDate: data.startDate,
        stopDate: data.stopDate,
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: function (res) {
        resolve({ result: res.data })
      },
      fail: function (e) {
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

export const getGbPurGoodsListSearchDate = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasegoods/getGbPurGoodsListSearchDate',
      method: 'POST',
      data: {
        supplierId: data.supplierId,
        purUserId: data.purUserId,
        disId: data.disId,
        startDate: data.startDate,
        stopDate: data.stopDate,
        page: data.page,
        limit: data.limit,
        greatId: data.greatId
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: function (res) {
        resolve({ result: res.data })
      },
      fail: function (e) {
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


export const getGbPurGoodsList = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasegoods/getGbPurGoodsList',
      method: 'POST',
      data: {
        supplierId: data.supplierId,
        greatId: data.greatId,
        purUserId: data.purUserId,
        disId: data.disId,
        startDate: data.startDate,
        stopDate: data.stopDate,
        type: data.type,
        page: data.page,
        limit: data.limit
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: function (res) {
        resolve({ result: res.data })
      },
      fail: function (e) {
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