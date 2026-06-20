/**
 * 库存批次弹窗：采购单位 ↔ 最小单位（g/ml/个）换算
 * 与 addRaw 原料弹窗规则保持一致
 */
var MIN_UNIT_OPTIONS = ['ml', 'g', '个', '张', '只', '斤'];
var COUNT_MIN_UNITS = ['个', '只', '张', '枚', '条', '根', '颗'];

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

function _isVolumePurchaseUnit(packUnit) {
  var u = (packUnit || '').trim();
  return /瓶|罐|桶/.test(u) || u === '升' || u === 'L' || u === 'l';
}

function _isWeightUnit(unit) {
  var u = (unit || '').trim();
  return u === '斤' || u === 'g' || u === '公斤' || u === 'kg' || u === 'KG' || u === '克' || u === 'mg' || u === '毫克';
}

function _isVolumeUnit(unit) {
  var u = (unit || '').trim();
  return u === 'ml' || u === '毫升';
}

function detectUnitFamily(packUnit, goods) {
  var u = (packUnit || '').trim();
  var g = goods || {};
  var wStr = String(g.gbDgGoodsStandardWeight || '');
  var lower = wStr.toLowerCase();
  var rawAmt = rawPackSpecAmount(g);

  if (_isDozenPackUnit(u)) return 'count';
  if (/^个|只|张|枚|条|根|颗$/.test(u)) return 'count';
  if (_isCountPerPackGoods(g, u, rawAmt)) return 'count';

  if (_isVolumePurchaseUnit(u)) {
    if (/kg|公斤|千克|斤|克|\d\s*g\b|\d+g\b|g\//.test(lower)) return 'weight';
    return 'volume';
  }
  if (/ml|毫升/.test(lower) && !/kg|公斤|千克|斤|克/.test(lower)) return 'volume';
  if (/升|(^|\d)\s*l$/.test(lower) && !/ml/.test(lower)) return 'volume';

  if (u === '斤' || u === '公斤' || u === 'kg' || u === 'KG') return 'weight';
  if (/斤/.test(wStr) && !/ml|毫升/.test(lower)) return 'weight';
  if (/kg|公斤|千克|克|\d\s*g\b|\d+g\b|g\//.test(lower)) return 'weight';

  if (/盒|包|袋|箱/.test(u)) {
    var fromW = _minUnitFromWeightStr(wStr, u);
    if (fromW === 'ml') return 'volume';
    if (fromW === 'g' || fromW === '斤') return 'weight';
    if (fromW && COUNT_MIN_UNITS.indexOf(fromW) >= 0) return 'count';
    return 'weight';
  }

  return 'weight';
}

function isUnitCompatibleWithFamily(unit, family) {
  var u = (unit || '').trim();
  if (!u) return false;
  if (family === 'weight') return _isWeightUnit(u);
  if (family === 'volume') return _isVolumeUnit(u);
  if (family === 'count') return COUNT_MIN_UNITS.indexOf(u) >= 0;
  return true;
}

function getMinUnitsForFamily(family) {
  if (family === 'volume') return ['ml'];
  if (family === 'count') return ['个', '只', '张'];
  if (family === 'weight') return ['斤', 'g'];
  return ['g'];
}

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
    if (u === 'ml') return n * 1000;
    return 0;
  }
  if (parsed.unit === 'ml') {
    if (u === 'ml') return n;
    return 0;
  }
  if (parsed.unit === 'g') {
    if (u === 'g') return n;
    return 0;
  }
  return n;
}

function _minUnitFromWeightStr(weightStr, packUnit) {
  var s = String(weightStr || '');
  var lower = s.toLowerCase();
  if (/ml|毫升/.test(lower) && !/kg|公斤|千克|斤|克|\d\s*g|\dg/.test(lower)) return 'ml';
  if (/升|(^|\d)\s*l$/.test(lower) && !/ml/.test(lower)) return 'ml';
  // 50斤/袋 等：规格本身是「斤」，默认用斤录入，避免 50×500 被当成 25000 斤
  if (/斤/.test(s) && !/kg|公斤|千克|克|\d\s*g\b|\d+g\b|g\//.test(lower)) return '斤';
  if (/kg|公斤|千克|斤|克|\d\s*g\b|\d+g\b|g\//.test(lower)) return 'g';
  if (/瓶|罐|桶|升/.test(packUnit || '')) {
    if (/kg|公斤|千克|斤|克|\d\s*g\b|\d+g\b|g\//.test(lower)) return 'g';
    return 'ml';
  }
  return '';
}

function _isDozenPackUnit(packUnit) {
  var u = (packUnit || '').trim();
  return u === '一打' || u === '打';
}

function _isCountPerPackGoods(goods, packUnit, parsedQty) {
  var name = (goods && goods.gbDgGoodsName) || '';
  if (/鸡蛋|鸭蛋|咸蛋|皮蛋|禽蛋/.test(name)) return true;
  var u = (packUnit || '').trim();
  return (u === '斤' || u === '公斤' || u === 'kg' || u === 'KG')
    && parsedQty > 0 && parsedQty <= 200 && Math.floor(parsedQty) === parsedQty;
}

function _conventionalPackRatio(packUnit, minUnit, parsedQty) {
  var mu = (minUnit || '').trim();
  var u = (packUnit || '').trim();
  var pq = parseFloat(parsedQty) || 0;
  if (mu === 'g') {
    if (u === '斤') return 500;
    if (u === '公斤' || u === 'kg' || u === 'KG') return 1000;
  }
  if (mu === 'ml') {
    if (u === '升' || u === 'L' || u === 'l') return 1000;
    if (/瓶|罐|桶/.test(u) && pq >= 50) return pq;
  }
  if (COUNT_MIN_UNITS.indexOf(mu) >= 0 && _isDozenPackUnit(u)) return 12;
  return 0;
}

function rawPackSpecAmount(goods) {
  if (!goods) return 0;
  var w = goods.gbDgGoodsStandardWeight;
  if (!w || w === 'null' || !String(w).trim()) return 0;
  var parsed = _parseWeightUnit(w);
  return parsed ? parsed.amount : 0;
}

function resolvePackQtyInMin(packUnit, minUnit, goods) {
  var mu = (minUnit || '').trim();
  var family = detectUnitFamily(packUnit, goods);
  if (!isUnitCompatibleWithFamily(mu, family)) return 0;
  if (COUNT_MIN_UNITS.indexOf(mu) >= 0) {
    var raw = rawPackSpecAmount(goods);
    if (raw > 0 && raw <= 500) return raw;
    return 0;
  }
  var w = goods && goods.gbDgGoodsStandardWeight;
  var parsed = _parseWeightUnit(w);
  if (parsed) {
    var fromWeight = _weightToMinUnitQty(parsed, mu);
    if (fromWeight > 0) return fromWeight;
  }
  var rawAmt = parsed ? parsed.amount : 0;
  var conventional = _conventionalPackRatio(packUnit, mu, rawAmt);
  if (conventional > 0) return conventional;
  if (rawAmt > 0) return rawAmt;
  var u = (packUnit || '').trim();
  if (u === '斤') return mu === '斤' ? 1 : (mu === 'g' ? 500 : 0);
  if (u === '公斤' || u === 'kg' || u === 'KG') {
    return mu === '斤' ? 2 : (mu === 'g' ? 1000 : 0);
  }
  return 1;
}

function parsePackQty(goods) {
  if (!goods) return 0;
  var packUnit = (goods.gbDgGoodsStandardname || '').trim();
  var raw = rawPackSpecAmount(goods);
  var minUnit = suggestMinUnit(packUnit, raw, goods);
  return resolvePackQtyInMin(packUnit, minUnit, goods);
}

function suggestMinUnit(packUnit, parsedQty, goods) {
  var u = (packUnit || '').trim();
  var wStr = (goods && goods.gbDgGoodsStandardWeight) || '';
  var w = String(wStr).trim().toLowerCase();
  if (/瓶|罐|桶|升/i.test(u)) {
    var fromW = _minUnitFromWeightStr(wStr, u);
    if (fromW) return fromW;
    if (parsedQty > 1) return 'g';
    return 'ml';
  }
  if (_isDozenPackUnit(u)) return '个';
  if (_isCountPerPackGoods(goods, u, parsedQty)) return '个';
  if (u === '斤' || u === '公斤' || u === 'kg' || u === 'KG') return 'g';
  if (/个|只|张|枚/.test(u) && (!parsedQty || parsedQty <= 1)) return '个';
  if (/盒|包|袋|箱/.test(u) && parsedQty > 1) {
    return _minUnitFromWeightStr(wStr, u) || 'g';
  }
  if (/盒|包|袋|箱/.test(u) && (!parsedQty || parsedQty <= 1)) return '个';
  if (u === '袋' || u === '箱') return parsedQty > 0 ? (_minUnitFromWeightStr(wStr, u) || 'g') : u;
  if (parsedQty > 1) {
    return _minUnitFromWeightStr(wStr, u) || 'g';
  }
  return u || 'g';
}

function defaultPackQtyInMinUnit(packUnit, parsedQty, minUnit, goods) {
  if (COUNT_MIN_UNITS.indexOf((minUnit || '').trim()) >= 0) {
    if (parsedQty > 0 && parsedQty <= 500) return parsedQty;
    return 0;
  }
  var conventional = _conventionalPackRatio(packUnit, minUnit, parsedQty);
  if (conventional > 0) return conventional;
  if (parsedQty > 0) return parsedQty;
  var u = (packUnit || '').trim();
  if (u === '斤') return 500;
  if (u === '公斤' || u === 'kg' || u === 'KG') return 1000;
  return 1;
}

function trimAmount(v, maxDp) {
  var n = parseFloat(v);
  if (isNaN(n)) return '0';
  var dp = maxDp != null ? maxDp : 4;
  if (dp === 0 || Math.abs(n - Math.round(n)) < 1e-8) {
    return String(Math.round(n));
  }
  var s = n.toFixed(dp);
  return s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') || '0';
}

function formatDisplayAmount(n, unit) {
  var u = (unit || '').trim();
  if (u === 'g' || u === 'ml') return trimAmount(n, 0);
  return trimAmount(n, 4);
}

function minToPack(minVal, packQtyInMin) {
  var m = parseFloat(minVal) || 0;
  var pq = parseFloat(packQtyInMin) || 0;
  if (m <= 0) return 0;
  if (pq <= 0) return m;
  return parseFloat((m / pq).toFixed(8));
}

function packToMin(packVal, packQtyInMin) {
  var p = parseFloat(packVal) || 0;
  var pq = parseFloat(packQtyInMin) || 0;
  if (p <= 0) return 0;
  if (pq <= 0) return p;
  return p * pq;
}

function buildStockUnitContext(depGoods, stockItem) {
  var depEntity = (depGoods && depGoods.gbDistributerGoodsEntity) || {};
  var stockEntity = (stockItem && stockItem.gbDistributerGoodsEntity) || {};
  var entity = Object.assign({}, depEntity, stockEntity);
  if (!entity.gbDgGoodsStandardWeight && depEntity.gbDgGoodsStandardWeight) {
    entity.gbDgGoodsStandardWeight = depEntity.gbDgGoodsStandardWeight;
  }
  if (!entity.gbDgGoodsStandardname && depEntity.gbDgGoodsStandardname) {
    entity.gbDgGoodsStandardname = depEntity.gbDgGoodsStandardname;
  }
  var packUnit = (depGoods && depGoods.gbDdgShowStandardName)
    || entity.gbDgGoodsStandardname
    || '';
  var rawAmount = rawPackSpecAmount(entity);
  var minUnit = suggestMinUnit(packUnit, rawAmount, entity);
  var packQtyInMin = resolvePackQtyInMin(packUnit, minUnit, entity);
  var canPickUnit = packQtyInMin > 0 && minUnit !== packUnit;
  // 默认按采购单位（袋/桶/瓶）录入，可切换到 g/ml/斤 等小单位
  var useMin = false;
  var restPack = parseFloat(stockItem && stockItem.gbDgsRestWeight) || 0;
  var restMin = canPickUnit ? packToMin(restPack, packQtyInMin) : restPack;
  var packLabel = rawAmount > 0 && entity.gbDgGoodsStandardWeight
    ? (entity.gbDgGoodsStandardWeight + '/' + packUnit)
    : packUnit;
  return {
    entity: entity,
    packUnit: packUnit,
    minUnit: minUnit,
    packQtyInMin: packQtyInMin,
    canPickUnit: canPickUnit,
    useMin: useMin,
    restPack: restPack,
    restMin: restMin,
    packLabel: packLabel,
    unitPickerOptions: buildUnitPickerOptions(packUnit, minUnit, canPickUnit, entity),
  };
}

/** 有规格换算时：采购单位 + 同族小单位（重量↔g/斤，体积↔ml，计数↔个/只/张） */
function buildUnitPickerOptions(packUnit, suggestedMin, canPick, goods) {
  if (!canPick) return [(packUnit || '').trim() || 'g'];
  var pack = (packUnit || '').trim();
  var family = detectUnitFamily(packUnit, goods);
  var opts = getMinUnitsForFamily(family).slice();
  if (pack && opts.indexOf(pack) < 0) {
    opts.unshift(pack);
  }
  var sug = (suggestedMin || '').trim();
  if (sug && opts.indexOf(sug) < 0 && isUnitCompatibleWithFamily(sug, family)) {
    opts.splice(pack && pack !== sug ? 1 : 0, 0, sug);
  }
  return opts;
}

module.exports = {
  MIN_UNIT_OPTIONS: MIN_UNIT_OPTIONS,
  parsePackQty: parsePackQty,
  suggestMinUnit: suggestMinUnit,
  defaultPackQtyInMinUnit: defaultPackQtyInMinUnit,
  trimAmount: trimAmount,
  formatDisplayAmount: formatDisplayAmount,
  minToPack: minToPack,
  packToMin: packToMin,
  buildStockUnitContext: buildStockUnitContext,
  buildUnitPickerOptions: buildUnitPickerOptions,
  detectUnitFamily: detectUnitFamily,
  isUnitCompatibleWithFamily: isUnitCompatibleWithFamily,
  rawPackSpecAmount: rawPackSpecAmount,
  resolvePackQtyInMin: resolvePackQtyInMin,
};
