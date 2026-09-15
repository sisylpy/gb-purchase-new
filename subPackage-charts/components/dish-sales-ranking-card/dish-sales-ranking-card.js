/**
 * 菜品销量/销售额排行卡片（表格样式）
 *
 * cardData：
 * { title, subtitle, payload: { startDate, endDate, timeLabel, timeDisplayText, metricLabel, rankingType, focusRows[], secondaryRows[], summary } }
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
    /** 头部右侧时间范围 */
    dateRange: '',
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

      var payload = newVal.payload || {};
      var focusRows = Array.isArray(payload.focusRows) ? payload.focusRows : [];
      var secondaryRows = Array.isArray(payload.secondaryRows) ? payload.secondaryRows : [];
      var rows = focusRows.concat(secondaryRows);
      var title = newVal.title || '菜品排行';
      var subtitle = newVal.subtitle || '';

      // 时间范围
      var sd = payload.startDate || '';
      var ed = payload.endDate || '';
      var dateRange = (sd && ed) ? (sd + ' ~ ' + ed) : (payload.timeDisplayText || '');

      if (!rows.length) {
        this.setData({
          visible: true, title: title, subtitle: subtitle,
          dateRange: dateRange, rows: [], displayRows: [],
          emptyReason: payload.emptyReason || '暂无菜品排行数据',
          showAll: false, hasMore: false, totalCount: 0,
        });
        return;
      }

      var formatted = rows.map(function (r) {
        var rankNum = Number(r.rank) || 0;
        var portions = Number(r.soldPortionsTotal) || 0;
        var amount = Number(r.salesAmount) || 0;
        return {
          rank: rankNum,
          dishName: r.dishName || '未知菜品',
          soldPortionsTotal: portions,
          salesAmount: amount,
          salesAmountStr: fmtAmount(amount),
        };
      });

      this.setData({
        visible: true, title: title, subtitle: subtitle,
        dateRange: dateRange, rows: formatted,
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
