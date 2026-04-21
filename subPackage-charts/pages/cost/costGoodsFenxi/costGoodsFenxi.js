var load = require('../../../../lib/load.js');
var globalData = getApp().globalData;
var dateUtils = require('../../../../lib/dateUtil');
var chartsApi = require('../../../services/api.js');
var config = require('../../../../config/index.js');

/** 用量差 / 份数差 / 成本差 共用一块底色；全零灰；任一为负红系否则蓝系；深浅取三指标相对比例的最大值 */
var EPS = 1e-6;

/** 设为 true 时在控制台输出用量差/出库与底色；确认后改回 false */
var DEBUG_ING_DIFF_BADGE = false;

function parseNum(v) {
  if (v === null || v === undefined || v === '') return NaN;
  return Number(String(v).trim());
}

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function rgb(r, g, b) {
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

/**
 * 用量差通道：先把 |差|/出库 转成「相对出库的百分制」再映射，严重偏差（如 2.67 倍）时底色明显加深。
 * x = (|diff|/outbound) * QTY_RATIO_INTENSITY_SCALE，再 x/(1+x)。
 */
var QTY_RATIO_INTENSITY_SCALE = 100;

function ratioForIntensityQtyDiff(absDiff, outbound) {
  if (!(absDiff > EPS)) return 0;
  if (!(outbound > EPS)) {
    return Math.min(absDiff / (absDiff + 1), 1);
  }
  var rawRatio = absDiff / outbound;
  var x = rawRatio * QTY_RATIO_INTENSITY_SCALE;
  return x / (1 + x);
}

/**
 * 份数 / 成本通道：x=|diff|/denom 映射为 x/(1+x)。
 */
function ratioForIntensity(absDiff, denom) {
  if (!(absDiff > EPS)) return 0;
  if (!(denom > EPS)) {
    return Math.min(absDiff / (absDiff + 1), 1);
  }
  var x = absDiff / denom;
  return x / (1 + x);
}

/**
 * 底色深浅只跟「用量差/出库」算出的 r1 走，避免 r2/r3 把多行 max 成同一深度、肉眼无差别。
 * 再对 r1 做 sqrt + 抬底，让常见区间（约 0.35～0.95）在屏幕上拉开。
 */
function mapQtyR1ToBgIntensity(r1) {
  var x = Math.min(Math.max(r1, 0), 1);
  var spread = Math.sqrt(x);
  return Math.min(1, 0.1 + 0.9 * spread);
}

/** |用量差|/出库×100，以百分比展示（如 267.1% 表示差值约为出库的 2.67 倍） */
function formatAbsDiffOverOutboundPercent(d1, outbound) {
  if (!(outbound > EPS)) {
    return '—';
  }
  return (Math.abs(d1) / outbound * 100).toFixed(1) + '%';
}

function computeIngDiffBadgeColors(goods, ctx) {
  ctx = ctx || {};
  var d1 = parseNum(goods.recipeTheoryQtyVsOutboundAllocDiff);
  var d2 = parseNum(goods.soldVsSupportedPortionDiff);
  var d3 = parseNum(goods.recipeSalesVsOutboundCostDiff);
  if (isNaN(d1)) d1 = 0;
  if (isNaN(d2)) d2 = 0;
  if (isNaN(d3)) d3 = 0;

  var outbound = parseNum(goods.outboundAllocatedQty);
  if (isNaN(outbound)) outbound = 0;
  var ingDiffQtyOutboundRatioText = formatAbsDiffOverOutboundPercent(d1, outbound);

  if (Math.abs(d1) < EPS && Math.abs(d2) < EPS && Math.abs(d3) < EPS) {
    if (DEBUG_ING_DIFF_BADGE) {
      console.log('[ingDiffBadge]', ctx.__debugTag || '', '→ 全零灰', {
        goodsName: goods.goodsName,
        disGoodsId: goods.disGoodsId,
        raw: {
          recipeTheoryQtyVsOutboundAllocDiff: goods.recipeTheoryQtyVsOutboundAllocDiff,
          soldVsSupportedPortionDiff: goods.soldVsSupportedPortionDiff,
          recipeSalesVsOutboundCostDiff: goods.recipeSalesVsOutboundCostDiff,
        },
      });
    }
    return {
      recipeTheoryQtyDiffBg: '#F3F4F6',
      recipeTheoryQtyDiffColor: '#6B7280',
      ingDiffQtyOutboundRatioText: ingDiffQtyOutboundRatioText,
    };
  }

  var spSold = parseNum(ctx.soldPortions != null ? ctx.soldPortions : goods.soldPortions);
  if (isNaN(spSold)) spSold = 0;
  var spSup = parseNum(goods.supportedPortionsThisGood);
  if (isNaN(spSup)) spSup = 0;
  var denomPortion = Math.max(spSold, spSup, EPS);

  var cSales = parseNum(goods.salesIngredientCostAmount);
  var cOut = parseNum(goods.outboundAllocatedIngredientCostAmount);
  if (isNaN(cSales)) cSales = 0;
  if (isNaN(cOut)) cOut = 0;
  var denomCost = Math.max(Math.abs(cSales), Math.abs(cOut), EPS);

  var r1 = ratioForIntensityQtyDiff(Math.abs(d1), outbound);
  var r2 = ratioForIntensity(Math.abs(d2), denomPortion);
  var r3 = ratioForIntensity(Math.abs(d3), denomCost);
  var t = mapQtyR1ToBgIntensity(r1);

  var hasNeg = d1 < -EPS || d2 < -EPS || d3 < -EPS;

  // 浅色 → 深色：端点再拉开，同样 Δt 时 RGB 差更大，肉眼好分辨
  var result;
  if (hasNeg) {
    result = {
      recipeTheoryQtyDiffBg: rgb(lerp(255, 218, t), lerp(248, 150, t), lerp(248, 150, t)),
      recipeTheoryQtyDiffColor: '#9B2C2C',
      ingDiffQtyOutboundRatioText: ingDiffQtyOutboundRatioText,
    };
  } else {
    result = {
      recipeTheoryQtyDiffBg: rgb(lerp(248, 92, t), lerp(252, 175, t), lerp(255, 218, t)),
      recipeTheoryQtyDiffColor: '#1E4E8C',
      ingDiffQtyOutboundRatioText: ingDiffQtyOutboundRatioText,
    };
  }

  if (DEBUG_ING_DIFF_BADGE) {
    var rMax = Math.max(r1, r2, r3);
    var rawQtyRatio =
      outbound > EPS ? Math.abs(d1) / outbound : null;
    var whichWins =
      rMax <= EPS
        ? 'none'
        : r1 >= r2 && r1 >= r3
          ? 'r1用量差通道'
          : r2 >= r1 && r2 >= r3
            ? 'r2份数差通道'
            : 'r3成本差通道';
    console.log('[ingDiffBadge]', ctx.__debugTag || '', hasNeg ? '红系' : '蓝系', {
      goodsName: goods.goodsName,
      disGoodsId: goods.disGoodsId,
      /** 用量差 vs 出库量：原始比值 |recipeTheoryQtyVsOutboundAllocDiff| / outboundAllocatedQty */
      qtyVsOutbound: {
        recipeTheoryQtyVsOutboundAllocDiff: d1,
        outboundAllocatedQty: outbound,
        rawRatio: rawQtyRatio,
        rawRatioDesc:
          rawQtyRatio == null
            ? 'outbound 为 0，无法算比值，r1 走无分母分支'
            : '|diff|/outbound=' + rawQtyRatio.toFixed(6),
        /** r1：x=(|差|/出库)×' + QTY_RATIO_INTENSITY_SCALE + '，再 x/(1+x) */
        xForR1:
          rawQtyRatio == null ? null : rawQtyRatio * QTY_RATIO_INTENSITY_SCALE,
        r1Mapped: r1,
      },
      otherRatios: {
        portion: { absD2: Math.abs(d2), denom: denomPortion, raw: denomPortion > EPS ? Math.abs(d2) / denomPortion : null, r2: r2 },
        cost: { absD3: Math.abs(d3), denom: denomCost, raw: denomCost > EPS ? Math.abs(d3) / denomCost : null, r3: r3 },
      },
      depthRule:
        '底色深浅仅由 r1：(|差|/出库)×' +
        QTY_RATIO_INTENSITY_SCALE +
        ' → x/(1+x)，再 sqrt 映射；r2/r3 不参与底色',
      whichChannelWins: whichWins,
      intensityChannels: { r1: r1, r2: r2, r3: r3, rMax: rMax },
      bgIntensityT: t,
      note: 't 只来自 r1，与 rMax 无关',
      /** 实际设置到页面的底色、字色 */
      recipeTheoryQtyDiffBg: result.recipeTheoryQtyDiffBg,
      recipeTheoryQtyDiffColor: result.recipeTheoryQtyDiffColor,
    });
  }

  return result;
}

function enrichOutboundGoodsRows(rows) {
  if (!rows || !rows.length) return [];
  return rows.map(function (item) {
    return Object.assign({}, item, computeIngDiffBadgeColors(item, { __debugTag: 'outboundQty' }));
  });
}

function enrichSalesDishRows(rows) {
  if (!rows || !rows.length) return [];
  return rows.map(function (dish) {
    var next = Object.assign({}, dish);
    if (dish.ingredientRows && dish.ingredientRows.length) {
      var tag = 'salesDish:' + (dish.foodName || dish.foodId || '');
      next.ingredientRows = dish.ingredientRows.map(function (g) {
        return Object.assign({}, g, computeIngDiffBadgeColors(g, {
          soldPortions: dish.soldPortions,
          __debugTag: tag,
        }));
      });
    }
    return next;
  });
}

Page({
  data: {
    reportKind: 'salesDish',
    salesDishRows: [],
    outboundGoodsRows: [],
    loading: false,
    emptyHint: '',
    update: false,
    searchDepId: '-1',
    /** true：配料 badge 旁显示调试色块 + 色值字符串，便于与底色对比；上线前改 false */
    ingDiffDebugSwatch: true,
  },

  onShow: function () {
    if (this.data.update) {
      var myDate = wx.getStorageSync('myDate');
      if (myDate) {
        var dateRange;
        if (myDate.name === 'custom') {
          dateRange = dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate);
        } else {
          dateRange = dateUtils.getDateRange(myDate.name);
        }
        this.setData({
          startDate: dateRange.startDate,
          stopDate: dateRange.stopDate,
          dateType: myDate.dateType,
          hanzi: myDate.hanzi || dateRange.name,
          update: false,
        });
      } else {
        this.setData({ update: false });
      }
      this._fetchReport();
    }
  },

  onLoad: function (options) {
    var userInfo = wx.getStorageSync('userInfo');
    var disId = (options && options.disId) || (userInfo && userInfo.gbDuDistributerId);
    var searchDepId =
      (options && options.searchDepId != null && String(options.searchDepId)) || '-1';
    var rk = options && options.reportKind ? normalizeReportKind(options.reportKind) : 'salesDish';

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: config.server,
      disId: disId,
      searchDepId: searchDepId,
      reportKind: rk,
    });

    var myDate = wx.getStorageSync('myDate');
    if (myDate) {
      var dateRange;
      if (myDate.name === 'custom') {
        dateRange = dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate);
      } else {
        dateRange = dateUtils.getDateRange(myDate.name);
      }
      this.setData({
        startDate: dateRange.startDate,
        stopDate: dateRange.stopDate,
        dateType: myDate.dateType,
        hanzi: myDate.hanzi || dateRange.name,
      });
    } else {
      this.setData({
        dateType: 'month',
        startDate: dateUtils.getFirstDateInMonth(),
        stopDate: dateUtils.getArriveDate(0),
        hanzi: '本月',
      });
    }

    var mendianInfo = wx.getStorageSync('mendianInfo');
    if (mendianInfo && mendianInfo.gbDepartmentId) {
      this.setData({
        depFatherId: mendianInfo.gbDepartmentId,
      });
    }

    this._fetchReport();
  },

  _fetchReport: function () {
    var that = this;
    if (!this.data.disId) {
      load.showToast('缺少配送商信息');
      return;
    }
    this.setData({ loading: true });
    load.showLoading('加载中');
    chartsApi
      .getGbDishCostAnalysisReport({
        startDate: this.data.startDate,
        stopDate: this.data.stopDate,
        disId: this.data.disId,
        searchDepId: this.data.searchDepId,
        depFatherId: this.data.depFatherId,
        reportKind: this.data.reportKind,
      })
      .then(function (res) {
        load.hideLoading();
        console.log("res",res.result.data);
        var data = res.result.data ;
        if(res.result.data.reportKind ==  "salesDish"){
          that.setData({
            salesDishRows: enrichSalesDishRows(data.salesDishRows || []),
            loading: false,
          });
        }else{
          that.setData({
            outboundGoodsRows: enrichOutboundGoodsRows(data.outboundGoodsRows || []),
            loading: false,
          });
        }
        that.setData({
          reportKind: res.result.data.reportKind,
        });
      })
      .catch(function () {
        load.hideLoading();
        that.setData({ loading: false });
        load.showToast('网络异常');
      });
  },

  /** 顶栏单图：在销售菜品 / 出库数量 间切换 */
  onToggleReportKind: function () {
    var next = this.data.reportKind === 'salesDish' ? 'outboundQty' : 'salesDish';
    this.setData({ reportKind: next });
    this._fetchReport();
  },

  onReportSalesDish: function () {
    if (this.data.reportKind === 'salesDish') return;
    this.setData({ reportKind: 'salesDish' });
    this._fetchReport();
  },

  onReportOutboundQty: function () {
    if (this.data.reportKind === 'outboundQty') return;
    this.setData({ reportKind: 'outboundQty' });
    this._fetchReport();
  },

  toDatePageSearch: function () {
    this.setData({ update: true });
    wx.navigateTo({
      url:
        '/pages/common/selectDate/selectDate?startDate=' +
        this.data.startDate +
        '&stopDate=' +
        this.data.stopDate +
        '&dateType=' +
        (this.data.dateType || 'month'),
    });
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  },
});
