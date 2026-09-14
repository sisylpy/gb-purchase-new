var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil.js');
var config = require('../../../../config/index.js');
var echarts = require('../../../../ec-canvas/echarts');
var globalData = getApp().globalData;
import { getFoodBusinessDiagnosis } from '../../../../services/apiDistributerFood';

var WEEK_KEYS = ['1', '2', '3', '4', '5', '6', '0'];
var WEEK_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
function num(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
function money(v) { return num(v).toFixed(2).replace(/\.00$/, ''); }
function imageUrl(v) { return !v ? '' : (/^https?:\/\//.test(v) ? v : config.server + v); }

Page({
  data: { navBarHeight: 0, loading: true, hasData: false, ecWeek: { lazyLoad: true } },

  onLoad: function (options) {
    this.setData({
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      foodId: Number(options.foodId || 0),
      disId: Number(options.disId || 0),
      depFatherId: Number(options.depFatherId || 0),
      subDepId: options.subDepId || ''
    });
    this._syncDate();
    this._load();
  },

  onShow: function () {
    if (this.data.updateDate) {
      this.setData({ updateDate: false });
      this._syncDate();
      this._load();
    }
  },

  onUnload: function () { if (this.weekChart) this.weekChart.dispose(); },

  _syncDate: function () {
    var saved = wx.getStorageSync('myDate');
    var startDate = dateUtils.getFirstDateInMonth();
    var stopDate = dateUtils.getArriveDate(0);
    var hanzi = '本月';
    if (saved) {
      var range = saved.name === 'custom' ? dateUtils.getDateRange(saved.name, saved.startDate, saved.stopDate) : dateUtils.getDateRange(saved.name);
      startDate = range.startDate; stopDate = range.stopDate; hanzi = saved.hanzi || range.name;
    }
    this.setData({ startDate: startDate, stopDate: stopDate, hanzi: hanzi, dateType: saved ? saved.dateType : 'month' });
  },

  _load: function () {
    var that = this;
    this.setData({ loading: true });
    load.showLoading('加载菜品诊断');
    getFoodBusinessDiagnosis({
      disId: this.data.disId, depFatherId: this.data.depFatherId, foodId: this.data.foodId,
      subDepId: this.data.subDepId, startDate: this.data.startDate, stopDate: this.data.stopDate
    }).then(function (res) {
      load.hideLoading();
      var body = res.result || {};
      if (body.code !== 0) { that.setData({ loading: false, hasData: false }); load.showToast(body.msg || '加载失败'); return; }
      that._apply(body.data || {});
    }).catch(function () { load.hideLoading(); that.setData({ loading: false, hasData: false }); load.showToast('网络异常'); });
  },

  _apply: function (item) {
    var weekday = item.weekdayQty || {};
    var values = WEEK_KEYS.map(function (key) { return num(weekday[key]); });
    var max = Math.max.apply(null, values.concat([0]));
    var peakIndex = values.indexOf(max);
    var positive = values.filter(function (v) { return v > 0; });
    var low = positive.length ? Math.min.apply(null, positive) : 0;
    var lowIndex = values.indexOf(low);
    var profit = num(item.actualProfitAmount);
    var margin = num(item.blendedGrossMarginRateOnListPrice);
    var waste = num(item.wasteLossCostAmount);
    var status = profit < 0 || item.grossMarginLevel === 'BELOW' ? '需重点优化' : margin >= 60 ? '整体表现优秀' : '经营表现平稳';
    this.weekValues = values;
    this.setData({
      loading: false,
      hasData: true,
      food: {
        name: item.foodName || '未命名菜品', price: money(item.foodPrice), image: imageUrl(item.foodImageLarge || item.foodImage),
        method: item.foodMethod || '根据本期销售与成本数据生成诊断', status: status,
        sales: num(item.soldPortionsTotal), revenue: money(item.actualRevenue), profit: money(profit), margin: margin.toFixed(2),
        normalRevenue: money(item.normalSaleAmount), employeeRevenue: money(item.employeeMealAmount), discountRevenue: money(item.discountGiftAmount),
        totalCost: money(item.outboundAllocatedCostAmount), productionCost: money(item.productionOutboundAllocatedCostAmount), wasteCost: money(waste),
        costPer: money(item.outboundAllocatedCostPerPortion), productionPer: money(item.productionOutboundAllocatedCostPerPortion), wastePer: money(item.wasteLossCostPerPortion),
        peakDay: WEEK_NAMES[peakIndex < 0 ? 0 : peakIndex], peakValue: max,
        lowDay: WEEK_NAMES[lowIndex < 0 ? 0 : lowIndex], lowValue: low
      },
      recommendations: [
        { icon: '▥', title: '周末重点备货', text: (peakIndex >= 5 ? WEEK_NAMES[peakIndex] : '高峰日') + '销量最高 ' + max + '份，建议提前备货', tone: 'green' },
        { icon: '⚙', title: '继续保持成本控制', text: '单份成本 ¥' + money(item.outboundAllocatedCostPerPortion) + '，损耗仅 ¥' + money(item.wasteLossCostPerPortion), tone: 'orange' },
        { icon: '◇', title: profit < 0 ? '及时调整售价' : '保持售价稳定', text: '当前单价 ¥' + money(item.foodPrice) + '/份，' + (profit < 0 ? '利润为负需尽快优化' : '利润空间良好'), tone: 'yellow' }
      ]
    }, this._drawWeekChart.bind(this));
  },

  _drawWeekChart: function () {
    var component = this.selectComponent('#weekChart');
    if (!component) return;
    var values = this.weekValues || [], that = this;
    component.init(function (canvas, width, height, dpr) {
      if (that.weekChart) that.weekChart.dispose();
      var chart = echarts.init(canvas, null, { width: width, height: height, devicePixelRatio: dpr });
      that.weekChart = chart;
      chart.setOption({
        grid: { left: 12, right: 12, top: 28, bottom: 8, containLabel: true },
        xAxis: { type: 'category', boundaryGap: false, data: WEEK_NAMES, axisTick: { show: false }, axisLine: { lineStyle: { color: '#d8e5e3' } }, axisLabel: { color: '#66778c', fontSize: 11 } },
        yAxis: { type: 'value', minInterval: 1, splitNumber: 4, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: '#738399', fontSize: 10 }, splitLine: { lineStyle: { type: 'dashed', color: '#e5edeb' } } },
        series: [{ type: 'line', smooth: true, data: values, symbol: 'circle', symbolSize: 7, label: { show: true, color: '#14243b', fontSize: 10 }, lineStyle: { color: '#058f68', width: 3 }, itemStyle: { color: '#058f68' }, areaStyle: { color: 'rgba(39,193,136,.18)' } }]
      });
      return chart;
    });
  },

  toDatePage: function () {
    this.setData({ updateDate: true });
    wx.navigateTo({ url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType });
  },

  toCostProblem: function () {
    wx.setStorageSync('foodCostContext', {
      image: this.data.food && this.data.food.image || '',
      name: this.data.food && this.data.food.name || ''
    });
    wx.navigateTo({
      url: '../costProblemLocation/costProblemLocation?foodId=' + this.data.foodId +
        '&disId=' + this.data.disId + '&depFatherId=' + this.data.depFatherId +
        '&subDepId=' + (this.data.subDepId || '')
    });
  },

  toBack: function () { wx.navigateBack({ delta: 1 }); }
});
