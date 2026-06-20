/**
 * 鲜品废弃风险卡片
 *
 * cardData 结构（由 _resolveDisplayCard 构建）：
 * {
 *   title, subtitle,
 *   wasteRiskFilter: 'ALL' | 'WARNING' | 'DUE',
 *   wasteDueCount, wasteWarningCount,
 *   wasteItems: [{
 *     wasteRiskTier: 'waste_due' | 'waste_warning',
 *     goodsName, restWeight, weightUnit,
 *     stockInDate, warnTime, wasteDeadlineTime,
 *     isWasteOverdue, isWasteWarningActive,
 *     hoursUntilWaste, minutesUntilWaste
 *   }]
 * }
 */

/** 风险等级映射 */
function mapWasteRiskTier(row) {
  var tier = (row.wasteRiskTier || '').toLowerCase();
  if (tier === 'waste_due') {
    return { label: '应废弃', cls: 'wwr-tier--due', level: 0 };
  }
  if (tier === 'waste_warning') {
    // 剩余时间提示
    var timeHint = '';
    var hours = Number(row.hoursUntilWaste);
    var mins = Number(row.minutesUntilWaste);
    if (!isNaN(hours) && hours > 0) {
      timeHint = '（剩余' + hours + '小时';
      if (!isNaN(mins) && mins > 0) {
        timeHint += mins + '分钟';
      }
      timeHint += '）';
    } else if (!isNaN(mins) && mins > 0) {
      timeHint = '（剩余' + mins + '分钟）';
    }
    return { label: '废弃预警' + timeHint, cls: 'wwr-tier--warning', level: 1 };
  }
  return { label: row.wasteRiskTier || '未知', cls: '', level: 9 };
}

/** 按风险等级排序：waste_due > waste_warning */
function sortWasteItems(items) {
  return items.slice().sort(function (a, b) {
    return a._riskLevel - b._riskLevel;
  });
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
    wasteDueCount: 0,
    wasteWarningCount: 0,
    wasteItems: [],
    displayItems: [],
    showAll: false,
    hasMore: false,
    totalCount: 0,
  },

  methods: {
    _onCardDataChange: function (data) {
      if (!data) {
        this.setData({ visible: false });
        return;
      }

      var payload = data.payload || data;
      var rawItems = (payload.wasteItems && Array.isArray(payload.wasteItems))
        ? payload.wasteItems : [];

      var wasteItems = rawItems.map(function (r) {
        var tier = mapWasteRiskTier(r);
        return {
          batchId: r.batchId || '',
          wasteRiskTier: r.wasteRiskTier || '',
          goodsName: r.goodsName || '未知商品',
          restWeight: r.restWeight != null ? String(r.restWeight) : '0',
          weightUnit: r.weightUnit || '',
          stockInDate: r.stockInDate || '',
          warnTime: r.warnTime || '',
          wasteDeadlineTime: r.wasteDeadlineTime || '',
          isWasteOverdue: !!r.isWasteOverdue,
          isWasteWarningActive: !!r.isWasteWarningActive,
          hoursUntilWaste: r.hoursUntilWaste != null ? r.hoursUntilWaste : null,
          minutesUntilWaste: r.minutesUntilWaste != null ? r.minutesUntilWaste : null,
          riskLabel: tier.label,
          riskCls: tier.cls,
          _riskLevel: tier.level,
        };
      });

      // 按风险等级排序
      var sorted = sortWasteItems(wasteItems);

      var showAll = false;
      var displayItems = sorted.slice(0, 5);
      var hasMore = sorted.length > 5;

      this.setData({
        visible: true,
        title: data.title || payload.title || '鲜品废弃风险',
        subtitle: data.subtitle || payload.stockSnapshotLabel || payload.timeLabel || '',
        wasteDueCount: payload.wasteDueCount || 0,
        wasteWarningCount: payload.wasteWarningCount || 0,
        wasteItems: sorted,
        displayItems: displayItems,
        showAll: showAll,
        hasMore: hasMore,
        totalCount: sorted.length,
      });
    },

    onToggleExpand: function () {
      var showAll = !this.data.showAll;
      var items = this.data.wasteItems;
      this.setData({
        showAll: showAll,
        displayItems: showAll ? items : items.slice(0, 5),
      });
    },
  },
});
