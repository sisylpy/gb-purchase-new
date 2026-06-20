/**
 * 采购异常卡 — 单价波动等异常展示
 *
 * cardData（由 _resolveDisplayCard 预构建）：
 * {
 *   title, subtitle,
 *   anomalyKind, timeLabel, scopeLabel,
 *   focusRows: [{ goodsName, standardName, currentUnitPrice, previousUnitPrice,
 *                 priceChangePercent, stockFinishDate, compareBatches, ... }],
 *   secondaryRows: [...]
 * }
 */
Component({
  properties: {
    cardData: {
      type: Object,
      value: null,
    },
    /** 卡片类型（用于记入工作记录） */
    cardType: {
      type: String,
      value: 'PURCHASE_ANOMALY_CARD',
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
  data: {},
  lifetimes: {
    attached: function () {
      console.log('[purchase-anomaly-card] attached cardData=', JSON.stringify(this.data.cardData));
    },
    ready: function () {
      console.log('[purchase-anomaly-card] ready cardData=', JSON.stringify(this.data.cardData));
    },
  },
  methods: {
    _changeClass: function (percent) {
      var p = parseFloat(percent);
      if (isNaN(p)) return 'pa-change-neutral';
      if (p > 15 || p < -15) return 'pa-change-warn';
      if (p > 5 || p < -5) return 'pa-change-ok';
      return 'pa-change-neutral';
    },

    _badgeClass: function (percent) {
      var p = parseFloat(percent);
      if (isNaN(p)) return 'pa-badge--neutral';
      if (p > 15 || p < -15) return 'pa-badge--warn';
      if (p > 5 || p < -5) return 'pa-badge--ok';
      return 'pa-badge--neutral';
    },

    _formatChange: function (percent) {
      var p = parseFloat(percent);
      if (isNaN(p)) return '';
      var sign = p >= 0 ? '+' : '';
      return sign + Math.abs(p).toFixed(1) + '%';
    },

    /** 日期截短：2026-06-06 → 06/06 */
    _shortDate: function (dateStr) {
      if (!dateStr) return '—';
      var str = String(dateStr);
      var m = str.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (m) return m[2] + '/' + m[3];
      return str;
    },

    /** 格式化采购来源 */
    _formatSource: function (batch) {
      if (!batch) return '';
      var status = batch.supplierDisplayStatus || '';
      if (status === 'HAS_SUPPLIER_NAME' && batch.supplierName) {
        return batch.supplierName + '（供应商）';
      }
      if (status === 'SELF_PURCHASE') {
        if (batch.purchaserName) return '自采 · ' + batch.purchaserName;
        return '自采';
      }
      var type = batch.purchaseSourceType || '';
      if (type === 'SUPPLIER_PURCHASE' && batch.supplierName) {
        return batch.supplierName + '（供应商）';
      }
      if (type === 'SELF_PURCHASE') {
        if (batch.purchaserName) return '自采 · ' + batch.purchaserName;
        return '自采';
      }
      return batch.supplierName || batch.purchaserName || '—';
    },

    /** 记入工作记录（整卡级，sourceItemKey 固定 __CARD__） */
    onRecordItem: function () {
      this.triggerEvent('recordWork', {
        cardType: this.properties.cardType || 'PURCHASE_ANOMALY_CARD',
        itemKey: '__CARD__',
        messageId: this.properties.messageId,
        runId: this.properties.runId,
      });
    },
  },
});
