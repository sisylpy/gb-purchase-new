const globalData = getApp().globalData;
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil.js')
var apiUrl = require('../../../../config/index');
var api = require('../../../services/api.js');

// 格式化日期为 月日 格式
function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  var month = dateStr.substring(5, 7);
  var day = dateStr.substring(8, 10);
  if (month.charAt(0) === '0') {
    month = month.charAt(1);
  }
  if (day.charAt(0) === '0') {
    day = day.charAt(1);
  }
  return month + '月' + day + '日';
}

Page({

  /**
   * 页面的初始数据
   */
  data: {
   
    ecCategory: {
      lazyLoad: false // 每日进货总额图表不使用延迟加载
    },
    searchDepId: -1, 
    purUserId: -1,
    supplierId: -1,
    update: false,

    // 日期相关默认值
    startDate: '',
    stopDate: '',
    startDateDisplay: '',
    stopDateDisplay: '',
    dateType: 'month',
    hanzi: '本月',

  },

  onShow() {

    if(this.data.update){
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
         startDateDisplay: formatDateDisplay(dateRange.startDate),
         stopDateDisplay: formatDateDisplay(dateRange.stopDate),
         dateType: myDate.dateType,
         hanzi: myDate.hanzi || dateRange.name,
         update: false
       })
    }   
    
    this._initCostCataData();
   
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
      url: apiUrl.server,
    
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
        startDateDisplay: formatDateDisplay(dateRange.startDate),
        stopDateDisplay: formatDateDisplay(dateRange.stopDate),
        dateType: myDate.dateType,
        hanzi: myDate.hanzi || dateRange.name,
      })
    }else{
      var firstDate = dateUtils.getFirstDateInMonth();
      var todayDate = dateUtils.getArriveDate(0);
      console.log('=== indexGoods onLoad 默认日期 ===');
      console.log('firstDateInMonth:', firstDate);
      console.log('today:', todayDate);
      console.log('================================');
      this.setData({
        dateType: 'month',
        startDate: firstDate,
        stopDate: todayDate,
        startDateDisplay: formatDateDisplay(firstDate),
        stopDateDisplay: formatDateDisplay(todayDate),
        hanzi:  "本月",
      })
    }

    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
        userInfo: value,

      })
    }
    var disInfo = wx.getStorageSync('disInfo');
    console.log(disInfo);
    if (disInfo) {
      this.setData({
        disInfo: disInfo,
        disId: disInfo.gbDistributerId,
      })
    }
    
    this._initCostCataData();

  },





  _initCostCataData() {
    
    var data = {
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      disId: this.data.disId,
      supplierId: this.data.supplierId,
      purUserId: this.data.purUserId,
    }
    // load.showLoading("获取数据")
    api.disGetPurchaseCata(data).then(res => {
      if (res.result.code == 0) {
        load.hideLoading();
        console.log("res.rusls" , res.result.data);
        const arr = res.result.data?.arr || [];
        if (arr.length > 0) {
          arr.forEach(item => {
            const greatPercent = item.dailyData?.greatPercent || 0;
            const costPercent = item.dailyData?.costPercent || 0;
            item.conicGradient = `conic-gradient(#007aff ${greatPercent}%, #e0e0e0 ${greatPercent}%)`;
            item.costConicGradient = `conic-gradient(#05c0a7 ${costPercent}%, #e0e0e0 ${costPercent}%)`;
          });
        }
        this.setData({
          outArr: arr,
        })
      } else {
        load.hideLoading();
        this.setData({
          outArr: [],
          total: 0,
        })
      }
  
    });
  },


  toPurGoodsByGreatId(e){
   var item = e.currentTarget.dataset.item;
    wx.navigateTo({
      url: '../purGoodsByDate/purGoodsByDate?id=' + e.currentTarget.dataset.id + '&disId='
       + this.data.disId + '&name=' + e.currentTarget.dataset.name+ '&startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&hanzi=' + this.data.hanzi + '&dateType=' + this.data.dateType +'&value=' + item.greatPurTotal + '&purTotal=' + item.purTotal ,
    })
  },


  toCostGoodByGreatId(e){
    console.log("toCostGoodByGreatId",e);
    var item = e.currentTarget.dataset.item;
    wx.navigateTo({
      url: '../costGoodsByDate/costGoodsByDate?id=' + e.currentTarget.dataset.id +
      '&disId=' + this.data.disId + '&type=sales&name=' + e.currentTarget.dataset.name + '&startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&hanzi=' + this.data.hanzi +  '&dateType=' + this.data.dateType + '&fenxiType=costEcharts&searchDepId=' + this.data.searchDepId + '&allCostTotal=' + item.costAllTotal
      +'&value=' + item.costTotal,
    })

  },

//

  toDatePage() {
    this.setData({
      update: true,
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


  



})