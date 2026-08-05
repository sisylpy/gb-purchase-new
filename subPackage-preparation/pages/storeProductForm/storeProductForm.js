var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');

Page({
  data: {
    navBarHeight: 0,
    id: null,
    editing: false,
    loading: false,
    submitting: false,
    units: [
      { code: 'G', label: '克（g）' }, { code: 'KG', label: '公斤（kg）' },
      { code: 'JIN', label: '斤' }, { code: 'ML', label: '毫升（ml）' },
      { code: 'L', label: '升（L）' }, { code: 'EA', label: '个' },
    ],
    unitIndex: 2,
    form: { productName: '', usageUnitCode: 'JIN', enabled: true, rowVersion: 0 },
  },
  onLoad: function (options) {
    var id = options && options.id ? Number(options.id) : null;
    this.setData({ id: id, editing: !!id, navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR });
    if (id) this.loadProduct();
  },
  loadProduct: function () {
    var that = this;
    this.setData({ loading: true });
    api.getStoreProduct(this.data.id).then(function (row) {
      var idx = that.data.units.findIndex(function (unit) { return unit.code === row.usageUnitCode; });
      that.setData({
        loading: false,
        unitIndex: idx < 0 ? 0 : idx,
        form: { productName: row.productName || '', usageUnitCode: row.usageUnitCode || 'G', enabled: row.status === 'ENABLED', rowVersion: Number(row.rowVersion || 0) },
      });
    }).catch(function (error) { that.setData({ loading: false }); util.showError(error); });
  },
  onNameInput: function (event) { this.setData({ 'form.productName': event.detail.value }); },
  onUnitChange: function (event) { var idx = Number(event.detail.value || 0); this.setData({ unitIndex: idx, 'form.usageUnitCode': this.data.units[idx].code }); },
  onEnabledChange: function (event) { this.setData({ 'form.enabled': !!event.detail.value }); },
  submit: function () {
    if (this.data.submitting) return;
    if (!String(this.data.form.productName || '').trim()) { wx.showToast({ title: '请输入备料品名称', icon: 'none' }); return; }
    var that = this;
    this.setData({ submitting: true });
    var action = this.data.editing ? api.updateStoreProduct(this.data.id, this.data.form) : api.createStoreProduct(this.data.form);
    action.then(function (row) {
      that.setData({ submitting: false });
      wx.showToast({ title: '保存成功', icon: 'success' });
      if (that.data.editing) { setTimeout(function () { wx.navigateBack({ delta: 1 }); }, 500); }
      else { setTimeout(function () { wx.redirectTo({ url: '/subPackage-preparation/pages/storeRecipe/storeRecipe?productId=' + row.id }); }, 500); }
    }).catch(function (error) { that.setData({ submitting: false }); util.showError(error); });
  },
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
