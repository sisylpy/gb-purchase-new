/**
 * 缺货/断货清单卡片
 *
 * cardData 结构（由 cardNormalizer 构建，源自后端 WAREHOUSE_OUT_OF_STOCK_CARD payload）：
 * { title, subtitle,
 *   summary: { narrative, noRecordCount, zeroRestCount },
 *   noRecordCount, zeroRestCount,
 *   noRecordItems: [{ goodsName, storeName, zeroStockType, disGoodsId, depDisGoodsId }],
 *   zeroRestItems: [{ goodsName, storeName, zeroStockType, disGoodsId, depDisGoodsId }]
 * }
 * 仅消费结构化字段，不解析文字答案。
 */
Component({
  properties: {
    cardData: {
      type: Object,
      value: null,
      observer: '_onCardDataChange',
    },
    /** 只读模式（本轮不启用「加入工作记录」） */
    readonly: {
      type: Boolean,
      value: true,
    },
  },

  data: {
    visible: false,
    title: '',
    subtitle: '',
    summaryText: '',
    noRecordCount: 0,
    zeroRestCount: 0,
    noRecordItems: [],
    zeroRestItems: [],
    hasData: false,
  },

  methods: {
    _onCardDataChange: function (data) {
      if (!data) {
        this.setData({ visible: false });
        return;
      }

      var payload = data.payload || data;
      var summary = payload.summary || {};
      var noRecordItems = Array.isArray(payload.noRecordItems) ? payload.noRecordItems : [];
      var zeroRestItems = Array.isArray(payload.zeroRestItems) ? payload.zeroRestItems : [];
      var noRecordCount = numOr(payload.noRecordCount, noRecordItems.length);
      var zeroRestCount = numOr(payload.zeroRestCount, zeroRestItems.length);
      var hasData = noRecordItems.length > 0 || zeroRestItems.length > 0;

      this.setData({
        visible: true,
        title: data.title || payload.title || '缺货/断货清单',
        subtitle: data.subtitle || payload.timeLabel || payload.stockSnapshotLabel || '',
        summaryText: summary.narrative || '',
        noRecordCount: noRecordCount,
        zeroRestCount: zeroRestCount,
        noRecordItems: noRecordItems.map(mapRow),
        zeroRestItems: zeroRestItems.map(mapRow),
        hasData: hasData,
      });
    },
  },
});

function numOr(v, fallback) {
  var n = parseInt(v, 10);
  if (!isNaN(n) && n >= 0) {
    return n;
  }
  return fallback;
}

function mapRow(r) {
  if (!r) {
    return { goodsName: '未知商品', storeName: '', zeroStockType: '' };
  }
  return {
    goodsName: r.goodsName || '未知商品',
    storeName: r.storeName || '',
    zeroStockType: r.zeroStockType || '',
  };
}
