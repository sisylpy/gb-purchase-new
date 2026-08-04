var app = getApp();
var api = require('../../../services/franchiseInspection');
var util = require('../../../utils/franchiseInspection');

Page({
  data: { navBarHeight: 0, loading: true, inspectionId: 0, identity: null, inspection: null, store: null, items: [], issues: [], tasks: [], media: [], timeline: [], canContinue: false, error: '' },

  onLoad: function (options) {
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR, inspectionId: Number(options.inspectionId) });
    this.loadDetail();
  },

  onShow: function () { if (this.loadedOnce) this.loadDetail(); },

  onPullDownRefresh: function () {
    this.loadDetail().then(function () { wx.stopPullDownRefresh(); }).catch(function () { wx.stopPullDownRefresh(); });
  },

  loadDetail: function () {
    var that = this;
    this.detailRequestSequence = Number(this.detailRequestSequence || 0) + 1;
    var sequence = this.detailRequestSequence;
    this.setData({ loading: true, error: '' });
    return Promise.all([api.bootstrapIdentity(), api.getInspection(this.data.inspectionId), api.listStores()])
      .then(function (results) {
        var identity = results[0];
        var detail = results[1];
        var inspection = detail.inspection;
        var store = (results[2] || []).find(function (row) { return Number(row.storeId) === Number(inspection.storeId); });
        return Promise.all([
          api.listAllMedia({ storeId: inspection.storeId, status: 'READY' }),
          api.listAssignees(inspection.storeId),
        ]).then(function (more) {
          var mediaMap = {};
          (more[0] || []).forEach(function (asset) { mediaMap[String(asset.mediaAssetId)] = asset; });
          var evidenceIds = {};
          (detail.items || []).forEach(function (item) {
            (item.aiCandidates || []).forEach(function (candidate) {
              (candidate.evidenceMediaIds || []).forEach(function (id) { evidenceIds[String(id)] = true; });
            });
          });
          var userMap = {};
          userMap[String(identity.userId)] = identity.userName;
          (more[1] || []).forEach(function (user) { userMap[String(user.userId)] = user.userName; });
          var timeline = util.decorateTimeline(detail.timeline).map(function (event) {
            return Object.assign({}, event, { actorName: userMap[String(event.actorUserId)] || '操作人信息暂无' });
          });
          if (sequence !== that.detailRequestSequence) return;
          that.loadedOnce = true;
          that.setData({
            loading: false,
            identity: identity,
            inspection: Object.assign({}, inspection, {
              displayStatus: util.statusLabel(inspection.status),
              statusClass: util.statusClass(inspection.status),
              displayStartedAt: util.formatTime(inspection.startedAt),
              inspectorName: Number(inspection.inspectorUserId) === Number(identity.userId) ? identity.userName : '巡店员信息暂无',
            }),
            store: store || { storeName: '未命名门店' },
            items: (detail.items || []).map(function (item) {
              var labels = { NOT_REQUESTED: '未整理', READY: '已生成草稿', FAILED: '整理失败' };
              return Object.assign({}, item, { aiStatusText: labels[item.aiStatus] || '暂无' });
            }),
            issues: (detail.issues || []).map(function (issue) { return Object.assign({}, issue, { severityText: util.severityLabel(issue.severity), statusText: util.statusLabel(issue.status), statusClass: util.statusClass(issue.status) }); }),
            tasks: (detail.rectificationTasks || []).map(function (task) { return Object.assign({}, task, { statusText: util.statusLabel(task.status), statusClass: util.statusClass(task.status), dueText: util.formatTime(task.dueAt) }); }),
            media: Object.keys(evidenceIds).map(function (id) { return mediaMap[id]; }).filter(Boolean),
            timeline: timeline,
            canContinue: util.hasAction(identity, 'INSPECTION_EDIT') && Number(identity.userId) === Number(inspection.inspectorUserId) && (inspection.status === 'DRAFT' || inspection.status === 'IN_PROGRESS'),
          });
        });
      }).catch(function (error) {
        if (sequence !== that.detailRequestSequence) return;
        that.setData({ loading: false, error: error.message || '巡店详情加载失败' });
        util.showError(error, { afterClose: function () { if (Number(error.status) === 404) wx.navigateBack({ delta: 1 }); } });
      });
  },

  openTask: function (event) {
    wx.navigateTo({ url: '/subPackage-inspection/pages/taskDetail/taskDetail?taskId=' + event.currentTarget.dataset.id });
  },
  openIssue: function (event) {
    wx.navigateTo({ url: '/subPackage-inspection/pages/issueDetail/issueDetail?issueId=' + event.currentTarget.dataset.id });
  },
  retry: function () { this.loadDetail(); },
  continueInspection: function () {
    wx.navigateTo({ url: '/subPackage-inspection/pages/inspectionRecord/inspectionRecord?inspectionId=' + this.data.inspectionId + '&storeId=' + this.data.inspection.storeId });
  },
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
