var app = getApp();
var api = require('../../../services/franchiseInspection');
var util = require('../../../utils/franchiseInspection');

Page({
  data: {
    navBarHeight: 0, loading: true, actionLoading: false, taskId: 0, identity: null, store: null,
    task: null, issue: null, submissions: [], reviews: [], timeline: [], originalMedia: [], taskMedia: [],
    canAccept: false, canEdit: false, nextStepText: '',
    form: { reason: '', measures: '', description: '', supplement: '' },
    currentMedia: [], mediaUploading: false,
    draftDirty: false,
    refreshNotice: '', acceptConflict: false, error: '',
  },

  onLoad: function (options) {
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR, taskId: Number(options.taskId) });
    this.loadDetail();
  },

  onShow: function () {
    if (!this.loadedOnce) return;
    if (this.data.draftDirty) {
      this.setData({ refreshNotice: '页面有未保存内容，已暂停自动刷新。' });
      return;
    }
    this.loadDetail();
  },
  onPullDownRefresh: function () {
    if (this.data.draftDirty) {
      this.setData({ refreshNotice: '页面有未保存内容，已暂停刷新。' });
      wx.stopPullDownRefresh();
      return;
    }
    this.loadDetail().then(function () { wx.stopPullDownRefresh(); }).catch(function () { wx.stopPullDownRefresh(); });
  },

  loadDetail: function () {
    var that = this;
    this.detailRequestSequence = Number(this.detailRequestSequence || 0) + 1;
    var sequence = this.detailRequestSequence;
    this.setData({ loading: true, error: '' });
    return Promise.all([api.bootstrapIdentity(), api.getTask(this.data.taskId), api.listStores()])
      .then(function (results) {
        var identity = results[0];
        var detail = results[1];
        var task = detail.task;
        var issue = detail.issue;
        var store = (results[2] || []).find(function (row) { return Number(row.storeId) === Number(task.storeId); });
        var rawSubmissions = detail.submissions || [];
        var rawReviews = detail.reviews || [];
        var extras = [
          api.listAssignees(task.storeId),
          api.listRelatedMedia('ISSUE', issue.issueId, 'INSPECTION_EVIDENCE'),
          api.listRelatedMedia('RECTIFICATION_TASK', task.rectificationTaskId),
          Promise.all(rawSubmissions.map(function (submission) {
            return api.listRelatedMedia('RECTIFICATION_SUBMISSION', submission.submissionId, 'RECTIFICATION_EVIDENCE');
          })),
          Promise.all(rawReviews.map(function (review) {
            return api.listRelatedMedia('RECTIFICATION_REVIEW', review.reviewId, 'REVIEW_EVIDENCE');
          })),
        ];
        return Promise.all(extras).then(function (more) {
          var managers = more[0] || [];
          var originalMedia = more[1] || [];
          var taskMedia = more[2] || [];
          var submissions = rawSubmissions.map(function (submission, index) {
            var related = more[3][index] || [];
            var embedded = {};
            (submission.media || []).forEach(function (row) { embedded[String(row.mediaAssetId)] = row; });
            return Object.assign({}, submission, { media: related.length ? related.map(function (row) {
              return Object.assign({}, row, embedded[String(row.mediaAssetId)] || {});
            }) : (submission.media || []) });
          });
          var reviews = rawReviews.map(function (review, index) {
            var related = more[4][index] || [];
            var embedded = {};
            (review.media || []).forEach(function (row) { embedded[String(row.mediaAssetId)] = row; });
            return Object.assign({}, review, { media: related.length ? related.map(function (row) {
              return Object.assign({}, row, embedded[String(row.mediaAssetId)] || {});
            }) : (review.media || []) });
          });
          var currentDraft = submissions.find(function (submission) {
            return Number(submission.roundNo) === Number(task.currentRound) && submission.status === 'DRAFT';
          });
          var userMap = {};
          userMap[String(identity.userId)] = identity.userName;
          managers.forEach(function (user) { userMap[String(user.userId)] = user.userName; });
          var submissionMap = {};
          submissions.forEach(function (row) { submissionMap[String(row.submissionId)] = row.media || []; });
          var reviewMap = {};
          reviews.forEach(function (row) { reviewMap[String(row.reviewId)] = row.media || []; });
          var timeline = util.decorateTimeline(detail.timeline).map(function (event) {
            var eventDetail = event.detail || {};
            return Object.assign({}, event, {
              actorName: userMap[String(event.actorUserId)] || '操作人信息暂无',
              media: submissionMap[String(eventDetail.submissionId)] || reviewMap[String(eventDetail.reviewId)] || [],
            });
          });
          if (sequence !== that.detailRequestSequence) return;
          var isAssignee = Number(identity.userId) === Number(task.assigneeUserId);
          var canAccept = isAssignee && task.status === 'PENDING_ACCEPTANCE';
          var canEdit = isAssignee && (task.status === 'IN_PROGRESS' || task.status === 'REJECTED');
          var nextStepText = '';
          if (!isAssignee) {
            nextStepText = '该任务当前由其他负责人处理，如需执行请联系总部调整负责人。';
          } else if (task.status === 'PENDING_ACCEPTANCE') {
            nextStepText = '请先接受整改任务。接受后可填写整改内容并上传完成照片。';
          } else if (task.status === 'IN_PROGRESS') {
            nextStepText = '请填写本轮整改内容、上传整改完成照片，再提交总部复核。';
          } else if (task.status === 'REJECTED') {
            nextStepText = '上一轮复核未通过，请按总部意见补充整改内容和照片后重新提交。';
          } else if (task.status === 'PENDING_REVIEW') {
            nextStepText = '整改已提交，正在等待总部复核，当前无需继续操作。';
          } else if (task.status === 'COMPLETED') {
            nextStepText = '该整改任务已完成，历史提交和复核记录可在下方查看。';
          } else {
            nextStepText = '当前状态暂无可执行操作。';
          }
          var acceptScope = 'rectification-accept:' + task.rectificationTaskId;
          if (task.status !== 'PENDING_ACCEPTANCE') {
            util.clearPersistentKey(acceptScope);
            util.clearPersistentCommand(acceptScope);
          }
          submissions = submissions.map(function (submission) {
            return Object.assign({}, submission, {
              statusText: submission.status === 'SUBMITTED' ? '已提交' : '草稿',
              timeText: submission.submittedAt ? util.formatTime(submission.submittedAt) : '尚未提交',
            });
          });
          reviews = reviews.map(function (review) {
            return Object.assign({}, review, { timeText: util.formatTime(review.reviewedAt) });
          });
          that.loadedOnce = true;
          that.formDirty = false;
          that.currentMediaBaseline = that.readyIds(currentDraft ? (currentDraft.media || []) : []).join(',');
          that.setData({
            loading: false,
            identity: identity,
            store: store || { storeName: '未命名门店' },
            task: Object.assign({}, task, { statusText: util.statusLabel(task.status), statusClass: util.statusClass(task.status), dueText: util.formatTime(task.dueAt) }),
            issue: Object.assign({}, issue, { severityText: util.severityLabel(issue.severity), statusText: util.statusLabel(issue.status) }),
            submissions: submissions,
            reviews: reviews,
            timeline: timeline,
            originalMedia: originalMedia,
            taskMedia: taskMedia,
            canAccept: canAccept,
            canEdit: canEdit,
            nextStepText: nextStepText,
            form: currentDraft ? util.parseRectification(currentDraft.content) : { reason: '', measures: '', description: '', supplement: '' },
            currentMedia: currentDraft ? (currentDraft.media || []) : [],
            lastReview: reviews.length ? reviews[reviews.length - 1] : null,
            draftDirty: false,
            refreshNotice: '',
            acceptConflict: task.status === 'PENDING_ACCEPTANCE' && that.data.acceptConflict,
          });
        });
      }).catch(function (error) {
        if (sequence !== that.detailRequestSequence) return;
        that.setData({ loading: false, error: error.message || '整改任务加载失败' });
        util.showError(error, { afterClose: function () { if (Number(error.status) === 404) wx.navigateBack({ delta: 1 }); } });
      });
  },

  acceptTask: function () {
    if (this.data.actionLoading) return;
    var that = this;
    util.confirm('接受整改任务', '接受后任务进入整改中，是否继续？').then(function (confirmed) {
      if (!confirmed) return;
      that.setData({ actionLoading: true });
      var scope = 'rectification-accept:' + that.data.taskId;
      var command = util.persistentCommand(scope, function () { return {
        rowVersion: that.data.task.rowVersion,
        idempotencyKey: util.persistentKey(scope, 'rectification-accept'),
      }; });
      api.acceptTask(that.data.taskId, command).then(function () {
        util.clearPersistentKey(scope);
        util.clearPersistentCommand(scope);
        that.setData({ actionLoading: false });
        return that.loadDetail();
      }).catch(function (error) {
        that.setData({ actionLoading: false, acceptConflict: error.errorCode === 'ROW_VERSION_CONFLICT' });
        util.showError(error, { afterClose: function () { that.loadDetail(); } });
      });
    });
  },

  resetAcceptCommand: function () {
    var that = this;
    util.confirm('重新发起接受请求', '上次请求使用的任务版本已过期。确认后才会基于最新版本生成新的幂等键；不会自动静默重试。').then(function (confirmed) {
      if (!confirmed) return;
      var scope = 'rectification-accept:' + that.data.taskId;
      util.clearPersistentKey(scope);
      util.clearPersistentCommand(scope);
      that.setData({ acceptConflict: false });
    });
  },

  onFormInput: function (event) {
    this.formDirty = true;
    this.setData({ ['form.' + event.currentTarget.dataset.field]: event.detail.value, draftDirty: true, refreshNotice: '' });
  },
  onCurrentMediaChange: function (event) {
    var files = event.detail.files || [];
    var signature = this.readyIds(files).join(',');
    var hasLocalWork = files.some(function (row) { return !row.mediaAssetId || row.uploadStatus === 'uploading' || row.uploadStatus === 'failed'; });
    this.setData({
      currentMedia: files,
      mediaUploading: !!event.detail.uploading,
      draftDirty: !!this.formDirty || hasLocalWork || signature !== String(this.currentMediaBaseline || ''),
      refreshNotice: '',
    });
  },
  readyIds: function (files) { return (files || []).filter(function (row) { return row.mediaAssetId && row.status === 'READY' && row.uploadStatus !== 'failed' && row.uploadStatus !== 'uploading'; }).map(function (row) { return Number(row.mediaAssetId); }); },

  saveDraft: function () {
    if (!this.data.canEdit || this.data.actionLoading || this.data.mediaUploading) return;
    var that = this;
    this.setData({ actionLoading: true });
    api.saveSubmissionDraft(this.data.taskId, {
      rowVersion: this.data.task.rowVersion,
      content: util.composeRectification(this.data.form),
      mediaAssetIds: this.readyIds(this.data.currentMedia),
    }).then(function () {
      that.setData({ actionLoading: false });
      wx.showToast({ title: '整改草稿已保存', icon: 'success' });
      return that.loadDetail();
    }).catch(function (error) { that.setData({ actionLoading: false }); util.showError(error, { afterClose: function () { if (Number(error.status) === 409) that.loadDetail(); } }); });
  },

  submitRectification: function () {
    if (!this.data.canEdit || this.data.actionLoading || this.data.mediaUploading) return;
    var content = util.composeRectification(this.data.form);
    var mediaIds = this.readyIds(this.data.currentMedia);
    if (!content) { wx.showToast({ title: '请填写整改说明', icon: 'none' }); return; }
    if (!mediaIds.length) { wx.showToast({ title: '请上传整改完成照片', icon: 'none' }); return; }
    var that = this;
    util.confirm('提交复核', '提交后本轮整改内容将不可修改，是否继续？').then(function (confirmed) {
      if (!confirmed) return;
      that.setData({ actionLoading: true });
      var scope = 'rectification-submit:' + that.data.taskId + ':' + that.data.task.currentRound;
      var command = util.persistentCommand(scope, function () { return {
        rowVersion: that.data.task.rowVersion,
        idempotencyKey: util.persistentKey(scope, 'rectification-submit'),
        content: content,
        mediaAssetIds: mediaIds,
      }; });
      api.submitRectification(that.data.taskId, command).then(function () {
        util.clearPersistentKey(scope);
        util.clearPersistentCommand(scope);
        that.setData({ actionLoading: false });
        wx.showToast({ title: '已提交复核', icon: 'success' });
        return that.loadDetail();
      }).catch(function (error) {
        that.setData({ actionLoading: false });
        util.showError(error, { afterClose: function () { if (Number(error.status) === 409) that.loadDetail(); } });
      });
    });
  },

  refreshDetail: function () {
    var that = this;
    var dirty = this.data.draftDirty;
    var action = dirty
      ? util.confirm('刷新任务', '刷新将放弃尚未保存的页面编辑，是否继续？')
      : Promise.resolve(true);
    action.then(function (confirmed) {
      if (!confirmed) return;
      that.formDirty = false;
      that.setData({ draftDirty: false, refreshNotice: '' });
      that.loadDetail();
    });
  },

  retry: function () { this.loadDetail(); },

  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
