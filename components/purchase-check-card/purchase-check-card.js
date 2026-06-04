Component({
  properties: {
    cardData: {
      type: Object,
      value: null,
    },
  },
  data: {},
  lifetimes: {
    attached() {
      this._computeAnomaly();
    },
  },
  observers: {
    'cardData': function() {
      this._computeAnomaly();
    },
  },
  methods: {
    _computeAnomaly: function() {
      var d = this.data.cardData || {};
      var hasAnomaly = false;
      if (d.priceAnomalyItems && d.priceAnomalyItems.length > 0) hasAnomaly = true;
      if (d.amountAnomalyItems && d.amountAnomalyItems.length > 0) hasAnomaly = true;
      if (d.purchaseFrequencyTopItems && d.purchaseFrequencyTopItems.length > 0) hasAnomaly = true;
      this.setData({ _hasAnomaly: hasAnomaly });
    },

    _changeClass: function(percent) {
      var p = parseFloat(percent);
      if (isNaN(p)) return 'change-neutral';
      if (p > 15 || p < -15) return 'change-warn';
      if (p > 5 || p < -5) return 'change-ok'; /* 偏绿表示关注但不紧急，或用中性色 */
      return 'change-neutral';
    },

    _formatChange: function(percent) {
      var p = parseFloat(percent);
      if (isNaN(p)) return '';
      var sign = p >= 0 ? '+' : '';
      return sign + p.toFixed(0).replace(/\.0$/, '') + '% ↗';
    },
  },
});
