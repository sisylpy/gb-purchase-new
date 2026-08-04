var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');

Page({
  data: {
    navBarHeight: 0,
    batchId: null,
    loading: true,
    submitting: false,
    batch: null,
    showMaterials: true,
    showTrace: false,
    showUsage: false,
    showDiscards: false,
    showReversals: false,
  },

  onLoad: function (options) {
    this.identity = util.getIdentity();
    this.actionKeys = {};
    this.setData({
      batchId: Number(options.batchId),
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
    });
  },
  onShow: function () { this.loadBatch(); },
  onPullDownRefresh: function () { this.loadBatch().then(function () { wx.stopPullDownRefresh(); }); },

  loadBatch: function () {
    var that = this;
    this.setData({ loading: true });
    return api.getCostTrace(this.data.batchId, this.identity.distributerId).then(function (row) {
      return api.getProduct(row.intermediateProductId, that.identity.distributerId).then(function (product) {
      var reversalByOriginal = {};
      (row.reversalMovements || []).forEach(function (movement) {
        if (movement.reversalOfMovementId) reversalByOriginal[String(movement.reversalOfMovementId)] = movement;
      });
      function movementView(movement) {
        return Object.assign({}, movement, {
          movementLabel: that.movementLabel(movement.movementType),
          occurredText: util.timePart(movement.occurredAt || movement.createdAt),
          quantityText: util.formatNumber(movement.baseQuantity, 6),
          costText: util.formatMoney(movement.totalCost),
          hasReversal: !!reversalByOriginal[String(movement.id)],
        });
      }
      var batch = Object.assign({}, row, {
        statusLabel: util.statusLabel(row.status),
        statusClass: util.statusClass(row.status),
        availabilityLabel: util.statusLabel(row.availabilityStatus),
        availabilityClass: util.statusClass(row.availabilityStatus),
        materialCostText: util.formatMoney(row.materialTotalCost),
        unitCostText: util.formatUnitCost(row.unitCost),
        baseUnitCode: product.baseUnitCode,
        remainingCostText: util.formatMoney(row.remainingCost),
        producedText: util.timePart(row.producedAt),
        expiresText: util.timePart(row.expiresAt),
        processLossQuantityText: util.formatNumber(row.processLossAnalysis && row.processLossAnalysis.baseQuantity, 6),
        processLossCostText: util.formatMoney(row.processLossAnalysis && row.processLossAnalysis.analysisCost),
        materials: (row.materials || []).map(function (material) {
          return Object.assign({}, material, {
            costText: util.formatMoney(material.totalCost),
            quantityText: util.formatNumber(material.usedBaseQuantity, 6),
          });
        }),
        costTrace: (row.costTrace || []).map(function (material) {
          return Object.assign({}, material, {
            costText: util.formatMoney(material.totalCost),
            quantityText: util.formatNumber(material.stockQuantityDelta, 6),
          });
        }),
        usageMovements: (row.usageMovements || []).map(movementView),
        discardMovements: (row.discardMovements || []).map(movementView),
        reversalMovements: (row.reversalMovements || []).map(movementView),
        quantityDifferenceText: util.formatNumber(row.quantityDifference, 6),
        costDifferenceText: util.formatMoney(row.costDifference),
      });
      that.setData({ loading: false, batch: batch });
      });
    }).catch(function (error) {
      that.setData({ loading: false });
      util.showError(error);
    });
  },

  movementLabel: function (type) {
    var labels = {
      PRODUCTION_COMPLETION: '生产入库',
      FOOD_USE: '用于菜品',
      DISCARD: '实际废弃',
      REVERSAL: '冲销恢复',
    };
    return labels[type] || type;
  },

  toggleSection: function (event) {
    var field = event.currentTarget.dataset.field;
    this.setData({ [field]: !this.data[field] });
  },

  toIssue: function () {
    wx.navigateTo({ url: '/subPackage-preparation/pages/issue/issue?batchId=' + this.data.batchId });
  },
  toComplete: function () {
    wx.navigateTo({ url: '/subPackage-preparation/pages/complete/complete?batchId=' + this.data.batchId });
  },
  toDiscard: function () {
    wx.navigateTo({ url: '/subPackage-preparation/pages/discard/discard?batchId=' + this.data.batchId });
  },
  toFoodUse: function () {
    var row = this.data.batch;
    wx.navigateTo({ url: '/subPackage-preparation/pages/foodUse/foodUse?productId=' + row.intermediateProductId + '&batchId=' + row.batchId });
  },
  toLoss: function () {
    wx.navigateTo({ url: '/subPackage-preparation/pages/lossAnalysis/lossAnalysis?productId=' + this.data.batch.intermediateProductId });
  },

  actionKey: function (scope, prefix) {
    if (!this.actionKeys[scope]) this.actionKeys[scope] = api.createIdempotencyKey(prefix);
    return this.actionKeys[scope];
  },
  finishAction: function (scope) { delete this.actionKeys[scope]; },

  reverseIssue: function () {
    var that = this;
    var scope = 'issue:' + this.data.batchId;
    util.confirm('冲销不会删除原记录，而是生成反向记录并恢复对应库存数量和成本。确认冲销本次领料？', '冲销领料').then(function (confirmed) {
      if (!confirmed || that.data.submitting) return;
      that.setData({ submitting: true });
      return api.reverseIssue(that.data.batchId, {
        distributerId: that.identity.distributerId,
        rowVersion: that.data.batch.rowVersion,
        idempotencyKey: that.actionKey(scope, 'ISSUE-REV'),
        operatorId: that.identity.operatorId,
      }).then(function () {
        that.finishAction(scope);
        that.setData({ submitting: false });
        return that.loadBatch();
      }).catch(function (error) {
        that.setData({ submitting: false });
        util.showError(error);
      });
    });
  },

  reverseFoodUse: function (event) {
    var movement = event.currentTarget.dataset.item;
    if (movement.hasReversal) return;
    var that = this;
    var scope = 'food:' + movement.businessDocId;
    api.getFoodUse(movement.businessDocId, this.identity.distributerId).then(function (fact) {
      return util.confirm('冲销不会删除原使用记录，而是生成反向记录并恢复批次数量和成本。确认继续？', '冲销菜品使用').then(function (confirmed) {
        if (!confirmed || that.data.submitting) return;
        that.setData({ submitting: true });
        return api.reverseFoodUse(fact.productionFactId, {
          distributerId: that.identity.distributerId,
          rowVersion: fact.rowVersion,
          idempotencyKey: that.actionKey(scope, 'FOOD-REV'),
          operatorId: that.identity.operatorId,
        }).then(function () {
          that.finishAction(scope);
          that.setData({ submitting: false });
          return that.loadBatch();
        }).catch(function (error) {
          that.setData({ submitting: false });
          util.showError(error);
        });
      });
    }).catch(util.showError);
  },

  reverseDiscard: function (event) {
    var movement = event.currentTarget.dataset.item;
    if (movement.hasReversal) return;
    var that = this;
    var scope = 'discard:' + movement.businessDocId;
    api.getDiscard(movement.businessDocId, this.identity.distributerId).then(function (discard) {
      if (discard.reversalDiscardId) {
        wx.showToast({ title: '该废弃记录已冲销', icon: 'none' });
        return;
      }
      return util.confirm('冲销不会删除原废弃记录，而是生成反向记录并恢复批次数量和成本。确认继续？', '冲销废弃').then(function (confirmed) {
        if (!confirmed || that.data.submitting) return;
        that.setData({ submitting: true });
        return api.reverseDiscard(discard.discardId, {
          distributerId: that.identity.distributerId,
          idempotencyKey: that.actionKey(scope, 'DISCARD-REV'),
          operatorId: that.identity.operatorId,
        }).then(function () {
          that.finishAction(scope);
          that.setData({ submitting: false });
          return that.loadBatch();
        }).catch(function (error) {
          that.setData({ submitting: false });
          util.showError(error);
        });
      });
    }).catch(util.showError);
  },
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
