/**
 * 京采市场 - 平台首页
 * 默认入口：展示平台首页，不跳转旧采购页
 */
var app = getApp();
var pageLayout = require('../../lib/pageLayout');
var pagesApi = require('../services/pages');
var platformHomeApi = require('../../services/platformHome');
var platformBillUi = require('../../utils/platformBillUi');
var platformCart = require('../../utils/platformCart');

Page({
  data: {
    statusBarHeight: 20,
    scrollTopPadding: 64,
    pageReady: false,
    suppliersLoading: true,
    categoriesLoading: true,
    suppliersFromApi: false,
    categoriesFromApi: false,
    initFromApi: false,
    market: { marketName: '京采市场', notice: '', noticeSub: '' },
    suppliers: [],
    categories: [],
    currentDepartment: {
      departmentName: '请选择饭店',
      address: ''
    },
    searchPlaceholder: '搜索油菜、圆白菜、馒头、白醋',
    hasOutstandingBill: false,
    outstandingBanner: null
  },

  onLoad: function () {
    pageLayout.applyPlatformTabLayout(this, 'home', {
      headerKind: 'home'
    });
    this._applyDepartmentFromStorage();
    this._ensureLogin();
  },

  onShow: function () {
    pageLayout.applyPlatformTabLayout(this, 'home', {
      headerKind: 'home'
    });
    this._applyDepartmentFromStorage();
    if (wx.getStorageSync('userInfo') || this.data.pageReady) {
      this._loadHomeData();
    }
  },

  _applyDepartmentFromStorage: function () {
    var mendianInfo = wx.getStorageSync('mendianInfo');
    if (!mendianInfo) return;
    this.setData({
      currentDepartment: {
        departmentName: mendianInfo.gbDepartmentName || '当前饭店',
        address: mendianInfo.gbDepartmentAddress || mendianInfo.gbDepartmentPickAddr || ''
      }
    });
  },

  _ensureLogin: function () {
    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this._loadHomeData();
      return;
    }
    this._userLogin();
  },

  _userLogin: function () {
    var that = this;
    wx.login({
      success: function (resLogin) {
        pagesApi.gbLoginIndex(resLogin.code).then(function (res) {
          var body = res.result;
          if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (e) { body = {}; }
          }
          if (body.code === -1) {
            that._loadHomeData();
            return;
          }
          if (body.data === 'noBuyer') {
            wx.redirectTo({
              url: '/subPackage-supplier/pages/jinriListWithLogin/jinriListWithLogin'
            });
            return;
          }
          wx.setStorageSync('disInfo', body.data.disInfo);
          wx.setStorageSync('userInfo', body.data.depUserInfo);
          wx.setStorageSync('mendianInfo', body.data.depInfo);
          wx.setStorageSync('marketId', 1);
          wx.setStorageSync('platformMarketId', 1);
          if (body.data.orderDepInfo) {
            wx.setStorageSync('orderDepInfo', body.data.orderDepInfo);
          } else {
            var buyerCtx = platformCart.getBuyerContext();
            if (buyerCtx.gbDepartmentId) {
              wx.setStorageSync('orderDepInfo', {
                gbDepartmentId: buyerCtx.gbDepartmentId,
                gbDepartmentFatherId: buyerCtx.gbDepartmentFatherId,
                gbDepartmentDisId: body.data.disInfo && body.data.disInfo.gbDistributerId,
                gbDepartmentName: body.data.depInfo && body.data.depInfo.gbDepartmentName
              });
            }
          }
          that._applyDepartmentFromStorage();
          that._loadHomeData();
        }).catch(function () {
          that.setData({ pageReady: true });
        });
      }
    });
  },

  _loadHomeData: function () {
    var that = this;
    this.setData({ suppliersLoading: true, categoriesLoading: true });
    platformHomeApi.loadHomePageData().then(function (payload) {
      var outstanding = payload.outstandingBill || null;
      var banner = platformBillUi.buildOutstandingBanner(outstanding);
      if (outstanding) {
        wx.setStorageSync('platformOutstandingBill', outstanding);
      }
      that.setData({
        pageReady: true,
        suppliersLoading: false,
        categoriesLoading: false,
        initFromApi: payload.initFromApi === true,
        suppliersFromApi: payload.suppliersFromApi === true,
        categoriesFromApi: payload.categoriesFromApi === true,
        market: payload.market,
        suppliers: payload.suppliers || [],
        categories: payload.categories || [],
        currentDepartment: payload.currentDepartment,
        searchPlaceholder: payload.searchPlaceholder || that.data.searchPlaceholder,
        hasOutstandingBill: payload.hasOutstandingBill === true,
        outstandingBanner: banner
      });
    }).catch(function () {
      that.setData({
        pageReady: true,
        suppliersLoading: false,
        categoriesLoading: false,
        initFromApi: false,
        suppliersFromApi: false,
        categoriesFromApi: false,
        market: { marketName: '—', notice: '', noticeSub: '' },
        suppliers: [],
        categories: []
      });
      wx.showToast({ title: '首页数据加载失败', icon: 'none' });
    });
  },

  onDepartmentTap: function () {
    wx.showToast({
      title: '切换饭店功能即将上线',
      icon: 'none'
    });
  },

  onSearchTap: function () {
    wx.showToast({
      title: '搜索功能即将上线',
      icon: 'none'
    });
  },

  onSupplierTap: function (e) {
    if (this.data.suppliersLoading) {
      wx.showToast({ title: '批发商列表加载中', icon: 'none' });
      return;
    }
    if (!this.data.suppliersFromApi) {
      wx.showToast({ title: '请检查网络后下拉刷新', icon: 'none' });
      return;
    }
    var id = e.currentTarget.dataset.id;
    var name = e.currentTarget.dataset.name || '';
    var active = e.currentTarget.dataset.active;
    var goodsCount = e.currentTarget.dataset.count;
    var categories = e.currentTarget.dataset.categories || '';
    var address = e.currentTarget.dataset.address || '';
    var logo = e.currentTarget.dataset.logo || '';
    if (active === 0 || active === '0' || goodsCount === 0 || goodsCount === '0') {
      wx.showToast({ title: '该批发商暂无可售商品', icon: 'none' });
      return;
    }
    if (!id) return;
    var url = '/subPackage-yishang/pages/yishang/nxDistributerGoods/nxDistributerGoods?nxDisId='
      + id + '&disName=' + encodeURIComponent(name)
      + '&goodsCount=' + (goodsCount != null ? goodsCount : 0)
      + '&mainCategories=' + encodeURIComponent(categories);
    if (address) {
      url += '&disAddress=' + encodeURIComponent(address);
    }
    if (logo) {
      url += '&disLogo=' + encodeURIComponent(logo);
    }
    wx.navigateTo({ url: url });
  },

  onCategoryTap: function (e) {
    var id = e.currentTarget.dataset.id;
    var name = e.currentTarget.dataset.name || '';
    if (!id) return;
    wx.setStorageSync('platformCategoryGoodsInit', {
      categoryId: id,
      categoryName: name,
      ts: Date.now()
    });
    wx.switchTab({ url: '/pages/categoryGoods/categoryGoods' });
  },

  onOutstandingBannerTap: function () {
    var billId = this.data.outstandingBanner && this.data.outstandingBanner.billId;
    var url = '/pages/billPending/billPending?from=block';
    if (billId) {
      url += '&billId=' + billId;
    }
    wx.navigateTo({ url: url });
  }
});
