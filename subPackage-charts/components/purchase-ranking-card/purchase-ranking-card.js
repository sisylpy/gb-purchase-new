/**
 * 采购排行卡（通用）— 金额/次数/数量/门店/供应商
 * 仅展示，行级 recordWork 事件由页面处理
 */
var purchaseRankingUtil = require('../../utils/purchaseRankingCardUtil');

Component({
  properties: {
    cardType: {
      type: String,
      value: '',
    },
    cardData: {
      type: Object,
      value: null,
      observer: '_onCardDataChange',
    },
    readonly: {
      type: Boolean,
      value: true,
    },
    messageId: {
      type: null,
      value: null,
    },
    runId: {
      type: null,
      value: null,
    },
  },

  data: {
    visible: false,
    title: '',
    subtitle: '',
    narrative: '',
    nameLabel: '',
    metricLabel: '',
    rows: [],
    displayRows: [],
    emptyReason: '',
    showAll: false,
    hasMore: false,
    totalCount: 0,
    supportsRowRecord: false,
    footerUnit: '项',
  },

  methods: {
    _onCardDataChange: function (newVal) {
      if (!newVal) {
        this.setData({ visible: false });
        return;
      }

      var cardType = this.properties.cardType || newVal.cardType || '';
      var data = newVal;

      // 兼容仅传 payload 未预规范的场景
      if (!data.rows && purchaseRankingUtil.isPurchaseRankingCardType(cardType)) {
        var resolved = purchaseRankingUtil.resolvePurchaseRankingCardData({
          cardType: cardType,
          title: data.title || '',
          subtitle: data.subtitle || '',
          payload: data.payload || data,
        });
        if (resolved) data = resolved;
      }

      var rows = data.rows || [];
      var title = data.title || '采购排行';
      var subtitle = data.subtitle || '';
      var narrative = data.narrative || '';

      if (!rows.length) {
        this.setData({
          visible: true,
          title: title,
          subtitle: subtitle,
          narrative: narrative,
          nameLabel: data.nameLabel || '名称',
          metricLabel: data.metricLabel || '指标',
          rows: [],
          displayRows: [],
          emptyReason: data.emptyReason || '暂无排行数据',
          showAll: false,
          hasMore: false,
          totalCount: 0,
          supportsRowRecord: !!data.supportsRowRecord,
          footerUnit: data.footerUnit || '项',
        });
        return;
      }

      this.setData({
        visible: true,
        title: title,
        subtitle: subtitle,
        narrative: narrative,
        nameLabel: data.nameLabel || '名称',
        metricLabel: data.metricLabel || '指标',
        rows: rows,
        displayRows: rows.slice(0, 5),
        emptyReason: '',
        showAll: false,
        hasMore: rows.length > 5,
        totalCount: rows.length,
        supportsRowRecord: !!data.supportsRowRecord,
        footerUnit: data.footerUnit || '项',
      });
    },

    onToggleExpand: function () {
      var showAll = !this.data.showAll;
      var rows = this.data.rows;
      this.setData({
        showAll: showAll,
        displayRows: showAll ? rows : rows.slice(0, 5),
      });
    },

    /** 行级记入工作记录（仅商品类排行，由页面 bind:recordWork 处理） */
    onRecordItem: function (e) {
      var rank = e.currentTarget.dataset.rank;
      var item = null;
      var rows = this.data.rows || [];
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].rank === rank) { item = rows[i]; break; }
      }
      if (!item) return;
      var itemKey = item.rowId != null ? ('disGoodsId:' + item.rowId) : '__CARD__';
      this.triggerEvent('recordWork', {
        cardType: this.properties.cardType,
        itemKey: itemKey,
        messageId: this.properties.messageId,
        runId: this.properties.runId,
      });
    },
  },
});
