const app = getApp()
const globalData = app.globalData;
var load = require('../../../../lib/load.js');
var preparationApi = require('../../../../services/preparation');
var preparationUtil = require('../../../../utils/preparation');
var recipeVersionDeletion = require('../shared/recipeVersionDeletion');


import {
  saveGbFoodGoodsItem,
  deleteGbFoodGoods,
  updateGbFoodGoods,
  quickSearchDisGoodsForFoodIngredient,
  getFoodGoodsList,
  updateGrossMargin,
  getFoodByFoodId,
} from '../../../../services/apiDistributerGbFood'

var recipePageModel = require('./recipePageModel');
var MIN_UNIT_OPTIONS = recipePageModel.MIN_UNIT_OPTIONS;
var QUICK_DOSAGE_PRESETS = recipePageModel.QUICK_DOSAGE_PRESETS;
var COST_DAYS_OPTIONS = recipePageModel.COST_DAYS_OPTIONS;
var MODAL_PAD_TOP_RATIO_SEARCH = recipePageModel.MODAL_PAD_TOP_RATIO_SEARCH;
var MODAL_PAD_TOP_RATIO_PICKED = recipePageModel.MODAL_PAD_TOP_RATIO_PICKED;
var PREPARATION_MIGRATION_CACHE_PREFIX = recipePageModel.PREPARATION_MIGRATION_CACHE_PREFIX;
var RECIPE_REPLACEMENT_CONTEXT_PREFIX = recipePageModel.RECIPE_REPLACEMENT_CONTEXT_PREFIX;
var P1_STANDARD_UNITS = recipePageModel.P1_STANDARD_UNITS;
var _todayText = recipePageModel._todayText;
var _offsetDateText = recipePageModel._offsetDateText;
var _recipeMoneyText = recipePageModel._recipeMoneyText;
var _recipeNumberText = recipePageModel._recipeNumberText;
var _recipeDateText = recipePageModel._recipeDateText;
var _recipeNewMissingReasonGroups = recipePageModel._recipeNewMissingReasonGroups;
var _recipeReasonGroupView = recipePageModel._recipeReasonGroupView;
var _toP1Unit = recipePageModel._toP1Unit;
var _fromP1Unit = recipePageModel._fromP1Unit;
var _baseUnitInfo = recipePageModel._baseUnitInfo;
var _baseUnitCode = recipePageModel._baseUnitCode;
var _baseUnitLabel = recipePageModel._baseUnitLabel;
var _historicalPriceMissingText = recipePageModel._historicalPriceMissingText;
var _managedVersionUsageState = recipePageModel._managedVersionUsageState;
var _nextRecipeVersionStart = recipePageModel._nextRecipeVersionStart;
var _recipeIntervalsOverlap = recipePageModel._recipeIntervalsOverlap;
var _rawGoodsPurchaseEvidence = recipePageModel._rawGoodsPurchaseEvidence;
var _unitFactorToGram = recipePageModel._unitFactorToGram;
var _legacyRawToP1Component = recipePageModel._legacyRawToP1Component;
var _rawPackSpecAmount = recipePageModel._rawPackSpecAmount;
var _packQtyInMinUnit = recipePageModel._packQtyInMinUnit;
var _minUnitOptionsForGoods = recipePageModel._minUnitOptionsForGoods;
var _suggestMinUnit = recipePageModel._suggestMinUnit;
var _hasGoodsDefaultSpec = recipePageModel._hasGoodsDefaultSpec;
var _effectivePackQtyInMin = recipePageModel._effectivePackQtyInMin;
var _needsManualConversion = recipePageModel._needsManualConversion;
var _formatPortionsPerPack = recipePageModel._formatPortionsPerPack;
var _getGoodsEntity = recipePageModel._getGoodsEntity;
var _normalizeRawGoodsPayload = recipePageModel._normalizeRawGoodsPayload;
var _goodsImageUrl = recipePageModel._goodsImageUrl;
var _decorateGoodsSearchPrice = recipePageModel._decorateGoodsSearchPrice;
var _defaultPortionAmount = recipePageModel._defaultPortionAmount;
var _buildUnitContext = recipePageModel._buildUnitContext;
var _trimDecimal = recipePageModel._trimDecimal;
var _formatPackAmountDisplay = recipePageModel._formatPackAmountDisplay;
var _formatPackAmount = recipePageModel._formatPackAmount;
var _convertMinUnitToPack = recipePageModel._convertMinUnitToPack;
var _buildPortionPersistPayload = recipePageModel._buildPortionPersistPayload;
var _convertPackToMinUnitForDisplay = recipePageModel._convertPackToMinUnitForDisplay;
var _getRawLinePrice = recipePageModel._getRawLinePrice;
var _calcRawLineCost = recipePageModel._calcRawLineCost;
var _calcPortionCost = recipePageModel._calcPortionCost;
var _normalizeRecipeVersion = recipePageModel._normalizeRecipeVersion;


function createRecipePage(versionEditorMode) {
  return {
  /**
   * 页面的初始数据
   */
  data: {
    modalType: "add",
    versionEditorMode: versionEditorMode,
    versionDraftDirty: false,
    versionDraftChangeContext: null,
    canSave: false,
    amount: '',
    goodsName: '',
    standardName: '',
    url: globalData.server,
    pieColors: ['#3cb08a', '#ff8c42', '#5b9bd5', '#9b59b6', '#e74c3c', '#f1c40f', '#1abc9c'],
    searchKeyword: '',
    modalGoods: null,
    modalGoodsImg: '',
    modalPortionAmount: '5',
    minUnitOptions: MIN_UNIT_OPTIONS,
    modalMinUnitIndex: 0,
    modalMinUnit: 'ml',
    modalPackUnit: '',
    modalPackLabel: '',
    modalPackPriceTitle: '',
    modalPackPriceLabel: '',
    modalPriceReferenceOnly: false,
    modalCostPerPortion: '0.00',
    modalPortionsPerPack: '0',
    modalDemoText: '',
    modalPackEquivText: '',
    modalPackQtyInMin: '',
    modalConversionPlaceholder: '如8',
    modalConversionRequired: false,
    modalGoodsSpecMissing: false,
    modalBulkWeightPack: false,
    modalCanCalcCost: false,
    modalQuickTags: [],
    costDays: 30,
    costDaysLabel: '近30天',
    versionedMode: false,
    versionedDetail: null,
    versionedComponents: [],
    recipeVersionHistory: [],
    recipeVersionPrimary: null,
    currentRecipeVersionView: null,
    // 服务端是否解析出今天的生效配方；null 表示还没拿到服务端结论（加载中或查询失败）。
    versionHasEffectiveRecipe: null,
    recipeTimeline: [],
    recipeCoverageGaps: [],
    baseVersionId: null,
    manageVersionId: null,
    returnToManage: false,
    showPreparation: false,
    preparationLoading: false,
    preparationProducts: [],
    filteredPreparationProducts: [],
    preparationKeyword: '',
    selectedPreparation: null,
    preparationAmount: '50',
    preparationAmountUnit: 'G',
    preparationAmountUnitLabel: 'g',
    preparationModalType: 'add',
    preparationEditIndex: -1,
    recipeSaving: false,
    versionUsageStart: '',
    versionUsageEnd: '',
    versionUsageHasEnd: false,
    versionUsageReason: '',
    versionUsageInitialized: false,
    versionUsageDirty: false,
    managedVersionIntervals: [],
    managedIntervalId: null,
    managedIntervalOriginalStart: '',
    managedIntervalOriginalEnd: '',
    minimumNewVersionStart: '',
    versionUsagePreview: null,
    versionUsagePreviewRequest: null,
    versionUsagePreviewVersionId: null,
    versionUsageReplacementPreview: null,
    versionUsageReplacementRequest: null,
    versionUsageNewReasonExpanded: false,
    versionUsageConfirming: false,
    versionDeleting: false,
    versionCostBasisDate: '',
    versionCostScopeText: '',
    costMissingReason: '',
  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this._skipFirstShow = true;
    this.preparationIdentity = preparationUtil.getIdentity();
    var wh = globalData.windowHeight * globalData.rpxR;
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: wh,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: globalData.server,
    });
    this._syncFoodSearchModalLayout();

    var foodItem = wx.getStorageSync('Food');
    if (!foodItem) {
      wx.showToast({ title: '缺少菜品数据', icon: 'none' });
      foodItem = {};
    }
    var foodId = (options && options.foodId)
      || foodItem.foodId || foodItem.gbDistributerFoodId || '';
    this.setData({
      foodItem: foodItem,
      foodId: foodId,
      baseVersionId: Number(options && options.baseVersionId) || null,
      // 内容修订 ID 是唯一权威对象；manageVersionId 仅作为旧入口兼容。
      manageVersionId: Number(options && options.contentVersionId)
        || Number(options && options.manageVersionId) || null,
      editIntervalId: Number(options && options.intervalId) || null,
      returnToManage: String(options && options.returnToManage || '') === '1',
      versionedMode: foodItem.gbDfRecipeModel === 'VERSIONED',
      versionUsageStart: this.data.versionEditorMode ? _todayText() : '',
      versionUsageReason: this.data.versionEditorMode ? '新建配方版本并设置门店使用时间' : '',
    })

    // Food 是跨页缓存，配方模式和 rowVersion 必须以后台最新数据为准。
    if (foodId) {
      this._refreshFoodItem(foodId);
    }


    var value = wx.getStorageSync('disInfo');
    if (value) {
      this.setData({
        disInfo: value,
        disId: value.gbDistributerId,
      })
    }
    this.setData({ _hasLoaded: true });
  },

  onShow: function () {
    if (this._skipFirstShow) {
      this._skipFirstShow = false;
      return;
    }
    var foodId = this.data.foodId;
    if (foodId && this.data._hasLoaded
      && !(this.data.versionEditorMode && this.data.versionDraftDirty)) {
      // 从编辑页返回时刷新菜品数据
      this._refreshFoodItem(foodId);
    }
    if (this._pendingSpecificationGoodsId) {
      this._refreshModalGoodsSpecification();
    }
  },

  onReady() {
    this._tryDrawDonut();
  },

  _normalizeFoodItem(latestFood) {
    var current = this.data.foodItem || {};
    var foodItem = Object.assign({}, current, latestFood || {});
    foodItem.foodId = foodItem.foodId || foodItem.gbDistributerFoodId || this.data.foodId;
    foodItem.dishName = foodItem.dishName || foodItem.gbDfFoodName || '';
    if (typeof foodItem.gbDfFoodPrice !== 'undefined') {
      foodItem.salePrice = foodItem.gbDfFoodPrice;
    }
    return foodItem;
  },

  _refreshFoodItem(foodId) {
    var that = this;
    getFoodByFoodId(foodId).then(function (res) {
      if (res.result.code == 0) {
        var foodItem = that._normalizeFoodItem(res.result.data);
        wx.setStorageSync('Food', foodItem);
        that.setData({
          foodItem: foodItem,
          versionedMode: foodItem && foodItem.gbDfRecipeModel === 'VERSIONED',
        }, function () {
          if (that.data.versionedMode) that._fetchVersionedRecipe();
          else that._fetchFoodGoods(foodId);
        });
      }
    });
  },

  /** 已选配料时弹窗上移，避免表单变长后底部被挡 */
  _syncFoodSearchModalLayout() {
    var wh = this.data.windowHeight
      || Math.round(globalData.windowHeight * globalData.rpxR);
    if (!wh) return;
    var picked = !!(this.data.modalGoods && !this.data.isSearching);
    var ratio = picked ? MODAL_PAD_TOP_RATIO_PICKED : MODAL_PAD_TOP_RATIO_SEARCH;
    var padTop = Math.round(wh * ratio);
    var panelMax = Math.max(400, Math.round(wh - padTop - 40));
    var inner = Math.round(wh - padTop - 56);
    var scrollLong = Math.max(320, Math.round(inner * 0.68));
    this.setData({
      foodSearchModalPadTopRpx: padTop,
      foodSearchModalPanelMaxRpx: panelMax,
      foodSearchScrollRpx: scrollLong,
    });
  },

  _fetchFoodGoods(foodId, options) {
    var that = this;
    var opts = options || {};
    if (!foodId) return;
    if (opts.showLoading !== false) {
      load.showLoading(opts.loadingText || '加载配料');
    }
    getFoodGoodsList(foodId, this.data.costDays).then(function (res) {
      if (opts.showLoading !== false) {
        load.hideLoading();
      }
      if (res.result.code == 0) {
        var list = res.result.data;
        that._processRawArr(Array.isArray(list) ? list : []);
      } else if (opts.toastOnError) {
        wx.showToast({
          title: res.result.msg || '刷新失败',
          icon: 'none',
        });
      }
    }).catch(function () {
      if (opts.showLoading !== false) {
        load.hideLoading();
      }
      if (opts.toastOnError) {
        wx.showToast({ title: '刷新失败', icon: 'none' });
      }
    });
  },

  _loadEditableVersionedDetail() {
    var that = this;
    var identity = this.preparationIdentity || preparationUtil.getIdentity();
    return preparationApi.getFoodRecipeByFood(
      this.data.foodId,
      identity.distributerId
    ).then(function (detail) {
      return Promise.all([
        preparationApi.listFoodVersions(detail.recipe.id, identity.distributerId),
        preparationApi.listFoodEffectiveIntervals(
          detail.recipe.id,
          identity.distributerId,
          identity.currentStoreId
        ),
      ]).then(function (results) {
        var versions = results[0] || [];
        var timeline = ((results[1] && results[1].intervals) || []).map(function (wrapper) {
          return Object.assign({}, wrapper.interval || wrapper || {}, {
            versionNo: wrapper.versionNo,
          });
        });
        var today = _todayText();
        var effectiveInterval = timeline.find(function (row) {
          return row.effectiveStart <= today && (!row.effectiveEnd || today < row.effectiveEnd);
        });
        var effectiveVersionId = effectiveInterval ? Number(effectiveInterval.recipeVersionId) : null;
        var draft = (versions || []).find(function (row) {
          return row.status === 'DRAFT';
        });
        var selectedVersionId = null;
        if (that.data.versionEditorMode) {
          selectedVersionId = Number(that.data.manageVersionId)
            || (draft ? Number(draft.id)
              : (Number(that.data.baseVersionId) || effectiveVersionId
              || Number(((versions || []).find(function (row) {
                return String(row.status || '').toUpperCase() === 'PUBLISHED';
              }) || {}).id)));
        } else {
          selectedVersionId = effectiveVersionId;
        }
        // 编辑既有对象时，内容修订与指定区间都必须真实存在；缺失要明确报错，
        // 不能让页面默默回退成今天的默认日期。
        if (that.data.versionEditorMode && Number(that.data.manageVersionId) > 0) {
          if (!Number(selectedVersionId)) {
            return Promise.reject({
              preparationError: true,
              status: 404,
              message: '要编辑的配方内容修订不存在，请返回版本列表重试',
            });
          }
          if (Number(that.data.editIntervalId) > 0) {
            var targetInterval = timeline.find(function (row) {
              return Number(row.id) === Number(that.data.editIntervalId);
            });
            if (!targetInterval) {
              return Promise.reject({
                preparationError: true,
                status: 404,
                message: '指定的门店适用区间不存在，请返回版本列表重试',
              });
            }
            if (Number(targetInterval.recipeVersionId) !== Number(selectedVersionId)) {
              return Promise.reject({
                preparationError: true,
                status: 409,
                message: '该适用区间不属于要编辑的内容修订，请返回版本列表重试',
              });
            }
          }
        }
        var withContext = function (selectedDetail) {
          return Object.assign({}, selectedDetail, {
            versionHistory: versions,
            recipeTimeline: timeline,
            recipeCoverageGaps: (results[1] && results[1].gaps) || [],
            effectiveVersionId: effectiveVersionId,
            _preferredIntervalId: Number(that.data.editIntervalId) || 0,
          });
        };
        if (!selectedVersionId) {
          return withContext(Object.assign({}, detail, { version: null, components: [] }));
        }
        if (!detail.version || Number(detail.version.id) !== Number(selectedVersionId)) {
          return preparationApi.getFoodRecipe(
            detail.recipe.id,
            identity.distributerId,
            selectedVersionId
          ).then(function (selectedDetail) {
            return withContext(selectedDetail);
          });
        }
        return withContext(detail);
      });
    });
  },

  _fetchVersionedRecipe(options) {
    var that = this;
    var opts = options || {};
    var identity = this.preparationIdentity || preparationUtil.getIdentity();
    if (!identity.distributerId) {
      wx.showToast({ title: '当前登录身份不完整', icon: 'none' });
      return Promise.resolve();
    }
    if (!identity.currentStoreId) {
      wx.showToast({ title: '当前门店信息不完整', icon: 'none' });
      return Promise.resolve();
    }
    if (opts.showLoading) load.showLoading('刷新配方');
    return this._loadEditableVersionedDetail().then(function (detail) {
      var components = detail.components || [];
      var currentVersionId = detail.effectiveVersionId;
      var versionHistory = (detail.versionHistory || []).map(function (version) {
        return _normalizeRecipeVersion(version, currentVersionId);
      });
      var currentVersion = versionHistory.find(function (version) {
        return version._isCurrent;
      }) || null;
      var selectedVersionId = detail.version && Number(detail.version.id);
      var selectedVersion = versionHistory.find(function (version) {
        return Number(version.id) === selectedVersionId;
      }) || null;
      var primaryVersion = selectedVersion || currentVersion || versionHistory[0] || null;
      var usageState = _managedVersionUsageState(detail, primaryVersion);
      // 普通详情查询只以服务端的有效配方状态为准：服务端解析出今天的生效修订才算有当前配方。
      // 首次迁移的本地暂存放在迁移流程内部使用，不能因为服务端返回空配料就在这里补回旧配料。
      var hasEffectiveRecipe = !!detail.effectiveVersionId;
      // 版本配方的成本必须来自该版本门店适用区间内的正式历史成本证据。
      // 详情页和编辑页使用同一份上下文，不能在详情页退回商品档案价或近期均价。
      var costContextPromise = that._loadVersionCostContext(usageState, primaryVersion);
      return costContextPromise.then(function (costContext) {
        that._activeVersionCostContext = costContext;
        return that._decorateVersionedComponents(components, costContext);
      }).then(function (displayRows) {
        if (opts.showLoading) load.hideLoading();
        that.setData({
          versionedMode: true,
          versionedDetail: detail,
          versionedComponents: components,
          recipeVersionHistory: versionHistory,
          recipeVersionPrimary: primaryVersion,
          currentRecipeVersionView: that.data.versionEditorMode ? primaryVersion : currentVersion,
          versionHasEffectiveRecipe: hasEffectiveRecipe,
          recipeTimeline: detail.recipeTimeline || [],
          recipeCoverageGaps: detail.recipeCoverageGaps || [],
          versionCostBasisDate: usageState.start,
          versionCostScopeText: (that._activeVersionCostContext || {}).scopeText || '',
        }, function () {
          that._initializeUnifiedVersionEditor(detail, primaryVersion);
        });
        that._processRawArr(displayRows);
      });
    }).catch(function (error) {
      if (opts.showLoading) load.hideLoading();
      preparationUtil.showError(error);
    });
  },

  _initializeUnifiedVersionEditor(detail, selectedVersion) {
    if (!this.data.versionEditorMode || this.data.versionUsageInitialized || !selectedVersion) return;
    var state = _managedVersionUsageState(detail, selectedVersion);
    var creatingVersion = !Number(this.data.manageVersionId);
    var today = state.today;
    var intervals = creatingVersion ? [] : state.intervals;
    var preferred = creatingVersion ? null : state.preferred;
    var start = creatingVersion
      ? _nextRecipeVersionStart((detail && detail.recipeTimeline) || [], today)
      : state.start;
    var end = creatingVersion ? '' : state.end;
    var that = this;
    this.setData({
      versionUsageInitialized: true,
      managedVersionIntervals: intervals,
      managedIntervalId: preferred ? Number(preferred.id) : null,
      managedIntervalOriginalStart: preferred ? start : '',
      managedIntervalOriginalEnd: preferred ? end : '',
      minimumNewVersionStart: creatingVersion ? start : '',
      versionUsageStart: start,
      versionUsageEnd: end,
      versionUsageHasEnd: !!end,
      versionCostBasisDate: start,
      versionUsageReason: creatingVersion
        ? '新增配方版本并设置门店使用时间'
        : '编辑 V' + (selectedVersion.versionNo || '') + ' 配方内容与使用时间',
      versionDraftDirty: creatingVersion,
      versionUsageDirty: creatingVersion,
      versionUsagePreview: null,
      versionUsagePreviewRequest: null,
      versionUsagePreviewVersionId: null,
    }, function () {
      if (creatingVersion) that._refreshVersionedCostPreview(start, end);
    });
  },

  selectManagedInterval(event) {
    if (this.data.recipeSaving || this.data.versionUsageConfirming) return;
    var intervalId = Number(event.currentTarget.dataset.intervalId || 0);
    var interval = (this.data.managedVersionIntervals || []).find(function (row) {
      return Number(row.id) === intervalId;
    });
    if (!interval) return;
    var start = _recipeDateText(interval.effectiveStart);
    var end = _recipeDateText(interval.effectiveEnd);
    var that = this;
    this.setData({
      managedIntervalId: intervalId,
      managedIntervalOriginalStart: start,
      managedIntervalOriginalEnd: end,
      versionUsageStart: start,
      versionUsageEnd: end,
      versionUsageHasEnd: !!end,
      versionCostBasisDate: start,
      versionUsageDirty: false,
      versionUsagePreview: null,
      versionUsagePreviewRequest: null,
      versionUsagePreviewVersionId: null,
    }, function () {
      that._refreshVersionedCostPreview(start, end);
    });
  },

  _loadVersionCostContext(usageState, selectedVersion) {
    var identity = this.preparationIdentity || preparationUtil.getIdentity();
    var today = _todayText();
    var start = _recipeDateText((usageState && usageState.start) || this.data.versionUsageStart || today);
    var endExclusive = _recipeDateText((usageState && usageState.end) || '');
    var endInclusive = endExclusive ? _offsetDateText(endExclusive, -1) : today;
    if (endInclusive > today) endInclusive = today;
    var futureOnly = start > today;
    if (futureOnly || endInclusive < start) endInclusive = start;
    var context = {
      start: start,
      endExclusive: endExclusive,
      endInclusive: endInclusive,
      selectedVersionId: Number(selectedVersion && selectedVersion.id) || null,
      salesRows: [],
      ingredients: {},
      pricePromises: {},
      scopeText: start + ' 至 ' + (endExclusive ? endInclusive : '今天'),
      futureOnly: futureOnly,
    };
    if (!identity.distributerId || !identity.currentStoreId) {
      context.loadError = '当前门店或菜品信息不完整';
    }
    return Promise.resolve(context);
  },

  _resolveComponentIntervalPrice(component, context) {
    var identity = this.preparationIdentity || preparationUtil.getIdentity();
    var baseCode = _baseUnitCode(component.inputUnitCode);
    var key = Number(component.rawGoodsId) + ':' + baseCode;
    if (context.pricePromises[key]) return context.pricePromises[key];
    // 当前版本页面只采用自身适用期内真实入库的加权均价。
    // 禁止调用“营业日以前最近价格”兜底，否则新版本会错误继承旧版本时期的采购价。
    context.pricePromises[key] = preparationApi.resolveHistoricalTheoryPriceForInterval({
      distributerId: identity.distributerId,
      storeDepartmentId: identity.currentStoreId,
      rawGoodsId: component.rawGoodsId,
      startDate: context.start,
      endDate: context.endInclusive,
      baseUnitCode: baseCode,
    }).then(function (resolution) {
      var result = resolution || {};
      result.basisType = 'EFFECTIVE_INTERVAL_RECEIPT_WEIGHTED';
      return result;
    });
    return context.pricePromises[key];
  },

  _decorateVersionedComponents(components, costContext) {
    var that = this;
    var rows = components || [];
    return Promise.all(rows.map(function (component) {
      if (component.itemKind !== 'INTERMEDIATE_PRODUCT' || component.intermediateRecipe) {
        return Promise.resolve(component);
      }
      return preparationApi.getStoreRecipe(component.intermediateProductId).then(function (recipe) {
        return Object.assign({}, component, { intermediateRecipe: recipe || {} });
      });
    })).then(function (resolvedComponents) {
      // 正式配方接口已经随组件返回轻量 rawGoods（名称、规格和图片）；
      // 中间料配方接口也按同一结构返回其底层原料。直接消费这些数据，避免
      // 再次逐商品请求完整详情。价格和每份成本统一取正式历史成本接口。
      return Promise.all(resolvedComponents.map(function (component, index) {
        if (component.itemKind === 'INTERMEDIATE_PRODUCT') {
          return that._decoratePreparationComponent(component, index, costContext);
        }
        return that._decorateRawComponent(component, index, component.rawGoods || {}, costContext);
      }));
    });
  },

  _decorateRawComponent(component, index, embeddedGoods, costContext) {
    var that = this;
    var buildRow = function (payload) {
      var goods = _normalizeRawGoodsPayload(payload);
      var displayUnit = _fromP1Unit(component.inputUnitCode);
      var packQty = _packQtyInMinUnit(goods, displayUnit);
      var row = {
        gbDistributerFoodGoodsId: 'RAW_GOODS:' + component.rawGoodsId,
        gbDfgDisGoodsId: component.rawGoodsId,
        gbDfgGoodsName: goods.gbDgGoodsName || component.rawGoodsName || ('原料 #' + component.rawGoodsId),
        gbDfgGoodsAmount: String(component.quantityPerPortion),
        gbDfgGoodsStandardname: displayUnit,
        gbDfgPortionAmount: String(component.quantityPerPortion),
        gbDfgPortionUnit: displayUnit,
        gbDfgPackQtyInMin: packQty > 0 ? String(packQty) : '',
        gbDistributerGoodsEntity: goods,
        _isVersioned: true,
        _componentKind: 'RAW_GOODS',
        _componentIndex: index,
        _recipeComponent: component,
        _displayAmount: String(component.quantityPerPortion),
        _displayUnit: displayUnit,
        _imageUrl: _goodsImageUrl(that.data.url, goods),
      };
      return row;
    };
    var row = buildRow(embeddedGoods || {});
    var identity = this.preparationIdentity || preparationUtil.getIdentity();
    var base = _baseUnitInfo(component.inputUnitCode);
    var baseCode = _baseUnitCode(component.inputUnitCode);
    var baseQuantity = Number(component.baseQuantityPerPortion);
    if (!(baseQuantity > 0) && base) {
      baseQuantity = Number(component.quantityPerPortion) * base.factor;
    }
    var context = costContext && costContext.start
      ? costContext
      : this._activeVersionCostContext;
    var date = _recipeDateText((context && context.start) || this.data.versionUsageStart || _todayText());
    if (!identity.distributerId || !identity.currentStoreId || !component.rawGoodsId
      || !date || !baseCode || !(baseQuantity > 0)) {
      row._cost = '';
      row._costAvailable = false;
      row._costMissingReason = !baseCode
        ? '配料单位无法换算到基础单位'
        : '历史价格查询条件不完整';
      row._packPriceLabel = row._costMissingReason;
      return Promise.resolve(row);
    }
    if (!context) {
      context = {
        start: date,
        salesRows: [],
        ingredients: {},
        pricePromises: {},
      };
    }
    return this._resolveComponentIntervalPrice(component, context).then(function (resolution) {
      var resolved = resolution || {};
      var price = Number(resolved.amountPerBaseUnit);
      if (resolved.status !== 'RESOLVED' || isNaN(price)) {
        row._cost = '';
        row._costAvailable = false;
        row._costMissingReason = _historicalPriceMissingText(resolved);
        row._packPriceLabel = row._costMissingReason;
        row._historicalPriceResolution = resolved;
        return row;
      }
      var cost = baseQuantity * price;
      row._cost = cost.toFixed(2);
      row._costValue = cost;
      row._costAvailable = true;
      row._historicalPriceResolution = resolved;
      row._historicalPriceBusinessDate = date;
      row._historicalPriceBaseQuantity = baseQuantity;
      row._packPriceLabel = '适用期采购均价 '
        + '¥' + _trimDecimal(price, 8) + '/' + _baseUnitLabel(baseCode);
      return row;
    }).catch(function (error) {
      row._cost = '';
      row._costAvailable = false;
      row._costMissingReason = (error && error.message) || '历史价格读取失败';
      row._packPriceLabel = row._costMissingReason;
      return row;
    });
  },

  _decoratePreparationComponent(component, index, costContext) {
    var that = this;
    var recipePromise = component.intermediateRecipe
      ? Promise.resolve(component.intermediateRecipe)
      : preparationApi.getStoreRecipe(component.intermediateProductId);
    return recipePromise.then(function (recipe) {
      recipe = recipe || {};
      var inputGramFactor = _unitFactorToGram(component.inputUnitCode);
      var outputBase = Number(recipe.standardOutputBaseQuantity) ||
        (Number(recipe.standardOutputQuantity) * _unitFactorToGram(recipe.standardOutputUnitCode));
      var inputBase = Number(component.quantityPerPortion) * inputGramFactor;
      var ratio = inputBase > 0 && outputBase > 0 ? inputBase / outputBase : 0;
      var recipeComponents = recipe.components || [];
      if (!(ratio > 0) || !recipeComponents.length) {
        return Promise.reject(new Error('中间料标准配方不完整'));
      }
      return Promise.all(recipeComponents.map(function (rawComponent, rawIndex) {
        return that._decorateRawComponent({
          itemKind: 'RAW_GOODS',
          rawGoodsId: rawComponent.rawGoodsId,
          quantityPerPortion: Number(rawComponent.inputQuantity) * ratio,
          inputUnitCode: rawComponent.inputUnitCode,
          rawGoodsName: rawComponent.rawGoodsName,
        }, rawIndex, rawComponent.rawGoods, costContext);
      })).then(function (expandedRows) {
        var costComplete = expandedRows.every(function (row) {
          return row._costAvailable !== false && row._cost !== '';
        });
        var cost = expandedRows.reduce(function (sum, row) {
          return sum + (Number(row._cost) || 0);
        }, 0);
        return {
          gbDistributerFoodGoodsId: 'INTERMEDIATE_PRODUCT:' + component.intermediateProductId,
          gbDfgGoodsName: component.intermediateProductName || recipe.productName ||
            ('中间料 #' + component.intermediateProductId),
          _isVersioned: true,
          _isPreparation: true,
          _componentKind: 'INTERMEDIATE_PRODUCT',
          _componentIndex: index,
          _recipeComponent: component,
          _preparationProduct: {
            id: component.intermediateProductId,
            productName: component.intermediateProductName || recipe.productName ||
              ('中间料 #' + component.intermediateProductId),
          },
          _displayAmount: String(inputBase),
          _displayUnit: 'g',
          _cost: costComplete ? cost.toFixed(2) : '',
          _costAvailable: costComplete,
          _expandedIngredientCount: recipeComponents.length,
          _packPriceLabel: '按 ' + recipeComponents.length + ' 种原料展开核算',
        };
      });
    }).catch(function () {
      var grams = Number(component.quantityPerPortion) *
        (_unitFactorToGram(component.inputUnitCode) || 1);
      return {
        gbDistributerFoodGoodsId: 'INTERMEDIATE_PRODUCT:' + component.intermediateProductId,
        gbDfgGoodsName: '中间料 #' + component.intermediateProductId,
        _isVersioned: true,
        _isPreparation: true,
        _componentKind: 'INTERMEDIATE_PRODUCT',
        _componentIndex: index,
        _recipeComponent: component,
        _displayAmount: String(grams),
        _displayUnit: 'g',
        _cost: '',
        _costAvailable: false,
        _packPriceLabel: '按组成原料展开核算',
      };
    });
  },

  _closeRawModal() {
    this._resetModalForm();
    this.setData({
      showFood: false,
      editGoods: null,
      searchKeyword: '',
      goodsName: '',
      disGoodsId: '',
      standardName: '',
      amount: '',
    });
  },

  _refreshAfterRawSave() {
    var that = this;
    var foodId = this.data.foodId;
    this._closeRawModal();
    if (!foodId) {
      wx.showToast({ title: '保存成功', icon: 'success' });
      return;
    }
    load.showLoading('刷新配料');
    getFoodGoodsList(foodId, this.data.costDays).then(function (res) {

      load.hideLoading();
      if (res.result.code == 0) {
        var list = res.result.data;
        that._processRawArr(Array.isArray(list) ? list : []);
        wx.showToast({ title: '保存成功', icon: 'success' });
      } else {
        wx.showToast({
          title: res.result.msg || '保存成功，刷新列表失败',
          icon: 'none',
        });
      }
    }).catch(function () {
      load.hideLoading();
      wx.showToast({ title: '保存成功，刷新列表失败', icon: 'none' });
    });
  },

  /**
   * 计算成本、占比、总单位成本
   */
  _processRawArr(list) {
    var salePrice = parseFloat(this.data.foodItem.salePrice) || 0;
    var totalCost = 0;
    var totalCostComplete = true;
    var missingCostRows = [];
    for (var i = 0; i < list.length; i++) {
      var raw = list[i];
      if (raw._isVersioned) {
        var versionedAvailable = raw._costAvailable !== false && raw._cost !== ''
          && raw._cost !== null && typeof raw._cost !== 'undefined';
        var preciseVersionedCost = Number(raw._costValue);
        var versionedCost = versionedAvailable
          ? (!isNaN(preciseVersionedCost) ? preciseVersionedCost : (parseFloat(raw._cost) || 0))
          : 0;
        raw._cost = versionedAvailable ? versionedCost.toFixed(2) : '';
        raw._packPriceLabel = raw._packPriceLabel || '成本待计算';
        raw._ratio = versionedAvailable && salePrice > 0
          ? (versionedCost / salePrice * 100).toFixed(1)
          : (versionedAvailable ? '0.0' : '—');
        if (!versionedAvailable) {
          totalCostComplete = false;
          missingCostRows.push((raw.gbDfgGoodsName || '未命名配料') + '：'
            + (raw._costMissingReason || '缺少可靠成本依据'));
        }
        totalCost += versionedCost;
        continue;
      }
      var entity = _getGoodsEntity(raw);
      var ctx = _buildUnitContext(entity);
      var display = _convertPackToMinUnitForDisplay(
        raw.gbDfgGoodsAmount,
        raw.gbDfgGoodsStandardname,
        entity,
        raw
      );
      raw._displayAmount = display.portion;
      raw._displayUnit = display.minUnit;
      var linePrice = _getRawLinePrice(raw, entity);
      var cost = _calcRawLineCost(raw);
      raw._cost = cost.toFixed(2);
      raw._costAvailable = cost > 0;
      raw._packPriceLabel = linePrice > 0 && ctx.packUnit
        ? (linePrice.toFixed(2) + '/' + ctx.packUnit)
        : '—';
      raw._ratio = salePrice > 0 ? (cost / salePrice * 100).toFixed(1) : '0.0';
      if (!raw._costAvailable) {
        raw._cost = '';
        raw._ratio = '—';
        totalCostComplete = false;
      }
      totalCost += cost;
    }
    // 普通详情页有没有当前有效配方，只看服务端生效区间的解析结果：
    // null 表示还没拿到服务端结论（加载中或查询失败），此时不按无配方处理；
    // 也不能用"最新修订存在"或"配料列表为空"代替这个判断。
    var effectiveRecipeState = this.data.versionedMode && !this.data.versionEditorMode
      ? this.data.versionHasEffectiveRecipe
      : null;
    var noEffectiveRecipe = effectiveRecipeState === false;
    if (noEffectiveRecipe) {
      totalCostComplete = false;
      missingCostRows.push('当前没有有效配方');
    }
    var costRate = totalCostComplete && salePrice > 0 ? (totalCost / salePrice * 100).toFixed(1) : '—';
    var profit = totalCostComplete ? (salePrice - totalCost).toFixed(2) : '—';
    var grossMarginRate = totalCostComplete && salePrice > 0
      ? ((salePrice - totalCost) / salePrice * 100).toFixed(1) : '—';

    // 利润评价
    var profitLevelClass = 'profit-tag--good';
    var profitHint = '做得好！毛利表现优秀';
    var gm = parseFloat(grossMarginRate);
    if (!totalCostComplete) {
      profitLevelClass = 'profit-tag--normal';
      profitHint = noEffectiveRecipe
        ? '当前没有有效配方，暂不计算成本与毛利'
        : '部分配料缺少成本依据，暂不计算完整毛利';
    } else if (gm < 30) {
      profitLevelClass = 'profit-tag--bad';
      profitHint = '毛利率偏低，建议优化';
    } else if (gm < 50) {
      profitLevelClass = 'profit-tag--normal';
      profitHint = '毛利率一般，还有提升空间';
    }

    this.setData({
      rawArr: list,
      totalCost: totalCostComplete ? totalCost.toFixed(2) : '—',
      costTotal: totalCostComplete ? totalCost.toFixed(2) : '—',
      totalCostComplete: totalCostComplete,
      costRate: costRate,
      profit: profit,
      grossMarginRate: grossMarginRate,
      profitLevelClass: profitLevelClass,
      profitHint: profitHint,
      costMissingReason: missingCostRows.join('；'),
    }, () => {
      this._tryDrawDonut();
    });
  },

  _tryDrawDonut() {
    var that = this;
    var query = wx.createSelectorQuery().in(this);
    query.select('#donutChart')
      .fields({ node: true, size: true })
      .exec(function (res) {
        if (!res || !res[0] || !res[0].node) return;
        that._drawDonut(res[0]);
      });
  },

  _drawDonut(canvasRes) {
    var canvas = canvasRes.node;
    var ctx = canvas.getContext('2d');
    var dpr = wx.getWindowInfo().pixelRatio;
    var width = canvasRes.width;
    var height = canvasRes.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    var rawArr = this.data.rawArr || [];
    var colors = this.data.pieColors || ['#3cb08a', '#ff8c42', '#5b9bd5', '#9b59b6'];
    var totalCost = 0;
    for (var i = 0; i < rawArr.length; i++) {
      totalCost += parseFloat(rawArr[i]._cost) || 0;
    }

    var cx = width / 2;
    var cy = height / 2;
    var radius = Math.min(width, height) / 2 - 6;
    var innerRadius = radius * 0.62;

    ctx.clearRect(0, 0, width, height);

    if (totalCost <= 0 || rawArr.length === 0) {
      // 画一个灰色空环
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.lineWidth = radius - innerRadius;
      ctx.strokeStyle = '#e8e8e8';
      ctx.stroke();
      return;
    }

    var startAngle = -Math.PI / 2;
    for (var idx = 0; idx < rawArr.length; idx++) {
      var cost = parseFloat(rawArr[idx]._cost) || 0;
      var angle = (cost / totalCost) * 2 * Math.PI;
      var endAngle = startAngle + angle;

      ctx.beginPath();
      ctx.arc(cx, cy, (radius + innerRadius) / 2, startAngle, endAngle);
      ctx.lineWidth = radius - innerRadius;
      ctx.strokeStyle = colors[idx % colors.length];
      ctx.lineCap = 'butt';
      ctx.stroke();

      startAngle = endAngle;
    }
  },

  deleteGoods(e) {
    var idx = e.currentTarget.dataset.index;
    var row = this.data.rawArr[idx];
    if (!row) return;
    var name = row.gbDfgGoodsName || '该配料';
    var that = this;
    wx.showModal({
      title: row._isPreparation ? '删除中间料' : '删除配料',
      content: '确定删除「' + name + '」吗？',
      confirmText: '删除',
      confirmColor: '#ff3b30',
      success(res) {
        if (res.confirm) {
          that._doDeleteGoods(idx);
        }
      },
    });
  },

  _doDeleteGoods(idx) {
    var row = this.data.rawArr[idx];
    if (!row) return;
    if (row._isVersioned) {
      var components = this.data.versionedComponents.slice();
      components.splice(Number(row._componentIndex), 1);
      if (!components.length) {
        wx.showToast({ title: '菜品配方至少保留一项', icon: 'none' });
        return;
      }
      if (this.data.versionEditorMode) {
        this._applyVersionDraftComponents(components, {
          changeType: 'REMOVE',
          replacedRawGoodsId: row._isPreparation ? null : Number(row.gbDfgDisGoodsId),
        });
        return;
      }
      this._saveAndPublishComponents(components, '删除中', {
        changeType: 'REMOVE',
        replacedRawGoodsId: row._isPreparation ? null : Number(row.gbDfgDisGoodsId),
      });
      return;
    }
    var id = row.gbDistributerFoodGoodsId;
    if (!id) {
      var rawArr = this.data.rawArr.slice();
      rawArr.splice(idx, 1);
      this._processRawArr(rawArr);
      return;
    }
    load.showLoading('删除原料');
    deleteGbFoodGoods(id).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        var rawArr = this.data.rawArr;
        rawArr.splice(rawArr.findIndex(function (item) {
          return item.gbDistributerFoodGoodsId === id;
        }), 1);
        this._processRawArr(rawArr);
      } else {
        wx.showToast({ title: res.result.msg || '删除失败', icon: 'none' });
      }
    }).catch(function () {
      load.hideLoading();
      wx.showToast({ title: '删除失败', icon: 'none' });
    });
  },

  editGoods(e) {
    var item = e.currentTarget.dataset.item;
    if (item && item._isPreparation) {
      this.editPreparation(item);
      return;
    }
    var entity = _getGoodsEntity(item);
    this.setData({
      modalType: 'edit',
      editGoods: item,
      showFood: true,
      isSearching: false,
      strArr: [],
      searchKeyword: item.gbDfgGoodsName || '',
    });
    var display = _convertPackToMinUnitForDisplay(
      item.gbDfgGoodsAmount,
      item.gbDfgGoodsStandardname,
      entity,
      item
    );
    this._setModalGoods(entity, display.portion, display.minUnit, display.packQtyInMin);
  },

  toAddGoods(e) {
    var that = this;
    this._resetModalForm();
    this.setData({
      modalType: 'add',
      showFood: true,
      isSearching: false,
      strArr: [],
      goodsName: "",
      amount: "",
      standardName: "",
      searchKeyword: '',
      editGoods: null,
    }, function () {
      that._syncFoodSearchModalLayout();
    });
  },

  toAddPreparation() {
    this.setData({
      showPreparation: true,
      preparationLoading: true,
      preparationKeyword: '',
      selectedPreparation: null,
      preparationAmount: '50',
      preparationAmountUnit: 'G',
      preparationAmountUnitLabel: 'g',
      preparationModalType: 'add',
      preparationEditIndex: -1,
    });
    this._loadPreparationProducts();
  },

  _loadPreparationProducts() {
    var that = this;
    var selectedIds = {};
    (this.data.versionedComponents || []).forEach(function (component) {
      if (component.itemKind === 'INTERMEDIATE_PRODUCT') {
        selectedIds[String(component.intermediateProductId)] = true;
      }
    });
    preparationApi.listStoreProducts('ENABLED').then(function (rows) {
      var massRows = (rows || []).filter(function (row) {
        return !selectedIds[String(row.id)] &&
          ['G', 'KG', 'JIN'].indexOf(String(row.usageUnitCode || '').toUpperCase()) >= 0;
      });
      return Promise.all(massRows.map(function (row) {
        return preparationApi.getStoreRecipe(row.id).then(function (recipe) {
          recipe = recipe || {};
          var ingredients = recipe.components || [];
          var outputQuantity = Number(recipe.standardOutputQuantity);
          return Object.assign({}, row, {
            canSelect: !!row.recipeConfigured && ingredients.length > 0 && outputQuantity > 0,
            ingredientCount: ingredients.length,
            standardOutputText: preparationUtil.formatNumber(outputQuantity, 3) + ' ' +
              _fromP1Unit(recipe.standardOutputUnitCode || row.usageUnitCode),
          });
        }).catch(function () {
          return Object.assign({}, row, { canSelect: false });
        });
      }));
    }).then(function (rows) {
      var selectableRows = (rows || []).filter(function (row) {
        return row.canSelect;
      });
      that.setData({
        preparationLoading: false,
        preparationProducts: selectableRows,
        filteredPreparationProducts: selectableRows,
      });
    }).catch(function (error) {
      that.setData({ preparationLoading: false });
      preparationUtil.showError(error);
    });
  },

  onPreparationKeywordInput(e) {
    var keyword = String(e.detail.value || '').trim().toLowerCase();
    var rows = (this.data.preparationProducts || []).filter(function (row) {
      if (!keyword) return true;
      return String(row.productName || '').toLowerCase().indexOf(keyword) >= 0 ||
        String(row.productCode || '').toLowerCase().indexOf(keyword) >= 0;
    });
    this.setData({
      preparationKeyword: e.detail.value || '',
      filteredPreparationProducts: rows,
    });
  },

  selectPreparation(e) {
    this.dismissKeyboard();
    var product = e.currentTarget.dataset.item;
    if (!product) return;
    var duplicate = (this.data.versionedComponents || []).some(function (component) {
      return component.itemKind === 'INTERMEDIATE_PRODUCT' &&
        Number(component.intermediateProductId) === Number(product.id);
    });
    if (!this.data.versionedMode) {
      duplicate = (this.data.rawArr || []).some(function (row) {
        return row._isPreparation &&
          Number(row._recipeComponent.intermediateProductId) === Number(product.id);
      });
    }
    if (duplicate) {
      wx.showToast({ title: '该中间料已经添加', icon: 'none' });
      return;
    }
    this.setData({
      selectedPreparation: product,
      preparationAmount: '50',
      preparationAmountUnit: 'G',
      preparationAmountUnitLabel: 'g',
    });
  },

  onPreparationAmountInput(e) {
    this.setData({ preparationAmount: e.detail.value });
  },

  onPreparationAmountMinus() {
    this.dismissKeyboard();
    var current = Number(this.data.preparationAmount) || 0;
    var next = Math.max(1, current - 1);
    this.setData({ preparationAmount: String(next) });
  },

  onPreparationAmountPlus() {
    this.dismissKeyboard();
    var current = Number(this.data.preparationAmount) || 0;
    this.setData({ preparationAmount: String(current + 1) });
  },

  clearSelectedPreparation() {
    if (this.data.preparationModalType === 'edit') return;
    this.dismissKeyboard();
    this.setData({ selectedPreparation: null, preparationAmount: '50', preparationAmountUnit: 'G', preparationAmountUnitLabel: 'g' });
  },

  cancelPreparation() {
    this.dismissKeyboard();
    this.setData({
      showPreparation: false,
      selectedPreparation: null,
      preparationKeyword: '',
      preparationProducts: [],
      filteredPreparationProducts: [],
      preparationAmountUnit: 'G',
      preparationAmountUnitLabel: 'g',
      preparationModalType: 'add',
      preparationEditIndex: -1,
    });
  },

  editPreparation(row) {
    this.setData({
      showPreparation: true,
      preparationLoading: false,
      selectedPreparation: row._preparationProduct || {
        id: row._recipeComponent.intermediateProductId,
        productName: row.gbDfgGoodsName,
      },
      preparationAmount: String(row._displayAmount || ''),
      preparationAmountUnit: 'G',
      preparationAmountUnitLabel: 'g',
      preparationModalType: 'edit',
      preparationEditIndex: Number(row._componentIndex),
    });
  },

  confirmPreparation() {
    this.dismissKeyboard();
    var product = this.data.selectedPreparation;
    var amount = Number(this.data.preparationAmount);
    if (!product) {
      wx.showToast({ title: '请先选择中间料', icon: 'none' });
      return;
    }
    if (!(amount > 0)) {
      wx.showToast({ title: '请输入菜品每份用量', icon: 'none' });
      return;
    }
    var components = this._currentP1Components();
    var component = {
      itemKind: 'INTERMEDIATE_PRODUCT',
      intermediateProductId: Number(product.id),
      intermediateProductName: product.productName || '',
      quantityPerPortion: amount,
      inputUnitCode: this.data.preparationAmountUnit || 'G',
    };
    if (this.data.preparationModalType === 'edit') {
      components.splice(this.data.preparationEditIndex, 1, component);
    } else {
      components.push(component);
    }
    if (this.data.versionEditorMode) {
      this._applyVersionDraftComponents(components, { changeType: 'QUANTITY' });
      return;
    }
    this._saveAndPublishComponents(components, '保存中间料', { changeType: 'QUANTITY' });
  },

  _currentP1Components() {
    if (this.data.versionedMode) {
      return (this.data.versionedComponents || []).map(function (component) {
        var normalized = {
          itemKind: component.itemKind,
          rawGoodsId: component.itemKind === 'RAW_GOODS'
            ? Number(component.rawGoodsId)
            : undefined,
          intermediateProductId: component.itemKind === 'INTERMEDIATE_PRODUCT'
            ? Number(component.intermediateProductId)
            : undefined,
          quantityPerPortion: Number(component.quantityPerPortion),
          inputUnitCode: String(component.inputUnitCode || '').toUpperCase(),
        };
        if (component.rawGoods) normalized.rawGoods = component.rawGoods;
        if (component.rawGoodsName) normalized.rawGoodsName = component.rawGoodsName;
        if (component.intermediateRecipe) normalized.intermediateRecipe = component.intermediateRecipe;
        if (component.intermediateProductName) {
          normalized.intermediateProductName = component.intermediateProductName;
        }
        return normalized;
      });
    }
    return (this.data.rawArr || []).map(_legacyRawToP1Component);
  },

  /**
   * 独立版本编辑页只修改本地草稿；所有改动最后一次性保存为一个新版本。
   */
  _applyVersionDraftComponents(components, changeContext) {
    var that = this;
    var existingContext = this.data.versionDraftChangeContext;
    var nextContext = changeContext || existingContext || null;
    // 新增、删除或更换属于结构变化；后续只微调用量时不能把这条业务意图冲掉。
    if (existingContext && ['ADD', 'REMOVE', 'REPLACE'].indexOf(existingContext.changeType) >= 0
      && (!changeContext || changeContext.changeType === 'QUANTITY')) {
      nextContext = existingContext;
    }
    this.setData({
      versionedComponents: components,
      versionDraftDirty: true,
      versionUsageDirty: true,
      versionDraftChangeContext: nextContext,
      versionUsagePreview: null,
      versionUsagePreviewRequest: null,
      versionUsagePreviewVersionId: null,
    });
    this.cancelPreparation();
    this._closeRawModal();
    this._decorateVersionedComponents(
      components,
      this._activeVersionCostContext
    ).then(function (displayRows) {
      that._processRawArr(displayRows);
    }).catch(function (error) {
      preparationUtil.showError(error);
    });
  },

  saveNewRecipeVersion() {
    if (!this.data.versionEditorMode || this.data.recipeSaving || this.data.versionUsageConfirming) return;
    if (this.data.versionUsagePreview) {
      this.confirmUnifiedVersionEdit();
      return;
    }
    var usagePlan = this._buildUnifiedUsagePlan();
    if (!usagePlan) return;
    var detail = this.data.versionedDetail || {};
    var version = detail.version || {};
    var context = this.data.versionDraftChangeContext || { changeType: 'QUANTITY' };
    var needsContentVersion = this.data.versionDraftDirty
      || !version.id
      || String(version.status || '').toUpperCase() !== 'PUBLISHED';
    if (needsContentVersion) {
      this._saveAndPublishComponents(
        this._currentP1Components(),
        '保存配方内容',
        context,
        usagePlan
      );
      return;
    }
    this._previewUnifiedVersionUsage(detail, usagePlan, context);
  },

  onVersionUsageStartChange(event) {
    var that = this;
    var start = event.detail.value;
    if (!Number(this.data.manageVersionId)
      && this.data.minimumNewVersionStart
      && start < this.data.minimumNewVersionStart) {
      wx.showModal({
        title: '时间范围冲突',
        content: '新版本开始日期不能早于 ' + this.data.minimumNewVersionStart
          + '，否则会与已有版本重复。',
        showCancel: false,
      });
      return;
    }
    var end = this.data.versionUsageEnd;
    if (this.data.versionUsageHasEnd && (!end || end <= start)) end = _offsetDateText(start, 1);
    this.setData({
      versionUsageStart: start,
      versionUsageEnd: end,
      versionCostBasisDate: start,
      versionUsageDirty: true,
      versionUsagePreview: null,
      versionUsagePreviewRequest: null,
      versionUsagePreviewVersionId: null,
    }, function () {
      that._refreshVersionedCostPreview(start, end);
    });
  },

  _refreshVersionedCostPreview(start, end) {
    if (!this.data.versionEditorMode) return;
    var that = this;
    var token = Date.now() + ':' + Math.random();
    this._versionCostPreviewToken = token;
    var state = { start: start, end: end || '' };
    this._loadVersionCostContext(state, this.data.currentRecipeVersionView).then(function (context) {
      if (that._versionCostPreviewToken !== token) return null;
      that._activeVersionCostContext = context;
      that.setData({
        versionCostBasisDate: start,
        versionCostScopeText: context.scopeText || '',
      });
      return that._decorateVersionedComponents(that.data.versionedComponents || [], context);
    }).then(function (rows) {
      if (!rows) return;
      if (that._versionCostPreviewToken !== token) return;
      that._processRawArr(rows);
    }).catch(function (error) {
      if (that._versionCostPreviewToken !== token) return;
      preparationUtil.showError(error);
    });
  },

  onVersionUsageEndChange(event) {
    var that = this;
    var end = event.detail.value;
    this.setData({
      versionUsageEnd: end,
      versionUsageDirty: true,
      versionUsagePreview: null,
      versionUsagePreviewRequest: null,
      versionUsagePreviewVersionId: null,
    }, function () {
      that._refreshVersionedCostPreview(that.data.versionUsageStart, end);
    });
  },

  chooseVersionUsageDuration(event) {
    var that = this;
    var enabled = String(event.currentTarget.dataset.hasEnd || '') === '1';
    var today = _todayText();
    var earliestEnd = _offsetDateText(this.data.versionUsageStart, 1);
    var end = enabled ? (today > this.data.versionUsageStart ? today : earliestEnd) : '';
    this.setData({
      versionUsageHasEnd: enabled,
      versionUsageEnd: end,
      versionUsageDirty: true,
      versionUsagePreview: null,
      versionUsagePreviewRequest: null,
      versionUsagePreviewVersionId: null,
    }, function () {
      that._refreshVersionedCostPreview(that.data.versionUsageStart, end);
    });
  },

  onVersionUsageReasonInput(event) {
    this.setData({
      versionUsageReason: event.detail.value,
      versionUsageDirty: true,
      versionUsagePreview: null,
      versionUsagePreviewRequest: null,
      versionUsagePreviewVersionId: null,
    });
  },

  toggleVersionUsageReasonDetail() {
    this.setData({ versionUsageNewReasonExpanded: !this.data.versionUsageNewReasonExpanded });
  },

  _buildUnifiedUsagePlan() {
    var creatingVersion = !Number(this.data.manageVersionId);
    var reason = String(this.data.versionUsageReason || '').trim();
    if (creatingVersion && !reason) reason = '新增配方版本并设置门店使用时间';
    var end = this.data.versionUsageHasEnd ? this.data.versionUsageEnd : null;
    var start = this.data.versionUsageStart;
    if (!start) {
      wx.showToast({ title: '请选择开始营业日', icon: 'none' });
      return null;
    }
    if (!reason) {
      wx.showToast({ title: '请填写本次修改原因', icon: 'none' });
      return null;
    }
    if (end && end <= start) {
      wx.showToast({ title: '停止日期必须晚于开始日期', icon: 'none' });
      return null;
    }
    var minimumStart = this.data.minimumNewVersionStart;
    if (creatingVersion && minimumStart && start < minimumStart) {
      wx.showModal({
        title: '时间范围冲突',
        content: '新版本开始日期不能早于 ' + minimumStart
          + '，否则会与已有版本重复。',
        showCancel: false,
      });
      return null;
    }
    if (!creatingVersion) {
      var managedIntervalId = Number(this.data.managedIntervalId || 0);
      var conflict = (this.data.recipeTimeline || []).find(function (row) {
        if (Number(row.id) === managedIntervalId) return false;
        return _recipeIntervalsOverlap(
          start,
          end,
          _recipeDateText(row.effectiveStart),
          _recipeDateText(row.effectiveEnd)
        );
      });
      if (conflict) {
        var conflictVersion = (this.data.recipeVersionHistory || []).find(function (row) {
          return Number(row.id) === Number(conflict.recipeVersionId);
        });
        wx.showModal({
          title: '时间范围冲突',
          content: '所选时间与 V' + ((conflictVersion && conflictVersion.versionNo) || '?')
            + ' 的使用时间重复，请调整开始日期或停止日期。',
          showCancel: false,
        });
        return null;
      }
    }
    var targetIntervalId = this.data.versionDraftDirty ? null : this.data.managedIntervalId;
    if (!this.data.versionDraftDirty && targetIntervalId
      && start === this.data.managedIntervalOriginalStart
      && (end || '') === (this.data.managedIntervalOriginalEnd || '')) {
      wx.showToast({ title: '请先修改使用时间或配料', icon: 'none' });
      return null;
    }
    var today = _todayText();
    var originalStart = targetIntervalId ? this.data.managedIntervalOriginalStart : '';
    var affectsPast = start < today || (originalStart && originalStart < today);
    var operation = affectsPast
      ? 'HISTORICAL_CORRECTION'
      : (targetIntervalId
        ? 'ADJUST_INTERVAL'
        : (start <= today && !end ? 'SET_CURRENT' : 'ADD_INTERVAL'));
    return {
      operation: operation,
      targetIntervalId: targetIntervalId || null,
      effectiveStart: start,
      effectiveEnd: end,
      reason: reason,
    };
  },

  _previewUnifiedVersionUsage(detail, usagePlan, changeContext) {
    var that = this;
    var identity = this.preparationIdentity || preparationUtil.getIdentity();
    var version = detail && detail.version;
    var recipe = detail && detail.recipe;
    if (!version || !recipe) {
      wx.showToast({ title: '配方版本信息不完整', icon: 'none' });
      return;
    }
    var request = {
      distributerId: identity.distributerId,
      storeDepartmentId: identity.currentStoreId,
      targetIntervalId: usagePlan.targetIntervalId || null,
      effectiveStart: usagePlan.effectiveStart,
      effectiveEnd: usagePlan.effectiveEnd || null,
      businessOperation: usagePlan.operation,
      adjustmentReason: usagePlan.reason,
      operatorId: identity.operatorId,
    };
    this.setData({ recipeSaving: true });
    wx.showLoading({ title: '计算影响范围', mask: true });
    var replacementRequest = null;
    if (changeContext && changeContext.changeType === 'REPLACE') {
      var oldEvidence = changeContext.oldGoods && changeContext.oldGoods.evidence;
      var newEvidence = changeContext.newGoods && changeContext.newGoods.evidence;
      if (!oldEvidence || !newEvidence
        || !oldEvidence.purchaseUnitCode || !newEvidence.purchaseUnitCode) {
        wx.hideLoading();
        this.setData({ recipeSaving: false });
        wx.showToast({ title: '新旧商品包装规格不完整', icon: 'none' });
        return;
      }
      replacementRequest = {
        distributerId: identity.distributerId,
        storeDepartmentId: identity.currentStoreId,
        replacedRawGoodsId: Number(changeContext.replacedRawGoodsId),
        replacementRawGoodsId: Number(changeContext.newRawGoodsId),
        effectiveStart: usagePlan.effectiveStart,
        effectiveEnd: usagePlan.effectiveEnd || null,
        replacedPurchaseUnitCode: oldEvidence.purchaseUnitCode,
        replacementPurchaseUnitCode: newEvidence.purchaseUnitCode,
        sourceRecipeVersionId: Number(version.id),
        adjustmentReason: usagePlan.reason,
        operatorId: identity.operatorId,
      };
    }
    Promise.all([
      preparationApi.previewFoodEffectiveInterval(recipe.id, version.id, request),
      replacementRequest
        ? preparationApi.previewRawGoodsReplacement(replacementRequest)
        : Promise.resolve(null),
    ]).then(function (results) {
        var preview = results[0];
        var replacementPreview = results[1];
        preview.supersededIntervalIds = preview.supersededIntervalIds || [];
        wx.hideLoading();
        var versionById = {};
        (that.data.recipeVersionHistory || []).forEach(function (row) {
          versionById[String(row.id)] = row;
        });
        versionById[String(version.id)] = version;
        var afterTimeline = (preview.afterTimeline || []).map(function (row, index) {
          var matched = versionById[String(row.recipeVersionId)] || {};
          return Object.assign({}, row, {
            _key: String(row.id || 'new') + ':' + index,
            _versionLabel: 'V' + (row.versionNo || matched.versionNo || '?'),
            _periodText: _recipeDateText(row.effectiveStart) + ' 起 · '
              + (row.effectiveEnd ? _recipeDateText(row.effectiveEnd) + ' 起停止' : '持续使用'),
          });
        });
        var impact = preview.costImpact || {};
        var totalRecords = Number(impact.affectedSalesRecordCount || 0);
        var oldCost = impact.oldCost || {};
        var newCost = impact.newCost || {};
        var oldIncomplete = Number(oldCost.missingBusinessDateCount || 0);
        var newIncomplete = Number(newCost.missingBusinessDateCount || 0);
        impact._salesText = _recipeNumberText(impact.salesQuantity) + ' 份';
        // 原、新两侧完全按各自结构化状态展示，不互相回退。
        impact._oldCostText = oldCost.status === 'COMPLETE'
          ? _recipeMoneyText(oldCost.completeCostAmount)
          : (oldCost.status === 'PARTIAL'
            ? '已知 ' + _recipeMoneyText(oldCost.knownCostAmount) : '无法取得');
        impact._newCostText = newCost.status === 'COMPLETE'
          ? _recipeMoneyText(newCost.completeCostAmount)
          : (newCost.status === 'PARTIAL'
            ? '已知 ' + _recipeMoneyText(newCost.knownCostAmount) : '无法取得');
        impact._differenceText = oldCost.status !== 'COMPLETE' || newCost.status !== 'COMPLETE'
          ? '无法比较' : _recipeMoneyText(impact.completeCostDifference);
        impact._oldCostNote = oldCost.status === 'PARTIAL'
          ? '原成本部分日期缺少依据：完整 '
            + Number(oldCost.completeBusinessDateCount || 0) + ' 天，缺失 ' + oldIncomplete + ' 天。'
          : (oldCost.status === 'UNAVAILABLE' && totalRecords
            ? '原成本缺少依据：' + oldIncomplete + ' 个营业日均未算全。' : '');
        impact._newCostNote = newCost.status === 'PARTIAL'
          ? '新成本部分日期缺少依据：完整 '
            + Number(newCost.completeBusinessDateCount || 0) + ' 天，缺失 ' + newIncomplete + ' 天。'
          : (newCost.status === 'UNAVAILABLE' && totalRecords
            ? '新成本缺少依据：' + newIncomplete + ' 个营业日均未算全。' : '');
        impact._differenceNote = impact._differenceText === '无法比较'
          ? '成本差额无法比较：原完整成本或新完整成本未算全。'
          : '';
        var newReasonGroups = _recipeNewMissingReasonGroups(newCost.missingReasons || []);
        impact._newReasonGroups = newReasonGroups.map(function (group) {
          return _recipeReasonGroupView(group, 10);
        });
        impact._newReasonGroupsBrief = newReasonGroups.map(function (group) {
          return _recipeReasonGroupView(group, 3);
        });
        impact._newReasonExpandable = newReasonGroups.length > 2
          || newReasonGroups.some(function (group) { return group.dates.length > 3; });
        impact._newDetailTruncated = newCost.missingReasonsTruncated === true;
        impact._dateText = impact.actualBusinessDateStart
          ? _recipeDateText(impact.actualBusinessDateStart) + ' 至 '
            + _recipeDateText(impact.actualBusinessDateEnd) + '（不含）'
          : '该范围内暂无已导入销量';
        preview.costImpact = impact;
        preview._affectedText = _recipeDateText(preview.affectedEffectiveStart) + ' 至 '
          + (preview.affectedEffectiveEnd
            ? _recipeDateText(preview.affectedEffectiveEnd) + '（不含）' : '以后');
        preview._afterTimeline = afterTimeline;
        preview._gapCount = (preview.gaps || []).length;
        var creatingVersion = !Number(that.data.manageVersionId);
        that.setData({
          recipeSaving: false,
          versionUsageNewReasonExpanded: false,
          versionUsagePreview: preview,
          versionUsagePreviewRequest: request,
          versionUsagePreviewVersionId: Number(version.id),
          versionUsageReplacementPreview: replacementPreview,
          versionUsageReplacementRequest: replacementRequest,
          versionedDetail: detail,
          versionDraftChangeContext: changeContext || null,
        }, function () {
          // 新建没有旧内容需要用户比较：预览令牌仅作为后端一致性校验，页面自动确认。
          if (creatingVersion) that.confirmUnifiedVersionEdit();
        });
      }).catch(function (error) {
        wx.hideLoading();
        that.setData({ recipeSaving: false });
        preparationUtil.showError(error);
      });
  },

  confirmUnifiedVersionEdit() {
    var that = this;
    var preview = this.data.versionUsagePreview;
    var request = this.data.versionUsagePreviewRequest;
    var replacementPreview = this.data.versionUsageReplacementPreview;
    var replacementRequest = this.data.versionUsageReplacementRequest;
    var detail = this.data.versionedDetail || {};
    var versionId = Number(this.data.versionUsagePreviewVersionId || 0);
    if (!preview || !preview.previewToken || !request || !detail.recipe || !versionId) {
      wx.showToast({ title: '请先预览影响', icon: 'none' });
      return;
    }
    this.setData({ versionUsageConfirming: true });
    wx.showLoading({ title: '保存并更新成本', mask: true });
    var recipeConfirmRequest = Object.assign({}, request, {
      expectedTimelineRevision: preview.timelineRevision,
      expectedPreviewToken: preview.previewToken,
    });
    var confirmPromise;
    if (replacementRequest) {
      if (!replacementPreview || !replacementPreview.previewToken) {
        this.setData({ versionUsageConfirming: false, versionUsagePreview: null });
        wx.hideLoading();
        wx.showToast({ title: '请重新预览包装替换影响', icon: 'none' });
        return;
      }
      confirmPromise = preparationApi.confirmFoodEffectiveIntervalWithReplacement(
        detail.recipe.id,
        versionId,
        {
          recipeInterval: recipeConfirmRequest,
          rawGoodsReplacement: Object.assign({}, replacementRequest, {
            expectedTimelineRevision: replacementPreview.timelineRevision,
            expectedPreviewToken: replacementPreview.previewToken,
          }),
        }
      );
    } else {
      confirmPromise = preparationApi.confirmFoodEffectiveInterval(
        detail.recipe.id,
        versionId,
        recipeConfirmRequest
      );
    }
    confirmPromise.then(function (result) {
      var intervalResult = result && result.recipeInterval ? result.recipeInterval : result;
      var requestId = intervalResult && intervalResult.recalculationRequestId;
      var appliedId = Number(intervalResult && intervalResult.appliedContentVersionId || 0);
      var applicationStatus = String(intervalResult && intervalResult.applicationStatus || '');
      var identity = that.preparationIdentity || preparationUtil.getIdentity();
      // 实际写入区间的修订必须与预览的修订一致，避免把新内容挂到别的修订上。
      if (appliedId && appliedId !== Number(versionId)) {
        wx.hideLoading();
        that.setData({ versionUsageConfirming: false, versionUsagePreview: null });
        wx.showModal({
          title: '适用时间写入的修订不一致',
          content: '预览的内容修订是 #' + versionId + '，实际写入的是 #' + appliedId + '，请返回列表确认。',
          showCancel: false,
        });
        return;
      }
      return preparationApi.waitForDishCostRecalculation(
        requestId,
        identity.distributerId,
        30
      ).then(function (recalculation) {
        wx.hideLoading();
        var status = String(recalculation && recalculation.status || '');
        var failed = Number(recalculation && recalculation.failedGrainCount || 0);
        // 只有 COMPLETED 且失败数为 0 才算完成；其余都不得把新内容与旧成本组合展示。
        if (status === 'FAILED' || status === 'COMPLETED_WITH_FAILURES'
          || (status === 'COMPLETED' && failed > 0)) {
          that.setData({ versionUsageConfirming: false, versionUsageDirty: false });
          wx.showModal({
            title: '成本更新未全部完成',
            content: '配方使用时间已保存，但有 ' + failed + ' 条成本更新失败，被替代的旧版本暂未删除。',
            showCancel: false,
            success: function () { wx.navigateBack({ delta: 1 }); },
          });
          return;
        }
        if (status !== 'COMPLETED') {
          that.setData({ versionUsageConfirming: false, versionUsageDirty: false });
          wx.showModal({
            title: '成本仍在更新',
            content: '系统尚未确认成本全部完成（状态 ' + (status || '未知') + '），请稍后刷新查看。',
            showCancel: false,
            success: function () { wx.navigateBack({ delta: 1 }); },
          });
          return;
        }
        if (recalculation && (recalculation.pollTimedOut || status === 'QUERY_FAILED')) {
          that.setData({ versionUsageConfirming: false, versionUsageDirty: false });
          wx.showModal({
            title: '成本仍在更新',
            content: '配方使用时间已保存，系统尚未确认成本全部完成，旧版本暂不删除，请稍后刷新查看。',
            showCancel: false,
            success: function () { wx.navigateBack({ delta: 1 }); },
          });
          return;
        }
      if (replacementRequest) {
        wx.removeStorageSync(RECIPE_REPLACEMENT_CONTEXT_PREFIX + String(versionId));
      }
      that.setData({ versionUsageConfirming: false, versionUsageDirty: false });
      var completed = Number(recalculation && recalculation.completedGrainCount || 0);
      wx.showToast({
        title: completed ? '已保存并重算' + completed + '条' : '配方已保存',
        icon: 'success',
      });
      setTimeout(function () { wx.navigateBack({ delta: 1 }); }, 450);
      });
    }).catch(function (error) {
      wx.hideLoading();
      that.setData({
        versionUsageConfirming: false,
        versionUsagePreview: null,
        versionUsagePreviewRequest: null,
        versionUsagePreviewVersionId: null,
        versionUsageReplacementPreview: null,
        versionUsageReplacementRequest: null,
      });
      preparationUtil.showError(error);
    });
  },

  _validateP1Components(components) {
    var identity = this.preparationIdentity || preparationUtil.getIdentity();
    var invalid = (components || []).find(function (component) {
      var id = component.itemKind === 'INTERMEDIATE_PRODUCT'
        ? component.intermediateProductId
        : component.rawGoodsId;
      return !(Number(id) > 0) ||
        !(Number(component.quantityPerPortion) > 0) ||
        !String(component.inputUnitCode || '').trim();
    });
    if (invalid) {
      return Promise.reject({
        preparationError: true,
        status: 400,
        message: '配方中存在用量或单位不完整的项目',
      });
    }
    return Promise.all((components || []).map(function (component) {
      var unit = String(component.inputUnitCode || '').toUpperCase();
      if (P1_STANDARD_UNITS.indexOf(unit) >= 0) return Promise.resolve();
      var params = {
        distributerId: identity.distributerId,
        itemKind: component.itemKind,
      };
      if (component.itemKind === 'INTERMEDIATE_PRODUCT') {
        params.intermediateProductId = component.intermediateProductId;
      } else {
        params.rawGoodsId = component.rawGoodsId;
      }
      return preparationApi.listConversions(params).then(function (conversions) {
        var valid = (conversions || []).some(function (conversion) {
          return Number(conversion.enabled) !== 0 &&
            String(conversion.unitCode || '').toUpperCase() === unit;
        });
        if (!valid) {
          return Promise.reject({
            preparationError: true,
            status: 400,
            message: '原配料单位“' + unit + '”尚未配置换算关系，不能安全升级配方',
          });
        }
      });
    }));
  },

  _rawGoodsEvidenceFromRow(row) {
    if (!row || row._isPreparation) return null;
    var goods = _getGoodsEntity(row);
    var display = _convertPackToMinUnitForDisplay(
      row.gbDfgGoodsAmount,
      row.gbDfgGoodsStandardname,
      goods,
      row
    );
    var ctx = _buildUnitContext(goods, {
      minUnit: display.minUnit,
      packQtyInMin: display.packQtyInMin,
    });
    return _rawGoodsPurchaseEvidence(goods, display.minUnit, ctx.packQtyInMin);
  },

  _ensureOneRawGoodsConversion(evidence) {
    var identity = this.preparationIdentity || preparationUtil.getIdentity();
    if (!evidence || !(evidence.rawGoodsId > 0) || !evidence.purchaseUnitCode
      || !evidence.dimension || !(Number(evidence.factorToBase) > 0)) {
      return Promise.reject({
        preparationError: true,
        status: 400,
        message: '配料采购规格不完整，请先补齐包装单位和规格重量',
      });
    }
    if (P1_STANDARD_UNITS.indexOf(evidence.purchaseUnitCode) >= 0) {
      return Promise.resolve(evidence);
    }
    return preparationApi.listConversions({
      distributerId: identity.distributerId,
      itemKind: 'RAW_GOODS',
      rawGoodsId: evidence.rawGoodsId,
    }).then(function (conversions) {
      var existing = (conversions || []).find(function (row) {
        return String(row.unitCode || '').toUpperCase()
          === String(evidence.purchaseUnitCode || '').toUpperCase();
      });
      var same = existing
        && String(existing.dimension || '').toUpperCase() === evidence.dimension
        && Math.abs(Number(existing.factorToBase) - Number(evidence.factorToBase)) < 0.000001;
      if (same) return evidence;
      return preparationApi.saveConversion({
        distributerId: identity.distributerId,
        itemKind: 'RAW_GOODS',
        rawGoodsId: evidence.rawGoodsId,
        unitCode: evidence.purchaseUnitCode,
        dimension: evidence.dimension,
        factorToBase: evidence.factorToBase,
        rowVersion: existing ? Number(existing.rowVersion || 0) : 0,
        operatorId: identity.operatorId,
      }).then(function () { return evidence; });
    });
  },

  /**
   * 发布配方前持久化采购包装换算。历史价格按入库采购单位解析，不能只在页面内存里知道
   * “1瓶=500ml”，否则营业日成本会进入缺少单位换算状态。
   */
  _ensureRawGoodsConversions(components, changeContext) {
    var that = this;
    var evidenceByGoodsId = {};
    (this.data.rawArr || []).forEach(function (row) {
      var evidence = that._rawGoodsEvidenceFromRow(row);
      if (evidence && evidence.rawGoodsId > 0) {
        evidenceByGoodsId[String(evidence.rawGoodsId)] = evidence;
      }
    });
    [changeContext && changeContext.oldGoods, changeContext && changeContext.newGoods]
      .forEach(function (value) {
        if (value && value.evidence && value.evidence.rawGoodsId > 0) {
          evidenceByGoodsId[String(value.evidence.rawGoodsId)] = value.evidence;
        }
      });

    var rawGoodsIds = [];
    (components || []).forEach(function (component) {
      if (component.itemKind === 'RAW_GOODS' && Number(component.rawGoodsId) > 0
        && rawGoodsIds.indexOf(Number(component.rawGoodsId)) < 0) {
        rawGoodsIds.push(Number(component.rawGoodsId));
      }
    });
    if (changeContext && changeContext.changeType === 'REPLACE'
      && Number(changeContext.replacedRawGoodsId) > 0
      && rawGoodsIds.indexOf(Number(changeContext.replacedRawGoodsId)) < 0) {
      rawGoodsIds.push(Number(changeContext.replacedRawGoodsId));
    }

    return Promise.all(rawGoodsIds.map(function (rawGoodsId) {
      var known = evidenceByGoodsId[String(rawGoodsId)];
      if (known) return that._ensureOneRawGoodsConversion(known);
      return preparationApi.getRawGoods(rawGoodsId).then(function (goods) {
        var minUnit = stockUnit.suggestMinUnit(
          goods.gbDgGoodsStandardname,
          stockUnit.rawPackSpecAmount(goods),
          goods
        );
        var packQty = stockUnit.resolvePackQtyInMin(
          goods.gbDgGoodsStandardname,
          minUnit,
          goods
        );
        return that._ensureOneRawGoodsConversion(
          _rawGoodsPurchaseEvidence(goods, minUnit, packQty)
        );
      });
    }));
  },

  _saveAndPublishComponents(components, loadingText, changeContext, usagePlan) {
    var that = this;
    var identity = this.preparationIdentity || preparationUtil.getIdentity();
    var activeChangeContext = changeContext || this.data.versionDraftChangeContext || null;
    if (this.data.recipeSaving) return;
    if (!identity.distributerId || !identity.operatorId) {
      wx.showToast({ title: '当前登录身份不完整', icon: 'none' });
      return;
    }
    if (!components.length) {
      wx.showToast({ title: '菜品配方至少保留一项', icon: 'none' });
      return;
    }
    this.setData({ recipeSaving: true });
    load.showLoading(loadingText || '保存配方');
    this._ensureRawGoodsConversions(components, activeChangeContext)
      .then(function () { return that._validateP1Components(components); })
      .then(function () {
      if (that.data.versionedMode) {
        return that._loadEditableVersionedDetail();
      }
      return preparationApi.getFoodDetail(that.data.foodId).then(function (latestFood) {
        if (!latestFood) {
          return Promise.reject({
            preparationError: true,
            status: 404,
            message: '菜品不存在，请刷新后重试',
          });
        }
        var foodItem = that._normalizeFoodItem(latestFood);
        var latestVersioned = latestFood.gbDfRecipeModel === 'VERSIONED';
        wx.setStorageSync('Food', foodItem);
        that.setData({
          foodItem: foodItem,
          versionedMode: latestVersioned,
        });

        // 页面仍显示旧配方、后台却已升级时，先刷新而不是覆盖现有新版草稿。
        if (latestVersioned) {
          return that._fetchVersionedRecipe().then(function () {
            return Promise.reject({
              preparationError: true,
              status: 409,
              message: '菜品配方已更新，请重新选择中间料后保存',
            });
          });
        }

        wx.setStorageSync(PREPARATION_MIGRATION_CACHE_PREFIX + that.data.foodId, {
          foodId: that.data.foodId,
          savedAt: Date.now(),
          components: components,
        });
        return preparationApi.enableVersionedFood(that.data.foodId, {
          distributerId: identity.distributerId,
          foodRowVersion: Number(latestFood.gbDfRecipeRowVersion || 0),
          operatorId: identity.operatorId,
        }).then(function (detail) {
          var enabledFoodItem = Object.assign({}, foodItem, {
            gbDfRecipeModel: 'VERSIONED',
            gbDfRecipeRowVersion: Number(latestFood.gbDfRecipeRowVersion || 0) + 1,
          });
          wx.setStorageSync('Food', enabledFoodItem);
          that.setData({
            foodItem: enabledFoodItem,
            versionedMode: true,
            versionedDetail: detail,
            versionedComponents: components,
          });
          return detail;
        });
      });
    }).then(function (detail) {
      if (!detail) return null;
      if (detail.version && detail.version.status === 'DRAFT') return detail;
      if (!detail.version) {
        // 查询接口保持只读；真正保存时才通过正式业务入口补建空草稿。
        // 这里不刷新页面配方，避免后端空草稿覆盖用户刚刚填写的 components。
        return preparationApi.getFoodDetail(that.data.foodId).then(function (latestFood) {
          if (!latestFood || latestFood.gbDfRecipeModel !== 'VERSIONED') {
            return Promise.reject({
              preparationError: true,
              status: 409,
              message: '菜品配方状态已变化，请刷新后重试',
            });
          }
          return preparationApi.enableVersionedFood(that.data.foodId, {
            distributerId: identity.distributerId,
            foodRowVersion: Number(latestFood.gbDfRecipeRowVersion || 0),
            operatorId: identity.operatorId,
          });
        }).then(function (createdDetail) {
          if (createdDetail && createdDetail.version
            && createdDetail.version.status === 'DRAFT') {
            return createdDetail;
          }
          return Promise.reject({
            preparationError: true,
            status: 409,
            message: '暂时无法创建配方草稿，请重试',
          });
        });
      }
      return preparationApi.foodVersionAction(
        detail.recipe.id,
        detail.version.id,
        that.data.versionEditorMode && Number(that.data.manageVersionId) > 0 ? 'revise' : 'copy',
        that._versionActionBody(detail)
      );
    }).then(function (draftDetail) {
      if (!draftDetail) return null;
      return preparationApi.saveFoodDraft(
        draftDetail.recipe.id,
        draftDetail.version.id,
        {
          distributerId: identity.distributerId,
          recipeRowVersion: draftDetail.recipe.rowVersion,
          versionRowVersion: draftDetail.version.rowVersion,
          components: components,
          changeType: (activeChangeContext && activeChangeContext.changeType) || 'QUANTITY',
          changeReason: usagePlan && usagePlan.reason
            ? usagePlan.reason : '更新配方内容',
          operatorId: identity.operatorId,
        }
      );
    }).then(function (savedDetail) {
      if (!savedDetail) return null;
      return preparationApi.foodVersionAction(
        savedDetail.recipe.id,
        savedDetail.version.id,
        'publish',
        that._versionActionBody(savedDetail)
      );
    }).then(function (publishedDetail) {
      if (!publishedDetail) {
        that.setData({ recipeSaving: false });
        load.hideLoading();
        return;
      }
      wx.removeStorageSync(PREPARATION_MIGRATION_CACHE_PREFIX + that.data.foodId);
      var foodItem = Object.assign({}, that.data.foodItem, {
        gbDfRecipeModel: 'VERSIONED',
        gbDfRecipeRowVersion: publishedDetail.recipe.rowVersion,
      });
      if (activeChangeContext && activeChangeContext.changeType === 'REPLACE'
        && Number(activeChangeContext.replacedRawGoodsId) > 0
        && Number(activeChangeContext.newRawGoodsId) > 0) {
        wx.setStorageSync(
          RECIPE_REPLACEMENT_CONTEXT_PREFIX + String(publishedDetail.version.id),
          Object.assign({}, activeChangeContext, {
            foodId: Number(that.data.foodId),
            recipeId: Number(publishedDetail.recipe.id),
            recipeVersionId: Number(publishedDetail.version.id),
            savedAt: Date.now(),
          })
        );
      }
      wx.setStorageSync('Food', foodItem);
      that.setData({
        foodItem: foodItem,
        versionedMode: true,
        versionedDetail: publishedDetail,
        versionedComponents: components,
        versionDraftDirty: false,
        versionDraftChangeContext: null,
        recipeSaving: false,
      });
      that.cancelPreparation();
      that._closeRawModal();
      load.hideLoading();
      if (that.data.versionEditorMode && usagePlan) {
        that._previewUnifiedVersionUsage(publishedDetail, usagePlan, activeChangeContext);
        return null;
      }
      wx.showToast({ title: '保存成功', icon: 'success' });
      return that._fetchVersionedRecipe();
    }).catch(function (error) {
      that.setData({ recipeSaving: false });
      load.hideLoading();
      preparationUtil.showError(error);
    });
  },

  _versionActionBody(detail) {
    var identity = this.preparationIdentity || preparationUtil.getIdentity();
    return {
      distributerId: identity.distributerId,
      recipeRowVersion: detail.recipe.rowVersion,
      versionRowVersion: detail.version.rowVersion,
      operatorId: identity.operatorId,
    };
  },

  _resetModalForm() {
    this.setData({
      modalGoods: null,
      modalGoodsImg: '',
      modalPortionAmount: '5',
      modalMinUnitIndex: 0,
      modalMinUnit: 'ml',
      modalPackUnit: '',
      modalPackLabel: '',
      modalPackPriceTitle: '',
      modalPackPriceLabel: '',
      modalPriceReferenceOnly: false,
      modalCostPerPortion: '0.00',
      modalPortionsPerPack: '0',
      modalDemoText: '',
      modalPackEquivText: '',
      modalPackQtyInMin: '',
      modalConversionPlaceholder: '如8',
      modalConversionRequired: false,
      modalGoodsSpecMissing: false,
      modalCanCalcCost: false,
      modalQuickTags: [],
    }, () => this._syncFoodSearchModalLayout());
  },

  _minUnitIndex(unit, options) {
    var opts = options || this.data.minUnitOptions || MIN_UNIT_OPTIONS;
    var idx = opts.indexOf(unit);
    return idx >= 0 ? idx : 0;
  },

  _setModalGoods(goods, portionAmount, minUnitOverride, packQtyInMinOverride) {
    if (!goods || !goods.gbDgGoodsName) return;
    var minUnit = minUnitOverride || _suggestMinUnit(
      goods.gbDgGoodsStandardname,
      _rawPackSpecAmount(goods),
      goods
    );
    var packQtyStr = packQtyInMinOverride != null && packQtyInMinOverride !== ''
      ? String(packQtyInMinOverride)
      : '';
    var ctx = _buildUnitContext(goods, {
      minUnit: minUnit,
      packQtyInMin: packQtyStr,
    });
    if (!packQtyStr && ctx.packQtyInMin > 0) {
      packQtyStr = String(ctx.packQtyInMin);
    } else if (!packQtyStr && ctx.packUnit === minUnit) {
      packQtyStr = '1';
    }
    var minUnitOpts = _minUnitOptionsForGoods(goods, minUnit);
    var idx = this._minUnitIndex(minUnit, minUnitOpts);
    var portion = portionAmount != null && portionAmount !== ''
      ? String(portionAmount)
      : _defaultPortionAmount(minUnit);
    var img = goods.gbDgNxFatherImg || goods.gbDgGoodsFile || goods.gbDgGoodsFileImg;
    var modalGoodsImg = img
      ? (String(img).indexOf('http') === 0 ? img : (this.data.url + img))
      : (this.data.url + '/images/logo.png');
    this.setData({
      modalGoods: goods,
      modalGoodsImg: modalGoodsImg,
      modalPortionAmount: portion,
      modalMinUnit: minUnit,
      modalMinUnitIndex: idx,
      minUnitOptions: minUnitOpts,
      modalPackUnit: ctx.packUnit,
      modalPackLabel: ctx.packLabel,
      modalPackPriceTitle: ctx.packPriceTitle,
      modalPackPriceLabel: ctx.packPriceLabel,
      modalPriceReferenceOnly: ctx.priceReferenceOnly,
      modalPackQtyInMin: packQtyStr,
      modalConversionPlaceholder: ctx.conversionPlaceholder,
      modalConversionRequired: ctx.conversionRequired,
      modalGoodsSpecMissing: ctx.conversionRequired,
      modalBulkWeightPack: ctx.isBulkWeightPack,
      goodsName: goods.gbDgGoodsName,
      disGoodsId: goods.gbDistributerGoodsId,
      standardName: minUnit,
      amount: portion,
      searchKeyword: goods.gbDgGoodsName,
      isSearching: false,
      strArr: [],
    }, () => {
      this._recalcModalSummary();
      this._syncFoodSearchModalLayout();
    });
  },

  toEditModalGoodsSpecification() {
    this.dismissKeyboard();
    var goods = this.data.modalGoods;
    var goodsId = goods && goods.gbDistributerGoodsId;
    if (!goodsId) {
      wx.showToast({ title: '请先选择原料', icon: 'none' });
      return;
    }
    this._pendingSpecificationGoodsId = goodsId;
    wx.setStorageSync('disGoods', goods);
    wx.navigateTo({
      url: '/subPackage-group/pages/goods/disGoodsDetail/disGoodsDetail?id=' + goodsId + '&specOnly=1',
      fail: function () {
        this._pendingSpecificationGoodsId = null;
        wx.showToast({ title: '商品详情打开失败', icon: 'none' });
      }.bind(this),
    });
  },

  _refreshModalGoodsSpecification() {
    var goodsId = this._pendingSpecificationGoodsId;
    this._pendingSpecificationGoodsId = null;
    if (!goodsId || !this.data.showFood) return;
    var portionAmount = this.data.modalPortionAmount;
    var minUnit = this.data.modalMinUnit;
    var goods = wx.getStorageSync('disGoods');
    if (!goods || Number(goods.gbDistributerGoodsId) !== Number(goodsId)) {
      wx.showToast({ title: '商品规格刷新失败', icon: 'none' });
      return;
    }
    if (this.data.modalType === 'edit' && this.data.editGoods) {
      var editGoods = Object.assign({}, this.data.editGoods, {
        distributerGoodsEntity: goods,
        gbDistributerGoodsEntity: goods,
      });
      this.setData({ editGoods: editGoods });
    }
    this._setModalGoods(goods, portionAmount, minUnit);
    wx.showToast({
      title: _needsManualConversion(goods, minUnit) ? '商品规格仍不完整' : '商品规格已更新',
      icon: 'none',
    });
  },

  _recalcModalSummary() {
    var goods = this.data.modalGoods;
    if (!goods) return;
    var minUnit = this.data.modalMinUnit;
    var ctx = _buildUnitContext(goods, {
      minUnit: minUnit,
      packQtyInMin: this.data.modalPackQtyInMin,
    });
    var portion = parseFloat(this.data.modalPortionAmount) || 0;
    var packQty = ctx.packQtyInMin;
    var cost = _calcPortionCost(portion, minUnit, ctx, goods);
    var canCalcCost = portion > 0 && (
      (minUnit === ctx.packUnit)
      || packQty > 0
    );
    var portionsLabel = _formatPortionsPerPack(
      portion, packQty, minUnit, ctx.packUnit
    );
    var demoPortions = 10;
    var demoConsume = (portion * demoPortions).toFixed(0);
    var demoCost = canCalcCost && cost > 0
      ? (cost * demoPortions).toFixed(2)
      : '—';
    var quickPresets = minUnit === '斤' ? [0.1, 0.2, 0.5] : QUICK_DOSAGE_PRESETS;
    var quickTags = quickPresets.map(function (v) {
      return {
        value: String(v),
        label: v + minUnit,
        active: String(portion) === String(v),
      };
    });
    var packEquiv = canCalcCost
      ? _convertMinUnitToPack(portion, minUnit, ctx, goods)
      : { amount: '0' };
    var packEquivText = ctx.packUnit && canCalcCost && Number(packEquiv.amount) > 0
      ? ('每份约 ' + _formatPackAmountDisplay(parseFloat(packEquiv.amount)) + ctx.packUnit)
      : '';
    this.setData({
      modalPackPriceTitle: ctx.packPriceTitle,
      modalPackPriceLabel: ctx.packPriceLabel,
      modalPriceReferenceOnly: ctx.priceReferenceOnly,
      modalCostPerPortion: canCalcCost ? cost.toFixed(2) : '—',
      modalPortionsPerPack: portionsLabel,
      modalDemoText: '卖出 ' + demoPortions + ' 份，将消耗 ' + demoConsume + minUnit
        + '，约成本 ¥ ' + demoCost,
      modalQuickTags: quickTags,
      modalConversionPlaceholder: ctx.conversionPlaceholder,
      modalConversionRequired: ctx.conversionRequired,
      modalGoodsSpecMissing: ctx.conversionRequired,
      modalBulkWeightPack: ctx.isBulkWeightPack,
      modalCanCalcCost: canCalcCost,
      modalPackEquivText: packEquivText,
    });
  },

  onConversionCountInput(e) {
    this.setData({ modalPackQtyInMin: e.detail.value }, () => {
      this._recalcModalSummary();
    });
  },

  clearSearchKeyword() {
    var that = this;
    this.setData({
      searchKeyword: '',
      isSearching: false,
      strArr: [],
    }, function () {
      that._syncFoodSearchModalLayout();
    });
  },

  onModalPortionInput(e) {
    this.setData({ modalPortionAmount: e.detail.value, amount: e.detail.value }, () => {
      this._recalcModalSummary();
    });
  },

  onModalPortionMinus() {
    this.dismissKeyboard();
    var cur = parseFloat(this.data.modalPortionAmount) || 0;
    var next = Math.max(0, cur - 1);
    if (next <= 0) {
      wx.showToast({ title: '用量须大于0', icon: 'none' });
      return;
    }
    var v = String(next);
    this.setData({ modalPortionAmount: v, amount: v }, () => this._recalcModalSummary());
  },

  onModalPortionPlus() {
    this.dismissKeyboard();
    var cur = parseFloat(this.data.modalPortionAmount) || 0;
    var v = String(cur + 1);
    this.setData({ modalPortionAmount: v, amount: v }, () => this._recalcModalSummary());
  },

  onMinUnitChange(e) {
    this.dismissKeyboard();
    var idx = parseInt(e.detail.value, 10) || 0;
    var opts = this.data.minUnitOptions || MIN_UNIT_OPTIONS;
    var unit = opts[idx] || opts[0];
    var goods = this.data.modalGoods;
    var packQtyInMin = '';
    if (goods) {
      var packUnit = goods.gbDgGoodsStandardname || '';
      if (_hasGoodsDefaultSpec(goods, unit)) {
        var defQty = _effectivePackQtyInMin(goods, unit, '');
        if (defQty > 0) packQtyInMin = String(defQty);
      } else if (packUnit === unit) {
        packQtyInMin = '1';
      }
    }
    this.setData({
      modalMinUnitIndex: idx,
      modalMinUnit: unit,
      standardName: unit,
      modalPackQtyInMin: packQtyInMin,
    }, () => this._recalcModalSummary());
  },

  onQuickDosage(e) {
    this.dismissKeyboard();
    var v = e.currentTarget.dataset.value;
    this.setData({ modalPortionAmount: v, amount: v }, () => this._recalcModalSummary());
  },

  toChangePrice() {
    var foodItem = this.data.foodItem;
    var foodId = foodItem.gbDistributerFoodId || foodItem.foodId || '';
    if (!foodId) {
      wx.showToast({ title: '缺少菜品ID', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '../addFood/addFood?type=edit&foodId=' + foodId,
    });
  },

  showProfitHint() {
    wx.showToast({ title: '利润 = 售价 - 理论成本', icon: 'none' });
  },

  toRecipeVersionManage() {
    wx.navigateTo({
      url: '../recipeVersionManage/recipeVersionManage?foodId='
        + encodeURIComponent(String(this.data.foodId)),
    });
  },

  toCreateFirstRecipeVersion() {
    wx.navigateTo({
      url: '../recipeVersionEdit/recipeVersionEdit?foodId='
        + encodeURIComponent(String(this.data.foodId)),
    });
  },

  onRecipeHeaderTap() {
    if (this.data.versionEditorMode) return;
    if (this.data.versionedMode) {
      this.toRecipeVersionManage();
      return;
    }
    this.toCreateFirstRecipeVersion();
  },

  refreshData() {
    if (this.data.versionEditorMode && this.data.versionDraftDirty) {
      wx.showToast({ title: '请先保存或放弃当前新版本', icon: 'none' });
      return;
    }
    var foodId = this.data.foodId;
    if (foodId) {
      if (this.data.versionedMode) this._fetchVersionedRecipe({ showLoading: true });
      else this._fetchFoodGoods(foodId);
    }
  },

  onPickCostDays() {
    if (this.data.versionEditorMode) {
      wx.showToast({ title: '编辑页按开始营业日的历史价格测算', icon: 'none' });
      return;
    }
    var that = this;
    var itemList = COST_DAYS_OPTIONS.map(function (d) {
      return '近' + d + '天';
    }).concat(['自定义天数']);
    wx.showActionSheet({
      itemList: itemList,
      success: function (res) {
        var idx = res.tapIndex;
        if (idx < 0) return;
        if (idx < COST_DAYS_OPTIONS.length) {
          that._applyCostDays(COST_DAYS_OPTIONS[idx]);
          return;
        }
        wx.showModal({
          title: '自定义统计天数',
          editable: true,
          placeholderText: '请输入 1-365',
          success: function (modalRes) {
            if (!modalRes.confirm) return;
            var n = parseInt(String(modalRes.content || '').trim(), 10);
            if (isNaN(n) || n <= 0 || n > 365) {
              wx.showToast({ title: '请输入 1-365 的整数', icon: 'none' });
              return;
            }
            that._applyCostDays(n);
          },
        });
      },
    });
  },

  _applyCostDays(days) {
    if (!days || days <= 0) return;
    this.setData({
      costDays: days,
      costDaysLabel: '近' + days + '天',
    });
    var foodId = this.data.foodId;
    if (foodId) {
      if (this.data.versionedMode) this._fetchVersionedRecipe({ showLoading: true });
      else this._fetchFoodGoods(foodId, { loadingText: '刷新成本' });
    }
  },

  onMinusAmount(e) {
    var idx = e.currentTarget.dataset.index;
    var raw = this.data.rawArr[idx];
    if (raw && raw._isPreparation) {
      this.editPreparation(raw);
      return;
    }
    var current = parseFloat(raw.gbDfgGoodsAmount) || 0;
    if (current <= 0.01) {
      wx.showToast({ title: '用量不能小于0', icon: 'none' });
      return;
    }
    // 打开编辑弹窗进行调整
    this.editGoods({ currentTarget: { dataset: { item: raw } } });
  },

  onPlusAmount(e) {
    var idx = e.currentTarget.dataset.index;
    var raw = this.data.rawArr[idx];
    if (raw && raw._isPreparation) {
      this.editPreparation(raw);
      return;
    }
    // 打开编辑弹窗进行调整
    this.editGoods({ currentTarget: { dataset: { item: raw } } });
  },

  cancle() {
    this.dismissKeyboard();
    this._resetModalForm();
    this.setData({
      showFood: false,
      searchKeyword: '',
      isSearching: false,
      strArr: [],
    });
  },

  stopMove() {},

  stopTap() {},

  /** 统一收起弹窗输入键盘；无键盘时调用不会影响后续操作。 */
  dismissKeyboard() {
    if (typeof wx.hideKeyboard !== 'function') return;
    try {
      wx.hideKeyboard({ fail: function () {} });
    } catch (error) {}
  },

  onSearchKeywordInput(e) {
    var string = e.detail.value || '';
    var that = this;
    this.setData({
      searchKeyword: string,
      isSearching: string.length > 0,
    }, function () {
      that._syncFoodSearchModalLayout();
    });
    if (string.replace(/\s*/g, '').length > 0) {
      this._searchGoods(string);
    } else {
      this.setData({ strArr: [], isSearching: false }, function () {
        that._syncFoodSearchModalLayout();
      });
    }
  },

  onSearchConfirm(e) {
    this.dismissKeyboard();
    var string = (e.detail && e.detail.value) || this.data.searchKeyword || '';
    string = String(string).trim();
    if (!string) {
      wx.showToast({ title: '请输入搜索关键词', icon: 'none' });
      return;
    }
    var that = this;
    this.setData({ searchKeyword: string, isSearching: true }, function () {
      that._syncFoodSearchModalLayout();
    });
    this._searchGoods(string);
  },

  _searchGoods(keyword) {
    var string = String(keyword || '').replace(/\s*/g, '');
    if (!string) {
      this.setData({ strArr: [], isSearching: false });
      return;
    }
    if (this.data.versionedMode) {
      var thatVersioned = this;
      var identity = this.preparationIdentity || preparationUtil.getIdentity();
      load.showLoading('查询原料');
      preparationApi.searchRawGoods(identity.distributerId, string)
        .then(function (rows) {
          load.hideLoading();
          thatVersioned.setData({
            strArr: (rows || []).map(_decorateGoodsSearchPrice),
            isSearching: true,
          }, function () {
            thatVersioned._syncFoodSearchModalLayout();
          });
        })
        .catch(function (error) {
          load.hideLoading();
          preparationUtil.showError(error);
        });
      return;
    }
    var fid = this.data.foodId;
    if (fid == null || fid === '') {
      wx.showToast({ title: '缺少菜品ID', icon: 'none' });
      return;
    }
    var foodId = typeof fid === 'number' ? fid : parseInt(String(fid), 10);
    if (isNaN(foodId)) {
      wx.showToast({ title: '菜品ID无效', icon: 'none' });
      return;
    }
    var data = {
      disId: this.data.disId,
      searchStr: string,
      foodId: foodId,
    };
    var that = this;
    load.showLoading('查询原料');
    quickSearchDisGoodsForFoodIngredient(data)
      .then(function (res) {
        load.hideLoading();
        if (res.result.code == 0) {
          that.setData({
            strArr: res.result.data && res.result.data.length > 0
              ? res.result.data.map(_decorateGoodsSearchPrice) : [],
            isSearching: true,
          }, function () {
            that._syncFoodSearchModalLayout();
          });
        } else {
          wx.showToast({ title: res.result.msg || '查询失败', icon: 'none' });
        }
      })
      .catch(function () {
        load.hideLoading();
        wx.showToast({ title: '查询失败', icon: 'none' });
      });
  },

  showSaveHint() {
    wx.showToast({
      title: '请先添加至少一条原料',
      icon: 'none'
    })
  },

  /**
   * 显示操作面板，选择被操作商品
   * @param {}} e
   */
  applyGoods(e) {
    var item = e.currentTarget.dataset.item;
    this.dismissKeyboard();
    if (this.data.modalType === 'edit') {
      var editGoods = this.data.editGoods || {};
      editGoods.gbDfgDisGoodsId = item.gbDistributerGoodsId;
      editGoods.gbDfgGoodsName = item.gbDgGoodsName;
      editGoods.distributerGoodsEntity = item;
      editGoods.gbDistributerGoodsEntity = item;
      this.setData({ editGoods: editGoods });
    }
    this._setModalGoods(item);
  },
  tishi(){
    wx.showToast({
      title: "内容不完整",
      icon: 'none'
    })
  },

  confirm(e) {
    this.dismissKeyboard();
    var portionMin = this.data.modalPortionAmount || this.data.amount;
    var minUnit = this.data.modalMinUnit || this.data.standardName;
    var goodsName = this.data.goodsName;
    var goods = this.data.modalGoods;
    if (!goods) {
      wx.showToast({ title: '请先搜索并选择原料', icon: 'none' });
      return;
    }
    if (!goodsName || !Number(portionMin) || Number(portionMin) <= 0) {
      wx.showToast({ title: '请填写每份用量', icon: 'none' });
      return;
    }
    if (this.data.modalGoodsSpecMissing) {
      wx.showToast({ title: '请点击采购包装补充商品规格', icon: 'none' });
      return;
    }
    var ctx = _buildUnitContext(goods, {
      minUnit: minUnit,
      packQtyInMin: this.data.modalPackQtyInMin,
    });
    if (ctx.conversionRequired && (!this.data.modalPackQtyInMin
      || parseFloat(this.data.modalPackQtyInMin) <= 0)) {
      wx.showToast({
        title: '商品未设默认规格，请填写换算关系',
        icon: 'none',
      });
      return;
    }
    if (!ctx.packQtyInMin || ctx.packQtyInMin <= 0) {
      wx.showToast({
        title: '请填写换算关系',
        icon: 'none',
      });
      return;
    }
    var portionNum = parseFloat(portionMin) || 0;
    var costCheck = _calcPortionCost(portionNum, minUnit, ctx, goods);
    if (portionNum > 0 && costCheck <= 0 && ctx.packPrice > 0) {
      wx.showToast({
        title: '请完善换算关系以计算每份成本',
        icon: 'none',
      });
      return;
    }
    var packSave = _convertMinUnitToPack(portionMin, minUnit, ctx, goods);
    if (!Number(packSave.amount) || Number(packSave.amount) <= 0) {
      wx.showToast({ title: '换算后用量过小', icon: 'none' });
      return;
    }
    var portionPersist = _buildPortionPersistPayload(portionMin, minUnit, ctx);

    if (this.data.versionedMode) {
      var versionedComponents = this._currentP1Components();
      var versionedComponent = {
        itemKind: 'RAW_GOODS',
        rawGoodsId: Number(goods.gbDistributerGoodsId),
        rawGoodsName: goods.gbDgGoodsName || goodsName,
        rawGoods: goods,
        quantityPerPortion: Number(portionMin),
        inputUnitCode: _toP1Unit(minUnit),
      };
      if (this.data.modalType === 'edit' || this.data.modalType === 'replace') {
        if (this.data.modalType === 'replace') {
          var replaceIndex = Number((this.data.editGoods || {})._componentIndex);
          var duplicateReplacement = versionedComponents.some(function (component, index) {
            return index !== replaceIndex && component.itemKind === 'RAW_GOODS' &&
              Number(component.rawGoodsId) === Number(versionedComponent.rawGoodsId);
          });
          if (duplicateReplacement) {
            wx.showToast({ title: '新配料已在当前配方中', icon: 'none' });
            return;
          }
        }
        versionedComponents.splice(
          Number((this.data.editGoods || {})._componentIndex),
          1,
          versionedComponent
        );
      } else {
        var alreadyAdded = versionedComponents.some(function (component) {
          return component.itemKind === 'RAW_GOODS' &&
            Number(component.rawGoodsId) === Number(versionedComponent.rawGoodsId);
        });
        if (alreadyAdded) {
          wx.showToast({ title: '该配料已经添加', icon: 'none' });
          return;
        }
        versionedComponents.push(versionedComponent);
      }
      var oldGoods = this.data.editGoods || {};
      var isReplace = this.data.modalType === 'replace';
      var oldEntity = _getGoodsEntity(oldGoods);
      var oldDisplay = isReplace ? _convertPackToMinUnitForDisplay(
        oldGoods.gbDfgGoodsAmount,
        oldGoods.gbDfgGoodsStandardname,
        oldEntity,
        oldGoods
      ) : null;
      var oldContext = oldDisplay ? _buildUnitContext(oldEntity, {
        minUnit: oldDisplay.minUnit,
        packQtyInMin: oldDisplay.packQtyInMin,
      }) : null;
      var newEvidence = _rawGoodsPurchaseEvidence(goods, minUnit, ctx.packQtyInMin);
      var oldEvidence = oldContext
        ? _rawGoodsPurchaseEvidence(oldEntity, oldDisplay.minUnit, oldContext.packQtyInMin)
        : null;
      var versionChangeContext = {
        changeType: isReplace ? 'REPLACE' : (this.data.modalType === 'edit' ? 'QUANTITY' : 'ADD'),
        newRawGoodsId: isReplace || this.data.modalType === 'add'
          ? Number(goods.gbDistributerGoodsId) : null,
        replacedRawGoodsId: isReplace ? Number(oldGoods.gbDfgDisGoodsId) : null,
        oldGoods: isReplace ? {
          name: oldGoods.gbDfgGoodsName,
          evidence: oldEvidence,
        } : null,
        newGoods: {
          name: goods.gbDgGoodsName,
          evidence: newEvidence,
        },
      };
      if (this.data.versionEditorMode) {
        this._applyVersionDraftComponents(versionedComponents, versionChangeContext);
        return;
      }
      this._saveAndPublishComponents(versionedComponents, '保存配料', versionChangeContext);
      return;
    }

    if (this.data.modalType == 'edit') {
      var baseEdit = this.data.editGoods || {};
      var editGoods = Object.assign({}, baseEdit, {
        gbDfgGoodsName: goodsName,
        gbDfgGoodsAmount: packSave.amount,
        gbDfgGoodsStandardname: packSave.standardName,
        gbDfgDisGoodsId: this.data.disGoodsId || baseEdit.gbDfgDisGoodsId,
        gbDfgPortionAmount: portionPersist.gbDfgPortionAmount,
        gbDfgPortionUnit: portionPersist.gbDfgPortionUnit,
        gbDfgPackQtyInMin: portionPersist.gbDfgPackQtyInMin,
      });
      load.showLoading("修改原料");
      updateGbFoodGoods(editGoods)
        .then(res => {
          load.hideLoading();
          if (res.result.code == 0) {
            this._refreshAfterRawSave();
          } else {
            wx.showToast({
              title: res.result.msg || '修改失败',
              icon: 'none',
            });
          }
        })
        .catch(function () {
          load.hideLoading();
          wx.showToast({ title: '修改失败', icon: 'none' });
        });
      return;
    }

    var item = {
      gbDfgDisId: this.data.disId,
      gbDfgGoodsName: goodsName,
      gbDfgFoodId: this.data.foodId,
      gbDfgDisGoodsId: this.data.disGoodsId,
      gbDfgGoodsAmount: packSave.amount,
      gbDfgGoodsStandardname: packSave.standardName,
      gbDfgPortionAmount: portionPersist.gbDfgPortionAmount,
      gbDfgPortionUnit: portionPersist.gbDfgPortionUnit,
      gbDfgPackQtyInMin: portionPersist.gbDfgPackQtyInMin,
    };
    load.showLoading("保存原料");
    saveGbFoodGoodsItem(item).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        this._refreshAfterRawSave();
      } else {
        wx.showToast({
          title: res.result.msg || '添加失败',
          icon: 'none',
        });
      }
    }).catch(function () {
      load.hideLoading();
      wx.showToast({ title: '添加失败', icon: 'none' });
    });
  },



  onTargetGrossMarginRateInput(e) {
    var value = e.detail.value;
    var foodItem = this.data.foodItem;
    foodItem.gbDfTargetGrossMarginRate = value;
    this.setData({ foodItem: foodItem });
  },

  onGrossMarginFloatAbsInput(e) {
    var value = e.detail.value;
    var foodItem = this.data.foodItem;
    foodItem.gbDfGrossMarginFloatAbs = value;
    this.setData({ foodItem: foodItem });
  },

  updateGrossMargin() {
    var foodItem = this.data.foodItem;
    var payload = {
      gbDistributerFoodId: foodItem.gbDistributerFoodId || foodItem.foodId || '',
      gbDfTargetGrossMarginRate: foodItem.gbDfTargetGrossMarginRate || '',
      gbDfGrossMarginFloatAbs: foodItem.gbDfGrossMarginFloatAbs || '',
    };
    load.showLoading('保存中');
    updateGrossMargin(payload).then(function () {
      load.hideLoading();
      wx.showToast({ title: '修改成功', icon: 'success' });
    }).catch(function () {
      load.hideLoading();
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    });
  },

  deleteRecipeVersion() {
    if (!this.data.versionEditorMode || !Number(this.data.manageVersionId)) return;
    if (this.data.recipeSaving || this.data.versionUsageConfirming || this.data.versionDeleting) return;
    var detail = this.data.versionedDetail;
    var that = this;
    return recipeVersionDeletion.previewAndConfirm(this, {
      recipe: detail && detail.recipe,
      version: detail && detail.version,
      submittingField: 'versionDeleting',
      deletionReason: '用户在菜品配方页删除内容修订',
      getIdentity: function () {
        return that.preparationIdentity || preparationUtil.getIdentity();
      },
      showLoading: load.showLoading,
      hideLoading: load.hideLoading,
      onCompleted: function () {
        that.setData({
          rawArr: [],
          totalCost: '—',
          costTotal: '—',
          totalCostComplete: false,
          costRate: '—',
          profit: '—',
          grossMarginRate: '—',
          profitLevelClass: 'profit-tag--normal',
          profitHint: '已删除的配方内容不再计入成本',
          costMissingReason: '已删除的配方内容不再计入成本',
          versionHasEffectiveRecipe: null,
        });
        wx.showToast({ title: '版本已删除', icon: 'success' });
        setTimeout(function () { wx.navigateBack({ delta: 1 }); }, 500);
      },
    });
  },

  toBack() {
    if (this.data.versionEditorMode
      && (this.data.versionDraftDirty || this.data.versionUsageDirty || this.data.versionUsagePreview)) {
      var contentSaved = !!this.data.versionUsagePreview && !this.data.versionDraftDirty;
      wx.showModal({
        title: '放弃本次编辑？',
        content: contentSaved
          ? '新配方内容版本已保留，但使用时间和成本尚未确认更新。'
          : '当前内容或使用时间尚未确认保存。',
        confirmText: '放弃修改',
        confirmColor: '#d84d4d',
        success: function (res) {
          if (res.confirm) wx.navigateBack({ delta: 1 });
        },
      });
      return;
    }
    wx.navigateBack({
      delta: 1,
    })
  }
  };
}

module.exports = {
  createDetailPage: function () {
    return createRecipePage(false);
  },
  createEditorPage: function () {
    return createRecipePage(true);
  },
};
