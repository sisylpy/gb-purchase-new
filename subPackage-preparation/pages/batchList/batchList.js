var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');

Page({
  data: {
    navBarHeight: 0,
    loading: true,
    status: '',
    keyword: '',
    selectAction: '',
    batches: [],
    filteredBatches: [],
    tabs: [
      { value: '', label: '全部' },
      { value: 'DRAFT', label: '待领料' },
      { value: 'MATERIALS_ISSUED', label: '待完成' },
      { value: 'COMPLETED', label: '已完成' },
      { value: 'CLOSED', label: '已关闭' },
      { value: 'ISSUE_REVERSED', label: '领料已冲销' },
      { value: 'EXPIRED', label: '已过期' },
    ],
  },

  onLoad: function (options) {
    this.identity = util.getIdentity();
    this.departmentId = wx.getStorageSync('preparationDepartmentId');
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      status: options.status || '',
      selectAction: options.selectAction || '',
    });
  },
  onShow: function () { this.loadBatches(); },
  onPullDownRefresh: function () { this.loadBatches().then(function () { wx.stopPullDownRefresh(); }); },

  loadBatches: function () {
    var that = this;
    var serverStatus = this.data.status === 'EXPIRED' ? null : this.data.status;
    this.setData({ loading: true });
    return api.listBatches({
      distributerId: this.identity.distributerId,
      departmentId: this.departmentId,
      status: serverStatus,
    }).then(function (rows) {
      rows = rows || [];
      var needDetails = rows.filter(function (row) {
        return row.status === 'COMPLETED' || row.status === 'CLOSED';
      });
      var detailMap = {};
      var productMap = {};
      var productIds = [];
      needDetails.forEach(function (row) {
        if (productIds.indexOf(row.intermediateProductId) < 0) productIds.push(row.intermediateProductId);
      });
      var detailPromise = Promise.all(needDetails.map(function (row) {
        return api.getBatch(row.batchId, that.identity.distributerId).then(function (detail) {
          detailMap[String(row.batchId)] = detail;
        });
      }));
      var productPromise = Promise.all(productIds.map(function (productId) {
        return api.getProduct(productId, that.identity.distributerId).then(function (product) {
          productMap[String(productId)] = product;
        });
      }));
      return Promise.all([detailPromise, productPromise]).then(function () {
        var decorated = rows.map(function (row) {
          var detail = detailMap[String(row.batchId)] || row;
          var product = productMap[String(row.intermediateProductId)] || {};
          return Object.assign({}, row, detail, {
            statusLabel: util.statusLabel(row.status),
            statusClass: util.statusClass(row.status),
            availabilityLabel: util.statusLabel(detail.availabilityStatus),
            availabilityClass: util.statusClass(detail.availabilityStatus),
            createdText: util.timePart(row.createdAt),
            baseUnitCode: product.baseUnitCode || '',
          });
        });
        if (that.data.status === 'EXPIRED') {
          decorated = decorated.filter(function (row) { return row.availabilityStatus === 'EXPIRED'; });
        }
        that.setData({ loading: false, batches: decorated });
        that.applyFilter();
      });
    }).catch(function (error) {
      that.setData({ loading: false, batches: [], filteredBatches: [] });
      util.showError(error);
    });
  },

  onTabTap: function (event) {
    this.setData({ status: event.currentTarget.dataset.value || '' });
    this.loadBatches();
  },
  onSearch: function (event) { this.setData({ keyword: event.detail.value || '' }); this.applyFilter(); },
  applyFilter: function () {
    var keyword = String(this.data.keyword || '').trim().toLowerCase();
    this.setData({
      filteredBatches: (this.data.batches || []).filter(function (row) {
        if (!keyword) return true;
        return String(row.batchNo || '').toLowerCase().indexOf(keyword) >= 0 ||
          String(row.intermediateProductName || '').toLowerCase().indexOf(keyword) >= 0;
      }),
    });
  },
  toBatch: function (event) {
    var row = event.currentTarget.dataset.item;
    if (this.data.selectAction === 'discard') {
      if ((row.status !== 'COMPLETED' && row.status !== 'CLOSED') || Number(row.remainingQuantity || 0) <= 0) {
        wx.showToast({ title: '该批次当前不可废弃', icon: 'none' });
        return;
      }
      wx.navigateTo({ url: '/subPackage-preparation/pages/discard/discard?batchId=' + row.batchId });
      return;
    }
    wx.navigateTo({ url: '/subPackage-preparation/pages/batchDetail/batchDetail?batchId=' + row.batchId });
  },
  toCreate: function () { wx.navigateTo({ url: '/subPackage-preparation/pages/batchCreate/batchCreate' }); },
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
