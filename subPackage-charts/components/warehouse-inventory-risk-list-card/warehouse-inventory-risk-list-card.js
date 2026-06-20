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
    /** 卡片类型（用于记入工作记录） */
    cardType: {
      type: String,
      value: '',
    },
    /** 所属消息 ID */
    messageId: {
      type: Number,
      value: null,
    },
    /** 所属 Run ID */
    runId: {
      type: Number,
      value: null,
    },
    /** 只读模式（隐藏「记入工作记录」按钮） */
    readonly: {
      type: Boolean,
      value: false,
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
        : '';
      var levelClass = level === 'HIGH' ? 'wir-risk-high'
        : level === 'MEDIUM' ? 'wir-risk-medium'
        : level === 'LOW' ? 'wir-risk-low'
        : '';

      var supportDays = r.supportDays != null ? r.supportDays : null;

      return {
        goodsName: r.goodsName || '未知商品',
        goodsId: r.goodsId != null ? r.goodsId : null,
        restWeight: r.restWeight != null ? String(r.restWeight) : '0',
        weightUnit: r.weightUnit || '',
        periodOutboundWeight: r.periodOutboundWeight != null ? r.periodOutboundWeight : '0',
        dailyOutboundWeight: r.dailyOutboundWeight != null ? r.dailyOutboundWeight : '0',
        supportDays: supportDays,
        hasSupportDays: supportDays != null && supportDays !== '' && Number(supportDays) >= 0,
        riskLevelLabel: levelLabel,
        riskLevelClass: levelClass,
        hasRiskLevel: !!levelLabel,
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

    /** 行级「记入工作记录」 */
    onRecordItem: function (e) {
      var index = e.currentTarget.dataset.index;
      var item = (this.data.riskItems || [])[index];
      if (!item) return;
      var itemKey = item.goodsId ? 'goodsId:' + item.goodsId : '__CARD__';
      this.triggerEvent('recordWork', {
        cardType: this.properties.cardType || 'WAREHOUSE_INVENTORY_RISK_LIST_CARD',
        itemKey: itemKey,
        messageId: this.properties.messageId,
        runId: this.properties.runId,
      });
    },
  },
});
