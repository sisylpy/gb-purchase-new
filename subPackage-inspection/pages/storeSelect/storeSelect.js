var app = getApp();
var api = require('../../../services/franchiseInspection');
var util = require('../../../utils/franchiseInspection');

Page({
  data: { navBarHeight: 0, loading: true, stores: [], filtered: [], keyword: '', selectedId: 0, creating: false, pendingCreate: false, pendingStoreName: '', error: '', createError: '' },

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
      that.createScope = 'inspection-create:' + identity.userId;
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
      var pending = util.readPersistentCommand(that.createScope);
      var pendingStore = pending && stores.find(function (row) { return Number(row.storeId) === Number(pending.storeId); });
      that.setData({
        loading: false,
        stores: stores,
        filtered: stores,
        selectedId: pendingStore ? Number(pendingStore.storeId) : that.data.selectedId,
        pendingCreate: !!pendingStore,
        pendingStoreName: pendingStore ? pendingStore.storeName : '',
      });
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

  selectStore: function (event) {
    var selectedId = Number(event.currentTarget.dataset.id);
    var pending = util.readPersistentCommand(this.createScope);
    if (pending && Number(pending.storeId) !== selectedId) {
      wx.showToast({ title: '请先重试完成上次创建请求', icon: 'none' });
      return;
    }
    this.setData({ selectedId: selectedId });
  },

  createInspection: function () {
    if (!this.data.selectedId || this.data.creating) return;
    var store = this.data.stores.find(function (row) { return Number(row.storeId) === Number(this.data.selectedId); }, this);
    if (!store) return;
    var that = this;
    this.setData({ creating: true, createError: '' });
    var scope = this.createScope;
    var command = util.persistentCommand(scope, function () { return {
      idempotencyKey: util.persistentKey(scope, 'inspection-create'),
      storeId: store.storeId,
      startedAt: util.localDateTime(),
      summary: '门店现场巡店',
    }; });
    api.createInspection(command)
      .then(function (inspection) {
        util.clearPersistentKey(scope);
        util.clearPersistentCommand(scope);
        wx.redirectTo({
          url: '/subPackage-inspection/pages/inspectionRecord/inspectionRecord?inspectionId=' + inspection.inspectionId + '&storeId=' + command.storeId,
        });
      }).catch(function (error) {
        that.setData({ creating: false, pendingCreate: true, pendingStoreName: store.storeName, createError: error.message || '巡店单创建失败' });
        util.showError(error);
      });
  },

  retry: function () { this.loadStores(); },
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
