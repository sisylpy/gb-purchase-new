var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil.js');
var config = require('../../../../config/index.js');
var globalData = getApp().globalData;
import { depGeFoodBusiness } from '../../../../services/apiDistributerFood';

function num(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
function money(v) { return num(v).toFixed(2).replace(/\.00$/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function imageUrl(v) { return !v ? '' : (/^https?:\/\//.test(v) ? v : config.server + v); }

Page({
  data: {
    navBarHeight: 0,
    loading: true,
    hasData: false,
    foodRows: [],
    visibleRows: [],
    showAll: false,
    summary: { dishCount: 0, totalSales: 0, totalProfit: '0', attentionCount: 0 }
  },

  onLoad: function (options) {
    var mendian = wx.getStorageSync('mendianInfo') || {};
    var disInfo = wx.getStorageSync('disInfo') || {};
    this.setData({
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      disId: options.disId || disInfo.gbDistributerId,
      depFatherId: options.depFatherId || mendian.gbDepartmentId,
      activeSubDepId: options.subDepId || ''
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
    this.setData({ startDate: startDate, stopDate: stopDate, hanzi: hanzi, dateType: saved ? saved.dateType : 'month' });
  },

  _load: function () {
    var that = this;
    if (!this.data.disId || !this.data.depFatherId) { load.showToast('缺少门店信息'); return; }
    this.setData({ loading: true });
    load.showLoading('加载菜品经营数据');
    depGeFoodBusiness({
      disId: this.data.disId,
      depFatherId: this.data.depFatherId,
      subDepId: this.data.activeSubDepId,
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      sortBy: 'profit',
      sortOrder: 'desc',
      viewMode: 'overview'
    }).then(function (res) {
      load.hideLoading(); wx.stopPullDownRefresh();
      var body = res.result || {};
      if (body.code !== 0) { that.setData({ loading: false, hasData: false }); load.showToast(body.msg || '加载失败'); return; }
      that._apply(body);
    }).catch(function () { load.hideLoading(); wx.stopPullDownRefresh(); that.setData({ loading: false, hasData: false }); load.showToast('网络异常'); });
  },

  _apply: function (body) {
    var rows = (body.data || []).map(function (item, index) {
      var profit = num(item.actualProfit);
      var margin = num(item.grossMarginRate);
      var attention = !!item.needsAttention;
      var tag = index === 0 && profit > 0 ? '利润王' : attention ? '需关注' : margin >= 60 ? '利润稳定' : '经营平稳';
      return Object.assign({}, item, {
        rank: index + 1,
        image: imageUrl(item.foodImageLarge || item.foodImage),
        initial: String(item.foodName || '菜').slice(0, 1),
        profitDisplay: money(profit),
        marginDisplay: margin.toFixed(2),
        tag: tag,
        tagClass: attention ? 'danger' : index === 0 && profit > 0 ? 'king' : 'stable',
        description: item.foodMethod || (attention ? '成本偏高，建议进入诊断查看' : '经营数据稳定，可继续保持')
      });
    });
    var overview = body.businessOverview || {};
    this.setData({
      loading: false,
      hasData: rows.length > 0,
      foodRows: rows,
      visibleRows: this.data.showAll ? rows : rows.slice(0, 5),
      summary: {
        dishCount: num(overview.dishCount),
        totalSales: num(overview.totalSales),
        totalProfit: money(overview.totalActualProfit),
        attentionCount: num(overview.attentionCount)
      }
    });
  },

  toggleAll: function () {
    var show = !this.data.showAll;
    this.setData({ showAll: show, visibleRows: show ? this.data.foodRows : this.data.foodRows.slice(0, 5) });
  },

  toDiagnosis: function (e) {
    var item = e.currentTarget.dataset.item;
    wx.navigateTo({
      url: '../foodBusinessDiagnosis/foodBusinessDiagnosis?foodId=' + item.foodId +
        '&disId=' + this.data.disId + '&depFatherId=' + this.data.depFatherId +
        '&subDepId=' + (this.data.activeSubDepId || '')
    });
  },

  toDatePage: function () {
    this.setData({ updateDate: true });
    wx.navigateTo({ url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType });
  },

  toBack: function () { wx.navigateBack({ delta: 1 }); }
});
