var routes = require('../../utils/routes');
Component({
  properties: { active: { type: String, value: 'home' }, cartCount: { type: Number, value: 0 } },
  methods: {
    tap: function (e) {
      var map = { home: routes.HOME, cart: routes.CART, orders: routes.ORDERS, mine: routes.MINE };
      var key = e.currentTarget.dataset.key;
      if (key !== this.properties.active && map[key]) wx.reLaunch({ url: map[key] });
    }
  }
});
