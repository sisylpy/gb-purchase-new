Component({
  properties: {
    viewMode: { type: String, value: '' },
    batch: {
      type: Object,
      value: null,
      observer: '_onBatchChange',
    },
    batchStatus: { type: Number, value: 0 },
    todayDate: { type: String, value: '' },
    orderTime: { type: String, value: '' },
    waitWeightCount: { type: Number, value: 0 },
  },

  data: {
    finishedOutCount: 0,
    orderTimeText: '--',
    batchSubtotalText: '0.0',
  },

  methods: {
    _resolveOrderTimeText(batch) {
      if (!batch) {
        return '--';
      }
      if (batch.gbDpbHour != null && batch.gbDpbHour !== '' && batch.gbDpbMinute != null && batch.gbDpbMinute !== '') {
        var minute = batch.gbDpbMinute + '';
        if (minute.length < 2) {
          minute = '0' + minute;
        }
        return batch.gbDpbHour + ':' + minute;
      }
      if (batch.gbDpbTime) {
        var timeStr = batch.gbDpbTime + '';
        var parts = timeStr.split(' ');
        if (parts.length > 1 && parts[1]) {
          return parts[1].substring(0, 5);
        }
        if (timeStr.indexOf(':') >= 0) {
          return timeStr.substring(0, 5);
        }
        return timeStr;
      }
      return '--';
    },

    _resolveBatchSubtotalText(batch) {
      if (!batch || batch.gbDpbSubtotal == null || batch.gbDpbSubtotal === '') {
        return '0.0';
      }
      var n = Number(batch.gbDpbSubtotal);
      if (isNaN(n)) {
        return batch.gbDpbSubtotal;
      }
      return n.toFixed(1);
    },

    _onBatchChange(batch) {
      var count = 0;
      var list = batch && batch.gbDPGEntities ? batch.gbDPGEntities : [];
      for (var i = 0; i < list.length; i++) {
        if (list[i].gbDpgIsCheck == 1) {
          count++;
        }
      }
      this.setData({
        finishedOutCount: count,
        orderTimeText: this._resolveOrderTimeText(batch),
        batchSubtotalText: this._resolveBatchSubtotalText(batch),
      });
    },
  },
});
