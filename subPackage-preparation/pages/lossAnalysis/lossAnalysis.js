var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');

function monthStart() { return util.localDate().slice(0, 8) + '01'; }

Page({
  data: {
    navBarHeight: 0,
    loading: true,
    analyzing: false,
    products: [],
    productIndex: -1,
    startDate: '',
    endDate: '',
    analysis: null,
  },
  onLoad: function (options) {
    this.identity = util.getIdentity();
    this.departmentId = Number(wx.getStorageSync('preparationDepartmentId'));
    this.initialProductId = options.productId ? Number(options.productId) : null;
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR, startDate: monthStart(), endDate: util.localDate() });
    this.loadProducts();
  },
  loadProducts: function () {
    var that = this;
    api.listProducts(this.identity.distributerId).then(function (rows) {
      rows = rows || [];
      var index = rows.findIndex(function (row) { return row.id === that.initialProductId; });
      that.setData({ loading: false, products: rows, productIndex: index });
      if (index >= 0) that.analyze();
    }).catch(function (error) { that.setData({ loading: false }); util.showError(error); });
  },
  onProductChange: function (event) { this.setData({ productIndex: Number(event.detail.value || 0), analysis: null }); },
  onStartDate: function (event) { this.setData({ startDate: event.detail.value, analysis: null }); },
  onEndDate: function (event) { this.setData({ endDate: event.detail.value, analysis: null }); },
  analyze: function () {
    var product = this.data.products[this.data.productIndex];
    if (!product) { wx.showToast({ title: '请选择中间制品', icon: 'none' }); return; }
    var that = this;
    this.setData({ analyzing: true });
    api.getLossAnalysis(product.id, { distributerId: this.identity.distributerId, departmentId: this.departmentId, startDate: this.data.startDate, endDate: this.data.endDate }).then(function (row) {
      var analysis = Object.assign({}, row, {
        processQuantityText: util.formatNumber(row.processLossAnalysisQuantity, 6),
        processAmountText: util.formatMoney(row.processLossAnalysisAmount),
        discardQuantityText: util.formatNumber(row.discardedQuantity, 6),
        discardCostText: util.formatMoney(row.discardedCost),
        productionCostText: util.formatMoney(row.productionCost),
        usedCostText: util.formatMoney(row.usedCost),
        remainingCostText: util.formatMoney(row.remainingCost),
        reasons: (row.discardReasonBreakdown || []).map(function (reason) { return Object.assign({}, reason, { label: util.reasonLabels[reason.reasonCode] || reason.reasonCode, costText: util.formatMoney(reason.discardedCost) }); }),
      });
      that.setData({ analyzing: false, analysis: analysis });
    }).catch(function (error) { that.setData({ analyzing: false }); util.showError(error); });
  },
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
