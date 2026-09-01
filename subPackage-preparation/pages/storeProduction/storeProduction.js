var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');

function emptyLine() {
  return { stockIndex: -1, stock: null, quantity: '' };
}

Page({
  data: {
    navBarHeight: 0,
    loading: true,
    submitting: false,
    products: [],
    productIndex: -1,
    product: null,
    recipeVersionId: null,
    materials: [],
    actualOutputQuantity: '',
    idempotencyKey: '',
  },

  onLoad: function (options) {
    this.initialProductId = options && options.productId ? Number(options.productId) : null;
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      idempotencyKey: api.createIdempotencyKey('STORE-PRODUCTION'),
    });
    this.loadProducts();
  },

  loadProducts: function () {
    var that = this;
    api.listStoreProducts('ENABLED').then(function (rows) {
      rows = (rows || []).filter(function (row) { return row.recipeConfigured; });
      var idx = rows.findIndex(function (row) { return Number(row.id) === that.initialProductId; });
      that.setData({ loading: false, products: rows, productIndex: idx });
      if (idx >= 0) that.selectProduct(idx);
    }).catch(function (error) {
      that.setData({ loading: false });
      util.showError(error);
    });
  },

  onProductChange: function (event) {
    this.selectProduct(Number(event.detail.value || 0));
  },

  selectProduct: function (idx) {
    var product = this.data.products[idx];
    if (!product) return;
    var that = this;
    this.setData({
      productIndex: idx,
      product: product,
      recipeVersionId: product.currentPublishedRecipeVersionId,
      materials: [],
      actualOutputQuantity: '',
      idempotencyKey: api.createIdempotencyKey('STORE-PRODUCTION'),
    });
    api.listStoreProductionMaterials(product.id).then(function (rows) {
      rows = rows || [];
      return Promise.all(rows.map(function (material) {
        return api.listStoreProductionStocks(product.id, material.recipeComponentId)
          .then(function (stocks) {
            material.stocks = (stocks || []).map(function (stock) {
              stock.displayLabel = (stock.departmentName ? stock.departmentName + ' · ' : '')
                + (stock.purchaseDate || '日期未记录') + ' · 剩余 '
                + stock.remainingQuantity + ' ' + stock.stockUnitLabel;
              return stock;
            });
            material.lines = [emptyLine()];
            return material;
          });
      }));
    }).then(function (materials) {
      that.setData({ materials: materials || [] });
    }).catch(util.showError);
  },

  onStockChange: function (event) {
    var mi = Number(event.currentTarget.dataset.materialIndex);
    var li = Number(event.currentTarget.dataset.lineIndex);
    var si = Number(event.detail.value);
    var materials = this.data.materials;
    var line = materials[mi].lines[li];
    line.stockIndex = si;
    line.stock = materials[mi].stocks[si];
    line.quantity = '';
    this.setData({ materials: materials, idempotencyKey: api.createIdempotencyKey('STORE-PRODUCTION') });
  },

  onQuantityInput: function (event) {
    var mi = Number(event.currentTarget.dataset.materialIndex);
    var li = Number(event.currentTarget.dataset.lineIndex);
    var materials = this.data.materials;
    materials[mi].lines[li].quantity = event.detail.value;
    this.setData({ materials: materials, idempotencyKey: api.createIdempotencyKey('STORE-PRODUCTION') });
  },

  addStockLine: function (event) {
    var mi = Number(event.currentTarget.dataset.materialIndex);
    var materials = this.data.materials;
    materials[mi].lines.push(emptyLine());
    this.setData({ materials: materials, idempotencyKey: api.createIdempotencyKey('STORE-PRODUCTION') });
  },

  removeStockLine: function (event) {
    var mi = Number(event.currentTarget.dataset.materialIndex);
    var li = Number(event.currentTarget.dataset.lineIndex);
    var materials = this.data.materials;
    if (materials[mi].lines.length <= 1) return;
    materials[mi].lines.splice(li, 1);
    this.setData({ materials: materials, idempotencyKey: api.createIdempotencyKey('STORE-PRODUCTION') });
  },

  onOutputInput: function (event) {
    this.setData({
      actualOutputQuantity: event.detail.value,
      idempotencyKey: api.createIdempotencyKey('STORE-PRODUCTION'),
    });
  },

  submit: function () {
    if (this.data.submitting) return;
    if (!this.data.product || !(Number(this.data.actualOutputQuantity) > 0)) {
      wx.showToast({ title: '请选择中间料并填写实际产出', icon: 'none' });
      return;
    }
    var lines = [];
    for (var mi = 0; mi < this.data.materials.length; mi++) {
      var material = this.data.materials[mi];
      var validCount = 0;
      for (var li = 0; li < material.lines.length; li++) {
        var line = material.lines[li];
        if (!line.stock || !(Number(line.quantity) > 0)) continue;
        validCount++;
        lines.push({
          recipeComponentId: material.recipeComponentId,
          rawStockBatchId: line.stock.rawStockBatchId,
          quantity: Number(line.quantity),
          unitCode: line.stock.stockUnitCode,
          stockRowVersion: line.stock.rowVersion,
        });
      }
      if (!validCount) {
        wx.showToast({ title: '请填写“' + material.rawGoodsName + '”的实际领用', icon: 'none' });
        return;
      }
    }
    var that = this;
    util.confirm('确认按所选库存扣减原料并记录 ' + this.data.actualOutputQuantity + ' '
      + this.data.product.usageUnitCode + ' 的实际产出？本操作不创建生产批次。', '确认记录制作')
      .then(function (ok) {
        if (!ok) return;
        that.setData({ submitting: true });
        return api.createStoreProduction({
          intermediateProductId: that.data.product.id,
          recipeVersionId: that.data.recipeVersionId,
          actualOutputQuantity: Number(that.data.actualOutputQuantity),
          outputUnitCode: that.data.product.usageUnitCode,
          materials: lines,
          idempotencyKey: that.data.idempotencyKey,
        }).then(function (result) {
          that.setData({ submitting: false, idempotencyKey: api.createIdempotencyKey('STORE-PRODUCTION') });
          wx.showModal({
            title: '制作已记录',
            content: result.productName + '\n原料成本：¥' + result.materialTotalCost
              + '\n本次单位成本：¥' + result.actualUnitCost + '/' + result.outputUnitCode
              + '\n未创建生产批次',
            showCancel: false,
            success: function () { wx.navigateBack({ delta: 1 }); },
          });
        }).catch(function (error) {
          // 网络失败保留原幂等键，用户可安全重试，不会重复扣库存。
          that.setData({ submitting: false });
          util.showError(error);
        });
      });
  },

  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
