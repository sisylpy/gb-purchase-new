Component({
  properties: {
    cardData: { type: Object, value: null, observer: '_render' }
  },
  data: { visible: false, title: '', subtitle: '', basisLabel: '', basisSource: '', availabilityMessage: '', emptyMessage: '', rows: [] },
  methods: {
    _render: function (data) {
      if (!data) { this.setData({ visible: false }); return; }
      var payload = data.payload || data;
      var rows = Array.isArray(payload.rows) ? payload.rows.map(function (r) {
        return Object.assign({}, r, {
          rowKey: r.batchId != null ? 'batch-' + r.batchId : 'goods-' + r.goodsId,
          remainingText: r.remainingText || '未知',
          stateText: r.stateText || r.priorityLabel || r.standardStatusLabel || r.standardsCompleteLabel || r.freshnessManagedLabel || '状态未知',
          detailOpen: false,
          displayTone: r.freshWasteDue ||
            (r.queryBasisCode === 'FRESH_WASTE_TIME' && r.thresholdReached) ? 'danger' :
            (r.freshWarnReached || r.thresholdReached ||
              r.priorityCode === 'APPROACHING_BEST_STOCK_TIME' ? 'warning' : 'normal')
        });
      }) : [];
      this.setData({
        visible: true,
        title: data.title || payload.title || '商品保鲜管理',
        subtitle: data.subtitle || payload.stockSnapshotLabel || '',
        basisLabel: payload.queryBasisLabel || '',
        basisSource: payload.queryBasisSource || '',
        availabilityMessage: payload.availabilityMessage || '',
        emptyMessage: payload.emptyMessage || '暂无可确认结果；标准缺失表示未知，不表示安全',
        rows: rows
      });
    },
    toggleDetails: function (event) {
      var rowKey = event.currentTarget.dataset.rowKey;
      var rows = this.data.rows.map(function (row) {
        return row.rowKey === rowKey ? Object.assign({}, row, { detailOpen: !row.detailOpen }) : row;
      });
      this.setData({ rows: rows });
    }
  }
});
