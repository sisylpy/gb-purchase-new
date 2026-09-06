var routes = require('./routes');

var TAB_URLS = {
  home: routes.HOME,
  categoryGoods: routes.CATEGORY_GOODS,
  snapshotGoods: routes.SNAPSHOT_GOODS,
  orders: routes.ORDERS,
  mine: routes.MINE,
};

function switchTab(tabKey) {
  var url = TAB_URLS[tabKey];
  if (!url) return;
  wx.reLaunch({ url: url });
}

function navigateTo(pageKey, query) {
  var url = routes[pageKey];
  if (!url) return;
  if (query) {
    var qs = Object.keys(query).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(query[k]);
    }).join('&');
    if (qs) url += (url.indexOf('?') >= 0 ? '&' : '?') + qs;
  }
  wx.navigateTo({ url: url });
}

module.exports = {
  switchTab: switchTab,
  navigateTo: navigateTo,
  routes: routes,
};
