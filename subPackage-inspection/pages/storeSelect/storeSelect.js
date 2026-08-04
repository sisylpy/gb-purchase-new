var app = getApp();
var api = require('../../../services/franchiseInspection');
var util = require('../../../utils/franchiseInspection');

Page({
  data: { navBarHeight: 0, loading: true, stores: [], filtered: [], keyword: '', selectedId: 0, creating: false, error: '', createError: '' },

  onLoad: function () {
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR });
    this.loadStores();
  },

  loadStores: function () {
    var that = this;
    this.setData({ loading: true, error: '' });
    return api.bootstrapIdentity().then(function (identity) {
      if (!util.hasAction(identity, 'INSPECTION_CREATE')) {
        return Promise.reject({ inspectionError: true, status: 403, message: '当前身份没有创建巡店权限' });
      }
      that.identity = identity;
      return api.listStores();
    }).then(function (stores) {
      return Promise.all((stores || []).map(function (store) {
        return Promise.all([
          api.listInspections({ storeId: store.storeId, page: 1, pageSize: 1 }),
          api.listInspections({ storeId: store.storeId, status: 'DRAFT', page: 1, pageSize: 1 }),
          api.listInspections({ storeId: store.storeId, status: 'IN_PROGRESS', page: 1, pageSize: 1 }),
          api.listInspections({ storeId: store.storeId, status: 'SUBMITTED', page: 1, pageSize: 1 }),
        ]).then(function (results) {
          var latest = results[0] && results[0].items && results[0].items[0];
          return Object.assign({}, store, {
            recentInspection: latest ? util.formatTime(latest.startedAt) : '暂无巡店记录',
            unfinished: [results[1], results[2], results[3]].some(function (result) { return Number(result && result.total || 0) > 0; }),
          });
        }).catch(function () {
          return Object.assign({}, store, { recentInspection: '暂时无法加载', unfinished: false, summaryUnavailable: true });
        });
      }));
    }).then(function (stores) {
      that.setData({ loading: false, stores: stores, filtered: stores });
    }).catch(function (error) {
      that.setData({ loading: false, error: error.message || '门店加载失败' });
      util.showError(error);
    });
  },

  onSearch: function (event) {
    var keyword = String(event.detail.value || '').trim().toLowerCase();
    var filtered = this.data.stores.filter(function (store) {
      return String(store.storeName || '').toLowerCase().indexOf(keyword) >= 0;
    });
    this.setData({ keyword: event.detail.value, filtered: filtered });
  },

  selectStore: function (event) { this.setData({ selectedId: Number(event.currentTarget.dataset.id) }); },

  createInspection: function () {
    if (!this.data.selectedId || this.data.creating) return;
    var store = this.data.stores.find(function (row) { return Number(row.storeId) === Number(this.data.selectedId); }, this);
    if (!store) return;
    var that = this;
    this.setData({ creating: true, createError: '' });
    api.createInspection({ storeId: store.storeId, startedAt: util.localDateTime(), summary: '门店现场巡店' })
      .then(function (inspection) {
        wx.redirectTo({
          url: '/subPackage-inspection/pages/inspectionRecord/inspectionRecord?inspectionId=' + inspection.inspectionId + '&storeId=' + store.storeId,
        });
      }).catch(function (error) {
        that.setData({ creating: false, createError: error.message || '巡店单创建失败' });
        util.showError(error);
      });
  },

  retry: function () { this.loadStores(); },
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
