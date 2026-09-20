var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil.js');
var api = require('../../../../services/apiDistributer.js');
var config = require('../../../../config/index.js');
var globalData = getApp().globalData;
var ICON_ROOT = '/subPackage-charts/images/purchase/icon_pack/';

function num(value) {
  var result = Number(value);
  return isNaN(result) ? 0 : result;
}

function money(value) {
  return num(value).toFixed(1).replace(/\.0$/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function imageUrl(value) {
  if (!value) return '';
  return /^https?:\/\//.test(value) ? value : config.server + value;
}

Page({
  data: {
    navBarHeight: 0,
    iconRoot: ICON_ROOT,
    loading: true,
    hasData: false,
    categories: [],
    allGoods: [],
    visibleGoods: [],
    selectedCategoryId: null,
    selectedCategoryName: '',
    sortKey: 'amount',
    sortOptions: [
      { key: 'amount', name: '按金额' },
      { key: 'count', name: '按次数' },
      { key: 'fluctuation', name: '按波动' },
      { key: 'share', name: '按占比' }
    ]
  },

  onLoad: function (options) {
    var disInfo = wx.getStorageSync('disInfo') || {};
    this.focusGoodsId = Number(options.focusGoodsId || 0);
    this.focusCategoryId = Number(options.categoryId || 0);
    this.setData({
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      contentHeight: Math.max(500, globalData.windowHeight * globalData.rpxR - globalData.navBarHeight * globalData.rpxR - 100),
      disId: disInfo.gbDistributerId,
      focusGoodsId: this.focusGoodsId
    });
    this._syncDate();
    this._load();
  },

  onShow: function () {
    if (this.data.updateDate) {
      this.setData({ updateDate: false });
      this._syncDate();
      this._load();
    }
  },

  onPullDownRefresh: function () {
    this._load();
  },

  _syncDate: function () {
    var saved = wx.getStorageSync('myDate');
    var startDate = dateUtils.getFirstDateInMonth();
    var stopDate = dateUtils.getArriveDate(0);
    var hanzi = '本月';
    if (saved) {
      var range = saved.name === 'custom'
        ? dateUtils.getDateRange(saved.name, saved.startDate, saved.stopDate)
        : dateUtils.getDateRange(saved.name);
      startDate = range.startDate;
      stopDate = range.stopDate;
      hanzi = saved.hanzi || range.name;
    }
    this.setData({
      startDate: startDate,
      stopDate: stopDate,
      hanzi: hanzi
    });
  },

  toDatePage: function () {
    this.setData({ updateDate: true });
    wx.navigateTo({
      url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate +
        '&stopDate=' + this.data.stopDate + '&dateType=month'
    });
  },

  _load: function () {
    var that = this;
    if (!this.data.disId) {
      load.showToast('缺少分销商信息');
      return;
    }
    this.setData({ loading: true });
    load.showLoading('获取数据中');
    api.getGbPurchaseCategoryDetail({
      disId: this.data.disId,
      startDate: this.data.startDate,
      stopDate: this.data.stopDate
    }).then(function (res) {
      load.hideLoading();
      wx.stopPullDownRefresh();
      if (!res.result || res.result.code !== 0) {
        that.setData({ loading: false, hasData: false });
        load.showToast((res.result && res.result.msg) || '获取失败');
        return;
      }
      that._apply(res.result.data || {});
    }).catch(function () {
      load.hideLoading();
      wx.stopPullDownRefresh();
      that.setData({ loading: false, hasData: false });
      load.showToast('网络请求失败');
    });
  },

  _apply: function (data) {
    var categories = (data.categories || []).map(function (item) {
      return Object.assign({}, item, {
        image: imageUrl(item.categoryImage),
        amountDisplay: money(item.purchaseAmount)
      });
    });
    var goods = (data.goods || []).map(function (item) {
      var fluctuation = num(item.priceFluctuationPercent);
      return Object.assign({}, item, {
        image: imageUrl(item.goodsImage),
        initial: String(item.goodsName || '商').slice(0, 1),
        amountDisplay: money(item.purchaseAmount),
        priceDisplay: num(item.averageUnitPrice).toFixed(1),
        fluctuationDisplay: Math.abs(fluctuation).toFixed(1),
        fluctuationDirection: fluctuation > 0 ? 'up' : fluctuation < 0 ? 'down' : 'stable',
        shareDisplay: num(item.amountSharePercent).toFixed(1)
      });
    });
    var selectedId = categories.length ? categories[0].categoryId : null;
    if (this.focusCategoryId) selectedId = this.focusCategoryId;
    if (this.focusGoodsId) {
      for (var i = 0; i < goods.length; i++) {
        if (Number(goods[i].disGoodsId) === this.focusGoodsId) {
          selectedId = goods[i].categoryId;
          break;
        }
      }
    }
    this.setData({
      loading: false,
      hasData: goods.length > 0,
      categories: categories,
      allGoods: goods,
      selectedCategoryId: selectedId
    }, this._refreshVisibleGoods.bind(this));
  },

  selectCategory: function (e) {
    this.focusGoodsId = 0;
    this.setData({ selectedCategoryId: e.currentTarget.dataset.id, focusGoodsId: 0 }, this._refreshVisibleGoods.bind(this));
  },

  selectSort: function (e) {
    this.setData({ sortKey: e.currentTarget.dataset.key }, this._refreshVisibleGoods.bind(this));
  },

  _refreshVisibleGoods: function () {
    var selected = String(this.data.selectedCategoryId);
    var sortKey = this.data.sortKey;
    var goods = this.data.allGoods.filter(function (item) {
      return String(item.categoryId == null ? -1 : item.categoryId) === selected;
    });
    goods.sort(function (a, b) {
      if (sortKey === 'count') return num(b.purchaseCount) - num(a.purchaseCount);
      if (sortKey === 'fluctuation') return Math.abs(num(b.priceFluctuationPercent)) - Math.abs(num(a.priceFluctuationPercent));
      if (sortKey === 'share') return num(b.amountSharePercent) - num(a.amountSharePercent);
      return num(b.purchaseAmount) - num(a.purchaseAmount);
    });
    var categoryName = '';
    var categories = this.data.categories.map(function (item) {
      var isSelected = String(item.categoryId) === selected;
      if (isSelected) categoryName = item.categoryName;
      return Object.assign({}, item, { selected: isSelected });
    });
    this.setData({
      categories: categories,
      visibleGoods: goods,
      selectedCategoryName: categoryName,
      scrollIntoView: this.focusGoodsId ? 'goods-' + this.focusGoodsId : ''
    });
  },

  toGoodsDetail: function (e) {
    var goods = e.currentTarget.dataset.item;
    wx.setStorageSync('disGoods', Object.assign({}, goods, {
      gbDistributerGoodsId: goods.disGoodsId,
      gbDgGoodsName: goods.goodsName,
      gbDgGoodsStandardname: goods.standardName,
      gbDgNxFatherImg: goods.goodsImage
    }));
    wx.navigateTo({
      url: '../goodsFenxiPurchase/goodsFenxiPurchase?disGoodsId=' + goods.disGoodsId
    });
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  }
});
