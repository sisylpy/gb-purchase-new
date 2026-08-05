var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');

Page({
  data: {
    navBarHeight: 0, productId: null, loading: true, submitting: false,
    productName: '', usageUnitCode: '', components: [],
    units: ['G', 'KG', 'JIN', 'ML', 'L', 'EA'],
    showGoodsPicker: false, goodsKeyword: '', goodsLoading: false, goodsResults: [],
  },
  onLoad: function (options) {
    this.identity = util.getIdentity();
    this.setData({ productId: Number(options.productId), navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR });
    this.loadRecipe();
  },
  loadRecipe: function () {
    var that = this;
    this.setData({ loading: true });
    api.getStoreRecipe(this.data.productId).then(function (row) {
      var components = (row.components || []).map(function (line) {
        return Object.assign({}, line, {
          quantityText: line.inputQuantity == null ? '' : String(line.inputQuantity),
          unitIndex: Math.max(0, that.data.units.indexOf(line.inputUnitCode || 'G')),
        });
      });
      that.setData({ loading: false, productName: row.productName || '', usageUnitCode: row.usageUnitCode || '', components: components });
    }).catch(function (error) { that.setData({ loading: false }); util.showError(error); });
  },
  onQuantityInput: function (event) { this.setData({ ['components[' + Number(event.currentTarget.dataset.index) + '].quantityText']: event.detail.value }); },
  onUnitChange: function (event) { this.setData({ ['components[' + Number(event.currentTarget.dataset.index) + '].unitIndex']: Number(event.detail.value || 0) }); },
  deleteComponent: function (event) { var rows = this.data.components.slice(); rows.splice(Number(event.currentTarget.dataset.index), 1); this.setData({ components: rows }); },
  openGoodsPicker: function () { this.setData({ showGoodsPicker: true, goodsKeyword: '', goodsResults: [] }); },
  closeGoodsPicker: function () { this.setData({ showGoodsPicker: false }); },
  noop: function () {},
  onGoodsKeyword: function (event) { this.setData({ goodsKeyword: event.detail.value || '' }); },
  searchGoods: function () {
    var keyword = String(this.data.goodsKeyword || '').trim();
    if (!keyword) { wx.showToast({ title: '请输入原料名称', icon: 'none' }); return; }
    var that = this;
    this.setData({ goodsLoading: true });
    api.searchRawGoods(this.identity.distributerId, keyword).then(function (rows) { that.setData({ goodsLoading: false, goodsResults: rows || [] }); }).catch(function (error) { that.setData({ goodsLoading: false }); util.showError(error); });
  },
  chooseGoods: function (event) {
    var goods = event.currentTarget.dataset.item;
    if (this.data.components.some(function (line) { return String(line.rawGoodsId) === String(goods.gbDistributerGoodsId); })) { wx.showToast({ title: '该原料已经添加', icon: 'none' }); return; }
    var rows = this.data.components.slice();
    rows.push({ rawGoodsId: goods.gbDistributerGoodsId, rawGoodsName: goods.gbDgGoodsName, quantityText: '', unitIndex: 0 });
    this.setData({ components: rows, showGoodsPicker: false });
  },
  submit: function () {
    if (this.data.submitting) return;
    if (!this.data.components.length) { wx.showToast({ title: '请至少添加一种原料', icon: 'none' }); return; }
    var units = this.data.units;
    var invalid = this.data.components.some(function (line) { return !(Number(line.quantityText) > 0); });
    if (invalid) { wx.showToast({ title: '请填写每种原料的标准用量', icon: 'none' }); return; }
    var body = { components: this.data.components.map(function (line) { return { rawGoodsId: line.rawGoodsId, inputQuantity: Number(line.quantityText), inputUnitCode: units[line.unitIndex] }; }) };
    var that = this;
    this.setData({ submitting: true });
    api.saveStoreRecipe(this.data.productId, body).then(function () {
      that.setData({ submitting: false });
      wx.showToast({ title: '配方已启用', icon: 'success' });
      setTimeout(function () { wx.navigateBack({ delta: 1 }); }, 600);
    }).catch(function (error) { that.setData({ submitting: false }); util.showError(error); });
  },
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
