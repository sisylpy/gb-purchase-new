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
    listError: '',
    statsError: '',
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
    this.setData({ loading: true, error: '', listError: '', statsError: '' });
    return api.bootstrapIdentity().then(function (identity) {
      return api.listStores().then(function (stores) {
        var isInspector = util.hasAction(identity, 'INSPECTION_CREATE') || util.hasAction(identity, 'RECTIFICATION_REVIEW');
        var isManager = util.hasAction(identity, 'RECTIFICATION_LIST_MINE');
        var previousMode = that.data.mode;
        var previousAllowed = (previousMode === 'inspector' && isInspector) ||
          (previousMode === 'manager' && isManager) ||
          (previousMode === 'readonly' && !isInspector && !isManager);
        var mode = previousAllowed ? previousMode : (isInspector ? 'inspector' : (isManager ? 'manager' : 'readonly'));
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
    this.setData({ mode: mode, tabs: tabs, activeTab: active, items: [], stats: [], statsError: '' });
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
    var mode = this.data.mode;
    if (mode === 'manager') {
      return Promise.all([
        api.listTasks({ status: 'PENDING_ACCEPTANCE', assigneeUserId: identity.userId, page: 1, pageSize: 1 }),
        api.listTasks({ status: 'IN_PROGRESS', assigneeUserId: identity.userId, page: 1, pageSize: 1 }),
        api.listTasks({ status: 'PENDING_REVIEW', assigneeUserId: identity.userId, page: 1, pageSize: 1 }),
        api.listTasks({ status: 'COMPLETED', assigneeUserId: identity.userId, page: 1, pageSize: 1 }),
      ]).then(function (rows) {
        if (that.data.mode !== mode) return;
        that.setData({ statsError: '', stats: [
          { value: total(rows[0]), label: '待接受' },
          { value: total(rows[1]), label: '整改中' },
          { value: total(rows[2]), label: '待复核' },
          { value: total(rows[3]), label: '已完成' },
        ] });
      }).catch(function () {
        if (that.data.mode === mode) that.setData({ statsError: '统计暂时无法加载' });
      });
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
      if (that.data.mode !== mode) return;
      that.setData({ statsError: '', stats: [
        { value: total(rows[0]), label: '今日巡店' },
        { value: total(rows[1]) === null || total(rows[2]) === null ? null : total(rows[1]) + total(rows[2]), label: '进行中' },
        { value: total(rows[3]), label: '待复核' },
        { value: total(rows[4]), label: '已完成' },
      ] });
    }).catch(function () {
      if (that.data.mode === mode) that.setData({ statsError: '统计暂时无法加载' });
    });
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
    this.listRequestSequence = Number(this.listRequestSequence || 0) + 1;
    var sequence = this.listRequestSequence;
    this.setData({ listLoading: true, listError: '' });
    var request;
    if (this.data.mode === 'manager') {
      request = api.listAllTasks({ status: tab, assigneeUserId: identity.userId }).then(function (rows) {
        return that.decorateTasks(rows, { status: tab, assigneeUserId: identity.userId });
      });
    } else if (tab === 'review') {
      request = api.listAllTasks({ status: 'PENDING_REVIEW', reviewerUserId: identity.userId })
        .then(function (rows) { return that.decorateTasks(rows, { status: 'PENDING_REVIEW', reviewerUserId: identity.userId }); });
    } else {
      var queries = tab === 'active'
        ? [{ inspectorUserId: identity.userId, status: 'DRAFT' }, { inspectorUserId: identity.userId, status: 'IN_PROGRESS' }]
        : [{ inspectorUserId: this.data.mode === 'readonly' ? '' : identity.userId, status: tab === 'all' ? '' : tab }];
      request = Promise.all(queries.map(function (query) { return api.listAllInspections(query); })).then(function (pages) {
        var rows = [];
        pages.forEach(function (pageRows) { rows = rows.concat(pageRows || []); });
        return that.decorateInspections(rows);
      });
    }
    return request.then(function (items) {
      if (sequence !== that.listRequestSequence) return;
      that.setData({ listLoading: false, listError: '', items: items });
    }).catch(function (error) {
      if (sequence !== that.listRequestSequence) return;
      that.setData({ listLoading: false, listError: error.message || '列表加载失败' });
      util.showError(error);
    });
  },

  decorateInspections: function (rows) {
    var storeMap = {};
    var seen = {};
    this.data.stores.forEach(function (store) { storeMap[String(store.storeId)] = store.storeName || '未命名门店'; });
    return (rows || []).filter(function (row) {
      var key = String(row.inspectionId);
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    }).sort(function (left, right) {
      return String(right.startedAt || '').localeCompare(String(left.startedAt || '')) || Number(right.inspectionId) - Number(left.inspectionId);
    }).map(function (row) {
      return Object.assign({}, row, {
        itemType: 'inspection',
        listKey: 'inspection-' + row.inspectionId,
        displayTitle: storeMap[String(row.storeId)] || '未命名门店',
        displayNo: row.inspectionNo || '巡店单号暂无',
        displayTime: util.formatTime(row.startedAt),
        displayStatus: util.statusLabel(row.status),
        statusClass: util.statusClass(row.status),
      });
    });
  },

  decorateTasks: function (rows, query) {
    var that = this;
    var storeMap = {};
    this.data.stores.forEach(function (store) { storeMap[String(store.storeId)] = store.storeName || '未命名门店'; });
    return Promise.all([
      Promise.all((rows || []).map(function (task) { return api.getTask(task.rectificationTaskId); })),
      api.listAllTasks(Object.assign({}, query || {}, { overdue: true })),
    ]).then(function (results) {
      var overdueIds = {};
      (results[1] || []).forEach(function (task) { overdueIds[String(task.rectificationTaskId)] = true; });
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
            displayTitle: issue.title || '整改问题',
            storeName: storeMap[String(task.storeId)] || '未命名门店',
            inspectionTime: inspection ? util.formatTime(inspection.startedAt) : '暂无',
            inspectorLabel: inspection && Number(inspection.inspectorUserId) === Number(that.data.identity.userId)
              ? that.data.identity.userName : '巡店员信息暂无',
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
  retryList: function () { this.loadList(); },
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
