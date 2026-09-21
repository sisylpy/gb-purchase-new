var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil');
var chartsApi = require('../../../services/api.js');
var config = require('../../../../config/index.js');
var storeRootDepartmentId = require('../../../../lib/storeRootDepartment').storeRootDepartmentId;
var globalData = getApp().globalData;

function numberOrNull(v) { if (v === null || v === undefined || v === '') return null; var n = Number(v); return isNaN(n) ? null : n; }
function num(v) { var n = numberOrNull(v); return n === null ? 0 : n; }
function money(v) { return num(v).toFixed(2); }
function imageUrl(v) { return !v ? '' : (/^https?:\/\//.test(v) ? v : config.server + v); }
function clean(v, fallback) { var s = v == null ? '' : String(v).trim(); return !s || s === 'null' ? (fallback || '') : s; }

Page({
  data: {
    navBarHeight: 0, loading: true, hasData: false, allRows: [], displayRows: [],
    filter: 'PROBLEM', filterLabel: '问题菜品', showAll: false, showHealthRule: false,
    summary: { healthy: 0, low: 0, high: 0, pending: 0, problem: 0 }
  },
  onLoad: function (options) {
    var user = wx.getStorageSync('userInfo') || {}, dis = wx.getStorageSync('disInfo') || {}, dep = wx.getStorageSync('mendianInfo') || {};
    this.setData({ navBarHeight: globalData.navBarHeight * globalData.rpxR, disId: options.disId || dis.gbDistributerId || user.gbDuDistributerId, depFatherId: options.depFatherId || storeRootDepartmentId(dep) || '' });
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
    chartsApi.getGbIngredientAnalysis(req).then(function (res) {
      load.hideLoading(); var body = res && res.result || {};
      if (body.code !== 0) { that.setData({ loading: false, hasData: false }); load.showToast(body.msg || '加载失败'); return; }
      that._apply(body.data || {});
    }).catch(function () { load.hideLoading(); that.setData({ loading: false, hasData: false }); load.showToast('网络异常'); });
  },
  _apply: function (data) {
    var map = {
      IN_BAND: { token: 'healthy', label: '健康菜品', reason: '实际毛利落在目标区间内' },
      BELOW: { token: 'low', label: '毛利偏低', reason: '实际毛利低于目标区间下限' },
      ABOVE: { token: 'high', label: '毛利偏高', reason: '实际毛利高于目标区间上限' },
      UNKNOWN: { token: 'pending', label: '待复核', reason: '数据不足，暂不能判断' }
    };
    var sc = { healthy: 0, low: 0, high: 0, pending: 0 };
    var rows = (data.salesDishRows || []).map(function (x) {
      var m = map[x.grossMarginLevel] || map.UNKNOWN;
      var actual = numberOrNull(x.actualGrossMarginRate);
      var lower = numberOrNull(x.grossMarginStandardBandLower);
      var upper = numberOrNull(x.grossMarginStandardBandUpper);
      var deviation = '—';
      if (actual !== null && lower !== null && upper !== null) {
        var d = actual < lower ? actual - lower : actual > upper ? actual - upper : 0;
        deviation = (d > 0 ? '高于上限 +' : d < 0 ? '低于下限 ' : '区间内 ') + Math.abs(d).toFixed(1) + '%';
      }
      var targetRange = (lower !== null && upper !== null) ? (lower.toFixed(0) + '% ~ ' + upper.toFixed(0) + '%') : '—';
      var reason = m.reason;
      if (m.token === 'pending') {
        reason = x.costFactStatus === 'UNKNOWN'
          ? '缺少可核算的配方成本数据'
          : lower === null || upper === null
            ? '未配置目标毛利率和浮动范围'
            : '成本、收入或目标区间数据不完整';
      }
      sc[m.token]++;
      return Object.assign({}, x, {
        foodId: x.dishId || x.foodId, name: clean(x.dishName, '未命名菜品'), image: imageUrl(x.dishImageLarge || x.dishImage), initial: clean(x.dishName, '菜').slice(0, 1),
        actualMargin: actual === null ? '—' : actual.toFixed(1), targetRange: targetRange,
        status: m.token, statusLabel: m.label, deviation: deviation, reason: reason
      });
    });
    this.setData({ loading: false, hasData: rows.length > 0, allRows: rows, summary: { healthy: sc.healthy, low: sc.low, high: sc.high, pending: sc.pending, problem: sc.low + sc.high + sc.pending } });
    this._filterRows();
  },
  _filterRows: function () {
    var f = this.data.filter, rows = this.data.allRows.filter(function (x) { return f === 'ALL' ? true : f === 'PROBLEM' ? x.status !== 'healthy' : x.status === f; });
    this.setData({ displayRows: this.data.showAll ? rows : rows.slice(0, 3) });
  },
  chooseFilter: function () {
    var that = this, values = ['PROBLEM', 'ALL', 'healthy', 'low', 'high', 'pending'], labels = ['问题菜品', '全部菜品', '健康菜品', '毛利偏低', '毛利偏高', '待复核'];
    wx.showActionSheet({ itemList: labels, success: function (res) { that.setData({ filter: values[res.tapIndex], filterLabel: labels[res.tapIndex], showAll: true }); that._filterRows(); } });
  },
  toggleHealthRule: function () { this.setData({ showHealthRule: true }); },
  closeHealthRule: function () { this.setData({ showHealthRule: false }); },
  stopHealthRuleTap: function () {},
  showAllDishes: function () { this.setData({ filter: 'ALL', filterLabel: '全部菜品', showAll: true }); this._filterRows(); },
  toggleAll: function () { this.setData({ showAll: !this.data.showAll }, this._filterRows.bind(this)); },
  openDetail: function (e) {
    var row = this.data.displayRows[Number(e.currentTarget.dataset.index)]; if (!row) return;
    wx.setStorageSync('foodGoodsFenxiDetailContext', row);
    wx.navigateTo({ url: '../foodGoodsFenxiDetail/foodGoodsFenxiDetail?foodId=' + row.foodId + '&disId=' + this.data.disId + '&depFatherId=' + this.data.depFatherId });
  },
  openFirstDetail: function () { if (this.data.displayRows.length) this.openDetail({ currentTarget: { dataset: { index: 0 } } }); else load.showToast('当前没有可分析菜品'); },
  openDiagnosis: function () {
    var row = this.data.displayRows[0] || this.data.allRows[0]; if (!row) return;
    wx.navigateTo({ url: '/subPackage-mendian/pages/management/foodBusinessDiagnosis/foodBusinessDiagnosis?foodId=' + row.foodId + '&disId=' + this.data.disId + '&depFatherId=' + this.data.depFatherId });
  },
  toDatePage: function () { this.setData({ updateDate: true }); wx.navigateTo({ url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType }); },
  toBack: function () { wx.navigateBack(); }
});
