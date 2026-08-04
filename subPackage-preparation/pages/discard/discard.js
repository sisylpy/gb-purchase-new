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
    discardQuantity: '',
    inputUnitCode: '',
    reasonIndex: 0,
    reasons: [
      { code: 'EXPIRED', label: '过期' },
      { code: 'OVER_PRODUCTION', label: '生产过量' },
      { code: 'QUALITY_ISSUE', label: '质量问题' },
      { code: 'CONTAMINATION', label: '污染' },
      { code: 'STORAGE_FAILURE', label: '储存故障' },
      { code: 'OTHER', label: '其他' },
    ],
    reasonText: '',
    localPhotoPath: '',
    idempotencyKey: '',
    result: null,
  },
  onLoad: function (options) {
    this.identity = util.getIdentity();
    this.setData({
      batchId: Number(options.batchId),
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      idempotencyKey: api.createIdempotencyKey('DISCARD'),
    });
    this.loadBatch();
  },
  loadBatch: function () {
    var that = this;
    api.getBatch(this.data.batchId, this.identity.distributerId).then(function (row) {
      if (row.status !== 'COMPLETED' && row.status !== 'CLOSED') throw { preparationError: true, status: 409, message: '只有已完成生产的批次可以废弃' };
      if (!(Number(row.remainingQuantity) > 0)) throw { preparationError: true, status: 409, message: '该批次已耗尽，没有可废弃数量' };
      return api.getProduct(row.intermediateProductId, that.identity.distributerId).then(function (product) {
        that.setData({ loading: false, batch: row, baseUnitCode: product.baseUnitCode, inputUnitCode: product.baseUnitCode });
      });
    }).catch(function (error) { that.setData({ loading: false }); util.showError(error); });
  },
  onInput: function (event) { this.setData({ [event.currentTarget.dataset.field]: event.detail.value }); },
  onReasonChange: function (event) { this.setData({ reasonIndex: Number(event.detail.value || 0) }); },
  choosePhoto: function () {
    var that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (result) {
        var file = result.tempFiles && result.tempFiles[0];
        that.setData({ localPhotoPath: file ? file.tempFilePath : '' });
      },
    });
  },
  clearPhoto: function () { this.setData({ localPhotoPath: '' }); },
  submit: function () {
    if (this.data.submitting) return;
    var reason = this.data.reasons[this.data.reasonIndex];
    if (!(Number(this.data.discardQuantity) > 0) || !String(this.data.inputUnitCode || '').trim()) {
      wx.showToast({ title: '请填写废弃数量和单位', icon: 'none' });
      return;
    }
    if (reason.code === 'OTHER' && !String(this.data.reasonText || '').trim()) {
      wx.showToast({ title: '选择“其他”时必须填写补充说明', icon: 'none' });
      return;
    }
    var that = this;
    this.setData({ submitting: true });
    api.createDiscard(this.data.batchId, {
      distributerId: this.identity.distributerId,
      discardQuantity: Number(this.data.discardQuantity),
      inputUnitCode: String(this.data.inputUnitCode).trim().toUpperCase(),
      reasonCode: reason.code,
      reasonText: String(this.data.reasonText || '').trim() || null,
      // P3 当前没有照片上传接口，不能将 wx 临时路径伪装成后台可访问路径。
      photoPath: null,
      expectedBatchRowVersion: this.data.batch.rowVersion,
      idempotencyKey: this.data.idempotencyKey,
      operatorId: this.identity.operatorId,
    }).then(function (result) {
      that.setData({
        submitting: false,
        completed: true,
        result: Object.assign({}, result, {
          costText: util.formatMoney(result.totalCost),
          reasonLabel: util.reasonLabels[result.reasonCode] || result.reasonCode,
          baseUnitCode: that.data.baseUnitCode,
        }),
      });
    }).catch(function (error) { that.setData({ submitting: false }); util.showError(error); });
  },
  toDetail: function () { wx.redirectTo({ url: '/subPackage-preparation/pages/batchDetail/batchDetail?batchId=' + this.data.batchId }); },
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
