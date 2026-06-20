/**
 * 菜品成本/利润排行卡片（表格样式）
 *
 * cardData：
 * { title, subtitle, payload: { timeLabel, timeDisplayText, metricLabel, rankingType, rows[], summary } }
 *
 * rows[] 字段：
 * rank, dishName, salesQuantity, actualRevenue, theoryCostAmount, actualCostAmount, blendedGrossMarginRateOnListPrice
 */

/** 金额格式化 */
function fmtAmount(val) {
  if (val === undefined || val === null || isNaN(val)) return '¥0';
  var num = Number(val);
  if (num >= 10000) return '¥' + (num / 10000).toFixed(1).replace(/\.0$/, '') + '万';
  var parts = num.toFixed(2).split('.');
  var intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return '¥' + intPart + (parts[1] === '00' ? '' : '.' + parts[1]);
}

/** 毛利率格式化 */
function fmtMarginRate(val) {
  if (val === undefined || val === null || isNaN(val)) return '-';
  var num = Number(val);
  // 如果值 <= 1，视为小数（如 0.35 → 35.0%）
  var rate = num <= 1 ? num * 100 : num;
  return rate.toFixed(1) + '%';
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
    dateRange: '',
    rows: [],
    emptyReason: '',
    showAll: false,
    displayRows: [],
    hasMore: false,
    totalCount: 0,
    /** 当 rankingType 包含 COST 时，成本列用红字高亮 */
    costHighlight: false,
    /** 利润排行时，毛利率列替换为利润额列并红字高亮（!costHighlight） */
    profitHighlight: false,
    /** 成本排行显示"毛利率"，利润排行显示"利润额（元）" */
    marginLabel: '毛利率',
  },

  methods: {
    _onCardDataChange: function (newVal) {
      if (!newVal) {
        this.setData({ visible: false });
        return;
      }

      var payload = newVal.payload || {};
      var rows = payload.rows || [];
      var title = newVal.title || '菜品成本排行';
      var subtitle = newVal.subtitle || '';

      // 成本类排行 → 成本列红色高亮；利润排行 → 毛利率列红色高亮
      var rt = (payload.rankingType || '').toUpperCase();
      var costHighlight = rt.indexOf('COST') >= 0;
      var profitHighlight = !costHighlight;

      // 时间范围：优先 startDate/endDate，fallback 到 timeDisplayText
      var sd = payload.startDate || '';
      var ed = payload.endDate || '';
      var dateRange = (sd && ed) ? (sd + ' ~ ' + ed) : (payload.timeDisplayText || payload.timeLabel || '');

      if (!rows.length) {
        this.setData({
          visible: true, title: title, subtitle: subtitle,
          dateRange: dateRange, rows: [], displayRows: [],
          emptyReason: payload.emptyReason || '暂无成本排行数据',
          showAll: false, hasMore: false, totalCount: 0,
          costHighlight: costHighlight,
          profitHighlight: profitHighlight,
          marginLabel: profitHighlight ? '利润额（元）' : '毛利率',
        });
        return;
      }

      var formatted = rows.map(function (r) {
        var rankNum = Number(r.rank) || 0;
        var qty = Number(r.salesQuantity) || 0;
        var actualCost = Number(r.actualCostAmount) || 0;
        var profitAmount = Number(r.grossProfitAmount) || 0;
        return {
          rank: rankNum,
          dishName: r.dishName || '未知菜品',
          salesQuantity: qty,
          actualCostAmount: actualCost,
          actualCostStr: fmtAmount(actualCost),
          marginRate: r.blendedGrossMarginRateOnListPrice,
          marginRateStr: fmtMarginRate(r.blendedGrossMarginRateOnListPrice),
          profitAmount: profitAmount,
          profitAmountStr: fmtAmount(profitAmount),
        };
      });

      this.setData({
        visible: true, title: title, subtitle: subtitle,
        dateRange: dateRange, rows: formatted,
        displayRows: formatted.slice(0, 5), emptyReason: '',
        showAll: false, hasMore: formatted.length > 5, totalCount: formatted.length,
        costHighlight: costHighlight,
        profitHighlight: profitHighlight,
        marginLabel: profitHighlight ? '利润额（元）' : '毛利率',
      });
    },

    onToggleExpand: function () {
      var showAll = !this.data.showAll;
      var rows = this.data.rows;
      this.setData({ showAll: showAll, displayRows: showAll ? rows : rows.slice(0, 5) });
    },
  },
});
