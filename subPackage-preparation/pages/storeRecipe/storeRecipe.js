var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');
var stockUnit = require('../../../lib/stockUnitConvert');

var unitLabels = { G: '克', KG: '千克', JIN: '斤', ML: '毫升', L: '升', EA: '个' };
var recentGoodsStorageKey = 'preparationRecentRawGoods';
var unitDefinitions = {
  G: { dimension: 'WEIGHT', factor: 1 },
  KG: { dimension: 'WEIGHT', factor: 1000 },
  JIN: { dimension: 'WEIGHT', factor: 500 },
  ML: { dimension: 'VOLUME', factor: 1 },
  L: { dimension: 'VOLUME', factor: 1000 },
  EA: { dimension: 'COUNT', factor: 1 },
};
var modalUnitLabels = { G: '克', KG: '千克', JIN: '斤', ML: '毫升', L: '升', EA: '个' };

function trimNumber(value, digits) {
  var number = Number(value);
  if (!isFinite(number)) return '—';
  var text = number.toFixed(digits == null ? 2 : digits);
  return text.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

function modalUnitCodesForGoods(goods) {
  var packUnit = String((goods && goods.gbDgGoodsStandardname) || '').trim();
  var family = stockUnit.detectUnitFamily(packUnit, goods || {});
  var codes = family === 'volume' ? ['ML', 'L'] : (family === 'count' ? ['EA'] : ['G', 'KG', 'JIN']);
  var suggested = stockUnit.suggestMinUnit(packUnit, stockUnit.rawPackSpecAmount(goods || {}), goods || {});
  var suggestedCode = suggested === 'ml' ? 'ML'
    : (suggested === '斤' ? 'JIN' : (suggested === '个' || suggested === '只' || suggested === '张' ? 'EA' : 'G'));
  if (codes.indexOf(suggestedCode) > 0) {
    codes.splice(codes.indexOf(suggestedCode), 1);
    codes.unshift(suggestedCode);
  }
  return codes;
}

function packLabel(goods) {
  var standardWeight = String((goods && goods.gbDgGoodsStandardWeight) || '').trim();
  var packUnit = String((goods && goods.gbDgGoodsStandardname) || '').trim();
  if (standardWeight && standardWeight !== 'null' && packUnit) return standardWeight + '/' + packUnit;
  return packUnit ? '1' + packUnit : '采购包装未设置';
}

function joinImageUrl(server, path) {
  var value = String(path || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return String(server || '').replace(/\/$/, '') + '/' + value.replace(/^\//, '');
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
    allGoodsResults: [],
    goodsResults: [],
    goodsTabs: [
      { key: 'RECENT', name: '最近使用' },
      { key: 'ALL', name: '全部' },
      { key: 'VEGETABLE', name: '蔬菜' },
      { key: 'MEAT', name: '肉禽蛋' },
      { key: 'SEASONING', name: '调料' },
    ],
    goodsTab: 'ALL',
    selectedGoods: null,
    selectedQuantity: '',
    selectedUnitIndex: 0,
    selectedUnitCodes: ['G'],
    selectedUnitNames: ['克'],
    selectedImageUrl: '',
    selectedPackLabel: '—',
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
          imageUrl: joinImageUrl(that.data.server, goods.gbDgNxFatherImg || goods.gbDgNxFatherImgLarge || goods.gbDgGoodsFile),
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
      allGoodsResults: [],
      goodsResults: [],
      goodsTab: 'ALL',
      selectedGoods: null,
      selectedQuantity: '',
      selectedUnitIndex: 0,
    });
  },

  closeGoodsPicker: function () {
    this.dismissKeyboard();
    if (this.goodsSearchTimer) clearTimeout(this.goodsSearchTimer);
    this.goodsSearchSequence = (this.goodsSearchSequence || 0) + 1;
    this.setData({ showGoodsPicker: false, goodsKeyword: '', goodsLoading: false, allGoodsResults: [], goodsResults: [], selectedGoods: null });
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
    this.setData({ goodsKeyword: keyword, goodsLoading: hasKeyword, allGoodsResults: [], goodsResults: [], selectedGoods: null });
    if (!hasKeyword) return;
    this.goodsSearchTimer = setTimeout(function () { that.searchGoods(keyword, requestSequence); }, 260);
  },

  clearGoodsKeyword: function () {
    if (this.goodsSearchTimer) clearTimeout(this.goodsSearchTimer);
    this.goodsSearchSequence = (this.goodsSearchSequence || 0) + 1;
    this.setData({ goodsKeyword: '', goodsLoading: false, allGoodsResults: [], goodsResults: [], selectedGoods: null });
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
        return Object.assign({}, row, {
          specText: packLabel(row),
          goodsCategory: that.classifyGoods(row),
        });
      });
      if (!that.data.showGoodsPicker
        || that.goodsSearchSequence !== requestSequence
        || String(that.data.goodsKeyword || '').trim() !== keyword) return;
      that.setData({ goodsLoading: false, allGoodsResults: rows, goodsResults: rows });
    }).catch(function (error) {
      if (that.goodsSearchSequence !== requestSequence) return;
      that.setData({ goodsLoading: false });
      util.showError(error);
    });
  },

  classifyGoods: function (row) {
    var name = String(row.gbDgGoodsName || '');
    if (/油|盐|酱|醋|糖|味精|料酒|香料|花椒|胡椒|粉|汁|耗油|蚝油/.test(name)) return 'SEASONING';
    if (/肉|鸡|鸭|鹅|鱼|虾|蟹|蛋|排骨|牛|羊|猪/.test(name)) return 'MEAT';
    if (/菜|葱|姜|蒜|笋|藕|瓜|椒|豆芽|菌|菇|萝卜|番茄|土豆|香菜/.test(name)) return 'VEGETABLE';
    return 'OTHER';
  },

  applyGoodsFilter: function () {
    var tab = this.data.goodsTab;
    var rows = this.data.allGoodsResults || [];
    if (tab === 'RECENT') {
      var recentIds = wx.getStorageSync(recentGoodsStorageKey) || [];
      if (!Array.isArray(recentIds)) recentIds = [];
      rows = rows.filter(function (row) {
        return recentIds.indexOf(String(row.gbDistributerGoodsId)) >= 0;
      }).sort(function (left, right) {
        return recentIds.indexOf(String(left.gbDistributerGoodsId)) - recentIds.indexOf(String(right.gbDistributerGoodsId));
      });
    } else if (tab !== 'ALL') {
      rows = rows.filter(function (row) { return row.goodsCategory === tab; });
    }
    this.setData({ goodsResults: rows });
  },

  onGoodsTabTap: function (event) {
    var that = this;
    this.setData({ goodsTab: event.currentTarget.dataset.key }, function () { that.applyGoodsFilter(); });
  },

  chooseGoods: function (event) {
    var goods = event.currentTarget.dataset.item;
    this.dismissKeyboard();
    if (this.data.components.some(function (line) { return String(line.rawGoodsId) === String(goods.gbDistributerGoodsId); })) {
      wx.showToast({ title: '该原料已经添加', icon: 'none' });
      return;
    }
    var unitCodes = modalUnitCodesForGoods(goods);
    var unitNames = unitCodes.map(function (code) { return modalUnitLabels[code]; });
    this.setData({
      selectedGoods: goods,
      selectedQuantity: unitCodes[0] === 'JIN' ? '0.2' : (unitCodes[0] === 'EA' ? '1' : '5'),
      selectedUnitIndex: 0,
      selectedUnitCodes: unitCodes,
      selectedUnitNames: unitNames,
      selectedImageUrl: joinImageUrl(this.data.server, goods.gbDgNxFatherImg || goods.gbDgNxFatherImgLarge || goods.gbDgGoodsFile),
      selectedPackLabel: packLabel(goods),
      goodsResults: [],
    }, this.recalculateSelectedGoods.bind(this));
  },

  clearSelectedGoods: function () {
    this.setData({
      selectedGoods: null,
      selectedQuantity: '',
      selectedQuickTags: [],
      goodsKeyword: '',
      goodsLoading: false,
      allGoodsResults: [],
      goodsResults: [],
    });
  },
  onSelectedQuantity: function (event) {
    this.setData({ selectedQuantity: event.detail.value }, this.recalculateSelectedGoods.bind(this));
  },
  onSelectedUnit: function (event) {
    this.dismissKeyboard();
    this.setData({ selectedUnitIndex: Number(event.detail.value || 0) }, this.recalculateSelectedGoods.bind(this));
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
    var unitLabel = modalUnitLabels[code] || code;
    var quantity = Number(this.data.selectedQuantity) || 0;
    var presets = code === 'JIN' ? [0.1, 0.2, 0.5]
      : ((code === 'KG' || code === 'L') ? [0.1, 0.5, 1] : (code === 'EA' ? [1, 2, 3] : [5, 10, 15]));
    var quickTags = presets.map(function (value) {
      return {
        value: value,
        label: trimNumber(value, 2) + unitLabel,
        active: Number(value) === quantity,
      };
    });
    this.setData({ selectedQuickTags: quickTags });
  },

  confirmSelectedGoods: function () {
    this.dismissKeyboard();
    var goods = this.data.selectedGoods;
    var quantity = Number(this.data.selectedQuantity);
    if (!goods) { wx.showToast({ title: '请先搜索并选择原料', icon: 'none' }); return; }
    if (!(quantity > 0)) { wx.showToast({ title: '请填写标准投料量', icon: 'none' }); return; }
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
      imageUrl: joinImageUrl(this.data.server, goods.gbDgNxFatherImg || goods.gbDgNxFatherImgLarge || goods.gbDgGoodsFile),
    });
    var recentIds = wx.getStorageSync(recentGoodsStorageKey) || [];
    if (!Array.isArray(recentIds)) recentIds = [];
    var goodsId = String(goods.gbDistributerGoodsId);
    recentIds = recentIds.filter(function (id) { return String(id) !== goodsId; });
    recentIds.unshift(goodsId);
    wx.setStorageSync(recentGoodsStorageKey, recentIds.slice(0, 20));
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
