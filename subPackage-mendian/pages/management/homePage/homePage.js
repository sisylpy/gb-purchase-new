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

    this._loadMendianInfo();
  },

  onShow: function () {
    // 每次显示时重新读取缓存，确保门店名称等是最新的
    this._loadMendianInfo();
  },

  _loadMendianInfo: function () {
    var value = wx.getStorageSync('mendianInfo');
    if(value){
      this.setData({
        mendianInfo: value,
        disId: value.gbDepartmentDisId
      })
    }
    var disInfo  = wx.getStorageSync('disInfo');
    if(disInfo){
      this.setData({
        disInfo: disInfo,
        mendianList: disInfo.mendianDepartmentList,
      })
    }
  },

  // 显示选择分店弹窗
  showMendianPicker(){
    this.setData({ showMendianPicker: true })
  },

  // 隐藏选择分店弹窗
  hideMendianPicker(){
    this.setData({ showMendianPicker: false })
  },

  // 选中门店并缓存
  selectMendian(e){
    var item = e.currentTarget.dataset.item;
    // 已经是当前门店，无需切换
    if (item.gbDepartmentId === this.data.mendianInfo.gbDepartmentId) {
      this.hideMendianPicker();
      return;
    }
    wx.setStorageSync('mendianInfo', item);
    var disInfo = wx.getStorageSync('disInfo');
    if (disInfo && disInfo.mendianDepartmentList) {
      for (var i = 0; i < disInfo.mendianDepartmentList.length; i++) {
        if (disInfo.mendianDepartmentList[i].gbDepartmentId === item.gbDepartmentId) {
          disInfo.mendianDepartmentList[i] = item;
          break;
        }
      }
      wx.setStorageSync('disInfo', disInfo);
    }
    this.setData({
      mendianInfo: item,
      disId: item.gbDepartmentDisId,
      showMendianPicker: false,
    })
    wx.showToast({
      title: '已选择: ' + item.gbDepartmentName,
      icon: 'none',
    })
  },

  toGroup(){
    wx.navigateTo({
      url: '/subPackage-group/pages/account/disEdit/disEdit',
    })

  },


  toStock: function () {
    wx.navigateTo({ url: '/subPackage-charts/pages/stock/index/index' });
  },


  toResGoods: function () {
    wx.navigateTo({ url: '/subPackage-goods/pages/depGoodsIndex/depGoodsIndex' });
  },

  toFood(){
    wx.navigateTo({
      url: '/subPackage-group/pages/food/index/index',
    })
  },

  toMendian(){
    wx.navigateTo({
      url: '/subPackage-mendian/pages/mendian/index/index',
    })

  },


  toGroupGoods(){
    wx.navigateTo({
      url: '/subPackage-group/pages/goods/resGoods/resGoods',
    })
  },
  
  
  toFoodGoodsFenxi(){

  wx.navigateTo({
    url: '/subPackage-charts/pages/cost/foodGoodsFenxi/foodGoodsFenxi?disId=' + this.data.disId,
  })

},

toMendainFood(){

  wx.navigateTo({
    url: '../../management/depFoodList/depFoodList?disId=' + this.data.disId,
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


  toStaffMeal: function () {
    wx.navigateTo({ url: '/subPackage-mendian/pages/food/index/index' });
  },

  // toStaff(){
  //   wx.navigateTo({
  //     url: '../staff/staff',
  //   })
  // },





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



  toDaily: function () {
    wx.navigateTo({
      url: '/subPackage-charts/pages/sales/dailyTurnover/dailyTurnover',
    });
  },

  /* AI对话 */
  toAiChat: function () {
    wx.navigateTo({
      url: '/subPackage-charts/pages/aiChat/aiChat',
    })
   
  },

  /* 经营分析 - 餐厅画像 */
  toRestaurantProfile(){
    wx.navigateTo({
      url: '/subPackage-ai/pages/restraunt/restaurantProfile/restaurantProfile',
    })
  },


  toOrder(){
    wx.navigateTo({
      url: '../../order/chefOrder/chefOrder',
    })
  },



  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  },






})