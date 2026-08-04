var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');

Page({
  data: {
    navBarHeight: 0,
    type: 'use',
    loading: true,
    submitting: false,
    uses: [],
    discards: [],
  },
  onLoad: function (options) {
    this.identity = util.getIdentity();
    this.departmentId = Number(wx.getStorageSync('preparationDepartmentId'));
    this.actionKeys = {};
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR, type: options.type === 'discard' ? 'discard' : 'use' });
  },
  onShow: function () { this.loadRecords(); },
  onPullDownRefresh: function () { this.loadRecords().then(function () { wx.stopPullDownRefresh(); }); },
  switchType: function (event) { this.setData({ type: event.currentTarget.dataset.type }); this.loadRecords(); },
  loadRecords: function () {
    var that = this;
    this.setData({ loading: true });
    if (this.data.type === 'use') {
      return api.listFoodUses({ distributerId: this.identity.distributerId, departmentId: this.departmentId }).then(function (rows) {
        that.setData({ loading: false, uses: (rows || []).map(function (row) {
          return Object.assign({}, row, {
            statusLabel: util.statusLabel(row.postingStatus),
            statusClass: util.statusClass(row.postingStatus),
            costText: util.formatMoney(row.recordedIntermediateCost),
            perPortionText: util.formatMoney(row.recordedIntermediateCostPerPortion),
            producedText: util.timePart(row.producedAt),
          });
        }) });
      }).catch(function (error) { that.setData({ loading: false }); util.showError(error); });
    }
    return api.listDiscards({ distributerId: this.identity.distributerId }).then(function (rows) {
      rows = (rows || []).filter(function (row) { return String(row.departmentId) === String(that.departmentId); });
      var reversalIds = {};
      rows.forEach(function (row) { if (row.entryType === 'REVERSAL' && row.reversalOfId) reversalIds[String(row.reversalOfId)] = true; });
      that.setData({ loading: false, discards: rows.map(function (row) {
        return Object.assign({}, row, {
          entryLabel: row.entryType === 'REVERSAL' ? '冲销记录' : (util.reasonLabels[row.reasonCode] || row.reasonCode),
          costText: util.formatMoney(row.totalCost),
          createdText: util.timePart(row.createdAt),
          reversed: row.entryType === 'DISCARD' && !!reversalIds[String(row.discardId)],
        });
      }) });
    }).catch(function (error) { that.setData({ loading: false }); util.showError(error); });
  },
  actionKey: function (scope, prefix) { if (!this.actionKeys[scope]) this.actionKeys[scope] = api.createIdempotencyKey(prefix); return this.actionKeys[scope]; },
  reverseUse: function (event) {
    var row = event.currentTarget.dataset.item;
    var that = this;
    var scope = 'food:' + row.productionFactId;
    util.confirm('冲销不会删除原记录，而是生成反向记录并恢复对应数量和成本。', '冲销菜品使用').then(function (confirmed) {
      if (!confirmed || that.data.submitting) return;
      that.setData({ submitting: true });
      return api.reverseFoodUse(row.productionFactId, { distributerId: that.identity.distributerId, rowVersion: row.rowVersion, idempotencyKey: that.actionKey(scope, 'FOOD-REV'), operatorId: that.identity.operatorId }).then(function () {
        delete that.actionKeys[scope]; that.setData({ submitting: false }); return that.loadRecords();
      }).catch(function (error) { that.setData({ submitting: false }); util.showError(error); });
    });
  },
  reverseDiscard: function (event) {
    var row = event.currentTarget.dataset.item;
    var that = this;
    var scope = 'discard:' + row.discardId;
    util.confirm('冲销不会删除原记录，而是生成反向记录并恢复对应数量和成本。', '冲销废弃').then(function (confirmed) {
      if (!confirmed || that.data.submitting) return;
      that.setData({ submitting: true });
      return api.reverseDiscard(row.discardId, { distributerId: that.identity.distributerId, idempotencyKey: that.actionKey(scope, 'DISCARD-REV'), operatorId: that.identity.operatorId }).then(function () {
        delete that.actionKeys[scope]; that.setData({ submitting: false }); return that.loadRecords();
      }).catch(function (error) { that.setData({ submitting: false }); util.showError(error); });
    });
  },
  toBatch: function (event) { wx.navigateTo({ url: '/subPackage-preparation/pages/batchDetail/batchDetail?batchId=' + event.currentTarget.dataset.id }); },
  noop: function () {},
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
