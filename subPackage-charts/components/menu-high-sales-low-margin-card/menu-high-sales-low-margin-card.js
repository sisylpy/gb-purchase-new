/**
 * 畅销低利菜 - 经营看板卡片（列表/表格卡）
 *
 * cardData（由 _resolveDisplayCard 预构建）：
 * {
 *   title: "畅销低利菜",
 *   totalRiskDishCount: N,
 *   summary: "本月共发现 N 道畅销低利菜品...",
 *   dishes: [
 *     { dishName, salesCount, salesAmount, blendedGrossMarginRateOnListPrice,
 *       actualProfitAmount, actualCostTotalAmount123, riskReason, recommendedAction }
 *   ],
 *   empty: false   // payload.status === "EMPTY" 时为 true
 * }
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
    totalRiskDishCount: 0,
    summary: '',
    dishes: [],
    empty: false,
  },

  methods: {
    _onCardDataChange: function (newVal) {
      if (!newVal) {
        this.setData({ visible: false });
        return;
      }

      var empty = newVal.empty === true;
      var dishes = Array.isArray(newVal.dishes) ? newVal.dishes : [];

      this.setData({
        visible: true,
        title: newVal.title || '畅销低利菜',
        totalRiskDishCount: newVal.totalRiskDishCount || dishes.length || 0,
        summary: newVal.summary || '',
        dishes: dishes,
        empty: empty,
      });
    },

    /** 格式化金额：保留两位小数 */
    _fmtAmount: function (val) {
      if (val === null || val === undefined || val === '') return '—';
      var n = Number(val);
      if (isNaN(n)) return String(val);
      return n.toFixed(2);
    },

    /** 格式化百分比 */
    _fmtPercent: function (val) {
      if (val === null || val === undefined || val === '') return '—';
      var n = Number(val);
      if (isNaN(n)) return String(val);
      return n.toFixed(1) + '%';
    },
  },
});
