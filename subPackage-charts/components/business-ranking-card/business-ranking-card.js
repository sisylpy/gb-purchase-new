/**
 * 业务排行卡（通用）— 统一消费 focusRows / secondaryRows。
 * 仅展示，行级 recordWork 事件由页面处理
 */
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

      var data = newVal;

      var rows = data.rows || [];
      var title = data.title || '业务排行';
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

    /** 行级记入工作记录；sourceItemKey 由正式行身份生成。 */
    onRecordItem: function (e) {
      var rank = e.currentTarget.dataset.rank;
      var item = null;
      var rows = this.data.rows || [];
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].rank === rank) { item = rows[i]; break; }
      }
      if (!item) return;
      var itemKey = item.sourceItemKey || '__CARD__';
      this.triggerEvent('recordWork', {
        cardType: this.properties.cardType,
        itemKey: itemKey,
        messageId: this.properties.messageId,
        runId: this.properties.runId,
      });
    },
  },
});
