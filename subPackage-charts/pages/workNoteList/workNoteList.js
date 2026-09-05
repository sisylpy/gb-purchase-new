/**
 * 我的工作笔记 - 跨会话查看所有笔记
 *
 * API：
 * - listMyWorkNotes({ userId, page, pageSize })  GET /ai/work-notes/mine
 * - deleteWorkNote(noteId, userId)                DELETE /ai/work-notes/{noteId}?userId=
 *
 * 返回字段：id / title / content / noteType / conversationId /
 *           sourceAnswerPreview / sourceTextSnapshot(详情) / createdAt / updatedAt
 */

var api = require('../../services/api');

var PAGE_SIZE = 20;

// noteType 显示映射
var NOTE_TYPE_LABELS = {
  MANUAL: '手动记录',
  FROM_RUN: 'AI 建议',
  FROM_PIN: '图钉升级',
  FROM_SELECTION: '选中文本',
  FROM_MESSAGE: '消息记录',
};

var NOTE_TYPE_COLORS = {
  MANUAL: { bg: '#f0f4ff', color: '#4a6cf7' },
  FROM_RUN: { bg: '#e8f5e9', color: '#2e7d32' },
  FROM_PIN: { bg: '#fff3e0', color: '#e65100' },
  FROM_SELECTION: { bg: '#f3e5f5', color: '#7b1fa2' },
  FROM_MESSAGE: { bg: '#e3f2fd', color: '#1565c0' },
};

Page({
  data: {
    notes: [],
    loading: false,
    refreshing: false,
    loadingMore: false,
    page: 1,
    total: 0,
    hasMore: false,
    navBarHeight: 0,
    userId: 0,
    departmentId: 0,
    distributerId: 0,

    // 编辑弹窗
    showEditModal: false,
    editForm: { noteId: 0, title: '', content: '' },
    editingNoteId: 0,
  },

  onLoad: function () {
    var userInfo = wx.getStorageSync('userInfo') || {};
    var userId = userInfo.gbDepartmentUserId;
  
      var depInfo = wx.getStorageSync('mendianInfo');
      if(depInfo){
        this.setData({
          depInfo: depInfo,
          userId:userId,
          departmentId: depInfo.gbDepartmentId,
        distributerId: depInfo.gbDepartmentDisId,
        navBarHeight: getApp().globalData.navBarHeight || 88,

        })
      }
  
   
    this.loadNotes();
  },

  onShow: function () {
    this.loadNotes(true);
  },

  // ========== 加载笔记列表 ==========

  /**
   * @param {boolean} reset - 是否重置分页
   */
  loadNotes: function (reset) {
    var that = this;
    var userId = that.data.userId;

    if (reset) {
      that.setData({ page: 1, loading: true, refreshing: false });
    }

    if (!userId) {
      console.warn('[工作笔记列表] loadNotes 跳过: 无有效 userId');
      that.setData({ loading: false, refreshing: false });
      return;
    }

    if (!reset && !that.data.loading) {
      that.setData({ loading: true });
    }

    var params = {
      userId: userId,
      page: that.data.page,
      pageSize: PAGE_SIZE,
    };

    api.listMyWorkNotes(params)
      .then(function (res) {
        var result = res.result || {};
        var body = result.data || result;

        // 解析分页响应
        var items = [];
        var total = 0;
        var page = that.data.page;

        if (body && Array.isArray(body.items)) {
          items = body.items;
          total = Number(body.total) || 0;
          page = Number(body.page) || page;
        } else if (Array.isArray(body)) {
          items = body;
          total = items.length;
        }

        var notes = items.map(function (item) {
          return that._mapNoteItem(item);
        }).filter(Boolean);

        var finalNotes;
        if (page === 1) {
          finalNotes = notes;
        } else {
          finalNotes = that.data.notes.concat(notes);
        }

        var hasMore = finalNotes.length < total;

        that.setData({
          notes: finalNotes,
          page: page,
          total: total,
          hasMore: hasMore,
          loading: false,
          refreshing: false,
          loadingMore: false,
        });
      })
      .catch(function (err) {
        console.error('[工作笔记列表] 加载失败', err);
        that.setData({
          loading: false,
          refreshing: false,
          loadingMore: false,
        });
        wx.showToast({ title: '加载笔记列表失败', icon: 'none' });
      });
  },

  // ========== 下拉刷新 ==========

  onRefresh: function () {
    this.setData({ refreshing: true, page: 1 });
    this.loadNotes(true);
  },

  // ========== 上拉加载更多 ==========

  onScrollToLower: function () {
    var that = this;
    if (that.data.loadingMore || !that.data.hasMore || that.data.loading) return;

    that.setData({
      loadingMore: true,
      page: that.data.page + 1,
    });
    that.loadNotes(false);
  },

  // ========== 格式化时间 ==========

  _formatTime: function (iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var now = new Date();
    var diff = now.getTime() - d.getTime();
    var minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return minutes + '分钟前';
    var hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + '小时前';
    var days = Math.floor(hours / 24);
    if (days < 7) return days + '天前';
    var year = d.getFullYear();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  },

  // ========== 映射后端 DTO → 前端展示 Note ==========

  _mapNoteItem: function (row) {
    if (!row || typeof row !== 'object') return null;

    var noteId = row.noteId != null ? Number(row.noteId) : NaN;
    if (!isFinite(noteId)) return null;

    var title = String(row.title || '未命名笔记');
    var noteType = String(row.noteType || 'MANUAL');
    var preview = String(row.preview || row.sourceAnswerPreview || row.content || '');
    var createdAt = String(row.createdAt || '');
    var conversationId = row.conversationId != null ? String(row.conversationId) : '';

    var typeInfo = NOTE_TYPE_COLORS[noteType] || NOTE_TYPE_COLORS.MANUAL;
    var typeLabel = NOTE_TYPE_LABELS[noteType] || noteType;

    return {
      noteId: noteId,
      title: title,
      noteType: noteType,
      typeLabel: typeLabel,
      typeBg: typeInfo.bg,
      typeColor: typeInfo.color,
      preview: preview,
      content: row.content || '',
      conversationId: conversationId,
      runId: row.runId != null ? String(row.runId) : '',
      messageId: row.messageId != null ? String(row.messageId) : '',
      createdAt: createdAt,
      updatedAt: String(row.updatedAt || ''),
      _timeLabel: this._formatTime(createdAt),
      _sortTime: createdAt ? new Date(createdAt).getTime() : 0,
      // 详情展开态
      _expanded: false,
      _loadingDetail: false,
      _detailLoaded: false,
    };
  },

  // ========== 查看笔记详情 ==========

  onViewNote: function (e) {
    var noteId = e.currentTarget.dataset.noteId;
    var conversationId = e.currentTarget.dataset.conversationId;
    var runId = e.currentTarget.dataset.runId;
    if (conversationId) {
      var url = '/subPackage-charts/pages/aiChat/aiChat?loadConversationId=' + conversationId;
      if (runId) url += '&loadRunId=' + runId;
      wx.navigateTo({ url: url });
    } else {
      this._toggleDetail(e);
    }
    console.log('[工作笔记列表] 查看笔记', { noteId: noteId, conversationId: conversationId });
  },

  // ========== 内联展开/收起笔记内容 ==========

  _toggleDetail: function (e) {
    var noteId = e.currentTarget.dataset.noteId;
    var notes = this.data.notes;
    for (var i = 0; i < notes.length; i++) {
      if (notes[i].noteId === noteId) {
        var key = 'notes[' + i + ']._expanded';
        this.setData({
          [key]: !notes[i]._expanded,
        });
        return;
      }
    }
  },

  // ========== 删除笔记 ==========

  onDeleteNote: function (e) {
    var that = this;
    var noteId = e.currentTarget.dataset.noteId;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除该工作笔记吗？',
      confirmText: '删除',
      confirmColor: '#fa5151',
      success: function (modalRes) {
        if (modalRes.confirm) {
          that._doDeleteNote(noteId);
        }
      },
    });
  },

  _doDeleteNote: function (noteId) {
    var that = this;
    var userId = that.data.userId;
    if (!userId) {
      wx.showToast({ title: '未获取到登录信息', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '删除中…', mask: true });

    api.deleteWorkNote(noteId, userId)
      .then(function (res) {
        wx.hideLoading();
        wx.showToast({ title: '已删除', icon: 'success', duration: 1500 });

        var notes = that.data.notes.filter(function (n) {
          return n.noteId !== noteId;
        });
        that.setData({
          notes: notes,
          total: Math.max(0, (that.data.total || 1) - 1),
        });
      })
      .catch(function (err) {
        wx.hideLoading();
        console.error('[工作笔记列表] 删除失败', err);
        var errMsg = '删除失败';
        if (err && err.message) errMsg = err.message;
        else if (err && err.data && err.data.message) errMsg = err.data.message;
        wx.showToast({ title: errMsg, icon: 'none', duration: 2500 });
      });
  },

  // ========== 修改笔记 ==========

  /**
   * 点击「修改」按钮 — 拉取详情后打开编辑弹窗
   */
  onEditNote: function (e) {
    var that = this;
    var noteId = e.currentTarget.dataset.noteId;

    // 先从列表缓存里找
    var note = null;
    var notes = that.data.notes;
    for (var i = 0; i < notes.length; i++) {
      if (notes[i].noteId === noteId) {
        note = notes[i];
        break;
      }
    }

    // 快速定位已有内容（预览 or 上次展开的内容）
    var cachedContent = (note && note.content) || '';

    that.setData({
      editingNoteId: noteId,
      editForm: {
        noteId: noteId,
        title: note ? note.title : '',
        content: cachedContent,
      },
      showEditModal: true,
    });

    // 如果列表里没有 content，拉取详情补齐
    if (!cachedContent && that.data.userId) {
      that.setData({ 'editForm._loadingDetail': true });
      api.getWorkNoteDetail(noteId, that.data.userId)
        .then(function (res) {
          var result = (res && res.result) || res || {};
          var body = result.data || result;
          if (body && typeof body.content === 'string') {
            that.setData({
              'editForm.content': body.content,
            });
          }
        })
        .catch(function (err) {
          console.warn('[工作笔记] 获取详情失败（仍允许编辑）', err);
        })
        .finally(function () {
          that.setData({ 'editForm._loadingDetail': false });
        });
    }
  },

  /**
   * 编辑弹窗 — 标题输入
   */
  onEditTitleInput: function (e) {
    this.setData({ 'editForm.title': e.detail.value || '' });
  },

  /**
   * 编辑弹窗 — 内容输入
   */
  onEditContentInput: function (e) {
    this.setData({ 'editForm.content': e.detail.value || '' });
  },

  /**
   * 关闭编辑弹窗
   */
  onCloseEditModal: function () {
    this.setData({
      showEditModal: false,
      editForm: { noteId: 0, title: '', content: '' },
      editingNoteId: 0,
    });
  },

  /**
   * 保存修改
   */
  onSaveEdit: function () {
    var that = this;
    var form = that.data.editForm;
    var userId = that.data.userId;

    if (!form.title.trim()) {
      wx.showToast({ title: '标题不能为空', icon: 'none' });
      return;
    }
    if (!userId) {
      wx.showToast({ title: '未获取到登录信息', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中…', mask: true });

    api.updateWorkNote(form.noteId, userId, {
      title: form.title.trim(),
      content: form.content || '',
    })
      .then(function () {
        wx.hideLoading();
        wx.showToast({ title: '已保存', icon: 'success', duration: 1500 });
        that.onCloseEditModal();

        // 原地更新列表中的笔记
        var notes = that.data.notes;
        var updated = false;
        for (var i = 0; i < notes.length; i++) {
          if (notes[i].noteId === form.noteId) {
            that.setData({
              ['notes[' + i + '].title']: form.title.trim(),
              ['notes[' + i + '].content']: form.content || '',
              ['notes[' + i + '].preview']: (form.content || '').substring(0, 200),
            });
            updated = true;
            break;
          }
        }
        if (!updated) {
          // 没找到就重新刷新列表
          that.loadNotes(true);
        }
      })
      .catch(function (err) {
        wx.hideLoading();
        console.error('[工作笔记] 修改失败', err);
        var errMsg = '保存失败';
        if (err && err.data && err.data.message) errMsg = err.data.message;
        else if (err && err.message) errMsg = err.message;
        wx.showToast({ title: errMsg, icon: 'none', duration: 2500 });
      });
  },

  // ========== 推送到公告 ==========

  /**
   * 点击「推送到公告」
   */
  onPushToAnnouncement: function (e) {
    var that = this;
    var noteId = e.currentTarget.dataset.noteId;

    wx.showModal({
      title: '推送到公告',
      content: '确定要把这篇笔记推送到店内公告吗？推送后所有店员均可查看。',
      confirmText: '确认推送',
      confirmColor: '#07c160',
      success: function (modalRes) {
        if (modalRes.confirm) {
          that._doPushToAnnouncement(noteId);
        }
      },
    });
  },

  _doPushToAnnouncement: function (noteId) {
    var that = this;
    var userId = that.data.userId;
    if (!userId) {
      wx.showToast({ title: '未获取到登录信息', icon: 'none' });
      return;
    }

    var payload = { userId: userId };
    if (that.data.departmentId) payload.departmentId = that.data.departmentId;
    if (that.data.distributerId) payload.distributerId = that.data.distributerId;

    wx.showLoading({ title: '推送中…', mask: true });

    api.pushWorkNoteToAnnouncement(noteId, payload)
      .then(function () {
        wx.hideLoading();
        wx.showToast({ title: '已推送', icon: 'success', duration: 1500 });
      })
      .catch(function (err) {
        wx.hideLoading();
        console.error('[工作笔记] 推送失败', err);
        var errMsg = '推送失败';
        if (err && err.data && err.data.message) errMsg = err.data.message;
        else if (err && err.message) errMsg = err.message;
        wx.showToast({ title: errMsg, icon: 'none', duration: 2500 });
      });
  },

  // ========== 返回 ==========

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  },
});
