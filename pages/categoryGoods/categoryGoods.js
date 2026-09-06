/**
 * 京采市场 - 全部类别（平台目录 + 本地购物车，走 nx 后端）
 */
var load = require('../../lib/load.js');
var apiUrl = require('../../config/index.js');
var pageLayout = require('../../lib/pageLayout.js');
var catalogApi = require('../../services/platformCatalog.js');
var platformOrderApi = require('../../services/platformOrder.js');
var platformCart = require('../../utils/platformCart.js');
var platformAuth = require('../../services/platformAuth.js');

var STORAGE_INIT_KEY = 'platformCategoryGoodsInit';

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
    pageTitle: '全部类别',
    url: '',
    editApply: false,
    applyNumber: '',
    applyStandardName: '',
    applySubtotal: '',
    applyRemark: '',
    applyItem: '',
    nxGoods: null,
    index: 0,
    statusBarHeight: 20,
    scrollTopPadding: 64,
    bodyHeight: 600,
    windowHeight: 0,
    windowWidth: 0,
    navBarHeight: 0,
    listHeight: 600,
    goodsListHeight: 520,
    mainBodyHeight: 600,
    limit: 15,
    currentPageDis: 1,
    totalPageDis: 0,
    totalCountDis: 0,
    grandList: [],
    goodsList: [],
    leftGreatId: '',
    greatName: '',
    leftIndex: 0,
    isLoading: false,
    categoriesLoading: false,
    showAllSubCat: false,
    activeSubCatId: '',
    scrollIntoView: '',
    subcatScrollIntoView: '',
    leftScrollTopNx: 0,
    fatherArrDis: [],
    sortDepGoodsArrDis: [],
    show: false,
    showImageModal: false,
    currentImage: '',
    currentGoods: null,
    canSave: false,
    depId: '',
    userInfo: null,
    applyGoodsName: '',
    applyGoodsId: ''
  },

  onLoad: function () {
    this.setData({
      url: apiUrl.nxServer
    });
    this._syncDepartmentContext();
  },

  onReady: function () {
    var that = this;
    setTimeout(function () {
      pageLayout.logRenderedRects(that, [
        { name: 'header', selector: '.platform-tab-header' },
        { name: 'body', selector: '.platform-tab-body' },
        { name: 'leftScroll', selector: '#leftScroll' },
        { name: 'goodsList', selector: '.goods-list' }
      ], 'categoryGoods');
    }, 200);
  },

  _syncDepartmentContext: function () {
    var ctx = platformCart.getBuyerContext();
    var userInfo = wx.getStorageSync('userInfo') || {};
    this.setData({
      depId: ctx.gbDepartmentId,
      userInfo: userInfo
    });
    return ctx.gbDepartmentId != null && ctx.gbDepartmentId !== '';
  },

  _refreshPlatformTabBadge: function () {
    platformCart.refreshTabBadgeFromServer();
  },

  onShow: function () {
    pageLayout.applyPlatformTabLayout(this, 'categoryGoods', {
      headerKind: 'navbar-dual',
      bodyKind: 'catalog'
    });

    var init = wx.getStorageSync(STORAGE_INIT_KEY);
    if (init && init.categoryId != null && init.categoryId !== '') {
      wx.removeStorageSync(STORAGE_INIT_KEY);
      this._pendingCategoryId = String(init.categoryId);
      if (init.categoryName) {
        this.setData({ pageTitle: init.categoryName });
      }
    }

    this._syncDepartmentContext();
    this._refreshPlatformTabBadge();

    if (!this.data.grandList.length) {
      this.initDisData(this._pendingCategoryId);
      this._pendingCategoryId = null;
    } else if (this._pendingCategoryId) {
      this._selectGrandById(this._pendingCategoryId);
      this._pendingCategoryId = null;
    }
  },

  initDisData: function (presetCategoryId) {
    var that = this;
    if (this._loadingCategories) return;
    this._loadingCategories = true;
    this.setData({ categoriesLoading: true });
    load.showLoading('获取商品');
    catalogApi.fetchCatalogTree().then(function (res) {
      that._loadingCategories = false;
      that.setData({ categoriesLoading: false });
      load.hideLoading();
      console.log('[categoryGoods] catalog/tree response', res);
      var body = catalogApi.parseBody(res);
      if (!catalogApi.isOk(body)) {
        console.error('[categoryGoods] catalog/tree failed', body);
        wx.showToast({ title: (body && body.msg) || '分类加载失败', icon: 'none' });
        return;
      }
      var data = body.data || {};
      var cataArr = data.cataArr || [];
      if (!cataArr.length) {
        wx.showToast({ title: '暂无分类', icon: 'none' });
        return;
      }
      var selectedIndex = 0;
      if (presetCategoryId) {
        for (var i = 0; i < cataArr.length; i++) {
          if (String(cataArr[i].nxGoodsId) === String(presetCategoryId)) {
            selectedIndex = i;
            break;
          }
        }
      }
      var targetCata = cataArr[selectedIndex];
      var subList = targetCata.nxGoodsEntityList || [];
      var newId = subList.length ? subList[0].nxGoodsId : '';
      var greatLabel = targetCata.nxDfgGoodsName || targetCata.nxGoodsName || '';
      that.setData({
        grandList: cataArr,
        sortDepGoodsArrDis: data.nxGoodsIdsSort || [],
        fatherArrDis: subList,
        leftGreatId: targetCata.nxGoodsId,
        leftIndex: selectedIndex,
        selectedSubCategoryId: newId,
        greatName: greatLabel,
        activeSubCatId: String(newId),
        pageTitle: presetCategoryId ? greatLabel : '全部类别'
      }, function () {
        setTimeout(function () {
          pageLayout.logRenderedRects(that, [
            { name: 'leftScroll', selector: '#leftScroll' },
            { name: 'goodsList', selector: '.goods-list' }
          ], 'categoryGoods/loaded');
        }, 150);
      });
      that._getFatherGoodsDis();
    }).catch(function (err) {
      that._loadingCategories = false;
      that.setData({ categoriesLoading: false });
      load.hideLoading();
      console.error('[categoryGoods] catalog/tree error', err);
      wx.showToast({ title: '分类加载失败', icon: 'none' });
    });
  },

  _selectGrandById: function (categoryId) {
    var list = this.data.grandList || [];
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].nxGoodsId) === String(categoryId)) {
        idx = i;
        break;
      }
    }
    if (idx < 0) return;
    var cata = list[idx];
    var subList = cata.nxGoodsEntityList || [];
    var firstSubId = subList.length ? subList[0].nxGoodsId : '';
    var greatLabel = cata.nxDfgGoodsName || cata.nxGoodsName || '';
    this.setData({
      leftGreatId: cata.nxGoodsId,
      leftIndex: idx,
      goodsList: [],
      currentPageDis: 1,
      totalPageDis: 0,
      isLoading: false,
      greatName: greatLabel,
      fatherArrDis: subList,
      selectedSubCategoryId: firstSubId,
      activeSubCatId: String(firstSubId),
      pageTitle: greatLabel
    });
    this._getFatherGoodsDis();
  },

  _mapListRows: function (rawList) {
    var that = this;
    return (rawList || []).map(function (row) {
      return catalogApi.mapCatalogRow(row);
    });
  },

  _getFatherGoodsDis: function () {
    var that = this;
    if (!this.data.leftGreatId) return;
    var listParams = {
      greatGrandId: this.data.leftGreatId,
      limit: this.data.limit,
      page: this.data.currentPageDis
    };
    console.log('[categoryGoods] catalog/list request', listParams);
    catalogApi.fetchCatalogList(listParams).then(function (res) {
      console.log('[categoryGoods] catalog/list response', res);
      var body = catalogApi.parseBody(res);
      if (!catalogApi.isOk(body)) {
        console.error('[categoryGoods] catalog/list failed', body);
        wx.showToast({ title: (body && body.msg) || '商品加载失败', icon: 'none' });
        return;
      }
      var pageData = body.page || {};
      var rawList = that._mapListRows(pageData.list);
      var orderedList = that.sortGoodsListDisForDisplay(rawList);
      var processedList = that.processGoodsListDis(orderedList);
      var subCatId = that.data.activeSubCatId;
      var anchor = 'cat-' + subCatId;
      that.setData({
        goodsList: processedList,
        totalPageDis: pageData.totalPage || 0,
        totalCountDis: pageData.totalCount || 0,
        subcatScrollIntoView: 'subcat-' + subCatId,
        scrollIntoView: ''
      }, function () {
        that._disSubCatScrollLockUntil = Math.max(that._disSubCatScrollLockUntil || 0, Date.now() + 500);
        that.calculateCategoryPositionsDis();
        that._scrollDisGoodsToAnchor(anchor, subCatId, '_getFatherGoodsDis');
        setTimeout(function () {
          pageLayout.logRenderedRects(that, [
            { name: 'goodsList', selector: '.goods-list' }
          ], 'categoryGoods/goods');
        }, 150);
      });
    }).catch(function (err) {
      console.error('[categoryGoods] catalog/list error', err);
      wx.showToast({ title: '商品加载失败', icon: 'none' });
    });
  },

  changeGreatGrandDis: function (e) {
    var categoryId = e.currentTarget.dataset.id;
    var index = e.currentTarget.dataset.index;
    var grand = this.data.grandList[index];
    var subList = grand && grand.nxGoodsEntityList ? grand.nxGoodsEntityList : [];
    var firstSubId = subList.length ? subList[0].nxGoodsId : '';
    this.setData({
      leftGreatId: categoryId,
      leftIndex: index,
      goodsList: [],
      currentPageDis: 1,
      totalPageDis: 0,
      isLoading: false,
      greatName: e.currentTarget.dataset.name,
      fatherArrDis: subList,
      selectedSubCategoryId: firstSubId,
      activeSubCatId: String(firstSubId),
      pageTitle: e.currentTarget.dataset.name || '全部类别'
    });
    var that = this;
    var query = this.createSelectorQuery();
    query.select('#left-cat-' + categoryId).boundingClientRect();
    query.select('#leftScroll').boundingClientRect();
    query.select('#leftScroll').scrollOffset();
    query.exec(function (res) {
      if (!res[0] || !res[1] || !res[2]) return;
      var targetScrollTop = res[2].scrollTop + res[0].top - res[1].top - (res[1].height / 2) + (res[0].height / 2);
      that.setData({ leftScrollTopNx: targetScrollTop });
    });
    this._getFatherGoodsDis();
  },

  onScrollToLowerDis: function () {
    if (this.data.isLoading || this.data.goodsList.length >= this.data.totalCountDis) return;
    this.setData({ isLoading: true });
    var nextPage = this.data.currentPageDis + 1;
    if (this.data.currentPageDis > this.data.totalPageDis) {
      this.setData({ isLoading: false });
      return;
    }
    this.setData({ currentPageDis: nextPage });
    var that = this;
    catalogApi.fetchCatalogList({
      limit: this.data.limit,
      page: nextPage,
      greatGrandId: this.data.leftGreatId
    }).then(function (res) {
      var body = catalogApi.parseBody(res);
      if (!catalogApi.isOk(body)) {
        that.setData({ isLoading: false });
        return;
      }
      var pageData = body.page || {};
      var newItems = that._mapListRows(pageData.list);
      var mergedSorted = that.sortGoodsListDisForDisplay(that.data.goodsList.concat(newItems));
      var updatedGoodsList = that.processGoodsListDis(mergedSorted);
      var activeSubKeep = that.data.activeSubCatId;
      that.setData({
        goodsList: updatedGoodsList,
        totalPageDis: pageData.totalPage || 0,
        totalCountDis: pageData.totalCount || 0,
        isLoading: false
      }, function () {
        if (activeSubKeep) {
          that._disSubCatScrollLockUntil = Math.max(that._disSubCatScrollLockUntil || 0, Date.now() + 500);
        }
      });
    });
  },

  onGoodsScrollDis: function () {
    if (Date.now() < (this._disSubCatScrollLockUntil || 0)) return;
    var that = this;
    var query = wx.createSelectorQuery();
    query.selectAll('.product-item').boundingClientRect();
    query.select('.goods-list').boundingClientRect();
    query.exec(function (res) {
      if (!res[0] || !res[1]) return;
      var productRects = res[0];
      var listRect = res[1];
      var minDiff = Infinity;
      var firstVisibleIndex = 0;
      for (var i = 0; i < productRects.length; i++) {
        var diff = productRects[i].top - listRect.top;
        if (diff >= 0 && diff < minDiff) {
          minDiff = diff;
          firstVisibleIndex = i;
        }
      }
      var firstVisibleItem = that.data.goodsList[firstVisibleIndex];
      if (!firstVisibleItem) return;
      var activeId = firstVisibleItem.nxGoodsGrandId == null || firstVisibleItem.nxGoodsGrandId === ''
        ? ''
        : String(firstVisibleItem.nxGoodsGrandId);
      var cur = that.data.activeSubCatId == null || that.data.activeSubCatId === ''
        ? ''
        : String(that.data.activeSubCatId);
      if (activeId && activeId !== cur) {
        that.setData({
          activeSubCatId: activeId,
          subcatScrollIntoView: 'subcat-' + activeId
        });
      }
    });
  },

  toggleSubCatDis: function () {
    this.setData({ showAllSubCat: !this.data.showAllSubCat });
  },

  stopScroll: function () {},

  _scrollDisGoodsToAnchor: function (anchor, subCatId, from) {
    var that = this;
    var delays = [0, 50, 200];
    var tryAt = function (idx) {
      var delay = delays[idx];
      var run = function () {
        that.setData({ scrollIntoView: '' }, function () {
          that.createSelectorQuery()
            .select('#' + anchor)
            .boundingClientRect(function (rect) {
              if (rect) {
                that._disSubCatScrollLockUntil = Date.now() + 550;
                that.setData({ scrollIntoView: anchor });
              } else if (idx < delays.length - 1) {
                tryAt(idx + 1);
              }
            })
            .exec();
        });
      };
      if (delay === 0) run();
      else setTimeout(run, delay);
    };
    tryAt(0);
  },

  onSubCatTapDis: function (e) {
    this._disSubCatScrollLockUntil = Date.now() + 600;
    var subCatId = e.currentTarget.dataset.id;
    var anchor = 'cat-' + subCatId;
    var hasGoods = this.data.goodsList.some(function (item) {
      return String(item.nxGoodsGrandId) === String(subCatId);
    });
    var that = this;
    this.setData({
      showAllSubCat: false,
      activeSubCatId: String(subCatId),
      subcatScrollIntoView: 'subcat-' + subCatId
    }, function () {
      if (hasGoods) {
        that._scrollDisGoodsToAnchor(anchor, subCatId, 'onSubCatTapDis');
      }
    });
    if (!hasGoods) {
      this.startLoadingGoodsForSubCat(subCatId);
    }
  },

  startLoadingGoodsForSubCat: function (subCatId) {
    if (this.data.isLoading) return;
    if (this.data.currentPageDis >= this.data.totalPageDis) {
      wx.showToast({ title: '没有更多商品了', icon: 'none' });
      return;
    }
    this.setData({ isLoading: true });
    wx.showLoading({ title: '正在加载商品...', mask: true });
    var that = this;
    this.loadGoodsBySubCatIdDis(subCatId, this.data.currentPageDis + 1, this.data.goodsList)
      .catch(function () {})
      .then(function () {
        that.setData({ isLoading: false });
        wx.hideLoading();
      });
  },

  loadGoodsBySubCatIdDis: function (subCatId, page, loadedGoods) {
    var that = this;
    return catalogApi.fetchCatalogList({
      limit: this.data.limit,
      page: page,
      greatGrandId: this.data.leftGreatId
    }).then(function (res) {
      var body = catalogApi.parseBody(res);
      if (!catalogApi.isOk(body)) {
        wx.showToast({ title: '获取商品失败', icon: 'none' });
        return;
      }
      var pageData = body.page || {};
      var newItems = that._mapListRows(pageData.list);
      var merged = loadedGoods.concat(newItems);
      var sortedArr = that.sortGoodsListDisForDisplay(merged);
      var hasGoodsInNewItems = newItems.some(function (item) {
        return String(item.nxGoodsGrandId) === String(subCatId);
      });
      if (hasGoodsInNewItems) {
        var processedGoods = that.processGoodsListDis(sortedArr);
        var anchor = 'cat-' + subCatId;
        that.setData({
          goodsList: processedGoods,
          currentPageDis: page,
          totalPageDis: pageData.totalPage || 0,
          totalCountDis: pageData.totalCount || 0,
          isLoading: false
        }, function () {
          setTimeout(function () {
            that._disSubCatScrollLockUntil = Math.max(that._disSubCatScrollLockUntil || 0, Date.now() + 500);
            that._scrollDisGoodsToAnchor(anchor, subCatId, 'loadGoodsBySubCatIdDis');
          }, 100);
        });
      } else if (page <= that.data.totalPageDis) {
        return that.loadGoodsBySubCatIdDis(subCatId, page + 1, sortedArr);
      } else {
        that.setData({
          goodsList: that.processGoodsListDis(sortedArr),
          currentPageDis: page,
          totalPageDis: pageData.totalPage || 0,
          totalCountDis: pageData.totalCount || 0,
          isLoading: false
        }, function () {
        });
        wx.showToast({ title: '未找到该分类商品', icon: 'none' });
      }
    });
  },

  sortGoodsListDisForDisplay: function (list) {
    var father = this.data.fatherArrDis || [];
    var grandRank = {};
    father.forEach(function (f, idx) {
      grandRank[String(f.nxGoodsId)] = idx;
    });
    var sortOrder = (this.data.sortDepGoodsArrDis || []).map(String);
    var depIdx = function (nid) {
      var i = sortOrder.indexOf(String(nid));
      return i === -1 ? 999999 : i;
    };
    return list.slice().sort(function (a, b) {
      var ra = grandRank[String(a.nxGoodsGrandId)];
      var rb = grandRank[String(b.nxGoodsGrandId)];
      var raN = ra === undefined ? 9999 : ra;
      var rbN = rb === undefined ? 9999 : rb;
      if (raN !== rbN) return raN - rbN;
      return depIdx(a.nxGoodsId) - depIdx(b.nxGoodsId);
    });
  },

  processGoodsListDis: function (list) {
    var goodsMap = new Map();
    list.forEach(function (item) {
      goodsMap.set(String(item.nxGoodsId), item);
    });
    var uniqueList = Array.from(goodsMap.values());
    var currentCategory = null;
    var that = this;
    return uniqueList.map(function (item) {
      var grandKey = item.nxGoodsGrandId == null || item.nxGoodsGrandId === ''
        ? item.nxGoodsGrandId
        : String(item.nxGoodsGrandId);
      if (grandKey !== currentCategory) {
        currentCategory = grandKey;
        return Object.assign({}, item, {
          isFirstInCategory: true,
          categoryName: that.getCategoryNameDis(item.nxGoodsGrandId)
        });
      }
      return Object.assign({}, item, {
        isFirstInCategory: false,
        categoryName: that.getCategoryNameDis(item.nxGoodsGrandId)
      });
    });
  },

  calculateCategoryPositionsDis: function () {
    var that = this;
    var query = this.createSelectorQuery();
    query.selectAll('.dis-cat-anchor').boundingClientRect();
    query.select('.goods-list').boundingClientRect();
    query.exec(function (res) {
      if (!res[0] || !res[1] || !res[0].length) return;
      var listRect = res[1];
      var positions = res[0].map(function (item) {
        var sid = item.id || '';
        var id = sid.indexOf('cat-') === 0 ? sid.replace('cat-', '') : '';
        return id ? { id: id, top: item.top - listRect.top } : null;
      }).filter(Boolean);
      that.setData({ categoryPositions: positions });
    });
  },

  getCategoryNameDis: function (categoryId) {
    var cid = categoryId == null || categoryId === '' ? '' : String(categoryId);
    if (!cid) return '';
    var list = this.data.fatherArrDis || [];
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].nxGoodsId) === cid) {
        return list[i].nxGoodsName || list[i].nxDfgFatherGoodsName || '';
      }
    }
    return '';
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
    var name = e.detail.applyStandardName;
    this.setData({ applyStandardName: name, canSave: true });
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
      that.setData({
        index: e.currentTarget.dataset.index,
        nxGoods: item,
        show: true,
        applyStandardName: item.nxGoodsStandardname || '',
        applySubtotal: '',
        canSave: false,
        editApply: false,
        applyNumber: '',
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
      console.error('[categoryGoods] submitLine error', err);
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
      console.error('[categoryGoods] updateLine error', err);
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
    }).catch(function (err) {
      load.hideLoading();
      console.error('[categoryGoods] deleteLine error', err);
      wx.showToast({ title: '删除失败', icon: 'none' });
    });
  }
});
