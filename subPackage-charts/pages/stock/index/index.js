var api = require('../../../services/api');
var config = require('../../../../config/index');
var dateUtil = require('../../../../lib/dateUtil');
var globalData = getApp().globalData;

function number(v) {
  var n = parseFloat(String(v == null ? 0 : v).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

function money(v) {
  return number(v).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function categoryIcon(name) {
  name = name || '';
  if (/调料/.test(name)) return '♟';
  if (/干货/.test(name)) return '♨';
  if (/肉|蛋/.test(name)) return '◉';
  if (/水产|海鲜/.test(name)) return '◆';
  if (/冻品/.test(name)) return '❄';
  return '♧';
}

function dayTabs(data) {
  data = data || {};
  return [
    { label: '全部', sub: '所有库存', whichDay: 99, total: data.total && data.total.restTotal || 0 },
    { label: '今', sub: data.in && data.in.dateString || '今日', whichDay: 0, total: data.in && data.in.zeroTotal || 0 },
    { label: '1', sub: data.one && data.one.dateString || '1天', whichDay: 1, total: data.one && data.one.oneTotal || 0 },
    { label: '2', sub: data.two && data.two.dateString || '2天', whichDay: 2, total: data.two && data.two.twoTotal || 0 },
    { label: '3', sub: data.three && data.three.dateString || '3天', whichDay: 3, total: data.three && data.three.threeTotal || 0 },
    { label: '3+', sub: data.exceed && data.exceed.dateString || '3天以上', whichDay: 4, total: data.exceed && data.exceed.exceedThreeTotal || 0 }
  ];
}

Page({
  data: {
    navBarHeight: 0,
    activeDay: 0,
    whichDay: 99,
    activeCategory: 0,
    activeFilter: 'all',
    sortMode: 'default',
    sortNames: ['默认排序', '按库存金额', '按剩余数量', '按关注程度'],
    dayTabs: [],
    categories: [],
    allGoods: [],
    goods: [],
    totalAmount: '0',
    todayAmount: '0',
    goodsCount: 0,
    attentionCount: 0,
    nowTime: ''
  },

  onLoad: function () {
    var disInfo = wx.getStorageSync('disInfo') || {};
    var mendianInfo = wx.getStorageSync('mendianInfo') || {};
    var windowInfo = wx.getWindowInfo();
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: getApp().globalData.server || config.server,
      disId: disInfo.gbDistributerId,
      depFatherId: mendianInfo.gbDepartmentId,
      type: disInfo.gbDistributerStockCycle || 0,
      searchSubDepIds: -1,
      nowTime: dateUtil.getNowTime()
    });
    this.loadSummary();
  },

  loadSummary: function () {
    var that = this;
    if (!this.data.disId || !this.data.depFatherId) {
      wx.showToast({ title: '缺少门店信息', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '获取库存中', mask: true });
    api.getMendianStockTypePeriod({
      disId: this.data.disId,
      depFatherId: this.data.depFatherId,
      searchSubDepIds: this.data.searchSubDepIds,
      whichDay: this.data.whichDay,
      type: this.data.type
    }).then(function (res) {
      var body = res.result || {};
      if (body.code !== 0) throw new Error(body.msg || '获取失败');
      var data = body.data || {};
      var categories = (data.arr || []).map(function (item) {
        return Object.assign({}, item, {
          icon: categoryIcon(item.gbDfgFatherGoodsName),
          amountText: money(item.fatherStockTotalString),
          goodsCount: number(item.fatherStockManyString),
          attentionCount: number(item.fatherWasteRateString)
        });
      });
      var goodsCount = 0, attentionCount = 0;
      categories.forEach(function (item) { goodsCount += item.goodsCount; attentionCount += item.attentionCount; });
      var active = that.data.activeCategory;
      if (active >= categories.length) active = 0;
      that.setData({
        dayTabs: dayTabs(data),
        categories: categories,
        activeCategory: active,
        totalAmount: money(data.total && data.total.restTotal),
        todayAmount: money(data.in && data.in.zeroTotal),
        goodsCount: goodsCount,
        attentionCount: attentionCount
      });
      if (categories.length) that.loadGoods(); else { wx.hideLoading(); that.setData({ allGoods: [], goods: [] }); }
    }).catch(function (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '库存加载失败', icon: 'none' });
    });
  },

  loadGoods: function () {
    var that = this;
    var category = this.data.categories[this.data.activeCategory];
    if (!category) { wx.hideLoading(); return; }
    api.disGetDayStockByGreatId({
      disId: this.data.disId,
      depFatherId: this.data.depFatherId,
      searchSubDepIds: this.data.searchSubDepIds,
      greatId: category.gbDistributerFatherGoodsId,
      whichDay: this.data.whichDay,
      type: this.data.type
    }).then(function (res) {
      wx.hideLoading();
      var body = res.result || {};
      if (body.code !== 0) throw new Error(body.msg || '获取失败');
      var oneDay = body.data && body.data.oneDay || {};
      var rows = (oneDay.arr || []).map(function (goods) {
        var batches = goods.gbDepartmentGoodsStockSimpleEntities || [];
        var inbound = 0, restAmount = 0;
        batches.forEach(function (stock) { inbound += number(stock.gbDgsSubtotal); restAmount += number(stock.gbDgsRestSubtotal); });
        var waste = number(goods.goodsWasteTotal || goods.goodsEveryWasteTotal || goods.goodsWasteTotalString);
        var status = waste > 0 ? '临期关注' : '库存正常';
        return Object.assign({}, goods, {
          batches: batches,
          imagePath: goods.gbDgNxFatherImg || goods.gbDgGoodsFileImg,
          inboundText: money(inbound),
          stockAmountText: money(restAmount || goods.goodsStockTotal),
          restWeightText: money(goods.goodsStockWeightTotal),
          firstPrice: batches.length ? money(batches[0].gbDgsPrice) : '0',
          status: status,
          tone: waste > 0 ? 'warn' : 'normal',
          isAttention: waste > 0
        });
      });
      var categoryInbound = rows.reduce(function (sum, item) { return sum + number(item.inboundText); }, 0);
      that.setData({ oneDay: oneDay, allGoods: rows, categoryInbound: money(categoryInbound) });
      that.applyGoods();
    }).catch(function (err) {
      wx.hideLoading();
      that.setData({ allGoods: [], goods: [] });
      wx.showToast({ title: err.message || '商品库存加载失败', icon: 'none' });
    });
  },

  applyGoods: function () {
    var filter = this.data.activeFilter;
    var sort = this.data.sortMode;
    var source = this.data.allGoods || [];
    var averageRest = source.length ? source.reduce(function (sum, item) { return sum + number(item.goodsStockWeightTotal); }, 0) / source.length : 0;
    var rows = source.filter(function (item) {
      return filter === 'all' || (filter === 'attention' && item.isAttention) || (filter === 'more' && number(item.goodsStockWeightTotal) > averageRest);
    });
    if (sort === 'amount') rows.sort(function (a, b) { return number(b.stockAmountText) - number(a.stockAmountText); });
    if (sort === 'rest') rows.sort(function (a, b) { return number(b.goodsStockWeightTotal) - number(a.goodsStockWeightTotal); });
    if (sort === 'attention') rows.sort(function (a, b) { return Number(b.isAttention) - Number(a.isAttention); });
    this.setData({ goods: rows });
  },

  chooseDay: function (e) {
    var index = Number(e.currentTarget.dataset.index);
    var tab = this.data.dayTabs[index];
    if (!tab || index === this.data.activeDay) return;
    this.setData({ activeDay: index, whichDay: tab.whichDay, activeCategory: 0 });
    this.loadSummary();
  },

  chooseCategory: function (e) {
    var index = Number(e.currentTarget.dataset.index);
    if (index === this.data.activeCategory) return;
    this.setData({ activeCategory: index });
    wx.showLoading({ title: '加载分类', mask: true });
    this.loadGoods();
  },

  chooseFilter: function (e) { this.setData({ activeFilter: e.currentTarget.dataset.value }); this.applyGoods(); },
  changeSort: function (e) { var values = ['default', 'amount', 'rest', 'attention']; this.setData({ sortMode: values[Number(e.detail.value)] || 'default' }); this.applyGoods(); },

  toGoods: function (e) {
    var item = this.data.goods[Number(e.currentTarget.dataset.index)];
    if (!item) return;
    wx.setStorageSync('disGoods', item);
    wx.navigateTo({ url: '/subPackage-goods/pages/goods/stockGoodsList/stockGoodsList?disGoodsId=' + item.gbDistributerGoodsId });
  },

  toBack: function () { wx.navigateBack({ delta: 1 }); }
});
