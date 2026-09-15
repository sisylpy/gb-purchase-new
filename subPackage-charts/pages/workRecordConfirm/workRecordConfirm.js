var api = require('../../services/api');

Page({
  data: {
    navBarHeight: 0,
    recordId: null,
    userId: 0,
    distributerId: 0,
    title: '',
    content: '',
    categories: [],
    selectedTagIds: [],
    loading: true,
    saving: false,
  },

  onLoad: function (options) {
    var app = getApp();
    var gd = app.globalData || {};
    var sys = wx.getSystemInfoSync();
    var userInfo = wx.getStorageSync('userInfo') || {};
    this.setData({
      navBarHeight: Math.round((gd.navBarHeight || (sys.statusBarHeight + 44)) * 750 / sys.windowWidth),
      recordId: Number(options.recordId),
      userId: userInfo.gbDepartmentUserId,
      distributerId: userInfo.gbDuDistributerId || 0,
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
    Promise.all([
      api.getWorkRecord(that.data.recordId, { userId: that.data.userId }),
      api.getWorkRecordCategories({
        userId: that.data.userId,
        distributerId: that.data.distributerId || undefined,
      }),
    ]).then(function (responses) {
      var record = that._unwrap(responses[0]);
      var categories = that._unwrap(responses[1]);
      categories = Array.isArray(categories) ? categories : [];
      var selectedIds = (record.tags || []).map(function (tag) { return Number(tag.categoryId); });
      categories = categories.map(function (category) {
        var id = Number(category.categoryId || category.id);
        return {
          id: id,
          code: category.categoryCode || category.code || '',
          name: category.categoryName || category.name || '未命名标签',
          selected: selectedIds.indexOf(id) >= 0,
        };
      });
      that.setData({
        title: record.title || record.displayTitle || '',
        content: record.polishedContent || '',
        categories: categories,
        selectedTagIds: selectedIds,
        loading: false,
      });
    }).catch(function (err) {
      console.error('[工作记录确认] 加载失败', err);
      that.setData({ loading: false });
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    });
  },

  onTitleInput: function (e) {
    this.setData({ title: e.detail.value || '' });
  },

  onContentInput: function (e) {
    this.setData({ content: e.detail.value || '' });
  },

  onToggleTag: function (e) {
    var id = Number(e.currentTarget.dataset.id);
    var categories = this.data.categories.slice();
    var selectedIds = this.data.selectedTagIds.slice();
    var target = null;
    for (var i = 0; i < categories.length; i++) {
      if (categories[i].id === id) { target = categories[i]; break; }
    }
    if (!target) return;
    var nextSelected = !target.selected;
    if (nextSelected && target.code === 'OTHER') {
      selectedIds = [];
      categories.forEach(function (item) { item.selected = false; });
    } else if (nextSelected) {
      categories.forEach(function (item) {
        if (item.code === 'OTHER') item.selected = false;
      });
      selectedIds = selectedIds.filter(function (selectedId) {
        var selected = null;
        for (var index = 0; index < categories.length; index++) {
          if (categories[index].id === selectedId) { selected = categories[index]; break; }
        }
        return !selected || selected.code !== 'OTHER';
      });
    }
    target.selected = nextSelected;
    if (nextSelected) selectedIds.push(id);
    else selectedIds = selectedIds.filter(function (selectedId) { return selectedId !== id; });
    this.setData({ categories: categories, selectedTagIds: selectedIds });
  },

  onConfirm: function () {
    var that = this;
    var title = (that.data.title || '').trim();
    var content = (that.data.content || '').trim();
    if (!title) return wx.showToast({ title: '标题不能为空', icon: 'none' });
    if (!content) return wx.showToast({ title: '记录内容不能为空', icon: 'none' });
    if (!that.data.selectedTagIds.length) return wx.showToast({ title: '请至少选择一个标签', icon: 'none' });
    if (that.data.saving) return;

    that.setData({ saving: true });
    wx.showLoading({ title: '正式保存中', mask: true });
    api.confirmWorkRecord(that.data.recordId, {
      userId: that.data.userId,
      title: title,
      content: content,
      tagIds: that.data.selectedTagIds,
    }).then(function (res) {
      that._unwrap(res);
      wx.hideLoading();
      wx.showToast({ title: '工作记录已保存', icon: 'success' });
      setTimeout(function () { wx.navigateBack(); }, 900);
    }).catch(function (err) {
      wx.hideLoading();
      that.setData({ saving: false });
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    });
  },

  toBack: function () {
    wx.navigateBack();
  },
});
