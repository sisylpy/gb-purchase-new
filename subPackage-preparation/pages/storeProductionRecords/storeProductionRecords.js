var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');

Page({
  data: { navBarHeight: 0, productId: null, loading: true, rows: [] },
  onLoad: function (options) {
    this.setData({ productId: options && options.productId ? Number(options.productId) : null, navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR });
  },
  onShow: function () { this.loadRows(); },
  onPullDownRefresh: function () { this.loadRows().then(function () { wx.stopPullDownRefresh(); }); },
  loadRows: function () {
    var that = this;
    this.setData({ loading: true });
    return api.listStoreProductions(this.data.productId).then(function (rows) {
      rows = (rows || []).map(function (row) {
        return Object.assign({}, row, {
          totalCostText: util.formatMoney(row.materialTotalCost),
          unitCostText: util.formatUnitCost(row.actualUnitCost),
          timeText: util.timePart(row.producedAt),
        });
      });
      that.setData({ loading: false, rows: rows });
    }).catch(function (error) { that.setData({ loading: false, rows: [] }); util.showError(error); });
  },
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
