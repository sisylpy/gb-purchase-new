/**
 * 最佳库存时间风险卡片
 *
 * cardData 结构（由 _resolveDisplayCard 构建）：
 * { title, subtitle,
 *   cardSemantic: 'BEST_STOCK_TIME_RISK',
 *   storageDaysLabel: 最佳库存时间标签,
 *   summary: { narrative, shelfExpiryRowCount },
 *   riskItems: [{ batchId, goodsName, restWeight, weightUnit, expiryDate,
 *     storageDueDate, storageDays, storageReminderTier,
 *     expirySource, riskTier, daysUntilExpiry }]
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
    narrative: '',
    /** 是否为最佳库存时间风险卡 */
    isStorageReminder: false,
    storageDaysLabel: '最佳库存时间',
    expiredCount: 0,
    dueTodayCount: 0,
    nearExpiryCount: 0,
    riskItems: [],
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
      var rawItems = (payload.riskItems && Array.isArray(payload.riskItems))
        ? payload.riskItems : [];
      var summary = payload.summary || {};

      var isStorageReminder = payload.cardSemantic === 'BEST_STOCK_TIME_RISK';
      var storageDaysLabel = payload.storageDaysLabel || '最佳库存时间';
      var cardTitle = payload.cardTitle || '';

      var riskItems = rawItems.map(function (r) {
        var displayDate = r.storageDueDate || r.expiryDate || '';
        var storageDays = r.storageDays != null ? r.storageDays : '';
        var storageReminderTier = r.storageReminderTier || '';

        return {
          batchId: r.batchId || '',
          goodsName: r.goodsName || '未知商品',
          restWeight: r.restWeight != null ? String(r.restWeight) : '0',
          weightUnit: r.weightUnit || '',
          expiryDate: r.expiryDate || '',
          displayDate: displayDate,
          expirySource: r.expirySource || '',
          storageDays: storageDays,
          storageReminderTier: storageReminderTier,
          batchAgeDays: r.batchAgeDays != null ? r.batchAgeDays : null,
          riskTierLabel: r.riskLabel || '状态未知',
          riskTierCls: r.riskCssClass || '',
          daysUntilExpiry: r.daysUntilExpiry != null ? r.daysUntilExpiry : '-',
          isExpired: !!r.isExceeded,
          isDueToday: !!r.isDueToday,
          isStorageReminder: isStorageReminder,
        };
      });

      var showAll = false;
      var displayItems = riskItems.slice(0, 5);
      var hasMore = riskItems.length > 5;

      // 标题优先级：payload.cardTitle > data.title > 默认
      var title = cardTitle || data.title || payload.title || '最佳库存时间风险';

      this.setData({
        visible: true,
        title: title,
        subtitle: data.subtitle || payload.stockSnapshotLabel || payload.timeLabel || '',
        narrative: summary.narrative || '',
        isStorageReminder: isStorageReminder,
        storageDaysLabel: storageDaysLabel,
        expiredCount: payload.exceededCount || 0,
        dueTodayCount: payload.dueTodayCount || 0,
        nearExpiryCount: payload.approachingCount || 0,
        riskItems: riskItems,
        displayItems: displayItems,
        showAll: showAll,
        hasMore: hasMore,
        totalCount: riskItems.length,
        queryBasisLabel: payload.queryBasisLabel || '最佳库存时间',
        queryBasisSource: payload.queryBasisSource || '公司商品目录推荐',
      });
    },

    onToggleExpand: function () {
      var showAll = !this.data.showAll;
      var items = this.data.riskItems;
      this.setData({
        showAll: showAll,
        displayItems: showAll ? items : items.slice(0, 5),
      });
    },
  },
});
