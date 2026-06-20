
var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;

import * as echarts from '../../../../ec-canvas/echarts';

var dateUtils = require('../../../../lib/dateUtil');
var chartsApi = require('../../../services/api.js');
var itemWidth = "";
var windowWidth  = "";

Page({

  onShow(){

    


    if (this.data.update) {
      this._syncDatesFromMyDateStorage();
      this.setData({ update: false });
      this._initData();
    }

   

  },

  /**
   * 页面的初始数据
   */
  data: {
   
    update:false,
    // 图表相关数据
    dailyChartDrawn: false,
    produceList: [],
    lossList: [],
    wasteList: [],
    hasGoodsCostContent: false,
    // 展开状态管理
    expandedRows: {},
    // AI分析数据
    aiAnalysis: null,
    warningsExpanded: true,
    suggestionsExpanded: true,
    summaryExpanded: false,

   
  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
// 推荐直接用新API
let windowInfo = wx.getWindowInfo();
let globalData = getApp().globalData;
this.setData({
  windowWidth: windowInfo.windowWidth * globalData.rpxR,
  windowHeight: windowInfo.windowHeight * globalData.rpxR,
  navBarHeight: globalData.navBarHeight * globalData.rpxR,
});

    this.setData({
      disGoodsId: options.disGoodsId,
      dateType: options.dateType,
      type: options.type,
      fenxiType: options.fenxiType,
       searchDepId: options.searchDepId,
       disGoodsId: options.disGoodsId,
       nxDisId: options.nxDisId,
     
    })
    this._syncDatesFromMyDateStorage();
   
   
    var disGoods = wx.getStorageSync('disGoods');
    if(disGoods){
          this.setData({
        disGoods: disGoods
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
        hanzi: '本月',
      });
    }
  },


  /** 解析接口里的金额/数量字符串 */
  _parseAmountForDisplay(v) {
    if (v == null || v === '') return 0;
    var n = parseFloat(String(v).replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  },

  _formatMoneyStr(sum) {
    if (!sum || sum === 0) return '0.00';
    return (Math.round(sum * 100) / 100).toFixed(2);
  },

  /** 按日部门行：汇总菜品份数、预览文案、分摊营业额，便于老板看「出库 ↔ 销量」 */
  _enrichDayDepRow(day) {
    var sales = day.dayDishIngredientSales;
    if (!sales || !sales.length) {
      return Object.assign({}, day, {
        _gfcSalesPortionsTotal: 0,
        _gfcDishCount: 0,
        _gfcSalesPreview: '',
        _gfcAllocatedRevenueSum: '',
      });
    }
    var portions = 0;
    var revenueSum = 0;
    var i;
    for (i = 0; i < sales.length; i++) {
      var row = sales[i];
      portions += this._parseAmountForDisplay(row.salesPortions);
      revenueSum += this._parseAmountForDisplay(row.listRevenueAllocatedToIngredient);
    }
    var preview = '';
    if (sales.length === 1) {
      preview =
        (sales[0].dishName || '菜品') +
        ' · ' +
        (sales[0].salesPortions != null ? sales[0].salesPortions : '') +
        ' 份';
    } else {
      var bits = [];
      for (i = 0; i < sales.length && i < 2; i++) {
        bits.push(
          (sales[i].dishName || '菜品') +
            ' ' +
            (sales[i].salesPortions != null ? sales[i].salesPortions : '') +
            '份'
        );
      }
      preview = bits.join('，');
      if (sales.length > 2) {
        preview += '…';
      }
    }
    return Object.assign({}, day, {
      _gfcSalesPortionsTotal: portions,
      _gfcDishCount: sales.length,
      _gfcSalesPreview: preview,
      _gfcAllocatedRevenueSum: this._formatMoneyStr(revenueSum),
    });
  },

  _enrichItemListDisplay(list) {
    if (!list || !list.length) return list || [];
    var that = this;
    return list.map(function (dayBlock) {
      var arr = (dayBlock.arr || []).map(function (row) {
        return that._enrichDayDepRow(row);
      });
      return Object.assign({}, dayBlock, { arr: arr });
    });
  },

  _initData(){
    var data = {
      startDate : this.data.startDate,
      stopDate: this.data.stopDate,
      disGoodsId: this.data.disGoodsId,
      searchDepId: this.data.searchDepId,
    }
    load.showLoading("获取数据中")
    chartsApi.getGoodsReduceWithDayData(data).then(res => {
      if(res.result.code == 0){
        load.hideLoading();
        const d = res.result.data || {};
        const aiRaw = d.aiAnalysis || null;
      
        const hasGoodsCostContent = !!(
          aiRaw ||
          Number(d.oneTotal) > 0 ||
          (d.itemList && d.itemList.length) ||
          (d.produceList && d.produceList.length) ||
          (d.lossList && d.lossList.length) ||
          (d.wasteList && d.wasteList.length)
        );
        this.setData({
          oneTotal : d.oneTotal,
          salesTotal: d.salesTotal,
          lossTotal: d.lossTotal,
          wasteTotal: d.wasteTotal,
          
          subTotal: d.subTotal,
          weightTotal: d.weightTotal,

          oneTotalWeight : d.oneTotalWeight,
          salesTotalWeight: d.salesTotalWeight,
          lossTotalWeight: d.lossTotalWeight,
          wasteTotalWeight: d.wasteTotalWeight,

          //
          lossList: d.lossList || [],
          produceList: d.produceList || [],
          wasteList: d.wasteList || [],

          itemList: this._enrichItemListDisplay(d.itemList),
          
          // AI分析数据（含合并后的理论/实际四项）
          aiAnalysis: aiRaw,

          hasGoodsCostContent,
          
        })

        // 初始化图表，添加延迟确保DOM已更新
        setTimeout(() => {
          this.initDailyChart();
          
          // 强制触发图表渲染
          setTimeout(() => {
            this.forceChartRender();
          }, 1000); // 增加延迟时间
        }, 500); // 增加延迟时间

       
      }else{
        load.hideLoading;
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
        this.setData({
          oneTotal : 0,
          salesTotal: 0,
          lossTotal: 0,
          wasteTotal: 0,
          stArr: [],
          depArr: "",
          aiAnalysis: null,
          hasGoodsCostContent: false,
        })
      }
      
    })

  },

  

  toBack(){
    
    
    wx.navigateBack({
      delta: 1
    })

  },

  // 清除部门筛选
  clearDepartmentFilter() {
    wx.removeStorageSync('selectedDepartment');
    this.setData({
      selectedDepartment: null,
      searchDepId: -1
    });
    this._initData();
  },

  // AI分析卡片交互功能
  toggleWarnings() {
    this.setData({
      warningsExpanded: !this.data.warningsExpanded
    });
  },

  toggleSuggestions() {
    this.setData({
      suggestionsExpanded: !this.data.suggestionsExpanded
    });
  },

  toggleSummary() {
    this.setData({
      summaryExpanded: !this.data.summaryExpanded
    });
  },
  


  toDatePage() {
    
    this.setData({
      update: true,
    })

    wx.navigateTo({
      url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType + '&hanzi=' + this.data.hanzi,
    })
  },

  
  toFilterType() {
    wx.navigateTo({
      url: '../../sel/filterDataType/filterDataType?searchType=mendian',
    })
  },

  delSearch(){
    wx.removeStorageSync('selDepList');
    this.setData({
      searchDepIds: -1,
      searchDepName : ""
    })
    this._initData();

  },
  


  // 点击制作行，显示库存批次
  showOne(e) {
    const itemIndex = e.currentTarget.dataset.itemIndex;
    const dayIndex = e.currentTarget.dataset.dayIndex;
    const key = `${itemIndex}_${dayIndex}`;
    
    
    let expandedRows = { ...this.data.expandedRows };
    // 如果当前行已展开，则关闭；否则展开当前行，保持其他行状态
    if (expandedRows[key]) {
      // 先设置动画状态为收起
      this.setData({ 
        [`expandedRows.${key}`]: 'collapsing'
      });
      
      // 延迟删除，让动画完成
      setTimeout(() => {
        delete expandedRows[key]; 
        this.setData({ 
          expandedRows
        });
      }, 300);
      return;
    }
    
    // 展开当前行，保持其他行状态
    expandedRows[key] = 'stock';
    this.setData({ expandedRows });
    
    // 延迟检查设置后的状态
    setTimeout(() => {
    }, 100);

  },


  toFenxi(e) {
    wx.setStorageSync('disGoods', this.data.disGoods);
    wx.navigateTo({
      url: '../../../../subPackage-goods/pages/goods/goodsFenxiPurchase/goodsFenxiPurchase?disGoodsId=' + id, 

    })
    
  },
  
  toCost(e) {
    wx.setStorageSync('disGoods', this.data.disGoods);   
    wx.navigateTo({
      url: '../../../../subPackage-goods/pages/goods/stockGoodsList/stockGoodsList?disGoodsId=' + this.data.disGoods.gbDistributerGoodsId,
    })

  },


  // 强制触发图表渲染
  forceChartRender() {
    
    // 尝试重新设置图表配置
    if (this.dailyChart) {
      
      const chartData = this.processChartData();
      
      const option = this.getChartOption(chartData);
      
      this.dailyChart.setOption(option, true);
      
      // 再次检查渲染结果
      setTimeout(() => {
      }, 200);
    } else {
      this.initDailyChart();
    }
  },

  // 获取图表配置
  getChartOption(chartData) {
    // 计算数据范围，确保小数值也能显示
    const allValues = [...chartData.produceData, ...chartData.lossData, ...chartData.wasteData];
    const maxValue = allValues.length ? Math.max(...allValues) : 0;
    const positive = allValues.filter(v => v > 0);
    const minValue = positive.length ? Math.min(...positive) : 0;
    
    // 计算堆叠后的总高度
    const totalHeight = chartData.produceData.map((produce, index) => 
      produce + chartData.lossData[index] + chartData.wasteData[index]
    );
    const maxTotalHeight = totalHeight.length ? Math.max(...totalHeight, 0) : 0;
    const rawMax = Math.max(maxTotalHeight, maxValue, 0);
    const yAxisMax = rawMax > 0 ? rawMax * 1.2 : 1;
    
    
    const legendData = ['销售', '损耗', '废弃'];

    const series = [
        {
          name: '销售',
          type: 'bar',
          stack: 'total',
          data: chartData.produceData,
          // 禁用点击
          silent: true,
          itemStyle: {
            color: '#05c0a7'  // 绿色 - 销售
          }
        },
        {
          name: '损耗',
          type: 'bar',
          stack: 'total',
          data: chartData.lossData,
          // 禁用点击
          silent: true,
          itemStyle: {
            color: '#fac858'  // 黄色 - 损耗
          }
        },
        {
          name: '废弃',
          type: 'bar',
          stack: 'total',
          data: chartData.wasteData,
          // 禁用点击
          silent: true,
          itemStyle: {
            color: '#ff6b6b'  // 红色 - 废弃
          }
        }
    ];

    return {
      // title: {
      //   text: '日支出统计',
      //   left: 'center',
      //   textStyle: {
      //     fontSize: 14
      //   }
      // },
      // 禁用图表交互
      silent: true,
      // 禁用tooltip
      tooltip: {
        show: false
      },
      legend: {
        data: legendData,
        bottom: 10,
        // 禁用图例点击
        selectedMode: false
      },
      grid: {
        left: '8%',
        right: '4%',
        bottom: '15%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: chartData.dates,
        axisLabel: {
          rotate: 45,
          fontSize: 10
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: function(value) {
            // 格式化数值，保留最多2位小数
            if (value >= 1000) {
              return (value / 1000).toFixed(1) + 'k';
            } else if (value >= 1) {
              return value.toFixed(1);
            } else if (value > 0) {
              return value.toFixed(2);
            } else {
              return '0';
            }
          }
        },
        minInterval: 0.1, // 设置最小刻度间隔为0.1
        scale: true, // 启用缩放，自动调整Y轴范围
        // 如果有小数值，调整Y轴范围
        min: minValue && maxValue > 0 && minValue < maxValue * 0.1 ? 0 : undefined,
        max: yAxisMax > 0 ? yAxisMax : undefined,
        splitLine: {
          show: true,
          lineStyle: {
            color: '#f0f0f0',
            type: 'dashed'
          }
        }
      },
      series
    };
  },

  // 初始化日支出柱形图
  initDailyChart() {
  
    // 使用selectComponent方式初始化图表
    const that = this;
    that.dailyEchartsComponent = that.selectComponent('#dailyChart');
    if (!that.dailyEchartsComponent) {
      console.error('找不到图表组件');
      return;
    }
    
    // 先获取容器尺寸
    const query = wx.createSelectorQuery().in(that);
    query.select('.chart-container').boundingClientRect((rect) => {
      
      that.dailyEchartsComponent.init((canvas, width, height) => {
        
        // // 强制设置宽度和高度
        const finalWidth = width || (rect ? rect.width * globalData.rpxR : 350);
        const finalHeight = height || 350;
        
        // console.log('=== 最终尺寸计算 ===');
        // console.log('最终尺寸:', { width: finalWidth, height: finalHeight });
        // console.log('rect.width:', rect ? rect.width : '无');
        // console.log('计算宽度:', rect ? rect.width * globalData.rpxR : '使用默认值350');
        
        const Chart = echarts.init(canvas, null, {
          width: finalWidth,
          height: finalHeight,
          devicePixelRatio: globalData.rpxR
        });
        
        
        // 处理数据
        const chartData = that.processChartData();
        
        const option = that.getChartOption(chartData);
        
        Chart.setOption(option);
        
        // 检查图表是否正确渲染
        setTimeout(() => {
        }, 100);
        
        // 保存图表实例
        that.dailyChart = Chart;
        
        that.setData({
          dailyChartDrawn: true
        });
        
        return Chart;
      });
    }).exec();
  },

  // 处理图表数据
  processChartData() {
    const produceList = this.data.produceList || [];
    const lossList = this.data.lossList || [];
    const wasteList = this.data.wasteList || [];
    
    
    // 详细检查数据结构
    if (produceList.length > 0) {
    }
    if (lossList.length > 0) {
    }
    if (wasteList.length > 0) {
    }
    
    // 特别检查14日的数据
    const day14Data = {
      produce: produceList.find(item => item.date && item.date.includes('14')),
      loss: lossList.find(item => item.date && item.date.includes('14')),
      waste: wasteList.find(item => item.date && item.date.includes('14'))
    };
    
    // 日期仅来自 produce / loss / waste（与每条自带的 yyyy-MM-dd 对齐）
    const allDates = new Set();
    [...produceList, ...lossList, ...wasteList].forEach(item => {
      if (item.date) {
        allDates.add(item.date);
      }
    });
    
    const dates = Array.from(allDates).sort();
    
    // 创建数据映射
    const produceMap = {};
    const lossMap = {};
    const wasteMap = {};
    
    produceList.forEach(item => {
      if (item.date) {
        produceMap[item.date] = parseFloat(item.value) || 0;
      }
    });
    
    lossList.forEach(item => {
      if (item.date) {
        lossMap[item.date] = parseFloat(item.value) || 0;
      }
    });
    
    wasteList.forEach(item => {
      if (item.date) {
        wasteMap[item.date] = parseFloat(item.value) || 0;
      }
    });

    // 生成图表数据
    const produceData = dates.map(date => produceMap[date] || 0);
    const lossData = dates.map(date => lossMap[date] || 0);
    const wasteData = dates.map(date => wasteMap[date] || 0);
    
    const result = {
      dates: dates.map(date => {
        // 格式化日期显示，只显示月-日
        const dateObj = new Date(date);
        return `${dateObj.getMonth() + 1}-${dateObj.getDate()}`;
      }),
      produceData,
      lossData,
      wasteData
    };
    
    
    // 特别检查9月18日的数据（图片显示的数据）
    const sep18Index = dates.findIndex(d => d.includes('09-18') || d.includes('9-18'));
    
    // 特别检查9月3日和9月4日的数据
    const sep3Index = dates.findIndex(d => d.includes('09-03'));
    const sep4Index = dates.findIndex(d => d.includes('09-04'));
    
    return result;
  }


})