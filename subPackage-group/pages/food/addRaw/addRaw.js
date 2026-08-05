const app = getApp()
const globalData = app.globalData;
var load = require('../../../../lib/load.js');


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

Page({
  /**
   * 页面的初始数据
   */
  data: {
    modalType: "add",
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
    modalBulkWeightPack: false,
    modalCanCalcCost: false,
    modalQuickTags: [],
    costDays: 30,
    costDaysLabel: '近30天',
    versionedMode: false,
  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
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
    var foodId = foodItem.foodId || '';
    this.setData({
      foodItem: foodItem,
      foodId: foodId,
      versionedMode: foodItem.gbDfRecipeModel === 'VERSIONED',
    })

    // 通过接口获取菜品已有的配料列表
    if (foodId && foodItem.gbDfRecipeModel !== 'VERSIONED') {
      this._fetchFoodGoods(foodId);
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
    var foodId = this.data.foodId;
    if (foodId && this.data._hasLoaded) {
      // 从编辑页返回时刷新菜品数据
      this._refreshFoodItem(foodId);
    }
  },

  onReady() {
    this._tryDrawDonut();
  },

  _refreshFoodItem(foodId) {
    var that = this;
    getFoodByFoodId(foodId).then(function (res) {
      if (res.result.code == 0) {
        var foodItem = res.result.data;
        // 字段映射：后端返回 gbDfFoodPrice，页面使用 salePrice
        if (foodItem && typeof foodItem.gbDfFoodPrice !== 'undefined') {
          foodItem.salePrice = foodItem.gbDfFoodPrice;
        }
        that.setData({
          foodItem: foodItem,
          versionedMode: foodItem && foodItem.gbDfRecipeModel === 'VERSIONED',
          rawArr: foodItem && foodItem.gbDfRecipeModel === 'VERSIONED'
            ? []
            : that.data.rawArr,
        }, function () {
          // 售价变动后重新计算毛利
          if (!that.data.versionedMode) {
            that._processRawArr(that.data.rawArr || []);
          } else if (!that._versionedRedirecting) {
            that._versionedRedirecting = true;
            wx.redirectTo({
              url: '/subPackage-preparation/pages/foodRecipe/foodRecipe?foodId=' +
                encodeURIComponent(String(foodId)),
            });
          }
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
    for (var i = 0; i < list.length; i++) {
      var raw = list[i];
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
      raw._packPriceLabel = linePrice > 0 && ctx.packUnit
        ? (linePrice.toFixed(2) + '/' + ctx.packUnit)
        : '—';
      raw._ratio = salePrice > 0 ? (cost / salePrice * 100).toFixed(1) : '0.0';
      totalCost += cost;
    }
    var costRate = salePrice > 0 ? (totalCost / salePrice * 100).toFixed(1) : '0.0';
    var profit = (salePrice - totalCost).toFixed(2);
    var grossMarginRate = salePrice > 0 ? ((salePrice - totalCost) / salePrice * 100).toFixed(1) : '0.0';

    // 利润评价
    var profitLevelClass = 'profit-tag--good';
    var profitHint = '做得好！毛利表现优秀';
    var gm = parseFloat(grossMarginRate);
    if (gm < 30) {
      profitLevelClass = 'profit-tag--bad';
      profitHint = '毛利率偏低，建议优化';
    } else if (gm < 50) {
      profitLevelClass = 'profit-tag--normal';
      profitHint = '毛利率一般，还有提升空间';
    }

    this.setData({
      rawArr: list,
      totalCost: totalCost.toFixed(2),
      costTotal: totalCost.toFixed(2),
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
      title: '删除配料',
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
    if (this.data.versionedMode) {
      this._toVersionedRecipe('raw');
      return;
    }
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
    this._toVersionedRecipe('preparation');
  },

  toManageVersionedRecipe() {
    this._toVersionedRecipe('');
  },

  _toVersionedRecipe(picker) {
    var foodId = this.data.foodId;
    if (!foodId) {
      wx.showToast({ title: '缺少菜品信息', icon: 'none' });
      return;
    }
    var query = 'foodId=' + encodeURIComponent(String(foodId));
    if (picker) query += '&openPicker=' + encodeURIComponent(picker);
    wx.navigateTo({
      url: '/subPackage-preparation/pages/foodRecipe/foodRecipe?' + query,
    });
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
    var cur = parseFloat(this.data.modalPortionAmount) || 0;
    var v = String(cur + 1);
    this.setData({ modalPortionAmount: v, amount: v }, () => this._recalcModalSummary());
  },

  onMinUnitChange(e) {
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

  refreshData() {
    var foodId = this.data.foodId;
    if (foodId) {
      this._fetchFoodGoods(foodId);
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
      this._fetchFoodGoods(foodId, { loadingText: '刷新成本' });
    }
  },

  onMinusAmount(e) {
    var idx = e.currentTarget.dataset.index;
    var raw = this.data.rawArr[idx];
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
    // 打开编辑弹窗进行调整
    this.editGoods({ currentTarget: { dataset: { item: raw } } });
  },

  cancle() {
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
    wx.navigateBack({
      delta: 1,
    })
  }
})
