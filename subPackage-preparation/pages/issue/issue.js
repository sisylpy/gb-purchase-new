var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');

Page({
  data: {
    navBarHeight: 0,
    batchId: null,
    loading: true,
    submitting: false,
    batch: null,
    materials: [],
    idempotencyKey: '',
    stockPicker: {
      visible: false,
      componentIndex: -1,
      lineIndex: -1,
      keyword: '',
      rows: [],
      filteredRows: [],
    },
  },

  onLoad: function (options) {
    this.identity = util.getIdentity();
    this.lineSeed = 1;
    this.setData({
      batchId: Number(options.batchId),
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      idempotencyKey: api.createIdempotencyKey('BATCH-ISSUE'),
    });
    this.loadMaterials();
  },

  newLine: function (material) {
    return {
      localId: this.lineSeed++,
      stock: null,
      inputQuantity: '',
      inputUnitCode: material.plannedInputUnitCode || '',
    };
  },

  loadMaterials: function () {
    var that = this;
    Promise.all([
      api.getBatch(this.data.batchId, this.identity.distributerId),
      api.listRequiredMaterials(this.data.batchId, this.identity.distributerId),
    ]).then(function (results) {
      var batch = results[0];
      if (batch.status !== 'DRAFT') {
        throw { preparationError: true, status: 409, message: '只有 DRAFT 批次可以实际领料' };
      }
      var materials = (results[1] || []).map(function (row) {
        var material = Object.assign({}, row, { candidates: [] });
        material.lines = [that.newLine(material)];
        return material;
      });
      return Promise.all(materials.map(function (material) {
        return api.listCandidateStocks(that.data.batchId, material.recipeComponentId, that.identity.distributerId).then(function (stocks) {
          material.candidates = (stocks || []).map(function (stock) {
            return Object.assign({}, stock, {
              display: '#' + stock.rawStockBatchId + ' · ' + (stock.purchaseDate || '日期未知') + ' · 剩余 ' + util.formatNumber(stock.remainingQuantity, 6) + ' ' + (stock.quantityUnitCode || '单位未登记'),
            });
          });
        });
      })).then(function () {
        that.setData({ loading: false, batch: batch, materials: materials });
      });
    }).catch(function (error) {
      that.setData({ loading: false });
      util.showError(error);
    });
  },

  addLine: function (event) {
    var index = Number(event.currentTarget.dataset.index);
    var materials = this.data.materials.slice();
    materials[index].lines.push(this.newLine(materials[index]));
    this.setData({ materials: materials });
  },

  removeLine: function (event) {
    var componentIndex = Number(event.currentTarget.dataset.component);
    var lineIndex = Number(event.currentTarget.dataset.line);
    var materials = this.data.materials.slice();
    if (materials[componentIndex].lines.length <= 1) return;
    materials[componentIndex].lines.splice(lineIndex, 1);
    this.setData({ materials: materials });
  },

  onLineInput: function (event) {
    var componentIndex = Number(event.currentTarget.dataset.component);
    var lineIndex = Number(event.currentTarget.dataset.line);
    var field = event.currentTarget.dataset.field;
    this.setData({ ['materials[' + componentIndex + '].lines[' + lineIndex + '].' + field]: event.detail.value });
  },

  openStockPicker: function (event) {
    var componentIndex = Number(event.currentTarget.dataset.component);
    var lineIndex = Number(event.currentTarget.dataset.line);
    var rows = this.data.materials[componentIndex].candidates || [];
    this.setData({
      stockPicker: {
        visible: true,
        componentIndex: componentIndex,
        lineIndex: lineIndex,
        keyword: '',
        rows: rows,
        filteredRows: rows,
      },
    });
  },

  closeStockPicker: function () { this.setData({ 'stockPicker.visible': false }); },
  onStockSearch: function (event) {
    var keyword = String(event.detail.value || '').trim().toLowerCase();
    var filtered = this.data.stockPicker.rows.filter(function (row) {
      return !keyword || String(row.rawStockBatchId).indexOf(keyword) >= 0 ||
        String(row.purchaseDate || '').toLowerCase().indexOf(keyword) >= 0;
    });
    this.setData({ 'stockPicker.keyword': keyword, 'stockPicker.filteredRows': filtered });
  },

  chooseStock: function (event) {
    var stock = event.currentTarget.dataset.item;
    if (!stock.usable) {
      wx.showModal({ title: '该库存批次不可用', content: stock.unusableReason || '后台标记为不可用', showCancel: false });
      return;
    }
    var componentIndex = this.data.stockPicker.componentIndex;
    var lineIndex = this.data.stockPicker.lineIndex;
    var patch = {};
    patch['materials[' + componentIndex + '].lines[' + lineIndex + '].stock'] = stock;
    patch['materials[' + componentIndex + '].lines[' + lineIndex + '].inputUnitCode'] = stock.quantityUnitCode || this.data.materials[componentIndex].plannedInputUnitCode;
    patch['stockPicker.visible'] = false;
    this.setData(patch);
  },

  submit: function () {
    if (this.data.submitting) return;
    var lines = [];
    for (var i = 0; i < this.data.materials.length; i++) {
      var material = this.data.materials[i];
      for (var j = 0; j < material.lines.length; j++) {
        var line = material.lines[j];
        if (!line.stock || !(Number(line.inputQuantity) > 0) || !String(line.inputUnitCode || '').trim()) {
          wx.showToast({ title: '请为每一行选择库存批次并填写实际领用量', icon: 'none' });
          return;
        }
        lines.push({
          recipeComponentId: material.recipeComponentId,
          rawStockBatchId: line.stock.rawStockBatchId,
          inputQuantity: Number(line.inputQuantity),
          inputUnitCode: String(line.inputUnitCode).trim().toUpperCase(),
          expectedStockVersion: line.stock.rowVersion,
        });
      }
    }
    var that = this;
    this.setData({ submitting: true });
    api.issueMaterials(this.data.batchId, {
      distributerId: this.identity.distributerId,
      rowVersion: this.data.batch.rowVersion,
      idempotencyKey: this.data.idempotencyKey,
      operatorId: this.identity.operatorId,
      materials: lines,
    }).then(function (result) {
      that.setData({ submitting: false });
      wx.showModal({
        title: '领料完成',
        content: '材料总成本：' + util.formatMoney(result.materialTotalCost) + '\n这是中间制品材料总成本，不是最终菜品成本。',
        showCancel: false,
        success: function () { wx.redirectTo({ url: '/subPackage-preparation/pages/batchDetail/batchDetail?batchId=' + that.data.batchId }); },
      });
    }).catch(function (error) {
      that.setData({ submitting: false });
      util.showError(error);
    });
  },
  noop: function () {},
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
