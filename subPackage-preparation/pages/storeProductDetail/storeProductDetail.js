var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');

Page({
  data: { navBarHeight: 0, id: null, loading: true, product: null, recipe: null, cost: null, costError: '' },
  onLoad: function (options) { this.setData({ id: Number(options.id), navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR }); },
  onShow: function () { this.loadDetail(); },
  loadDetail: function () {
    var that = this;
    this.setData({ loading: true, costError: '' });
    Promise.all([api.getStoreProduct(this.data.id), api.getStoreRecipe(this.data.id)]).then(function (rows) {
      var product = rows[0];
      product.statusLabel = util.statusLabel(product.status);
      product.statusClass = util.statusClass(product.status);
      that.setData({ loading: false, product: product, recipe: rows[1] });
      if (product.recipeConfigured) that.loadCost();
    }).catch(function (error) { that.setData({ loading: false }); util.showError(error); });
  },
  loadCost: function () {
    var that = this;
    api.getStoreReferenceCost(this.data.id).then(function (cost) {
      cost = cost || {};
      cost.recipeCostText = util.formatMoney(cost.recipeReferenceCost);
      cost.unitCostText = util.formatMoney(cost.theoreticalUnitCost);
      that.setData({ cost: cost, costError: cost.complete ? '' : '部分原料缺少可用库存成本，参考成本暂不完整。' });
    }).catch(function (error) { that.setData({ cost: null, costError: error.message || '参考成本暂不可用' }); });
  },
  toEdit: function () { wx.navigateTo({ url: '/subPackage-preparation/pages/storeProductForm/storeProductForm?id=' + this.data.id }); },
  toRecipe: function () { wx.navigateTo({ url: '/subPackage-preparation/pages/storeRecipe/storeRecipe?productId=' + this.data.id }); },
  toLoss: function () { wx.navigateTo({ url: '/subPackage-preparation/pages/storeLoss/storeLoss?productId=' + this.data.id }); },
  toRecords: function () { wx.navigateTo({ url: '/subPackage-preparation/pages/storeLossRecords/storeLossRecords?productId=' + this.data.id }); },
  toggleStatus: function () {
    var that = this;
    var enabling = this.data.product.status !== 'ENABLED';
    util.confirm(enabling ? '确认启用这个备料品？' : '停用不会删除配方和损耗记录，确认停用？').then(function (ok) {
      if (!ok) return;
      api.changeStoreProductStatus(that.data.id, enabling, that.data.product.rowVersion).then(function () { that.loadDetail(); }).catch(util.showError);
    });
  },
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
