/**
 * 菜品配料可支撑天数卡片
 *
 * cardData 结构（由 _resolveDisplayCard 构建）：
 * { title, subtitle, dishName, dishCoverDays, bottleneckIngredientName, bottleneckCoverDays,
 *   ingredientRows[], summary, salesBaselineLabel, stockSnapshotLabel }
 */
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
    dishName: '',
    title: '',
    subtitle: '',
    dishCoverDays: '',
    forecastAvailability: '',
    coverDaysUsable: false,
    coverDaysStatusText: '',
    coverDaysStatusDetail: '',
    bottleneckName: '',
    bottleneckDays: '',
    ingredientRows: [],
    summary: null,
    salesBaselineLabel: '',
    stockSnapshotLabel: '',
  },

  methods: {
    _onCardDataChange: function (data) {
      if (!data) {
        this.setData({ visible: false });
        return;
      }

      var payload = data.payload || data;
      var rows = (payload.ingredientRows && Array.isArray(payload.ingredientRows))
        ? payload.ingredientRows : [];

      var reasonLabels = {
        inventory_rest_weight_missing: '库存剩余量数据缺失',
        ingredient_goods_unbound: '未绑定库存商品',
        inventory_rest_weight_invalid: '库存数据异常',
        no_sales_in_window_cannot_compute_cover_days: '基线期无销量，无法估算',
        no_sales_in_window_cannot_compute_daily_usage: '基线期无销量，无法估算',
        recipe_unit_missing: '单份配方用量缺失',
        daily_expected_usage_missing: '日预计用量缺失',
      };

      function hasValue(value) {
        return value !== null && value !== undefined && value !== '';
      }

      function displayValue(value) {
        return hasValue(value) ? String(value) : '—';
      }

      var formatted = rows.map(function (r) {
        var hasCoverDays = hasValue(r.coverDays);
        var coverDays = hasCoverDays ? Number(r.coverDays) : null;
        var isDanger = hasCoverDays && coverDays >= 0 && coverDays < 1;
        var isWarning = hasCoverDays && coverDays >= 1 && coverDays < 3;
        return {
          ingredientName: r.ingredientName || '未知配料',
          inventoryStockStatus: r.inventoryStockStatus || '',
          recipeUnitPerDish: displayValue(r.recipeUnitPerDish),
          currentStockQty: displayValue(r.currentStockQty),
          currentStockQtyEmptyReasonText: reasonLabels[r.currentStockQtyEmptyReason] || '',
          dailyExpectedUsageQty: displayValue(r.dailyExpectedUsageQty),
          dailyExpectedUsageQtyEmptyReasonText: reasonLabels[r.dailyExpectedUsageQtyEmptyReason] || '',
          coverDaysStr: hasCoverDays ? String(Number(r.coverDays).toFixed(2)) : '—',
          coverDaysUnit: hasCoverDays ? '天' : '',
          coverDaysEmptyReasonText: reasonLabels[r.coverDaysEmptyReason] || '',
          coverDaysNum: coverDays,
          isBottleneck: r.isBottleneck === true || r.isBottleneck === 'true',
          isDanger: isDanger,
          isWarning: isWarning,
        };
      });

      // 瓶颈配料（取 ingredientRows 中的 bottleneck 或顶层 bottleneckIngredientName）
      var bottleneckRow = null;
      for (var i = 0; i < formatted.length; i++) {
        if (formatted[i].isBottleneck) { bottleneckRow = formatted[i]; break; }
      }

      var forecastAvailability = payload.forecastAvailability || 'UNAVAILABLE';
      var coverDaysUsable = forecastAvailability === 'USABLE' && hasValue(payload.dishCoverDays);
      var dishCoverDays = coverDaysUsable ? Number(payload.dishCoverDays).toFixed(2) : '';
      var dishCoverDaysNum = coverDaysUsable ? Number(payload.dishCoverDays) : null;
      var coverDaysStatusText = coverDaysUsable ? '' : '暂无法准确计算';
      var outOfStockNames = Array.isArray(payload.outOfStockIngredientNames)
        ? payload.outOfStockIngredientNames.filter(function (name) { return !!name; }) : [];
      var inventoryGapNames = Array.isArray(payload.inventoryDataGapIngredientNames)
        ? payload.inventoryDataGapIngredientNames.filter(function (name) { return !!name; }) : [];
      var coverDaysStatusDetail = '';
      if (!coverDaysUsable) {
        if (payload.dishCoverDaysEmptyReason === 'no_sales_in_window_cannot_compute_cover_days') {
          coverDaysStatusDetail = '销量基线期无销量，无法估算每日耗用';
        } else if (payload.dishCoverDaysEmptyReason === 'no_recipe_for_dish') {
          coverDaysStatusDetail = '菜品配方数据缺失';
        } else if (inventoryGapNames.length > 0) {
          coverDaysStatusDetail = '库存数据缺失或异常：' + inventoryGapNames.join('、');
        }
        if (outOfStockNames.length > 0) {
          coverDaysStatusDetail = '已确认缺货：' + outOfStockNames.join('、')
            + (coverDaysStatusDetail ? '；' + coverDaysStatusDetail : '');
        }
      }
      var bottleneckNames = Array.isArray(payload.bottleneckIngredientNames)
        ? payload.bottleneckIngredientNames.filter(function (name) { return !!name; }) : [];

      var summary = payload.summary || {};

      this.setData({
        visible: true,
        dishName: payload.dishName || data.dishName || '菜品',
        title: data.title || (payload.dishName ? payload.dishName + '·配料可支撑天数' : '配料可支撑天数'),
        subtitle: data.subtitle || payload.stockSnapshotLabel || '',
        dishCoverDays: dishCoverDays,
        forecastAvailability: forecastAvailability,
        coverDaysUsable: coverDaysUsable,
        coverDaysStatusText: coverDaysStatusText,
        coverDaysStatusDetail: coverDaysStatusDetail,
        dishCoverDaysNum: dishCoverDaysNum,
        dishDanger: coverDaysUsable && dishCoverDaysNum >= 0 && dishCoverDaysNum < 1,
        bottleneckName: bottleneckNames.length > 0
          ? bottleneckNames.join('、')
          : (bottleneckRow ? bottleneckRow.ingredientName : (payload.bottleneckIngredientName || '')),
        bottleneckDays: bottleneckRow
          ? bottleneckRow.coverDaysStr
          : (hasValue(payload.bottleneckCoverDays) ? Number(payload.bottleneckCoverDays).toFixed(2) : '—'),
        ingredientRows: formatted,
        summary: summary,
        salesPortions: displayValue(summary.salesPortions),
        dailySalesPortions: displayValue(summary.dailySalesPortions),
        salesBaselineLabel: payload.salesBaselineLabel || summary.salesBaselineLabel || '',
        stockSnapshotLabel: payload.stockSnapshotLabel || '',
      });
    },
  },
});
