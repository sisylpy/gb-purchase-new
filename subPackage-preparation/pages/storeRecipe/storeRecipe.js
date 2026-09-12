var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');
var stockUnit = require('../../../lib/stockUnitConvert');

var unitLabels = { G: '克', KG: '千克', JIN: '斤', ML: '毫升', L: '升', EA: '个' };
var unitDefinitions = {
  G: { dimension: 'WEIGHT', factor: 1 },
  KG: { dimension: 'WEIGHT', factor: 1000 },
  JIN: { dimension: 'WEIGHT', factor: 500 },
  ML: { dimension: 'VOLUME', factor: 1 },
  L: { dimension: 'VOLUME', factor: 1000 },
  EA: { dimension: 'COUNT', factor: 1 },
};
var modalUnitLabels = { G: '克', KG: '千克', JIN: '斤', ML: '毫升', L: '升', EA: '个' };

function toP1Unit(unit) {
  var value = String(unit || '').trim();
  var aliases = {
    g: 'G', '克': 'G', kg: 'KG', '公斤': 'KG', '千克': 'KG', '斤': 'JIN',
    ml: 'ML', '毫升': 'ML', l: 'L', L: 'L', '升': 'L',
    '个': 'EA', '只': 'EA', '张': 'EA', '枚': 'EA', '条': 'EA', '根': 'EA', '颗': 'EA',
  };
  return aliases[value] || value.toUpperCase();
}

function trimNumber(value, digits) {
  var number = Number(value);
  if (!isFinite(number)) return '—';
  var text = number.toFixed(digits == null ? 2 : digits);
  return text.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

function packLabel(goods) {
  var standardWeight = String((goods && goods.gbDgGoodsStandardWeight) || '').trim();
  var packUnit = String((goods && goods.gbDgGoodsStandardname) || '').trim();
  if (standardWeight && standardWeight !== 'null' && packUnit) return standardWeight + '/' + packUnit;
  return packUnit ? '1' + packUnit : '采购包装未设置';
}

function goodsPriceContext(goods) {
  var averagePrice = Number(goods && goods.gbDgGoodsAveragePrice);
  var referencePrice = Number(goods && goods.gbDgGoodsPrice);
  var unit = String((goods && goods.gbDgGoodsStandardname) || '').trim();
  var price = averagePrice > 0 ? averagePrice : (referencePrice > 0 ? referencePrice : 0);
  var title = averagePrice > 0 ? '近期采购均价' : (referencePrice > 0 ? '商品参考价' : '采购单价');
  return {
    price: price,
    title: title,
    referenceOnly: !(averagePrice > 0) && referencePrice > 0,
    text: price > 0 ? ('¥' + price.toFixed(2) + (unit ? '/' + unit : '')) : '暂无单价',
  };
}

function minUnitOptionsForGoods(goods) {
  var packUnit = String((goods && goods.gbDgGoodsStandardname) || '').trim();
  var family = stockUnit.detectUnitFamily(packUnit, goods || {});
  var options = family === 'volume' ? ['ml'] : (family === 'count' ? ['个', '只', '张'] : ['g', '斤']);
  var suggested = stockUnit.suggestMinUnit(packUnit, stockUnit.rawPackSpecAmount(goods || {}), goods || {});
  var index = options.indexOf(suggested);
  if (index > 0) {
    options.splice(index, 1);
    options.unshift(suggested);
  }
  return options;
}

function joinImageUrl(server, path) {
  var value = String(path || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return String(server || '').replace(/\/$/, '') + '/' + value.replace(/^\//, '');
}

function goodsImageUrl(server, goods) {
  var row = goods || {};
  return joinImageUrl(server, row.gbDgNxFatherImg || row.gbDgNxFatherImgLarge
    || row.gbDgGoodsFile || row.gbDgGoodsFileImg);
}

Page({
  data: {
    navBarHeight: 0,
    productId: null,
    loading: true,
    submitting: false,
    server: '',
    productName: '',
    usageUnitCode: '',
    usageUnitLabel: '',
    standardOutputQuantity: '1',
    components: [],
    units: ['G', 'KG', 'JIN', 'ML', 'L', 'EA'],
    unitNames: ['克', '千克', '斤', '毫升', '升', '个'],
    showGoodsPicker: false,
    goodsKeyword: '',
    goodsLoading: false,
    goodsSearchActive: false,
    goodsResults: [],
    selectedGoods: null,
    selectedQuantity: '',
    selectedUnitIndex: 0,
    selectedUnitCodes: ['G'],
    selectedUnitNames: ['克'],
    selectedImageUrl: '',
    selectedPackLabel: '—',
    selectedPackUnit: '',
    selectedPackPriceTitle: '采购单价',
    selectedPackPriceLabel: '暂无单价',
    selectedPriceReferenceOnly: false,
    selectedPackQtyInMin: '',
    selectedConversionPlaceholder: '如500',
    selectedConversionRequired: false,
    selectedGoodsSpecMissing: false,
    selectedBulkWeightPack: false,
    selectedPackEquivalentText: '',
    selectedCostText: '—',
    selectedUsesPerPack: '—',
    selectedDemoText: '',
    selectedQuickTags: [],
    hasUnsavedChanges: false,
    totalInputText: '—',
    inputOutputRateText: '—',
    inputOutputRateValue: null,
    inputOutputWarning: false,
  },

  onLoad: function (options) {
    this.setData({
      productId: Number(options.productId),
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      server: app.globalData.server || '',
    });
    this.loadRecipe();
  },

  onShow: function () {
    if (this.pendingSpecificationGoodsId) this.refreshSelectedGoodsSpecification();
  },

  loadRecipe: function () {
    var that = this;
    this.setData({ loading: true });
    api.getStoreRecipe(this.data.productId).then(function (row) {
      var components = (row.components || []).map(function (line) {
        return Object.assign({}, line, {
          quantityText: line.inputQuantity == null ? '' : String(line.inputQuantity),
          unitIndex: Math.max(0, that.data.units.indexOf(line.inputUnitCode || 'G')),
          unitLabel: unitLabels[line.inputUnitCode] || line.inputUnitCode || '',
          ratioText: '—',
          specText: '',
          imageUrl: '',
        });
      });
      var decoratedComponents = components.map(function (line) {
        var goods = line.rawGoods || {};
        return Object.assign({}, line, {
          imageUrl: goodsImageUrl(that.data.server, goods),
          specText: packLabel(goods),
        });
      });
      that.setData({
        loading: false,
        productName: row.productName || '',
        usageUnitCode: row.usageUnitCode || '',
        usageUnitLabel: unitLabels[row.usageUnitCode] || row.usageUnitCode || '—',
        components: decoratedComponents,
        standardOutputQuantity: row.standardOutputQuantity != null
          ? String(row.standardOutputQuantity) : '1',
      }, function () {
        that.updateRecipeSummary();
      });
    }).catch(function (error) { that.setData({ loading: false }); util.showError(error); });
  },

  onQuantityInput: function (event) {
    var index = Number(event.currentTarget.dataset.index);
    this.setData({
      ['components[' + index + '].quantityText']: event.detail.value,
      hasUnsavedChanges: true,
    }, this.updateRecipeSummary.bind(this));
  },

  onUnitChange: function (event) {
    var index = Number(event.currentTarget.dataset.index);
    this.setData({
      ['components[' + index + '].unitIndex']: Number(event.detail.value || 0),
      hasUnsavedChanges: true,
    }, this.updateRecipeSummary.bind(this));
  },

  onStandardOutputInput: function (event) {
    this.setData({ standardOutputQuantity: event.detail.value, hasUnsavedChanges: true }, this.updateRecipeSummary.bind(this));
  },

  deleteComponent: function (event) {
    var rows = this.data.components.slice();
    rows.splice(Number(event.currentTarget.dataset.index), 1);
    this.setData({ components: rows, hasUnsavedChanges: true }, this.updateRecipeSummary.bind(this));
  },

  stepComponentQuantity: function (event) {
    var index = Number(event.currentTarget.dataset.index);
    var direction = Number(event.currentTarget.dataset.direction || 0);
    var line = this.data.components[index];
    if (!line) return;
    var unit = this.data.units[line.unitIndex];
    var step = unit === 'EA' ? 1 : ((unit === 'KG' || unit === 'JIN' || unit === 'L') ? 0.1 : 5);
    var value = Math.max(0, (Number(line.quantityText) || 0) + direction * step);
    this.setData({
      ['components[' + index + '].quantityText']: String(Number(value.toFixed(3))),
      hasUnsavedChanges: true,
    }, this.updateRecipeSummary.bind(this));
  },

  updateRecipeSummary: function () {
    var outputUnit = this.data.usageUnitCode;
    var outputDefinition = unitDefinitions[outputUnit];
    var outputQuantity = Number(this.data.standardOutputQuantity);
    var outputBase = outputDefinition && outputQuantity > 0
      ? outputQuantity * outputDefinition.factor : 0;
    var totalBase = 0;
    var comparable = outputBase > 0;
    var components = (this.data.components || []).map(function (line) {
      var unit = this.data.units[line.unitIndex];
      var definition = unitDefinitions[unit];
      var quantity = Number(line.quantityText);
      if (!outputDefinition || !definition || definition.dimension !== outputDefinition.dimension || !(quantity >= 0)) {
        comparable = false;
        return Object.assign({}, line, { ratioText: '—' });
      }
      var componentBase = quantity * definition.factor;
      totalBase += componentBase;
      return Object.assign({}, line, {
        ratioText: outputBase > 0 ? (componentBase / outputBase * 100).toFixed(1) + '%' : '—',
      });
    }, this);
    if (!comparable) {
      this.setData({
        components: components,
        totalInputText: '—',
        inputOutputRateText: '—',
        inputOutputRateValue: null,
        inputOutputWarning: false,
      });
      return;
    }
    var totalInOutputUnit = totalBase / outputDefinition.factor;
    var rate = outputQuantity > 0 ? totalInOutputUnit / outputQuantity * 100 : null;
    this.setData({
      components: components,
      totalInputText: util.formatNumber(totalInOutputUnit, 3) + ' ' + this.data.usageUnitLabel,
      inputOutputRateText: rate == null ? '—' : rate.toFixed(0) + '%',
      inputOutputRateValue: rate,
      inputOutputWarning: rate > 100,
    });
  },

  openGoodsPicker: function () {
    if (this.goodsSearchTimer) clearTimeout(this.goodsSearchTimer);
    this.goodsSearchSequence = (this.goodsSearchSequence || 0) + 1;
    this.setData({
      showGoodsPicker: true,
      goodsKeyword: '',
      goodsLoading: false,
      goodsSearchActive: false,
      goodsResults: [],
      selectedGoods: null,
      selectedQuantity: '',
      selectedUnitIndex: 0,
      selectedPackQtyInMin: '',
    });
  },

  closeGoodsPicker: function () {
    this.dismissKeyboard();
    if (this.goodsSearchTimer) clearTimeout(this.goodsSearchTimer);
    this.goodsSearchSequence = (this.goodsSearchSequence || 0) + 1;
    this.setData({ showGoodsPicker: false, goodsKeyword: '', goodsLoading: false, goodsSearchActive: false, goodsResults: [], selectedGoods: null });
  },
  noop: function () {},
  dismissKeyboard: function () {
    if (typeof wx.hideKeyboard !== 'function') return;
    try {
      wx.hideKeyboard({ fail: function () {} });
    } catch (error) {}
  },
  onGoodsKeyword: function (event) {
    var keyword = event.detail.value || '';
    var that = this;
    if (this.goodsSearchTimer) clearTimeout(this.goodsSearchTimer);
    var requestSequence = (this.goodsSearchSequence || 0) + 1;
    this.goodsSearchSequence = requestSequence;
    var hasKeyword = !!String(keyword).trim();
    this.setData({ goodsKeyword: keyword, goodsLoading: hasKeyword, goodsSearchActive: hasKeyword, goodsResults: [] });
    if (!hasKeyword) return;
    this.goodsSearchTimer = setTimeout(function () { that.searchGoods(keyword, requestSequence); }, 260);
  },

  clearGoodsKeyword: function () {
    if (this.goodsSearchTimer) clearTimeout(this.goodsSearchTimer);
    this.goodsSearchSequence = (this.goodsSearchSequence || 0) + 1;
    this.setData({ goodsKeyword: '', goodsLoading: false, goodsSearchActive: false, goodsResults: [] });
  },

  searchGoods: function (input, requestSequence) {
    if (typeof input !== 'string') this.dismissKeyboard();
    var keyword = typeof input === 'string'
      ? String(input).trim()
      : String(this.data.goodsKeyword || '').trim();
    if (!keyword) {
      this.setData({ goodsResults: [], goodsLoading: false });
      return;
    }
    if (typeof requestSequence !== 'number') {
      requestSequence = (this.goodsSearchSequence || 0) + 1;
      this.goodsSearchSequence = requestSequence;
    }
    var that = this;
    var excludeIds = (this.data.components || []).map(function (line) { return line.rawGoodsId; });
    this.setData({ goodsLoading: true });
    api.searchStoreIngredientOptions(this.data.productId, keyword, excludeIds).then(function (rows) {
      var currentIds = {};
      (that.data.components || []).forEach(function (line) { currentIds[String(line.rawGoodsId)] = true; });
      rows = (rows || []).filter(function (row) {
        return !currentIds[String(row.gbDistributerGoodsId)];
      }).map(function (row) {
        var priceContext = goodsPriceContext(row);
        return Object.assign({}, row, {
          specText: packLabel(row),
          imageUrl: goodsImageUrl(that.data.server, row),
          searchPriceTitle: priceContext.title,
          searchPriceText: priceContext.text,
        });
      });
      if (!that.data.showGoodsPicker
        || that.goodsSearchSequence !== requestSequence
        || String(that.data.goodsKeyword || '').trim() !== keyword) return;
      that.setData({ goodsLoading: false, goodsSearchActive: true, goodsResults: rows });
    }).catch(function (error) {
      if (that.goodsSearchSequence !== requestSequence) return;
      that.setData({ goodsLoading: false });
      util.showError(error);
    });
  },

  chooseGoods: function (event) {
    var goods = event.currentTarget.dataset.item;
    this.dismissKeyboard();
    if (this.data.components.some(function (line) { return String(line.rawGoodsId) === String(goods.gbDistributerGoodsId); })) {
      wx.showToast({ title: '该原料已经添加', icon: 'none' });
      return;
    }
    var unitNames = minUnitOptionsForGoods(goods);
    var unitCodes = unitNames.map(toP1Unit);
    this.setData({
      selectedGoods: goods,
      selectedQuantity: unitNames[0] === '斤' ? '0.2' : (unitCodes[0] === 'EA' ? '1' : '5'),
      selectedUnitIndex: 0,
      selectedUnitCodes: unitCodes,
      selectedUnitNames: unitNames,
      selectedImageUrl: goodsImageUrl(this.data.server, goods),
      selectedPackLabel: packLabel(goods),
      goodsKeyword: goods.gbDgGoodsName || '',
      goodsSearchActive: false,
      goodsResults: [],
    }, this.recalculateSelectedGoods.bind(this));
  },

  onSelectedQuantity: function (event) {
    this.setData({ selectedQuantity: event.detail.value }, this.recalculateSelectedGoods.bind(this));
  },
  onSelectedUnit: function (event) {
    this.dismissKeyboard();
    this.setData({
      selectedUnitIndex: Number(event.detail.value || 0),
      selectedPackQtyInMin: '',
    }, this.recalculateSelectedGoods.bind(this));
  },
  onSelectedConversionInput: function (event) {
    this.setData({ selectedPackQtyInMin: event.detail.value }, this.recalculateSelectedGoods.bind(this));
  },
  onSelectedQuickQuantity: function (event) {
    this.dismissKeyboard();
    this.setData({ selectedQuantity: String(event.currentTarget.dataset.value) }, this.recalculateSelectedGoods.bind(this));
  },
  stepSelectedQuantity: function (event) {
    this.dismissKeyboard();
    var direction = Number(event.currentTarget.dataset.direction || 0);
    var unit = this.data.selectedUnitCodes[this.data.selectedUnitIndex] || 'G';
    var step = unit === 'EA' ? 1 : ((unit === 'KG' || unit === 'JIN' || unit === 'L') ? 0.1 : 5);
    var value = Math.max(0, (Number(this.data.selectedQuantity) || 0) + direction * step);
    this.setData({ selectedQuantity: String(Number(value.toFixed(3))) }, this.recalculateSelectedGoods.bind(this));
  },

  recalculateSelectedGoods: function () {
    var goods = this.data.selectedGoods;
    if (!goods) return;
    var code = this.data.selectedUnitCodes[this.data.selectedUnitIndex] || 'G';
    var unitLabel = this.data.selectedUnitNames[this.data.selectedUnitIndex] || modalUnitLabels[code] || code;
    var quantity = Number(this.data.selectedQuantity) || 0;
    var packUnit = String(goods.gbDgGoodsStandardname || '').trim();
    var defaultPackQty = unitLabel === packUnit
      ? 1 : stockUnit.resolvePackQtyInMin(packUnit, unitLabel, goods);
    var manualPackQty = Number(this.data.selectedPackQtyInMin);
    var packQty = manualPackQty > 0 ? manualPackQty : defaultPackQty;
    var priceContext = goodsPriceContext(goods);
    var conversionRequired = !!packUnit && unitLabel !== packUnit && !(packQty > 0);
    var cost = 0;
    if (quantity > 0 && priceContext.price > 0) {
      cost = unitLabel === packUnit ? quantity * priceContext.price
        : (packQty > 0 ? quantity / packQty * priceContext.price : 0);
    }
    var presets = unitLabel === '斤' ? [0.1, 0.2, 0.5]
      : (code === 'EA' ? [1, 2, 3] : [5, 10, 15]);
    var quickTags = presets.map(function (value) {
      return {
        value: value,
        label: trimNumber(value, 2) + unitLabel,
        active: Number(value) === quantity,
      };
    });
    var usesPerPack = quantity > 0 && packQty > 0 ? packQty / quantity : 0;
    var packEquivalent = quantity > 0 && packQty > 0 ? quantity / packQty : 0;
    this.setData({
      selectedQuickTags: quickTags,
      selectedPackUnit: packUnit,
      selectedPackLabel: packLabel(goods),
      selectedPackPriceTitle: priceContext.title,
      selectedPackPriceLabel: priceContext.text,
      selectedPriceReferenceOnly: priceContext.referenceOnly,
      selectedPackQtyInMin: manualPackQty > 0 ? this.data.selectedPackQtyInMin : (defaultPackQty > 0 ? trimNumber(defaultPackQty, 4) : ''),
      selectedConversionPlaceholder: code === 'EA' ? '如8' : '如500',
      selectedConversionRequired: conversionRequired,
      selectedGoodsSpecMissing: conversionRequired,
      selectedBulkWeightPack: unitLabel === '斤',
      selectedPackEquivalentText: packEquivalent > 0 ? ('每次约 ' + trimNumber(packEquivalent, 4) + packUnit) : '',
      selectedCostText: cost > 0 ? cost.toFixed(2) : '—',
      selectedUsesPerPack: usesPerPack > 0 ? trimNumber(usesPerPack, 1) : '—',
      selectedDemoText: '按当前标准投料量，每配制 1 次约消耗 ' + trimNumber(quantity, 3) + unitLabel
        + '，参考成本 ¥' + (cost > 0 ? cost.toFixed(2) : '—'),
    });
  },

  toEditSelectedGoodsSpecification: function () {
    var goods = this.data.selectedGoods;
    var goodsId = goods && goods.gbDistributerGoodsId;
    if (!goodsId) return;
    this.dismissKeyboard();
    this.pendingSpecificationGoodsId = Number(goodsId);
    wx.setStorageSync('disGoods', goods);
    wx.navigateTo({
      url: '/subPackage-group/pages/goods/disGoodsDetail/disGoodsDetail?id=' + goodsId + '&specOnly=1',
      fail: function () {
        this.pendingSpecificationGoodsId = null;
        wx.showToast({ title: '商品详情打开失败', icon: 'none' });
      }.bind(this),
    });
  },

  refreshSelectedGoodsSpecification: function () {
    var goodsId = this.pendingSpecificationGoodsId;
    this.pendingSpecificationGoodsId = null;
    var goods = wx.getStorageSync('disGoods');
    if (!goods || Number(goods.gbDistributerGoodsId) !== Number(goodsId)) return;
    var unitNames = minUnitOptionsForGoods(goods);
    this.setData({
      selectedGoods: goods,
      selectedImageUrl: goodsImageUrl(this.data.server, goods),
      selectedUnitNames: unitNames,
      selectedUnitCodes: unitNames.map(toP1Unit),
      selectedUnitIndex: 0,
      selectedPackQtyInMin: '',
    }, this.recalculateSelectedGoods.bind(this));
  },

  confirmSelectedGoods: function () {
    this.dismissKeyboard();
    var goods = this.data.selectedGoods;
    var quantity = Number(this.data.selectedQuantity);
    if (!goods) { wx.showToast({ title: '请先搜索并选择原料', icon: 'none' }); return; }
    if (!(quantity > 0)) { wx.showToast({ title: '请填写标准投料量', icon: 'none' }); return; }
    if (this.data.selectedGoodsSpecMissing) {
      wx.showToast({ title: '请点击采购包装补充商品规格', icon: 'none' });
      return;
    }
    var selectedUnitCode = this.data.selectedUnitCodes[this.data.selectedUnitIndex] || 'G';
    var rows = this.data.components.slice();
    rows.push({
      rawGoodsId: goods.gbDistributerGoodsId,
      rawGoodsName: goods.gbDgGoodsName,
      quantityText: String(quantity),
      unitIndex: Math.max(0, this.data.units.indexOf(selectedUnitCode)),
      unitLabel: unitLabels[selectedUnitCode] || selectedUnitCode,
      ratioText: '—',
      specText: packLabel(goods),
      imageUrl: goodsImageUrl(this.data.server, goods),
    });
    this.setData({ components: rows, hasUnsavedChanges: true, showGoodsPicker: false, selectedGoods: null }, this.updateRecipeSummary.bind(this));
  },

  submit: function () {
    if (this.data.submitting) return;
    if (!this.data.components.length) { wx.showToast({ title: '请至少添加一种原料', icon: 'none' }); return; }
    if (!(Number(this.data.standardOutputQuantity) > 0)) { wx.showToast({ title: '请填写标准产出量', icon: 'none' }); return; }
    var units = this.data.units;
    var invalid = this.data.components.some(function (line) { return !(Number(line.quantityText) > 0); });
    if (invalid) { wx.showToast({ title: '请填写每种原料的标准投料量', icon: 'none' }); return; }
    var that = this;
    this.setData({ submitting: true });
    api.saveStoreRecipe(this.data.productId, {
      standardOutputQuantity: Number(this.data.standardOutputQuantity),
      components: this.data.components.map(function (line) {
        return {
          rawGoodsId: line.rawGoodsId,
          inputQuantity: Number(line.quantityText),
          inputUnitCode: units[line.unitIndex],
        };
      }),
    }).then(function () {
      that.setData({ submitting: false });
      wx.showModal({
        title: '配方已保存',
        content: '菜品使用该中间料时，将按标准产出和组成原料比例自动展开计算。',
        showCancel: false,
        success: function () { wx.redirectTo({ url: '/subPackage-preparation/pages/storeProductDetail/storeProductDetail?id=' + that.data.productId }); },
      });
    }).catch(function (error) { that.setData({ submitting: false }); util.showError(error); });
  },

  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
