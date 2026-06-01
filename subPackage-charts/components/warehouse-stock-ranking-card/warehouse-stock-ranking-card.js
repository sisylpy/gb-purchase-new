/**
 * 库房库存排行卡片（账面库存金额偏低/偏高商品）
 *
 * cardData（由 _resolveDisplayCard 构建）：
 * { title, subtitle,
 *   payload: { rankingType, metricLabel, rows[], summary: { narrative } }
 * }
 *
 * rows[] 字段：rank, goodsName, restAmountTotal, restWeightTotal
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
    narrative: '',
    rows: [],
    emptyReason: '',
    showAll: false,
    displayRows: [],
    hasMore: false,
    totalCount: 0,
  },

  methods: {
    _onCardDataChange: function (newVal) {
      if (!newVal) {
        this.setData({ visible: false });
        return;
      }

      var payload = newVal.payload || newVal;
      var rows = payload.rows || [];
      var title = newVal.title || '账面库存排行';
      var subtitle = newVal.subtitle || '';
      var narrative = (payload.summary && payload.summary.narrative) || '';

      if (!rows.length) {
        this.setData({
          visible: true, title: title, subtitle: subtitle, narrative: narrative,
          rows: [], displayRows: [],
          emptyReason: payload.emptyReason || '暂无库存排行数据',
          showAll: false, hasMore: false, totalCount: 0,
        });
        return;
      }

      var formatted = rows.map(function (r) {
        var rankNum = Number(r.rank) || 0;
        var amount = Number(r.restAmountTotal) || 0;
        var weight = Number(r.restWeightTotal) || 0;
        return {
          rank: rankNum,
          goodsName: r.goodsName || '未知商品',
          restAmountTotal: amount,
          restAmountStr: fmtAmount(amount),
          restWeightTotal: weight,
          restWeightStr: weight.toFixed(1),
        };
      });

      this.setData({
        visible: true, title: title, subtitle: subtitle, narrative: narrative,
        rows: formatted,
        displayRows: formatted.slice(0, 5), emptyReason: '',
        showAll: false, hasMore: formatted.length > 5, totalCount: formatted.length,
      });
    },

    onToggleExpand: function () {
      var showAll = !this.data.showAll;
      var rows = this.data.rows;
      this.setData({ showAll: showAll, displayRows: showAll ? rows : rows.slice(0, 5) });
    },
  },
});
