var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');

var unitLabels = { G: '克', KG: '千克', JIN: '斤', ML: '毫升', L: '升', EA: '个' };

Page({
  data: {
    navBarHeight: 0,
    loading: true,
    keyword: '',
    filter: '',
    products: [],
    filteredProducts: [],
    tabs: [
      { value: '', label: '全部' },
      { value: 'READY', label: '使用中' },
      { value: 'INCOMPLETE', label: '待完善' },
      { value: 'DISABLED', label: '已停用' },
    ],
  },

  onLoad: function () {
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR });
  },

  onShow: function () { this.loadProducts(); },

  onPullDownRefresh: function () {
    this.loadProducts().then(function () { wx.stopPullDownRefresh(); });
  },

  loadProducts: function () {
    var that = this;
    this.setData({ loading: true });
    return api.listStoreProducts('').then(function (rows) {
      return Promise.all((rows || []).map(function (row) {
        if (!row.recipeConfigured) return Promise.resolve(that.decorateProduct(row, null));
        return api.getStoreRecipe(row.id).then(function (recipe) {
          return that.decorateProduct(row, recipe || {});
        }).catch(function () {
          return that.decorateProduct(row, null);
        });
      }));
    }).then(function (rows) {
      that.setData({ loading: false, products: rows || [] });
      that.applyFilter();
    }).catch(function (error) {
      that.setData({ loading: false, products: [], filteredProducts: [] });
      util.showError(error);
    });
  },

  decorateProduct: function (row, recipe) {
    var disabled = row.status === 'DISABLED';
    var ingredientCount = recipe && recipe.components ? recipe.components.length : 0;
    var ready = !disabled && row.recipeConfigured;
    return Object.assign({}, row, {
      usageUnitLabel: unitLabels[row.usageUnitCode] || row.usageUnitCode || '—',
      ingredientCount: ingredientCount,
      standardOutputText: recipe && recipe.standardOutputQuantity != null
        ? util.formatNumber(recipe.standardOutputQuantity, 6) + ' ' + (unitLabels[recipe.standardOutputUnitCode] || recipe.standardOutputUnitCode || '')
        : '—',
      displayState: disabled ? 'DISABLED' : (ready ? 'READY' : 'INCOMPLETE'),
      displayStateLabel: disabled ? '已停用' : (ready ? '使用中' : '待完善'),
      displayStateClass: disabled ? 'status-muted' : (ready ? 'status-success' : 'status-warning'),
      statusSummaryText: !row.recipeConfigured
        ? '配方待完善 · 请补充标准产出和组成原料'
        : (disabled
          ? '配方已完成 · 当前已停用'
          : '配方已完成 · 菜品使用时自动按比例展开'),
      statusSummaryIcon: row.recipeConfigured ? '✓' : '!',
      statusSummaryClass: ready ? 'summary-ready' : (disabled ? 'summary-muted' : 'summary-warning'),
    });
  },

  onTabTap: function (event) {
    this.setData({ filter: event.currentTarget.dataset.value || '' });
    this.applyFilter();
  },

  onSearch: function (event) {
    this.setData({ keyword: event.detail.value || '' });
    this.applyFilter();
  },

  applyFilter: function () {
    var keyword = String(this.data.keyword || '').trim().toLowerCase();
    var filter = this.data.filter;
    this.setData({
      filteredProducts: (this.data.products || []).filter(function (row) {
        var matchesState = !filter || row.displayState === filter;
        var matchesKeyword = !keyword || String(row.productName || '').toLowerCase().indexOf(keyword) >= 0;
        return matchesState && matchesKeyword;
      }),
    });
  },

  toCreate: function () {
    wx.navigateTo({ url: '/subPackage-preparation/pages/storeProductForm/storeProductForm' });
  },

  toDetail: function (event) {
    wx.navigateTo({ url: '/subPackage-preparation/pages/storeProductDetail/storeProductDetail?id=' + event.currentTarget.dataset.id });
  },

  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
