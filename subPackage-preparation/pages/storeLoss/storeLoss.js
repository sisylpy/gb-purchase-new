var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');

Page({
  data: {
    navBarHeight: 0, loading: true, submitting: false,
    products: [], productIndex: -1, product: null,
    materials: [], materialIndex: -1, material: null,
    stocks: [], stockIndex: -1, stock: null,
    quantity: '', note: '',
    reasons: [
      { code: 'NATURAL_LOSS', label: '自然损耗' },
      { code: 'PROCESSING_LOSS', label: '加工损耗' },
      { code: 'WEIGHING_ERROR', label: '过称误差' },
      { code: 'OTHER', label: '其他' },
    ],
    reasonIndex: 1,
    idempotencyKey: '',
  },
  onLoad: function (options) {
    this.initialProductId = options && options.productId ? Number(options.productId) : null;
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR, idempotencyKey: api.createIdempotencyKey('STORE-LOSS') });
    this.loadProducts();
  },
  loadProducts: function () {
    var that = this;
    api.listStoreProducts('ENABLED').then(function (rows) {
      rows = (rows || []).filter(function (row) { return row.recipeConfigured; });
      var idx = rows.findIndex(function (row) { return Number(row.id) === that.initialProductId; });
      that.setData({ loading: false, products: rows, productIndex: idx });
      if (idx >= 0) that.selectProduct(idx);
    }).catch(function (error) { that.setData({ loading: false }); util.showError(error); });
  },
  onProductChange: function (event) { this.selectProduct(Number(event.detail.value || 0)); },
  selectProduct: function (idx) {
    var product = this.data.products[idx];
    if (!product) return;
    var that = this;
    this.setData({ productIndex: idx, product: product, materials: [], materialIndex: -1, material: null, stocks: [], stockIndex: -1, stock: null, quantity: '', idempotencyKey: api.createIdempotencyKey('STORE-LOSS') });
    api.listStoreLossMaterials(product.id).then(function (rows) { that.setData({ materials: rows || [] }); }).catch(util.showError);
  },
  onMaterialChange: function (event) {
    var idx = Number(event.detail.value || 0);
    var material = this.data.materials[idx];
    if (!material) return;
    var that = this;
    this.setData({ materialIndex: idx, material: material, stocks: [], stockIndex: -1, stock: null, quantity: '', idempotencyKey: api.createIdempotencyKey('STORE-LOSS') });
    api.listStoreLossStocks(this.data.product.id, material.recipeComponentId).then(function (rows) { that.setData({ stocks: rows || [] }); }).catch(util.showError);
  },
  chooseStock: function (event) {
    var idx = Number(event.currentTarget.dataset.index);
    this.setData({ stockIndex: idx, stock: this.data.stocks[idx], quantity: '', idempotencyKey: api.createIdempotencyKey('STORE-LOSS') });
  },
  onQuantityInput: function (event) { this.setData({ quantity: event.detail.value, idempotencyKey: api.createIdempotencyKey('STORE-LOSS') }); },
  onReasonChange: function (event) { this.setData({ reasonIndex: Number(event.detail.value || 0), idempotencyKey: api.createIdempotencyKey('STORE-LOSS') }); },
  onNoteInput: function (event) { this.setData({ note: event.detail.value, idempotencyKey: api.createIdempotencyKey('STORE-LOSS') }); },
  submit: function () {
    if (this.data.submitting) return;
    if (!this.data.product || !this.data.material || !this.data.stock || !(Number(this.data.quantity) > 0)) { wx.showToast({ title: '请完整选择原料库存并填写数量', icon: 'none' }); return; }
    if (this.data.reasons[this.data.reasonIndex].code === 'OTHER' && !String(this.data.note || '').trim()) { wx.showToast({ title: '选择其他时请填写说明', icon: 'none' }); return; }
    var that = this;
    var content = '将从“' + this.data.material.rawGoodsName + '”库存直接扣减 ' + this.data.quantity + ' ' + this.data.stock.stockUnitLabel + '，不产生生产批次。';
    util.confirm(content, '确认记录原料损耗').then(function (ok) {
      if (!ok) return;
      that.setData({ submitting: true });
      return api.createStoreRawLoss({
        intermediateProductId: that.data.product.id,
        recipeComponentId: that.data.material.recipeComponentId,
        rawStockBatchId: that.data.stock.rawStockBatchId,
        quantity: Number(that.data.quantity),
        unitCode: that.data.stock.stockUnitCode,
        stockRowVersion: that.data.stock.rowVersion,
        reasonCode: that.data.reasons[that.data.reasonIndex].code,
        note: that.data.note,
        idempotencyKey: that.data.idempotencyKey,
      }).then(function (result) {
        that.setData({ submitting: false, quantity: '', idempotencyKey: api.createIdempotencyKey('STORE-LOSS') });
        wx.showModal({ title: '原料损耗已记录', content: result.rawGoodsName + ' ' + result.lossQuantity + ' ' + (result.unitLabel || result.unitCode || '') + '\n关联中间料：' + result.productName + '\n记录时间：' + result.recordTime, showCancel: false, success: function () { that.refreshStocks(); } });
      }).catch(function (error) {
        // 网络失败保留同一 idempotencyKey，用户可安全重试。
        that.setData({ submitting: false });
        util.showError(error);
      });
    });
  },
  refreshStocks: function () {
    if (!this.data.material || !this.data.product) return;
    var that = this;
    api.listStoreLossStocks(this.data.product.id, this.data.material.recipeComponentId).then(function (rows) { that.setData({ stocks: rows || [], stock: null, stockIndex: -1 }); });
  },
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
