var globalData = getApp().globalData;

var apiUrl = require('../../../../config/index');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    showOperation: false,
    toOpenMini: false,
    isTishi: false,
    toSharePurchase: false,
    editUser:  false,
    yuyin: 0,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      sysDeviceId: globalData.sysDeviceId,
      url: apiUrl.server,
      disId: options.disId,
    })

    var disInfo = wx.getStorageSync('disInfo');
    if(disInfo){
      this.setData({
        disInfo: disInfo,

      })
    }
    
    
     // 清除缓存
     wx.removeStorageSync('selectedSupplier');
     wx.removeStorageSync('selectedPurUser');
     
   
  },




  
  
  toMendian(){
    wx.navigateTo({
      url: '/subPackage-mendian/pages/account/userEdit/userEdit',
    })

  },

  toGoods(){
    wx.navigateTo({
      url: '/subPackage-goods/pages/goods/index/index',
    })
  },
  
  
  toFoodGoodsFenxi(){

  wx.navigateTo({
    url: '/subPackage-charts/pages/cost/foodGoodsFenxi/foodGoodsFenxi?disId=' + this.data.disId,
  })

},

toCostGoodsFenxi(){

  wx.navigateTo({
    url: '/subPackage-charts/pages/cost/costGoodsFenxi/costGoodsFenxi?disId=' + this.data.disId,
  })

},
  
  toPurGoodsFenxi(){
    wx.navigateTo({
      url: '/subPackage-charts/pages/cost/purGoodsFenxi/purGoodsFenxi?disId=' + this.data.disId,
    })
  },


  toJrdh() {
    wx.navigateTo({
      url: '/subPackage-supplier/pages/supplier/index/index',
    })
  },


  toStaff(){
    wx.navigateTo({
      url: '../staff/staff',
    })
  },


  editHome(){
    wx.navigateTo({
      url: '../homeEdit/homeEdit',
    })

  },

  toHistory(){
    wx.navigateTo({
      url: '/subPackage-mendian/pages/order/orderHistory/index/index?disId=' + this.data.disId,
    })
  },


  toAccount(){
    wx.navigateTo({
      url: '../../account/payPage/payPage?type=0',
    })
  } , 


toPayList(){
  wx.navigateTo({
    url: '../../account/payList/payList',
  })
},



toPayPage(){
  wx.navigateTo({
    url: '../../account/payPage/payPage?type=0',
  })
},


toStock(){
  wx.navigateTo({
    url: '/subPackage-mendian/pages/stock/index/index',
  })
},


toPurchaseDate(){
  wx.navigateTo({
    url: '/subPackage-charts/pages/statistic/index/index',
  })
},



toPurchaseGoods(){
  wx.navigateTo({
    url: '/subPackage-charts/pages/statistic/indexGoods/indexGoods',
  })
},


toFood(){
  wx.navigateTo({
    url: '../../food/index/index?disId=' + this.data.disId,
  })
},

toMendainFood(){
  wx.navigateTo({
    url: '../../food/depFoodList/depFoodList?disId=' + this.data.disId,
  })
},

  toReportStock(){
    wx.navigateTo({
      url: '/subPackage-charts/pages/report/reportPage/reportPage',
    })
  },

  toDaily(){
    wx.navigateTo({
      url: '../../../../subPackage-charts/pages/sales/dailyTurnover/dailyTurnover',
    })

  },
toPriceFenxi(){
  wx.navigateTo({
    url: '/subPackage-mendian/pages/data/priceFenxi/priceFenxi',
  })
},

  toShixanBill(){
    wx.navigateTo({
      url: '/subPackage-mendian/pages/yishang/myNxDistributerBill/myNxDistributerBill?nxDisId=' + this.data.disInfo.nxDistributerEntity.nxDistributerId + '&gbDisId=' + this.data.disId,
    })


  },



  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  },


  /* AI对话 */
  toAiChat(){
    wx.navigateTo({
      url: '/subPackage-ai/pages/chat/aiChat/aiChat',
    })
  },

  /* 经营分析 - 餐厅画像 */
  toRestaurantProfile(){
    wx.navigateTo({
      url: '/subPackage-ai/pages/restraunt/restaurantProfile/restaurantProfile',
    })
  },








})