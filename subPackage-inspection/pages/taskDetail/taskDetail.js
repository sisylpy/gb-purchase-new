var app = getApp();
var api = require('../../../services/franchiseInspection');
var util = require('../../../utils/franchiseInspection');

Page({
  data: {
    navBarHeight: 0, loading: true, actionLoading: false, taskId: 0, identity: null, store: null,
    task: null, issue: null, submissions: [], reviews: [], timeline: [], originalMedia: [],
    canAccept: false, canEdit: false, canReview: false,
    form: { reason: '', measures: '', description: '', supplement: '' },
    currentMedia: [], mediaUploading: false, reviewMedia: [], reviewMediaUploading: false,
    approveComment: '', rejectReason: '', rejectRequirement: '', draftDirty: false, reviewDirty: false,
    refreshNotice: '', error: '',
  },

  onLoad: function (options) {
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR, taskId: Number(options.taskId) });
    this.loadDetail();
  },

  onShow: function () {
    if (!this.loadedOnce) return;
    if (this.data.draftDirty || this.data.reviewDirty) {
      this.setData({ refreshNotice: '页面有未保存内容，已暂停自动刷新。' });
      return;
    }
    this.loadDetail();
  },
  onPullDownRefresh: function () {
    if (this.data.draftDirty || this.data.reviewDirty) {
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
        var extras = [api.listAssignees(task.storeId)];
        if (issue.inspectionId) extras.push(api.getInspection(issue.inspectionId)); else extras.push(Promise.resolve(null));
        extras.push(api.listAllMedia({ storeId: task.storeId, status: 'READY' }));
        return Promise.all(extras).then(function (more) {
          var managers = more[0] || [];
          var inspectionDetail = more[1];
          var allMedia = more[2] || [];
          var evidenceIds = [];
          if (inspectionDetail) {
            (inspectionDetail.items || []).some(function (record) {
              var candidate = (record.aiCandidates || []).find(function (row) { return row.candidateKey === issue.candidateKey; });
              if (candidate) { evidenceIds = (candidate.evidenceMediaIds || []).map(Number); return true; }
              return false;
            });
          }
          var originalMedia = allMedia.filter(function (asset) { return evidenceIds.indexOf(Number(asset.mediaAssetId)) >= 0; });
          var currentDraft = (detail.submissions || []).find(function (submission) {
            return Number(submission.roundNo) === Number(task.currentRound) && submission.status === 'DRAFT';
          });
          var userMap = {};
          userMap[String(identity.userId)] = identity.userName;
          managers.forEach(function (user) { userMap[String(user.userId)] = user.userName; });
          var submissionMap = {};
          (detail.submissions || []).forEach(function (row) { submissionMap[String(row.submissionId)] = row.media || []; });
          var reviewMap = {};
          (detail.reviews || []).forEach(function (row) { reviewMap[String(row.reviewId)] = row.media || []; });
          var timeline = util.decorateTimeline(detail.timeline).map(function (event) {
            var eventDetail = event.detail || {};
            return Object.assign({}, event, {
              actorName: userMap[String(event.actorUserId)] || '操作人信息暂无',
              media: submissionMap[String(eventDetail.submissionId)] || reviewMap[String(eventDetail.reviewId)] || [],
            });
          });
          if (sequence !== that.detailRequestSequence) return;
          var isAssignee = Number(identity.userId) === Number(task.assigneeUserId);
          var isReviewer = Number(identity.userId) === Number(task.reviewerUserId);
          var submissions = (detail.submissions || []).map(function (submission) {
            return Object.assign({}, submission, {
              statusText: submission.status === 'SUBMITTED' ? '已提交' : '草稿',
              timeText: submission.submittedAt ? util.formatTime(submission.submittedAt) : '尚未提交',
            });
          });
          var reviews = (detail.reviews || []).map(function (review) {
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
            canAccept: isAssignee && util.hasAction(identity, 'RECTIFICATION_ACCEPT') && task.status === 'PENDING_ACCEPTANCE',
            canEdit: isAssignee && util.hasAction(identity, 'RECTIFICATION_SAVE_DRAFT') && (task.status === 'IN_PROGRESS' || task.status === 'REJECTED'),
            canReview: isReviewer && util.hasAction(identity, 'RECTIFICATION_REVIEW') && task.status === 'PENDING_REVIEW',
            form: currentDraft ? util.parseRectification(currentDraft.content) : { reason: '', measures: '', description: '', supplement: '' },
            currentMedia: currentDraft ? (currentDraft.media || []) : [],
            reviewMedia: [],
            lastReview: reviews.length ? reviews[reviews.length - 1] : null,
            draftDirty: false,
            reviewDirty: false,
            refreshNotice: '',
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
      api.acceptTask(that.data.taskId, { rowVersion: that.data.task.rowVersion }).then(function () {
        that.setData({ actionLoading: false });
        return that.loadDetail();
      }).catch(function (error) { that.setData({ actionLoading: false }); util.showError(error, { afterClose: function () { that.loadDetail(); } }); });
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
  onReviewMediaChange: function (event) {
    var files = event.detail.files || [];
    this.setData({
      reviewMedia: files,
      reviewMediaUploading: !!event.detail.uploading,
      reviewDirty: files.length > 0 || !!this.data.approveComment || !!this.data.rejectReason || !!this.data.rejectRequirement,
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
        if (error.errorCode === 'ROW_VERSION_CONFLICT') { util.clearPersistentKey(scope); util.clearPersistentCommand(scope); }
        that.setData({ actionLoading: false });
        util.showError(error, { afterClose: function () { if (Number(error.status) === 409) that.loadDetail(); } });
      });
    });
  },

  onReviewInput: function (event) { this.setData({ [event.currentTarget.dataset.field]: event.detail.value, reviewDirty: true, refreshNotice: '' }); },

  refreshDetail: function () {
    var that = this;
    var dirty = this.data.draftDirty || this.data.reviewDirty;
    var action = dirty
      ? util.confirm('刷新任务', '刷新将放弃尚未保存的页面编辑，是否继续？')
      : Promise.resolve(true);
    action.then(function (confirmed) {
      if (!confirmed) return;
      that.formDirty = false;
      that.setData({ draftDirty: false, reviewDirty: false, refreshNotice: '' });
      that.loadDetail();
    });
  },

  retry: function () { this.loadDetail(); },

  review: function (event) {
    if (!this.data.canReview || this.data.actionLoading || this.data.reviewMediaUploading) return;
    var decision = event.currentTarget.dataset.decision;
    var comment;
    if (decision === 'REJECT') {
      if (!String(this.data.rejectReason || '').trim() || !String(this.data.rejectRequirement || '').trim()) {
        wx.showToast({ title: '请填写退回原因和补充要求', icon: 'none' }); return;
      }
      comment = '退回原因：' + this.data.rejectReason.trim() + '\n需要补充：' + this.data.rejectRequirement.trim();
    } else {
      comment = String(this.data.approveComment || '').trim();
      if (!comment) { wx.showToast({ title: '请填写通过意见', icon: 'none' }); return; }
    }
    var that = this;
    util.confirm(decision === 'APPROVE' ? '通过整改' : '退回整改', decision === 'APPROVE' ? '通过后任务将完成，是否继续？' : '退回后店长将进入下一轮整改，是否继续？')
      .then(function (confirmed) {
        if (!confirmed) return;
        that.setData({ actionLoading: true });
        var scope = 'rectification-review:' + that.data.taskId + ':' + that.data.task.currentRound + ':' + decision;
        var command = util.persistentCommand(scope, function () { return {
          rowVersion: that.data.task.rowVersion,
          idempotencyKey: util.persistentKey(scope, 'rectification-review'),
          decision: decision,
          reviewComment: comment,
          mediaAssetIds: that.readyIds(that.data.reviewMedia),
        }; });
        api.reviewRectification(that.data.taskId, command).then(function () {
          util.clearPersistentKey(scope);
          util.clearPersistentCommand(scope);
          that.setData({ actionLoading: false });
          wx.showToast({ title: decision === 'APPROVE' ? '复核已通过' : '已退回整改', icon: 'success' });
          return that.loadDetail();
        }).catch(function (error) {
          if (error.errorCode === 'ROW_VERSION_CONFLICT') { util.clearPersistentKey(scope); util.clearPersistentCommand(scope); }
          that.setData({ actionLoading: false });
          util.showError(error, { afterClose: function () { if (Number(error.status) === 409) that.loadDetail(); } });
        });
      });
  },

  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
