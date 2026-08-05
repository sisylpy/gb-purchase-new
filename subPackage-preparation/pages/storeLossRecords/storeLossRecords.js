var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');

var reasonLabels = { NATURAL_LOSS: '自然损耗', PROCESSING_LOSS: '加工损耗', WEIGHING_ERROR: '过称误差', OTHER: '其他' };
Page({
  data: { navBarHeight: 0, productId: null, loading: true, rows: [] },
  onLoad: function (options) { this.setData({ productId: options && options.productId ? Number(options.productId) : null, navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR }); },
  onShow: function () { this.loadRows(); },
  onPullDownRefresh: function () { this.loadRows().then(function () { wx.stopPullDownRefresh(); }); },
  loadRows: function () {
    var that = this;
    this.setData({ loading: true });
    return api.listStoreRawLosses(this.data.productId).then(function (rows) {
      rows = (rows || []).map(function (row) { return Object.assign({}, row, { reasonLabel: reasonLabels[row.reasonCode] || row.reasonCode, costText: util.formatMoney(row.lossCost), timeText: String(row.recordTime || '').replace('T', ' ').slice(0, 19) }); });
      that.setData({ loading: false, rows: rows });
    }).catch(function (error) { that.setData({ loading: false, rows: [] }); util.showError(error); });
  },
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
