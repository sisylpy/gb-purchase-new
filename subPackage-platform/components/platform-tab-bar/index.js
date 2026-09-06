var routes = require('../../utils/routes');

Component({
  properties: {
    active: {
      type: String,
      value: 'home',
    },
    cartBadge: {
      type: String,
      value: '',
    },
  },

  methods: {
    onTabTap: function (e) {
      var tab = e.currentTarget.dataset.tab;
      if (!tab || tab === this.properties.active) return;
      var map = {
        home: routes.HOME,
        categoryGoods: routes.CATEGORY_GOODS,
        snapshotGoods: routes.SNAPSHOT_GOODS,
        orders: routes.ORDERS,
        mine: routes.MINE,
      };
      var url = map[tab];
      if (url) {
        wx.reLaunch({ url: url });
      }
    },
  },
});
