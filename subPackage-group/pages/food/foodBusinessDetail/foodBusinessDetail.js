var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
import apiUrl from '../../../../config/index.js';
import { menuFoodBusinessDetail } from '../../../../services/apiDistributerFood';

// ===== 工具函数 =====

/** 安全解码 URL 参数（微信框架可能已自动解码，需判断后再解） */
function _safeDecode(s) {
  if (s == null || s === '') return '';
  var t = String(s);
  // 如果包含 % 且后面是合法 hex，说明还需要解码
  if (/%[0-9A-Fa-f]{2}/.test(t)) {
    try { return decodeURIComponent(t); } catch (e) { return t; }
  }
  return t;
}

/** 去 % 号取数字 */
function _pctNum(s) {
  if (s == null || s === '') return NaN;
  var t = String(s).replace('%', '').trim();
  var n = parseFloat(t);
  return n === n ? n : NaN;
}

/** 安全转数值 */
function _toNum(s) {
  if (s == null || s === '') return NaN;
  var n = parseFloat(String(s));
  return n === n ? n : NaN;
}

/** 成本差异判断样式 */
function _gapClass(v) {
  if (isNaN(v)) return '';
  if (v > 0.5) return 'is-warn';
  if (v < -0.3) return 'is-good';
  return '';
}

/** 从 dish / data 两层取字段，优先 dish，fallback data 顶层 */
function _field(dish, data, key, fallback) {
  var v = dish[key];
  if (v != null && v !== '') return v;
  v = data[key];
  if (v != null && v !== '') return v;
  return (fallback !== undefined) ? fallback : '';
}

Page({
  data: {
    navBarHeight: 0,
    loading: true,
    errMsg: '',

    // ===== 列表页传入字段（详情接口不返回） =====
    foodId: '',
    foodName: '',
    foodImage: '',
    categoryName: '',
    roleCode: '',
    roleName: '',
    roleColor: '',
    roleSummary: '',
    currentPrice: '',
    scopeMode: '',
    distributerId: '',
    departmentId: '',

    // 列表页传入的经营诊断
    listDiagnosisTitle: '',
    listDiagnosisText: '',
    listDiagnosisLevel: '',

    // ===== 详情接口数据 =====
    period: null,

    // 经营指标（从 dish 映射）
    actualGrossMarginRateDisplay: '—',
    theoreticalGrossMarginRateDisplay: '—',
    grossMarginGapDisplay: '—',
    grossMarginGapClass: '',
    actualCostDisplay: '—',
    theoreticalCostDisplay: '—',
    costGapDisplay: '—',
    costGapClass: '',
    salesAmountDisplay: '—',
    actualTotalCostDisplay: '—',
    actualProfitDisplay: '—',
    soldPortionsDisplay: '0',

    // 目标区间
    targetGrossMarginRate: '',
    targetFloatAbs: '',
    targetLowerBound: '',
    targetUpperBound: '',
    targetStatusLabel: '',

    // ===== 成本与毛利诊断（基于接口数值计算） =====
    computedDiagnosisTitle: '',
    computedDiagnosisText: '',
    computedDiagnosisClass: '',

    // ===== 按星期销售表现（周期内星期销量分布） =====
    hasWeekdaySales: false,
    weekdaySalesData: [],
    weekdayPeakName: '',
    weekdayPeakSales: '',
    weekdaySummary: '',

    // ===== 配料成本构成 =====
    hasIngredients: false,
    ingredients: [],
    ingredientsExpanded: false,
    unitCostDisplay: '—',
  },

  // ================================================================
  //  生命周期
  // ================================================================

  onLoad(options) {
    var o = options || {};

    this.setData({
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      foodId: o.foodId || '',
      foodName: _safeDecode(o.foodName),
      foodImage: _safeDecode(o.foodImage),
      categoryName: _safeDecode(o.categoryName),
      roleCode: o.roleCode || '',
      roleName: _safeDecode(o.roleName),
      roleColor: o.roleColor || '',
      roleSummary: _safeDecode(o.roleSummary),
      currentPrice: o.currentPrice || '',
      scopeMode: o.scopeMode || 'GROUP',
      distributerId: o.distributerId || '',
      departmentId: o.departmentId || '',
    });

    // 列表页传入的经营诊断（详情接口不返回，直接使用）
    try {
      if (o.businessDiagnosis) {
        var diag = JSON.parse(decodeURIComponent(o.businessDiagnosis));
        this.setData({
          listDiagnosisTitle: diag.title || '',
          listDiagnosisText: diag.message || diag.text || '',
          listDiagnosisLevel: diag.level || '',
        });
      }
    } catch (e) {
      console.warn('[foodBusinessDetail] businessDiagnosis解析失败', e);
    }

    if (!this.data.foodId) {
      this.setData({ loading: false, errMsg: '缺少菜品ID' });
      return;
    }
    this._fetchDetail();
  },

  toBack() {
    wx.navigateBack({ delta: 1 });
  },

  onToggleIngredients() {
    this.setData({ ingredientsExpanded: !this.data.ingredientsExpanded });
  },

  // ================================================================
  //  数据请求
  // ================================================================

  _fetchDetail() {
    var that = this;
    load.showLoading('加载中');
    menuFoodBusinessDetail({
      distributerId: this.data.distributerId,
      scopeMode: this.data.scopeMode,
      departmentId: this.data.departmentId,
      foodId: this.data.foodId,
      days: 30,
    })
      .then(function (res) {
        load.hideLoading();
        var r = res && res.result;
        if (!r || (r.code !== 0 && r.code !== '0')) {
          that.setData({ loading: false, errMsg: (r && r.msg) || '加载失败' });
          return;
        }
        var d = r.data || {};
        // 🔍 打印完整响应，方便核对真实字段名
        that._processDetail(d);
        that.setData({ loading: false, errMsg: '' });
      })
      .catch(function (err) {
        console.error('[foodBusinessDetail] 请求失败', err);
        load.hideLoading();
        that.setData({ loading: false, errMsg: '网络错误' });
      });
  },

  // ================================================================
  //  数据加工
  // ================================================================

  _processDetail(d) {
    // 真实 API 返回: data.period / data.dish / data.ingredientCostRows
    var dish = d.dish || {};
    var period = d.period || {};

    // ===== 1. 经营指标（从 dish 取值） =====
    var actualPct = _pctNum(_field(dish, d, 'actualGrossMarginRate'));
    var theoryPct = _pctNum(_field(dish, d, 'theoreticalGrossMarginRate'));
    var gapNum = _pctNum(_field(dish, d, 'grossMarginGap'));

    var actualCost = _toNum(_field(dish, d, 'actualCostPerPortion'));
    var theoryCost = _toNum(_field(dish, d, 'theoreticalCostPerPortion'));
    var costGap = isNaN(actualCost) || isNaN(theoryCost) ? NaN : actualCost - theoryCost;

    // ===== 2. 目标区间 =====
    var tgtGrossMarginRate = _field(dish, d, 'targetGrossMarginRate');
    var tgtFloatAbs = _field(dish, d, 'floatAbs');
    var tgtLowerBound = _field(dish, d, 'lowerBound');
    var tgtUpperBound = _field(dish, d, 'upperBound');
    var tgtStatus = _field(dish, d, 'targetStatus') || _field(dish, d, 'status');

    // ===== 3. 计算成本与毛利诊断（不依赖接口 diagnostic 字段，基于实际数值） =====
    var compDiag = this._computeDiagnosis(actualPct, theoryPct, gapNum, costGap);

    // ===== 4. 配料成本构成（ingredientCostRows） =====
    var ingredients = this._mapIngredients(d.ingredientCostRows || d.ingredients || []);
    var unitCost = 0;
    for (var i = 0; i < ingredients.length; i++) {
      var ic = _toNum(ingredients[i].costAmount);
      if (!isNaN(ic)) unitCost += ic;
    }

    // ===== 5. 按星期销售表现（周期内星期销量分布） =====
    var weekdayResult = this._mapWeekdaySales(d.weekdaySalesDistribution || [], d.weekdayPeak || dish);

    // ===== 6. 一次 setData =====
    this.setData({
      period: period,

      // 经营指标
      actualGrossMarginRateDisplay: isNaN(actualPct) ? '—' : actualPct.toFixed(1),
      theoreticalGrossMarginRateDisplay: isNaN(theoryPct) ? '—' : theoryPct.toFixed(1),
      grossMarginGapDisplay: isNaN(gapNum) ? '—' : (gapNum >= 0 ? '+' : '') + gapNum.toFixed(1) + '%',
      grossMarginGapClass: isNaN(gapNum) ? '' : (gapNum < 0 ? 'is-down' : 'is-up'),

      actualCostDisplay: isNaN(actualCost) ? '—' : actualCost.toFixed(2),
      theoreticalCostDisplay: isNaN(theoryCost) ? '—' : theoryCost.toFixed(2),
      costGapDisplay: isNaN(costGap) ? '—' : (costGap >= 0 ? '+' : '') + costGap.toFixed(2),
      costGapClass: _gapClass(costGap),

      salesAmountDisplay: _field(dish, d, 'salesAmount') || '—',
      actualTotalCostDisplay: _field(dish, d, 'actualCostTotalAmount') || '—',
      actualProfitDisplay: _field(dish, d, 'actualProfitAmount') || '—',
      soldPortionsDisplay: _field(dish, d, 'soldPortionsTotal') || '0',

      // 目标区间
      targetGrossMarginRate: tgtGrossMarginRate,
      targetFloatAbs: tgtFloatAbs,
      targetLowerBound: tgtLowerBound,
      targetUpperBound: tgtUpperBound,
      targetStatusLabel: _targetStatusLabel(tgtStatus),

      // 计算诊断
      computedDiagnosisTitle: compDiag.title,
      computedDiagnosisText: compDiag.text,
      computedDiagnosisClass: compDiag.cls,

      // 星期销量分布
      hasWeekdaySales: weekdayResult.has,
      weekdaySalesData: weekdayResult.bars,
      weekdayPeakName: weekdayResult.peakName,
      weekdayPeakSales: weekdayResult.peakSales,
      weekdaySummary: weekdayResult.summary,

      // 配料
      hasIngredients: ingredients.length > 0,
      ingredients: ingredients,
      ingredientsExpanded: false,
      unitCostDisplay: unitCost.toFixed(2),
    });
  },

  // ================================================================
  //  成本与毛利诊断（基于 actualGrossMarginRate / theoreticalGrossMarginRate / grossMarginGap）
  // ================================================================

  _computeDiagnosis(actualPct, theoryPct, gapPct, costGap) {
    // 如果有列表页传入的 businessDiagnosis，优先使用
    if (this.data.listDiagnosisTitle || this.data.listDiagnosisText) {
      return {
        title: this.data.listDiagnosisTitle,
        text: this.data.listDiagnosisText,
        cls: this._mapDiagnosisClass(this.data.listDiagnosisLevel),
      };
    }

    // 否则根据接口数值自动计算诊断
    if (isNaN(actualPct) || isNaN(theoryPct)) {
      return { title: '数据不完整', text: '暂无法诊断，请确认接口数据是否正常', cls: 'is-info' };
    }

    var gapText = '';
    var hasGap = !isNaN(gapPct);
    var gapDisplay = hasGap ? (gapPct >= 0 ? '+' : '') + gapPct.toFixed(1) + '%' : '—';
    var actualDisplay = actualPct.toFixed(1) + '%';
    var theoryDisplay = theoryPct.toFixed(1) + '%';

    // 偏差在 ±2% 以内视为正常
    if (hasGap && Math.abs(gapPct) <= 2) {
      return {
        title: '毛利率达标',
        text: '实际毛利率 ' + actualDisplay + '，与理论值 ' + theoryDisplay + ' 偏差 ' + gapDisplay + '，在合理范围内，成本控制良好。',
        cls: 'is-good',
      };
    }

    if (hasGap && gapPct < -2) {
      var costHint = isNaN(costGap) ? '' : ('，单份成本超出 ¥' + costGap.toFixed(2));
      return {
        title: '实际毛利率低于理论值',
        text: '实际毛利率 ' + actualDisplay + '，低于理论值 ' + theoryDisplay + '，偏差 ' + gapDisplay + costHint + '。建议复核原料损耗与出库记录。',
        cls: 'is-warn',
      };
    }

    if (hasGap && gapPct > 2) {
      return {
        title: '实际毛利率高于理论值',
        text: '实际毛利率 ' + actualDisplay + '，高于理论值 ' + theoryDisplay + '，偏差 ' + gapDisplay + '。可能原料成本计算有偏差，建议核实配料表。',
        cls: 'is-info',
      };
    }

    return { title: '毛利率', text: '实际 ' + actualDisplay + ' / 理论 ' + theoryDisplay, cls: 'is-info' };
  },

  _mapDiagnosisClass(level) {
    var lv = (level || '').toUpperCase();
    if (lv === 'WARNING' || lv === 'WARN' || lv === 'DANGER') return 'is-warn';
    if (lv === 'GOOD' || lv === 'OK') return 'is-good';
    if (lv === 'INFO') return 'is-info';
    return 'is-warn';
  },

  // ================================================================
  //  配料 costRows 字段映射（兼容多种后端字段名）
  // ================================================================

  _mapIngredients(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.map(function (r, idx) {
      // 匹配多种可能的字段名
      var name = r.ingredientName || r.goodsName || r.materialName || r.name || '';
      var quantity = r.quantity || r.quantityText || r.amount || r.dosage || '';
      var unitPrice = r.unitPrice || r.unitPriceText || r.price || '';
      var costAmount = r.costAmount || r.theoreticalCostAmount || r.cost || '';
      var shareRate = r.shareRate || r.costShareRate || r.share || r.ratio || '';

      // 尝试格式化
      var costNum = _toNum(costAmount);
      var shareStr = shareRate;
      // 如果 shareRate 是数字且没有 % 号，补充 %
      if (shareRate && !String(shareRate).includes('%')) {
        var sn = _toNum(shareRate);
        if (!isNaN(sn)) shareStr = sn.toFixed(1) + '%';
      }

      return {
        name: name,
        quantity: quantity,
        unitPrice: unitPrice,
        costAmount: isNaN(costNum) ? '—' : costNum.toFixed(2),
        shareRate: shareStr,
      };
    });
  },

  // ================================================================
  //  按星期销售表现（周期内星期销量分布）
  // ================================================================

  _mapWeekdaySales(distribution, peak) {
    var WEEKDAY_ORDER = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

    // 构建 weekdayName -> 数据 的 map
    var map = {};
    if (Array.isArray(distribution)) {
      for (var i = 0; i < distribution.length; i++) {
        var d = distribution[i];
        var name = d.weekdayName || '';
        if (name) {
          map[name] = d;
        }
      }
    }

    // 检查是否全是 0 或无数据
    var hasAny = false;
    for (var  w = 0; w < WEEKDAY_ORDER.length; w++) {
      var wn = WEEKDAY_ORDER[w];
      var item = map[wn];
      if (item) {
        var sc = _toNum(item.salesCount || item.salesAmount || item.orderCount);
        if (!isNaN(sc) && sc > 0) hasAny = true;
      }
    }

    if (!hasAny) {
      return { has: false, bars: [], peakName: '', peakSales: '', summary: '' };
    }

    // 找最大值做柱状图高度基准
    var maxVal = 1;
    var allBars = [];
    for (var w2 = 0; w2 < WEEKDAY_ORDER.length; w2++) {
      var wName = WEEKDAY_ORDER[w2];
      var row = map[wName];
      var sv;
      if (row) {
        sv = _toNum(row.salesCount || row.salesAmount);
        if (isNaN(sv)) {
          var oc = _toNum(row.orderCount);
          sv = isNaN(oc) ? 0 : oc;
        }
      } else {
        sv = 0;
      }
      if (sv > maxVal) maxVal = sv;
      allBars.push({
        label: wName,
        salesCount: sv,
        isPeak: false,
        _barHeight: 0,
      });
    }

    // 峰值判定：优先用 backend weekdayPeak
    var peakName = '';
    var peakCount = 0;
    if (peak && peak.peakWeekdayName) {
      peakName = peak.peakWeekdayName;
      peakCount = _toNum(peak.peakWeekdaySalesCount || peak.peakWeekdaySalesAmount);
      if (isNaN(peakCount)) peakCount = 0;
    }
    // fallback 从 distribution 找 isPeakDay 或 salesCount 最大
    if (!peakName && Array.isArray(distribution)) {
      for (var k = 0; k < distribution.length; k++) {
        var pd = distribution[k];
        if (pd.isPeakDay && pd.weekdayName) {
          peakName = pd.weekdayName;
          var pc = _toNum(pd.salesCount || pd.salesAmount);
          if (!isNaN(pc)) peakCount = Math.max(peakCount, pc);
        }
      }
    }
    // 还是没有的话取 salesCount 最大
    if (!peakName) {
      for (var b = 0; b < allBars.length; b++) {
        if (allBars[b].salesCount > peakCount) {
          peakCount = allBars[b].salesCount;
          peakName = allBars[b].label;
        }
      }
    }

    // 回填 isPeak 和柱高
    for (var b2 = 0; b2 < allBars.length; b2++) {
      allBars[b2].isPeak = (allBars[b2].label === peakName);
      allBars[b2]._barHeight = maxVal > 0 ? Math.max(10, Math.round((allBars[b2].salesCount / maxVal) * 120)) : 10;
    }

    // 小结文案
    var summary = '';
    if (peakName && peakCount > 0) {
      summary = '本周期内，' + peakName + '销量最高，共售出 ' + peakCount + ' 份。';
    }

    return {
      has: true,
      bars: allBars,
      peakName: peakName,
      peakSales: (peakCount > 0) ? peakCount.toString() : '',
      summary: summary,
    };
  },
});

/** 目标状态文案 */
function _targetStatusLabel(status) {
  var s = (status || '').toUpperCase();
  if (s === 'IN_TARGET' || s === 'IN_BAND') return '达标';
  if (s === 'BELOW_TARGET' || s === 'BELOW') return '低于目标区间';
  if (s === 'ABOVE_TARGET' || s === 'ABOVE') return '高于目标区间';
  return '未达标';
}
