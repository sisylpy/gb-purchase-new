var api = require('../../services/api');

Page({
  data: {
    navBarHeight: 0,
    recordIds: [],
    userId: 0,
    departmentId: 0,
    distributerId: 0,
    records: [],
    inputValue: '',
    canSubmit: false,
    submitting: false,
    loading: true,
    saving: false,
  },

  onLoad: function (options) {
    var gd = getApp().globalData || {};
    var sys = wx.getSystemInfoSync();
    var userInfo = wx.getStorageSync('userInfo') || {};
    var mendianInfo = wx.getStorageSync('mendianInfo') || {};
    var ids = String(options.recordIds || options.recordId || '').split(',').filter(function (id) {
      return /^\d+$/.test(id);
    }).map(function (id) { return Number(id); });
    this.setData({
      navBarHeight: Math.round((gd.navBarHeight || (sys.statusBarHeight + 44)) * 750 / sys.windowWidth),
      recordIds: ids,
      userId: userInfo.gbDepartmentUserId,
      departmentId: mendianInfo.gbDepartmentId || userInfo.gbDuDepartmentId || 0,
      distributerId: mendianInfo.gbDepartmentDisId || userInfo.gbDuDistributerId || 0,
    });
    this._load();
  },

  _unwrap: function (res) {
    var result = res.result || res || {};
    if (result.code !== undefined && result.code !== 0 && result.code !== '0') {
      throw new Error(result.msg || result.message || '请求失败');
    }
    return result.data || result;
  },

  _load: function () {
    var that = this;
    if (!that.data.recordIds.length) {
      that.setData({ loading: false, records: [] });
      return;
    }
    var requests = that.data.recordIds.map(function (recordId) {
      return api.getWorkRecord(recordId, { userId: that.data.userId });
    });
    requests.push(api.getWorkRecordCategories({
      userId: that.data.userId,
      distributerId: that.data.distributerId || undefined,
    }));
    Promise.all(requests).then(function (responses) {
      var categories = that._unwrap(responses[responses.length - 1]);
      categories = Array.isArray(categories) ? categories : [];
      var records = responses.slice(0, -1).map(function (response) {
        var record = that._unwrap(response);
        var selectedIds = (record.tags || []).map(function (tag) { return Number(tag.categoryId); });
        return {
          recordId: record.recordId,
          title: record.title || record.displayTitle || '',
          content: record.polishedContent || '',
          selectedTagIds: selectedIds,
          tagOptions: categories.map(function (category) {
            var id = Number(category.categoryId || category.id);
            return {
              id: id,
              code: category.categoryCode || category.code || '',
              name: category.categoryName || category.name || '未命名标签',
              selected: selectedIds.indexOf(id) >= 0,
            };
          }),
        };
      });
      that.setData({ records: records, loading: false });
    }).catch(function (err) {
      console.error('[工作记录确认] 加载失败', err);
      that.setData({ loading: false });
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    });
  },

  onTitleInput: function (e) {
    var key = 'records[' + Number(e.currentTarget.dataset.index) + '].title';
    this.setData({ [key]: e.detail.value || '' });
  },

  onContentInput: function (e) {
    var key = 'records[' + Number(e.currentTarget.dataset.index) + '].content';
    this.setData({ [key]: e.detail.value || '' });
  },

  onInputChange: function (e) {
    var value = e.detail.value || '';
    this.setData({ inputValue: value, canSubmit: value.trim().length > 0 });
  },

  onSubmit: function () {
    var that = this;
    var content = (that.data.inputValue || '').trim();
    if (!content) {
      wx.showToast({ title: '请输入记录内容', icon: 'none' });
      return;
    }
    if (that.data.submitting) return;

    that.setData({ submitting: true, canSubmit: false });
    wx.showLoading({ title: 'AI整理中', mask: true });
    api.createWorkRecord({
      userId: that.data.userId,
      departmentId: that.data.departmentId,
      distributerId: that.data.distributerId || undefined,
      inputType: 'TEXT',
      content: content,
    }).then(function (res) {
      var data = that._unwrap(res);
      var preparedRecords = Array.isArray(data.records) ? data.records : [];
      if (!preparedRecords.length || preparedRecords.some(function (item) { return item.aiStatus !== 'SUCCESS'; })) {
        throw new Error((preparedRecords[0] && preparedRecords[0].aiErrorCode) || 'AI整理失败');
      }
      var recordIds = preparedRecords.map(function (item) { return Number(item.recordId); });
      wx.hideLoading();
      that.setData({
        inputValue: '',
        canSubmit: false,
        submitting: false,
        loading: true,
        recordIds: recordIds,
      });
      that._load();
    }).catch(function (err) {
      wx.hideLoading();
      that.setData({ submitting: false, canSubmit: content.length > 0 });
      console.error('[工作记录识别] AI整理失败', err);
      wx.showToast({ title: err.message || 'AI整理失败，请重试', icon: 'none' });
    });
  },

  onToggleTag: function (e) {
    var recordIndex = Number(e.currentTarget.dataset.recordIndex);
    var id = Number(e.currentTarget.dataset.id);
    var records = this.data.records.slice();
    var record = records[recordIndex];
    if (!record) return;
    var target = null;
    for (var i = 0; i < record.tagOptions.length; i++) {
      if (record.tagOptions[i].id === id) { target = record.tagOptions[i]; break; }
    }
    if (!target) return;
    var nextSelected = !target.selected;
    if (nextSelected && target.code === 'OTHER') {
      record.selectedTagIds = [];
      record.tagOptions.forEach(function (item) { item.selected = false; });
    } else if (nextSelected) {
      record.tagOptions.forEach(function (item) { if (item.code === 'OTHER') item.selected = false; });
      record.selectedTagIds = record.selectedTagIds.filter(function (selectedId) {
        for (var index = 0; index < record.tagOptions.length; index++) {
          if (record.tagOptions[index].id === selectedId) return record.tagOptions[index].code !== 'OTHER';
        }
        return true;
      });
    }
    target.selected = nextSelected;
    if (nextSelected) record.selectedTagIds.push(id);
    else record.selectedTagIds = record.selectedTagIds.filter(function (selectedId) { return selectedId !== id; });
    this.setData({ records: records });
  },

  onConfirm: function () {
    var that = this;
    var records = that.data.records;
    for (var i = 0; i < records.length; i++) {
      if (!(records[i].title || '').trim()) return wx.showToast({ title: '第' + (i + 1) + '条标题不能为空', icon: 'none' });
      if (!(records[i].content || '').trim()) return wx.showToast({ title: '第' + (i + 1) + '条内容不能为空', icon: 'none' });
      if (!records[i].selectedTagIds.length) return wx.showToast({ title: '第' + (i + 1) + '条至少选择一个标签', icon: 'none' });
    }
    if (that.data.saving) return;
    that.setData({ saving: true });
    wx.showLoading({ title: '分别保存中', mask: true });
    Promise.all(records.map(function (record) {
      return api.confirmWorkRecord(record.recordId, {
        userId: that.data.userId,
        title: record.title.trim(),
        content: record.content.trim(),
        tagIds: record.selectedTagIds,
      }).then(that._unwrap.bind(that));
    })).then(function () {
      wx.hideLoading();
      wx.showToast({ title: records.length + '条工作记录已保存', icon: 'success' });
      setTimeout(function () { wx.navigateBack(); }, 900);
    }).catch(function (err) {
      wx.hideLoading();
      that.setData({ saving: false });
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    });
  },

  toBack: function () { wx.navigateBack(); },
});
