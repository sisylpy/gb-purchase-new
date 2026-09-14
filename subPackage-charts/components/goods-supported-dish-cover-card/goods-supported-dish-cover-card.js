/**
 * 原料可支撑菜品卡片（GOODS_SUPPORTED_DISH_COVER_CARD）
 *
 * 从原料出发，展示该原料在「相关菜品同时正常销售」口径下的综合支撑预测：
 * 库存、销量基线、预计每日总消耗、综合预计支撑天数，以及各菜日均销量与原料日消耗。
 *
 * cardData.payload（后端 GoodsSupportedDishCoverAnswerPlan 直接透传，前端不做重算）：
 *   goodsName, currentStockQty, stockUnit, stockSnapshotLabel, salesBaselineLabel,
 *   totalDailyIngredientUsage(+Unit), combinedCoverDays, combinedCoverDaysIncomplete,
 *   forecastAvailability(USABLE/PARTIAL/UNAVAILABLE), forecastBasisNote,
 *   excludedDishNames[], dishRows[], knownGaps[]
 *
 * dishRows[] 字段：
 *   dishName, recipeUnitPerDish(+Unit), recipeBasePerDish(+Unit), recipeUsageSource,
 *   salesPortionsInBaseline, dailySalesPortions, dailyIngredientUsage(+Unit),
 *   usageSharePct, forecastStatus, forecastNote, recipeSourceGaps
 *
 * 展示规则（只渲染后端结果）：
 *   - 综合天数仅在 forecastAvailability=USABLE 时给出；否则头部标「数据缺口」。
 *   - 字段缺失显示「-」；真实零销量显示 0；不可计算/不完整行由 forecastStatus 标注并显示行级说明，
 *     不用 0.00 掩盖缺失。
 */
function textOrDash(v) {
  return v === null || v === undefined || v === '' ? '-' : String(v);
}

function isEmptyValue(v) {
  return v === null || v === undefined || v === '';
}

Component({
  properties: {
    cardData: {
      type: Object,
      value: null,
      observer: '_onCardDataChange',
    },
  },

  data: {
    visible: false,
    title: '',
    subtitle: '',
    goodsName: '',
    currentStockQty: '',
    stockUnit: '',
    stockSnapshotLabel: '',
    salesBaselineLabel: '',
    coverAvailable: false,
    coverDaysText: '',
    coverLow: false,
    coverBadgeText: '',
    coverUnit: '',
    totalDailyUsage: '',
    totalDailyUsageUnit: '',
    forecastIncomplete: false,
    forecastBasisNote: '',
    excludedDishNames: [],
    dishRows: [],
  },

  methods: {
    _onCardDataChange: function (data) {
      if (!data) {
        this.setData({ visible: false });
        return;
      }

      var payload = data.payload || data;
      var rawRows = (payload.dishRows && Array.isArray(payload.dishRows))
        ? payload.dishRows : [];
      var summary = payload.summary || {};
      var salesBaselineLabel = payload.salesBaselineLabel || summary.salesBaselineLabel || '';

      // ===== 综合支撑天数：仅 forecastAvailability=USABLE 才展示 =====
      var usable = payload.forecastAvailability === 'USABLE';
      var incomplete = payload.combinedCoverDaysIncomplete === true
        || payload.combinedCoverDaysIncomplete === 'true';
      var coverDays = (usable && !isEmptyValue(payload.combinedCoverDays))
        ? Number(payload.combinedCoverDays)
        : null;
      var coverAvailable = coverDays !== null && !isNaN(coverDays);
      var coverDaysText = coverAvailable ? coverDays.toFixed(2) : '';
      var coverBadgeText = coverAvailable
        ? '综合可支撑'
        : (incomplete ? '数据缺口' : '暂无可用天数');

      // ===== 明细行：只做展示格式化，不重算任何经营口径 =====
      var rows = rawRows.map(function (r) {
        var fs = r.forecastStatus || '';
        var isIncluded = fs === 'INCLUDED';
        var isZeroSales = fs === 'EXCLUDED_ZERO_SALES';

        var recipeQty = isEmptyValue(r.recipeUnitPerDish) ? null : String(r.recipeUnitPerDish);
        var recipeUnit = isEmptyValue(r.recipeUnitPerDishUnit) ? '' : ' ' + String(r.recipeUnitPerDishUnit);
        // 单份用量：缺失/不可计算显示 -
        var recipeTxt = recipeQty !== null ? recipeQty + recipeUnit : '-';

        // 日均销量：真实零销量显示 0 份/天，数据缺失/不可计算显示 -
        var dailyTxt = '-';
        if (isZeroSales) {
          dailyTxt = '0 份/天';
        } else if (!isEmptyValue(r.dailySalesPortions)) {
          dailyTxt = String(r.dailySalesPortions) + ' 份/天';
        }

        // 原料日消耗（base 单位）：缺失/不可计算显示 -
        var usageTxt = '-';
        if (!isEmptyValue(r.dailyIngredientUsage)) {
          usageTxt = String(r.dailyIngredientUsage)
            + (isEmptyValue(r.dailyIngredientUsageUnit) ? '' : ' ' + String(r.dailyIngredientUsageUnit));
        }

        // 占比：仅后端给出时展示
        var shareTxt = '';
        if (!isEmptyValue(r.usageSharePct)) {
          var p = Number(r.usageSharePct);
          shareTxt = (isNaN(p) ? String(r.usageSharePct) : p.toFixed(1) + '%');
        }

        return {
          dishId: r.dishId || '',
          dishName: r.dishName || '未知菜品',
          recipeTxt: recipeTxt,
          dailyTxt: dailyTxt,
          usageTxt: usageTxt,
          shareTxt: shareTxt,
          note: r.forecastNote || '',
          rowClass: isIncluded ? '' : 'gsdc-tr--excluded',
        };
      });

      var excludedNames = (payload.excludedDishNames && Array.isArray(payload.excludedDishNames))
        ? payload.excludedDishNames : [];

      this.setData({
        visible: true,
        goodsName: payload.goodsName || data.goodsName || '原料',
        title: data.title || (payload.goodsName ? payload.goodsName + '·可支撑菜品' : '原料可支撑菜品'),
        subtitle: data.subtitle || payload.stockSnapshotLabel || '',
        currentStockQty: textOrDash(payload.currentStockQty),
        stockUnit: textOrDash(payload.stockUnit),
        stockSnapshotLabel: payload.stockSnapshotLabel || '',
        salesBaselineLabel: salesBaselineLabel,
        coverAvailable: coverAvailable,
        coverDaysText: coverDaysText,
        coverLow: coverAvailable && coverDays < 1,
        coverBadgeText: coverBadgeText,
        coverUnit: coverAvailable ? '天' : '',
        totalDailyUsage: textOrDash(payload.totalDailyIngredientUsage),
        totalDailyUsageUnit: payload.totalDailyIngredientUsageUnit || '',
        forecastIncomplete: incomplete,
        forecastBasisNote: payload.forecastBasisNote || '',
        excludedDishNames: excludedNames,
        dishRows: rows,
      });
    },
  },
});
