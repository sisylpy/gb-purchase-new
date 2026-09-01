var app = getApp();
var api = require('../../../services/franchiseInspection');
var util = require('../../../utils/franchiseInspection');

function total(result) {
  return result && typeof result.total !== 'undefined' ? Number(result.total) : null;
}

Page({
  data: {
    navBarHeight: 0,
    loading: true,
    error: '',
    identity: null,
    stores: [],
    stats: [],
    tabs: [
      { key: 'PENDING_ACCEPTANCE', label: '待接受' },
      { key: 'IN_PROGRESS', label: '整改中' },
      { key: 'REJECTED', label: '被退回' },
      { key: 'PENDING_REVIEW', label: '待复核' },
      { key: 'COMPLETED', label: '已完成' },
    ],
    activeTab: 'PENDING_ACCEPTANCE',
    items: [],
    listLoading: false,
    listError: '',
    statsError: '',
    isFranchiseeOwner: false,
    currentScope: 'STORE',
    selectedStoreId: null,
    ownerSummary: null,
    recipeVersions: [],
  },

  onLoad: function () {
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR });
    this.loadAll();
  },

  onShow: function () {
    if (this.ready) {
      if (this.data.isFranchiseeOwner) {
        this.loadOwnerScope();
      } else {
        this.loadStats();
        this.loadList();
      }
    }
  },

  onPullDownRefresh: function () {
    this.loadAll().finally(function () { wx.stopPullDownRefresh(); });
  },

  loadAll: function () {
    var that = this;
    this.setData({ loading: true, error: '', listError: '', statsError: '' });
    return api.bootstrapIdentity().then(function (identity) {
      var isOwner = (identity.roles || []).some(function (role) {
        return role.code === 'FRANCHISEE_OWNER';
      });
      if (!isOwner && !util.hasAction(identity, 'RECTIFICATION_LIST_MINE')) {
        return Promise.reject({ message: '当前账号不是加盟店负责人，不能查看总部任务' });
      }
      var storesRequest = isOwner
        ? Promise.resolve(identity.accessibleStores || [])
        : api.listStores();
      return storesRequest.then(function (stores) {
        var firstStoreId = stores && stores.length ? stores[0].storeId : null;
        that.ready = true;
        that.setData({
          loading: false,
          identity: identity,
          stores: stores || [],
          isFranchiseeOwner: isOwner,
          currentScope: isOwner && (stores || []).length > 1 ? 'ALL_STORES' : 'STORE',
          selectedStoreId: identity.currentStoreId || firstStoreId || null
        });
        if (isOwner) return that.loadOwnerScope();
        return Promise.all([that.loadStats(), that.loadList()]);
      });
    }).catch(function (error) {
      that.ready = false;
      that.setData({ loading: false, error: error.message || '总部任务加载失败' });
      util.showError(error);
    });
  },

  loadOwnerScope: function () {
    if (!this.data.isFranchiseeOwner) return Promise.resolve();
    var storeId = this.data.currentScope === 'STORE' ? this.data.selectedStoreId : null;
    var summaryRequest = storeId
      ? api.getStoreOperationOverview(storeId).then(function (detail) {
          var summary = (detail && detail.summary) || {};
          return Object.assign({ storeCount: 1 }, summary);
        })
      : api.getFranchiseeOperations();
    return summaryRequest.then(function (summary) {
      this.setData({ ownerSummary: summary || null });
      if (storeId) return api.listStoreRecipeVersions(storeId);
      return [];
    }.bind(this)).then(function (versions) {
      this.setData({ recipeVersions: versions || [] });
    }.bind(this)).catch(function (error) {
      util.showError(error);
    });
  },

  selectAllStores: function () {
    this.setData({ currentScope: 'ALL_STORES', selectedStoreId: null });
    this.loadOwnerScope();
  },

  selectOwnerStore: function (event) {
    var storeId = Number(event.currentTarget.dataset.storeid);
    if (!storeId) return;
    this.setData({ currentScope: 'STORE', selectedStoreId: storeId });
    this.loadOwnerScope();
  },

  applyRecipeVersion: function (event) {
    var item = event.currentTarget.dataset.item;
    if (!item || item.syncStatus !== 'UPDATE_AVAILABLE') return;
    util.confirm('应用总部新配方', item.foodName + ' 将从 V' + item.currentAppliedVersionNo
      + ' 切换到 V' + item.latestPublishedVersionNo + '，旧版本历史会保留。').then(function (confirmed) {
      if (!confirmed) return;
      return api.applyLatestRecipeVersion(item.adoptionId, {
        latestPublishedVersionId: item.latestPublishedVersionId,
        rowVersion: item.rowVersion
      }).then(function () {
        wx.showToast({ title: '已应用新版本', icon: 'success' });
        this.loadOwnerScope();
      }.bind(this)).catch(util.showError);
    }.bind(this));
  },

  loadStats: function () {
    var that = this;
    var identity = this.data.identity;
    if (!identity) return Promise.resolve();
    var statuses = ['PENDING_ACCEPTANCE', 'IN_PROGRESS', 'REJECTED', 'PENDING_REVIEW', 'COMPLETED'];
    return Promise.all(statuses.map(function (status) {
      return api.listTasks({ status: status, assigneeUserId: identity.userId, page: 1, pageSize: 1 });
    })).then(function (rows) {
      that.setData({ statsError: '', stats: [
        { value: total(rows[0]), label: '待接受' },
        { value: total(rows[1]), label: '整改中' },
        { value: total(rows[2]), label: '被退回' },
        { value: total(rows[3]), label: '待复核' },
        { value: total(rows[4]), label: '已完成' },
      ] });
    }).catch(function () { that.setData({ statsError: '统计暂时无法加载' }); });
  },

  selectTab: function (event) {
    this.setData({ activeTab: event.currentTarget.dataset.key });
    this.loadList();
  },

  loadList: function () {
    var that = this;
    var identity = this.data.identity;
    if (!identity) return Promise.resolve();
    this.setData({ listLoading: true, listError: '' });
    return api.listAllTasks({ status: this.data.activeTab, assigneeUserId: identity.userId })
      .then(function (rows) { return that.decorateTasks(rows); })
      .then(function (items) { that.setData({ listLoading: false, items: items }); })
      .catch(function (error) {
        that.setData({ listLoading: false, listError: error.message || '任务列表加载失败' });
        util.showError(error);
      });
  },

  decorateTasks: function (rows) {
    var storeMap = {};
    this.data.stores.forEach(function (store) {
      storeMap[String(store.storeId)] = store.storeName || '未命名门店';
    });
    return Promise.all((rows || []).map(function (task) {
      return api.getTask(task.rectificationTaskId);
    })).then(function (details) {
      return details.map(function (detail) {
        var task = detail.task;
        var issue = detail.issue || {};
        return Object.assign({}, task, {
          displayTitle: issue.title || '整改问题',
          storeName: storeMap[String(task.storeId)] || '未命名门店',
          issueTime: issue.reportedAt ? util.formatTime(issue.reportedAt) : '暂无',
          displayTime: util.formatTime(task.dueAt),
          displayStatus: util.statusLabel(task.status),
          statusClass: util.statusClass(task.status),
        });
      });
    });
  },

  openTask: function (event) {
    var item = this.data.items[Number(event.currentTarget.dataset.index)];
    if (item) wx.navigateTo({ url: '/subPackage-inspection/pages/taskDetail/taskDetail?taskId=' + item.rectificationTaskId });
  },

  retry: function () { this.loadAll(); },
  retryList: function () { this.loadList(); },
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
