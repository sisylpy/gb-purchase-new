var api = require('../../services/supportTempGoods');
var app = getApp();

function messageOf(err, fallback) {
  if (err && err.data && err.data.msg) return err.data.msg;
  if (err && err.message) return err.message;
  return fallback || '操作失败，请稍后重试';
}

function formatTime(value) {
  if (!value) return '';
  if (Array.isArray(value) && value.length >= 5) {
    return value[0] + '-' + pad(value[1]) + '-' + pad(value[2]) + ' ' + pad(value[3]) + ':' + pad(value[4]);
  }
  return String(value).replace('T', ' ').substring(0, 16);
}

function pad(value) {
  return Number(value) < 10 ? '0' + value : String(value);
}

function normalizeTasks(rows) {
  return (rows || []).map(function (row) {
    row.createdAtText = formatTime(row.createdAt);
    row.statusText = row.status === 'COMPLETED' ? '已完成'
      : row.status === 'CLAIMED' ? (row.claimedByMe ? '我正在处理' : '其他客服处理中') : '待领取';
    return row;
  });
}

Page({
  data: {
    statusBarHeight: 20,
    navHeight: 68,
    scope: 'OPEN',
    loading: true,
    forbidden: false,
    tasks: [],
    activeTaskId: null,
    searchKeyword: '',
    searching: false,
    catalogItems: [],
    resultTotal: 0,
  },

  onLoad: function (options) {
    var globalData = app.globalData || {};
    this.focusTaskId = options && options.taskId ? Number(options.taskId) : null;
    this.setData({
      statusBarHeight: globalData.statusBarHeight || 20,
      navHeight: globalData.navBarHeight || 68,
    });
    this.loadTasks();
  },

  onPullDownRefresh: function () {
    this.loadTasks(true);
  },

  switchScope: function (event) {
    var scope = event.currentTarget.dataset.scope;
    if (!scope || scope === this.data.scope) return;
    this.setData({ scope: scope, activeTaskId: null, catalogItems: [] });
    this.loadTasks();
  },

  loadTasks: function (fromPull) {
    this.setData({ loading: true, forbidden: false });
    api.list(this.data.scope).then(function (res) {
      var rows = res.result && res.result.data;
      this.setData({ loading: false, tasks: normalizeTasks(rows), forbidden: false });
      if (fromPull) wx.stopPullDownRefresh();
    }.bind(this)).catch(function (err) {
      this.setData({ loading: false, forbidden: true });
      if (fromPull) wx.stopPullDownRefresh();
      wx.showToast({ title: messageOf(err), icon: 'none' });
    }.bind(this));
  },

  claimTask: function (event) {
    var taskId = Number(event.currentTarget.dataset.id);
    wx.showLoading({ title: '正在领取', mask: true });
    api.claim(taskId).then(function () {
      wx.hideLoading();
      wx.showToast({ title: '已领取', icon: 'success' });
      this.loadTasks();
    }.bind(this)).catch(function (err) {
      wx.hideLoading();
      wx.showToast({ title: messageOf(err), icon: 'none' });
      this.loadTasks();
    }.bind(this));
  },

  releaseTask: function (event) {
    var taskId = Number(event.currentTarget.dataset.id);
    api.release(taskId).then(function () {
      this.setData({ activeTaskId: null, catalogItems: [] });
      this.loadTasks();
    }.bind(this)).catch(function (err) {
      wx.showToast({ title: messageOf(err), icon: 'none' });
    });
  },

  beginProcess: function (event) {
    var taskId = Number(event.currentTarget.dataset.id);
    var goodsName = event.currentTarget.dataset.name || '';
    this.setData({
      activeTaskId: taskId,
      searchKeyword: goodsName,
      catalogItems: [],
      resultTotal: 0,
    });
    this.searchCatalog();
  },

  cancelProcess: function () {
    this.setData({ activeTaskId: null, catalogItems: [], resultTotal: 0 });
  },

  onKeywordInput: function (event) {
    this.setData({ searchKeyword: event.detail.value });
  },

  searchCatalog: function () {
    var keyword = String(this.data.searchKeyword || '').trim();
    if (!keyword) {
      wx.showToast({ title: '请输入正式商品名称', icon: 'none' });
      return;
    }
    this.setData({ searching: true });
    api.searchCatalog(keyword).then(function (res) {
      var data = (res.result && res.result.data) || {};
      this.setData({
        searching: false,
        catalogItems: data.items || [],
        resultTotal: data.total || 0,
      });
    }.bind(this)).catch(function (err) {
      this.setData({ searching: false });
      wx.showToast({ title: messageOf(err), icon: 'none' });
    }.bind(this));
  },

  chooseCatalogGoods: function (event) {
    var nxGoodsId = Number(event.currentTarget.dataset.id);
    var goodsName = event.currentTarget.dataset.name || '该商品';
    wx.showModal({
      title: '确认转为正式商品',
      content: '将临时商品归入“' + goodsName + '”。原商品、订货和库存关联会保留。',
      confirmText: '确认归类',
      success: function (result) {
        if (result.confirm) this.promote(nxGoodsId);
      }.bind(this),
    });
  },

  createSiblingGoods: function (event) {
    var referenceNxGoodsId = Number(event.currentTarget.dataset.id);
    var referenceName = event.currentTarget.dataset.name || '该商品';
    wx.showModal({
      title: '新增同品类正式商品',
      content: '将以“' + referenceName + '”的品类为参考，用饭馆提交的名称和规格创建新的正式商品。',
      confirmText: '新增并归类',
      success: function (result) {
        if (!result.confirm) return;
        wx.showLoading({ title: '正在新增', mask: true });
        api.createSiblingAndPromote(this.data.activeTaskId, referenceNxGoodsId)
          .then(function () {
            wx.hideLoading();
            wx.showToast({ title: '处理完成', icon: 'success' });
            this.setData({ activeTaskId: null, catalogItems: [] });
            this.loadTasks();
          }.bind(this))
          .catch(function (err) {
            wx.hideLoading();
            wx.showModal({ title: '暂时不能新增', content: messageOf(err), showCancel: false });
          });
      }.bind(this),
    });
  },

  promote: function (nxGoodsId) {
    wx.showLoading({ title: '正在归类', mask: true });
    api.promote(this.data.activeTaskId, nxGoodsId).then(function () {
      wx.hideLoading();
      wx.showToast({ title: '处理完成', icon: 'success' });
      this.setData({ activeTaskId: null, catalogItems: [] });
      this.loadTasks();
    }.bind(this)).catch(function (err) {
      wx.hideLoading();
      wx.showModal({ title: '暂时不能归类', content: messageOf(err), showCancel: false });
    });
  },
});
