var app = getApp();
var api = require('../../../services/franchiseInspection');
var util = require('../../../utils/franchiseInspection');

Page({
  data: {
    navBarHeight: 0,
    loading: true,
    saving: false,
    organizing: false,
    inspectionId: 0,
    storeId: 0,
    inspection: null,
    identity: null,
    inspectionItems: [],
    store: null,
    item: null,
    rawText: '',
    mediaFiles: [],
    mediaUploading: false,
    canUploadMedia: false,
    candidates: [],
    assignees: [],
    severityOptions: [
      { value: 'LOW', label: '低' },
      { value: 'MEDIUM', label: '中' },
      { value: 'HIGH', label: '高' },
      { value: 'CRITICAL', label: '严重' },
    ],
    error: '',
  },

  onLoad: function (options) {
    this.draftStorageKey = 'inspectionRecordDraft:' + options.inspectionId;
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      inspectionId: Number(options.inspectionId),
      storeId: Number(options.storeId),
    });
    this.loadPage();
  },

  loadPage: function () {
    var that = this;
    this.setData({ loading: true, error: '' });
    return Promise.all([
      api.bootstrapIdentity(),
      api.getInspection(this.data.inspectionId),
      api.listStores(),
    ]).then(function (results) {
      var identity = results[0];
      if (!util.hasAction(identity, 'INSPECTION_EDIT')) {
        return Promise.reject({ inspectionError: true, status: 403, message: '当前身份不能编辑巡店记录' });
      }
      var detail = results[1];
      var inspection = detail.inspection;
      if (inspection.status !== 'DRAFT' && inspection.status !== 'IN_PROGRESS') {
        return Promise.reject({ inspectionError: true, status: 409, message: '该巡店单已经提交，现场记录不可再修改' });
      }
      var store = (results[2] || []).find(function (row) { return Number(row.storeId) === Number(inspection.storeId); });
      var local = wx.getStorageSync(that.draftStorageKey) || {};
      var items = detail.items || [];
      var item = local.item || (items.length ? items[items.length - 1] : null);
      var candidates = local.candidates || (item && item.aiCandidates) || [];
      that.identity = identity;
      that.setData({
        identity: identity,
        inspectionId: inspection.inspectionId,
        storeId: inspection.storeId,
        inspection: inspection,
        inspectionItems: items,
        store: store || { storeId: inspection.storeId, storeName: '门店 ' + inspection.storeId },
        item: item,
        canUploadMedia: !!item,
        rawText: typeof local.rawText === 'string' ? local.rawText : (item ? item.rawText : ''),
        mediaFiles: local.mediaFiles || [],
        candidates: candidates,
        loading: false,
      });
      return Promise.all([that.loadAssignees(), that.restoreCandidateMedia()]);
    }).then(function () {
      that.normalizeCandidates();
      that.saveLocalDraft();
    }).catch(function (error) {
      that.setData({ loading: false, error: error.message || '现场记录加载失败' });
      util.showError(error);
    });
  },

  loadAssignees: function () {
    var that = this;
    return api.listAssignees(this.data.storeId).then(function (rows) {
      that.setData({ assignees: rows || [] });
    });
  },

  restoreCandidateMedia: function () {
    var that = this;
    var ids = {};
    (this.data.candidates || []).forEach(function (candidate) {
      (candidate.evidenceMediaIds || []).forEach(function (id) { ids[String(id)] = true; });
    });
    if (!Object.keys(ids).length || this.data.mediaFiles.length) return Promise.resolve();
    return api.listAllMedia({ storeId: this.data.storeId, status: 'READY' }).then(function (rows) {
      that.setData({ mediaFiles: (rows || []).filter(function (row) { return ids[String(row.mediaAssetId)]; }) });
    });
  },

  normalizeCandidates: function () {
    var assignees = this.data.assignees;
    var files = this.data.mediaFiles;
    var candidates = (this.data.candidates || []).map(function (candidate) {
      var selectedIds = (candidate.evidenceMediaIds || []).map(Number);
      var assigneeIndex = assignees.findIndex(function (row) {
        return Number(row.userId) === Number(candidate.assigneeUserId);
      });
      if (assigneeIndex < 0 && assignees.length) assigneeIndex = 0;
      return Object.assign({}, candidate, {
        severity: candidate.severity || candidate.severitySuggestion || 'MEDIUM',
        dueDate: candidate.dueDate || candidate.dueDateSuggestion || util.localDate(1),
        rectificationRequirement: candidate.rectificationRequirement || '',
        acceptanceCriteria: candidate.acceptanceCriteria || '',
        generateTask: candidate.generateTask !== false,
        assigneeIndex: assigneeIndex,
        assigneeUserId: assigneeIndex >= 0 ? assignees[assigneeIndex].userId : candidate.assigneeUserId,
        evidenceMediaIds: selectedIds,
        photoOptions: files.filter(function (file) { return file.mediaAssetId && file.uploadStatus !== 'failed'; }).map(function (file) {
          return Object.assign({}, file, { checked: selectedIds.indexOf(Number(file.mediaAssetId)) >= 0 });
        }),
      });
    });
    this.setData({ candidates: candidates });
  },

  onRawInput: function (event) {
    this.setData({ rawText: event.detail.value });
    this.saveLocalDraft();
  },

  saveRaw: function () {
    var text = String(this.data.rawText || '').trim();
    if (!text) {
      wx.showToast({ title: '请先输入现场记录', icon: 'none' });
      return;
    }
    if (this.data.saving) return;
    if (this.data.item && text === String(this.data.item.rawText || '').trim()) {
      wx.showToast({ title: '原始记录已保存', icon: 'success' });
      return;
    }
    if (this.data.item && this.data.mediaFiles.length) {
      wx.showModal({
        title: '原始记录已经锁定',
        content: '后台没有修改现场原文的接口。请先作废当前照片，再保存修订记录并重新上传与新记录关联的照片。',
        showCancel: false,
      });
      return;
    }
    var that = this;
    this.setData({ saving: true });
    api.addInspectionItem(this.data.inspectionId, {
      rowVersion: this.data.inspection.rowVersion,
      rawText: text,
      category: '现场巡查',
      sortNo: ((this.data.inspectionItems || []).length || 0) + 1,
    }).then(function (response) {
      var inspection = Object.assign({}, that.data.inspection, { rowVersion: response.inspectionRowVersion });
      that.setData({ saving: false, inspection: inspection, item: response.item, canUploadMedia: true, rawText: response.item.rawText, candidates: [], mediaFiles: [] });
      that.saveLocalDraft();
      wx.showToast({ title: '草稿已保存', icon: 'success' });
    }).catch(function (error) {
      that.setData({ saving: false });
      util.showError(error, { afterClose: function () { if (Number(error.status) === 409) that.loadPage(); } });
    });
  },

  onMediaChange: function (event) {
    this.setData({
      mediaFiles: event.detail.files || [],
      mediaUploading: !!event.detail.uploading,
    });
    this.normalizeCandidates();
    this.saveLocalDraft();
  },

  organizeDraft: function () {
    if (!this.data.item) {
      wx.showToast({ title: '请先保存原始记录', icon: 'none' });
      return;
    }
    if (this.data.mediaUploading) {
      wx.showToast({ title: '请等待照片上传完成', icon: 'none' });
      return;
    }
    if (this.data.organizing) return;
    var ids = this.readyMediaIds();
    var that = this;
    this.setData({ organizing: true });
    api.organizeDraft(this.data.inspectionId, this.data.item.inspectionItemId, {
      rowVersion: this.data.item.rowVersion,
      mediaAssetIds: ids,
    }).then(function (response) {
      var item = Object.assign({}, that.data.item, { rowVersion: response.rowVersion, aiCandidates: response.candidates });
      var candidates = (response.candidates || []).map(function (candidate) {
        return Object.assign({}, candidate, {
          severity: candidate.severitySuggestion,
          dueDate: candidate.dueDateSuggestion,
          evidenceMediaIds: candidate.evidenceMediaIds || ids,
          generateTask: true,
        });
      });
      that.setData({ organizing: false, item: item, candidates: candidates });
      that.normalizeCandidates();
      that.saveLocalDraft();
    }).catch(function (error) {
      that.setData({ organizing: false });
      util.showError(error);
    });
  },

  readyMediaIds: function () {
    return this.data.mediaFiles.filter(function (file) {
      return file.mediaAssetId && file.status === 'READY' && file.uploadStatus !== 'uploading' && file.uploadStatus !== 'failed';
    }).map(function (file) { return Number(file.mediaAssetId); });
  },

  onCandidateInput: function (event) {
    var index = Number(event.currentTarget.dataset.index);
    var field = event.currentTarget.dataset.field;
    this.setData({ ['candidates[' + index + '].' + field]: event.detail.value });
    this.saveLocalDraft();
  },

  onSeverityChange: function (event) {
    var index = Number(event.currentTarget.dataset.index);
    var option = this.data.severityOptions[Number(event.detail.value)];
    this.setData({
      ['candidates[' + index + '].severity']: option.value,
      ['candidates[' + index + '].severityIndex']: Number(event.detail.value),
    });
    this.saveLocalDraft();
  },

  onAssigneeChange: function (event) {
    var index = Number(event.currentTarget.dataset.index);
    var assigneeIndex = Number(event.detail.value);
    var assignee = this.data.assignees[assigneeIndex];
    this.setData({
      ['candidates[' + index + '].assigneeIndex']: assigneeIndex,
      ['candidates[' + index + '].assigneeUserId']: assignee ? assignee.userId : null,
    });
    this.saveLocalDraft();
  },

  onDueDateChange: function (event) {
    var index = Number(event.currentTarget.dataset.index);
    this.setData({ ['candidates[' + index + '].dueDate']: event.detail.value });
    this.saveLocalDraft();
  },

  onCandidateMediaChange: function (event) {
    var index = Number(event.currentTarget.dataset.index);
    var ids = (event.detail.value || []).map(Number);
    this.setData({ ['candidates[' + index + '].evidenceMediaIds']: ids });
    this.normalizeCandidates();
    this.saveLocalDraft();
  },

  toggleTask: function (event) {
    var index = Number(event.currentTarget.dataset.index);
    this.setData({ ['candidates[' + index + '].generateTask']: !!event.detail.value.length });
    this.saveLocalDraft();
  },

  deleteCandidate: function (event) {
    var candidates = this.data.candidates.slice();
    candidates.splice(Number(event.currentTarget.dataset.index), 1);
    this.setData({ candidates: candidates });
    this.saveLocalDraft();
  },

  moveCandidate: function (event) {
    var index = Number(event.currentTarget.dataset.index);
    var target = index + Number(event.currentTarget.dataset.direction);
    if (target < 0 || target >= this.data.candidates.length) return;
    var candidates = this.data.candidates.slice();
    var row = candidates[index];
    candidates[index] = candidates[target];
    candidates[target] = row;
    this.setData({ candidates: candidates });
    this.saveLocalDraft();
  },

  saveLocalDraft: function () {
    if (!this.draftStorageKey) return;
    wx.setStorageSync(this.draftStorageKey, {
      rawText: this.data.rawText,
      item: this.data.item,
      mediaFiles: this.data.mediaFiles,
      candidates: this.data.candidates.map(function (candidate) {
        var copy = Object.assign({}, candidate);
        delete copy.photoOptions;
        return copy;
      }),
    });
  },

  validateCandidates: function () {
    if (!this.data.candidates.length) return '请先使用 AI 整理出候选问题';
    for (var i = 0; i < this.data.candidates.length; i += 1) {
      var row = this.data.candidates[i];
      if (!String(row.title || '').trim()) return '第 ' + (i + 1) + ' 个问题缺少标题';
      if (!String(row.category || '').trim()) return '第 ' + (i + 1) + ' 个问题缺少分类';
      if (!String(row.description || '').trim()) return '第 ' + (i + 1) + ' 个问题缺少现场描述';
      if (row.generateTask && !row.assigneeUserId) return '第 ' + (i + 1) + ' 个问题未选择负责人';
      if (row.generateTask && !String(row.rectificationRequirement || '').trim()) return '第 ' + (i + 1) + ' 个问题缺少整改要求';
      if (row.generateTask && !String(row.acceptanceCriteria || '').trim()) return '第 ' + (i + 1) + ' 个问题缺少验收标准';
      if (row.generateTask && !row.dueDate) return '第 ' + (i + 1) + ' 个问题缺少截止日期';
    }
    return '';
  },

  goConfirm: function () {
    if (this.data.mediaUploading) {
      wx.showToast({ title: '照片上传中，暂不能提交', icon: 'none' });
      return;
    }
    var error = this.validateCandidates();
    if (error) {
      wx.showToast({ title: error, icon: 'none' });
      return;
    }
    this.saveLocalDraft();
    wx.navigateTo({
      url: '/subPackage-inspection/pages/issueConfirm/issueConfirm?inspectionId=' + this.data.inspectionId + '&itemId=' + this.data.item.inspectionItemId,
    });
  },

  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
