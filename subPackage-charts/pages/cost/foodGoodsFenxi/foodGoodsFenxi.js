var load = require('../../../../lib/load.js');
var globalData = getApp().globalData;
var dateUtils = require('../../../../lib/dateUtil');
var chartsApi = require('../../../services/api.js');
var preparationApi = require('../../../../services/preparation.js');
var config = require('../../../../config/index.js');

function _money(value) {
  if (value === null || value === undefined || value === '') return '—';
  var number = Number(value);
  return isNaN(number) ? '—' : number.toFixed(2);
}

function _quantity(value) {
  if (value === null || value === undefined || value === '') return '0';
  var number = Number(value);
  if (isNaN(number)) return String(value);
  return number.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function _rate(value) {
  if (value === null || value === undefined || value === '') return '—';
  var number = Number(value);
  return isNaN(number) ? '—' : number.toFixed(2);
}

function _number(value, digits) {
  if (value === null || value === undefined || value === '') return '—';
  var number = Number(value);
  if (isNaN(number)) return String(value);
  return number.toFixed(typeof digits === 'number' ? digits : 4)
    .replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

function _unit(value) {
  var labels = { G: '克', KG: '千克', JIN: '斤', ML: '毫升', L: '升', EA: '个' };
  var key = String(value || '').toUpperCase();
  return labels[key] || value || '';
}

function _imageUrl(path) {
  if (!path) return '';
  var value = String(path);
  if (/^https?:\/\//i.test(value)) return value;
  return String(config.server || globalData.server || '') + value;
}

function _rangeText(minimum, maximum, suffix, digits) {
  if (minimum === null || minimum === undefined || minimum === '') return '—';
  var minText = _number(minimum, digits);
  var maxText = _number(maximum, digits);
  var body = Number(minimum) === Number(maximum) || maxText === '—'
    ? minText : minText + '–' + maxText;
  return body + (suffix || '');
}

function _displayValue(value) {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

function _decimal(value) {
  if (value === null || value === undefined || value === '') return null;
  var number = Number(value);
  return isNaN(number) ? null : number;
}

function _fixed(value, digits) {
  var number = _decimal(value);
  if (number === null) return '—';
  var scale = digits == null ? 2 : digits;
  var factor = Math.pow(10, scale);
  var roundedAbsolute = Math.round((Math.abs(number) + 1e-12) * factor) / factor;
  var rounded = number < 0 ? -roundedAbsolute : roundedAbsolute;
  return rounded.toFixed(scale);
}

function _canonicalUnitCode(value) {
  var text = String(value || '').trim();
  var lower = text.toLowerCase();
  var aliases = {
    g: 'G', '克': 'G', kg: 'KG', '公斤': 'KG', '千克': 'KG', '斤': 'JIN',
    ml: 'ML', '毫升': 'ML', l: 'L', '升': 'L',
    ea: 'EA', '个': 'EA', '只': 'EA', '枚': 'EA', '颗': 'EA', '张': 'EA',
  };
  return aliases[lower] || aliases[text] || text.toUpperCase();
}

function _baseDimension(baseUnitCode) {
  var code = _canonicalUnitCode(baseUnitCode);
  if (code === 'G') return 'MASS';
  if (code === 'ML') return 'VOLUME';
  if (code === 'EA') return 'COUNT';
  return '';
}

function _standardFactorToBase(unitCode, baseUnitCode) {
  var unit = _canonicalUnitCode(unitCode);
  var base = _canonicalUnitCode(baseUnitCode);
  if (unit === base) return 1;
  if (base === 'G') {
    if (unit === 'KG') return 1000;
    if (unit === 'JIN') return 500;
  }
  if (base === 'ML' && unit === 'L') return 1000;
  return 0;
}

function _conversionKey(rawGoodsId, unitCode) {
  return String(rawGoodsId || '') + ':' + _canonicalUnitCode(unitCode);
}

function _buildConversionMap(rows) {
  var result = {};
  (rows || []).forEach(function (row) {
    if (Number(row.enabled) === 0 || !(Number(row.factorToBase) > 0)) return;
    result[_conversionKey(row.rawGoodsId, row.unitCode)] = row;
  });
  return result;
}

function _specificationFactorToBase(specification, baseUnitCode) {
  var text = String(specification || '').trim();
  if (!text || text === 'null') return 0;
  var matched = text.match(/(\d+(?:\.\d+)?)\s*(kg|公斤|千克|斤|g|克|ml|毫升|l|升)/i);
  if (!matched) return 0;
  var amount = Number(matched[1]);
  var unit = _canonicalUnitCode(matched[2]);
  var factor = _standardFactorToBase(unit, baseUnitCode);
  return amount > 0 && factor > 0 ? amount * factor : 0;
}

function _purchaseFactorToRecipeBase(ingredient, theoreticalIngredient, conversionByKey) {
  if (!theoreticalIngredient) return 0;
  var purchaseUnit = ingredient.gbDgGoodsStandardname;
  var baseUnit = theoreticalIngredient.baseUnitCode;
  var standardFactor = _standardFactorToBase(purchaseUnit, baseUnit);
  if (standardFactor > 0) return standardFactor;

  var conversion = conversionByKey[_conversionKey(ingredient.disGoodsId, purchaseUnit)];
  var expectedDimension = _baseDimension(baseUnit);
  if (conversion && (!expectedDimension
    || String(conversion.dimension || '').toUpperCase() === expectedDimension)) {
    var configuredFactor = Number(conversion.factorToBase);
    if (configuredFactor > 0) return configuredFactor;
  }

  // 兼容旧商品：正式换算记录尚未返回时，明确的“1.9L / 10000g”规格仍可作为展示兜底。
  return _specificationFactorToBase(
    ingredient.gbDgGoodsStandardWeight || theoreticalIngredient.rawGoodsStandardWeight,
    baseUnit
  );
}

function _allocatedQuantityDisplay(ingredient, theoreticalIngredient, salesPortions, conversionByKey) {
  var actualProduceUsage = _decimal(ingredient.actualProduceUsage);
  if (actualProduceUsage === null || salesPortions === null || !(salesPortions > 0)) {
    return { text: '—', hint: '' };
  }
  if (!theoreticalIngredient) {
    return {
      text: _fixed(actualProduceUsage / salesPortions, 4) + ' '
        + (ingredient.gbDgGoodsStandardname || '') + '/份',
      hint: '',
    };
  }
  var factor = _purchaseFactorToRecipeBase(
    ingredient, theoreticalIngredient, conversionByKey || {}
  );
  if (!(factor > 0)) return { text: '—', hint: '缺少包装换算' };
  return {
    text: _fixed(actualProduceUsage * factor / salesPortions, 4) + ' '
      + _unit(theoreticalIngredient.baseUnitCode) + '/份',
    hint: '',
  };
}

/**
 * 配料数量可能分别使用“件/瓶”和“克/毫升”，不能直接相除。
 * 生产出库分摊量与其采购单价属于同一包装单位，先相乘为元，再与
 * 按营业日有效配方得到的理论成本总额比较，得到统一金额口径的偏差率。
 */
function _ingredientCostDeviation(ingredient, theoreticalIngredient, salesPortions) {
  if (!theoreticalIngredient) {
    return { text: '—', hint: '理论成本不完整' };
  }
  var theoreticalCost = _decimal(theoreticalIngredient.completeCostAmount);
  if (theoreticalCost === null) {
    return { text: '—', hint: '理论成本不完整' };
  }
  if (theoreticalCost <= 0) {
    return { text: '—', hint: '理论成本为0' };
  }

  var produceUsage = _decimal(ingredient.actualProduceUsage);
  var purchaseUnitPrice = _decimal(ingredient.unitPrice);
  var actualProduceCost = produceUsage !== null && purchaseUnitPrice !== null
    ? produceUsage * purchaseUnitPrice : null;

  // 老接口的单份生产成本可作为兼容兜底，但优先使用未按单份取整的总量×单价。
  if (actualProduceCost === null) {
    var produceCostPerPortion = _decimal(ingredient.produceCostPerPortion);
    actualProduceCost = produceCostPerPortion !== null
      && salesPortions !== null && salesPortions > 0
      ? produceCostPerPortion * salesPortions : null;
  }
  if (actualProduceCost === null) {
    return { text: '—', hint: '暂无生产出库成本' };
  }

  return {
    text: _fixed((actualProduceCost - theoreticalCost) * 100 / theoreticalCost, 2),
    hint: '生产成本口径',
  };
}

/** 配料分析和理论成本报表都以经销商菜品ID作为唯一合并键。 */
function _resolveDistributerFoodId(row) {
  if (!row) return '';
  if (row.foodId !== null && row.foodId !== undefined && row.foodId !== '') {
    return String(row.foodId);
  }
  if (row.gbDfBusinessInsight && row.gbDfBusinessInsight.foodId !== null
    && row.gbDfBusinessInsight.foodId !== undefined && row.gbDfBusinessInsight.foodId !== '') {
    return String(row.gbDfBusinessInsight.foodId);
  }
  if (row.gbDistributerFoodEntity && row.gbDistributerFoodEntity.gbDistributerFoodId !== null
    && row.gbDistributerFoodEntity.gbDistributerFoodId !== undefined) {
    return String(row.gbDistributerFoodEntity.gbDistributerFoodId);
  }
  if (row.gbDistributerFoodId !== null && row.gbDistributerFoodId !== undefined
    && row.gbDistributerFoodId !== '') {
    return String(row.gbDistributerFoodId);
  }
  if (row.dishId !== null && row.dishId !== undefined && row.dishId !== '') {
    return String(row.dishId);
  }
  return '';
}

function _businessText(value) {
  return value == null ? '' : String(value).replace(/历史/g, '');
}

function _normalizeHistoricalIngredient(row) {
  var item = Object.assign({}, row || {});
  item.statusLabel = _businessText(item.statusLabel);
  var unit = _unit(item.baseUnitCode);
  var versions = (item.recipeVersionNos || []).map(function (version) { return 'V' + version; });
  item._key = String(item.rawGoodsId || '') + ':' + String(item.baseUnitCode || '');
  item._name = item.rawGoodsName || ('配料 #' + (item.rawGoodsId || ''));
  item._spec = [item.rawGoodsStandardName, item.rawGoodsStandardWeight].filter(function (value) {
    return value !== null && value !== undefined && String(value).trim() !== '';
  }).join(' ');
  item._imageUrl = _imageUrl(item.rawGoodsImage);
  item._portionText = _rangeText(
    item.minimumBaseQuantityPerPortion, item.maximumBaseQuantityPerPortion, ' ' + unit + '/份', 4
  );
  item._totalQuantityText = _rangeText(item.totalBaseQuantity, item.totalBaseQuantity, ' ' + unit, 4);
  item._priceText = item.minimumHistoricalBaseUnitPrice == null
    ? '—'
    : '¥' + _rangeText(
      item.minimumHistoricalBaseUnitPrice, item.maximumHistoricalBaseUnitPrice, '/' + unit, 8
    );
  item._portionCostText = item.minimumTheoreticalCostPerPortion == null
    ? '—'
    : '¥' + _rangeText(
      item.minimumTheoreticalCostPerPortion, item.maximumTheoreticalCostPerPortion, '/份', 2
    );
  item._costText = item.completeCostAmount == null ? '—' : '¥' + _money(item.completeCostAmount);
  item._knownCostText = Number(item.knownCostAmount || 0) > 0 ? '¥' + _money(item.knownCostAmount) : '—';
  item._versionText = versions.length ? versions.join('、') : '配方版本待确认';
  item._dateText = item.firstBusinessDate
    ? String(item.firstBusinessDate).slice(5) + ' 至 '
      + String(item.lastBusinessDate || item.firstBusinessDate).slice(5)
    : '';
  item._missingReasonText = (item.missingReasons || []).map(_businessText).join('；');
  return item;
}

function _historicalVersionBreakdown(rows) {
  var groups = {};
  (rows || []).forEach(function (row) {
    if (row.recipeVersionNo === null || row.recipeVersionNo === undefined) return;
    var key = String(row.recipeVersionNo);
    var group = groups[key] || {
      versionNo: Number(row.recipeVersionNo),
      salesQuantity: 0,
      completeCostAmount: 0,
      complete: true,
    };
    group.salesQuantity += Number(row.salesQuantity) || 0;
    if (row.completeCostAmount === null || row.completeCostAmount === undefined) {
      group.complete = false;
    } else {
      group.completeCostAmount += Number(row.completeCostAmount) || 0;
    }
    groups[key] = group;
  });
  return Object.keys(groups).map(function (key) { return groups[key]; })
    .sort(function (left, right) { return left.versionNo - right.versionNo; })
    .map(function (group) {
      var salesText = _quantity(group.salesQuantity);
      if (!group.complete || !(group.salesQuantity > 0)) {
        return 'V' + group.versionNo + '：' + salesText + '份，成本—';
      }
      return 'V' + group.versionNo + '：' + salesText + '份，成本¥'
        + _money(group.completeCostAmount) + '（¥'
        + _money(group.completeCostAmount / group.salesQuantity) + '/份）';
    }).join('；');
}

function _normalizeHistoricalDish(row) {
  var item = Object.assign({}, row || {});
  item.statusLabel = _businessText(item.statusLabel);
  item.salesQuantityText = _quantity(item.salesQuantity);
  item.revenueAmountText = _money(item.revenueAmount);
  item.totalCostText = _money(item.totalHistoricalTheoreticalCostAmount);
  item.completeCostDisplayText = item.allComplete ? '¥' + item.totalCostText : '—';
  item.resolvedCostText = _money(item.resolvedHistoricalTheoreticalCostAmount);
  item.knownPartialCostText = _money(item.knownPartialCostAmount);
  item.costPerPortionText = _money(item.completeCostPerPortion);
  item.grossMarginRateText = _rate(item.completeGrossMarginRate);
  item.salesCoverageRateText = _rate(item.salesCoverageRate);
  item.evidenceCoverageRateText = _rate(item.evidenceCoverageRate);
  item.missingReasons = Array.isArray(item.missingReasons)
    ? item.missingReasons.map(_businessText) : [];
  item.hasKnownEvidence = Number(item.evidenceCoverageRate || 0) > 0;
  item.ingredientSummaries = (item.ingredientSummaries || []).map(_normalizeHistoricalIngredient);
  item.versionCostBreakdownText = _historicalVersionBreakdown(item.dailyRows);
  return item;
}

function _normalizeHistoricalSummary(summary) {
  var item = Object.assign({}, summary || {});
  item.totalCostText = _money(item.totalHistoricalTheoreticalCostAmount);
  item.resolvedCostText = _money(item.resolvedHistoricalTheoreticalCostAmount);
  item.knownPartialCostText = _money(item.knownPartialCostAmount);
  item.salesCoverageRateText = _rate(item.salesCoverageRate);
  item.evidenceCoverageRateText = _rate(item.evidenceCoverageRate);
  item.hasResolvedCost = Number(item.completedGrainCount || 0) > 0;
  item.hasKnownEvidence = Number(item.evidenceCoverageRate || 0) > 0;
  return item;
}

function _normalizeOriginalDish(row, historicalByFoodId, conversionByKey) {
  var item = Object.assign({}, row || {});
  item._foodId = _resolveDistributerFoodId(item);
  item._expanded = false;
  item._historical = historicalByFoodId[item._foodId] || null;
  item._theoryCostPerPortionText = '—';
  item._theoryCostTotalText = '—';
  item._costDiffPerPortionText = '—';
  item._costDiffRateText = '—';
  item._costDiffRateDisplayText = '—';
  item._costTotalDiffText = '—';
  item._ingredientDeviationTitle = item._historical ? '成本偏差率' : '偏差率';

  var historicalTotal = item._historical && item._historical.allComplete
    ? _decimal(item._historical.totalHistoricalTheoreticalCostAmount) : null;
  var historicalPerPortion = item._historical && item._historical.allComplete
    ? _decimal(item._historical.completeCostPerPortion) : null;
  var outboundTotal = _decimal(item.outboundAllocatedCostAmount);
  var salesPortions = _decimal(item.salesPortions);
  if (historicalTotal !== null && historicalPerPortion !== null) {
    item._theoryCostPerPortionText = _fixed(historicalPerPortion, 2);
    item._theoryCostTotalText = _fixed(historicalTotal, 2);
    if (outboundTotal !== null) {
      var totalDifference = outboundTotal - historicalTotal;
      item._costTotalDiffText = _fixed(totalDifference, 2);
      if (salesPortions !== null && salesPortions > 0) {
        item._costDiffPerPortionText = _fixed(totalDifference / salesPortions, 2);
      }
      if (historicalTotal > 0) {
        item._costDiffRateText = _fixed(totalDifference * 100 / historicalTotal, 2);
        item._costDiffRateDisplayText = item._costDiffRateText + '%';
      }
    }
  }

  var originalIngredientRows = Array.isArray(item.ingredientRows) ? item.ingredientRows : [];
  var ingredientSources = originalIngredientRows.map(function (ingredient) {
    return { original: ingredient, historical: null };
  });
  if (item._historical && Array.isArray(item._historical.ingredientSummaries)) {
    var originalIngredientsById = {};
    originalIngredientRows.forEach(function (ingredient) {
      var key = String(ingredient.disGoodsId || '');
      if (!originalIngredientsById[key]) originalIngredientsById[key] = [];
      originalIngredientsById[key].push(ingredient);
    });

    // “主要配料”必须以所选营业日期内实际命中的配方证据为准。
    // 旧分析接口的 ingredientRows 来自当前配方，会把查询区间外才生效的配料带进来；
    // 这里只复用同一配料的出库字段，不允许它决定本期应展示哪些配料。
    ingredientSources = item._historical.ingredientSummaries.map(function (historicalIngredient) {
      var key = String(historicalIngredient.rawGoodsId || '');
      var candidates = originalIngredientsById[key] || [];
      return {
        original: candidates.length ? candidates.shift() : {},
        historical: historicalIngredient,
      };
    });
  }
  item.ingredientRows = ingredientSources.map(function (source, ingredientIndex) {
    var historicalIngredient = source.historical;
    var normalized = Object.assign({}, source.original || {});
    if (historicalIngredient) {
      normalized.disGoodsId = historicalIngredient.rawGoodsId;
      normalized.gbDgGoodsName = normalized.gbDgGoodsName
        || historicalIngredient.rawGoodsName || historicalIngredient._name;
      normalized.gbDgGoodsFileImg = normalized.gbDgGoodsFileImg
        || historicalIngredient.rawGoodsImage;
      normalized.gbDgGoodsStandardname = normalized.gbDgGoodsStandardname
        || historicalIngredient.rawGoodsStandardName || _unit(historicalIngredient.baseUnitCode);
      normalized.gbDgGoodsStandardWeight = normalized.gbDgGoodsStandardWeight
        || historicalIngredient.rawGoodsStandardWeight;
    }
    normalized._intervalKey = historicalIngredient && historicalIngredient._key
      ? historicalIngredient._key : String(normalized.disGoodsId || ingredientIndex);
    normalized._imageUrl = _imageUrl(normalized.gbDgGoodsFileImg);
    normalized._hasOutboundEvidence = (_decimal(normalized.actualUsage) || 0) !== 0
      || (_decimal(normalized.actualProduceUsage) || 0) !== 0
      || (_decimal(normalized.actualLossAndWasteUsage) || 0) !== 0
      || (_decimal(normalized.outboundAllocatedCostPerPortion) || 0) !== 0;
    normalized._outboundCostText = normalized._hasOutboundEvidence
      ? _displayValue(normalized.outboundAllocatedCostPerPortion) : '—';
    normalized._historical = historicalIngredient;
    normalized._theoryCostText = historicalIngredient
      ? historicalIngredient._portionCostText : '—';
    normalized._theoryQuantityText = historicalIngredient
      ? historicalIngredient._portionText : '—';
    if (item._historical) {
      var costDeviation = _ingredientCostDeviation(normalized, historicalIngredient, salesPortions);
      normalized._devianceText = costDeviation.text;
      normalized._devianceHint = costDeviation.hint;
    } else {
      normalized._devianceText = _displayValue(normalized.devianceRate);
      normalized._devianceHint = '';
    }
    var allocatedQuantity = _allocatedQuantityDisplay(
      normalized, historicalIngredient, salesPortions, conversionByKey || {}
    );
    normalized._allocatedQuantityText = normalized._hasOutboundEvidence
      ? allocatedQuantity.text : '—';
    normalized._allocatedQuantityHint = normalized._hasOutboundEvidence
      ? allocatedQuantity.hint : '';
    return normalized;
  });
  item.ingredientCount = item.ingredientRows.length;
  item._hasOutboundEvidence = item.ingredientRows.some(function (ingredient) {
    return (_decimal(ingredient.actualUsage) || 0) !== 0
      || (_decimal(ingredient.actualProduceUsage) || 0) !== 0
      || (_decimal(ingredient.actualLossAndWasteUsage) || 0) !== 0
      || (_decimal(ingredient.outboundAllocatedCostPerPortion) || 0) !== 0;
  });
  item._outboundCostPerPortionText = item._hasOutboundEvidence
    ? _displayValue(item.outboundAllocatedCostPerPortion) : '—';
  item._outboundCostAmountText = item._hasOutboundEvidence
    ? _displayValue(item.outboundAllocatedCostAmount) : '—';
  if (!item._hasOutboundEvidence) {
    item._costDiffPerPortionText = '—';
    item._costDiffRateText = '—';
    item._costDiffRateDisplayText = '—';
    item._costTotalDiffText = '—';
  }
  return item;
}

function _buildScopeDisplay(originalScope, historicalSummary) {
  var original = Object.assign({}, originalScope || {});
  original.outboundAllocatedCostTotal = _displayValue(original.outboundAllocatedCostTotal);
  original.theoreticalCostTotal = '—';
  original.costDeviationTotal = '—';
  original.costDeviationRate = '—';
  original.costDeviationRateDisplay = '—';
  original._theoreticalHint = '部分菜品尚未完整核算';
  original._deviationHint = '缺失成本不按 0 元计算';
  if (!historicalSummary || !historicalSummary.allComplete) return original;

  var theoreticalTotal = _decimal(historicalSummary.totalHistoricalTheoreticalCostAmount);
  var outboundTotal = _decimal(originalScope && originalScope.outboundAllocatedCostTotal);
  if (theoreticalTotal === null) return original;
  original.theoreticalCostTotal = _fixed(theoreticalTotal, 2);
  original._theoreticalHint = '按营业日有效配方和当日有效入库价';
  if (outboundTotal !== null) {
    var difference = outboundTotal - theoreticalTotal;
    original.costDeviationTotal = _fixed(difference, 2);
    original.costDeviationRate = theoreticalTotal > 0
      ? _fixed(difference * 100 / theoreticalTotal, 2) : '—';
    original.costDeviationRateDisplay = original.costDeviationRate === '—'
      ? '—' : original.costDeviationRate + '%';
    original._deviationHint = '与理论总成本同范围比较';
  }
  return original;
}

function _filterDishRowsByDishName(list, keyword) {
  var arr = Array.isArray(list) ? list : [];
  var value = (keyword == null ? '' : String(keyword)).trim().toLowerCase();
  if (!value) return arr.slice();
  return arr.filter(function (row) {
    var first = row.dishName != null ? String(row.dishName) : '';
    var second = row.gbDfFoodName != null ? String(row.gbDfFoodName) : '';
    return first.toLowerCase().indexOf(value) !== -1
      || second.toLowerCase().indexOf(value) !== -1;
  });
}

Page({
  data: {
    salesDishRows: [],
    salesDishRowsAll: [],
    scopeSalesSubtotals: null,
    historicalSummary: null,
    historicalReportAvailable: false,
    loading: false,
    emptyHint: '',
    update: false,
    searchDepId: '-1',
    sortBy: 'diffCostPerPortion',
    sortOrder: 'desc',
    abnormalFirst: false,
    searchBarOpen: false,
    searchInputFocus: false,
    dishNameSearch: '',
    dishNameSearchDraft: '',
    mendianInfo: null,
    activeSubDepIndex: 0,
    activeSubDepId: '',
    activeSubDepName: '',
    subDepPickerRange: [],
  },

  onLoad: function (options) {
    var userInfo = wx.getStorageSync('userInfo');
    var disInfo = wx.getStorageSync('disInfo');
    var mendianInfo = wx.getStorageSync('mendianInfo');
    var disId = (options && options.disId)
      || (disInfo && disInfo.gbDistributerId)
      || (userInfo && userInfo.gbDuDistributerId);
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: config.server,
      disId: disId,
      mendianInfo: mendianInfo || null,
      depFatherId: mendianInfo && mendianInfo.gbDepartmentId,
    });
    this._syncDatesFromMyDateStorage();
    this._fetchReport();
  },

  onShow: function () {
    if (!this.data.update) return;
    this._syncDatesFromMyDateStorage();
    this.setData({ update: false });
    this._fetchReport();
  },

  onUnload: function () {
    if (this._dishSearchDebounceTimer) {
      clearTimeout(this._dishSearchDebounceTimer);
      this._dishSearchDebounceTimer = null;
    }
  },

  _syncDatesFromMyDateStorage: function () {
    var myDate = wx.getStorageSync('myDate');
    var dateRange;
    if (myDate) {
      dateRange = myDate.name === 'custom'
        ? dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate)
        : dateUtils.getDateRange(myDate.name);
      this.setData({
        startDate: dateRange.startDate,
        stopDate: dateRange.stopDate,
        dateType: myDate.dateType,
        hanzi: myDate.hanzi || dateRange.name,
      });
      return;
    }
    this.setData({
      dateType: 'month',
      startDate: dateUtils.getFirstDateInMonth(),
      stopDate: dateUtils.getArriveDate(0),
      hanzi: '本月',
    });
  },

  _fetchReport: function () {
    var that = this;
    if (!this.data.disId || !this.data.depFatherId || !this.data.startDate || !this.data.stopDate) {
      this.setData({
        scopeSalesSubtotals: null,
        historicalSummary: null,
        historicalReportAvailable: false,
        salesDishRowsAll: [],
        salesDishRows: [],
        emptyHint: '缺少门店或日期信息，暂时无法查询',
      });
      return;
    }

    var originalRequest = {
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      endDate: this.data.stopDate,
      disId: this.data.disId,
      searchDepId: this.data.searchDepId,
      depFatherId: this.data.depFatherId,
      sortBy: this.data.sortBy || 'diffCostPerPortion',
      sortOrder: this.data.sortOrder || 'desc',
    };
    if (this.data.activeSubDepId !== null && this.data.activeSubDepId !== '') {
      originalRequest.subDepId = this.data.activeSubDepId;
    }
    var historicalRequest = {
      distributerId: this.data.disId,
      storeDepartmentId: this.data.depFatherId,
      startDate: this.data.startDate,
      endDate: this.data.stopDate,
      sortBy: 'status',
      sortOrder: 'desc',
    };

    load.showLoading('加载中');
    this.setData({ loading: true, emptyHint: '' });
    var historicalPromise = chartsApi.getDishDailyCostReport(historicalRequest).catch(function () {
      return null;
    });
    var conversionPromise = preparationApi.listConversions({
      distributerId: this.data.disId,
      itemKind: 'RAW_GOODS',
    }).catch(function () {
      return [];
    });

    Promise.all([
      chartsApi.getGbIngredientAnalysis(originalRequest),
      historicalPromise,
      conversionPromise,
    ]).then(function (responses) {
      load.hideLoading();
      var originalResult = responses[0] && responses[0].result;
      if (!originalResult || originalResult.code !== 0 || !originalResult.data) {
        throw new Error((originalResult && originalResult.msg) || '菜品分析加载失败');
      }
      var originalData = originalResult.data;
      var historicalResult = responses[1] && responses[1].result;
      var historicalData = historicalResult && historicalResult.code === 0
        ? historicalResult.data : null;
      var historicalByFoodId = {};
      if (historicalData && Array.isArray(historicalData.dishes)) {
        historicalData.dishes.map(_normalizeHistoricalDish).forEach(function (dish) {
          var foodId = _resolveDistributerFoodId(dish);
          if (foodId) historicalByFoodId[foodId] = dish;
        });
      }
      var conversionByKey = _buildConversionMap(responses[2]);
      var rows = (originalData.salesDishRows || []).map(function (row) {
        return _normalizeOriginalDish(row, historicalByFoodId, conversionByKey);
      });
      var returnedOrder = originalData.sortOrder;
      that.setData({
        loading: false,
        scopeSalesSubtotals: _buildScopeDisplay(
          originalData.scopeSalesSubtotals,
          historicalData ? _normalizeHistoricalSummary(historicalData.summary) : null
        ),
        historicalSummary: historicalData ? _normalizeHistoricalSummary(historicalData.summary) : null,
        historicalReportAvailable: !!historicalData,
        salesDishRowsAll: rows,
        sortOrder: returnedOrder === 'asc' || returnedOrder === 'desc'
          ? returnedOrder : that.data.sortOrder,
        emptyHint: rows.length ? '' : '当前日期范围暂无菜品分析数据',
      });
      that._applyDishFilter(rows);
    }).catch(function (error) {
      load.hideLoading();
      that.setData({
        loading: false,
        scopeSalesSubtotals: null,
        historicalSummary: null,
        historicalReportAvailable: false,
        salesDishRowsAll: [],
        salesDishRows: [],
        emptyHint: (error && error.message) || '菜品分析加载失败',
      });
    });
  },

  _applyDishFilter: function (allRows) {
    var base = allRows || this.data.salesDishRowsAll || [];
    var afterName = _filterDishRowsByDishName(base, this.data.dishNameSearch);
    var output = afterName.slice();
    if (this.data.abnormalFirst) {
      output = afterName.filter(function (dish) {
        var value = _decimal(dish && dish._costDiffPerPortionText);
        return !isNaN(value) && Math.abs(value) > 1e-6;
      });
    }
    var sortBy = this.data.sortBy;
    var direction = this.data.sortOrder === 'asc' ? 1 : -1;
    output.sort(function (left, right) {
      var leftValue = sortBy === 'ingredientCount'
        ? _decimal(left && left.ingredientCount)
        : _decimal(left && (sortBy === 'diffRate'
          ? left._costDiffRateText : left._costDiffPerPortionText));
      var rightValue = sortBy === 'ingredientCount'
        ? _decimal(right && right.ingredientCount)
        : _decimal(right && (sortBy === 'diffRate'
          ? right._costDiffRateText : right._costDiffPerPortionText));
      if (leftValue === null && rightValue === null) return 0;
      if (leftValue === null) return 1;
      if (rightValue === null) return -1;
      return (leftValue - rightValue) * direction;
    });
    this.setData({ salesDishRows: output });
  },

  onToggleDishDetail: function (e) {
    var index = e.currentTarget.dataset.index;
    if (index === undefined || index === null) return;
    var key = 'salesDishRows[' + index + ']._expanded';
    var row = this.data.salesDishRows[index];
    this.setData({ [key]: !(row && row._expanded) });
  },

  onOpenCostEvidence: function (e) {
    var data = (e && e.currentTarget && e.currentTarget.dataset) || {};
    if (!data.resultId) {
      wx.showToast({ title: '该配料还没有可查看的成本证据', icon: 'none' });
      return;
    }
    this.setData({ update: true });
    wx.navigateTo({
      url: '/subPackage-charts/pages/cost/costEvidenceDetail/costEvidenceDetail'
        + '?resultId=' + encodeURIComponent(data.resultId)
        + '&distributerId=' + encodeURIComponent(this.data.disId || '')
        + '&storeDepartmentId=' + encodeURIComponent(this.data.depFatherId || '')
        + '&foodId=' + encodeURIComponent(data.foodId || '')
        + '&businessDate=' + encodeURIComponent(data.businessDate || '')
        + '&dishName=' + encodeURIComponent(data.dishName || ''),
    });
  },

  onToggleSearchBar: function () {
    var open = !this.data.searchBarOpen;
    this.setData({
      searchBarOpen: open,
      searchInputFocus: open,
      dishNameSearchDraft: this.data.dishNameSearch || '',
    });
  },

  onDishNameSearchInput: function (e) {
    var that = this;
    var value = (e.detail && e.detail.value) || '';
    this.setData({ dishNameSearchDraft: value });
    if (this._dishSearchDebounceTimer) clearTimeout(this._dishSearchDebounceTimer);
    this._dishSearchDebounceTimer = setTimeout(function () {
      that.setData({ dishNameSearch: (that.data.dishNameSearchDraft || '').trim() });
      that._applyDishFilter();
    }, 350);
  },

  onDishNameSearchConfirm: function (e) {
    var value = ((e.detail && e.detail.value) || this.data.dishNameSearchDraft || '').trim();
    if (this._dishSearchDebounceTimer) clearTimeout(this._dishSearchDebounceTimer);
    this.setData({ dishNameSearch: value, dishNameSearchDraft: value });
    this._applyDishFilter();
  },

  onDishNameSearchClear: function () {
    if (this._dishSearchDebounceTimer) clearTimeout(this._dishSearchDebounceTimer);
    this.setData({ dishNameSearch: '', dishNameSearchDraft: '' });
    this._applyDishFilter();
  },

  onToggleAbnormal: function () {
    this.setData({ abnormalFirst: !this.data.abnormalFirst });
    this._applyDishFilter();
  },

  onIngredientSort: function (e) {
    var sort = e.currentTarget.dataset.sort;
    if (!sort) return;
    if (sort === this.data.sortBy) {
      this.setData({ sortOrder: this.data.sortOrder === 'asc' ? 'desc' : 'asc' });
      this._applyDishFilter();
      return;
    }
    this.setData({ sortBy: sort, sortOrder: 'desc' });
    this._applyDishFilter();
  },

  toDatePage: function () {
    this.setData({ update: true });
    wx.navigateTo({
      url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate
        + '&stopDate=' + this.data.stopDate
        + '&dateType=' + (this.data.dateType || 'month'),
    });
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  },

  onOpenIngredients: function (e) {
    var dish = e.currentTarget.dataset.dish;
    if (!dish) return;
    var foodId = _resolveDistributerFoodId(dish);
    if (!foodId) {
      wx.showToast({ title: '缺少菜品ID，无法打开配料看板', icon: 'none' });
      return;
    }
    var data = this.data;
    if (!data.startDate || !data.stopDate) {
      wx.showToast({ title: '请先在页顶选择有效日期', icon: 'none' });
      return;
    }
    var disId = data.disId;
    if (disId === null || disId === undefined || disId === '') {
      var disInfo = wx.getStorageSync('disInfo');
      if (disInfo && disInfo.gbDistributerId !== null && disInfo.gbDistributerId !== undefined) {
        disId = disInfo.gbDistributerId;
      }
    }
    if (disId === null || disId === undefined || disId === '') {
      wx.showToast({ title: '缺少门店信息', icon: 'none' });
      return;
    }
    if (data.depFatherId === null || data.depFatherId === undefined || data.depFatherId === '') {
      wx.showToast({ title: '缺少父部门，无法查配料', icon: 'none' });
      return;
    }
    var query = [
      'foodId=' + encodeURIComponent(foodId),
      'startDate=' + encodeURIComponent(data.startDate),
      'stopDate=' + encodeURIComponent(data.stopDate),
      'endDate=' + encodeURIComponent(data.stopDate),
      'disId=' + encodeURIComponent(String(disId)),
      'depFatherId=' + encodeURIComponent(String(data.depFatherId)),
    ];
    var name = dish.dishName || dish.gbDfFoodName;
    if (name) query.push('foodName=' + encodeURIComponent(String(name)));
    if (data.hanzi) query.push('hanzi=' + encodeURIComponent(String(data.hanzi)));
    wx.navigateTo({
      url: '/subPackage-mendian/pages/management/dishIngredientDashboard/dishIngredientDashboard?'
        + query.join('&'),
    });
  },
});
