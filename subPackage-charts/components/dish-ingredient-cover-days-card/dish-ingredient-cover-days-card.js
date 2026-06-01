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

      var formatted = rows.map(function (r) {
        var coverDays = Number(r.coverDays);
        var isDanger = coverDays > 0 && coverDays < 1;
        var isWarning = coverDays >= 1 && coverDays < 3;
        return {
          ingredientName: r.ingredientName || '未知配料',
          recipeUnitPerDish: r.recipeUnitPerDish || '0',
          currentStockQty: r.currentStockQty || '0',
          dailyExpectedUsageQty: r.dailyExpectedUsageQty || '0',
          coverDaysStr: (r.coverDays != null && r.coverDays !== '') ? String(Number(r.coverDays).toFixed(2)) : '-',
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

      var dishCoverDays = payload.dishCoverDays != null ? Number(payload.dishCoverDays).toFixed(2) : '0.00';
      var dishCoverDaysNum = Number(dishCoverDays);

      var summary = payload.summary || {};
      var salesPortions = summary.salesPortions || '0';

      this.setData({
        visible: true,
        dishName: payload.dishName || data.dishName || '菜品',
        title: data.title || (payload.dishName ? payload.dishName + '·配料可支撑天数' : '配料可支撑天数'),
        subtitle: data.subtitle || payload.stockSnapshotLabel || '',
        dishCoverDays: dishCoverDays,
        dishCoverDaysNum: dishCoverDaysNum,
        dishDanger: dishCoverDaysNum > 0 && dishCoverDaysNum < 1,
        bottleneckName: bottleneckRow ? bottleneckRow.ingredientName : (payload.bottleneckIngredientName || ''),
        bottleneckDays: bottleneckRow
          ? bottleneckRow.coverDaysStr
          : (payload.bottleneckCoverDays != null ? Number(payload.bottleneckCoverDays).toFixed(2) : '0.00'),
        ingredientRows: formatted,
        summary: summary,
        salesPortions: salesPortions,
        dailySalesPortions: summary.dailySalesPortions || '0.00',
        salesBaselineLabel: payload.salesBaselineLabel || summary.salesBaselineLabel || '',
        stockSnapshotLabel: payload.stockSnapshotLabel || '',
      });
    },
  },
});
