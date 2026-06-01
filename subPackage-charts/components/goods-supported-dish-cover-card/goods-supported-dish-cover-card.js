/**
 * 原料可支撑菜品覆盖卡片（GOODS_SUPPORTED_DISH_COVER_CARD）
 *
 * 从原料出发，展示该原料能支持哪些菜品、每道菜还能卖多少份/支撑几天。
 *
 * cardData 结构（由 _resolveDisplayCard 构建）：
 * { title, subtitle,
 *   goodsName, goodsId, currentStockQty, weightUnit,
 *   stockSnapshotLabel, salesBaselineLabel, salesBaselineDays,
 *   firstImpactedCoverDays, bottleneckDishName, bottleneckCoverDays,
 *   dishRows[], summary }
 *
 * dishRows[] 字段：
 *   dishName, dishId, recipeUnitPerDish, dailySalesPortions,
 *   dailyExpectedUsageQty, coverDays, supportedPortions, isBottleneck
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
    title: '',
    subtitle: '',
    goodsName: '',
    currentStockQty: '',
    weightUnit: '',
    dishCoverDays: '',
    dishCoverDaysNum: 0,
    dishDanger: false,
    bottleneckName: '',
    bottleneckDays: '',
    dishRows: [],
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
      var rows = (payload.dishRows && Array.isArray(payload.dishRows))
        ? payload.dishRows : [];

      var formatted = rows.map(function (r) {
        var coverDays = Number(r.coverDays);
        var isDanger = coverDays > 0 && coverDays < 1;
        var isWarning = coverDays >= 1 && coverDays < 3;
        return {
          dishName: r.dishName || '未知菜品',
          dishId: r.dishId || '',
          recipeUnitPerDish: r.recipeUnitPerDish || '0',
          dailySalesPortions: r.dailySalesPortions || '0',
          dailyExpectedUsageQty: r.dailyExpectedUsageQty || '0',
          coverDaysStr: (r.coverDays != null && r.coverDays !== '') ? String(Number(r.coverDays).toFixed(2)) : '-',
          coverDaysNum: coverDays,
          supportedPortions: r.supportedPortions != null ? String(r.supportedPortions) : '-',
          isBottleneck: r.isBottleneck === true || r.isBottleneck === 'true',
          isDanger: isDanger,
          isWarning: isWarning,
        };
      });

      // 瓶颈菜品（取 dishRows 中的 bottleneck 或顶层 bottleneckDishName）
      var bottleneckRow = null;
      for (var i = 0; i < formatted.length; i++) {
        if (formatted[i].isBottleneck) { bottleneckRow = formatted[i]; break; }
      }

      var dishCoverDays = payload.firstImpactedCoverDays != null
        ? Number(payload.firstImpactedCoverDays).toFixed(2)
        : (payload.dishCoverDays != null ? Number(payload.dishCoverDays).toFixed(2) : '0.00');
      var dishCoverDaysNum = Number(dishCoverDays);

      var summary = payload.summary || {};

      this.setData({
        visible: true,
        goodsName: payload.goodsName || data.goodsName || '原料',
        title: data.title || (payload.goodsName ? payload.goodsName + '·可支撑菜品' : '原料可支撑菜品'),
        subtitle: data.subtitle || payload.stockSnapshotLabel || '',
        currentStockQty: payload.currentStockQty != null ? String(payload.currentStockQty) : '0',
        weightUnit: payload.weightUnit || '',
        dishCoverDays: dishCoverDays,
        dishCoverDaysNum: dishCoverDaysNum,
        dishDanger: dishCoverDaysNum > 0 && dishCoverDaysNum < 1,
        bottleneckName: bottleneckRow ? bottleneckRow.dishName : (payload.bottleneckDishName || ''),
        bottleneckDays: bottleneckRow
          ? bottleneckRow.coverDaysStr
          : (payload.bottleneckCoverDays != null ? Number(payload.bottleneckCoverDays).toFixed(2) : '0.00'),
        dishRows: formatted,
        summary: summary,
        affectedDishCount: summary.affectedDishCount || formatted.length,
        salesBaselineLabel: payload.salesBaselineLabel || summary.salesBaselineLabel || '',
        stockSnapshotLabel: payload.stockSnapshotLabel || '',
      });
    },
  },
});
