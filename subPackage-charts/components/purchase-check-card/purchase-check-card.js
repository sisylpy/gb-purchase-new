Component({
  properties: {
    cardData: {
      type: Object,
      value: null,
    },
    cardType: {
      type: String,
      value: '',
    },
    messageId: {
      type: Number,
      value: null,
    },
    runId: {
      type: Number,
      value: null,
    },
  },
  data: {},
  methods: {
    onRecordItem: function (e) {
      var index = e.currentTarget.dataset.index;
      var items = this.data.cardData && this.data.cardData.priceAnomalyItems;
      var item = items ? items[index] : null;
      if (!item) return;
      var itemKey = item.goodsId ? 'goodsId:' + item.goodsId : '__CARD__';
      this.triggerEvent('recordWork', {
        cardType: this.properties.cardType || 'PURCHASE_CHECK_CARD',
        itemKey: itemKey,
        messageId: this.properties.messageId,
        runId: this.properties.runId,
      });
    },
  },
});
