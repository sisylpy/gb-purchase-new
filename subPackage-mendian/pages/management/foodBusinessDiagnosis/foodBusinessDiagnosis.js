var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil.js');
var config = require('../../../../config/index.js');
var echarts = require('../../../../ec-canvas/echarts');
var globalData = getApp().globalData;
import { getFoodBusinessDiagnosis } from '../../../../services/apiDistributerFood';

var WEEK_KEYS = ['1', '2', '3', '4', '5', '6', '0'];
var WEEK_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
function num(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
function numberOrNull(v) { if (v === null || v === undefined || v === '') return null; var n = Number(v); return isNaN(n) ? null : n; }
function money(v) { return num(v).toFixed(2).replace(/\.00$/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function imageUrl(v) { return !v ? '' : (/^https?:\/\//.test(v) ? v : config.server + v); }

Page({
  data: { navBarHeight: 0, loading: true, hasData: false, ecWeek: { lazyLoad: true } },

  onLoad: function (options) {
    this.setData({
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      foodId: Number(options.foodId || 0),
      disId: Number(options.disId || 0),
      depFatherId: Number(options.depFatherId || 0)
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
      startDate: this.data.startDate, stopDate: this.data.stopDate
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
    var margin = numberOrNull(item.blendedGrossMarginRateOnListPrice);
    var target = numberOrNull(item.grossMarginStandardTarget);
    var floatAbs = numberOrNull(item.grossMarginStandardFloatAbs);
    var lower = numberOrNull(item.grossMarginStandardBandLower);
    var upper = numberOrNull(item.grossMarginStandardBandUpper);
    if ((lower === null || upper === null) && target !== null && floatAbs !== null) {
      lower = target - floatAbs;
      upper = target + floatAbs;
    }
    var waste = num(item.wasteLossCostAmount);
    var diag = item.businessDiagnosis || {};
    var tone = 'pending';
    var status = '数据待复核';
    var deviationLabel = '暂无偏离值';
    var deviationValue = '—';
    var conclusion = '当前毛利或目标区间数据不完整，建议先完善成本与目标设置。';
    if (margin !== null && lower !== null && upper !== null) {
      if (margin > upper) {
        tone = 'high'; status = '毛利高于目标区间'; deviationLabel = '高于上限';
        deviationValue = '+' + (margin - upper).toFixed(1) + '%';
        conclusion = '当前毛利率明显高于目标区间，优先关注成本采集、配料分摊与损耗记录。';
      } else if (margin < lower) {
        tone = 'low'; status = '毛利低于目标区间'; deviationLabel = '低于下限';
        deviationValue = '-' + (lower - margin).toFixed(1) + '%';
        conclusion = '当前毛利率低于目标区间，建议核查售价、采购成本和配料用量。';
      } else {
        tone = 'healthy'; status = '毛利处于目标区间'; deviationLabel = '目标区间内'; deviationValue = '0.0%';
        conclusion = '当前毛利率处于目标区间，继续保持售价与成本控制。';
      }
    }
    var price = num(item.foodPrice);
    var sales = num(item.soldPortionsTotal);
    var totalCost = num(item.outboundAllocatedCostAmount);
    var listRevenue = price * sales;
    var employeeMealQty = num(item.employeeMealQty);
    var employeeRevenue = num(item.employeeMealAmount);
    var employeeMealConcession = Math.max(0, price * employeeMealQty - employeeRevenue);
    var discountConcession = Math.max(0, listRevenue - num(item.actualRevenue) - employeeMealConcession);
    var targetRange = lower !== null && upper !== null ? lower.toFixed(0) + '% ~ ' + upper.toFixed(0) + '%' : '—';
    this.weekValues = values;
    this.setData({
      loading: false,
      hasData: true,
      food: {
        name: item.foodName || '未命名菜品', price: money(price), image: imageUrl(item.foodImageLarge || item.foodImage),
        method: item.foodMethod || '从经营结果到成本结构，快速看清这道菜为什么赚钱', status: status, tone: tone,
        sales: sales, revenue: money(item.actualRevenue), listRevenue: money(listRevenue), profit: money(profit), margin: margin === null ? '—' : margin.toFixed(2),
        targetRange: targetRange, deviationLabel: deviationLabel, deviationValue: deviationValue, conclusion: conclusion,
        normalRevenue: money(item.normalSaleAmount), employeeRevenue: money(employeeRevenue),
        employeeMealQty: employeeMealQty, employeeMealConcession: money(employeeMealConcession),
        employeeMealCostText: item.employeeMealCostAmount == null ? '—' : '¥' + money(item.employeeMealCostAmount),
        discountRevenue: money(item.discountGiftAmount), discountConcession: money(discountConcession),
        totalCost: money(totalCost), productionCost: money(item.productionOutboundAllocatedCostAmount), wasteCost: money(waste),
        costPer: money(item.outboundAllocatedCostPerPortion), productionPer: money(item.productionOutboundAllocatedCostPerPortion), wastePer: money(item.wasteLossCostPerPortion),
        peakDay: WEEK_NAMES[peakIndex < 0 ? 0 : peakIndex], peakValue: max,
        lowDay: WEEK_NAMES[lowIndex < 0 ? 0 : lowIndex], lowValue: low
      },
      recommendations: [
        { icon: '▥', title: '周末重点备货', text: (peakIndex >= 5 ? WEEK_NAMES[peakIndex] : '高峰日') + '销量最高 ' + max + '份，建议提前备货', tone: 'green' },
        { icon: '⚙', title: '继续保持成本控制', text: '单份成本 ¥' + money(item.outboundAllocatedCostPerPortion) + '，损耗仅 ¥' + money(item.wasteLossCostPerPortion), tone: 'orange' },
        { icon: '◇', title: diag.title || '经营诊断建议', text: diag.message || conclusion, tone: diag.level === 'WARN' ? 'yellow' : 'green' }
      ]
    }, this._scheduleWeekChart.bind(this));
  },

  _scheduleWeekChart: function () {
    var that = this;
    wx.nextTick(function () {
      setTimeout(function () { that._drawWeekChart(0); }, 100);
    });
  },

  _drawWeekChart: function (attempt) {
    var component = this.selectComponent('#weekChart');
    if (!component) {
      if (attempt < 3) {
        var thatPage = this;
        setTimeout(function () { thatPage._drawWeekChart(attempt + 1); }, 180);
      }
      return;
    }
    var values = this.weekValues || [], that = this;
    component.init(function (canvas, width, height, dpr) {
      if (that.weekChart) that.weekChart.dispose();
      var chart = echarts.init(canvas, null, { width: width, height: height, devicePixelRatio: dpr });
      that.weekChart = chart;
      chart.setOption({
        grid: { left: 12, right: 12, top: 28, bottom: 8, containLabel: true },
        xAxis: { type: 'category', boundaryGap: false, data: WEEK_NAMES, axisTick: { show: false }, axisLine: { lineStyle: { color: '#d8e5e3' } }, axisLabel: { color: '#66778c', fontSize: 13 } },
        yAxis: { type: 'value', minInterval: 1, splitNumber: 4, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: '#738399', fontSize: 12 }, splitLine: { lineStyle: { type: 'dashed', color: '#e5edeb' } } },
        series: [{ type: 'line', smooth: true, data: values, symbol: 'circle', symbolSize: 7, label: { show: true, color: '#14243b', fontSize: 12 }, lineStyle: { color: '#058f68', width: 3 }, itemStyle: { color: '#058f68' }, areaStyle: { color: 'rgba(39,193,136,.18)' } }]
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
        '&disId=' + this.data.disId + '&depFatherId=' + this.data.depFatherId
    });
  },

  toBack: function () { wx.navigateBack({ delta: 1 }); }
});
