/**
 * 库存临期/过期风险卡片（也用于分类存放天数提醒）
 *
 * cardData 结构（由 _resolveDisplayCard 构建）：
 * { title, subtitle,
 *   cardSemantic: 可选 'QUANTITY_DAYS_STORAGE_REMINDER' 表示分类存放提醒,
 *   storageDaysLabel: 存放天数标签,
 *   summary: { narrative, nearExpiryWindowDays, shelfExpiryRowCount },
 *   riskItems: [{ batchId, goodsName, restWeight, weightUnit, expiryDate,
 *     storageDueDate, storageDays, storageReminderTier,
 *     expirySource, riskTier, daysUntilExpiry }]
 * }
 */

/** 风险等级映射 */
function mapRiskTier(row) {
  var tier = (row.riskTier || '').toLowerCase();
  if (tier === 'expired' || tier === '已过期') {
    return { label: '已过期', cls: 'wner-tier--expired', level: 0 };
  }
  if (tier === 'due_today' || tier === '今日到期') {
    return { label: '今日到期', cls: 'wner-tier--due-today', level: 1 };
  }
  if (tier === 'near_expiry' || tier === '临期') {
    var days = Number(row.daysUntilExpiry);
    var label = '临期' + (days > 0 ? '（' + days + '天）' : '');
    return { label: label, cls: 'wner-tier--near', level: 2 };
  }
  return { label: tier || '未知', cls: '', level: 9 };
}

/** 按风险等级排序：expired > due_today > near_expiry */
function sortRiskItems(items) {
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
    narrative: '',
    /** 是否为分类存放天数提醒卡 */
    isStorageReminder: false,
    storageDaysLabel: '分类存放天数',
    expiredCount: 0,
    dueTodayCount: 0,
    nearExpiryCount: 0,
    riskItems: [],
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
      var rawItems = (payload.riskItems && Array.isArray(payload.riskItems))
        ? payload.riskItems : [];
      var summary = payload.summary || {};

      // 是否分类存放天数提醒卡
      var isStorageReminder = payload.cardSemantic === 'QUANTITY_DAYS_STORAGE_REMINDER';
      var storageDaysLabel = payload.storageDaysLabel || '分类存放天数';
      var cardTitle = payload.cardTitle || '';

      var riskItems = rawItems.map(function (r) {
        var tier = mapRiskTier(r);
        var isExpired = tier.level === 0;
        var isDueToday = tier.level === 1;

        // 存放提醒日期：优先 storageDueDate，回退 expiryDate
        var displayDate = r.storageDueDate || r.expiryDate || '';
        // 存放天数
        var storageDays = r.storageDays != null ? r.storageDays : '';
        // 存放提醒等级
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
          riskTierLabel: tier.label,
          riskTierCls: tier.cls,
          _riskLevel: tier.level,
          daysUntilExpiry: isNaN(Number(r.daysUntilExpiry)) ? '-' : Number(r.daysUntilExpiry),
          isExpired: isExpired,
          isDueToday: isDueToday,
          isStorageReminder: isStorageReminder,
        };
      });

      // 按风险等级排序
      var sorted = sortRiskItems(riskItems);

      // 从实际数据统计计数（而不是依赖 summary）
      var expiredCount = 0;
      var dueTodayCount = 0;
      var nearExpiryCount = 0;
      sorted.forEach(function (item) {
        if (item._riskLevel === 0) expiredCount++;
        else if (item._riskLevel === 1) dueTodayCount++;
        else if (item._riskLevel === 2) nearExpiryCount++;
      });

      var showAll = false;
      var displayItems = sorted.slice(0, 5);
      var hasMore = sorted.length > 5;

      // 标题优先级：payload.cardTitle > data.title > 默认
      var title = cardTitle || data.title || payload.title || (isStorageReminder ? (storageDaysLabel + '提醒') : '库存临期/过期风险');

      this.setData({
        visible: true,
        title: title,
        subtitle: data.subtitle || payload.stockSnapshotLabel || payload.timeLabel || '',
        narrative: summary.narrative || '',
        isStorageReminder: isStorageReminder,
        storageDaysLabel: storageDaysLabel,
        expiredCount: expiredCount,
        dueTodayCount: dueTodayCount,
        nearExpiryCount: nearExpiryCount,
        riskItems: sorted,
        displayItems: displayItems,
        showAll: showAll,
        hasMore: hasMore,
        totalCount: sorted.length,
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
