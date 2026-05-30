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
      url: apiUrl.server,
    })

    var value = wx.getStorageSync('mendianInfo');
    if(value){
      this.setData({
        mendianInfo: value,
        disId: value.gbDepartmentDisId
        
      })
    }
   
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

toMendainFood(){

  wx.navigateTo({
    url: '../../food/depFoodList/depFoodList?disId=' + this.data.disId,
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


  /* AI对话 */
  toAiChat(){
    wx.navigateTo({
      url: '/pages/storeAiChat/storeAiChat',
    })
   
  },

  /* 经营分析 - 餐厅画像 */
  toRestaurantProfile(){
    wx.navigateTo({
      url: '/subPackage-ai/pages/restraunt/restaurantProfile/restaurantProfile',
    })
  },



  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  },






})