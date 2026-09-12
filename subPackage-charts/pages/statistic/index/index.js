const globalData = getApp().globalData;

var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil.js')
var apiUrl = require('../../../../config/index');
var api = require('../../../services/api.js');
var echarts = require('../../../../ec-canvas/echarts');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    ecDaily: {
      lazyLoad: false // 每日进货总额图表不使用延迟加载
    },
    sliderOffset: 0,
    sliderOffsets: [],
    sliderLeft: 0,
    tab1Index: 0,
    itemIndex: 0,
    tabs: ["1", "2"],

    itemIndexDep: 0,
    tab1IndexDep: 0,
    purUserId: -1,
    supplierId: -1,
    update: false,

    // 日期相关默认值
    startDate: '',
    stopDate: '',
    dateType: 'month',
    hanzi: '本月',
    employeeMealCostTotal: 0,

  },

  onShow() {
 
   
    if (this.data.update) {
      this._syncDatesFromMyDateStorage();
      this.setData({ update: false });
      this._loadFilterDataFromCache();
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

    this._syncDatesFromMyDateStorage();


    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
        userInfo: value,

      })
    }
    var disInfo = wx.getStorageSync('disInfo');
 
    if (disInfo) {
      this.setData({
        disInfo: disInfo,
        disId: disInfo.gbDistributerId,
      })
    }
    
    this._initListData();
  },



  _syncDatesFromMyDateStorage() {
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
  },


  // 1 swiper 

  _initListData() {
    load.showLoading("获取数据中")
   
    var costData = {
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      disId: this.data.disId,
      purUserId: this.data.purUserId || -1,
      supplierId: this.data.supplierId || -1,
    }

    api.disGetPurchaseDate(costData).then(res => {
     console.log("res.reus", res.result.data)
      if (res.result.code == 0) {
        load.hideLoading();
        var data = res.result.data;
        var wasteCost = parseFloat(data.wasteCostTotal) || 0;
        var lossCost = parseFloat(data.lossCostTotal) || 0;
        var lossWasteTotal = Math.round((wasteCost + lossCost) * 10) / 10;

        this.setData({
          allTotal: data.allTotal,
          zicaiTotal: data.zicaiTotal || 0,
          dinghuoTotal: data.dinghuoTotal || 0,
          restStockTotal: data.restStockTotal || 0,
          saleCostTotal: data.saleCostTotal || 0,
          lossWasteTotal: lossWasteTotal,
          costTotal: data.costTotal,
          returnCostTotal: data.returnCostTotal || 0,
          costPerDay: data.costPerDay,
          purchasePerDay: data.purchasePerDay,
          employeeMealCostTotal: data.employeeMealCostTotal || 0,
          arr: data.arr,
        });
    
        // 初始化合并图表
        this.init_combined_chart();
      }else{
        this.setData({
          arr: []
        })
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    


    });

  },

  // 初始化合并图表（采购+成本）
  init_combined_chart: function () {
    var that = this;

    that.dailyEchartsComponent = that.selectComponent('#dailyChart');
    if (!that.dailyEchartsComponent) {
      return;
    }
    that.dailyEchartsComponent.init((canvas, width, height) => {
      const Chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: globalData.rpxR
      });
      const option = that.getCombinedChartOption();

      Chart.setOption(option);

      that.setData({
        dailyChartDrawn: true
      });
      return Chart;
    });
  },

  // 单日采购额：接口有时不给 purTotal，与列表一致用自采+订货兜底
  _dayPurchaseAmount(item) {
    var p = parseFloat(item.purTotal);
    var hasPur = item.purTotal != null && item.purTotal !== '' && !isNaN(p);
    if (hasPur) return p;
    return (parseFloat(item.zicai) || 0) + (parseFloat(item.dinghuo) || 0);
  },

  // 获取合并图表配置（采购+成本）
  getCombinedChartOption() {
    const purchaseArr = this.data.arr || [];
    if (!purchaseArr || purchaseArr.length === 0) {
      return {
        title: {
          text: '暂无数据',
          left: 'center',
          top: 'center'
        }
      };
    }

    const purchaseDates = purchaseArr.map(item => item.day.split('-')[2]);
    const purchaseAmounts = purchaseArr.map(item => this._dayPurchaseAmount(item));
    const costAmounts = purchaseArr.map(item => parseFloat(item.costTotal) || 0);

    return {
      animation: false,
      tooltip: {
        show: false
      },

      legend: {
        data: ['采购金额', '成本金额'],
        top: 4,
        textStyle: {
          fontSize: 12
        }
      },

      grid: {
        left: '3%',
        right: '3%',
        bottom: '8%',
        top: '22%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: purchaseDates,
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 12,
          rotate: 45
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        name: '金额(元)',
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
      series: [{
          name: '采购金额',
          type: 'bar',
          data: purchaseAmounts,
          itemStyle: {
            color: '#007aff',
            borderRadius: [4, 4, 0, 0]
          },
          // 禁用交互
          silent: true,
          emphasis: {
            disabled: true // 禁用高亮效果
          },
          barWidth: '30%'
        },
        {
          name: '成本金额',
          type: 'bar',
          data: costAmounts,
          itemStyle: {
            color: '#05c0a7',
            borderRadius: [4, 4, 0, 0]
          },
          // 禁用交互
          silent: true,
          emphasis: {
            disabled: true // 禁用高亮效果
          },
          barWidth: '30%'
        }
      ]
    };
  },

 
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

  toDatePage() {
    console.log("dddfd")
    this.setData({
      update: true
    })
    wx.navigateTo({
      url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate +
        '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType,
    })
  },


  showCalender(e) {
    this.setData({
      showOperation: true,
    })
  },


  toSummaryPurchase(e) {
    var kind = e.currentTarget.dataset.kind;
    var base = 'startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate
      + '&disId=' + this.data.disId + '&hanzi=' + encodeURIComponent(this.data.hanzi || '');
    if (kind === 'zicai') {
      wx.navigateTo({
        url: '../purchaseDeatil/purchaseDeatil?' + base + '&greatId=-1&type=1',
      });
    } else if (kind === 'dinghuo') {
      wx.navigateTo({
        url: '../purchaseDeatil/purchaseDeatil?' + base + '&greatId=-1&type=5',
      });
    } else if (kind === 'stock') {
      wx.navigateTo({
        url: '../stockPurGoods/stockPurGoods?' + base + '&dateType=' + (this.data.dateType || 'month')
          + '&searchDepIds=-1&id=-1',
      });
    }
  },

  toSummaryCost(e) {
    var kind = e.currentTarget.dataset.kind;
    var valueMap = {
      sales: this.data.saleCostTotal,
      loss: this.data.lossWasteTotal,
      return: this.data.returnCostTotal,
      employeeMeal: this.data.employeeMealCostTotal,
    };
    wx.navigateTo({
      url: '../costGoodsByDate/costGoodsByDate?disId=' + this.data.disId
        + '&startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate
        + '&dateType=' + (this.data.dateType || 'month') + '&fenxiType=costEcharts&searchDepId=-1'
        + '&value=' + (valueMap[kind] || 0) + '&allCostTotal=' + (this.data.costTotal || 0)
        + '&id=-1&type=' + kind + '&hanzi=' + encodeURIComponent(this.data.hanzi || ''),
    });
  },

  toPurGoodsFenxi(e) {
    var item = e.currentTarget.dataset.item;
    var day = item.day;
    var dayTotal = (parseFloat(item.zicai) || 0) + (parseFloat(item.dinghuo) || 0);
    // 使用公共方法获取中文星期几
    var week = this.getChineseWeekDay(day);

    wx.navigateTo({
      url: '../purGoodsByDate/purGoodsByDate?startDate=' + day  + '&stopDate=' + day + '&disId=' +
        this.data.disId  + '&hanzi=' + week + '&dateType=customer&value=' + dayTotal + '&purTotal=' + this.data.allTotal + '&id=-1'
    })
  },


  toFenxiDate(e) {
    var index = e.currentTarget.dataset.index;
    var purchaseDate = this.data.arr[index].day;
    var costValue = this.data.arr[index].costTotal;
    // 使用公共方法获取中文星期几
    var week = this.getChineseWeekDay(purchaseDate);
    
    const url = '../costGoodsByDate/costGoodsByDate?disId=' + this.data.disId + '&startDate=' + purchaseDate + '&stopDate=' + purchaseDate + '&dateType=customer&fenxiType=costEcharts&searchDepId=-1&value=' + costValue + '&allCostTotal=' + this.data.costTotal + '&id=-1&type=sales&hanzi=' + week ;
    wx.navigateTo({
      url: url,

    })
  },


  toMyDate() {
    wx.navigateTo({
      url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate +
        '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType,
    })
  },

  toGoodsDashboard() {
    wx.redirectTo({
      url: '/subPackage-charts/pages/statistic/indexGoods/indexGoods',
    });
  },


  toFilterType() {
    var type = "";
    if (this.data.tab1Index == 0) {
      type = "purchaser";
      wx.setStorageSync('purUserList', this.data.purUserList);
    } else {
      type = "supplier";
      wx.setStorageSync('supplierList', this.data.supplierList);
    }

    // 传递当前选中的参数
    let url = '../../sel/filterDataType/filterDataType?searchType=' + type;
    if (type === 'purchaser' && this.data.purUserId !== -1) {
      url += '&selectedIds=' + this.data.purUserId;
    } else if (type === 'supplier' && this.data.supplierId !== -1) {
      url += '&selectedIds=' + this.data.supplierId;
    }
    wx.navigateTo({
      url: url,
    })
  },



  /**
   * 从缓存加载筛选数据
   */
  _loadFilterDataFromCache() {
    // 从缓存获取供货商信息
    var supplierItem = wx.getStorageSync('selectedSupplier');
    if (supplierItem) {
      this.setData({
        supplierId: supplierItem.supplierId,
        selectedSupplierName: supplierItem.supplierName,
        purUserId: -1,
        selectedPurUserName: ""
      });
    }

    // 从缓存获取采购员信息
    var purUserItem = wx.getStorageSync('selectedPurUser');
    if (purUserItem) {
      this.setData({
        purUserId: purUserItem.purUserId,
        selectedPurUserName: purUserItem.purUserName,
        supplierId: -1,
        selectedSupplierName: ""

      });
    }
    this._initListData();

  },


  // 删除采购员选择
  delSearch() {
    this.setData({
      purUserId: -1,
      selectedPurUserName: "",
      supplierId: -1,
      selectedSupplierName: ""
    });
    // 直接更新图表，不需要重新请求接口
    // this._updateChartsWithFilter();
    wx.removeStorageSync('selectedSupplier');
    wx.removeStorageSync('selectedPurUser');
    this._initListData()
  },


  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },



  onUnload() {
    // 页面退出时清除筛选缓存
    wx.removeStorageSync('disGoods');
    wx.removeStorageSync('selectedSupplier');
    wx.removeStorageSync('selectedPurUser');
    wx.removeStorageSync('supplierList');
    wx.removeStorageSync('purUserList');
    wx.removeStorageSync('supplierItem');
    wx.removeStorageSync('purUserItem');
  }



})
