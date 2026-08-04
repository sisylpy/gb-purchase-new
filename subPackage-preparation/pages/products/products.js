var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');

Page({
  data: {
    navBarHeight: 0,
    loading: true,
    status: '',
    keyword: '',
    products: [],
    filteredProducts: [],
    tabs: [
      { value: '', label: '全部' },
      { value: 'ENABLED', label: '启用' },
      { value: 'DISABLED', label: '停用' },
    ],
  },

  onLoad: function () {
    this.identity = util.getIdentity();
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR });
  },

  onShow: function () { this.loadProducts(); },
  onPullDownRefresh: function () {
    this.loadProducts().then(function () { wx.stopPullDownRefresh(); });
  },

  loadProducts: function () {
    var that = this;
    if (!this.identity.distributerId) {
      this.setData({ loading: false });
      return Promise.resolve();
    }
    this.setData({ loading: true });
    return api.listProducts(this.identity.distributerId, this.data.status).then(function (rows) {
      rows = rows || [];
      return Promise.all(rows.map(function (row) {
        return api.listPublishedRecipeVersions(row.id, that.identity.distributerId).then(function (versions) {
          versions = versions || [];
          var current = versions[0] || null;
          return Object.assign({}, row, {
            shelfLifeText: that.formatShelfLife(row.shelfLifeMinutes),
            statusLabel: util.statusLabel(row.status),
            statusClass: util.statusClass(row.status),
            currentRecipeText: current ? 'V' + current.recipeVersionNo : '未发布',
            recipeId: current ? current.recipeId : null,
          });
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

  formatShelfLife: function (minutes) {
    var value = Number(minutes || 0);
    if (value && value % 1440 === 0) return value / 1440 + '天';
    if (value && value % 60 === 0) return value / 60 + '小时';
    return value + '分钟';
  },

  onTabTap: function (event) {
    this.setData({ status: event.currentTarget.dataset.value || '' });
    this.loadProducts();
  },

  onSearch: function (event) {
    this.setData({ keyword: event.detail.value || '' });
    this.applyFilter();
  },

  applyFilter: function () {
    var keyword = String(this.data.keyword || '').trim().toLowerCase();
    var rows = (this.data.products || []).filter(function (row) {
      if (!keyword) return true;
      return String(row.productName || '').toLowerCase().indexOf(keyword) >= 0 ||
        String(row.productCode || '').toLowerCase().indexOf(keyword) >= 0;
    });
    this.setData({ filteredProducts: rows });
  },

  toCreate: function () {
    wx.navigateTo({ url: '/subPackage-preparation/pages/productForm/productForm' });
  },

  toDetail: function (event) {
    var row = event.currentTarget.dataset.item;
    var query = 'id=' + row.id;
    if (row.recipeId) query += '&recipeId=' + row.recipeId;
    wx.navigateTo({ url: '/subPackage-preparation/pages/productDetail/productDetail?' + query });
  },

  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
