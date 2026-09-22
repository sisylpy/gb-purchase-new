var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil.js');
var config = require('../../../../config/index.js');
var globalData = getApp().globalData;
import { dishIngredientDashboard } from '../../../../services/apiDistributerFood';

function num(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
function numberOrNull(v) { if (v === null || v === undefined || v === '') return null; var n = Number(v); return isNaN(n) ? null : n; }
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
    var dish = data.dish || {};
    var rows = (data.consumptionAuditIngredients || []).map(function (x) {
      var theory = num(x.theoryOutboundQty), actual = num(x.actualOutboundQty), diff = actual - theory;
      var usageStatus = x.usageStatus || 'UNKNOWN';
      var abnormal = usageStatus === 'ABNORMAL', unknown = usageStatus === 'UNKNOWN';
      var devPct = x.usageDeviationPercent != null ? x.usageDeviationPercent : null;
      var reason = clean(x.suggestionZh, abnormal ? '出库分摊与配方理论存在差异，建议进一步排查' : '用量在合理范围内');
      var allocatedCost = num(x.selectedDishAllocatedCost || x.actualOutboundAmount);
      var rowMax = Math.max(theory, actual, 0);
      return Object.assign({}, x, {
        image: imageUrl(x.goodsImage), differenceValue: diff, difference: (diff > 0 ? '+' : '') + money(diff),
        absDifference: Math.abs(diff), diffRate: devPct != null ? devPct : '—',
        theoryDisplay: money(theory), actualDisplay: money(actual), allocatedCostValue: allocatedCost, allocatedCost: money(allocatedCost),
        issue: abnormal || unknown, unknown: unknown, status: abnormal ? '需关注' : unknown ? '待核查' : '正常', reason: reason,
        theoryWidth: rowMax > 0 && theory > 0 ? Math.max(5, theory * 100 / rowMax) : 0,
        actualWidth: rowMax > 0 && actual > 0 ? Math.max(5, actual * 100 / rowMax) : 0
      });
    }).sort(function (a, b) { return b.allocatedCostValue - a.allocatedCostValue; });

    var issueRows = rows.filter(function (x) { return x.issue; });
    var maxDifferenceRow = rows.slice().sort(function (a, b) { return b.absDifference - a.absDifference; })[0] || null;
    var primaryIssueIndex = -1;
    for (var issueIndex = 0; issueIndex < rows.length; issueIndex++) {
      if (rows[issueIndex].issue) { primaryIssueIndex = issueIndex; break; }
    }
    rows.forEach(function (x, i) {
      var primaryIssue = i === primaryIssueIndex;
      x.rank = i + 1;
      x.badgeTone = primaryIssue ? 'priority' : x.unknown ? 'pending' : x.issue ? 'attention' : 'normal';
      x.status = primaryIssue ? '优先关注' : x.unknown ? '待核查' : x.issue ? '待核查' : '正常';
      x.impactText = primaryIssue
        ? (x.differenceValue < 0 ? '影响毛利偏高的主要原因' : '影响毛利偏低的主要原因')
        : x.unknown ? '需要补充数据后确认' : x.issue ? '影响程度　中' : '成本影响正常';
    });

    var sales = num(dish.salesPortions), cost = num(dish.outboundAllocatedCostPerPortion) * sales, revenue = num(dish.salesAmount);
    var margin = numberOrNull(dish.blendedGrossMarginRateOnListPrice);
    var lower = numberOrNull(dish.grossMarginStandardBandLower), upper = numberOrNull(dish.grossMarginStandardBandUpper);
    var marginStatus = '成本结构待核查', marginTone = 'pending';
    if (margin !== null && lower !== null && upper !== null) {
      if (margin > upper) { marginStatus = '毛利高于目标区间'; marginTone = 'high'; }
      else if (margin < lower) { marginStatus = '毛利低于目标区间'; marginTone = 'low'; }
      else { marginStatus = '毛利处于目标区间'; marginTone = 'normal'; }
    } else if (issueRows.length) {
      marginStatus = '成本分摊需关注'; marginTone = 'high';
    }
    var warningNames = issueRows.slice(0, 3).map(function (x) { return x.goodsName; }).join('、');
    var warningText = issueRows.length
      ? warningNames + '存在理论用量与实际分摊差异，可能影响当前成本与毛利判断，建议优先核查。'
      : '本期配料理论用量与实际分摊整体一致，继续保持当前出品和盘点节奏。';
    var primary = rows[0] || {};
    this.setData({
      loading: false,
      hasData: true,
      dish: {
        name: clean(dish.foodName, this.context.name || '未命名菜品'), image: this.context.image || '',
        price: money(dish.listPricePerPortion), sales: sales, profit: money(revenue - cost),
        margin: margin === null ? '—' : margin.toFixed(2), marginStatus: marginStatus, marginTone: marginTone
      },
      overview: {
        issueCount: issueRows.length,
        maxGoods: maxDifferenceRow ? maxDifferenceRow.goodsName : '暂无',
        maxDifference: maxDifferenceRow ? maxDifferenceRow.difference : '0.00',
        maxDifferenceUnit: maxDifferenceRow ? maxDifferenceRow.unit : '',
        mainCost: primary.goodsName ? primary.allocatedCost : '0.00'
      },
      warningText: warningText,
      warningTone: issueRows.length ? 'warning' : 'healthy',
      ingredients: rows,
      recommendations: [
        { icon: '▣', title: '核对BOM用量', text: '检查主料标准用量是否正确', tone: 'green' },
        { icon: '◆', title: '补录分摊记录', text: '核对领料、出库与分摊数据', tone: 'blue' },
        { icon: '◇', title: '复核采购与出库', text: '确认成本采集链路是否完整', tone: 'orange' }
      ]
    });
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
