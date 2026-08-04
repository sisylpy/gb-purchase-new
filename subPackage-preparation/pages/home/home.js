var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');

function sameDay(value, day) {
  return !!value && String(value).slice(0, 10) === day;
}

Page({
  data: {
    navBarHeight: 0,
    loading: true,
    accessDenied: false,
    accessMessage: '',
    departments: [],
    departmentIndex: 0,
    department: null,
    stats: {
      pendingProduction: null,
      issueIncomplete: null,
      completedToday: null,
      expiringSoon: null,
      expired: null,
      useToday: null,
      discardToday: null,
    },
    statsError: '',
  },

  onLoad: function () {
    this.identity = util.getIdentity();
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR });
    this.loadAccess();
  },

  onShow: function () {
    if (this.accessReady) this.loadDashboard();
  },

  onPullDownRefresh: function () {
    var that = this;
    this.loadAccess().then(function () { wx.stopPullDownRefresh(); })
      .catch(function () { wx.stopPullDownRefresh(); });
  },

  loadAccess: function () {
    var that = this;
    this.identity = util.getIdentity();
    if (!this.identity.distributerId || !this.identity.operatorId) {
      this.setData({
        loading: false,
        accessDenied: true,
        accessMessage: '登录身份缺少分销商或用户信息，无法进入备料管理。',
      });
      return Promise.resolve();
    }
    this.setData({ loading: true, accessDenied: false, accessMessage: '' });
    return api.listCapabilities(this.identity.distributerId).then(function (rows) {
      var departments = util.enabledPreparationDepartments(rows, that.identity);
      if (!departments.length) {
        that.accessReady = false;
        that.setData({
          loading: false,
          accessDenied: true,
          accessMessage: '当前门店部门未启用 PREPARATION 能力，或当前用户无权访问。',
          departments: [],
        });
        return;
      }
      var selected = util.selectCurrentDepartment(departments, that.identity);
      var selectedIndex = departments.findIndex(function (row) {
        return String(row.departmentId) === String(selected.departmentId);
      });
      wx.setStorageSync('preparationDepartmentId', selected.departmentId);
      that.accessReady = true;
      that.setData({
        loading: false,
        accessDenied: false,
        departments: departments,
        departmentIndex: selectedIndex < 0 ? 0 : selectedIndex,
        department: selected,
      });
      return that.loadDashboard();
    }).catch(function (error) {
      that.accessReady = false;
      that.setData({
        loading: false,
        accessDenied: true,
        accessMessage: error.message || '备料权限校验失败',
      });
      util.showError(error);
    });
  },

  onDepartmentChange: function (event) {
    var index = Number(event.detail.value || 0);
    var selected = this.data.departments[index];
    if (!selected) return;
    wx.setStorageSync('preparationDepartmentId', selected.departmentId);
    this.setData({ departmentIndex: index, department: selected });
    this.loadDashboard();
  },

  loadDashboard: function () {
    var that = this;
    var department = this.data.department;
    if (!department) return Promise.resolve();
    var params = {
      distributerId: this.identity.distributerId,
      departmentId: department.departmentId,
    };
    this.setData({ loading: true, statsError: '' });
    return Promise.all([
      api.listBatches(params),
      api.listFoodUses(params),
      api.listDiscards({ distributerId: this.identity.distributerId }),
    ]).then(function (results) {
      var batches = results[0] || [];
      var uses = results[1] || [];
      var discards = (results[2] || []).filter(function (row) {
        return String(row.departmentId) === String(department.departmentId);
      });
      var detailTargets = batches.filter(function (row) {
        return row.status === 'COMPLETED' || row.status === 'CLOSED';
      });
      return Promise.all(detailTargets.map(function (row) {
        return api.getBatch(row.batchId, that.identity.distributerId);
      })).then(function (details) {
        var today = util.localDate();
        var reversalIds = {};
        discards.forEach(function (row) {
          if (row.entryType === 'REVERSAL' && row.reversalOfId) reversalIds[String(row.reversalOfId)] = true;
        });
        var actualDiscards = discards.filter(function (row) {
          return row.entryType === 'DISCARD' && !reversalIds[String(row.discardId)];
        });
        that.setData({
          loading: false,
          stats: {
            pendingProduction: batches.filter(function (row) { return row.status === 'MATERIALS_ISSUED'; }).length,
            issueIncomplete: batches.filter(function (row) { return row.status === 'DRAFT'; }).length,
            completedToday: details.filter(function (row) { return sameDay(row.producedAt, today); }).length,
            // 后台当前没有“即将过期”聚合或 serverNow，不能用手机时钟擅自判定。
            expiringSoon: null,
            expired: details.filter(function (row) { return row.availabilityStatus === 'EXPIRED'; }).length,
            useToday: uses.filter(function (row) {
              return row.postingStatus === 'CONFIRMED' && sameDay(row.producedAt, today);
            }).length,
            discardToday: actualDiscards.filter(function (row) { return sameDay(row.createdAt, today); }).length,
          },
          statsError: '',
        });
      });
    }).catch(function (error) {
      that.setData({ loading: false, statsError: error.message || '统计加载失败' });
      util.showError(error);
    });
  },

  onStatTap: function (event) {
    var type = event.currentTarget.dataset.type;
    if (type === 'use' || type === 'discard') {
      wx.navigateTo({ url: '/subPackage-preparation/pages/records/records?type=' + type });
      return;
    }
    var query = type ? '?status=' + encodeURIComponent(type) : '';
    wx.navigateTo({ url: '/subPackage-preparation/pages/batchList/batchList' + query });
  },

  go: function (event) {
    var target = event.currentTarget.dataset.target;
    var routes = {
      create: '/subPackage-preparation/pages/batchCreate/batchCreate',
      products: '/subPackage-preparation/pages/products/products',
      batches: '/subPackage-preparation/pages/batchList/batchList',
      use: '/subPackage-preparation/pages/foodUse/foodUse',
      discard: '/subPackage-preparation/pages/batchList/batchList?selectAction=discard&status=COMPLETED',
      cost: '/subPackage-preparation/pages/costAnalysis/costAnalysis',
      loss: '/subPackage-preparation/pages/lossAnalysis/lossAnalysis',
    };
    if (routes[target]) wx.navigateTo({ url: routes[target] });
  },

  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
