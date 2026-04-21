var load = require('../../../../lib/load.js');
var globalData = getApp().globalData;
var dateUtils = require('../../../../lib/dateUtil');
var apiUrl = require('../../../../config/index.js');
var apiDistributer = require('../../../../services/apiDistributer');

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

  _getSupplierStatistics: function () {
    var _this = this;
    var data = {
      purUserIds: this.data.purUserIds,
      supplierIds: this.data.supplierIds,
      disId: this.data.disId,
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      greatId: -1,
    };

    apiDistributer.getGbPurGoodsStatisticsForDis(data)
      .then(function (res) {
        if (res.result.code == 0) {
          _this.setData({
            supplierItem: res.result.data,
            purTotal: res.result.data.purTotal,
            purUserData: res.result.data.purUserData,
            supplierData: res.result.data.supplierData,
            topTimesGoods: res.result.data.topTimesGoods,
            topSubtotalGoods: res.result.data.topSubtotalGoods,
            topSubtotalGoodsSubtotal: res.result.data.topSubtotalGoodsSubtotal,
            topSubtotalGoodsPercent: res.result.data.topSubtotalGoodsPercent,
            topGoodsPrice: res.result.data.topGoodsPrice,
            arr: res.result.data.arr,
            mapEveryDay: res.result.data.arr || [],
          }, function () {
            _this.init_purUser_chart();
            _this.init_supplier_chart();
          });
        } else {
          _this.setData({
            mapEveryDay: null
          });
          wx.showToast({
            title: res.result.msg || '获取统计信息失败',
            icon: 'none'
          });
        }
      })
      .catch(function (err) {
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
        console.error('统计信息接口失败:', err);
      });
  },

  init_purUser_chart: function () {
    var that = this;
    that.purUserEchartsComponent = that.selectComponent('#purUserChart');
    if (!that.purUserEchartsComponent) {
      return;
    }

    that.purUserEchartsComponent.init(function (canvas, width, height) {
      var Chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: globalData.rpxR
      });

      var option = that.getPurUserChartOption();
      Chart.setOption(option);

      return Chart;
    });
  },

  init_supplier_chart: function () {
    var that = this;
    that.supplierEchartsComponent = that.selectComponent('#supplierChart');
    if (!that.supplierEchartsComponent) {
      return;
    }

    that.supplierEchartsComponent.init(function (canvas, width, height) {
      var Chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: globalData.rpxR
      });

      var option = that.getSupplierChartOption();
      Chart.setOption(option);

      return Chart;
    });
  },

  getPurUserChartOption: function () {
    var purUserData = this.data.purUserData || [];

    if (!purUserData || purUserData.length === 0) {
      return {
        title: { text: '暂无采购员数据', left: 'center', top: 'center' }
      };
    }

    var names = purUserData.map(function (item) {
      return item.name || item.purUserName || '未知采购员';
    });
    var amounts = purUserData.map(function (item) {
      return parseFloat(item.totalAmount || item.purTotalAmount) || 0;
    });

    return {
      tooltip: {
        show: false
      },
      grid: {
        left: '2%',
        right: '2%',
        bottom: '0',
        top: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: names,
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 12,
          rotate: 45,
          formatter: function (value, index) {
            var amount = amounts[index];
            return value + '\n' + amount + '元';
          },
          lineHeight: 16
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        name: '金额(元)',
        position: 'right',
        nameTextStyle: {
          color: '#666',
          fontSize: 12
        },
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 12
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#f0f0f0',
            type: 'dashed'
          }
        }
      },
      series: [
        {
          name: '采购总额',
          type: 'bar',
          data: amounts,
          itemStyle: {
            color: '#66bb6a',
            borderRadius: [4, 4, 0, 0]
          },
          emphasis: {
            itemStyle: {
              color: '#4caf50'
            }
          },
          barWidth: amounts.length === 1 ? '30%' : (amounts.length <= 3 ? '50%' : '60%')
        }
      ]
    };
  },

  getSupplierChartOption: function () {
    var supplierData = this.data.supplierData || [];

    if (!supplierData || supplierData.length === 0) {
      return {
        title: { text: '暂无供货商数据', left: 'center', top: 'center' }
      };
    }

    var names = supplierData.map(function (item) {
      return item.name || item.supplierName || '未知供货商';
    });
    var amounts = supplierData.map(function (item) {
      return parseFloat(item.totalAmount || item.supplierTotalAmount) || 0;
    });

    return {
      tooltip: {
        show: false
      },
      grid: {
        left: '2%',
        right: '2%',
        bottom: '0',
        top: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: names,
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 12,
          rotate: 45,
          formatter: function (value, index) {
            var amount = amounts[index];
            return value + '\n' + amount + '元';
          },
          lineHeight: 16
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        name: '金额(元)',
        position: 'right',
        nameTextStyle: {
          color: '#666',
          fontSize: 12
        },
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 12
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#f0f0f0',
            type: 'dashed'
          }
        }
      },
      series: [
        {
          name: '采购总额',
          type: 'bar',
          data: amounts,
          itemStyle: {
            color: '#ffa726',
            borderRadius: [4, 4, 0, 0]
          },
          emphasis: {
            itemStyle: {
              color: '#ff9800'
            }
          },
          barWidth: amounts.length === 1 ? '30%' : (amounts.length <= 3 ? '50%' : '60%')
        }
      ]
    };
  },

  toDatePageSearch: function () {
    this.setData({
      update: true,
    });
    wx.navigateTo({
      url: '../../sel/searchDate/searchDate?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType,
    });
  },

  toGoodsPage: function (e) {
    var id = e.currentTarget.dataset.id;
    wx.setStorageSync('disGoods', e.currentTarget.dataset.goods);
    wx.navigateTo({
      url: '/subPackage-goods/pages/goods/goodsFenxiPurchase/goodsFenxiPurchase?disGoodsId=' + id,
    });
  },

  toggleGoodsList: function () {
    this.setData({
      showAllGoods: !this.data.showAllGoods
    });
  },

  toggleSubtotalGoodsList: function () {
    this.setData({
      showAllSubtotalGoods: !this.data.showAllSubtotalGoods
    });
  },

  toPurchaser: function () {
    wx.navigateTo({
      url: '../staff/staff',
    });
  },

  toSupplier: function () {
    wx.navigateTo({
      url: '/subPackage-supplier/pages/supplier/index/index',
    });
  },

  toBack: function () {
    wx.navigateBack({
      delta: 1,
    });
  },

});
