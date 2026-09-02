var config = require('../../../../config/index');
var chartsApi = require('../../../services/api');
var preparationApi = require('../../../../services/preparation');
var preparationUtil = require('../../../../utils/preparation');

var STATUS_LABELS = {
  COMPLETED: '已完成核算',
  COMPLETED_WITH_MISSING_EVIDENCE: '已完成，证据待完善',
  PARTIAL: '部分可核算',
  MISSING_EFFECTIVE_RECIPE: '缺少有效配方',
  CONFLICTING_EFFECTIVE_RECIPE: '配方有效期冲突',
  INCOMPLETE_RECIPE_EVIDENCE: '配方证据不完整',
  MISSING_HISTORICAL_PRICE: '缺少历史价格',
  MISSING_UNIT_CONVERSION: '缺少单位换算',
  INCOMPLETE_PRICE_EVIDENCE: '价格证据不完整',
  REFUND_REVIEW_REQUIRED: '退款数据待确认',
  RECALCULATION_PENDING: '正在重新核算',
  CALCULATION_FAILED: '核算失败',
  RESOLVED: '证据完整',
};

function cleanText(value) {
  if (value === null || typeof value === 'undefined') return '';
  var text = String(value).trim();
  return !text || text.toLowerCase() === 'null' ? '' : text;
}

function numberText(value, digits) {
  if (value === null || typeof value === 'undefined' || value === '') return '—';
  var number = Number(value);
  if (isNaN(number)) return String(value);
  return number.toFixed(typeof digits === 'number' ? digits : 4)
    .replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

function moneyText(value) {
  if (value === null || typeof value === 'undefined' || value === '') return '—';
  var number = Number(value);
  return isNaN(number) ? '—' : '¥' + number.toFixed(2);
}

function unitPriceText(value, unitCode) {
  if (value === null || typeof value === 'undefined' || value === '') return '—';
  var number = Number(value);
  if (isNaN(number)) return '—';
  return '¥' + numberText(number, 8) + '/' + unitText(unitCode);
}

function unitText(value) {
  var labels = { G: '克', KG: '千克', JIN: '斤', ML: '毫升', L: '升', EA: '个' };
  var key = cleanText(value).toUpperCase();
  return labels[key] || value || '—';
}

function statusLabel(value) {
  return STATUS_LABELS[value] || value || '待完善';
}

function statusClass(value) {
  if (value === 'COMPLETED' || value === 'RESOLVED') return 'is-complete';
  if (value === 'RECALCULATION_PENDING') return 'is-running';
  return 'is-pending';
}

function joinImageUrl(path) {
  var value = cleanText(path);
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return String(getApp().globalData.server || config.server || '') + value;
}

function unwrapResponse(response) {
  var body = response && response.result ? response.result : {};
  if (Number(body.code) !== 0 || !body.data) {
    throw new Error(body.msg || '成本证据加载失败');
  }
  return body.data;
}

function batchView(batch, fromHint) {
  var row = Object.assign({}, batch || {});
  row._fromHint = !!fromHint;
  row._quantity = cleanText(fromHint ? row.quantityText : row.rawReceiptQuantity);
  row._amount = cleanText(fromHint ? row.amountText : row.rawReceiptAmount);
  row._unit = cleanText(fromHint ? row.unitCode : row.rawUnitCode);
  row._receiptDate = cleanText(row.receiptBusinessDate).slice(0, 10) || '入库日未知';
  row._quantityText = row._quantity || '—';
  row._amountText = row._amount ? moneyText(row._amount) : '—';
  row._unitText = unitText(row._unit);
  row._convertedText = row.convertedBaseQuantity == null
    ? '—'
    : numberText(row.convertedBaseQuantity) + ' ' + unitText(row.baseUnitCode);
  row._unitPriceText = row.finalHistoricalBaseUnitPrice == null
    ? '—'
    : unitPriceText(row.finalHistoricalBaseUnitPrice, row.baseUnitCode);
  row._statusLabel = fromHint ? '可修正入库批次' : statusLabel(row.evidenceStatus);
  row._statusClass = fromHint ? 'is-hint' : statusClass(row.evidenceStatus);
  row._reason = cleanText(row.missingReason);
  return row;
}

function goodsView(wrapper, rawGoodsId) {
  var row = wrapper || {};
  var standardName = cleanText(row.rawGoodsStandardName);
  var standardWeight = cleanText(row.rawGoodsStandardWeight);
  return {
    name: cleanText(row.rawGoodsName) || ('采购商品 #' + rawGoodsId),
    spec: [standardName, standardWeight].filter(function (value) { return !!value; }).join(' '),
    imageUrl: joinImageUrl(row.rawGoodsImage),
  };
}

Page({
  data: {
    navBarHeight: 0,
    loading: true,
    loadError: '',
    dishName: '',
    businessDate: '',
    result: null,
    batch: null,
    ingredients: [],
    correctionOpen: false,
    correctionSaving: false,
    correctionBatch: null,
    correctionStatus: 'VALID',
    correctionQuantity: '',
    correctionAmount: '',
    correctionUnit: '',
    correctionReason: '',
    correctionPreview: null,
  },

  onLoad: function (options) {
    var globalData = getApp().globalData || {};
    var identity = preparationUtil.getIdentity();
    this.identity = identity;
    this.setData({
      navBarHeight: Number(globalData.navBarHeight || 0) * Number(globalData.rpxR || 1),
      resultId: Number(options.resultId || 0),
      distributerId: Number(options.distributerId || identity.distributerId || 0),
      storeDepartmentId: Number(options.storeDepartmentId || identity.currentStoreId || 0),
      foodId: Number(options.foodId || 0),
      businessDate: cleanText(options.businessDate),
      dishName: cleanText(options.dishName) || '菜品成本',
    });
    this._loadEvidence();
  },

  _loadEvidence: function () {
    var that = this;
    if (!this.data.resultId || !this.data.distributerId) {
      this.setData({ loading: false, loadError: '缺少成本结果编号，无法读取证据' });
      return;
    }
    wx.showLoading({ title: '加载成本证据', mask: true });
    this.setData({ loading: true, loadError: '' });
    chartsApi.getDishDailyCostResult(this.data.resultId, this.data.distributerId)
      .then(unwrapResponse)
      .then(function (view) { return that._decorateEvidence(view); })
      .then(function (view) {
        var completionRate = Number(view.result && view.result.completionRate || 0);
        wx.hideLoading();
        that.setData({
          loading: false,
          batch: view.batch || null,
          result: view.result || null,
          resultStatusLabel: statusLabel(view.result && view.result.status),
          resultStatusClass: statusClass(view.result && view.result.status),
          completeCostText: moneyText(view.result && view.result.completeCostAmount),
          knownCostText: completionRate > 0
            ? moneyText(view.result && view.result.knownCostAmount) : '—',
          salesQuantityText: numberText(view.result && view.result.salesQuantity, 2),
          revenueAmountText: moneyText(view.result && view.result.revenueAmount),
          completionRateText: numberText(view.result && view.result.completionRate, 2),
          recipeVersionText: view.result && view.result.recipeVersionId
            ? '#' + view.result.recipeVersionId : '—',
          ingredients: view.ingredients || [],
          businessDate: cleanText(view.result && view.result.businessDate) || that.data.businessDate,
        });
      }).catch(function (error) {
        wx.hideLoading();
        that.setData({
          loading: false,
          loadError: (error && error.message) || '成本证据加载失败',
        });
      });
  },

  _decorateEvidence: function (view) {
    var that = this;
    var rows = (view && view.ingredients) || [];
    return Promise.all(rows.map(function (wrapper, index) {
      var ingredient = Object.assign({}, wrapper.ingredient || {});
      var rawGoodsId = Number(ingredient.rawGoodsId || 0);
      var goods = goodsView(wrapper, rawGoodsId);
      var batches = (wrapper.priceBatches || []).map(function (row) { return batchView(row, false); });
      var hintsPromise = rawGoodsId && batches.length === 0
        ? preparationApi.listHistoricalReceiptBatches({
          distributerId: that.data.distributerId,
          storeDepartmentId: that.data.storeDepartmentId,
          rawGoodsId: rawGoodsId,
          notAfter: that.data.businessDate,
          limit: 8,
        }).catch(function () { return []; })
        : Promise.resolve([]);
      return hintsPromise.then(function (hints) {
        var hinted = (hints || []).map(function (row) { return batchView(row, true); });
        ingredient._key = ingredient.id || ('ingredient-' + index);
        ingredient._name = goods.name;
        ingredient._spec = goods.spec;
        ingredient._imageUrl = goods.imageUrl;
        ingredient._statusLabel = statusLabel(ingredient.status || ingredient.priceStatus);
        ingredient._statusClass = statusClass(ingredient.status || ingredient.priceStatus);
        ingredient._quantityText = numberText(ingredient.baseQuantityPerPortion)
          + ' ' + unitText(ingredient.baseUnitCode) + '/份';
        ingredient._priceText = ingredient.historicalBaseUnitPrice == null
          ? '—'
          : unitPriceText(ingredient.historicalBaseUnitPrice, ingredient.baseUnitCode);
        ingredient._knownCostText = ingredient.historicalBaseUnitPrice != null
          ? moneyText(ingredient.knownCostAmount) : '—';
        ingredient._completeCostText = moneyText(ingredient.completeCostAmount);
        ingredient._reason = cleanText(ingredient.missingReason);
        ingredient._batches = batches.length ? batches : hinted;
        ingredient._usesReceiptHints = !batches.length && !!hinted.length;
        return ingredient;
      });
    })).then(function (ingredients) {
      return Object.assign({}, view || {}, { ingredients: ingredients });
    });
  },

  onOpenCorrection: function (e) {
    var ingredientIndex = Number(e.currentTarget.dataset.ingredientIndex);
    var batchIndex = Number(e.currentTarget.dataset.batchIndex);
    var ingredient = this.data.ingredients[ingredientIndex];
    var batch = ingredient && ingredient._batches && ingredient._batches[batchIndex];
    if (!ingredient || !batch || !batch.stockBatchId) return;
    this.correctionIngredient = ingredient;
    this.setData({
      correctionOpen: true,
      correctionBatch: batch,
      correctionStatus: 'VALID',
      correctionQuantity: batch._quantity || '',
      correctionAmount: batch._amount || '',
      correctionUnit: batch._unit || '',
      correctionReason: '',
      correctionPreview: null,
    });
  },

  onCloseCorrection: function () {
    if (this.data.correctionSaving) return;
    this.setData({ correctionOpen: false, correctionPreview: null });
  },

  noop: function () {},

  onSelectCorrectionStatus: function (e) {
    this.setData({
      correctionStatus: e.currentTarget.dataset.status,
      correctionPreview: null,
    });
  },

  onCorrectionQuantityInput: function (e) {
    this.setData({ correctionQuantity: e.detail.value, correctionPreview: null });
  },

  onCorrectionAmountInput: function (e) {
    this.setData({ correctionAmount: e.detail.value, correctionPreview: null });
  },

  onCorrectionUnitInput: function (e) {
    this.setData({ correctionUnit: e.detail.value, correctionPreview: null });
  },

  onCorrectionReasonInput: function (e) {
    this.setData({ correctionReason: e.detail.value, correctionPreview: null });
  },

  _correctionRequest: function (includeToken) {
    var ingredient = this.correctionIngredient || {};
    var isValid = this.data.correctionStatus === 'VALID';
    var request = {
      distributerId: this.data.distributerId,
      storeDepartmentId: this.data.storeDepartmentId,
      rawGoodsId: ingredient.rawGoodsId,
      correctedQuantity: isValid ? Number(this.data.correctionQuantity) : null,
      correctedAmount: isValid ? Number(this.data.correctionAmount) : null,
      correctedUnitCode: isValid ? cleanText(this.data.correctionUnit).toUpperCase() : null,
      evidenceStatus: this.data.correctionStatus,
      correctionReason: cleanText(this.data.correctionReason),
      operatorId: Number(this.identity && this.identity.operatorId || 0),
    };
    if (includeToken && this.data.correctionPreview) {
      request.expectedPreviewToken = this.data.correctionPreview.previewToken;
    }
    return request;
  },

  _validateCorrection: function (request) {
    if (!request.operatorId) return '当前登录人缺少操作身份，请重新登录后再试';
    if (!request.correctionReason) return '请填写修正原因';
    if (request.evidenceStatus === 'VALID') {
      if (!(request.correctedQuantity > 0)) return '修正后的入库数量必须大于 0';
      if (isNaN(request.correctedAmount) || request.correctedAmount < 0) return '修正后的入库金额不能小于 0';
      if (!request.correctedUnitCode) return '请填写修正后的入库单位';
    }
    return '';
  },

  onPreviewCorrection: function () {
    var that = this;
    if (this.data.correctionSaving) return;
    var request = this._correctionRequest(false);
    var error = this._validateCorrection(request);
    if (error) {
      wx.showToast({ title: error, icon: 'none' });
      return;
    }
    this.setData({ correctionSaving: true });
    preparationApi.previewHistoricalReceiptCorrection(this.data.correctionBatch.stockBatchId, request)
      .then(function (preview) {
        preview._affectedRangeText = preview.affectedStart + ' 起，'
          + (preview.affectedEnd ? preview.affectedEnd + ' 起停止影响' : '影响后续全部营业日');
        that.setData({ correctionSaving: false, correctionPreview: preview });
      }).catch(function (apiError) {
        that.setData({ correctionSaving: false });
        preparationUtil.showError(apiError);
      });
  },

  onConfirmCorrection: function () {
    var that = this;
    if (this.data.correctionSaving) return;
    var request = this._correctionRequest(true);
    if (!request.expectedPreviewToken) {
      wx.showToast({ title: '请先预览本次修正影响', icon: 'none' });
      return;
    }
    var endText = this.data.correctionPreview.affectedEnd
      ? this.data.correctionPreview.affectedEnd + ' 起停止影响'
      : '影响后续全部营业日';
    preparationUtil.confirm(
      '将保留原入库数据，并新增修正证据。影响范围：'
        + this.data.correctionPreview.affectedStart + ' 起，' + endText + '。',
      '确认修正入库证据'
    ).then(function (confirmed) {
      if (!confirmed) return;
      that.setData({ correctionSaving: true });
      preparationApi.confirmHistoricalReceiptCorrection(that.data.correctionBatch.stockBatchId, request)
        .then(function () {
          that.setData({ correctionSaving: false, correctionOpen: false, correctionPreview: null });
          var pages = getCurrentPages();
          if (pages.length > 1) pages[pages.length - 2].setData({ update: true });
          wx.showModal({
            title: '修正已保存',
            content: '系统已保留原始入库记录，并提交受影响日期的成本重新核算。',
            showCancel: false,
            success: function () { wx.navigateBack({ delta: 1 }); },
          });
        }).catch(function (apiError) {
          that.setData({ correctionSaving: false, correctionPreview: null });
          preparationUtil.showError(apiError);
        });
    });
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  },
});
