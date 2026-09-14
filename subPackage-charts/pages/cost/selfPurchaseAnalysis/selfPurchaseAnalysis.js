var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil.js');
var apiDistributer = require('../../../../services/apiDistributer.js');
var apiUrl = require('../../../../config/index.js');
var echarts = require('../../../../ec-canvas/echarts.js');
var globalData = getApp().globalData;

var COLORS = ['#31c88b', '#ffbd34', '#ff8d91', '#64a7ff', '#a68cf6', '#77d4c4'];
var ICON_ROOT = '/subPackage-charts/images/purchase/icon_pack/';

function num(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
function money(v) { return num(v).toFixed(1).replace(/\.0$/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function shortDate(v) { var p = String(v || '').split('-'); return p.length === 3 ? Number(p[1]) + '月' + Number(p[2]) + '日' : v; }
function imageUrl(v) { if (!v) return ''; return /^https?:\/\//.test(v) ? v : apiUrl.server + v; }
function trend(v) { if (v === null || v === undefined) return { text: '--', direction: 'flat' }; var n = num(v); return { text: (n > 0 ? '+' : '') + n.toFixed(1) + '%', direction: n > 0 ? 'up' : (n < 0 ? 'down' : 'flat') }; }

Page({
  data: {
    navBarHeight: 0,
    iconRoot: ICON_ROOT,
    bannerUrl: 'https://grainservice.club/uploadImage/self-purchase-analysis-banner.png?v=2',
    loading: true,
    hasData: false,
    dateType: 'month',
    periodKey: 'month',
    departmentIndex: 0,
    departmentList: [{ gbDepartmentId: 0, gbDepartmentName: '全部门店' }],
    departmentNames: ['全部门店'],
    metric: 'amount',
    ecTrend: { lazyLoad: true },
    ecCategory: { lazyLoad: true },
    summary: {},
    purchasers: [],
    categories: [],
    tips: []
  },

  onLoad: function () {
    var disInfo = wx.getStorageSync('disInfo') || {};
    var departments = [{ gbDepartmentId: 0, gbDepartmentName: '全部门店' }].concat(disInfo.gbDepartmentEntityList || []);
    this.setData({
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      disId: disInfo.gbDistributerId,
      departmentList: departments,
      departmentNames: departments.map(function (d) { return d.gbDepartmentName; })
    });
    this._syncDate();
    this._load();
  },

  onShow: function () {
    if (this.data.updateDate) { this.setData({ updateDate: false, periodKey: 'custom' }); this._syncDate(); this._load(); }
  },

  onPullDownRefresh: function () { this._load(); },

  _syncDate: function () {
    var myDate = wx.getStorageSync('myDate');
    var startDate = dateUtils.getFirstDateInMonth();
    var stopDate = dateUtils.getArriveDate(0);
    var hanzi = '本月';
    if (myDate) {
      var range = myDate.name === 'custom' ? dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate) : dateUtils.getDateRange(myDate.name);
      startDate = range.startDate; stopDate = range.stopDate; hanzi = myDate.hanzi || range.name;
    }
    this.setData({ startDate: startDate, stopDate: stopDate, hanzi: hanzi, dateRangeText: shortDate(startDate) + ' - ' + shortDate(stopDate) });
  },

  selectPeriod: function (e) {
    var key = e.currentTarget.dataset.key;
    var startDate = key === 'week' ? dateUtils.getArriveDate(-6) : dateUtils.getFirstDateInMonth();
    var stopDate = dateUtils.getArriveDate(0);
    this.setData({ periodKey: key, startDate: startDate, stopDate: stopDate, hanzi: key === 'week' ? '近7天' : '本月', dateRangeText: shortDate(startDate) + ' - ' + shortDate(stopDate) });
    this._load();
  },

  toDatePage: function () {
    this.setData({ updateDate: true });
    wx.navigateTo({ url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType });
  },

  changeDepartment: function (e) {
    this.setData({ departmentIndex: Number(e.detail.value) });
    this._load();
  },

  switchMetric: function (e) {
    this.setData({ metric: e.currentTarget.dataset.metric }, this._drawTrend.bind(this));
  },

  _load: function () {
    var that = this;
    if (!this.data.disId) { load.showToast('缺少分销商信息'); return; }
    var dep = this.data.departmentList[this.data.departmentIndex] || {};
    this.setData({ loading: true });
    load.showLoading('获取数据中');
    apiDistributer.getGbSelfPurchaseAnalysis({ disId: this.data.disId, startDate: this.data.startDate, stopDate: this.data.stopDate, purDepId: dep.gbDepartmentId || '' })
      .then(function (res) {
        load.hideLoading(); wx.stopPullDownRefresh();
        if (!res.result || res.result.code !== 0) { that.setData({ loading: false, hasData: false }); load.showToast((res.result && res.result.msg) || '获取失败'); return; }
        that._apply(res.result.data || {});
      }).catch(function () { load.hideLoading(); wx.stopPullDownRefresh(); that.setData({ loading: false, hasData: false }); load.showToast('网络请求失败'); });
  },

  _apply: function (data) {
    var s = data.summary || {};
    var amount = num(s.selfPurchaseAmount);
    var purchasers = (data.purchaserDistribution || []).map(function (x, i) {
      return Object.assign({}, x, { amountDisplay: money(x.amount), percentDisplay: num(x.percent).toFixed(1), rank: i + 1, barWidth: Math.max(6, num(x.percent)), avatar: imageUrl(x.avatarUrl), initial: String(x.purUserName || '采').slice(0, 1), color: COLORS[i % COLORS.length] });
    });
    var categories = (data.categoryStructure || []).map(function (x, i) {
      return Object.assign({}, x, { amountDisplay: money(x.amount), percentDisplay: num(x.percent).toFixed(1), image: imageUrl(x.categoryImage), color: COLORS[i % COLORS.length] });
    });
    var tips = (data.tips || []).map(function (x) { return Object.assign({}, x, { dayValue: x.type === 'peakDay' ? shortDate(x.value) : x.value }); });
    this.setData({
      loading: false, hasData: amount > 0, dailyTrend: data.dailyTrend || [], purchasers: purchasers, categories: categories, tips: tips,
      summary: {
        amountDisplay: money(amount), purchaseCount: num(s.purchaseCount), purchaserCount: num(s.purchaserCount), averageDisplay: money(s.averagePurchaseAmount),
        amountTrend: trend(s.amountChangePercent), countTrend: trend(s.countChangePercent), purchaserTrend: trend(s.purchaserChangePercent), averageTrend: trend(s.averageChangePercent)
      }
    }, function () { this._drawTrend(); this._drawCategory(); }.bind(this));
  },

  _drawTrend: function () {
    var component = this.selectComponent('#trendChart'); if (!component || !this.data.hasData) return;
    var rows = this.data.dailyTrend || [], metric = this.data.metric, that = this;
    component.init(function (canvas, width, height, dpr) {
      if (that.trendChart) that.trendChart.dispose();
      var chart = echarts.init(canvas, null, { width: width, height: height, devicePixelRatio: dpr }); that.trendChart = chart;
      chart.setOption({ grid: { left: 8, right: 10, top: 25, bottom: 8, containLabel: true }, xAxis: { type: 'category', boundaryGap: false, data: rows.map(function (x) { var p = String(x.day).split('-'); return Number(p[1]) + '/' + Number(p[2]); }), axisLine: { lineStyle: { color: '#dbe7e4' } }, axisTick: { show: false }, axisLabel: { color: '#8493a8', fontSize: 10 } }, yAxis: { type: 'value', splitNumber: 3, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#8493a8', fontSize: 10 }, splitLine: { lineStyle: { color: '#edf4f2' } } }, series: [{ type: 'line', smooth: true, symbol: 'circle', symbolSize: 7, data: rows.map(function (x) { return num(metric === 'amount' ? x.amount : x.purchaseCount); }), lineStyle: { color: '#12b979', width: 3 }, itemStyle: { color: '#fff', borderColor: '#12b979', borderWidth: 2 }, areaStyle: { color: 'rgba(49,200,139,.18)' } }] });
      return chart;
    });
  },

  _drawCategory: function () {
    var component = this.selectComponent('#categoryChart'); if (!component || !this.data.hasData) return;
    var rows = this.data.categories || [], total = this.data.summary.amountDisplay, that = this;
    component.init(function (canvas, width, height, dpr) {
      if (that.categoryChart) that.categoryChart.dispose();
      var chart = echarts.init(canvas, null, { width: width, height: height, devicePixelRatio: dpr }); that.categoryChart = chart;
      chart.setOption({ title: { text: '￥' + total, subtext: '自采金额', left: 'center', top: '35%', textStyle: { fontSize: 15, color: '#14233d' }, subtextStyle: { fontSize: 10, color: '#8290a4' } }, color: COLORS, series: [{ type: 'pie', radius: ['57%', '78%'], center: ['50%', '50%'], silent: true, label: { show: false }, data: rows.map(function (x) { return { name: x.categoryName, value: num(x.amount) }; }) }] });
      return chart;
    });
  },

  toCategoryDetail: function (e) {
    wx.navigateTo({
      url: '/subPackage-charts/pages/cost/purchaseCategoryDetail/purchaseCategoryDetail?categoryId=' + e.currentTarget.dataset.id
    });
  },

  toBack: function () { wx.navigateBack({ delta: 1 }); }
});
