/**
 * 库存临期/过期风险卡片
 *
 * cardData 结构（由 _resolveDisplayCard 构建）：
 * { title, subtitle,
 *   summary: { narrative, nearExpiryWindowDays, expiredOverviewCount, dueTodayOverviewCount, expiryRiskFilter },
 *   riskItems: [{ batchId, goodsName, restWeight, weightUnit, expiryDate, expirySource, riskTier, daysUntilExpiry }]
 * }
 */

/** 风险等级映射 */
function mapRiskTier(riskTier, daysUntilExpiry) {
  var tier = (riskTier || '').toLowerCase();
  if (tier === 'expired' || tier === '已过期') {
    return { label: '已过期', cls: 'wner-tier--expired', level: 0 };
  }
  if (tier === 'due_today' || tier === '今日到期') {
    return { label: '今日到期', cls: 'wner-tier--due-today', level: 1 };
  }
  if (tier === 'near_expiry' || tier === '临期') {
    var days = Number(daysUntilExpiry);
    var label = '临期' + (days > 0 ? '（' + days + '天）' : '');
    return { label: label, cls: 'wner-tier--near', level: 2 };
  }
  return { label: riskTier || '未知', cls: '', level: 9 };
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

      var riskItems = rawItems.map(function (r) {
        var tier = mapRiskTier(r.riskTier, r.daysUntilExpiry);
        var daysUntil = Number(r.daysUntilExpiry);
        var isExpired = tier.level === 0;
        var isDueToday = tier.level === 1;
        return {
          batchId: r.batchId || '',
          goodsName: r.goodsName || '未知商品',
          restWeight: r.restWeight != null ? String(r.restWeight) : '0',
          weightUnit: r.weightUnit || '',
          expiryDate: r.expiryDate || '',
          expirySource: r.expirySource || '',
          riskTierLabel: tier.label,
          riskTierCls: tier.cls,
          _riskLevel: tier.level,
          daysUntilExpiry: isNaN(daysUntil) ? '-' : daysUntil,
          isExpired: isExpired,
          isDueToday: isDueToday,
        };
      });

      // 按风险等级排序
      var sorted = sortRiskItems(riskItems);

      var showAll = false;
      var displayItems = sorted.slice(0, 5);
      var hasMore = sorted.length > 5;

      this.setData({
        visible: true,
        title: data.title || payload.title || '库存临期/过期风险',
        subtitle: data.subtitle || payload.stockSnapshotLabel || payload.timeLabel || '',
        narrative: summary.narrative || '',
        expiredCount: summary.expiredOverviewCount || 0,
        dueTodayCount: summary.dueTodayOverviewCount || 0,
        nearExpiryCount: sorted.filter(function (x) { return x._riskLevel >= 2; }).length,
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
