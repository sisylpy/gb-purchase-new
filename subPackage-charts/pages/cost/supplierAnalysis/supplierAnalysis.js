var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil.js');
var api = require('../../../../services/apiDistributer.js');
var globalData = getApp().globalData;
var ICON_ROOT = '/subPackage-charts/images/purchase/icon_pack/';

function num(value) { var n = Number(value); return isNaN(n) ? 0 : n; }
function money(value) { return num(value).toFixed(1).replace(/\.0$/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function shortDate(value) { var p = String(value || '').split('-'); return p.length === 3 ? Number(p[1]) + '月' + Number(p[2]) + '日' : value; }
function trend(value) { var n = num(value); return { text: (n > 0 ? '+' : '') + n.toFixed(1) + '%', direction: n > 0 ? 'up' : n < 0 ? 'down' : 'stable' }; }

Page({
  data: {
    navBarHeight: 0,
    iconRoot: ICON_ROOT,
    periodKey: 'month',
    loading: true,
    hasData: false,
    suppliers: [],
    summary: {},
    insights: {}
  },

  onLoad: function () {
    var disInfo = wx.getStorageSync('disInfo') || {};
    this.setData({ navBarHeight: globalData.navBarHeight * globalData.rpxR, disId: disInfo.gbDistributerId });
    this._syncDate();
    this._load();
  },

  onShow: function () {
    if (this.data.updateDate) {
      this.setData({ updateDate: false, periodKey: '' });
      this._syncDate();
      this._load();
    }
  },

  onPullDownRefresh: function () { this._load(); },

  _syncDate: function () {
    var saved = wx.getStorageSync('myDate');
    var startDate = dateUtils.getFirstDateInMonth();
    var stopDate = dateUtils.getArriveDate(0);
    var hanzi = '本月';
    if (saved) {
      var range = saved.name === 'custom' ? dateUtils.getDateRange(saved.name, saved.startDate, saved.stopDate) : dateUtils.getDateRange(saved.name);
      startDate = range.startDate; stopDate = range.stopDate; hanzi = saved.hanzi || range.name;
    }
    this.setData({ startDate: startDate, stopDate: stopDate, hanzi: hanzi, dateRangeText: shortDate(startDate) + ' - ' + shortDate(stopDate) });
  },

  selectPeriod: function (e) {
    var key = e.currentTarget.dataset.key;
    var startDate = key === 'thirty' ? dateUtils.getArriveDate(-29) : dateUtils.getFirstDateInMonth();
    var stopDate = dateUtils.getArriveDate(0);
    this.setData({ periodKey: key, startDate: startDate, stopDate: stopDate, hanzi: key === 'thirty' ? '近30天' : '本月', dateRangeText: shortDate(startDate) + ' - ' + shortDate(stopDate) }, this._load.bind(this));
  },

  toDatePage: function () {
    this.setData({ updateDate: true });
    wx.navigateTo({ url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=month' });
  },

  _load: function () {
    var that = this;
    if (!this.data.disId) { load.showToast('缺少分销商信息'); return; }
    this.setData({ loading: true });
    load.showLoading('获取数据中');
    api.getGbSupplierAnalysis({ disId: this.data.disId, startDate: this.data.startDate, stopDate: this.data.stopDate }).then(function (res) {
      load.hideLoading(); wx.stopPullDownRefresh();
      if (!res.result || res.result.code !== 0) { that.setData({ loading: false, hasData: false }); load.showToast((res.result && res.result.msg) || '获取失败'); return; }
      that._apply(res.result.data || {});
    }).catch(function () { load.hideLoading(); wx.stopPullDownRefresh(); that.setData({ loading: false, hasData: false }); load.showToast('网络请求失败'); });
  },

  _apply: function (data) {
    var s = data.summary || {};
    var suppliers = (data.suppliers || []).map(function (item, index) {
      return Object.assign({}, item, {
        rank: index + 1,
        initial: String(item.supplierName || '供').slice(0, 1),
        amountDisplay: money(item.purchaseAmount),
        unsettledDisplay: money(item.unsettledAmount),
        pendingDisplay: money(item.pendingAmount),
        settledDisplay: money(item.settledAmount),
        shareDisplay: num(item.sharePercent).toFixed(1),
        shareWidth: Math.max(5, Math.min(100, num(item.sharePercent)))
      });
    });
    var i = data.insights || {};
    this.setData({
      loading: false,
      hasData: suppliers.length > 0,
      suppliers: suppliers,
      summary: {
        supplierCount: num(s.supplierCount), orderCount: num(s.orderCount),
        unsettledDisplay: money(s.unsettledAmount), settledDisplay: money(s.settledAmount),
        supplierTrend: trend(s.supplierChangePercent), orderTrend: trend(s.orderChangePercent),
        unsettledTrend: trend(s.unsettledChangePercent), settledTrend: trend(s.settledChangePercent)
      },
      insights: { topThree: num(i.topThreeShare).toFixed(1), outstanding: money(i.outstandingAmount), active: num(i.activeSupplierCount) }
    });
  },

  toBack: function () { wx.navigateBack({ delta: 1 }); }
});
