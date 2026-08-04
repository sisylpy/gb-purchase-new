var app = getApp();
var api = require('../../../services/franchiseInspection');
var util = require('../../../utils/franchiseInspection');

Page({
  data: {
    navBarHeight: 0,
    loading: true,
    issueId: 0,
    identity: null,
    issue: null,
    store: null,
    tasks: [],
    media: [],
    timeline: [],
    error: '',
  },

  onLoad: function (options) {
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      issueId: Number(options.issueId),
    });
    this.loadDetail();
  },

  onShow: function () { if (this.loadedOnce) this.loadDetail(); },

  onPullDownRefresh: function () {
    this.loadDetail().then(function () { wx.stopPullDownRefresh(); })
      .catch(function () { wx.stopPullDownRefresh(); });
  },

  loadDetail: function () {
    var that = this;
    this.detailRequestSequence = Number(this.detailRequestSequence || 0) + 1;
    var sequence = this.detailRequestSequence;
    this.setData({ loading: true, error: '' });
    return Promise.all([api.bootstrapIdentity(), api.getIssue(this.data.issueId), api.listStores()])
      .then(function (results) {
        var identity = results[0];
        var detail = results[1];
        var issue = detail.issue;
        var store = (results[2] || []).find(function (row) {
          return Number(row.storeId) === Number(issue.storeId);
        });
        var relatedInspection = issue.inspectionId ? api.getInspection(issue.inspectionId) : Promise.resolve(null);
        return Promise.all([
          relatedInspection,
          api.listAllMedia({ storeId: issue.storeId, status: 'READY' }),
          api.listAssignees(issue.storeId),
        ]).then(function (more) {
          if (sequence !== that.detailRequestSequence) return;
          var inspectionDetail = more[0];
          var allMedia = more[1] || [];
          var evidenceIds = [];
          if (inspectionDetail) {
            (inspectionDetail.items || []).some(function (record) {
              var candidate = (record.aiCandidates || []).find(function (row) {
                return row.candidateKey === issue.candidateKey;
              });
              if (!candidate) return false;
              evidenceIds = (candidate.evidenceMediaIds || []).map(Number);
              return true;
            });
          }
          var userMap = {};
          userMap[String(identity.userId)] = identity.userName;
          (more[2] || []).forEach(function (user) { userMap[String(user.userId)] = user.userName; });
          var timeline = util.decorateTimeline(detail.timeline).map(function (event) {
            return Object.assign({}, event, {
              actorName: userMap[String(event.actorUserId)] || '操作人信息暂无',
            });
          });
          that.loadedOnce = true;
          that.setData({
            loading: false,
            identity: identity,
            issue: Object.assign({}, issue, {
              severityText: util.severityLabel(issue.severity),
              statusText: util.statusLabel(issue.status),
              statusClass: util.statusClass(issue.status),
              reportedAtText: util.formatTime(issue.reportedAt),
              reporterName: Number(issue.reportedBy) === Number(identity.userId)
                ? identity.userName : '上报人信息暂无',
            }),
            store: store || { storeName: '未命名门店' },
            tasks: (detail.rectificationTasks || []).map(function (task) {
              return Object.assign({}, task, {
                statusText: util.statusLabel(task.status),
                statusClass: util.statusClass(task.status),
                dueText: util.formatTime(task.dueAt),
              });
            }),
            media: allMedia.filter(function (asset) {
              return evidenceIds.indexOf(Number(asset.mediaAssetId)) >= 0;
            }),
            timeline: timeline,
          });
        });
      }).catch(function (error) {
        if (sequence !== that.detailRequestSequence) return;
        that.setData({ loading: false, error: error.message || '问题详情加载失败' });
        util.showError(error, {
          afterClose: function () { if (Number(error.status) === 404) wx.navigateBack({ delta: 1 }); },
        });
      });
  },

  openTask: function (event) {
    wx.navigateTo({
      url: '/subPackage-inspection/pages/taskDetail/taskDetail?taskId=' + event.currentTarget.dataset.id,
    });
  },

  retry: function () { this.loadDetail(); },
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
