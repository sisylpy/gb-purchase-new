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
    ecTurnover: {
      lazyLoad: false
    },
    
    // 日期相关默认值
    startDate: '',
    stopDate: '',
    dateType: 'month',
    hanzi: '本月',
    update: false,
    
    // 数据
    stats: null,
    arr: [],
    dailyList: [],
    
    // 添加菜单
    showAddMenu: false
  },

  onShow() {
    if (this.data.update) {
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
          update: false
        })
      }
     
    }
    this._initData();
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

    

    var value = wx.getStorageSync('mendianInfo');
    if(value){
      this.setData({
        mendianInfo: value,
        depFatherId: value.gbDepartmentId,
      })
    }

    this._initData();
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
  /**
   * 初始化数据
   */
  _initData() {
    load.showLoading("获取数据中")
    var params = {
      departmentId: this.data.depFatherId,
      startDate: this.data.startDate,
      endDate: this.data.stopDate,
    }

    api.getDailyTurnover(params).then(res => {
      load.hideLoading();
      console.log('原始响应:', res);
      console.log('接口返回数据:', JSON.stringify(res.result, null, 2));
      var data = res.result;
      console.log("dailyList",data.dailyList)
      if (data.code == 0) {
        // 计算统计数据
        var stats = {
          totalRevenue: 0,
          avgRevenuePerDay: 0,
          totalOrders: 0,
          days: data.dailyList ? data.dailyList.length : 0,
          totalDineIn: 0,
          avgDineInPerDay: 0,
          totalTakeout: 0,
          avgTakeoutPerDay: 0,
          totalPlatformFee: 0
        };
        
        if (data.dailyList && data.dailyList.length > 0) {
          data.dailyList.forEach(item => {
            stats.totalDineIn += item.gbAiDailyRevenueDineInRevenue || 0;
            stats.totalTakeout += item.gbAiDailyRevenueTakeoutRevenue || 0;
            stats.totalOrders += (item.gbAiDailyRevenueDineInOrders || 0) + (item.gbAiDailyRevenueTakeoutOrders || 0);
          });
          stats.totalRevenue = stats.totalDineIn + stats.totalTakeout;
          stats.avgDineInPerDay = (stats.totalDineIn / stats.days).toFixed(2);
          stats.avgTakeoutPerDay = (stats.totalTakeout / stats.days).toFixed(2);
          stats.avgRevenuePerDay = (stats.totalRevenue / stats.days).toFixed(2);
        }
        
        // 计算实收金额
        var actualRevenue = 0;
        if (data.dailyList && data.dailyList.length > 0) {
          data.dailyList.forEach(item => {
            stats.totalPlatformFee += item.gbAiDailyRevenuePlatformFee || 0;
          });
          actualRevenue = (stats.totalRevenue - stats.totalPlatformFee).toFixed(2);
        }
        
        this.setData({
          stats: stats,
          chartData: data.chartData || [],
          dailyList: data.dailyList || [],
          actualRevenue: actualRevenue
        });

        // 初始化图表
        if (data.chartData && data.chartData.length > 0) {
          this.init_chart();
        }
      } else {
        wx.showToast({
          title: data.msg || '获取数据失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      load.hideLoading();
      console.log('err:', err);
      wx.showToast({
        title: '网络请求失败',
        icon: 'none'
      })
    });
  },

  /**
   * 初始化营业额趋势图表
   */
  init_chart: function () {
    var that = this;

    that.echartsComponent = that.selectComponent('#turnoverChart');
    if (!that.echartsComponent) {
      return;
    }
    that.echartsComponent.init((canvas, width, height) => {
      const Chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: globalData.rpxR
      });
      const option = that.getChartOption();

      Chart.setOption(option);

      that.setData({
        chartDrawn: true
      });
      return Chart;
    });
  },

  /**
   * 获取图表配置
   */
  getChartOption() {
    const chartData = this.data.chartData || [];
    if (!chartData || chartData.length === 0) {
      return {
        title: {
          text: '暂无数据',
          left: 'center',
          top: 'center'
        }
      };
    }

    // 处理数据 (date格式: "2026-04-14")
    const dates = chartData.map(item => {
      const dateStr = item.date; // 取 "2026-04-14"
      return dateStr.split('-')[2] + '日'; // 取 "14日"
    });
    const dineInData = chartData.map(item => item.dineIn || 0);
    const takeoutData = chartData.map(item => item.takeout || 0);

    return {
      animation: true,
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: function(params) {
          var day = params[0].axisValue;
          var html = day + '<br/>';
          params.forEach(item => {
            html += item.marker + item.seriesName + ': ' + item.value + '元<br/>';
          });
          return html;
        }
      },
      legend: {
        show: false
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 10,
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
          fontSize: 10
        },
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 10
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
          name: '堂食',
          type: 'bar',
          stack: '总量',
          data: dineInData,
          itemStyle: {
            color: '#007aff'
          },
          barWidth: '40%',
          emphasis: {
            disabled: true
          }
        },
        {
          name: '外卖',
          type: 'bar',
          stack: '总量',
          data: takeoutData,
          itemStyle: {
            color: '#34c759'
          },
          barWidth: '40%',
          emphasis: {
            disabled: true
          }
        }
      ]
    };
  },

  /**
   * 跳转日期选择
   */
  toDatePage() {
    this.setData({
      update: true
    })
    wx.navigateTo({
      url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate +
        '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType,
    })
  },

  /**
   * 跳转每日详情
   */
  toDayDetail(e) {
    var item = e.currentTarget.dataset.item;
    var week = this.getChineseWeekDay(item.day);
    
    wx.navigateTo({
      url: '../turnoverDetail/turnoverDetail?day=' + item.day + '&departmentId=' + this.data.departmentId + '&hanzi=' + week
    })
  },

  /**
   * 获取中文星期几
   */
  getChineseWeekDay(dateString) {
    try {
      var date = new Date(dateString);
      var dayOfWeek = date.getDay();
      var weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
      return weekDays[dayOfWeek];
    } catch (error) {
      return '未知';
    }
  },

  /**
   * 返回
   */
  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },

  /**
   * 点击添加按钮
   */
  onAddTap() {
    this.setData({
      showAddMenu: !this.data.showAddMenu
    })
  },

  /**
   * 隐藏菜单
   */
  hideMenu() {
    this.setData({
      showAddMenu: false
    })
  },

  /**
   * 添加单日营业额
   */
  addSingleDay() {
    this.setData({
      showAddMenu: false
    })
    /** 列表当前筛选区间的最后一天，用于添加页模板起算日（不从当月 1 号起） */
    var anchor =
      (this.data.stopDate && String(this.data.stopDate).substring(0, 10)) ||
      (this.data.startDate && String(this.data.startDate).substring(0, 10)) ||
      dateUtils.getArriveDate(0);
    wx.navigateTo({
      url:
        '../addFoodSales/addFoodSales?type=single&departmentId=' +
        this.data.departmentId +
        '&anchorDate=' +
        encodeURIComponent(anchor),
    })
  },

  /**
   * 每日详情某一行：进入「修改菜品销量」（拉取当日已有数据）
   */
  openFoodSalesEdit(e) {
    var raw = e.currentTarget.dataset.recordDate
    if (raw == null || raw === '') {
      wx.showToast({ title: '日期缺失', icon: 'none' })
      return
    }
    var day = String(raw).trim().substring(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      wx.showToast({ title: '日期格式异常', icon: 'none' })
      return
    }
    wx.navigateTo({
      url:
        '../editFoodSales/editFoodSales?edit=1&type=single&departmentId=' +
        (this.data.departmentId || '') +
        '&anchorDate=' +
        encodeURIComponent(day),
    })
  },


 
})
