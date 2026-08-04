var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');

Page({
  data: {
    navBarHeight: 0,
    id: null,
    loading: true,
    submitting: false,
    product: null,
    conversions: [],
    publishedVersions: [],
    recipeId: null,
    showConversion: false,
    conversionForm: { unitCode: '', factorToBase: '', rowVersion: 0 },
  },

  onLoad: function (options) {
    this.identity = util.getIdentity();
    this.setData({
      id: Number(options.id),
      recipeId: options.recipeId ? Number(options.recipeId) : null,
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
    });
  },

  onShow: function () { this.loadDetail(); },
  onPullDownRefresh: function () {
    this.loadDetail().then(function () { wx.stopPullDownRefresh(); });
  },

  loadDetail: function () {
    var that = this;
    this.setData({ loading: true });
    return Promise.all([
      api.getProduct(this.data.id, this.identity.distributerId),
      api.listConversions({
        distributerId: this.identity.distributerId,
        itemKind: 'INTERMEDIATE_PRODUCT',
        intermediateProductId: this.data.id,
      }),
      api.listPublishedRecipeVersions(this.data.id, this.identity.distributerId),
    ]).then(function (results) {
      var product = results[0];
      var conversions = (results[1] || []).map(function (row) {
        return Object.assign({}, row, { factorText: '1 ' + row.unitCode + ' = ' + util.formatNumber(row.factorToBase, 6) + ' ' + product.baseUnitCode });
      });
      var versions = results[2] || [];
      var recipeId = that.data.recipeId || (versions[0] && versions[0].recipeId) || that.readRecipeIdCache();
      that.setData({
        loading: false,
        product: Object.assign({}, product, {
          statusLabel: util.statusLabel(product.status),
          statusClass: util.statusClass(product.status),
          shelfLifeText: that.formatShelfLife(product.shelfLifeMinutes),
        }),
        conversions: conversions,
        publishedVersions: versions,
        recipeId: recipeId || null,
      });
    }).catch(function (error) {
      that.setData({ loading: false });
      util.showError(error);
    });
  },

  formatShelfLife: function (minutes) {
    var value = Number(minutes || 0);
    if (value && value % 1440 === 0) return value / 1440 + '天';
    if (value && value % 60 === 0) return value / 60 + '小时';
    return value + '分钟';
  },

  readRecipeIdCache: function () {
    var map = wx.getStorageSync('preparationRecipeMap') || {};
    return map[String(this.data.id)] || null;
  },

  saveRecipeIdCache: function (recipeId) {
    var map = wx.getStorageSync('preparationRecipeMap') || {};
    map[String(this.data.id)] = recipeId;
    wx.setStorageSync('preparationRecipeMap', map);
  },

  toEdit: function () {
    wx.navigateTo({ url: '/subPackage-preparation/pages/productForm/productForm?id=' + this.data.id });
  },

  changeStatus: function () {
    var that = this;
    var enable = this.data.product.status !== 'ENABLED';
    util.confirm(enable ? '确认启用这个中间制品？' : '停用后不能再创建新的生产批次，确认停用？').then(function (confirmed) {
      if (!confirmed) return;
      that.setData({ submitting: true });
      return api.changeProductStatus(that.data.id, enable, {
        distributerId: that.identity.distributerId,
        rowVersion: that.data.product.rowVersion,
        operatorId: that.identity.operatorId,
      }).then(function () {
        that.setData({ submitting: false });
        that.loadDetail();
      }).catch(function (error) {
        that.setData({ submitting: false });
        util.showError(error);
      });
    });
  },

  openConversion: function () {
    this.setData({
      showConversion: true,
      conversionForm: { unitCode: '', factorToBase: '', rowVersion: 0 },
    });
  },

  closeConversion: function () { this.setData({ showConversion: false }); },
  onConversionInput: function (event) {
    var field = event.currentTarget.dataset.field;
    this.setData({ ['conversionForm.' + field]: event.detail.value });
  },

  saveConversion: function () {
    if (this.data.submitting) return;
    var form = this.data.conversionForm;
    if (!String(form.unitCode || '').trim() || !(Number(form.factorToBase) > 0)) {
      wx.showToast({ title: '请填写包装单位和换算数量', icon: 'none' });
      return;
    }
    var that = this;
    this.setData({ submitting: true });
    api.saveConversion({
      distributerId: this.identity.distributerId,
      itemKind: 'INTERMEDIATE_PRODUCT',
      rawGoodsId: null,
      intermediateProductId: this.data.id,
      unitCode: String(form.unitCode).trim().toUpperCase(),
      dimension: this.data.product.unitDimension,
      factorToBase: Number(form.factorToBase),
      rowVersion: Number(form.rowVersion || 0),
      operatorId: this.identity.operatorId,
    }).then(function () {
      that.setData({ submitting: false, showConversion: false });
      that.loadDetail();
    }).catch(function (error) {
      that.setData({ submitting: false });
      util.showError(error);
    });
  },

  disableConversion: function (event) {
    var row = event.currentTarget.dataset.item;
    var that = this;
    util.confirm('确认停用包装单位 ' + row.unitCode + '？').then(function (confirmed) {
      if (!confirmed) return;
      return api.disableConversion(row.id, {
        distributerId: that.identity.distributerId,
        rowVersion: row.rowVersion,
        operatorId: that.identity.operatorId,
      }).then(function () { that.loadDetail(); }).catch(util.showError);
    });
  },

  openRecipe: function () {
    var that = this;
    if (this.data.recipeId) {
      this.navigateRecipe(this.data.recipeId);
      return;
    }
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    api.createIntermediateRecipe({
      distributerId: this.identity.distributerId,
      intermediateProductId: this.data.id,
      operatorId: this.identity.operatorId,
    }).then(function (result) {
      var recipeId = result.recipe.id;
      that.saveRecipeIdCache(recipeId);
      that.setData({ submitting: false, recipeId: recipeId });
      that.navigateRecipe(recipeId, result.version.id);
    }).catch(function (error) {
      that.setData({ submitting: false });
      util.showError(error);
    });
  },

  navigateRecipe: function (recipeId, versionId) {
    var product = this.data.product || {};
    var query = [
      'recipeId=' + recipeId,
      'productId=' + this.data.id,
      'productName=' + encodeURIComponent(product.productName || ''),
      'baseUnit=' + encodeURIComponent(product.baseUnitCode || 'G'),
      'shelfLifeMinutes=' + encodeURIComponent(product.shelfLifeMinutes || ''),
    ];
    if (versionId) query.push('versionId=' + versionId);
    wx.navigateTo({ url: '/subPackage-preparation/pages/recipe/recipe?' + query.join('&') });
  },

  toLoss: function () {
    wx.navigateTo({ url: '/subPackage-preparation/pages/lossAnalysis/lossAnalysis?productId=' + this.data.id });
  },
  noop: function () {},
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
