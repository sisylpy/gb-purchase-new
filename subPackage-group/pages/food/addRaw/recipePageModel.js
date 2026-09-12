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

function _offsetDateText(value, days) {
  var parts = String(value || _todayText()).split('-').map(Number);
  var date = new Date(parts[0], parts[1] - 1, parts[2]);
  date.setDate(date.getDate() + Number(days || 0));
  var month = String(date.getMonth() + 1).padStart(2, '0');
  var day = String(date.getDate()).padStart(2, '0');
  return date.getFullYear() + '-' + month + '-' + day;
}

function _recipeMoneyText(value) {
  if (value === null || typeof value === 'undefined' || value === '') return '—';
  var amount = Number(value);
  return isNaN(amount) ? '—' : '¥' + amount.toFixed(2);
}

function _recipeNumberText(value) {
  var amount = Number(value || 0);
  if (isNaN(amount)) return '0';
  return Math.abs(amount - Math.round(amount)) < 0.000001
    ? String(Math.round(amount))
    : amount.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

function _recipeDateText(value) {
  return value ? String(value).slice(0, 10) : '';
}

/*
 * 新成本缺失原因的分组展示。
 * 只按后端返回的原文分组，不解析文字、不推断业务原因、不补金额；
 * 同一原因在多天重复时只展示一条，避免在手机上铺开几十条重复记录。
 */
function _recipeNewMissingReasonGroups(rows) {
  var groups = [];
  (rows || []).forEach(function (row) {
    var reasons = (row.newMissingReasons || []).filter(function (item) {
      return String(item || '').trim();
    });
    if (!reasons.length) reasons = ['未返回具体原因'];
    reasons.forEach(function (item) {
      var text = String(item).trim();
      var group = null;
      for (var i = 0; i < groups.length; i++) {
        if (groups[i].reason === text) { group = groups[i]; break; }
      }
      if (!group) {
        group = { reason: text, dates: [] };
        groups.push(group);
      }
      var date = _recipeDateText(row.businessDate);
      if (date && group.dates.indexOf(date) < 0) group.dates.push(date);
    });
  });
  return groups;
}

function _recipeReasonGroupView(group, dateLimit) {
  var dates = group.dates.slice(0, dateLimit);
  return {
    reason: group.reason,
    _datesText: dates.join('、') + (group.dates.length > dates.length
      ? ' 等 ' + group.dates.length + ' 天' : ''),
  };
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

function _baseUnitCode(unit) {
  var info = _baseUnitInfo(unit);
  if (!info) return '';
  if (info.dimension === 'MASS') return 'G';
  if (info.dimension === 'VOLUME') return 'ML';
  if (info.dimension === 'COUNT') return 'EA';
  return '';
}

function _baseUnitLabel(unit) {
  var labels = { G: '克', ML: '毫升', EA: '个' };
  return labels[String(unit || '').toUpperCase()] || unit || '';
}

function _historicalPriceMissingText(resolution) {
  var row = resolution || {};
  if (row.missingReason) return String(row.missingReason);
  var labels = {
    MISSING_HISTORICAL_PRICE: '配方有效期内没有合格入库价',
    MISSING_UNIT_CONVERSION: '缺少可靠单位换算',
    INCOMPLETE_PRICE_EVIDENCE: '适用期价格证据不完整',
  };
  return labels[String(row.status || '')] || '适用期价格暂时无法解析';
}

function _managedVersionUsageState(detail, selectedVersion) {
  var today = _todayText();
  var selectedId = Number(selectedVersion && selectedVersion.id);
  var timeline = (detail && detail.recipeTimeline) || [];
  var intervals = timeline.filter(function (row) {
    return Number(row.recipeVersionId) === selectedId;
  }).sort(function (left, right) {
    return String(left.effectiveStart).localeCompare(String(right.effectiveStart));
  }).map(function (row) {
    var item = Object.assign({}, row);
    item._periodText = _recipeDateText(item.effectiveStart) + ' 起 · '
      + (item.effectiveEnd ? _recipeDateText(item.effectiveEnd) + ' 起停止' : '持续使用');
    return item;
  });
  var preferredId = Number(detail && detail._preferredIntervalId || 0);
  var preferred = intervals.find(function (row) {
    return row.effectiveStart <= today && (!row.effectiveEnd || today < row.effectiveEnd);
  }) || null;
  // 编辑指定区间时优先回填该区间，避免读到同一业务版本下另一个修订的时间。
  if (preferredId) {
    var explicitInterval = intervals.find(function (row) {
      return Number(row.id) === preferredId;
    });
    if (explicitInterval) preferred = explicitInterval;
  }
  if (!preferred) preferred = intervals[intervals.length - 1] || null;
  var start = preferred && _recipeDateText(preferred.effectiveStart);
  if (!start) {
    var latestBoundary = timeline.filter(function (row) {
      return row.effectiveEnd && row.effectiveEnd <= today;
    }).sort(function (left, right) {
      return String(right.effectiveEnd).localeCompare(String(left.effectiveEnd));
    })[0];
    start = latestBoundary ? _recipeDateText(latestBoundary.effectiveEnd) : today;
  }
  var end = preferred ? _recipeDateText(preferred.effectiveEnd) : '';
  return {
    today: today,
    intervals: intervals,
    preferred: preferred,
    start: start,
    end: end,
  };
}

function _nextRecipeVersionStart(timeline, today) {
  var nextStart = '';
  (timeline || []).forEach(function (row) {
    var candidate = row.effectiveEnd
      ? _recipeDateText(row.effectiveEnd)
      : _offsetDateText(today, 1);
    if (row.effectiveStart && row.effectiveStart > today && candidate < row.effectiveStart) {
      candidate = _recipeDateText(row.effectiveStart);
    }
    if (candidate && (!nextStart || candidate > nextStart)) nextStart = candidate;
  });
  return nextStart || today;
}

function _recipeIntervalsOverlap(start, end, otherStart, otherEnd) {
  if (!start || !otherStart) return false;
  return (!end || otherStart < end) && (!otherEnd || start < otherEnd);
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
  if (_isDozenPackUnit(u)) return '个';
  if (_isCountPerPackGoods(goods, u, parsedQty)) return '个';
  // 采购单位可能只是通用包装名（如“件”），真正的配方计量单位应从明确规格中确定。
  // 例如 10000g/件默认按 g 录入，不能让用户误填成 5件/份。
  var specificationUnit = _minUnitFromWeightStr(
    goods && goods.gbDgGoodsStandardWeight,
    u
  );
  if (specificationUnit) return specificationUnit;
  // 瓶/桶/罐 等容器：优先检查标准规格是重量还是体积
  if (/瓶|罐|桶|升/i.test(u)) {
    var g = goods || {};
    var w = String(g.gbDgGoodsStandardWeight || '').trim().toLowerCase();
    // 标准规格含重量单位 → 按重量换算用 g
    if (/kg|公斤|千克|斤|克/.test(w)) return 'g';
    // 否则按体积换算用 ml
    return 'ml';
  }
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

function _decorateGoodsSearchPrice(goods) {
  var row = Object.assign({}, goods || {});
  var priceContext = _goodsDisplayPriceContext(row);
  row._searchPriceLabel = priceContext.title;
  row._searchPriceText = priceContext.displayText;
  row._searchPriceSource = priceContext.source;
  return row;
}

/**
 * 配料选择界面的价格只用于帮助识别商品和估算用量。
 * 正式历史理论成本仍由营业日入库批次和单位换算证据解析，不使用商品参考价兜底。
 */
function _goodsDisplayPriceContext(goods) {
  var g = _getGoodsEntity(goods);
  var averagePrice = Number(g.gbDgGoodsAveragePrice);
  var referencePrice = Number(g.gbDgGoodsPrice);
  var unit = String(g.gbDgGoodsStandardname || '').trim();
  var price = 0;
  var title = '单价';
  var source = 'MISSING';
  if (averagePrice > 0) {
    price = averagePrice;
    title = '近期采购均价';
    source = 'PURCHASE_AVERAGE';
  } else if (referencePrice > 0) {
    price = referencePrice;
    title = '商品参考价';
    source = 'GOODS_REFERENCE';
  }
  return {
    price: price,
    title: title,
    source: source,
    referenceOnly: source === 'GOODS_REFERENCE',
    displayText: price > 0
      ? ('¥' + price.toFixed(2) + (unit ? '/' + unit : ''))
      : '',
  };
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
  var priceContext = _goodsDisplayPriceContext(g);
  var price = priceContext.price;
  var convHint = _conventionalPackRatio(packUnit, minUnit, rawAmt);
  var conversionPlaceholder = '如500';
  if (_isCountMinUnit(minUnit)) {
    conversionPlaceholder = _isDozenPackUnit(packUnit) ? '12' : '如8';
  } else if (convHint > 0) {
    conversionPlaceholder = String(convHint);
  }
  var packPriceLabel = priceContext.displayText || '暂无单价';
  var conversionRequired = _needsManualConversion(g, minUnit);
  return {
    packUnit: packUnit,
    packQtyInMin: packQtyInMin,
    minUnit: minUnit,
    packLabel: packLabel,
    packPriceTitle: priceContext.title,
    packPriceLabel: packPriceLabel,
    packPrice: price,
    priceSource: priceContext.source,
    priceReferenceOnly: priceContext.referenceOnly,
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

module.exports = {

};
