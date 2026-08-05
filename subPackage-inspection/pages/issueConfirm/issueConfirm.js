var app = getApp();
var api = require('../../../services/franchiseInspection');
var util = require('../../../utils/franchiseInspection');

Page({
  data: { navBarHeight: 0, loading: true, submitting: false, inspectionId: 0, itemId: 0, inspection: null, store: null, candidates: [], error: '' },

  onLoad: function (options) {
    this.recordStorageKey = 'inspectionRecordDraft:' + options.inspectionId;
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      inspectionId: Number(options.inspectionId),
      itemId: Number(options.itemId),
    });
    this.loadPage();
  },

  loadPage: function () {
    var that = this;
    var draft = wx.getStorageSync(this.recordStorageKey) || {};
    if (!draft.item || Number(draft.item.inspectionItemId) !== Number(this.data.itemId) || !draft.candidates || !draft.candidates.length) {
      this.setData({ loading: false, error: '候选问题草稿不存在，请返回现场记录重新整理。' });
      return;
    }
    this.setData({ loading: true, error: '' });
    return Promise.all([api.bootstrapIdentity(), api.getInspection(this.data.inspectionId), api.listStores()])
      .then(function (results) {
        var identity = results[0];
        if (!util.hasAction(identity, 'INSPECTION_EDIT')) {
          return Promise.reject({ inspectionError: true, status: 403, message: '当前身份不能确认巡店问题' });
        }
        var detail = results[1];
        var inspection = detail.inspection;
        var store = (results[2] || []).find(function (row) { return Number(row.storeId) === Number(inspection.storeId); });
        return Promise.all([
          api.listAssignees(inspection.storeId),
          api.listRelatedMedia('INSPECTION_ITEM', that.data.itemId, 'INSPECTION_EVIDENCE'),
        ]).then(function (directories) {
          var assignees = directories[0] || [];
          var allMedia = directories[1] || [];
          var invalidAssignee = false;
          var invalidMedia = false;
          var candidates = draft.candidates.filter(function (row) { return row.generateTask !== false; }).map(function (row) {
            var assignee = assignees.find(function (user) { return Number(user.userId) === Number(row.assigneeUserId); });
            if (!assignee) invalidAssignee = true;
            var requestedMediaIds = (row.evidenceMediaIds || []).map(Number);
            var media = allMedia.filter(function (file) {
              return file.status === 'READY' && requestedMediaIds.indexOf(Number(file.mediaAssetId)) >= 0;
            });
            if (media.length !== requestedMediaIds.length) invalidMedia = true;
            return Object.assign({}, row, {
              assigneeName: assignee ? assignee.userName : '负责人已不在当前门店可指派范围',
              severityText: util.severityLabel(row.severity),
              media: media,
            });
          });
          that.setData({
            loading: false,
            inspection: inspection,
            store: store || { storeName: '未命名门店' },
            candidates: candidates,
            error: !candidates.length
              ? '请至少勾选一个需要确认并生成整改任务的候选问题。'
              : (invalidAssignee ? '负责人目录已变化，请返回候选问题页重新选择。'
                : (invalidMedia ? '关联的现场照片已不可用，请返回候选问题页重新选择。' : '')),
          });
        });
      }).catch(function (error) {
        that.setData({ loading: false, error: error.message || '确认页加载失败' });
        util.showError(error);
      });
  },

  retry: function () { this.loadPage(); },

  submitAll: function () {
    if (this.data.submitting || !this.data.candidates.length) return;
    var that = this;
    util.confirm('正式确认并下发', '将生成 ' + this.data.candidates.length + ' 个正式问题和整改任务，确认继续？')
      .then(function (confirmed) {
        if (!confirmed) return;
        that.setData({ submitting: true });
        return that.performSubmission();
      });
  },

  performSubmission: function () {
    var that = this;
    var candidates = this.data.candidates;
    var confirmScope = 'confirm:' + this.data.inspectionId + ':' + this.data.itemId;
    return api.getInspection(this.data.inspectionId).then(function (detail) {
      that.activeCommandScope = confirmScope;
      var command = util.persistentCommand(confirmScope, function () { return {
        rowVersion: detail.inspection.rowVersion,
        idempotencyKey: util.persistentKey(confirmScope, 'issue-confirm'),
        issues: candidates.map(function (row) {
          return {
            candidateKey: row.candidateKey,
            title: String(row.title).trim(),
            category: String(row.category).trim(),
            severity: row.severity,
            description: String(row.description).trim(),
            evidenceMediaIds: (row.evidenceMediaIds || []).map(Number),
          };
        }),
      }; });
      return api.confirmIssues(that.data.inspectionId, that.data.itemId, command);
    }).then(function (issues) {
      var createdTasks = [];
      var chain = Promise.resolve();
      (issues || []).forEach(function (issue, index) {
        chain = chain.then(function () {
          var candidate = candidates.find(function (row) { return row.candidateKey === issue.candidateKey; }) || candidates[index];
          var scope = 'task-create:' + issue.issueId;
          that.activeCommandScope = scope;
          var command = util.persistentCommand(scope, function () { return {
            rowVersion: issue.rowVersion,
            idempotencyKey: util.persistentKey(scope, 'task-create'),
            assigneeUserId: Number(candidate.assigneeUserId),
            reviewerUserId: Number(that.data.inspection.inspectorUserId),
            dueAt: candidate.dueDate + 'T23:59:00',
            requirement: String(candidate.rectificationRequirement).trim(),
            acceptanceCriteria: String(candidate.acceptanceCriteria).trim(),
          }; });
          return api.createRectificationTask(issue.issueId, command).then(function (task) { createdTasks.push(task); });
        });
      });
      return chain.then(function () { return { issues: issues, tasks: createdTasks }; });
    }).then(function (result) {
      return api.getInspection(that.data.inspectionId).then(function (detail) {
        var scope = 'inspection-submit:' + that.data.inspectionId;
        that.activeCommandScope = scope;
        var command = util.persistentCommand(scope, function () { return {
          rowVersion: detail.inspection.rowVersion,
          idempotencyKey: util.persistentKey(scope, 'inspection-submit'),
        }; });
        return api.submitInspection(that.data.inspectionId, command).then(function () { return result; });
      });
    }).then(function (result) {
      wx.removeStorageSync(that.recordStorageKey);
      util.clearPersistentKey(confirmScope);
      util.clearPersistentCommand(confirmScope);
      (result.issues || []).forEach(function (issue) {
        util.clearPersistentKey('task-create:' + issue.issueId);
        util.clearPersistentCommand('task-create:' + issue.issueId);
      });
      util.clearPersistentKey('inspection-submit:' + that.data.inspectionId);
      util.clearPersistentCommand('inspection-submit:' + that.data.inspectionId);
      that.setData({ submitting: false });
      var issueNos = (result.issues || []).map(function (row) { return row.issueNo; }).join('、');
      var taskNos = (result.tasks || []).map(function (row) { return row.taskNo; }).join('、');
      wx.showModal({
        title: '整改任务已下发',
        content: '问题：' + issueNos + '\n任务：' + taskNos,
        showCancel: false,
        success: function () {
          wx.redirectTo({ url: '/subPackage-inspection/pages/inspectionDetail/inspectionDetail?inspectionId=' + that.data.inspectionId });
        },
      });
    }).catch(function (error) {
      that.setData({ submitting: false });
      util.showError(error, { afterClose: function () { if (Number(error.status) === 409) that.loadPage(); } });
    });
  },

  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
