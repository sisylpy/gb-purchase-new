const app = getApp();
const globalData = app.globalData;
import { menuCategoryBusinessOverview } from '../../../../services/apiDistributerFood.js';

// 四象限颜色配置（与设计图一致）
var PORTFOLIO_COLORS = {
  star: '#4A90D9',
  traffic: '#34C759',
  potential: '#5AC8FA',
  watch: '#BDC1C6',
};

// 分类图标配置（emoji + 配色）
var CATEGORY_ICONS = {
  '热菜': { emoji: '\uD83C\uDF72', bg: 'rgba(52,199,89,0.12)', color: '#34C759' },
  '凉菜': { emoji: '\uD83E\uDD57', bg: 'rgba(74,144,217,0.12)', color: '#4A90D9' },
  '甜品': { emoji: '\uD83C\uDF70', bg: 'rgba(255,193,7,0.12)', color: '#F5A623' },
  '香煎': { emoji: '\uD83C\uDF73', bg: 'rgba(255,149,0,0.12)', color: '#FF9500' },
};

/** 构建 CSS conic-gradient 字符串 */
function buildPieStyle(portfolio) {
  var star = portfolio.starCount || 0;
  var traffic = portfolio.trafficCount || 0;
  var potential = portfolio.potentialCount || 0;
  var watch = portfolio.watchCount || 0;
  var total = star + traffic + potential + watch;
  if (total === 0) return '';

  var a1 = (star / total) * 100;
  var a2 = a1 + (traffic / total) * 100;
  var a3 = a2 + (potential / total) * 100;

  var cStar = PORTFOLIO_COLORS.star;
  var cTraffic = PORTFOLIO_COLORS.traffic;
  var cPotential = PORTFOLIO_COLORS.potential;
  var cWatch = PORTFOLIO_COLORS.watch;

  var s1 = a1.toFixed(2);
  var s2 = a2.toFixed(2);
  var s3 = a3.toFixed(2);

  return 'conic-gradient(' +
    cStar + ' 0% ' + s1 + '%, ' +
    cTraffic + ' ' + s1 + '% ' + s2 + '%, ' +
    cPotential + ' ' + s2 + '% ' + s3 + '%, ' +
    cWatch + ' ' + s3 + '% 100%' +
  ')';
}

/** 构建图例数据 */
function buildLegend(portfolio) {
  var star = portfolio.starCount || 0;
  var traffic = portfolio.trafficCount || 0;
  var potential = portfolio.potentialCount || 0;
  var watch = portfolio.watchCount || 0;
  var total = star + traffic + potential + watch;
  if (total === 0) return [];

  var items = [
    { name: '明星菜', count: star, color: PORTFOLIO_COLORS.star },
    { name: '引流菜', count: traffic, color: PORTFOLIO_COLORS.traffic },
    { name: '潜力菜', count: potential, color: PORTFOLIO_COLORS.potential },
    { name: '观察菜', count: watch, color: PORTFOLIO_COLORS.watch },
  ];
  return items.map(function(item) {
    var ratio = total > 0 ? Math.round((item.count / total) * 100) : 0;
    return Object.assign({}, item, { ratio: ratio });
  });
}

/** 计算涨跌样式类 */
function resolveChangeClass(changeStr) {
  if (!changeStr) return '';
  return String(changeStr).charAt(0) === '-' ? 'is-down' : 'is-up';
}

/**
 * 集团菜品页以当前组织 disInfo 为准。
 * userInfo.gbDuDistributerId 可能在切换/重新绑定组织后仍保留旧值，只能作为兜底。
 */
function resolveCurrentDistributerContext() {
  var disInfo = wx.getStorageSync('disInfo') || null;
  var userInfo = wx.getStorageSync('userInfo') || null;
  var activeId = disInfo && disInfo.gbDistributerId != null
    ? Number(disInfo.gbDistributerId)
    : 0;
  var userId = userInfo && userInfo.gbDuDistributerId != null
    ? Number(userInfo.gbDuDistributerId)
    : 0;

  if (activeId > 0 && userId > 0 && activeId !== userId) {
    console.warn('菜品经营概览检测到批发商缓存不一致，使用当前组织ID', {
      activeDistributerId: activeId,
      userDistributerId: userId,
    });
  }

  return {
    disId: activeId > 0 ? activeId : (userId > 0 ? userId : null),
    userInfo: userInfo,
  };
}

/** 为分类列表补充计算字段 */
function enrichCategories(list) {
  return list.map(function(cat) {
    var iconConf = CATEGORY_ICONS[cat.categoryName] || { emoji: '\uD83C\uDF7D', bg: 'rgba(150,150,150,0.12)', color: '#999' };
    return Object.assign({}, cat, {
      iconEmoji: iconConf.emoji,
      iconBg: iconConf.bg,
      iconColor: iconConf.color,
      pieStyle: buildPieStyle(cat.portfolio),
      legendList: buildLegend(cat.portfolio),
    });
  });
}

Page({
  data: {
    navBarHeight: 88,
    disId: null,
    userInfo: null,

    // 概览
    summary: {
      categoryCount: 0,
      dishCount: 0,
      grossMarginRate: '—',
      grossMarginRateChange: '—',
      changeClass: '',
    },

    // 分类列表
    categories: [],

    // 查询参数
    scopeMode: 'GROUP',
    departmentId: null,
  },

  onLoad() {
    this.setData({
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
    });
  },

  onShow() {
    var context = resolveCurrentDistributerContext();
    if (!context.disId) {
      this.setData({ disId: null, userInfo: context.userInfo });
      wx.showToast({ title: '未获取到当前组织', icon: 'none' });
      return;
    }
    this.setData({
      disId: context.disId,
      userInfo: context.userInfo,
    }, function () {
      this._fetchData();
    }.bind(this));
  },

  _fetchData() {
    var that = this;
    var disId = this.data.disId;
    if (!disId) return;

    menuCategoryBusinessOverview({
      distributerId: disId,
      scopeMode: this.data.scopeMode,
      departmentId: this.data.departmentId || null,
    }).then(function (res) {
      var payload = res.result;
      if (!payload || payload.code !== 0) return;
      var data = payload.data;

      // 映射概览字段名
      var rawSummary = data.summary || {};
      var summary = {
        categoryCount: rawSummary.categoryCount || 0,
        dishCount: rawSummary.dishCount || 0,
        grossMarginRate: rawSummary.averageGrossMarginRate || '—',
        grossMarginRateChange: rawSummary.grossMarginRateChangeVsPreviousPeriod || '—',
        changeClass: resolveChangeClass(rawSummary.grossMarginRateChangeVsPreviousPeriod),
      };

      // 映射分类字段名
      var rawCategories = data.categories || [];
      var categories = rawCategories.map(function(cat) {
        return Object.assign({}, cat, {
          grossMarginRange: cat.floatingRangeText || '—',
          summaryText: cat.businessHint || '',
        });
      });

      that.setData({
        summary: summary,
        categories: enrichCategories(categories),
        scopeMode: data.scopeMode || that.data.scopeMode,
      });
    }).catch(function (err) {
      console.error('获取菜品类别经营数据失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  // ========== 交互事件 ==========
  addFoodCategory() {
    this.setData({ toAdd: true });
    wx.navigateTo({
      url: '../addFoodFather/addFoodFather?disId=' + this.data.disId + '&type=add',
    });
  },

  openCategoryFoodList(e) {
    var ds = e.currentTarget.dataset;
    var cid = ds.fatherId != null ? ds.fatherId : ds.categoryId;
    if (cid === undefined || cid === null || cid === '') return;
    var cname = ds.fatherName != null ? String(ds.fatherName) : '';
    var params = [
      'categoryId=' + encodeURIComponent(String(cid)),
      'categoryName=' + encodeURIComponent(cname),
      'distributerId=' + encodeURIComponent(String(this.data.disId != null ? this.data.disId : '')),
      'scopeMode=' + encodeURIComponent(this.data.scopeMode || 'GROUP'),
    ];
    if (this.data.departmentId) {
      params.push('departmentId=' + encodeURIComponent(String(this.data.departmentId)));
    }
    wx.navigateTo({
      url: '../depFoodList/depFoodList?' + params.join('&'),
    });
  },

  toBack() {
    wx.navigateBack({ delta: 1 });
  },
});
