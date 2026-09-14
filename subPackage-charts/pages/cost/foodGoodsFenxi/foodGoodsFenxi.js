var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil');
var chartsApi = require('../../../services/api.js');
var config = require('../../../../config/index.js');
var globalData = getApp().globalData;

function numberOrNull(v) { if (v === null || v === undefined || v === '') return null; var n = Number(v); return isNaN(n) ? null : n; }
function num(v) { var n = numberOrNull(v); return n === null ? 0 : n; }
function money(v) { return num(v).toFixed(2); }
function imageUrl(v) { return !v ? '' : (/^https?:\/\//.test(v) ? v : config.server + v); }
function clean(v, fallback) { var s = v == null ? '' : String(v).trim(); return !s || s === 'null' ? (fallback || '') : s; }

Page({
  data: {
    navBarHeight: 0, loading: true, hasData: false, allRows: [], displayRows: [],
    filter: 'PROBLEM', filterLabel: '问题菜品', showAll: false,
    summary: { healthy: 0, low: 0, high: 0, pending: 0, problem: 0 },
    rule: { target: '80.0', float: '5.0', lower: '75.0', upper: '85.0' }
  },
  onLoad: function (options) {
    var user = wx.getStorageSync('userInfo') || {}, dis = wx.getStorageSync('disInfo') || {}, dep = wx.getStorageSync('mendianInfo') || {};
    this.setData({ navBarHeight: globalData.navBarHeight * globalData.rpxR, disId: options.disId || dis.gbDistributerId || user.gbDuDistributerId, depFatherId: options.depFatherId || dep.gbDepartmentId, subDepId: options.subDepId || '' });
    this._syncDate(); this._load();
  },
  onShow: function () { if (this.data.updateDate) { this.setData({ updateDate: false }); this._syncDate(); this._load(); } },
  _syncDate: function () {
    var saved = wx.getStorageSync('myDate'), range;
    if (saved) range = saved.name === 'custom' ? dateUtils.getDateRange(saved.name, saved.startDate, saved.stopDate) : dateUtils.getDateRange(saved.name);
    else range = { startDate: dateUtils.getFirstDateInMonth(), stopDate: dateUtils.getArriveDate(0), name: '本月' };
    this.setData({ startDate: range.startDate, stopDate: range.stopDate, hanzi: saved && saved.hanzi || range.name || '本月', dateType: saved ? saved.dateType : 'month' });
  },
  _load: function () {
    var that = this;
    if (!this.data.disId || !this.data.depFatherId) { this.setData({ loading: false }); load.showToast('缺少门店信息'); return; }
    this.setData({ loading: true }); load.showLoading('加载菜品分析');
    var req = { startDate: this.data.startDate, stopDate: this.data.stopDate, disId: this.data.disId, depFatherId: this.data.depFatherId, sortBy: 'sales', sortOrder: 'desc' };
    if (this.data.subDepId) req.subDepId = this.data.subDepId;
    chartsApi.getGbIngredientAnalysis(req).then(function (res) {
      load.hideLoading(); var body = res && res.result || {};
      if (body.code !== 0) { that.setData({ loading: false, hasData: false }); load.showToast(body.msg || '加载失败'); return; }
      that._apply(body.data || {});
    }).catch(function () { load.hideLoading(); that.setData({ loading: false, hasData: false }); load.showToast('网络异常'); });
  },
  _apply: function (data) {
    var count = { HEALTHY: 0, LOW: 0, HIGH: 0, PENDING: 0 }, targetTotal = 0, floatTotal = 0, configured = 0;
    var rows = (data.salesDishRows || []).map(function (x) {
      var target = numberOrNull(x.targetGrossMarginRate), floating = numberOrNull(x.grossMarginFloatAbs);
      target = target === null ? 80 : target; floating = floating === null || floating <= 0 ? 5 : floating;
      var actual = numberOrNull(x.actualGrossMarginRate), salesAmount = num(x.salesAmount), actualCost = num(x.outboundAllocatedCostAmount);
      if (actual === null && salesAmount > 0) actual = (salesAmount - actualCost) * 100 / salesAmount;
      var lower = target - floating, upper = target + floating, status;
      if (actual === null || num(x.ingredientCount) === 0) status = 'PENDING';
      else if (actual < lower) status = 'LOW'; else if (actual > upper) status = 'HIGH'; else status = 'HEALTHY';
      count[status]++; targetTotal += target; floatTotal += floating; configured++;
      var labels = { HEALTHY: '健康菜品', LOW: '毛利偏低', HIGH: '毛利偏高', PENDING: '待复核' };
      var deviation = actual === null ? null : actual < lower ? actual - lower : actual > upper ? actual - upper : 0;
      var reason = status === 'LOW' ? '成本偏高或售价偏低' : status === 'HIGH' ? '售价偏高或成本采集偏低' : status === 'PENDING' ? '成本采集待确认' : '落在目标毛利率区间内';
      return Object.assign({}, x, { foodId: x.dishId || x.foodId, name: clean(x.dishName, '未命名菜品'), image: imageUrl(x.dishImageLarge || x.dishImage), initial: clean(x.dishName, '菜').slice(0, 1), actualMargin: actual === null ? '—' : actual.toFixed(1), targetRange: lower.toFixed(0) + '% ~ ' + upper.toFixed(0) + '%', status: status, statusLabel: labels[status], deviation: deviation === null ? '—' : (deviation > 0 ? '高于上限 ' : deviation < 0 ? '低于下限 ' : '区间内 ') + Math.abs(deviation).toFixed(1) + '%', reason: reason });
    });
    var targetAvg = configured ? targetTotal / configured : 80, floatAvg = configured ? floatTotal / configured : 5;
    this.setData({ loading: false, hasData: rows.length > 0, allRows: rows, summary: { healthy: count.HEALTHY, low: count.LOW, high: count.HIGH, pending: count.PENDING, problem: count.LOW + count.HIGH + count.PENDING }, rule: { target: targetAvg.toFixed(1), float: floatAvg.toFixed(1), lower: (targetAvg - floatAvg).toFixed(1), upper: (targetAvg + floatAvg).toFixed(1) } });
    this._filterRows();
  },
  _filterRows: function () {
    var f = this.data.filter, rows = this.data.allRows.filter(function (x) { return f === 'ALL' ? true : f === 'PROBLEM' ? x.status !== 'HEALTHY' : x.status === f; });
    this.setData({ displayRows: this.data.showAll ? rows : rows.slice(0, 3) });
  },
  chooseFilter: function () {
    var that = this, values = ['PROBLEM', 'ALL', 'HEALTHY', 'LOW', 'HIGH', 'PENDING'], labels = ['问题菜品', '全部菜品', '健康菜品', '毛利偏低', '毛利偏高', '待复核'];
    wx.showActionSheet({ itemList: labels, success: function (res) { that.setData({ filter: values[res.tapIndex], filterLabel: labels[res.tapIndex], showAll: true }); that._filterRows(); } });
  },
  showAllDishes: function () { this.setData({ filter: 'ALL', filterLabel: '全部菜品', showAll: true }); this._filterRows(); },
  toggleAll: function () { this.setData({ showAll: !this.data.showAll }, this._filterRows.bind(this)); },
  openDetail: function (e) {
    var row = this.data.displayRows[Number(e.currentTarget.dataset.index)]; if (!row) return;
    wx.setStorageSync('foodGoodsFenxiDetailContext', row);
    wx.navigateTo({ url: '../foodGoodsFenxiDetail/foodGoodsFenxiDetail?foodId=' + row.foodId + '&disId=' + this.data.disId + '&depFatherId=' + this.data.depFatherId + '&subDepId=' + (this.data.subDepId || '') });
  },
  openFirstDetail: function () { if (this.data.displayRows.length) this.openDetail({ currentTarget: { dataset: { index: 0 } } }); else load.showToast('当前没有可分析菜品'); },
  openDiagnosis: function () {
    var row = this.data.displayRows[0] || this.data.allRows[0]; if (!row) return;
    wx.navigateTo({ url: '/subPackage-mendian/pages/management/foodBusinessDiagnosis/foodBusinessDiagnosis?foodId=' + row.foodId + '&disId=' + this.data.disId + '&depFatherId=' + this.data.depFatherId + '&subDepId=' + (this.data.subDepId || '') });
  },
  toDatePage: function () { this.setData({ updateDate: true }); wx.navigateTo({ url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType }); },
  toBack: function () { wx.navigateBack(); }
});
