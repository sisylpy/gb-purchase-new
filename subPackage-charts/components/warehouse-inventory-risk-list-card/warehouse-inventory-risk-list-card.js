/**
 * 库存风险关注列表卡片
 *
 * cardData 结构（由 _resolveDisplayCard 构建）：
 * { title, subtitle,
 *   summary: { narrative, windowDays },
 *   riskItems: [{ goodsName, restWeight, weightUnit, periodOutboundWeight, dailyOutboundWeight, riskLevel, riskReason }]
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
    riskItems: [],
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

      var riskItems = rawItems.map(function (r) {
        var level = (r.riskLevel || '').toUpperCase();
        var levelLabel = level === 'HIGH' ? '高风险'
          : level === 'MEDIUM' ? '中风险'
          : level === 'LOW' ? '低风险'
          : r.riskLevel || '';
        var levelClass = level === 'HIGH' ? 'wir-risk-high'
          : level === 'MEDIUM' ? 'wir-risk-medium'
          : 'wir-risk-low';

        return {
          goodsName: r.goodsName || '未知商品',
          restWeight: r.restWeight != null ? r.restWeight : '0',
          weightUnit: r.weightUnit || '',
          periodOutboundWeight: r.periodOutboundWeight != null ? r.periodOutboundWeight : '0',
          dailyOutboundWeight: r.dailyOutboundWeight != null ? r.dailyOutboundWeight : '0',
          riskLevelLabel: levelLabel,
          riskLevelClass: levelClass,
          riskReason: r.riskReason || '',
        };
      });

      var narrative = (payload.summary && payload.summary.narrative) || '';

      this.setData({
        visible: true,
        title: data.title || payload.title || '库存风险关注列表',
        subtitle: data.subtitle || payload.timeLabel || payload.stockSnapshotLabel || '',
        narrative: narrative,
        riskItems: riskItems,
      });
    },
  },
});
