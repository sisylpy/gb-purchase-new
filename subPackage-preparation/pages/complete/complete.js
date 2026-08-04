var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');

Page({
  data: {
    navBarHeight: 0,
    batchId: null,
    loading: true,
    submitting: false,
    completed: false,
    batch: null,
    result: null,
    actualQuantity: '',
    inputUnitCode: '',
    expiresDate: '',
    expiresTime: '',
    idempotencyKey: '',
  },
  onLoad: function (options) {
    this.identity = util.getIdentity();
    this.setData({
      batchId: Number(options.batchId),
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      expiresDate: util.localDate(1),
      expiresTime: util.localTime(),
      idempotencyKey: api.createIdempotencyKey('BATCH-COMPLETE'),
    });
    this.loadBatch();
  },
  loadBatch: function () {
    var that = this;
    api.getBatch(this.data.batchId, this.identity.distributerId).then(function (row) {
      if (row.status !== 'MATERIALS_ISSUED') throw { preparationError: true, status: 409, message: '只有已完成领料的批次可以完成生产' };
      return api.getProduct(row.intermediateProductId, that.identity.distributerId).then(function (product) {
        that.setData({
          loading: false,
          batch: Object.assign({}, row, { materialCostText: util.formatMoney(row.materialTotalCost) }),
          baseUnitCode: product.baseUnitCode,
          inputUnitCode: row.theoreticalOutput.unitCode || '',
        });
      });
    }).catch(function (error) { that.setData({ loading: false }); util.showError(error); });
  },
  onInput: function (event) { this.setData({ [event.currentTarget.dataset.field]: event.detail.value }); },
  onDateChange: function (event) { this.setData({ expiresDate: event.detail.value }); },
  onTimeChange: function (event) { this.setData({ expiresTime: event.detail.value }); },
  submit: function () {
    if (this.data.submitting) return;
    if (!(Number(this.data.actualQuantity) > 0) || !String(this.data.inputUnitCode || '').trim()) {
      wx.showToast({ title: '请填写实际合格产量和单位', icon: 'none' });
      return;
    }
    var that = this;
    this.setData({ submitting: true });
    api.completeBatch(this.data.batchId, {
      distributerId: this.identity.distributerId,
      rowVersion: this.data.batch.rowVersion,
      actualQualifiedQuantity: Number(this.data.actualQuantity),
      inputUnitCode: String(this.data.inputUnitCode).trim().toUpperCase(),
      expiresAt: util.toLocalDateTime(this.data.expiresDate, this.data.expiresTime),
      idempotencyKey: this.data.idempotencyKey,
      operatorId: this.identity.operatorId,
    }).then(function (row) {
      that.setData({
        submitting: false,
        completed: true,
        result: Object.assign({}, row, {
          materialCostText: util.formatMoney(row.materialTotalCost),
          unitCostText: util.formatUnitCost(row.unitCost),
          baseUnitCode: that.data.baseUnitCode,
          processLossQuantityText: util.formatNumber(row.processLossAnalysis && row.processLossAnalysis.baseQuantity, 6),
          processLossCostText: util.formatMoney(row.processLossAnalysis && row.processLossAnalysis.analysisCost),
          remainingCostText: util.formatMoney(row.remainingCost),
          producedText: util.timePart(row.producedAt),
          expiresText: util.timePart(row.expiresAt),
        }),
      });
    }).catch(function (error) { that.setData({ submitting: false }); util.showError(error); });
  },
  toDetail: function () { wx.redirectTo({ url: '/subPackage-preparation/pages/batchDetail/batchDetail?batchId=' + this.data.batchId }); },
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
