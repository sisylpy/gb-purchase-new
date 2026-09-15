Component({
  properties: {
    cardData: {
      type: Object,
      value: null,
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
  },
  data: {},
  observers: {
    'cardData': function (cd) {
      var that = this;
      var cd2 = cd || {};
      var payload = cd2.payload || cd2 || {};
      var rawItems = (payload.items && Array.isArray(payload.items)) ? payload.items : [];
      var isEmpty = payload.status === 'EMPTY' || rawItems.length === 0;

      // 预处理 items：格式化数字字段（WXML 无法调用 methods）
      var items = [];
      for (var i = 0; i < rawItems.length; i++) {
        var it = rawItems[i];
        items.push(Object.assign({}, it, {
          _qtyStr: String(it.quantity != null ? it.quantity : '') + (it.unit || ''),
          _priceStr: it.unitPrice != null ? Number(it.unitPrice).toFixed(2) : '',
          _amountStr: it.amount != null ? Number(it.amount).toFixed(2) : '',
          _goodsId: it.goodsId != null ? it.goodsId : null,
        }));
      }

      // 格式化核心数字
      var totalAmount = payload.totalPurchaseAmount != null
        ? Number(payload.totalPurchaseAmount).toFixed(2)
        : '';
      var purchaseLineCount = payload.purchaseLineCount != null
        ? Number(payload.purchaseLineCount)
        : 0;

      that.setData({
        _isEmpty: isEmpty,
        _itemCount: rawItems.length,
        _items: items,
        _totalAmount: totalAmount,
        _purchaseLineCount: purchaseLineCount,
        // 标题区信息：优先取卡片顶层字段
        _title: cd2.title || payload.title || '原料采购',
        _timeLabel: payload.timeLabel || payload.reportLabel || '',
        _scopeLabel: payload.scopeLabel || '',
        _emptyReason: payload.emptyReason || '该时间范围内暂无采购记录',
        _warnings: (payload.warnings && Array.isArray(payload.warnings)) ? payload.warnings : [],
      });
    },
  },
  methods: {
    /** 行级「记入工作记录」 */
    onRecordItem: function (e) {
      var index = e.currentTarget.dataset.index;
      var item = (this.data._items || [])[index];
      if (!item) return;
      var itemKey = item._goodsId ? 'goodsId:' + item._goodsId : '__CARD__';
      this.triggerEvent('recordWork', {
        cardType: this.properties.cardType || 'PURCHASE_GOODS_DETAIL_CARD',
        itemKey: itemKey,
        messageId: this.properties.messageId,
        runId: this.properties.runId,
      });
    },
  },
});
