var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');

Page({
  data: {
    navBarHeight: 0,
    loading: true,
    submitting: false,
    recipeId: null,
    productId: null,
    productName: '',
    baseUnit: 'G',
    recipe: null,
    version: null,
    versions: [],
    components: [],
    outputUnits: ['G', 'KG', 'JIN'],
    outputUnitIndex: 0,
    theoreticalOutputQuantity: '',
    shelfLifeMinutes: '',
    isDraft: false,
    dirty: false,
    showGoodsPicker: false,
    goodsKeyword: '',
    goodsLoading: false,
    goodsResults: [],
  },

  onLoad: function (options) {
    this.identity = util.getIdentity();
    this.initialVersionId = options.versionId ? Number(options.versionId) : null;
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      recipeId: Number(options.recipeId),
      productId: Number(options.productId),
      productName: decodeURIComponent(options.productName || ''),
      baseUnit: decodeURIComponent(options.baseUnit || 'G'),
      shelfLifeMinutes: options.shelfLifeMinutes || '',
    });
    this.loadRecipe(this.initialVersionId);
  },

  buildOutputUnits: function (conversions) {
    var base = this.data.baseUnit;
    var units = base === 'ML' ? ['ML', 'L'] : (base === 'EA' ? ['EA'] : ['G', 'KG', 'JIN']);
    (conversions || []).forEach(function (row) {
      if (row.unitCode && units.indexOf(row.unitCode) < 0) units.push(row.unitCode);
    });
    return units;
  },

  loadRecipe: function (versionId) {
    var that = this;
    this.setData({ loading: true });
    return Promise.all([
      api.getIntermediateRecipe(this.data.recipeId, this.identity.distributerId, versionId),
      api.listIntermediateVersions(this.data.recipeId, this.identity.distributerId),
      api.listConversions({
        distributerId: this.identity.distributerId,
        itemKind: 'INTERMEDIATE_PRODUCT',
        intermediateProductId: this.data.productId,
      }),
    ]).then(function (results) {
      var detail = results[0];
      var versions = (results[1] || []).map(function (row) {
        return Object.assign({}, row, {
          label: 'V' + row.versionNo,
          statusLabel: util.statusLabel(row.status),
          statusClass: util.statusClass(row.status),
        });
      });
      var outputUnits = that.buildOutputUnits(results[2]);
      return that.resolveComponentNames(detail.components || []).then(function (components) {
        var selectedUnit = detail.version && detail.version.outputUnitCode ? detail.version.outputUnitCode : that.data.baseUnit;
        if (outputUnits.indexOf(selectedUnit) < 0) outputUnits.push(selectedUnit);
        that.setData({
          loading: false,
          recipe: detail.recipe,
          version: detail.version,
          versions: versions,
          components: components,
          outputUnits: outputUnits,
          outputUnitIndex: Math.max(0, outputUnits.indexOf(selectedUnit)),
          theoreticalOutputQuantity: detail.version && detail.version.theoreticalOutputQuantity != null ? String(detail.version.theoreticalOutputQuantity) : '',
          shelfLifeMinutes: detail.version && detail.version.shelfLifeMinutesSnapshot != null ? String(detail.version.shelfLifeMinutesSnapshot) : that.data.shelfLifeMinutes,
          isDraft: !!detail.version && detail.version.status === 'DRAFT',
          dirty: false,
        });
      });
    }).catch(function (error) {
      that.setData({ loading: false });
      util.showError(error);
    });
  },

  resolveComponentNames: function (rows) {
    return Promise.all((rows || []).map(function (row) {
      return api.getRawGoods(row.rawGoodsId).then(function (goods) {
        return Object.assign({}, row, {
          rawGoodsName: goods && goods.gbDgGoodsName ? goods.gbDgGoodsName : ('原料 #' + row.rawGoodsId),
          inputQuantityText: row.inputQuantity == null ? '' : String(row.inputQuantity),
          inputUnitText: row.inputUnitCode || 'G',
        });
      });
    }));
  },

  selectVersion: function (event) {
    if (this.data.dirty) {
      wx.showToast({ title: '请先保存或重新进入页面', icon: 'none' });
      return;
    }
    this.loadRecipe(Number(event.currentTarget.dataset.id));
  },

  onHeaderInput: function (event) {
    var field = event.currentTarget.dataset.field;
    this.setData({ [field]: event.detail.value, dirty: true });
  },

  onOutputUnitChange: function (event) {
    this.setData({ outputUnitIndex: Number(event.detail.value || 0), dirty: true });
  },

  onComponentInput: function (event) {
    var index = Number(event.currentTarget.dataset.index);
    var field = event.currentTarget.dataset.field;
    this.setData({ ['components[' + index + '].' + field]: event.detail.value, dirty: true });
  },

  deleteComponent: function (event) {
    var index = Number(event.currentTarget.dataset.index);
    var rows = this.data.components.slice();
    rows.splice(index, 1);
    this.setData({ components: rows, dirty: true });
  },

  openGoodsPicker: function () {
    this.setData({ showGoodsPicker: true, goodsKeyword: '', goodsResults: [] });
  },
  closeGoodsPicker: function () { this.setData({ showGoodsPicker: false }); },
  onGoodsKeyword: function (event) { this.setData({ goodsKeyword: event.detail.value || '' }); },

  searchGoods: function () {
    var keyword = String(this.data.goodsKeyword || '').trim();
    if (!keyword) {
      wx.showToast({ title: '请输入原料名称', icon: 'none' });
      return;
    }
    var that = this;
    this.setData({ goodsLoading: true });
    api.searchRawGoods(this.identity.distributerId, keyword).then(function (rows) {
      that.setData({ goodsLoading: false, goodsResults: rows || [] });
    }).catch(function (error) {
      that.setData({ goodsLoading: false });
      util.showError(error);
    });
  },

  chooseGoods: function (event) {
    var goods = event.currentTarget.dataset.item;
    var duplicate = this.data.components.some(function (row) {
      return String(row.rawGoodsId) === String(goods.gbDistributerGoodsId);
    });
    if (duplicate) {
      wx.showToast({ title: '该原料已在配方中', icon: 'none' });
      return;
    }
    var rows = this.data.components.slice();
    rows.push({
      componentKind: 'RAW_GOODS',
      rawGoodsId: goods.gbDistributerGoodsId,
      rawGoodsName: goods.gbDgGoodsName || ('原料 #' + goods.gbDistributerGoodsId),
      inputQuantityText: '',
      inputUnitText: 'G',
    });
    this.setData({ components: rows, showGoodsPicker: false, dirty: true });
  },

  saveDraft: function () {
    if (!this.data.isDraft || this.data.submitting) return;
    var outputQty = Number(this.data.theoreticalOutputQuantity);
    var shelfLife = Number(this.data.shelfLifeMinutes);
    if (!(outputQty > 0) || !(shelfLife > 0) || !this.data.components.length) {
      wx.showToast({ title: '请填写理论产量、保质期和原料', icon: 'none' });
      return;
    }
    var invalid = this.data.components.some(function (row) {
      return !(Number(row.inputQuantityText) > 0) || !String(row.inputUnitText || '').trim();
    });
    if (invalid) {
      wx.showToast({ title: '请完整填写每种原料数量和单位', icon: 'none' });
      return;
    }
    var body = {
      distributerId: this.identity.distributerId,
      recipeRowVersion: this.data.recipe.rowVersion,
      versionRowVersion: this.data.version.rowVersion,
      theoreticalOutputQuantity: outputQty,
      outputUnitCode: this.data.outputUnits[this.data.outputUnitIndex],
      shelfLifeMinutes: shelfLife,
      components: this.data.components.map(function (row) {
        return {
          componentKind: 'RAW_GOODS',
          rawGoodsId: row.rawGoodsId,
          inputQuantity: Number(row.inputQuantityText),
          inputUnitCode: String(row.inputUnitText).trim().toUpperCase(),
        };
      }),
      operatorId: this.identity.operatorId,
    };
    var that = this;
    this.setData({ submitting: true });
    return api.saveIntermediateDraft(this.data.recipeId, this.data.version.id, body).then(function () {
      that.setData({ submitting: false });
      wx.showToast({ title: '草稿已保存', icon: 'success' });
      return that.loadRecipe(that.data.version.id);
    }).catch(function (error) {
      that.setData({ submitting: false });
      util.showError(error);
    });
  },

  versionAction: function (event) {
    var action = event.currentTarget.dataset.action;
    if (this.data.submitting) return;
    if (action === 'publish' && this.data.dirty) {
      wx.showToast({ title: '请先保存草稿再发布', icon: 'none' });
      return;
    }
    var copy = action === 'copy';
    var content = copy
      ? '将从当前版本复制一份新的可编辑草稿。'
      : (action === 'publish' ? '发布后本版本只读，确认发布？' : '退役后不能用于新生产批次，确认退役？');
    var that = this;
    util.confirm(content).then(function (confirmed) {
      if (!confirmed) return;
      that.setData({ submitting: true });
      return api.intermediateVersionAction(that.data.recipeId, that.data.version.id, action, {
        distributerId: that.identity.distributerId,
        recipeRowVersion: that.data.recipe.rowVersion,
        versionRowVersion: that.data.version.rowVersion,
        operatorId: that.identity.operatorId,
      }).then(function (result) {
        that.setData({ submitting: false });
        wx.showToast({ title: copy ? '已复制草稿' : '操作成功', icon: 'success' });
        return that.loadRecipe(result.version.id);
      }).catch(function (error) {
        that.setData({ submitting: false });
        util.showError(error);
      });
    });
  },

  noop: function () {},
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
