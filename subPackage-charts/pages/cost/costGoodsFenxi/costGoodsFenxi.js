var load = require('../../../../lib/load.js');
var globalData = getApp().globalData;
var dateUtils = require('../../../../lib/dateUtil');
var apiUrl = require('../../../../config.js');
var api = require('../../../services/api');

// 动态导入 echarts
var echarts;
function initEcharts() {
  if (!echarts) {
    echarts = require('../../../../ec-canvas/echarts');
  }
  return echarts;
}

Page({

  data: {
    ecPurUser: {
      lazyLoad: false
    },
    ecSupplier: {
      lazyLoad: false
    },
    showAllGoods: false,
    showAllSubtotalGoods: false,
  },

  onShow: function () {
    if (this.data.update) {
      this._getSupplierStatistics();
    }
  },

  onLoad: function (options) {
    initEcharts();

    var userInfo = wx.getStorageSync('userInfo');
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      supplierIds: -1,
      purUserIds: -1,
      disId: userInfo ? userInfo.gbDuDistributerId : options.disId,
    });

    var myDate = wx.getStorageSync('myDate');
    if (myDate) {
      var dateRange;
      if (myDate.name === 'custom') {
        dateRange = dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate);
      } else {
        dateRange = dateUtils.getDateRange(myDate.name);
      }
      this.setData({
        startDate: dateRange.startDate,
        stopDate: dateRange.stopDate,
        dateType: myDate.dateType,
        hanzi: myDate.hanzi || dateRange.name,
      });
    } else {
      this.setData({
        dateType: 'month',
        startDate: dateUtils.getFirstDateInMonth(),
        stopDate: dateUtils.getArriveDate(0),
        hanzi: "本月",
      });
    }

    this._getSupplierStatistics();
  },

   // 获取供货商统计信息
   _getSupplierStatistics() {
    var data = {
      purUserIds: this.data.purUserIds,
      supplierIds: this.data.supplierIds,
      disId: this.data.disId,
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      greatId: -1,
    };
    load.showLoading("获取数据中");
    api.getGbCostGoodsStatistics(data)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          console.log("REs", res.result.data);
          this.setData({
            topGoodsProduce: res.result.data.topGoodsProduce,
            topGoodsLoss: res.result.data.topGoodsLoss,
            topGoodsWaste: res.result.data.topGoodsWaste,
            topDayCost: res.result.data.topDayCost,
            costTotal: res.result.data.costTotal,
          });
        }
      })

  },

  toDatePageSearch() {
    this.setData({
      update: true,
    })
    wx.navigateTo({
      url: '../../sel/searchDate/searchDate?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType,
    })
  },

  showSearch() {
    this.setData({
      showSearch: true,
    })
  },



  toStatistics(e) {
    console.log("toStatistics", e);
    var item = e.currentTarget.dataset.goods;
    this.setData({
      item: e.currentTarget.dataset.goods,
      goodsId: item.gbDistributerGoodsId,
      goodsName: item.gbDgGoodsName,
      standard: item.gbDgGoodsStandardname,
    })

    wx.setStorageSync('disGoods', item)
    var type = e.currentTarget.dataset.type;
    wx.navigateTo({
      url: '../../../../subPackage-goods/pages/goods/goodsFenxiCost/goodsFenxiCost?disGoodsId=' + this.data.goodsId + '&startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType + '&searchType=' + type + '&fenxiType=costEcharts&searchDepId=-1',
    })

  },

  toFenxiDate(e) {
    console.log(e);
    var day = e.currentTarget.dataset.item.date;
    var value = e.currentTarget.dataset.item.value;
    var week = this.getChineseWeekDay(day);
    console.log("toPurGoodsFenxi")
    wx.navigateTo({
      url: '../../../../subPackage-charts/pages/statistic/costGoodsByDate/costGoodsByDate?disId=' + this.data.disId + '&startDate=' + day + '&stopDate=' + day + '&hanzi=' + week + '&dateType=' + this.data.dateType + '&fenxiType=costEcharts&searchDepId=-1&value=' + value + '&fatherId=-1&type=sales&id=-1'

    })

  },

  // disId=2&startDate=2025-09-04&stopDate=2025-09-04&dateType=month&fenxiType=costEcharts&searchDepId=-1&value=382.7&allCostTotal=8445.9&id=-1&type=sales&hanzi=星期四

  // 获取中文星期几
  getChineseWeekDay(dateString) {
    try {
      var date = new Date(dateString);
      var dayOfWeek = date.getDay();
      var weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
      return weekDays[dayOfWeek];
    } catch (error) {
      console.error('获取星期几失败:', error);
      return '未知';
    }
  },

  // 切换商品列表展开/收起
  toggleGoodsList() {
    this.setData({
      showAllGoods: !this.data.showAllGoods
    });
  },

  // 切换采购金额商品列表展开/收起
  toggleSubtotalGoodsList() {
    this.setData({
      showAllSubtotalGoods: !this.data.showAllSubtotalGoods
    });
  },

  // 切换销售商品列表展开/收起
  toggleProduceList() {
    this.setData({
      showAllProduce: !this.data.showAllProduce
    });
  },

  // 切换损耗商品列表展开/收起
  toggleLossList() {
    this.setData({
      showAllLoss: !this.data.showAllLoss
    });
  },

  // 切换废弃商品列表展开/收起
  toggleWasteList() {
    this.setData({
      showAllWaste: !this.data.showAllWaste
    });
  },

  // 切换日成本列表展开/收起
  toggleDayCostList() {
    this.setData({
      showAllDayCost: !this.data.showAllDayCost
    });
  },

  


  toBack: function () {
    wx.navigateBack({
      delta: 1,
    });
  },

});
