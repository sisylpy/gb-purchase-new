var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil.js');
var config = require('../../../../config/index.js');
var globalData = getApp().globalData;
import { dishIngredientDashboard } from '../../../../services/apiDistributerFood';

function num(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
function money(v) { return num(v).toFixed(2); }
function imageUrl(v) { return !v ? '' : (/^https?:\/\//.test(v) ? v : config.server + v); }
function clean(v, fallback) { var s = v == null ? '' : String(v).trim(); return !s || s === 'null' ? (fallback || '') : s; }

Page({
  data: { navBarHeight: 0, loading: true, hasData: false, ingredients: [] },
  onLoad: function (o) {
    this.context = wx.getStorageSync('foodCostContext') || {};
    this.setData({
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      foodId: Number(o.foodId || 0), disId: Number(o.disId || 0), depFatherId: Number(o.depFatherId || 0)
    });
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
    var that = this; this.setData({ loading: true }); load.showLoading('定位成本问题');
    dishIngredientDashboard({ startDate: this.data.startDate, stopDate: this.data.stopDate, disId: this.data.disId, depFatherId: this.data.depFatherId, foodId: this.data.foodId, trendGranularity: 'month' })
      .then(function (res) { load.hideLoading(); var body = res.result || {}; if (body.code !== 0) { that.setData({ loading: false }); load.showToast(body.msg || '加载失败'); return; } that._apply(body.data || {}); })
      .catch(function () { load.hideLoading(); that.setData({ loading: false }); load.showToast('网络异常'); });
  },
  _apply: function (data) {
    var dish = data.dish || {}, summary = data.dishSummary || {}, rows = (data.consumptionAuditIngredients || []).map(function (x) {
      var theory = num(x.theoryOutboundQty), actual = num(x.actualOutboundQty), diff = actual - theory;
      var usageStatus = x.usageStatus || 'UNKNOWN';
      var abnormal = usageStatus === 'ABNORMAL', unknown = usageStatus === 'UNKNOWN';
      var devPct = x.usageDeviationPercent != null ? x.usageDeviationPercent : null;
      var rateText = abnormal ? ('↗ 超出 ' + (devPct != null ? devPct : '—') + '%') : unknown ? '⚠ 数据不足' : '✓ 基本一致';
      var reason = clean(x.suggestionZh, abnormal ? '出库分摊与配方理论存在差异，建议进一步排查' : '用量在合理范围内');
      return Object.assign({}, x, {
        image: imageUrl(x.goodsImage), difference: money(diff), diffRate: devPct != null ? devPct : '—',
        theoryDisplay: money(theory), actualDisplay: money(actual), allocatedCost: money(x.selectedDishAllocatedCost || x.actualOutboundAmount),
        issue: abnormal, status: abnormal ? '需关注' : unknown ? '待确认' : '正常', rateText: rateText, reason: reason
      });
    }).sort(function (a, b) { return num(b.allocatedCost) - num(a.allocatedCost); });
    var maxQty = 1; rows.forEach(function (x) { maxQty = Math.max(maxQty, num(x.theoryOutboundQty), num(x.actualOutboundQty)); });
    rows.forEach(function (x, i) { x.rank = i + 1; x.theoryWidth = Math.max(3, num(x.theoryOutboundQty) * 100 / maxQty); x.actualWidth = Math.max(3, num(x.actualOutboundQty) * 100 / maxQty); });
    var sales = num(dish.salesPortions), cost = num(dish.outboundAllocatedCostPerPortion) * sales, revenue = num(dish.salesAmount);
    this.setData({ loading: false, hasData: true, dish: { name: clean(dish.foodName, this.context.name || '未命名菜品'), image: this.context.image || '', price: money(dish.listPricePerPortion), sales: sales, profit: money(revenue - cost), margin: money(dish.blendedGrossMarginRateOnListPrice), priority: rows.length ? rows[0].goodsName : '暂无' }, ingredients: rows });
  },
  toIngredient: function (e) {
    var item = this.data.ingredients[Number(e.currentTarget.dataset.index)]; if (!item) return;
    wx.setStorageSync('ingredientCostContext', { foodImage: this.data.dish.image, foodName: this.data.dish.name, ingredient: item });
    wx.navigateTo({ url: '../ingredientCostDetail/ingredientCostDetail?foodId=' + this.data.foodId + '&goodsId=' + item.goodsId + '&disId=' + this.data.disId + '&depFatherId=' + this.data.depFatherId });
  },
  toPriorityIngredient: function () { if (this.data.ingredients.length) this.toIngredient({ currentTarget: { dataset: { index: 0 } } }); },
  toDatePage: function () { this.setData({ updateDate: true }); wx.navigateTo({ url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType }); },
  toBack: function () { wx.navigateBack(); }
});
