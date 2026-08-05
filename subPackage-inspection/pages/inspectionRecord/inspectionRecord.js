var app = getApp();
var api = require('../../../services/franchiseInspection');
var util = require('../../../utils/franchiseInspection');

function persistedMedia(files) {
  return (files || []).filter(function (file) {
    return file && file.mediaAssetId && file.status === 'READY';
  }).map(function (file) {
    return {
      localKey: 'asset-' + file.mediaAssetId,
      mediaAssetId: file.mediaAssetId,
      status: file.status,
      rowVersion: file.rowVersion,
      originalFileName: file.originalFileName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      originalUrl: file.originalUrl,
      thumbnailUrl: file.thumbnailUrl,
      createdAt: file.createdAt,
      uploadStatus: 'ready',
      progress: 100,
    };
  });
}

Page({
  data: {
    navBarHeight: 0,
    loading: true,
    saving: false,
    voiding: false,
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
    rawDirty: false,
    candidateDirty: false,
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
      var activeItems = items.filter(function (row) { return row.recordStatus !== 'VOID'; });
      var localItemId = local.item && Number(local.item.inspectionItemId);
      var item = localItemId
        ? activeItems.find(function (row) { return Number(row.inspectionItemId) === localItemId; })
        : (activeItems.length ? activeItems[activeItems.length - 1] : null);
      var sameItem = !localItemId || (item && Number(item.inspectionItemId) === localItemId);
      var useLocalDraft = localItemId
        ? sameItem && Number(local.item.rowVersion) === Number(item && item.rowVersion)
        : !item;
      var candidates = useLocalDraft && local.candidates && local.candidates.length
        ? local.candidates : ((item && item.aiCandidates) || []);
      var rawText = useLocalDraft && typeof local.rawText === 'string' ? local.rawText : (item ? item.rawText : '');
      that.identity = identity;
      that.setData({
        identity: identity,
        inspectionId: inspection.inspectionId,
        storeId: inspection.storeId,
        inspection: inspection,
        inspectionItems: items,
        store: store || { storeId: inspection.storeId, storeName: '未命名门店' },
        item: item,
        canUploadMedia: !!item,
        rawText: rawText,
        rawDirty: !!item && String(rawText || '').trim() !== String(item.rawText || '').trim(),
        mediaFiles: useLocalDraft ? persistedMedia(local.mediaFiles || []) : [],
        candidates: candidates,
        candidateDirty: false,
        loading: false,
      });
      return Promise.all([that.loadAssignees(), that.restoreItemMedia()]);
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

  restoreItemMedia: function () {
    var that = this;
    if (!this.data.item) return Promise.resolve();
    var localMap = {};
    (this.data.mediaFiles || []).forEach(function (row) { localMap[String(row.mediaAssetId)] = row; });
    return api.listRelatedMedia('INSPECTION_ITEM', this.data.item.inspectionItemId, 'INSPECTION_EVIDENCE').then(function (rows) {
      that.setData({ mediaFiles: (rows || []).map(function (row) {
        return Object.assign({}, row, localMap[String(row.mediaAssetId)] || {});
      }) });
    });
  },

  normalizeCandidates: function () {
    var assignees = this.data.assignees;
    var files = this.data.mediaFiles;
    var candidates = (this.data.candidates || []).map(function (candidate) {
      var selectedIds = (candidate.evidenceMediaIds || []).map(Number);
      var selectedMap = {};
      selectedIds.forEach(function (id) { selectedMap[String(id)] = true; });
      selectedIds = files.filter(function (file) {
        return file.mediaAssetId && selectedMap[String(file.mediaAssetId)];
      }).map(function (file) { return Number(file.mediaAssetId); });
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
        severityIndex: Math.max(0, ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].indexOf(candidate.severity || candidate.severitySuggestion || 'MEDIUM')),
        severityLabel: util.severityLabel(candidate.severity || candidate.severitySuggestion || 'MEDIUM'),
        assigneeIndex: assigneeIndex,
        assigneeUserId: assigneeIndex >= 0 ? assignees[assigneeIndex].userId : candidate.assigneeUserId,
        assigneeName: assigneeIndex >= 0 ? assignees[assigneeIndex].userName : '请选择目标门店店长',
        evidenceMediaIds: selectedIds,
        photoOptions: files.filter(function (file) { return file.mediaAssetId && file.status === 'READY' && file.uploadStatus !== 'failed'; }).map(function (file) {
          return Object.assign({}, file, { checked: selectedIds.indexOf(Number(file.mediaAssetId)) >= 0 });
        }),
      });
    });
    this.setData({ candidates: candidates });
  },

  onRawInput: function (event) {
    this.setData({
      rawText: event.detail.value,
      rawDirty: !this.data.item || String(event.detail.value || '').trim() !== String(this.data.item.rawText || '').trim(),
    });
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
    var that = this;
    this.setData({ saving: true });
    var updating = !!this.data.item;
    var request = {
      rowVersion: updating ? this.data.item.rowVersion : this.data.inspection.rowVersion,
      rawText: text,
      category: '现场巡查',
      sortNo: updating ? this.data.item.sortNo : (((this.data.inspectionItems || []).length || 0) + 1),
    };
    var operation = updating
      ? api.updateInspectionItem(this.data.inspectionId, this.data.item.inspectionItemId, request)
      : api.addInspectionItem(this.data.inspectionId, request);
    operation.then(function (response) {
      var savedItem = updating ? response : response.item;
      var inspection = updating ? that.data.inspection : Object.assign({}, that.data.inspection, { rowVersion: response.inspectionRowVersion });
      var items = (that.data.inspectionItems || []).slice();
      var itemIndex = items.findIndex(function (row) { return Number(row.inspectionItemId) === Number(savedItem.inspectionItemId); });
      if (itemIndex >= 0) items[itemIndex] = savedItem; else items.push(savedItem);
      that.setData({ saving: false, inspection: inspection, inspectionItems: items, item: savedItem, canUploadMedia: true, rawText: savedItem.rawText, rawDirty: false, candidates: [], candidateDirty: false, mediaFiles: updating ? that.data.mediaFiles : [] });
      that.saveLocalDraft();
      wx.showToast({ title: updating ? '原文已修改' : '草稿已保存', icon: 'success' });
    }).catch(function (error) {
      that.setData({ saving: false });
      util.showError(error, { afterClose: function () { if (Number(error.status) === 409) that.loadPage(); } });
    });
  },

  voidRaw: function () {
    if (!this.data.item || this.data.voiding) return;
    var that = this;
    wx.showModal({
      title: '作废现场原文',
      content: '',
      editable: true,
      placeholderText: '请输入作废原因',
      confirmColor: '#c53b3b',
      success: function (result) {
        if (!result.confirm) return;
        var reason = String(result.content || '').trim();
        if (!reason) { wx.showToast({ title: '请填写作废原因', icon: 'none' }); return; }
        that.setData({ voiding: true });
        api.voidInspectionItem(that.data.inspectionId, that.data.item.inspectionItemId, {
          rowVersion: that.data.item.rowVersion,
          reason: reason,
        }).then(function (response) {
          var inspection = that.data.inspection;
          var items = (that.data.inspectionItems || []).map(function (row) {
            return Number(row.inspectionItemId) === Number(response.inspectionItemId) ? response : row;
          });
          that.setData({
            voiding: false, inspection: inspection, inspectionItems: items, item: null,
            rawText: '', rawDirty: false, canUploadMedia: false, mediaFiles: [], candidates: [], candidateDirty: false,
          });
          that.saveLocalDraft();
          wx.showToast({ title: '现场原文已作废', icon: 'success' });
        }).catch(function (error) {
          that.setData({ voiding: false });
          util.showError(error, { afterClose: function () { if (Number(error.status) === 409) that.loadPage(); } });
        });
      },
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
    var that = this;
    if (this.data.candidates.length) {
      util.confirm('重新使用 AI 整理', '将替换当前未正式提交的候选问题编辑，原始记录和照片不变。是否继续？').then(function (confirmed) {
        if (confirmed) that.runOrganizeDraft();
      });
      return;
    }
    this.runOrganizeDraft();
  },

  runOrganizeDraft: function () {
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
      that.setData({ organizing: false, item: item, candidates: candidates, candidateDirty: false });
      that.normalizeCandidates();
      that.saveLocalDraft();
    }).catch(function (error) {
      that.setData({ organizing: false });
      var refresh = Number(error && error.status) === 422 ? that.refreshItemAfterAiFailure() : Promise.resolve();
      refresh.catch(function () {}).then(function () { util.showError(error); });
    });
  },

  refreshItemAfterAiFailure: function () {
    var that = this;
    return api.getInspection(this.data.inspectionId).then(function (detail) {
      var latest = (detail.items || []).find(function (row) {
        return Number(row.inspectionItemId) === Number(that.data.item.inspectionItemId);
      });
      if (!latest) return;
      that.setData({ item: latest, inspection: detail.inspection, inspectionItems: detail.items || [] });
      that.saveLocalDraft();
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
    this.setData({ ['candidates[' + index + '].' + field]: event.detail.value, candidateDirty: true });
    this.saveLocalDraft();
  },

  onSeverityChange: function (event) {
    var index = Number(event.currentTarget.dataset.index);
    var option = this.data.severityOptions[Number(event.detail.value)];
    this.setData({
      ['candidates[' + index + '].severity']: option.value,
      ['candidates[' + index + '].severityIndex']: Number(event.detail.value),
      ['candidates[' + index + '].severityLabel']: option.label,
      candidateDirty: true,
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
      ['candidates[' + index + '].assigneeName']: assignee ? assignee.userName : '请选择目标门店店长',
      candidateDirty: true,
    });
    this.saveLocalDraft();
  },

  onDueDateChange: function (event) {
    var index = Number(event.currentTarget.dataset.index);
    this.setData({ ['candidates[' + index + '].dueDate']: event.detail.value, candidateDirty: true });
    this.saveLocalDraft();
  },

  onCandidateMediaChange: function (event) {
    var index = Number(event.currentTarget.dataset.index);
    var ids = (event.detail.value || []).map(Number);
    this.setData({ ['candidates[' + index + '].evidenceMediaIds']: ids, candidateDirty: true });
    this.normalizeCandidates();
    this.saveLocalDraft();
  },

  toggleTask: function (event) {
    var index = Number(event.currentTarget.dataset.index);
    this.setData({ ['candidates[' + index + '].generateTask']: !!event.detail.value.length, candidateDirty: true });
    this.saveLocalDraft();
  },

  deleteCandidate: function (event) {
    var candidates = this.data.candidates.slice();
    candidates.splice(Number(event.currentTarget.dataset.index), 1);
    this.setData({ candidates: candidates, candidateDirty: true });
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
    this.setData({ candidates: candidates, candidateDirty: true });
    this.saveLocalDraft();
  },

  saveLocalDraft: function () {
    if (!this.draftStorageKey) return;
    wx.setStorageSync(this.draftStorageKey, {
      rawText: this.data.rawText,
      item: this.data.item,
      mediaFiles: persistedMedia(this.data.mediaFiles),
      candidates: this.data.candidates.map(function (candidate) {
        var copy = Object.assign({}, candidate);
        delete copy.photoOptions;
        return copy;
      }),
    });
  },

  validateCandidates: function () {
    var selected = this.data.candidates.filter(function (row) { return row.generateTask !== false; });
    if (!this.data.candidates.length) return '请先使用 AI 整理出候选问题';
    if (!selected.length) return '请至少确认一个候选问题';
    for (var i = 0; i < selected.length; i += 1) {
      var row = selected[i];
      if (!String(row.title || '').trim()) return '第 ' + (i + 1) + ' 个问题缺少标题';
      if (!String(row.category || '').trim()) return '第 ' + (i + 1) + ' 个问题缺少分类';
      if (!String(row.description || '').trim()) return '第 ' + (i + 1) + ' 个问题缺少现场描述';
      if (!row.assigneeUserId) return '第 ' + (i + 1) + ' 个问题未选择负责人';
      if (!String(row.rectificationRequirement || '').trim()) return '第 ' + (i + 1) + ' 个问题缺少整改要求';
      if (!String(row.acceptanceCriteria || '').trim()) return '第 ' + (i + 1) + ' 个问题缺少验收标准';
      if (!row.dueDate) return '第 ' + (i + 1) + ' 个问题缺少截止日期';
    }
    return '';
  },

  retry: function () { this.loadPage(); },

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
