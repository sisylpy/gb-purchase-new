const app = getApp()
const globalData = app.globalData;
var load = require('../../../../lib/load.js');
var preparationApi = require('../../../../services/preparation');
var preparationUtil = require('../../../../utils/preparation');


import {
  saveGbFoodGoodsItem,
  deleteGbFoodGoods,
  updateGbFoodGoods,
  quickSearchDisGoodsForFoodIngredient,
  getFoodGoodsList,
  updateGrossMargin,
  getFoodByFoodId,
} from '../../../../services/apiDistributerGbFood'

var stockUnit = require('../../../../lib/stockUnitConvert.js');
var MIN_UNIT_OPTIONS = stockUnit.MIN_UNIT_OPTIONS;
var COUNT_MIN_UNITS = ['个', '只', '张', '枚', '条', '根', '颗'];
var QUICK_DOSAGE_PRESETS = [5, 10, 15];
var COST_DAYS_OPTIONS = [7, 30, 65, 90];
/** 规格≥该斤数且包装为袋/箱等 → 默认用「斤」而非 g（如 50斤/袋） */
var BULK_WEIGHT_JIN_THRESHOLD = 10;
/** 规格≥该克数且为大包装 → 同上 */
var BULK_WEIGHT_G_THRESHOLD = 5000;
/** 原料弹窗距顶：仅搜索时留白多；已选商品展示表单时上移 */
var MODAL_PAD_TOP_RATIO_SEARCH = 0.23;
var MODAL_PAD_TOP_RATIO_PICKED = 0.08;
var PREPARATION_MIGRATION_CACHE_PREFIX = 'preparationFoodRecipeMigration:';
var RECIPE_REPLACEMENT_CONTEXT_PREFIX = 'foodRecipeReplacementContext:';
var P1_STANDARD_UNITS = ['G', 'KG', 'JIN', 'ML', 'L', 'EA'];

function _todayText() {
  var now = new Date();
  var month = String(now.getMonth() + 1).padStart(2, '0');
  var day = String(now.getDate()).padStart(2, '0');
  return now.getFullYear() + '-' + month + '-' + day;
}

function _toP1Unit(unit) {
  var value = String(unit || '').trim();
  var lower = value.toLowerCase();
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
  return aliases[lower] || aliases[value] || value.toUpperCase();
}

function _fromP1Unit(unit) {
  var labels = {
    G: 'g',
    KG: 'kg',
    JIN: '斤',
    ML: 'ml',
    L: 'L',
    EA: '个',
  };
  var normalized = String(unit || '').toUpperCase();
  return labels[normalized] || unit || '';
}

function _purchaseUnitCode(unit) {
  return _toP1Unit(unit);
}

function _baseUnitInfo(unit) {
  var normalized = _toP1Unit(unit);
  if (normalized === 'G') return { dimension: 'MASS', factor: 1 };
  if (normalized === 'KG') return { dimension: 'MASS', factor: 1000 };
  if (normalized === 'JIN') return { dimension: 'MASS', factor: 500 };
  if (normalized === 'ML') return { dimension: 'VOLUME', factor: 1 };
  if (normalized === 'L') return { dimension: 'VOLUME', factor: 1000 };
  if (normalized === 'EA') return { dimension: 'COUNT', factor: 1 };
  return null;
}

/**
 * 将页面上已经由用户确认的采购包装规格整理为后端单位证据。
 * factorToBase 始终换算到 g/ml/个，不把“50斤/袋”错误保存为 50g/袋。
 */
function _rawGoodsPurchaseEvidence(goods, minUnit, packQtyInMin) {
  var entity = _getGoodsEntity(goods);
  var packUnit = String(entity.gbDgGoodsStandardname || '').trim();
  var base = _baseUnitInfo(minUnit);
  var quantity = Number(packQtyInMin);
  if (!packUnit || !base || !(quantity > 0)) return null;
  return {
    rawGoodsId: Number(entity.gbDistributerGoodsId),
    name: entity.gbDgGoodsName || '',
    purchaseUnitCode: _purchaseUnitCode(packUnit),
    dimension: base.dimension,
    factorToBase: quantity * base.factor,
  };
}

function _unitFactorToGram(unit) {
  var factors = { G: 1, KG: 1000, JIN: 500 };
  return factors[String(unit || '').toUpperCase()] || 0;
}

function _legacyRawToP1Component(raw) {
  var display = _convertPackToMinUnitForDisplay(
    raw.gbDfgGoodsAmount,
    raw.gbDfgGoodsStandardname,
    _getGoodsEntity(raw),
    raw
  );
  return {
    itemKind: 'RAW_GOODS',
    rawGoodsId: Number(raw.gbDfgDisGoodsId),
    quantityPerPortion: Number(display.portion),
    inputUnitCode: _toP1Unit(display.minUnit),
  };
}

/** 解析规格字符串中的数值与单位（如 3Kg、500g、1.5斤） */
function _parseWeightUnit(weightStr) {
  var s = String(weightStr || '').trim();
  if (!s || s === 'null') return null;
  var num = parseFloat(s.replace(/[^\d.]/g, ''));
  if (isNaN(num) || num <= 0) return null;
  var lower = s.toLowerCase();
  if (/kg|公斤|千克/.test(lower)) return { amount: num, unit: 'kg' };
  if (/斤/.test(s)) return { amount: num, unit: 'jin' };
  if (/ml|毫升/.test(lower)) return { amount: num, unit: 'ml' };
  if (/(^|\d)\s*l$|升/.test(lower) && !/ml/.test(lower)) return { amount: num, unit: 'l' };
  if (/g|克/.test(lower)) return { amount: num, unit: 'g' };
  return { amount: num, unit: '' };
}

/** 将规格重量换算为最小计量（g / ml） */
function _weightToMinUnitQty(parsed, minUnit) {
  if (!parsed || !parsed.amount) return 0;
  var n = parsed.amount;
  var u = (minUnit || '').trim();
  if (parsed.unit === 'kg') {
    if (u === '斤') return n * 2;
    if (u === 'g') return n * 1000;
    return 0;
  }
  if (parsed.unit === 'jin') {
    if (u === '斤') return n;
    if (u === 'g') return n * 500;
    return 0;
  }
  if (parsed.unit === 'l') {
    return u === 'ml' ? n * 1000 : n * 1000;
  }
  if (parsed.unit === 'ml') return n;
  if (parsed.unit === 'g') return n;
  return n;
}

function _minUnitFromWeightStr(weightStr, packUnit) {
  var s = String(weightStr || '');
  var lower = s.toLowerCase();
  if (/ml|毫升/.test(lower) && !/kg|公斤|千克|斤|克|\d\s*g|\dg/.test(lower)) return 'ml';
  if (/升|(^|\d)\s*l$/.test(lower) && !/ml/.test(lower)) return 'ml';
  // 50斤/袋：规格本身是斤，默认按斤录入，避免 50×500 被当成 25000g
  if (/斤/.test(s) && !/kg|公斤|千克|克|\d\s*g\b|\d+g\b|g\//.test(lower)) return '斤';
  if (/kg|公斤|千克|g|克/.test(lower)) return 'g';
  if (/瓶|罐|桶|升/.test(packUnit || '')) {
    if (/kg|公斤|千克|斤|克/.test(lower)) return 'g';
    return 'ml';
  }
  return '';
}

function _parsedWeightSpec(goods) {
  var g = _getGoodsEntity(goods);
  var w = g.gbDgGoodsStandardWeight;
  if (!w || w === 'null' || !String(w).trim()) return null;
  return _parseWeightUnit(w);
}

function _rawPackSpecAmount(goods) {
  var parsed = _parsedWeightSpec(goods);
  return parsed ? parsed.amount : 0;
}

/** 大包装重量：50斤/袋、100斤/袋等，不宜默认拆成 g */
function _isBulkWeightPack(goods, packUnit) {
  var parsed = _parsedWeightSpec(goods);
  if (!parsed) return false;
  var pu = (packUnit || '').trim();
  if (!/袋|箱|包|桶|筐|框|捆/.test(pu)) return false;
  if (parsed.unit === 'jin') return parsed.amount >= BULK_WEIGHT_JIN_THRESHOLD;
  if (parsed.unit === 'kg') return parsed.amount >= 5;
  if (parsed.unit === 'g') return parsed.amount >= BULK_WEIGHT_G_THRESHOLD;
  return false;
}

function _packQtyInMinUnit(goods, minUnit) {
  var g = _getGoodsEntity(goods);
  var packUnit = (g.gbDgGoodsStandardname || '').trim();
  var mu = (minUnit || '').trim();
  if (_isCountMinUnit(mu)) {
    var raw = _rawPackSpecAmount(g);
    if (raw > 0 && raw <= 500) return raw;
    return 0;
  }
  var parsed = _parsedWeightSpec(g);
  if (parsed) {
    var fromWeight = _weightToMinUnitQty(parsed, mu);
    if (fromWeight > 0) return fromWeight;
  }
  var rawAmt = parsed ? parsed.amount : 0;
  var conventional = _conventionalPackRatio(packUnit, mu, rawAmt);
  if (conventional > 0) return conventional;
  if (rawAmt > 0) return rawAmt;
  if (packUnit === '斤') return mu === '斤' ? 1 : 500;
  if (packUnit === '公斤' || packUnit === 'kg' || packUnit === 'KG') {
    return mu === '斤' ? 2 : 1000;
  }
  if (packUnit && mu === packUnit) return 1;
  return 0;
}

/** @deprecated 请用 _rawPackSpecAmount / _packQtyInMinUnit */
function _parsePackQty(goods) {
  var g = _getGoodsEntity(goods);
  var packUnit = (g.gbDgGoodsStandardname || '').trim();
  var minUnit = _suggestMinUnit(packUnit, _rawPackSpecAmount(g), g);
  return _packQtyInMinUnit(g, minUnit);
}

function _minUnitOptionsForGoods(goods, suggestedMin) {
  var g = _getGoodsEntity(goods);
  var packUnit = (g.gbDgGoodsStandardname || '').trim();
  return stockUnit.buildUnitPickerOptions(packUnit, suggestedMin, true, g);
}

function _isCountMinUnit(unit) {
  return COUNT_MIN_UNITS.indexOf((unit || '').trim()) >= 0;
}

/** 按斤/公斤买、按个/只计量的商品（如鸡蛋 8个/斤） */
function _isCountPerPackGoods(goods, packUnit, parsedQty) {
  var g = goods || {};
  var name = g.gbDgGoodsName || '';
  if (/鸡蛋|鸭蛋|咸蛋|皮蛋|禽蛋/.test(name)) return true;
  var u = (packUnit || '').trim();
  if ((u === '斤' || u === '公斤' || u === 'kg' || u === 'KG') && parsedQty > 0
    && parsedQty <= 200 && Math.floor(parsedQty) === parsedQty) {
    return true;
  }
  return false;
}

/** 按「打」计数采购（一打 = 12 个） */
function _isDozenPackUnit(packUnit) {
  var u = (packUnit || '').trim();
  return u === '一打' || u === '打';
}

function _suggestMinUnit(packUnit, parsedQty, goods) {
  var u = (packUnit || '').trim();
  // 瓶/桶/罐 等容器：优先检查标准规格是重量还是体积
  if (/瓶|罐|桶|升/i.test(u)) {
    var g = goods || {};
    var w = String(g.gbDgGoodsStandardWeight || '').trim().toLowerCase();
    // 标准规格含重量单位 → 按重量换算用 g
    if (/kg|公斤|千克|斤|克/.test(w)) return 'g';
    // 否则按体积换算用 ml
    return 'ml';
  }
  if (_isDozenPackUnit(u)) return '个';
  if (_isCountPerPackGoods(goods, u, parsedQty)) return '个';
  if (u === '斤' || u === '公斤' || u === 'kg' || u === 'KG') return 'g';
  if (/个|只|张|枚/.test(u) && (!parsedQty || parsedQty <= 1)) return '个';
  if (/盒|包|袋|箱/.test(u)) {
    var wStr = (goods && goods.gbDgGoodsStandardWeight) || '';
    if (_isBulkWeightPack(goods, u)) {
      return _minUnitFromWeightStr(wStr, u) || '斤';
    }
    if (parsedQty > 1) {
      return _minUnitFromWeightStr(wStr, u) || 'g';
    }
    return '个';
  }
  if (u === '袋' || u === '箱') {
    var wStr2 = (goods && goods.gbDgGoodsStandardWeight) || '';
    return _rawPackSpecAmount(goods) > 0
      ? (_minUnitFromWeightStr(wStr2, u) || 'g')
      : u;
  }
  return u || 'g';
}

/** 按体积采购的包装（瓶 / 桶 / 罐等） */
function _isVolumePurchaseUnit(packUnit) {
  var u = (packUnit || '').trim();
  return /瓶|罐|桶/.test(u) || u === '升' || u === 'L' || u === 'l';
}

/** 按重量采购的包装单位（斤 / 公斤） */
function _isWeightPurchaseUnit(packUnit) {
  var u = (packUnit || '').trim();
  return u === '斤' || u === '公斤' || u === 'kg' || u === 'KG';
}

/**
 * 1 包装 = 多少最小单位（g/ml/个）
 * - 斤→500g，公斤→1000g，升→1000ml，一打→12个
 * - 瓶/桶且主数据带毫升规格→用 parsedQty（如 500ml/瓶）
 */
function _conventionalPackRatio(packUnit, minUnit, parsedQty) {
  var mu = (minUnit || '').trim();
  var u = (packUnit || '').trim();
  var pq = parseFloat(parsedQty) || 0;
  if (mu === 'g') {
    if (u === '斤') return 500;
    if (u === '公斤' || u === 'kg' || u === 'KG') return 1000;
  }
  if (mu === '斤') {
    if (u === '斤') return 1;
    if (u === '公斤' || u === 'kg' || u === 'KG') return 2;
  }
  if (mu === 'ml') {
    if (u === '升' || u === 'L' || u === 'l') return 1000;
    // 仅规格已是毫升时 pq 才表示 ml（如 500ml/瓶）；4.5L/桶 须走 _weightToMinUnitQty
    if (_isVolumePurchaseUnit(u) && pq >= 50) return pq;
  }
  if (_isCountMinUnit(mu)) {
    if (_isDozenPackUnit(u)) return 12;
  }
  return 0;
}

function _defaultPackQtyInMinUnit(packUnit, parsedQty, minUnit, goods) {
  if (_isCountMinUnit(minUnit)) {
    if (parsedQty > 0 && parsedQty <= 500) return parsedQty;
    return 0;
  }
  if (goods) {
    var fromSpec = _packQtyInMinUnit(goods, minUnit);
    if (fromSpec > 0) return fromSpec;
  }
  var conventional = _conventionalPackRatio(packUnit, minUnit, parsedQty);
  if (conventional > 0) return conventional;
  if (parsedQty > 0) return parsedQty;
  var u = (packUnit || '').trim();
  if (u === '斤') return 500;
  if (u === '公斤' || u === 'kg' || u === 'KG') return 1000;
  return 1;
}

/** 商品主数据是否已配置可用于换算的默认规格（如 500ml/瓶、8个/斤、1斤=500g） */
function _hasGoodsDefaultSpec(goods, minUnit) {
  var g = _getGoodsEntity(goods);
  var packUnit = (g.gbDgGoodsStandardname || '').trim();
  var rawAmt = _rawPackSpecAmount(g);
  var mu = (minUnit || '').trim();
  if (!packUnit) return false;
  if (mu === packUnit) return true;
  if (_conventionalPackRatio(packUnit, mu, rawAmt) > 0) return true;
  if (_packQtyInMinUnit(g, mu) > 0) return true;
  return false;
}

/** 换算用「1包装 = 多少最小单位」：用户填写优先；无默认规格时不使用系统猜测值 */
function _effectivePackQtyInMin(goods, minUnit, userInputStr) {
  var g = _getGoodsEntity(goods);
  var packUnit = g.gbDgGoodsStandardname || '';
  var userVal = userInputStr != null && String(userInputStr).trim() !== ''
    ? (parseFloat(userInputStr) || 0)
    : 0;
  if (userVal > 0) return userVal;
  if (_hasGoodsDefaultSpec(goods, minUnit)) {
    var def = _defaultPackQtyInMinUnit(packUnit, _rawPackSpecAmount(g), minUnit, g);
    if (def > 0) return def;
  }
  if (packUnit && (minUnit || '').trim() === packUnit) return 1;
  return 0;
}

function _needsManualConversion(goods, minUnit) {
  var g = _getGoodsEntity(goods);
  var packUnit = (g.gbDgGoodsStandardname || '').trim();
  if (!packUnit) return false;
  return (minUnit || '').trim() !== packUnit && !_hasGoodsDefaultSpec(goods, minUnit);
}

function _formatPortionsPerPack(portion, packQtyInMin, minUnit, packUnit) {
  if (!portion || portion <= 0 || !packQtyInMin || packQtyInMin <= 0) return '—';
  var n;
  if (packUnit && minUnit === packUnit) {
    n = 1 / portion;
  } else {
    n = packQtyInMin / portion;
  }
  if (!n || n <= 0 || !isFinite(n)) return '—';
  if (n >= 100) return String(Math.floor(n));
  if (Math.abs(n - Math.floor(n)) < 0.05) return String(Math.floor(n));
  return parseFloat(n.toFixed(1)).toString();
}

function _getGoodsEntity(rawOrGoods) {
  if (!rawOrGoods) return {};
  return rawOrGoods.gbDistributerGoodsEntity
    || rawOrGoods.distributerGoodsEntity
    || rawOrGoods;
}

/** 商品完整详情接口返回 { goodsInfo, ... }，配方接口直接返回轻量 rawGoods。 */
function _normalizeRawGoodsPayload(payload) {
  var value = payload || {};
  return value.rawGoods || value.goodsInfo || value.gbDistributerGoodsEntity || value;
}

function _goodsImageUrl(baseUrl, goods) {
  var value = _normalizeRawGoodsPayload(goods);
  var path = value.gbDgNxFatherImg || value.gbDgNxFatherImgLarge || '';
  if (!path) return '';
  if (/^https?:\/\//i.test(String(path))) return path;
  return String(baseUrl || '') + String(path);
}

function _defaultPortionAmount(minUnit) {
  if (_isCountMinUnit(minUnit)) return '1';
  if ((minUnit || '').trim() === '斤') return '0.2';
  return '5';
}

function _buildUnitContext(goods, opts) {
  var options = opts || {};
  var g = _getGoodsEntity(goods);
  var packUnit = g.gbDgGoodsStandardname || '';
  var rawAmt = _rawPackSpecAmount(g);
  var stdWeight = (g.gbDgGoodsStandardWeight || '').trim();
  var minUnit = options.minUnit || _suggestMinUnit(packUnit, rawAmt, g);
  var packQtyInMin = _effectivePackQtyInMin(g, minUnit, options.packQtyInMin);
  var packLabel = '';
  if (stdWeight && packUnit && stdWeight !== 'null') {
    packLabel = stdWeight + '/' + packUnit;
  } else if (rawAmt > 0) {
    if (minUnit === 'ml' || minUnit === 'g') {
      packLabel = rawAmt + minUnit + '/' + packUnit;
    } else if (_isCountMinUnit(minUnit)) {
      packLabel = rawAmt + minUnit + '/' + packUnit;
    } else if (minUnit === '斤') {
      packLabel = rawAmt + '斤/' + packUnit;
    } else {
      packLabel = rawAmt + '/' + packUnit;
    }
  } else if (packUnit) {
    var convQty = _defaultPackQtyInMinUnit(packUnit, rawAmt, minUnit, g);
    if (convQty > 0 && (minUnit === 'g' || minUnit === 'ml' || _isCountMinUnit(minUnit))
      && (_isWeightPurchaseUnit(packUnit) || _isVolumePurchaseUnit(packUnit) || _isDozenPackUnit(packUnit))) {
      packLabel = convQty + minUnit + '/' + packUnit;
    } else {
      packLabel = '1' + packUnit;
    }
  }
  var price = parseFloat(g.gbDgGoodsAveragePrice) || 0;
  var convHint = _conventionalPackRatio(packUnit, minUnit, rawAmt);
  var conversionPlaceholder = '如500';
  if (_isCountMinUnit(minUnit)) {
    conversionPlaceholder = _isDozenPackUnit(packUnit) ? '12' : '如8';
  } else if (convHint > 0) {
    conversionPlaceholder = String(convHint);
  }
  var packPriceLabel = price > 0
    ? ('¥ ' + price.toFixed(2) + '/' + packUnit)
    : '最近无采购价';
  var conversionRequired = _needsManualConversion(g, minUnit);
  return {
    packUnit: packUnit,
    packQtyInMin: packQtyInMin,
    minUnit: minUnit,
    packLabel: packLabel,
    packPriceLabel: packPriceLabel,
    packPrice: price,
    conversionPlaceholder: conversionPlaceholder,
    conversionRequired: conversionRequired,
    hasGoodsDefaultSpec: _hasGoodsDefaultSpec(g, minUnit),
    isBulkWeightPack: _isBulkWeightPack(g, packUnit),
  };
}

function _gcd(a, b) {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) {
    var t = a % b;
    a = b;
    b = t;
  }
  return a || 1;
}

/** 展示用最小单位用量（g/ml 贴近整数，避免 50.001） */
function _formatMinUnitPortion(n, minUnit) {
  if (isNaN(n) || n <= 0) return '0';
  var u = (minUnit || '').trim();
  if (u === 'g' || u === 'ml') {
    var ri = Math.round(n);
    if (Math.abs(n - ri) < 0.008) return String(ri);
    return parseFloat(n.toFixed(3)).toString();
  }
  if (u === '斤') {
    return parseFloat(n.toFixed(3)).toString();
  }
  if (_isCountMinUnit(u)) {
    var c = Math.round(n);
    if (Math.abs(n - c) < 0.02) return String(c);
    return parseFloat(n.toFixed(2)).toString();
  }
  return parseFloat(n.toFixed(4)).toString();
}

/** 由「每份占用包装分数」反推最小单位用量，避免 0.016667×3000=50.001 */
function _restoreMinPortionFromPackAmount(packAmount, packQtyInMin, minUnit) {
  var a = parseFloat(packAmount) || 0;
  var pq = parseFloat(packQtyInMin) || 0;
  if (a <= 0) return '0';
  if (pq > 0 && pq === Math.floor(pq)) {
    var maxP = (minUnit === 'g' || minUnit === 'ml') ? 100000 : 500;
    var bestP = 0;
    var bestDiff = 1e9;
    for (var p = 1; p <= maxP; p++) {
      var diff = Math.abs(p / pq - a);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestP = p;
      }
      if (diff < 1e-9) break;
    }
    if (bestP > 0 && bestDiff < 1e-5) {
      return String(bestP);
    }
  }
  return _formatMinUnitPortion(a * pq, minUnit);
}

function _trimDecimal(v, maxDp) {
  var n = parseFloat(v);
  if (isNaN(n)) return '0';
  if (Math.abs(n - Math.round(n)) < 1e-8) return String(Math.round(n));
  var s = n.toFixed(maxDp);
  return s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

/** 弹窗/列表展示用包装用量（如 50g/3000g → 0.0167袋，不显示一长串小数） */
function _formatPackAmountDisplay(n) {
  if (isNaN(n) || n <= 0) return '0';
  var v = parseFloat(n);
  if (v >= 100) return _trimDecimal(v, 1);
  if (v >= 10) return _trimDecimal(v, 2);
  if (v >= 1) return _trimDecimal(v, 3);
  for (var den = 1; den <= 10000; den++) {
    var num = Math.round(v * den);
    if (num > 0 && Math.abs(num / den - v) < 1e-8) {
      var maxDp = den <= 60 ? 4 : 6;
      return _trimDecimal(num / den, maxDp);
    }
  }
  return _trimDecimal(v, 4);
}

/** 接口保存用包装用量（精度略高，便于反推 g/个） */
function _formatPackAmount(n) {
  if (isNaN(n) || n <= 0) return '0';
  var v = parseFloat(n);
  if (Math.abs(v - Math.round(v)) < 1e-8) return String(Math.round(v));
  return _trimDecimal(v, 8);
}

/** 最小单位用量 → 包装单位用量（尽量可逆，如 50g/3000g → 1/60） */
function _minUnitToPackAmount(portion, packQty) {
  var p = parseFloat(portion) || 0;
  var pq = parseFloat(packQty) || 0;
  if (p <= 0 || pq <= 0) return '0';
  if (Math.abs(p - Math.round(p)) < 1e-6 && pq > 0 && pq === Math.floor(pq)) {
    var pi = Math.round(p);
    var pqi = Math.round(pq);
    var g = _gcd(pi, pqi);
    return _formatPackAmount((pi / g) / (pqi / g));
  }
  return _formatPackAmount(p / pq);
}

/** 弹窗最小单位用量 → 接口要求的商品默认规格（如 10ml → 0.02瓶） */
function _convertMinUnitToPack(portion, minUnit, ctx, goods) {
  var g = _getGoodsEntity(goods);
  var packUnit = (ctx && ctx.packUnit) || g.gbDgGoodsStandardname || '';
  var packQty = ctx ? ctx.packQtyInMin : _packQtyInMinUnit(g, minUnit);
  var p = parseFloat(portion) || 0;
  if (!packUnit) {
    return { amount: String(portion), standardName: minUnit || '' };
  }
  if (minUnit === packUnit) {
    return { amount: _formatPackAmount(p), standardName: packUnit };
  }
  if (packQty > 0) {
    return {
      amount: _minUnitToPackAmount(p, packQty),
      standardName: packUnit,
    };
  }
  return { amount: String(portion), standardName: packUnit };
}

/**
 * 保存为采购单位分数用量时，反推 1包装=几个最小单位 及每份最小单位用量
 * 如 0.003333大框/份、2个/份 → packQty=600；无展示用量时尝试整数匹配
 */
function _inferPackQtyFromSavedPackAmount(amountPack, minUnit, portionHint) {
  var a = parseFloat(amountPack) || 0;
  if (a <= 0) return { portion: '', packQtyInMin: '' };
  var pHint = portionHint != null && String(portionHint).trim() !== ''
    ? (parseFloat(portionHint) || 0)
    : 0;
  if (pHint > 0) {
    return {
      portion: String(pHint),
      packQtyInMin: String(parseFloat((pHint / a).toFixed(4))),
    };
  }
  for (var p = 1; p <= 500; p++) {
    var pq = p / a;
    if (pq >= 1 && pq <= 200000 && Math.abs(pq - Math.round(pq)) < 0.005) {
      return { portion: String(p), packQtyInMin: String(Math.round(pq)) };
    }
  }
  var pq0 = Math.max(1, Math.round(1 / a));
  return { portion: '1', packQtyInMin: String(pq0) };
}

/** 是否已存弹窗录入的每份用量（gbDfgPortionAmount / Unit / PackQtyInMin） */
function _hasPersistedPortion(raw) {
  if (!raw) return false;
  var u = (raw.gbDfgPortionUnit || '').trim();
  var a = parseFloat(raw.gbDfgPortionAmount);
  return !!u && !isNaN(a) && a > 0;
}

function _displayFromPersistedPortion(raw) {
  var u = (raw.gbDfgPortionUnit || '').trim();
  var a = parseFloat(raw.gbDfgPortionAmount) || 0;
  var pq = parseFloat(raw.gbDfgPackQtyInMin);
  return {
    portion: _formatMinUnitPortion(a, u),
    minUnit: u,
    packQtyInMin: !isNaN(pq) && pq > 0 ? String(pq) : '',
  };
}

/** 保存时写入后端的每份用量展示字段 */
function _buildPortionPersistPayload(portionMin, minUnit, ctx) {
  var p = parseFloat(portionMin) || 0;
  var mu = (minUnit || '').trim();
  var packUnit = (ctx && ctx.packUnit) || '';
  var pq = ctx ? (parseFloat(ctx.packQtyInMin) || 0) : 0;
  var payload = {
    gbDfgPortionAmount: _formatMinUnitPortion(p, mu),
    gbDfgPortionUnit: mu,
    gbDfgPackQtyInMin: '',
  };
  if (mu && packUnit && mu !== packUnit && pq > 0) {
    payload.gbDfgPackQtyInMin = pq === Math.floor(pq)
      ? String(Math.round(pq))
      : _trimDecimal(pq, 4);
  }
  return payload;
}

/** 接口存的默认规格用量 → 弹窗展示用最小单位（如 0.125斤 → 1个，换算 8个/斤） */
function _convertPackToMinUnitForDisplay(amount, savedUnit, goods, rawLine) {
  if (rawLine && _hasPersistedPortion(rawLine)) {
    return _displayFromPersistedPortion(rawLine);
  }
  var g = _getGoodsEntity(goods);
  var packUnit = g.gbDgGoodsStandardname || '';
  var rawAmt = _rawPackSpecAmount(g);
  var a = parseFloat(amount) || 0;
  var saved = (savedUnit || '').trim();
  var displayHint = rawLine && rawLine._displayAmount ? rawLine._displayAmount : null;
  var displayUnitHint = rawLine && rawLine._displayUnit ? rawLine._displayUnit : '';

  if (saved && saved !== packUnit && MIN_UNIT_OPTIONS.indexOf(saved) >= 0) {
    var pqSaved = _packQtyInMinUnit(g, saved);
    return {
      portion: String(amount),
      minUnit: saved,
      packQtyInMin: pqSaved > 0 ? String(pqSaved) : '',
    };
  }
  // 已按采购单位保存（如 1盒/份），列表直接展示，勿用规格重量当换算系数
  if (packUnit && saved === packUnit) {
    return {
      portion: String(amount),
      minUnit: packUnit,
      packQtyInMin: '',
    };
  }
  if (packUnit && a > 0) {
    var minU = _suggestMinUnit(packUnit, rawAmt, g);
    if (displayUnitHint && MIN_UNIT_OPTIONS.indexOf(displayUnitHint) >= 0) {
      minU = displayUnitHint;
    }
    var pq = _packQtyInMinUnit(g, minU);
    if (pq > 0) {
      var portion = _restoreMinPortionFromPackAmount(a, pq, minU);
      return { portion: portion, minUnit: minU, packQtyInMin: String(pq) };
    }
    if (saved === packUnit && minU !== packUnit) {
      var inferred = _inferPackQtyFromSavedPackAmount(a, minU, displayHint);
      if (inferred.packQtyInMin) {
        return {
          portion: inferred.portion,
          minUnit: minU,
          packQtyInMin: inferred.packQtyInMin,
        };
      }
    }
    if (_isCountMinUnit(minU)) {
      var inferredCount = _inferPackQtyFromSavedPackAmount(a, minU, displayHint);
      return {
        portion: inferredCount.portion || '1',
        minUnit: minU,
        packQtyInMin: inferredCount.packQtyInMin || '',
      };
    }
  }
  var fallbackMin = saved || _suggestMinUnit(packUnit, rawAmt, g);
  var fallbackPq = _packQtyInMinUnit(g, fallbackMin);
  return {
    portion: String(amount),
    minUnit: fallbackMin,
    packQtyInMin: fallbackPq > 0 ? String(fallbackPq) : '',
  };
}

function _getRawLinePrice(raw, entity) {
  var r = raw || {};
  var g = entity || _getGoodsEntity(r);
  return parseFloat(r.gbDfgGoodsAveragePrice)
    || parseFloat(g.gbDgGoodsAveragePrice)
    || 0;
}

/**
 * 配料列表行成本（接口不返 _cost，由前端根据保存用量与均价计算）
 */
function _calcRawLineCost(raw) {
  var entity = _getGoodsEntity(raw);
  var packUnit = (entity.gbDgGoodsStandardname || '').trim();
  var savedUnit = (raw.gbDfgGoodsStandardname || '').trim();
  var amount = parseFloat(raw.gbDfgGoodsAmount) || 0;
  var price = _getRawLinePrice(raw, entity);
  if (amount <= 0 || price <= 0) return 0;

  if (_hasPersistedPortion(raw)) {
    var pUnit = (raw.gbDfgPortionUnit || '').trim();
    var pAmt = parseFloat(raw.gbDfgPortionAmount) || 0;
    var pqSaved = parseFloat(raw.gbDfgPackQtyInMin) || 0;
    if (packUnit && savedUnit === packUnit && pUnit === packUnit) {
      return amount * price;
    }
    if (pAmt > 0 && pqSaved > 0 && pUnit && packUnit && pUnit !== packUnit) {
      var ctxSaved = _buildUnitContext(entity, {
        minUnit: pUnit,
        packQtyInMin: String(pqSaved),
      });
      ctxSaved.packPrice = price;
      return _calcPortionCost(pAmt, pUnit, ctxSaved, entity);
    }
    if (packUnit && savedUnit === packUnit) {
      return amount * price;
    }
  }

  // 保存单位 = 商品默认采购单位（如 0.003333大框 × 145元/大框）
  if (packUnit && savedUnit === packUnit) {
    return amount * price;
  }

  var display = _convertPackToMinUnitForDisplay(
    raw.gbDfgGoodsAmount,
    raw.gbDfgGoodsStandardname,
    entity,
    raw
  );
  var portion = parseFloat(display.portion) || 0;
  if (portion <= 0) return 0;

  var packQtyStr = display.packQtyInMin;
  if (!packQtyStr || parseFloat(packQtyStr) <= 0) {
    var inferred = _effectivePackQtyInMin(entity, display.minUnit, '');
    if (inferred > 0) {
      packQtyStr = String(inferred);
    } else if (amount > 0 && packUnit && savedUnit === packUnit) {
      return amount * price;
    } else if (amount > 0 && packUnit && display.minUnit !== packUnit) {
      // 如 0.003333大框/份 展示为 1个/份 → 1大框 ≈ portion/amount 个
      packQtyStr = String(parseFloat((portion / amount).toFixed(4)));
    }
  }

  var ctx = _buildUnitContext(entity, {
    minUnit: display.minUnit,
    packQtyInMin: packQtyStr,
  });
  ctx.packPrice = price;
  return _calcPortionCost(portion, display.minUnit, ctx, entity);
}

function _calcPortionCost(amount, useUnit, ctx, entity) {
  var portion = parseFloat(amount) || 0;
  if (portion <= 0) return 0;
  var packUnit = (entity && entity.gbDgGoodsStandardname) || '';
  var price = ctx && ctx.packPrice > 0
    ? ctx.packPrice
    : (parseFloat(entity.gbDgGoodsAveragePrice) || 0);
  // 历史数据：用量单位与采购包装单位相同，按「用量 × 采购单价」
  if (useUnit && packUnit && useUnit === packUnit) {
    return portion * price;
  }
  var packQty = ctx ? ctx.packQtyInMin : _packQtyInMinUnit(entity, useUnit);
  if (useUnit && packUnit && useUnit !== packUnit) {
    if (packQty <= 0) return 0;
    if (price > 0) return (price / packQty) * portion;
    return 0;
  }
  if (price > 0 && packQty > 0) {
    return (price / packQty) * portion;
  }
  if (price > 0) return portion * price;
  return 0;
}

function _versionUnitText(value) {
  var labels = { G: 'g', KG: 'kg', JIN: '斤', ML: 'ml', L: 'L', EA: '个' };
  var key = String(value || '').toUpperCase();
  return labels[key] || value || '';
}

function _versionQuantityText(value) {
  var n = Number(value);
  return isNaN(n) ? String(value || '') : _trimDecimal(n, 4);
}

function _normalizeRecipeVersion(row, effectiveVersionId) {
  var version = Object.assign({}, row || {});
  var status = String(version.status || '').toUpperCase();
  var isCurrent = !!effectiveVersionId && Number(version.id) === Number(effectiveVersionId);
  var statusText = '历史版本';
  var statusClass = 'history';
  if (isCurrent) {
    statusText = '使用中';
    statusClass = 'current';
  } else if (status === 'DRAFT') {
    statusText = '草稿';
    statusClass = 'draft';
  } else if (status === 'RETIRED') {
    statusText = '已结束';
    statusClass = 'retired';
  } else if (status === 'PUBLISHED') {
    statusText = '已发布';
    statusClass = 'published';
  }

  var periodText = '';
  if (status === 'DRAFT') {
    periodText = '尚未发布，不参与营业成本核算';
  } else if (isCurrent) {
    periodText = '当前门店今天使用';
  } else {
    periodText = '具体使用日期请在版本管理中查看';
  }

  var componentRows = Array.isArray(version.componentSummary) ? version.componentSummary : [];
  version._isCurrent = isCurrent;
  version._statusText = statusText;
  version._statusClass = statusClass;
  version._periodText = periodText;
  version._componentText = componentRows.map(function (component) {
    return (component.name || '未命名配料') + ' '
      + _versionQuantityText(component.quantityPerPortion)
      + _versionUnitText(component.unitCode);
  }).join(' · ') || '该版本暂无配料内容';
  return version;
}

function createRecipePage(pageMode) {
  return {
  /**
   * 页面的初始数据
   */
  data: {
    modalType: "add",
    versionEditorMode: pageMode === 'editor',
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
    modalPackPriceLabel: '',
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
    recipeTimeline: [],
    baseVersionId: null,
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
      returnToManage: String(options && options.returnToManage || '') === '1',
      versionedMode: foodItem.gbDfRecipeModel === 'VERSIONED',
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
          selectedVersionId = draft ? Number(draft.id)
            : (Number(that.data.baseVersionId) || effectiveVersionId
              || Number(((versions || []).find(function (row) {
                return String(row.status || '').toUpperCase() === 'PUBLISHED';
              }) || {}).id));
        } else {
          selectedVersionId = effectiveVersionId;
        }
        var withContext = function (selectedDetail) {
          return Object.assign({}, selectedDetail, {
            versionHistory: versions,
            recipeTimeline: timeline,
            effectiveVersionId: effectiveVersionId,
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
      var primaryVersion = currentVersion || versionHistory[0] || null;
      var cached = wx.getStorageSync(PREPARATION_MIGRATION_CACHE_PREFIX + that.data.foodId);
      if (!components.length && cached && Array.isArray(cached.components)) {
        components = cached.components;
      }
      return that._decorateVersionedComponents(components).then(function (displayRows) {
        if (opts.showLoading) load.hideLoading();
        that.setData({
          versionedMode: true,
          versionedDetail: detail,
          versionedComponents: components,
          recipeVersionHistory: versionHistory,
          recipeVersionPrimary: primaryVersion,
          currentRecipeVersionView: currentVersion,
          recipeTimeline: detail.recipeTimeline || [],
        });
        that._processRawArr(displayRows);
      });
    }).catch(function (error) {
      if (opts.showLoading) load.hideLoading();
      preparationUtil.showError(error);
    });
  },

  _decorateVersionedComponents(components) {
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
      var rawGoodsIds = [];
      var seenIds = {};
      var addRawGoodsId = function (value) {
        var id = Number(value);
        if (!(id > 0) || seenIds[String(id)]) return;
        seenIds[String(id)] = true;
        rawGoodsIds.push(id);
      };
      resolvedComponents.forEach(function (component) {
        if (component.itemKind === 'RAW_GOODS') {
          addRawGoodsId(component.rawGoodsId);
          return;
        }
        var recipe = component.intermediateRecipe || {};
        (recipe.components || []).forEach(function (rawComponent) {
          addRawGoodsId(rawComponent.rawGoodsId);
        });
      });
      return preparationApi.listStoreRawGoodsSummaries(rawGoodsIds, that.data.costDays)
        .catch(function () { return []; })
        .then(function (summaries) {
          var goodsById = {};
          (summaries || []).forEach(function (goods) {
            if (goods && Number(goods.gbDistributerGoodsId) > 0) {
              goodsById[String(goods.gbDistributerGoodsId)] = goods;
            }
          });
          return Promise.all(resolvedComponents.map(function (component, index) {
            if (component.itemKind === 'INTERMEDIATE_PRODUCT') {
              var recipe = component.intermediateRecipe || {};
              var enrichedRecipe = Object.assign({}, recipe, {
                components: (recipe.components || []).map(function (rawComponent) {
                  return Object.assign({}, rawComponent, {
                    rawGoods: Object.assign({}, rawComponent.rawGoods || {},
                      goodsById[String(rawComponent.rawGoodsId)] || {}),
                  });
                }),
              });
              return that._decoratePreparationComponent(Object.assign({}, component, {
                intermediateRecipe: enrichedRecipe,
              }), index);
            }
            var goods = Object.assign({}, component.rawGoods || {},
              goodsById[String(component.rawGoodsId)] || {});
            return that._decorateRawComponent(component, index, goods);
          }));
        });
    });
  },

  _decorateRawComponent(component, index, embeddedGoods) {
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
      var price = _getRawLinePrice(row, goods);
      var cost = _calcRawLineCost(row);
      row._cost = cost.toFixed(2);
      row._costAvailable = cost > 0;
      row._packPriceLabel = price > 0 && goods.gbDgGoodsStandardname
        ? (price.toFixed(2) + '/' + goods.gbDgGoodsStandardname)
        : '成本待计算';
      return row;
    };

    return Promise.resolve(buildRow(embeddedGoods || {}));
  },

  _decoratePreparationComponent(component, index) {
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
        }, rawIndex, rawComponent.rawGoods);
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
    for (var i = 0; i < list.length; i++) {
      var raw = list[i];
      if (raw._isVersioned) {
        var versionedAvailable = raw._costAvailable !== false && raw._cost !== ''
          && raw._cost !== null && typeof raw._cost !== 'undefined';
        var versionedCost = versionedAvailable ? (parseFloat(raw._cost) || 0) : 0;
        raw._cost = versionedAvailable ? versionedCost.toFixed(2) : '';
        raw._packPriceLabel = raw._packPriceLabel || '成本待计算';
        raw._ratio = versionedAvailable && salePrice > 0
          ? (versionedCost / salePrice * 100).toFixed(1)
          : (versionedAvailable ? '0.0' : '—');
        if (!versionedAvailable) totalCostComplete = false;
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
      profitHint = '部分配料缺少成本依据，暂不计算完整毛利';
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

  replaceGoods(e) {
    var item = e.currentTarget.dataset.item;
    if (!item || item._isPreparation || !item._isVersioned) return;
    this._resetModalForm();
    this.setData({
      modalType: 'replace',
      editGoods: item,
      showFood: true,
      isSearching: false,
      strArr: [],
      searchKeyword: '',
      goodsName: '',
    });
    this._syncFoodSearchModalLayout();
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
        return {
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
    // 一次显式“更换”代表包装升级候选；后续只改用量时不能把这条业务意图冲掉。
    if (existingContext && existingContext.changeType === 'REPLACE'
      && (!changeContext || changeContext.changeType !== 'REPLACE')) {
      nextContext = existingContext;
    }
    this.setData({
      versionedComponents: components,
      versionDraftDirty: true,
      versionDraftChangeContext: nextContext,
    });
    this.cancelPreparation();
    this._closeRawModal();
    this._decorateVersionedComponents(components).then(function (displayRows) {
      that._processRawArr(displayRows);
    }).catch(function (error) {
      preparationUtil.showError(error);
    });
  },

  saveNewRecipeVersion() {
    if (!this.data.versionEditorMode || this.data.recipeSaving) return;
    if (!this.data.versionDraftDirty) {
      wx.showToast({ title: '请先调整配方内容', icon: 'none' });
      return;
    }
    this._saveAndPublishComponents(
      this._currentP1Components(),
      '保存新版本',
      this.data.versionDraftChangeContext || { changeType: 'QUANTITY' }
    );
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

  _saveAndPublishComponents(components, loadingText, changeContext) {
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
      return preparationApi.foodVersionAction(
        detail.recipe.id,
        detail.version.id,
        'copy',
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
      wx.showToast({
        title: that.data.versionEditorMode ? '版本已发布，请设置使用时间' : '保存成功',
        icon: 'success',
      });
      if (that.data.versionEditorMode) {
        setTimeout(function () {
          if (that.data.returnToManage) {
            wx.navigateBack({ delta: 1 });
          } else {
            wx.redirectTo({
              url: '../recipeVersionManage/recipeVersionManage?foodId='
                + encodeURIComponent(String(that.data.foodId)),
            });
          }
        }, 450);
        return null;
      }
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
      modalPackPriceLabel: '',
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
      modalPackPriceLabel: ctx.packPriceLabel,
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
            strArr: rows || [],
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
            strArr: res.result.data && res.result.data.length > 0 ? res.result.data : [],
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

  toBack() {
    if (this.data.versionEditorMode && this.data.versionDraftDirty) {
      wx.showModal({
        title: '放弃新版本？',
        content: '当前调整尚未保存为新版本，返回后本次修改不会保留。',
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

module.exports = createRecipePage;
