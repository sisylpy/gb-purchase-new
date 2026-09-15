/**
 * 保鲜废弃到期风险卡片（只展示 FRESH_WASTE_TIME）
 *
 * cardData 结构（由 _resolveDisplayCard 构建）：
 * {
 *   title, subtitle,
 *   wasteDueCount,
 *   wasteItems: [{
 *     wasteRiskTier: 'waste_due',
 *     goodsName, restWeight, weightUnit,
 *     stockInDate, wasteDeadlineTime,
 *     isWasteOverdue,
 *     hoursUntilWaste, minutesUntilWaste
 *   }]
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
    subtitle: '',
    wasteDueCount: 0,
    wasteItems: [],
    displayItems: [],
    showAll: false,
    hasMore: false,
    totalCount: 0,
    queryBasisLabel: '',
    queryBasisSource: '',
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
        return {
          batchId: r.batchId || '',
          wasteRiskTier: r.wasteRiskTier || '',
          goodsName: r.goodsName || '未知商品',
          restWeight: r.restWeight != null ? String(r.restWeight) : '0',
          weightUnit: r.weightUnit || '',
          stockInDate: r.stockInDate || '',
          batchAgeHours: r.batchAgeHours != null ? r.batchAgeHours : null,
          wasteStandardHours: r.wasteStandardHours != null ? r.wasteStandardHours : null,
          remainingText: r.remainingText || '',
          wasteDeadlineTime: r.wasteDeadlineTime || '',
          hoursUntilWaste: r.hoursUntilWaste != null ? r.hoursUntilWaste : null,
          minutesUntilWaste: r.minutesUntilWaste != null ? r.minutesUntilWaste : null,
          riskLabel: r.riskLabel || '状态未知',
          riskCls: r.riskCssClass || '',
          isWasteOverdue: !!r.isWasteOverdue,
        };
      });

      var showAll = false;
      var displayItems = wasteItems.slice(0, 5);
      var hasMore = wasteItems.length > 5;

      this.setData({
        visible: true,
        title: data.title || payload.title || '保鲜废弃到期风险',
        subtitle: data.subtitle || payload.stockSnapshotLabel || payload.timeLabel || '',
        wasteDueCount: payload.wasteDueCount || 0,
        wasteItems: wasteItems,
        displayItems: displayItems,
        showAll: showAll,
        hasMore: hasMore,
        totalCount: wasteItems.length,
        queryBasisLabel: payload.queryBasisLabel || '保鲜废弃时间',
        queryBasisSource: payload.queryBasisSource || '总部商品保鲜标准',
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
