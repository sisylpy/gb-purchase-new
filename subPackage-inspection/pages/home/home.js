var app = getApp();
var api = require('../../../services/franchiseInspection');
var util = require('../../../utils/franchiseInspection');

function total(result) { return result && typeof result.total !== 'undefined' ? Number(result.total) : null; }

Page({
  data: {
    navBarHeight: 0,
    loading: true,
    error: '',
    identity: null,
    mode: '',
    isInspector: false,
    isManager: false,
    isReadOnly: false,
    stores: [],
    stats: [],
    tabs: [],
    activeTab: '',
    items: [],
    listLoading: false,
  },

  onLoad: function () {
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR });
    this.loadAll();
  },

  onShow: function () {
    if (this.ready) {
      this.loadStats();
      this.loadList();
    }
  },

  onPullDownRefresh: function () {
    var that = this;
    this.loadAll().then(function () { wx.stopPullDownRefresh(); })
      .catch(function () { wx.stopPullDownRefresh(); });
  },

  loadAll: function () {
    var that = this;
    this.setData({ loading: true, error: '' });
    return api.bootstrapIdentity().then(function (identity) {
      return api.listStores().then(function (stores) {
        var isInspector = util.hasAction(identity, 'INSPECTION_CREATE') || util.hasAction(identity, 'RECTIFICATION_REVIEW');
        var isManager = util.hasAction(identity, 'RECTIFICATION_LIST_MINE');
        var mode = that.data.mode || (isInspector ? 'inspector' : (isManager ? 'manager' : 'readonly'));
        that.ready = true;
        that.setData({
          loading: false,
          identity: identity,
          stores: stores || [],
          isInspector: isInspector,
          isManager: isManager,
          isReadOnly: !isInspector && !isManager,
          mode: mode,
        });
        that.configureMode(mode);
        return Promise.all([that.loadStats(), that.loadList()]);
      });
    }).catch(function (error) {
      that.ready = false;
      that.setData({ loading: false, error: error.message || '巡店权限加载失败' });
      util.showError(error);
    });
  },

  configureMode: function (mode) {
    var tabs;
    if (mode === 'manager') {
      tabs = [
        { key: 'PENDING_ACCEPTANCE', label: '待接受' },
        { key: 'IN_PROGRESS', label: '整改中' },
        { key: 'REJECTED', label: '被退回' },
        { key: 'PENDING_REVIEW', label: '待复核' },
        { key: 'COMPLETED', label: '已完成' },
      ];
    } else if (mode === 'readonly') {
      tabs = [{ key: 'all', label: '可见巡店' }, { key: 'COMPLETED', label: '已完成' }];
    } else {
      tabs = [
        { key: 'active', label: '进行中' },
        { key: 'all', label: '我的巡店' },
        { key: 'review', label: '待我复核' },
        { key: 'COMPLETED', label: '已完成巡店' },
      ];
    }
    var active = tabs.some(function (tab) { return tab.key === this.data.activeTab; }, this)
      ? this.data.activeTab : tabs[0].key;
    this.setData({ mode: mode, tabs: tabs, activeTab: active, items: [] });
  },

  switchMode: function (event) {
    var mode = event.currentTarget.dataset.mode;
    if (mode === this.data.mode) return;
    this.configureMode(mode);
    this.loadStats();
    this.loadList();
  },

  loadStats: function () {
    var that = this;
    var identity = this.data.identity;
    if (!identity) return Promise.resolve();
    if (this.data.mode === 'manager') {
      return Promise.all([
        api.listTasks({ status: 'PENDING_ACCEPTANCE', assigneeUserId: identity.userId, page: 1, pageSize: 1 }),
        api.listTasks({ status: 'IN_PROGRESS', assigneeUserId: identity.userId, page: 1, pageSize: 1 }),
        api.listTasks({ status: 'PENDING_REVIEW', assigneeUserId: identity.userId, page: 1, pageSize: 1 }),
        api.listTasks({ status: 'COMPLETED', assigneeUserId: identity.userId, page: 1, pageSize: 1 }),
      ]).then(function (rows) {
        that.setData({ stats: [
          { value: total(rows[0]), label: '待接受' },
          { value: total(rows[1]), label: '整改中' },
          { value: total(rows[2]), label: '待复核' },
          { value: total(rows[3]), label: '已完成' },
        ] });
      }).catch(function () { that.setData({ stats: [] }); });
    }
    var from = util.localDate(0) + 'T00:00:00';
    var to = util.localDate(1) + 'T00:00:00';
    return Promise.all([
      api.listInspections({ inspectorUserId: identity.userId, createdFrom: from, createdTo: to, page: 1, pageSize: 1 }),
      api.listInspections({ inspectorUserId: identity.userId, status: 'DRAFT', page: 1, pageSize: 1 }),
      api.listInspections({ inspectorUserId: identity.userId, status: 'IN_PROGRESS', page: 1, pageSize: 1 }),
      api.listTasks({ status: 'PENDING_REVIEW', reviewerUserId: identity.userId, page: 1, pageSize: 1 }),
      api.listInspections({ inspectorUserId: identity.userId, status: 'COMPLETED', page: 1, pageSize: 1 }),
    ]).then(function (rows) {
      that.setData({ stats: [
        { value: total(rows[0]), label: '今日巡店' },
        { value: total(rows[1]) === null || total(rows[2]) === null ? null : total(rows[1]) + total(rows[2]), label: '进行中' },
        { value: total(rows[3]), label: '待复核' },
        { value: total(rows[4]), label: '已完成' },
      ] });
    }).catch(function () { that.setData({ stats: [] }); });
  },

  selectTab: function (event) {
    this.setData({ activeTab: event.currentTarget.dataset.key });
    this.loadList();
  },

  loadList: function () {
    var that = this;
    var tab = this.data.activeTab;
    var identity = this.data.identity;
    if (!tab || !identity) return Promise.resolve();
    this.setData({ listLoading: true, error: '' });
    var request;
    if (this.data.mode === 'manager') {
      request = api.listTasks({ status: tab, assigneeUserId: identity.userId, page: 1, pageSize: 20 }).then(function (page) {
        return that.decorateTasks((page && page.items) || [], { status: tab, assigneeUserId: identity.userId });
      });
    } else if (tab === 'review') {
      request = api.listTasks({ status: 'PENDING_REVIEW', reviewerUserId: identity.userId, page: 1, pageSize: 20 })
        .then(function (page) { return that.decorateTasks((page && page.items) || [], { status: 'PENDING_REVIEW', reviewerUserId: identity.userId }); });
    } else {
      var queries = tab === 'active'
        ? [{ inspectorUserId: identity.userId, status: 'DRAFT', page: 1, pageSize: 20 }, { inspectorUserId: identity.userId, status: 'IN_PROGRESS', page: 1, pageSize: 20 }]
        : [{ inspectorUserId: this.data.mode === 'readonly' ? '' : identity.userId, status: tab === 'all' ? '' : tab, page: 1, pageSize: 20 }];
      request = Promise.all(queries.map(function (query) { return api.listInspections(query); })).then(function (pages) {
        var rows = [];
        pages.forEach(function (page) { rows = rows.concat((page && page.items) || []); });
        return that.decorateInspections(rows);
      });
    }
    return request.then(function (items) {
      that.setData({ listLoading: false, items: items });
    }).catch(function (error) {
      that.setData({ listLoading: false, items: [], error: error.message || '列表加载失败' });
      util.showError(error);
    });
  },

  decorateInspections: function (rows) {
    var storeMap = {};
    this.data.stores.forEach(function (store) { storeMap[String(store.storeId)] = store.storeName || ('门店 ' + store.storeId); });
    return (rows || []).map(function (row) {
      return Object.assign({}, row, {
        itemType: 'inspection',
        listKey: 'inspection-' + row.inspectionId,
        displayTitle: storeMap[String(row.storeId)] || ('门店 ' + row.storeId),
        displayNo: row.inspectionNo || ('巡店 #' + row.inspectionId),
        displayTime: util.formatTime(row.startedAt),
        displayStatus: util.statusLabel(row.status),
        statusClass: util.statusClass(row.status),
      });
    });
  },

  decorateTasks: function (rows, query) {
    var that = this;
    var storeMap = {};
    this.data.stores.forEach(function (store) { storeMap[String(store.storeId)] = store.storeName || ('门店 ' + store.storeId); });
    return Promise.all([
      Promise.all((rows || []).map(function (task) { return api.getTask(task.rectificationTaskId); })),
      api.listTasks(Object.assign({}, query || {}, { overdue: true, page: 1, pageSize: 100 })),
    ]).then(function (results) {
      var overdueIds = {};
      ((results[1] && results[1].items) || []).forEach(function (task) { overdueIds[String(task.rectificationTaskId)] = true; });
      return Promise.all(results[0].map(function (detail) {
        return detail.issue && detail.issue.inspectionId ? api.getInspection(detail.issue.inspectionId) : Promise.resolve(null);
      })).then(function (inspectionDetails) {
        return results[0].map(function (detail, index) {
          var task = detail.task;
          var issue = detail.issue || {};
          var inspection = inspectionDetails[index] && inspectionDetails[index].inspection;
          return Object.assign({}, task, {
            itemType: 'task',
            listKey: 'task-' + task.rectificationTaskId,
            displayTitle: issue.title || ('问题 ' + task.issueId),
            storeName: storeMap[String(task.storeId)] || ('门店 ' + task.storeId),
            inspectionTime: inspection ? util.formatTime(inspection.startedAt) : '—',
            inspectorLabel: inspection ? ('巡店员 #' + inspection.inspectorUserId) : '巡店员 —',
            displayTime: util.formatTime(task.dueAt),
            displayStatus: util.statusLabel(task.status),
            statusClass: util.statusClass(task.status),
            overdue: !!overdueIds[String(task.rectificationTaskId)],
          });
        });
      });
    });
  },

  startInspection: function () { wx.navigateTo({ url: '/subPackage-inspection/pages/storeSelect/storeSelect' }); },

  openItem: function (event) {
    var item = this.data.items[Number(event.currentTarget.dataset.index)];
    if (!item) return;
    if (item.itemType === 'task') {
      wx.navigateTo({ url: '/subPackage-inspection/pages/taskDetail/taskDetail?taskId=' + item.rectificationTaskId });
    } else {
      wx.navigateTo({ url: '/subPackage-inspection/pages/inspectionDetail/inspectionDetail?inspectionId=' + item.inspectionId });
    }
  },

  retry: function () { this.loadAll(); },
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
