Component({
  properties: {
    cardData: { type: Object, value: null, observer: '_render' }
  },
  data: { visible: false, title: '', subtitle: '', basisLabel: '', basisSource: '', availabilityMessage: '', rows: [] },
  methods: {
    _render: function (data) {
      if (!data) { this.setData({ visible: false }); return; }
      var payload = data.payload || data;
      var rows = Array.isArray(payload.rows) ? payload.rows.map(function (r) {
        return Object.assign({}, r, {
          remainingText: r.remainingText || '未知',
          stateText: r.priorityLabel || r.standardStatusLabel || r.standardsCompleteLabel || '状态未知'
        });
      }) : [];
      this.setData({
        visible: true,
        title: data.title || payload.title || '商品保鲜管理',
        subtitle: data.subtitle || payload.stockSnapshotLabel || '',
        basisLabel: payload.queryBasisLabel || '',
        basisSource: payload.queryBasisSource || '',
        availabilityMessage: payload.availabilityMessage || '',
        rows: rows
      });
    }
  }
});
