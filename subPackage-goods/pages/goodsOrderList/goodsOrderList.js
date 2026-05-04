const globalData = getApp().globalData;
var load = require('../../../lib/load.js');
var dateUtils = require('../../../utils/dateUtil');
var goodsApi = require('../../services/api.js');

Page({

  onShow(){

    if(this.data.update){
      var myDate = wx.getStorageSync('myDate');
      if (myDate) {
        // 如果是自定义日期，传递具体的开始和结束日期
        var dateRange;
        if (myDate.name === 'custom' ) {
          dateRange = dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate);
        } else {
          dateRange = dateUtils.getDateRange(myDate.name);
        }
        this.setData({
          startDate: dateRange.startDate,
          stopDate: dateRange.stopDate,
          dateType: myDate.dateType,
          hanzi: myDate.hanzi || dateRange.name,
          update: false
        })
      } 
  
      this._initData();
    }


  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {


    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      disGoodsId: options.disGoodsId,
    })

    var myDate = wx.getStorageSync('myDate');
    if(myDate){
      // 如果是自定义日期，传递具体的开始和结束日期
      var dateRange;
      if (myDate.name === 'custom' ) {
        dateRange = dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate);
      } else {
        dateRange = dateUtils.getDateRange(myDate.name);
      }
    
      this.setData({
        startDate: dateRange.startDate,
        stopDate: dateRange.stopDate,
        dateType: myDate.dateType,
        hanzi: myDate.hanzi || dateRange.name,
      })
    }else{
      this.setData({
        dateType: 'month',
        startDate: dateUtils.getFirstDateInMonth(),
        stopDate: dateUtils.getArriveDate(0),
        hanzi:  "本月",
      })
    }

    var disGoods = wx.getStorageSync('disGoods');
    if (disGoods){
        this.setData({
          disGoods: disGoods,
          standard: disGoods.gbDgGoodsStandardname,
          disId: disGoods.gbDgDistributerId,
        })
    }
   
    
    this._initData();

  },

  _initData() {
   
    var data = {
      disGoodsId: this.data.disGoodsId,
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      depId: -1,
      searchDepIds: -1
    }
    load.showLoading("获取数据中")
    goodsApi.getDisGoodsOrderDayJingjinig(data)
      .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          console.log(res.result.data);
          this.setData({
            businessArr: res.result.data,
          })
        } else {
          load.hideLoading();
          this.setData({
            businessArr: []
          })
          
        }

      })
  },




toDatePage() {
  this.setData({
    update: true
  })
  wx.navigateTo({
    url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate +
      '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType,
  })
},


  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },

  onUnload() {
    
     // 清除缓存
     wx.removeStorageSync('disGoods');
     wx.removeStorageSync('selectedSupplier');
     wx.removeStorageSync('selectedPurUser');
  }


})