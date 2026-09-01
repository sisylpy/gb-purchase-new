var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');

var unitLabels = { G: '克', KG: '千克', JIN: '斤', ML: '毫升', L: '升', EA: '个' };
var unitDefinitions = {
  G: { dimension: 'WEIGHT', factor: 1 },
  KG: { dimension: 'WEIGHT', factor: 1000 },
  JIN: { dimension: 'WEIGHT', factor: 500 },
  ML: { dimension: 'VOLUME', factor: 1 },
  L: { dimension: 'VOLUME', factor: 1000 },
  EA: { dimension: 'COUNT', factor: 1 },
};

Page({
  data: {
    navBarHeight: 0,
    id: null,
    loading: true,
    product: null,
    recipe: { components: [] },
    visibleComponents: [],
    canOperate: false,
  },

  onLoad: function (options) {
    this.setData({ id: Number(options.id), navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR });
  },

  onShow: function () { this.loadDetail(); },

  loadDetail: function () {
    var that = this;
    this.setData({ loading: true });
    Promise.all([api.getStoreProduct(this.data.id), api.getStoreRecipe(this.data.id)]).then(function (rows) {
      var product = rows[0];
      var recipe = rows[1] || { components: [] };
      product.usageUnitLabel = unitLabels[product.usageUnitCode] || product.usageUnitCode || '—';
      that.finishDetail(product, recipe);
    }).catch(function (error) {
      that.setData({ loading: false });
      util.showError(error);
    });
  },

  finishDetail: function (product, recipe) {
    var canOperate = product.status === 'ENABLED' && product.recipeConfigured;
    product.displayStateLabel = product.status === 'DISABLED' ? '已停用' : (canOperate ? '使用中' : '配方待完善');
    product.displayStateClass = product.status === 'DISABLED' ? 'status-muted' : (canOperate ? 'status-success' : 'status-warning');
    product.recipeStateText = product.recipeConfigured ? '已完成' : '待完善';
    var outputUnitCode = recipe.standardOutputUnitCode || product.usageUnitCode;
    var outputDefinition = unitDefinitions[outputUnitCode];
    var outputQuantity = Number(recipe.standardOutputQuantity);
    var outputBase = outputDefinition && outputQuantity > 0 ? outputQuantity * outputDefinition.factor : 0;
    recipe.standardOutputText = outputQuantity > 0
      ? util.formatNumber(outputQuantity, 6) + ' ' + (unitLabels[outputUnitCode] || outputUnitCode || '')
      : '待配置';
    var decoratedComponents = (recipe.components || []).map(function (line) {
      var definition = unitDefinitions[line.inputUnitCode];
      var componentBase = Number(line.inputQuantity) * (definition ? definition.factor : 0);
      var comparable = outputBase > 0 && definition && outputDefinition
        && definition.dimension === outputDefinition.dimension;
      return Object.assign({}, line, {
        inputQuantityText: util.formatNumber(line.inputQuantity, 6),
        inputUnitLabel: unitLabels[line.inputUnitCode] || line.inputUnitCode || '',
        ratioText: comparable ? (componentBase / outputBase * 100).toFixed(1) + '%' : '—',
      });
    });
    this.setData({
      loading: false,
      product: product,
      recipe: Object.assign({}, recipe, { components: decoratedComponents }),
      visibleComponents: decoratedComponents.slice(0, 6),
      canOperate: canOperate,
      blockedOperationText: product.status === 'DISABLED'
        ? '该中间料已停用，重新启用后可记录制作和损耗。'
        : '完成标准配方后即可记录实际制作和损耗。',
      blockedActionText: product.status === 'DISABLED'
        ? '重新启用 ›'
        : '去完善标准配方 ›',
    });
  },

  toEdit: function () { wx.navigateTo({ url: '/subPackage-preparation/pages/storeProductForm/storeProductForm?id=' + this.data.id }); },
  toRecipe: function () { wx.navigateTo({ url: '/subPackage-preparation/pages/storeRecipe/storeRecipe?productId=' + this.data.id }); },
  toProduction: function () { if (this.data.canOperate) wx.navigateTo({ url: '/subPackage-preparation/pages/storeProduction/storeProduction?productId=' + this.data.id }); },
  toLoss: function () { if (this.data.canOperate) wx.navigateTo({ url: '/subPackage-preparation/pages/storeLoss/storeLoss?productId=' + this.data.id }); },
  toProductionRecords: function () { if (this.data.canOperate) wx.navigateTo({ url: '/subPackage-preparation/pages/storeProductionRecords/storeProductionRecords?productId=' + this.data.id }); },
  toLossRecords: function () { if (this.data.canOperate) wx.navigateTo({ url: '/subPackage-preparation/pages/storeLossRecords/storeLossRecords?productId=' + this.data.id }); },
  handleBlockedAction: function () {
    if (this.data.product && this.data.product.status === 'DISABLED') this.toggleStatus();
    else this.toRecipe();
  },

  toggleStatus: function () {
    var that = this;
    var enabling = this.data.product.status !== 'ENABLED';
    if (enabling && !this.data.product.recipeConfigured) {
      wx.showModal({ title: '还不能使用', content: '请先完成标准配方。', showCancel: false });
      return;
    }
    util.confirm(enabling ? '确认启用这个中间料？' : '停用后不能再用于新菜品配方，历史记录会保留。确认停用？').then(function (ok) {
      if (!ok) return;
      api.changeStoreProductStatus(that.data.id, enabling, that.data.product.rowVersion).then(function () { that.loadDetail(); }).catch(util.showError);
    });
  },

  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
