/**
 * 库存监督/诊断卡片
 *
 * cardData 结构（由 _resolveDisplayCard 构建）：
 * {
 *   title, subtitle, scopeLabel, timeLabel, stockSnapshotLabel, asOfDate,
 *   inventoryQueryTimeKind,
 *   summary: { narrative, windowDays, nearExpiryWindowDays, dataSources, sectionCounts },
 *   sections: [
 *     { sectionId, title, rowCount, rows: [{ goodsId, goodsName, restWeight, weightUnit, ... }] },
 *     EXPIRY_RISK section 额外有 subSections: [
 *       { subSectionId, title, rowCount, rows: [{ batchId, goodsName, restWeight, weightUnit, expiryDate, riskTier, daysUntilExpiry }] }
 *     ]
 *   ]
 * }
 */

/** 风险等级映射 */
function mapRiskTier(riskTier, daysUntilExpiry) {
  var tier = (riskTier || '').toLowerCase();
  if (tier === 'expired' || tier === '已过期') {
    return { label: '已过期', cls: 'wis-tier--expired' };
  }
  if (tier === 'due_today' || tier === '今日到期') {
    return { label: '今日到期', cls: 'wis-tier--due-today' };
  }
  if (tier === 'near_expiry' || tier === '临期' || tier === '临期风险') {
    var days = Number(daysUntilExpiry);
    var label = '临期' + (days > 0 ? '（' + days + '天）' : '');
    return { label: label, cls: 'wis-tier--near' };
  }
  return { label: riskTier || '未知', cls: '' };
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
    scopeLabel: '',
    stockSnapshotLabel: '',
    narrative: '',
    sectionCounts: {},
    sections: [],
    expandedSections: {}, // 控制各 section 展开/收起
  },

  methods: {
    _onCardDataChange: function (data) {
      if (!data) {
        this.setData({ visible: false });
        return;
      }

      var payload = data.payload || data;
      var summary = payload.summary || {};
      var sections = (payload.sections && Array.isArray(payload.sections)) ? payload.sections : [];

      // 预处理 sections 中的风险等级
      var processedSections = sections.map(function (section) {
        var sec = Object.assign({}, section);
        if (sec.sectionId === 'EXPIRY_RISK' && sec.subSections) {
          sec.subSections = sec.subSections.map(function (sub) {
            return {
              subSectionId: sub.subSectionId,
              title: sub.title,
              rowCount: sub.rowCount,
              rows: (sub.rows || []).map(function (row) {
                var tier = mapRiskTier(row.riskTier, row.daysUntilExpiry);
                return Object.assign({}, row, {
                  riskTierLabel: tier.label,
                  riskTierCls: tier.cls,
                });
              }),
            };
          });
        }
        return sec;
      });

      this.setData({
        visible: true,
        title: data.title || payload.title || '库存监督/诊断',
        subtitle: data.subtitle || payload.stockSnapshotLabel || payload.timeLabel || '',
        scopeLabel: payload.scopeLabel || '',
        stockSnapshotLabel: payload.stockSnapshotLabel || payload.timeLabel || '',
        narrative: summary.narrative || '',
        sectionCounts: summary.sectionCounts || {},
        sections: processedSections,
        expandedSections: {},
      });
    },

    /** 切换 section 展开/收起 */
    onToggleSection: function (e) {
      var sectionId = e.currentTarget.dataset.sectionId;
      if (!sectionId) return;
      var expandedSections = this.data.expandedSections || {};
      expandedSections[sectionId] = !expandedSections[sectionId];
      this.setData({ expandedSections: expandedSections });
    },
  },
});
