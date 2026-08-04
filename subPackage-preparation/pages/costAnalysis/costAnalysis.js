var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');

function monthStart() {
  return util.localDate().slice(0, 8) + '01';
}

Page({
  data: {
    navBarHeight: 0,
    loading: true,
    analyzing: false,
    foods: [],
    filteredFoods: [],
    foodIndex: -1,
    foodKeyword: '',
    showFoodPicker: false,
    startDate: '',
    endDate: '',
    analysis: null,
    evidence: null,
    showEvidence: false,
  },
  onLoad: function () {
    this.identity = util.getIdentity();
    this.departmentId = Number(wx.getStorageSync('preparationDepartmentId'));
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      startDate: monthStart(),
      endDate: util.localDate(),
    });
    this.loadFoods();
  },
  loadFoods: function () {
    var that = this;
    api.listFoodTree(this.identity.distributerId).then(function (tree) {
      var foods = util.flattenFoods(tree).filter(function (row) { return row.recipeModel === 'VERSIONED'; });
      that.setData({ loading: false, foods: foods, filteredFoods: foods });
    }).catch(function (error) { that.setData({ loading: false }); util.showError(error); });
  },
  openFoodPicker: function () { this.setData({ showFoodPicker: true, foodKeyword: '', filteredFoods: this.data.foods }); },
  closeFoodPicker: function () { this.setData({ showFoodPicker: false }); },
  onFoodSearch: function (event) {
    var keyword = String(event.detail.value || '').trim().toLowerCase();
    this.setData({
      foodKeyword: keyword,
      filteredFoods: this.data.foods.filter(function (row) { return !keyword || String(row.foodName || '').toLowerCase().indexOf(keyword) >= 0 || String(row.categoryName || '').toLowerCase().indexOf(keyword) >= 0; }),
    });
  },
  chooseFood: function (event) {
    var id = Number(event.currentTarget.dataset.id);
    var index = this.data.foods.findIndex(function (row) { return row.foodId === id; });
    this.setData({ foodIndex: index, showFoodPicker: false, analysis: null, evidence: null });
  },
  onStartDate: function (event) { this.setData({ startDate: event.detail.value, analysis: null }); },
  onEndDate: function (event) { this.setData({ endDate: event.detail.value, analysis: null }); },
  analyze: function () {
    var food = this.data.foods[this.data.foodIndex];
    if (!food) { wx.showToast({ title: '请选择 VERSIONED 菜品', icon: 'none' }); return; }
    var params = { distributerId: this.identity.distributerId, departmentId: this.departmentId, startDate: this.data.startDate, endDate: this.data.endDate };
    var that = this;
    this.setData({ analyzing: true });
    Promise.all([api.getFoodCostAnalysis(food.foodId, params), api.getFoodCostEvidence(food.foodId, params)]).then(function (results) {
      var row = results[0];
      if (row.recipeModel !== 'VERSIONED') throw { preparationError: true, status: 400, message: 'LEGACY 菜品不能进入新版中间制品成本分析' };
      var intermediate = row.intermediateCost || {};
      var reconciliation = row.portionReconciliationStatus;
      var margin = row.margin || {};
      var evidence = results[1] || {};
      evidence = Object.assign({}, evidence, {
        directRawCost: Object.assign({}, evidence.directRawCost || {}, {
          components: ((evidence.directRawCost && evidence.directRawCost.components) || []).map(function (item) {
            return Object.assign({}, item, { allocatedCostText: util.formatMoney(item.allocatedCost, '—') });
          }),
        }),
        intermediateCost: Object.assign({}, evidence.intermediateCost || {}, {
          components: ((evidence.intermediateCost && evidence.intermediateCost.components) || []).map(function (item) {
            return Object.assign({}, item, { netRecordedCostText: util.formatMoney(item.netRecordedCost, '—') });
          }),
        }),
      });
      var analysis = Object.assign({}, row, {
        productionText: util.formatNumber(row.recordedProductionPortions, 2, '暂无记录'),
        salesText: util.formatNumber(row.salesPortions, 2, '暂无记录'),
        directAmountText: util.formatMoney(row.directRawCost && row.directRawCost.amount, '暂无推算'),
        directPerText: util.formatMoney(row.directRawCost && row.directRawCost.costPerPortion, '暂不可计算'),
        intermediateAmountText: util.formatMoney(intermediate.amount, '暂无记录'),
        intermediatePerText: util.formatMoney(intermediate.costPerProducedPortion, '暂不可计算'),
        combinedAmountText: util.formatMoney(row.combinedCost && row.combinedCost.amount, '暂不可计算'),
        combinedPerText: reconciliation === 'MATCH' ? util.formatMoney(row.combinedCost && row.combinedCost.costPerPortion, '暂不可计算') : '暂不可计算',
        revenueText: util.formatMoney(margin.revenue, '暂无记录'),
        grossProfitText: reconciliation === 'MATCH' ? util.formatMoney(margin.grossProfit, '暂不可计算') : '暂不可计算',
        grossMarginText: reconciliation === 'MATCH' ? util.formatPercent(margin.grossMarginRate, '暂不可计算') : '暂不可计算',
        netZero: Number(intermediate.amount) === 0 && Number(intermediate.evidenceFactCount || 0) > 0,
      });
      that.setData({ analyzing: false, analysis: analysis, evidence: evidence });
    }).catch(function (error) { that.setData({ analyzing: false }); util.showError(error); });
  },
  toggleEvidence: function () { this.setData({ showEvidence: !this.data.showEvidence }); },
  noop: function () {},
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
