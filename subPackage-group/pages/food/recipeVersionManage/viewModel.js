var REPLACEMENT_CACHE_PREFIX = 'foodRecipeReplacementContext:';

function localDateText(date) {
  var value = date || new Date();
  return value.getFullYear() + '-'
    + String(value.getMonth() + 1).padStart(2, '0') + '-'
    + String(value.getDate()).padStart(2, '0');
}

function offsetDateText(value, days) {
  var parts = String(value || localDateText()).split('-').map(Number);
  var date = new Date(parts[0], parts[1] - 1, parts[2]);
  date.setDate(date.getDate() + Number(days || 0));
  return localDateText(date);
}

function dateText(value) {
  return value ? String(value).slice(0, 10) : '';
}

function numberText(value) {
  var number = Number(value);
  if (isNaN(number)) return String(value || '');
  return Math.abs(number - Math.round(number)) < 0.000001
    ? String(Math.round(number))
    : number.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

function decimalText(value, digits) {
  var number = Number(value);
  if (isNaN(number)) return '—';
  return number.toFixed(typeof digits === 'number' ? digits : 8)
    .replace(/0+$/, '').replace(/\.$/, '');
}

function moneyText(value) {
  if (value === null || typeof value === 'undefined' || value === '') return '—';
  var amount = Number(value);
  return isNaN(amount) ? '—' : '¥' + amount.toFixed(2);
}

function unitText(value) {
  var labels = { G: '克', KG: '千克', JIN: '斤', ML: '毫升', L: '升', EA: '个' };
  var key = String(value || '').toUpperCase();
  return labels[key] || value || '';
}

function cleanText(value) {
  if (value == null) return '';
  var text = String(value).trim();
  return !text || text.toLowerCase() === 'null' ? '' : text;
}

function purchaseUnitCode(value) {
  var unit = cleanText(value);
  var aliases = {
    g: 'G', '克': 'G', kg: 'KG', '公斤': 'KG', '千克': 'KG', '斤': 'JIN',
    ml: 'ML', '毫升': 'ML', l: 'L', '升': 'L',
    '个': 'EA', '只': 'EA', '枚': 'EA', '颗': 'EA', '张': 'EA', '条': 'EA', '根': 'EA',
  };
  return aliases[unit.toLowerCase()] || aliases[unit] || unit.toUpperCase();
}

function baseUnitInfo(value) {
  var units = {
    G: { code: 'G', factor: 1 },
    KG: { code: 'G', factor: 1000 },
    JIN: { code: 'G', factor: 500 },
    ML: { code: 'ML', factor: 1 },
    L: { code: 'ML', factor: 1000 },
    EA: { code: 'EA', factor: 1 },
  };
  return units[String(value || '').toUpperCase()] || null;
}

function purchasePackBaseQuantity(goods, baseCode) {
  var row = goods || {};
  var specification = cleanText(row.gbDgGoodsStandardWeight || row.standardWeight);
  var purchaseUnit = cleanText(row.gbDgGoodsStandardname || row.standardName);
  var amount = parseFloat(specification.replace(/[^\d.]/g, ''));
  var lower = specification.toLowerCase();
  if (amount > 0) {
    if (baseCode === 'G') {
      if (/kg|公斤|千克/.test(lower)) return amount * 1000;
      if (/斤/.test(specification)) return amount * 500;
      if (/g|克/.test(lower)) return amount;
    }
    if (baseCode === 'ML') {
      if (/ml|毫升/.test(lower)) return amount;
      if (/(^|\d)\s*l\b|升/.test(lower)) return amount * 1000;
    }
    if (baseCode === 'EA' && /个|只|枚|颗|张|条|根/.test(specification)) return amount;
  }
  var purchaseBase = baseUnitInfo(purchaseUnitCode(purchaseUnit));
  return purchaseBase && purchaseBase.code === baseCode ? purchaseBase.factor : 0;
}

function dateRangeChunks(start, end) {
  var rows = [];
  var cursor = start;
  while (cursor && end && cursor <= end) {
    var chunkEnd = offsetDateText(cursor, 365);
    if (chunkEnd > end) chunkEnd = end;
    rows.push({ startDate: cursor, endDate: chunkEnd });
    cursor = offsetDateText(chunkEnd, 1);
  }
  return rows;
}

function purchaseSpec(component) {
  var goods = (component && component.rawGoods) || {};
  return [
    cleanText(goods.gbDgGoodsStandardname || goods.standardName),
    cleanText(goods.gbDgGoodsStandardWeight || goods.standardWeight),
  ].filter(Boolean).join(' ');
}

function replacementCandidate(version, base, pending) {
  if (!version || !base) return null;
  var currentRaw = (version._components || []).filter(function (row) { return !row._isIntermediate; });
  var baseRaw = (base._components || []).filter(function (row) { return !row._isIntermediate; });
  var currentIds = {};
  var baseIds = {};
  currentRaw.forEach(function (row) { currentIds[String(row.rawGoodsId)] = true; });
  baseRaw.forEach(function (row) { baseIds[String(row.rawGoodsId)] = true; });
  var added = currentRaw.filter(function (row) { return !baseIds[String(row.rawGoodsId)]; });
  var removed = baseRaw.filter(function (row) { return !currentIds[String(row.rawGoodsId)]; });
  if (added.length !== 1 || removed.length !== 1) return null;
  var next = added[0];
  var previous = removed[0];
  var matches = pending && pending.changeType === 'REPLACE'
    && Number(pending.replacedRawGoodsId) === Number(previous.rawGoodsId)
    && Number(pending.newRawGoodsId) === Number(next.rawGoodsId);
  var oldEvidence = matches && pending.oldGoods && pending.oldGoods.evidence;
  var newEvidence = matches && pending.newGoods && pending.newGoods.evidence;
  return {
    replacedRawGoodsId: Number(previous.rawGoodsId),
    replacementRawGoodsId: Number(next.rawGoodsId),
    replacedName: previous.name,
    replacementName: next.name,
    replacedSpec: purchaseSpec(previous),
    replacementSpec: purchaseSpec(next),
    replacedPurchaseUnitCode: oldEvidence && oldEvidence.purchaseUnitCode
      ? oldEvidence.purchaseUnitCode : purchaseUnitCode((previous.rawGoods || {}).gbDgGoodsStandardname),
    replacementPurchaseUnitCode: newEvidence && newEvidence.purchaseUnitCode
      ? newEvidence.purchaseUnitCode : purchaseUnitCode((next.rawGoods || {}).gbDgGoodsStandardname),
    explicitlyReplaced: !!matches,
  };
}

function componentView(component, index, baseUrl) {
  var row = Object.assign({}, component || {});
  var goods = row.rawGoods || {};
  var kind = String(row.itemKind || 'RAW_GOODS');
  var id = kind === 'INTERMEDIATE_PRODUCT' ? row.intermediateProductId : row.rawGoodsId;
  var imagePath = cleanText(goods.gbDgNxFatherImg || goods.gbDgNxFatherImgLarge);
  row._key = kind + ':' + String(id || row.name || '');
  row._index = index + 1;
  row._isIntermediate = kind === 'INTERMEDIATE_PRODUCT';
  row._amountText = numberText(row.quantityPerPortion) + ' ' + unitText(row.unitCode);
  row._specText = [
    cleanText(goods.gbDgGoodsStandardname || goods.standardName),
    cleanText(goods.gbDgGoodsStandardWeight || goods.standardWeight),
  ].filter(Boolean).join(' ');
  row._imageUrl = !row._isIntermediate && imagePath
    ? (/^https?:\/\//i.test(imagePath) ? imagePath : String(baseUrl || '') + imagePath) : '';
  return row;
}

function intervalContains(row, date) {
  return row && row.effectiveStart <= date && (!row.effectiveEnd || date < row.effectiveEnd);
}

function latestEndedInterval(timeline, businessToday) {
  return (timeline || []).filter(function (row) {
    return row && row.effectiveStart <= businessToday
      && row.effectiveEnd && row.effectiveEnd <= businessToday;
  }).sort(function (left, right) {
    return String(right.effectiveEnd).localeCompare(String(left.effectiveEnd))
      || String(right.effectiveStart).localeCompare(String(left.effectiveStart));
  })[0] || null;
}

function intervalText(row) {
  if (!row) return '';
  return dateText(row.effectiveStart) + ' 起 · '
    + (row.effectiveEnd ? dateText(row.effectiveEnd) + ' 起停止' : '持续使用');
}

function normalizeTimeline(payload) {
  return ((payload && payload.intervals) || []).map(function (wrapper) {
    var interval = Object.assign({}, wrapper.interval || wrapper || {});
    interval._versionNo = wrapper.versionNo;
    interval._versionStatus = wrapper.versionStatus;
    interval._displayState = wrapper.displayState;
    interval._isCurrentToday = !!wrapper.isCurrentToday;
    interval._contentVersionId = Number(wrapper.contentVersionId || interval.recipeVersionId || 0);
    interval._revisionNo = wrapper.revisionNo;
    interval._periodText = intervalText(interval);
    return interval;
  });
}

var COST_STATE_TEXT = {
  RECALCULATION_PENDING: '成本重算进行中，暂不能作为最终成本',
  RECALCULATION_FAILED: '成本重算失败或部分失败',
  CURRENT_COST_READY: '当前成本已就绪',
  COST_INCOMPLETE: '已有当前结果但证据不完整',
  NO_COST_GRAINS: '适用范围内没有需要计算的销量粒度',
  COST_NOT_CALCULATED: '已被使用但尚无可确认的成本结果',
  NOT_APPLIED: '该内容修订没有门店适用区间',
};

function costStateText(cost) {
  return COST_STATE_TEXT[(cost && cost.state) || ''] || '';
}

function costDetailText(cost) {
  if (!cost) return '';
  if (cost.state === 'RECALCULATION_PENDING' || cost.state === 'RECALCULATION_FAILED') {
    var parts = [];
    if (cost.recalculationStatus) parts.push('重算状态 ' + cost.recalculationStatus);
    parts.push('完成 ' + Number(cost.completedGrainCount || 0)
      + '/' + Number(cost.affectedGrainCount || 0) + ' 条');
    if (Number(cost.failedGrainCount || 0) > 0) parts.push('失败 ' + cost.failedGrainCount + ' 条');
    if (cost.failureMessage) parts.push(String(cost.failureMessage));
    return parts.join(' · ');
  }
  if (cost.state === 'CURRENT_COST_READY' || cost.state === 'COST_INCOMPLETE') {
    return '当前结果 ' + Number(cost.currentResultCount || 0) + ' 条 · 完整 '
      + Number(cost.completedResultCount || 0) + ' 条 · 不完整 '
      + Number(cost.incompleteResultCount || 0) + ' 条';
  }
  return '';
}

function contentStatusText(status) {
  return { DRAFT: '草稿', PUBLISHED: '已发布', RETIRED: '已退役' }[
    String(status || '').toUpperCase()
  ] || status || '';
}

function normalizeActiveIntervals(rows, storeDepartmentId) {
  return (rows || []).filter(function (row) {
    return !storeDepartmentId || Number(row.storeDepartmentId) === Number(storeDepartmentId);
  }).map(function (row) {
    var interval = {
      id: row.intervalId,
      recipeVersionId: row.recipeVersionId,
      storeDepartmentId: row.storeDepartmentId,
      effectiveStart: dateText(row.effectiveStart),
      effectiveEnd: row.effectiveEnd ? dateText(row.effectiveEnd) : '',
      status: row.intervalStatus,
    };
    interval._contentVersionId = Number(row.recipeVersionId || 0);
    interval._periodText = intervalText(interval);
    return interval;
  });
}

function decorateContentRevision(revision, baseUrl, today, storeDepartmentId) {
  var row = Object.assign({}, revision || {});
  row._contentVersionId = Number(row.contentVersionId || row.id || 0);
  row._components = (row.componentSummary || []).map(function (component, index) {
    return componentView(component, index, baseUrl);
  });
  row._intervals = normalizeActiveIntervals(row.activeIntervals, storeDepartmentId);
  row._isApplied = row.usageState === 'APPLIED' || row._intervals.length > 0;
  row._isCurrent = row._intervals.some(function (interval) { return intervalContains(interval, today); });
  row._statusText = contentStatusText(row.status);
  row._costState = (row.cost && row.cost.state) || '';
  row._costStateText = costStateText(row.cost);
  row._costDetailText = costDetailText(row.cost);
  row._publishedText = dateText(row.publishedAt || row.createdAt);
  row._changeReasonText = cleanText(row.changeReason);
  row._firstIntervalId = row._intervals.length ? row._intervals[0].id : '';
  row._costPerPortionText = '—';
  row._periodTotalCostText = '—';
  row._costStatusText = row._costStateText || '暂无成本状态';
  return row;
}

module.exports = {
  localDateText: localDateText,
  offsetDateText: offsetDateText,
  dateText: dateText,
  numberText: numberText,
  decimalText: decimalText,
  moneyText: moneyText,
  unitText: unitText,
  baseUnitInfo: baseUnitInfo,
  purchasePackBaseQuantity: purchasePackBaseQuantity,
  dateRangeChunks: dateRangeChunks,
  cleanText: cleanText,
  replacementCandidate: replacementCandidate,
  componentView: componentView,
  intervalContains: intervalContains,
  latestEndedInterval: latestEndedInterval,
  intervalText: intervalText,
  normalizeTimeline: normalizeTimeline,
  costStateText: costStateText,
  costDetailText: costDetailText,
  normalizeActiveIntervals: normalizeActiveIntervals,
  decorateContentRevision: decorateContentRevision,
  replacementCachePrefix: REPLACEMENT_CACHE_PREFIX,
};
