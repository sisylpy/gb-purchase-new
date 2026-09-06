/**
 * 京采市场 - 快照商品 Tab
 * 展示饭店历史订货商品，支持一键复购
 */
var load = require('../../lib/load.js');
var apiUrl = require('../../config/index.js');
var pageLayout = require('../../lib/pageLayout.js');
var snapshotApi = require('../../services/platformSnapshot.js');
var platformOrderApi = require('../../services/platformOrder.js');
var platformCart = require('../../utils/platformCart.js');
var platformAuth = require('../../services/platformAuth.js');

function encodePathJoin(base, rel) {
  var r = rel == null ? '' : String(rel).replace(/^\s+|\s+$/g, '');
  if (r === '' || r === 'goodsImage/logo.jpg' || r === '/goodsImage/logo.jpg') return '';
  if (/^https?:\/\//i.test(r)) return r;
  var b = String(base || '').replace(/\/+$/, '');
  if (b === '') return r;
  var p = r.replace(/^\/+/, '');
  var parts = p.split('/');
  var enc = [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] !== '') enc.push(encodeURIComponent(parts[i]));
  }
  return b + '/' + enc.join('/');
}

Page({
  data: {
    url: '',
    statusBarHeight: 20,
    scrollTopPadding: 64,
    bodyHeight: 600,
    windowHeight: 0,
    windowWidth: 0,
    navBarHeight: 0,
    listHeight: 600,
    limit: 15,
    currentPage: 1,
    totalPage: 0,
    totalCount: 0,
    goodsList: [],
    loading: false,
    depId: '',
    show: false,
    showImageModal: false,
    currentImage: '',
    currentGoods: null,
    canSave: false,
    editApply: false,
    applyNumber: '',
    applyStandardName: '',
    applySubtotal: '',
    applyRemark: '',
    applyItem: '',
    nxGoods: null,
    index: 0
  },

  onLoad: function () {
    this.setData({ url: apiUrl.nxServer });
    this._syncDepartmentContext();
  },

  onShow: function () {
    pageLayout.applyPlatformTabLayout(this, 'snapshotGoods', {
      headerKind: 'navbar-dual',
      headerExtraRpx: pageLayout.HEADER.SNAPSHOT_SUB_RPX,
      subcatRowRpx: 0
    });

    this._syncDepartmentContext();
    this._refreshPlatformTabBadge();
    this._loadSnapshotGoods(true);
  },

  _syncDepartmentContext: function () {
    var ctx = platformCart.getBuyerContext();
    this.setData({ depId: ctx.gbDepartmentId });
    return ctx.gbDepartmentId != null && ctx.gbDepartmentId !== '';
  },

  _refreshPlatformTabBadge: function () {
    platformCart.refreshTabBadgeFromServer();
  },

  _loadSnapshotGoods: function (reset) {
    if (this.data.loading) return;
    if (!this.data.depId) return;

    var page = reset ? 1 : this.data.currentPage;
    if (!reset && page > this.data.totalPage && this.data.totalPage > 0) return;

    var that = this;
    this.setData({ loading: true });
    if (reset) {
      this.setData({ goodsList: [], currentPage: 1, totalPage: 0, totalCount: 0 });
    }

    snapshotApi.fetchSnapshotList({ page: page, limit: this.data.limit }).then(function (res) {
      var body = snapshotApi.parseBody(res);
      if (!snapshotApi.isOk(body)) {
        that.setData({ loading: false });
        if (reset) {
          wx.showToast({ title: (body && body.msg) || '快照商品加载失败', icon: 'none' });
        }
        return;
      }
      var pageData = body.page || body.data || {};
      var rawList = pageData.list || (Array.isArray(body.data) ? body.data : []);
      var mapped = (rawList || []).map(function (row) {
        return snapshotApi.mapSnapshotRow(row);
      });
      var merged = reset ? mapped : that.data.goodsList.concat(mapped);
      that.setData({
        loading: false,
        goodsList: merged,
        currentPage: page,
        totalPage: pageData.totalPage || 1,
        totalCount: pageData.totalCount != null ? pageData.totalCount : merged.length
      });
    }).catch(function (err) {
      console.error('[snapshotGoods] fetchSnapshotList error', err);
      that.setData({ loading: false });
      if (reset) {
        wx.showToast({ title: '快照商品加载失败', icon: 'none' });
      }
    });
  },

  onScrollToLower: function () {
    if (this.data.loading) return;
    if (this.data.currentPage >= this.data.totalPage) return;
    var nextPage = this.data.currentPage + 1;
    this.setData({ currentPage: nextPage });
    this._loadSnapshotGoods(false);
  },

  showImageModal: function (e) {
    var goods = e.currentTarget.dataset.goods;
    var rel = goods.nxGoodsFile ? String(goods.nxGoodsFile) : '';
    var imageUrl = rel ? encodePathJoin(this.data.url, rel) : '/images/logo.jpg';
    this.setData({
      showImageModal: true,
      currentImage: imageUrl,
      currentGoods: goods
    });
  },

  hideImageModal: function () {
    this.setData({ showImageModal: false, currentImage: '', currentGoods: null });
  },

  stopPropagation: function () {},

  changeStandard: function (e) {
    this.setData({ applyStandardName: e.detail.applyStandardName, canSave: true });
  },

  applyGoods: function (e) {
    var that = this;
    platformAuth.ensureRegisteredForGoods().then(function (ok) {
      if (!ok) return;
      that._syncDepartmentContext();
      var item = e.currentTarget.dataset.item;
      if (!item || !item.nxGoodsId) {
        wx.showToast({ title: '商品信息异常', icon: 'none' });
        return;
      }
      var defaultQty = item.lastOrderQuantity ? String(item.lastOrderQuantity) : '';
      var defaultStd = item.lastOrderStandard || item.nxGoodsStandardname || '';
      that.setData({
        index: e.currentTarget.dataset.index,
        nxGoods: item,
        show: true,
        applyStandardName: defaultStd,
        applySubtotal: '',
        canSave: !!defaultQty,
        editApply: false,
        applyNumber: defaultQty,
        applyRemark: ''
      });
    });
  },

  toEditPlatformOrder: function (e) {
    var order = e.currentTarget.dataset.order;
    var item = e.currentTarget.dataset.item;
    if (!order || !item) return;
    this.setData({
      applyItem: order,
      show: true,
      applyStandardName: order.standard,
      nxGoods: item,
      editApply: true,
      applyNumber: order.quantity,
      applyRemark: order.remark || '',
      index: e.currentTarget.dataset.index,
      canSave: true,
      applySubtotal: ''
    });
  },

  confirm: function (e) {
    if (this.data.editApply) {
      this._updatePlatformOrder(e);
    } else {
      this._savePlatformOrder(e);
    }
  },

  cancle: function () {
    this.setData({
      show: false,
      applyItem: '',
      applyStandardName: '',
      editApply: false,
      applyNumber: '',
      applyRemark: '',
      applySubtotal: '',
      nxGoods: null
    });
  },

  _patchPlatformOrder: function (index, order) {
    if (index == null || index < 0) return;
    this.setData({
      ['goodsList[' + index + '].platformOrder']: order
    });
  },

  _savePlatformOrder: function (e) {
    var detail = e.detail || {};
    var goods = this.data.nxGoods;
    if (!goods || !detail.applyNumber) {
      wx.showToast({ title: '请输入数量', icon: 'none' });
      return;
    }
    var that = this;
    load.showLoading('保存订单');
    platformOrderApi.submitLine({
      nxGoodsId: goods.nxGoodsId,
      goodsName: goods.nxGoodsName,
      quantity: detail.applyNumber,
      standard: detail.applyStandardName || goods.nxGoodsStandardname,
      remark: detail.applyRemark || ''
    }).then(function (res) {
      load.hideLoading();
      var body = platformOrderApi.parseBody(res);
      if (!platformOrderApi.isOk(body)) {
        wx.showToast({ title: (body && body.msg) || '保存失败', icon: 'none' });
        return;
      }
      var data = body.data || {};
      that._patchPlatformOrder(that.data.index, {
        orderId: data.orderId,
        quantity: detail.applyNumber,
        standard: detail.applyStandardName || goods.nxGoodsStandardname,
        remark: detail.applyRemark || ''
      });
      that.setData({
        show: false,
        editApply: false,
        applyItem: '',
        applyNumber: '',
        applyStandardName: '',
        applyRemark: '',
        nxGoods: null
      });
      wx.showToast({ title: '已加入购物车', icon: 'success' });
      that._refreshPlatformTabBadge();
    }).catch(function (err) {
      load.hideLoading();
      console.error('[snapshotGoods] submitLine error', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  },

  _updatePlatformOrder: function (e) {
    var detail = e.detail || {};
    var order = this.data.applyItem;
    if (!order || !order.orderId) return;
    var that = this;
    load.showLoading('修改订单');
    platformOrderApi.updateLine(order.orderId, {
      quantity: detail.applyNumber,
      standard: detail.applyStandardName,
      remark: detail.applyRemark || ''
    }).then(function (res) {
      load.hideLoading();
      var body = platformOrderApi.parseBody(res);
      if (!platformOrderApi.isOk(body)) {
        wx.showToast({ title: (body && body.msg) || '修改失败', icon: 'none' });
        return;
      }
      that._patchPlatformOrder(that.data.index, {
        orderId: order.orderId,
        quantity: detail.applyNumber,
        standard: detail.applyStandardName,
        remark: detail.applyRemark || ''
      });
      that.setData({
        show: false,
        editApply: false,
        applyItem: '',
        applyNumber: '',
        applyStandardName: '',
        applyRemark: '',
        nxGoods: null
      });
      wx.showToast({ title: '已更新', icon: 'success' });
    }).catch(function (err) {
      load.hideLoading();
      console.error('[snapshotGoods] updateLine error', err);
      wx.showToast({ title: '修改失败', icon: 'none' });
    });
  },

  delApply: function () {
    var order = this.data.applyItem;
    var that = this;
    if (!order || !order.orderId) return;
    load.showLoading('删除订单');
    platformOrderApi.deleteLine(order.orderId).then(function (res) {
      load.hideLoading();
      var body = platformOrderApi.parseBody(res);
      if (!platformOrderApi.isOk(body)) {
        wx.showToast({ title: (body && body.msg) || '删除失败', icon: 'none' });
        return;
      }
      that._patchPlatformOrder(that.data.index, null);
      that.cancle();
      wx.showToast({ title: '已删除', icon: 'none' });
      that._refreshPlatformTabBadge();
    }).catch(function (err) {
      load.hideLoading();
      console.error('[snapshotGoods] deleteLine error', err);
      wx.showToast({ title: '删除失败', icon: 'none' });
    });
  }
});
