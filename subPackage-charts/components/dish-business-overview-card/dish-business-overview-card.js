function present(value, suffix) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value) + (suffix || '');
}

Component({
  properties: {
    cardData: {
      type: Object,
      value: {},
      observer: '_syncView',
    },
  },
  data: {
    view: {},
  },
  lifetimes: {
    attached: function () {
      this._syncView(this.data.cardData);
    },
  },
  methods: {
    _syncView: function (raw) {
      var data = raw || {};
      var sales = data.sales || {};
      var cost = data.cost || {};
      var profit = data.profit || {};
      this.setData({
        view: {
          title: data.title || ((data.dishName || '菜品') + '·经营概览'),
          dishName: data.dishName || '菜品',
          timeLabel: data.timeLabel || data.subtitle || '',
          scopeLabel: data.scopeLabel || '',
          availability: data.availability || 'UNAVAILABLE',
          incomplete: data.incomplete === true,
          salesPortions: present(sales.salesPortions, '份'),
          dailyAverageSales: present(sales.dailyAverageSales, '份/天'),
          salesAmount: present(sales.salesAmount, '元'),
          salesUnitPrice: present(sales.salesUnitPrice, '元/份'),
          ranking: present(sales.ranking, ''),
          rankingAvailable: sales.ranking !== null && sales.ranking !== undefined && sales.ranking !== '',
          theoreticalCost: present(cost.theoreticalCost, '元'),
          actualCost: present(cost.actualCost, '元'),
          grossProfitAmount: present(profit.grossProfitAmount, '元'),
          grossMargin: present(profit.grossMargin, profit.grossMargin != null && String(profit.grossMargin).indexOf('%') < 0 ? '%' : ''),
        },
      });
    },
  },
});
