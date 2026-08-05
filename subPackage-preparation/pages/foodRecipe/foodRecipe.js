var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');

var STANDARD_UNITS = ['G', 'KG', 'JIN', 'ML', 'L', 'EA'];
var MIGRATION_CACHE_PREFIX = 'preparationFoodRecipeMigration:';

function unique(values) {
  var result = [];
  (values || []).forEach(function (value) {
    var text = String(value || '').trim().toUpperCase();
    if (text && result.indexOf(text) < 0) result.push(text);
  });
  return result;
}

function normalizeLegacyUnit(value) {
  var unit = String(value || '').trim();
  var lower = unit.toLowerCase();
  var aliases = {
    g: 'G',
    '克': 'G',
    kg: 'KG',
    '公斤': 'KG',
    '千克': 'KG',
    '斤': 'JIN',
    ml: 'ML',
    '毫升': 'ML',
    l: 'L',
    '升': 'L',
    '个': 'EA',
    '只': 'EA',
    '枚': 'EA',
    '颗': 'EA',
    '张': 'EA',
    '条': 'EA',
    '根': 'EA',
  };
  return aliases[lower] || aliases[unit] || unit.toUpperCase();
}

function unitsForDimension(dimension, extraUnits) {
  var standard = dimension === 'VOLUME'
    ? ['ML', 'L']
    : (dimension === 'COUNT' ? ['EA'] : ['G', 'KG', 'JIN']);
  return unique(standard.concat(extraUnits || []));
}

function legacyLineToComponent(row) {
  var portionAmount = Number(row.gbDfgPortionAmount);
  var hasPortion = portionAmount > 0 && row.gbDfgPortionUnit;
  var quantity = hasPortion ? portionAmount : Number(row.gbDfgGoodsAmount);
  var unit = normalizeLegacyUnit(
    hasPortion ? row.gbDfgPortionUnit : row.gbDfgGoodsStandardname
  );
  var goodsId = Number(row.gbDfgDisGoodsId);
  return {
    _key: 'RAW_GOODS:' + goodsId,
    itemKind: 'RAW_GOODS',
    rawGoodsId: goodsId,
    intermediateProductId: null,
    displayName: row.gbDfgGoodsName || ('原料 #' + goodsId),
    quantityText: quantity > 0 ? String(quantity) : '',
    inputUnitCode: unit,
    unitOptions: unique([unit].concat(STANDARD_UNITS)),
    unitIndex: 0,
    fromLegacy: true,
  };
}

Page({
  data: {
    navBarHeight: 0,
    foodId: null,
    foodName: '',
    recipeModel: 'LEGACY',
    foodRowVersion: 0,
    loading: true,
    submitting: false,
    error: '',
    recipe: null,
    version: null,
    versions: [],
    components: [],
    dirty: false,
    migrationMode: false,
    legacyRawCount: 0,
    products: [],
    filteredProducts: [],
    productKeyword: '',
    showProductPicker: false,
    showGoodsPicker: false,
    goodsKeyword: '',
    goodsLoading: false,
    goodsResults: [],
  },

  onLoad: function (options) {
    this.identity = util.getIdentity();
    this.pendingPicker = options.openPicker || '';
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      foodId: Number(options.foodId),
    });
    this.loadPage();
  },

  loadPage: function () {
    var that = this;
    if (!(this.data.foodId > 0)) {
      this.setData({ loading: false, error: '缺少菜品信息，无法维护配方。' });
      return Promise.resolve();
    }
    if (!this.identity.distributerId || !this.identity.operatorId) {
      this.setData({ loading: false, error: '当前登录身份不完整，无法维护菜品配方。' });
      return Promise.resolve();
    }
    this.setData({ loading: true, error: '' });
    return Promise.all([
      api.getFoodDetail(this.data.foodId),
      this.loadProducts(),
    ]).then(function (results) {
      var food = results[0] || {};
      var model = food.gbDfRecipeModel || 'LEGACY';
      that.setData({
        foodName: food.gbDfFoodName || '菜品配方',
        recipeModel: model,
        foodRowVersion: Number(food.gbDfRecipeRowVersion || 0),
      });
      if (model === 'VERSIONED') return that.loadVersionedRecipe();
      return that.loadLegacyRecipe();
    }).catch(function (error) {
      that.setData({ loading: false, error: error.message || '菜品配方加载失败' });
      util.showError(error);
    });
  },

  loadProducts: function () {
    var that = this;
    return api.listProducts(this.identity.distributerId, 'ENABLED').then(function (rows) {
      return Promise.all((rows || []).map(function (row) {
        return api.listPublishedRecipeVersions(row.id, that.identity.distributerId)
          .then(function (versions) {
            return Object.assign({}, row, {
              publishedVersions: versions || [],
              eligible: !!(versions && versions.length),
              recipeStatusText: versions && versions.length ? '配方已发布' : '配方未发布',
            });
          })
          .catch(function () {
            return Object.assign({}, row, {
              publishedVersions: [],
              eligible: false,
              recipeStatusText: '配方状态读取失败',
            });
          });
      }));
    }).then(function (rows) {
      that.setData({ products: rows || [], filteredProducts: rows || [] });
      return rows || [];
    });
  },

  loadLegacyRecipe: function () {
    var that = this;
    return api.getLegacyFoodGoods(this.data.foodId, 30).then(function (rows) {
      var components = (rows || []).map(legacyLineToComponent);
      var cached = that.readMigrationCache();
      if (cached && cached.components && cached.components.length) {
        components = cached.components;
      }
      that.setData({
        loading: false,
        recipe: null,
        version: null,
        versions: [],
        components: components,
        migrationMode: true,
        legacyRawCount: (rows || []).length,
        dirty: !!cached,
      });
      that.openPendingPicker();
    });
  },

  loadVersionedRecipe: function () {
    var that = this;
    return api.getFoodRecipeByFood(this.data.foodId, this.identity.distributerId)
      .then(function (detail) {
        return api.listFoodVersions(detail.recipe.id, that.identity.distributerId)
          .then(function (versions) {
            var draft = (versions || []).find(function (row) {
              return row.status === 'DRAFT';
            });
            if (draft && (!detail.version || Number(detail.version.id) !== Number(draft.id))) {
              return api.getFoodRecipe(
                detail.recipe.id,
                that.identity.distributerId,
                draft.id
              ).then(function (draftDetail) {
                return { detail: draftDetail, versions: versions || [] };
              });
            }
            return { detail: detail, versions: versions || [] };
          });
      })
      .then(function (result) {
        var detail = result.detail || {};
        var rows = detail.components || [];
        var cached = that.readMigrationCache();
        if (!rows.length && cached && cached.components && cached.components.length) {
          rows = cached.components;
        }
        return that.decorateComponents(rows).then(function (components) {
          that.setData({
            loading: false,
            recipe: detail.recipe,
            version: detail.version,
            versions: result.versions,
            components: components,
            migrationMode: false,
            legacyRawCount: 0,
            dirty: !!cached && !(detail.components || []).length,
          });
          that.openPendingPicker();
        });
      });
  },

  decorateComponents: function (rows) {
    var that = this;
    return Promise.all((rows || []).map(function (row) {
      if (row.displayName && row.unitOptions) {
        return Promise.resolve(that.normalizeComponent(row));
      }
      if (row.itemKind === 'INTERMEDIATE_PRODUCT') {
        var known = (that.data.products || []).find(function (product) {
          return Number(product.id) === Number(row.intermediateProductId);
        });
        var productPromise = known
          ? Promise.resolve(known)
          : api.getProduct(row.intermediateProductId, that.identity.distributerId);
        return productPromise.then(function (product) {
          return api.listConversions({
            distributerId: that.identity.distributerId,
            itemKind: 'INTERMEDIATE_PRODUCT',
            intermediateProductId: product.id,
          }).catch(function () { return []; }).then(function (conversions) {
            var customUnits = (conversions || []).filter(function (conversion) {
              return Number(conversion.enabled) !== 0;
            }).map(function (conversion) {
              return conversion.unitCode;
            });
            var units = unitsForDimension(product.unitDimension, [
              row.inputUnitCode,
              product.storeLiteUsageUnitCode,
              product.baseUnitCode,
            ].concat(customUnits));
            return that.normalizeComponent(Object.assign({}, row, {
              displayName: product.productName || ('备料 #' + product.id),
              unitOptions: units,
              product: product,
            }));
          });
        }).catch(function () {
          return that.normalizeComponent(Object.assign({}, row, {
            displayName: '备料 #' + row.intermediateProductId,
            unitOptions: unique([row.inputUnitCode]),
          }));
        });
      }
      return api.getRawGoods(row.rawGoodsId).then(function (goods) {
        return that.normalizeComponent(Object.assign({}, row, {
          displayName: goods && goods.gbDgGoodsName
            ? goods.gbDgGoodsName
            : ('原料 #' + row.rawGoodsId),
          unitOptions: unique([row.inputUnitCode].concat(STANDARD_UNITS)),
          goods: goods,
        }));
      }).catch(function () {
        return that.normalizeComponent(Object.assign({}, row, {
          displayName: '原料 #' + row.rawGoodsId,
          unitOptions: unique([row.inputUnitCode].concat(STANDARD_UNITS)),
        }));
      });
    }));
  },

  normalizeComponent: function (row) {
    var kind = row.itemKind || row.componentKind || 'RAW_GOODS';
    var unit = String(row.inputUnitCode || row.inputUnitText || '').toUpperCase();
    var options = unique((row.unitOptions || []).concat([unit]));
    var quantity = row.quantityText;
    if (quantity === null || typeof quantity === 'undefined' || quantity === '') {
      quantity = row.quantityPerPortion;
    }
    return Object.assign({}, row, {
      _key: kind + ':' + (kind === 'INTERMEDIATE_PRODUCT'
        ? row.intermediateProductId
        : row.rawGoodsId),
      itemKind: kind,
      displayName: row.displayName || '配方项',
      quantityText: quantity === null || typeof quantity === 'undefined'
        ? ''
        : String(quantity),
      inputUnitCode: unit,
      unitOptions: options,
      unitIndex: Math.max(0, options.indexOf(unit)),
      kindLabel: kind === 'INTERMEDIATE_PRODUCT' ? '备料' : '配料',
      kindClass: kind === 'INTERMEDIATE_PRODUCT' ? 'kind-preparation' : 'kind-raw',
    });
  },

  openPendingPicker: function () {
    var picker = this.pendingPicker;
    this.pendingPicker = '';
    if (picker === 'preparation') this.openProductPicker();
    if (picker === 'raw') this.openGoodsPicker();
  },

  onQuantityInput: function (event) {
    var index = Number(event.currentTarget.dataset.index);
    this.setData({
      ['components[' + index + '].quantityText']: event.detail.value,
      dirty: true,
    });
  },

  onUnitChange: function (event) {
    var index = Number(event.currentTarget.dataset.index);
    var unitIndex = Number(event.detail.value || 0);
    var row = this.data.components[index];
    this.setData({
      ['components[' + index + '].unitIndex']: unitIndex,
      ['components[' + index + '].inputUnitCode']: row.unitOptions[unitIndex],
      dirty: true,
    });
  },

  deleteComponent: function (event) {
    var rows = this.data.components.slice();
    rows.splice(Number(event.currentTarget.dataset.index), 1);
    this.setData({ components: rows, dirty: true });
  },

  openProductPicker: function () {
    this.setData({
      showProductPicker: true,
      productKeyword: '',
      filteredProducts: this.data.products,
    });
  },

  closeProductPicker: function () {
    this.setData({ showProductPicker: false });
  },

  onProductKeyword: function (event) {
    var keyword = String(event.detail.value || '').trim().toLowerCase();
    var rows = (this.data.products || []).filter(function (row) {
      if (!keyword) return true;
      return String(row.productName || '').toLowerCase().indexOf(keyword) >= 0 ||
        String(row.productCode || '').toLowerCase().indexOf(keyword) >= 0;
    });
    this.setData({ productKeyword: event.detail.value || '', filteredProducts: rows });
  },

  chooseProduct: function (event) {
    var product = event.currentTarget.dataset.item;
    if (!product || !product.eligible) {
      wx.showToast({ title: '该备料品尚无已发布配方', icon: 'none' });
      return;
    }
    var duplicate = this.data.components.some(function (row) {
      return row.itemKind === 'INTERMEDIATE_PRODUCT' &&
        Number(row.intermediateProductId) === Number(product.id);
    });
    if (duplicate) {
      wx.showToast({ title: '该备料已经加入当前菜品', icon: 'none' });
      return;
    }
    var that = this;
    api.listConversions({
      distributerId: this.identity.distributerId,
      itemKind: 'INTERMEDIATE_PRODUCT',
      intermediateProductId: product.id,
    }).catch(function () { return []; }).then(function (conversions) {
      var customUnits = (conversions || []).filter(function (conversion) {
        return Number(conversion.enabled) !== 0;
      }).map(function (conversion) {
        return conversion.unitCode;
      });
      var defaultUnit = product.storeLiteUsageUnitCode || product.baseUnitCode;
      var units = unitsForDimension(product.unitDimension, [defaultUnit].concat(customUnits));
      var rows = that.data.components.slice();
      rows.push(that.normalizeComponent({
        itemKind: 'INTERMEDIATE_PRODUCT',
        rawGoodsId: null,
        intermediateProductId: product.id,
        displayName: product.productName,
        quantityText: '1',
        inputUnitCode: defaultUnit,
        unitOptions: units,
        product: product,
      }));
      that.setData({
        components: rows,
        showProductPicker: false,
        dirty: true,
      });
    });
  },

  openGoodsPicker: function () {
    this.setData({
      showGoodsPicker: true,
      goodsKeyword: '',
      goodsResults: [],
    });
  },

  closeGoodsPicker: function () {
    this.setData({ showGoodsPicker: false });
  },

  onGoodsKeyword: function (event) {
    this.setData({ goodsKeyword: event.detail.value || '' });
  },

  searchGoods: function () {
    var keyword = String(this.data.goodsKeyword || '').trim();
    if (!keyword) {
      wx.showToast({ title: '请输入配料名称', icon: 'none' });
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
    var goodsId = Number(goods.gbDistributerGoodsId);
    var duplicate = this.data.components.some(function (row) {
      return row.itemKind === 'RAW_GOODS' && Number(row.rawGoodsId) === goodsId;
    });
    if (duplicate) {
      wx.showToast({ title: '该配料已经加入当前菜品', icon: 'none' });
      return;
    }
    var standardName = String(goods.gbDgGoodsStandardname || '').trim();
    var defaultUnit = normalizeLegacyUnit(standardName);
    if (STANDARD_UNITS.indexOf(defaultUnit) < 0) defaultUnit = 'G';
    var rows = this.data.components.slice();
    rows.push(this.normalizeComponent({
      itemKind: 'RAW_GOODS',
      rawGoodsId: goodsId,
      intermediateProductId: null,
      displayName: goods.gbDgGoodsName || ('原料 #' + goodsId),
      quantityText: '',
      inputUnitCode: defaultUnit,
      unitOptions: STANDARD_UNITS,
      goods: goods,
    }));
    this.setData({
      components: rows,
      showGoodsPicker: false,
      dirty: true,
    });
  },

  componentPayload: function () {
    return this.data.components.map(function (row) {
      var payload = {
        itemKind: row.itemKind,
        quantityPerPortion: Number(row.quantityText),
        inputUnitCode: row.inputUnitCode,
      };
      if (row.itemKind === 'INTERMEDIATE_PRODUCT') {
        payload.intermediateProductId = Number(row.intermediateProductId);
      } else {
        payload.rawGoodsId = Number(row.rawGoodsId);
      }
      return payload;
    });
  },

  validateComponents: function () {
    if (!this.data.components.length) {
      wx.showToast({ title: '菜品配方至少需要一项内容', icon: 'none' });
      return false;
    }
    var invalid = this.data.components.find(function (row) {
      return !(Number(row.quantityText) > 0) || !String(row.inputUnitCode || '').trim();
    });
    if (invalid) {
      wx.showToast({ title: '请填写“' + invalid.displayName + '”的每份用量', icon: 'none' });
      return false;
    }
    return true;
  },

  validateConversions: function () {
    var that = this;
    return Promise.all(this.data.components.map(function (row) {
      var unit = String(row.inputUnitCode || '').toUpperCase();
      if (STANDARD_UNITS.indexOf(unit) >= 0) return Promise.resolve();
      var params = {
        distributerId: that.identity.distributerId,
        itemKind: row.itemKind,
      };
      if (row.itemKind === 'INTERMEDIATE_PRODUCT') {
        params.intermediateProductId = row.intermediateProductId;
      } else {
        params.rawGoodsId = row.rawGoodsId;
      }
      return api.listConversions(params).then(function (conversions) {
        var valid = (conversions || []).some(function (conversion) {
          return Number(conversion.enabled) !== 0 &&
            String(conversion.unitCode || '').toUpperCase() === unit;
        });
        if (!valid) {
          return Promise.reject({
            preparationError: true,
            status: 400,
            message: '“' + row.displayName + '”的单位 ' + unit + ' 尚未配置换算关系',
          });
        }
      });
    }));
  },

  submit: function () {
    if (this.data.submitting || !this.data.dirty || !this.validateComponents()) return;
    var that = this;
    this.validateConversions().then(function () {
      if (that.data.recipeModel === 'LEGACY') {
        util.confirm(
          '首次加入备料会把该菜品升级为新版配方。现有' +
          that.data.legacyRawCount +
          '项配料会一并保留；升级后配料和备料统一在新版配方维护。确认继续？'
        ).then(function (confirmed) {
          if (confirmed) that.upgradeAndPublish();
        });
        return;
      }
      that.saveAndPublishVersioned();
    }).catch(function (error) {
      util.showError(error);
    });
  },

  upgradeAndPublish: function () {
    var that = this;
    this.writeMigrationCache();
    this.setData({ submitting: true });
    api.enableVersionedFood(this.data.foodId, {
      distributerId: this.identity.distributerId,
      foodRowVersion: this.data.foodRowVersion,
      operatorId: this.identity.operatorId,
    }).then(function (detail) {
      that.setData({
        recipeModel: 'VERSIONED',
        migrationMode: false,
        recipe: detail.recipe,
        version: detail.version,
      });
      return that.saveAndPublishDetail(detail);
    }).then(function (detail) {
      that.handlePublishSuccess(detail);
    }).catch(function (error) {
      that.setData({ submitting: false });
      util.showError(error);
    });
  },

  saveAndPublishVersioned: function () {
    var detail = {
      recipe: this.data.recipe,
      version: this.data.version,
    };
    var that = this;
    this.setData({ submitting: true });
    var draftPromise;
    if (detail.version && detail.version.status === 'DRAFT') {
      draftPromise = Promise.resolve(detail);
    } else {
      draftPromise = api.foodVersionAction(
        detail.recipe.id,
        detail.version.id,
        'copy',
        this.versionActionBody(detail)
      );
    }
    draftPromise.then(function (draftDetail) {
      that.setData({ recipe: draftDetail.recipe, version: draftDetail.version });
      return that.saveAndPublishDetail(draftDetail);
    }).then(function (publishedDetail) {
      that.handlePublishSuccess(publishedDetail);
    }).catch(function (error) {
      that.setData({ submitting: false });
      util.showError(error);
    });
  },

  saveAndPublishDetail: function (detail) {
    var that = this;
    return api.saveFoodDraft(detail.recipe.id, detail.version.id, {
      distributerId: this.identity.distributerId,
      recipeRowVersion: detail.recipe.rowVersion,
      versionRowVersion: detail.version.rowVersion,
      components: this.componentPayload(),
      operatorId: this.identity.operatorId,
    }).then(function (savedDetail) {
      that.setData({ recipe: savedDetail.recipe, version: savedDetail.version });
      return api.foodVersionAction(
        savedDetail.recipe.id,
        savedDetail.version.id,
        'publish',
        that.versionActionBody(savedDetail)
      );
    });
  },

  versionActionBody: function (detail) {
    return {
      distributerId: this.identity.distributerId,
      recipeRowVersion: detail.recipe.rowVersion,
      versionRowVersion: detail.version.rowVersion,
      operatorId: this.identity.operatorId,
    };
  },

  handlePublishSuccess: function (detail) {
    wx.removeStorageSync(MIGRATION_CACHE_PREFIX + this.data.foodId);
    var storedFood = wx.getStorageSync('Food') || {};
    if (Number(storedFood.foodId || storedFood.gbDistributerFoodId) === Number(this.data.foodId)) {
      storedFood.gbDfRecipeModel = 'VERSIONED';
      storedFood.gbDfRecipeRowVersion = detail.recipe.rowVersion;
      wx.setStorageSync('Food', storedFood);
    }
    this.setData({
      submitting: false,
      recipeModel: 'VERSIONED',
      migrationMode: false,
      recipe: detail.recipe,
      version: detail.version,
      dirty: false,
    });
    wx.showToast({ title: '菜品配方已发布', icon: 'success' });
    this.loadPage();
  },

  writeMigrationCache: function () {
    wx.setStorageSync(MIGRATION_CACHE_PREFIX + this.data.foodId, {
      foodId: this.data.foodId,
      savedAt: Date.now(),
      components: this.data.components,
    });
  },

  readMigrationCache: function () {
    var cached = wx.getStorageSync(MIGRATION_CACHE_PREFIX + this.data.foodId);
    if (!cached || Number(cached.foodId) !== Number(this.data.foodId)) return null;
    return cached;
  },

  retry: function () {
    this.loadPage();
  },

  noop: function () {},
  toBack: function () {
    var pages = getCurrentPages();
    var previous = pages.length > 1 ? pages[pages.length - 2] : null;
    var previousRoute = previous && (previous.route || previous.__route__) || '';
    var upgradedFromLegacy = this.data.recipeModel === 'VERSIONED' &&
      /subPackage-group\/pages\/food\/addRaw\/addRaw$/.test(previousRoute);
    wx.navigateBack({ delta: upgradedFromLegacy ? 2 : 1 });
  },
});
