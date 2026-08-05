var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');

Page({
  data: {
    navBarHeight: 0,
    loading: true,
    keyword: '',
    status: '',
    products: [],
    filteredProducts: [],
    tabs: [
      { value: '', label: '全部' },
      { value: 'ENABLED', label: '启用' },
      { value: 'DISABLED', label: '停用' },
    ],
  },
  onLoad: function () { this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR }); },
  onShow: function () { this.loadProducts(); },
  onPullDownRefresh: function () { this.loadProducts().then(function () { wx.stopPullDownRefresh(); }); },
  loadProducts: function () {
    var that = this;
    this.setData({ loading: true });
    return api.listStoreProducts(this.data.status).then(function (rows) {
      rows = (rows || []).map(function (row) {
        return Object.assign({}, row, {
          statusLabel: util.statusLabel(row.status),
          statusClass: util.statusClass(row.status),
          recipeText: row.recipeConfigured ? '配方已启用' : '未维护配方',
        });
      });
      that.setData({ loading: false, products: rows });
      that.applyFilter();
    }).catch(function (error) {
      that.setData({ loading: false, products: [], filteredProducts: [] });
      util.showError(error);
    });
  },
  onTabTap: function (event) { this.setData({ status: event.currentTarget.dataset.value || '' }); this.loadProducts(); },
  onSearch: function (event) { this.setData({ keyword: event.detail.value || '' }); this.applyFilter(); },
  applyFilter: function () {
    var keyword = String(this.data.keyword || '').trim().toLowerCase();
    this.setData({ filteredProducts: (this.data.products || []).filter(function (row) {
      return !keyword || String(row.productName || '').toLowerCase().indexOf(keyword) >= 0;
    }) });
  },
  toCreate: function () { wx.navigateTo({ url: '/subPackage-preparation/pages/storeProductForm/storeProductForm' }); },
  toDetail: function (event) { wx.navigateTo({ url: '/subPackage-preparation/pages/storeProductDetail/storeProductDetail?id=' + event.currentTarget.dataset.id }); },
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
