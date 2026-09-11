var preparationApi = require('../../../../services/preparation');
var preparationUtil = require('../../../../utils/preparation');
var RECIPE_REPLACEMENT_CONTEXT_PREFIX = 'foodRecipeReplacementContext:';

function localDateText(date) {
  var value = date || new Date();
  var year = value.getFullYear();
  var month = String(value.getMonth() + 1).padStart(2, '0');
  var day = String(value.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
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
  var n = Number(value);
  if (isNaN(n)) return String(value || '');
  if (Math.abs(n - Math.round(n)) < 0.000001) return String(Math.round(n));
  return n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

function decimalText(value, digits) {
  var n = Number(value);
  if (isNaN(n)) return '—';
  return n.toFixed(typeof digits === 'number' ? digits : 8)
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

function baseUnitInfo(value) {
  var key = String(value || '').toUpperCase();
  if (key === 'G') return { code: 'G', factor: 1 };
  if (key === 'KG') return { code: 'G', factor: 1000 };
  if (key === 'JIN') return { code: 'G', factor: 500 };
  if (key === 'ML') return { code: 'ML', factor: 1 };
  if (key === 'L') return { code: 'ML', factor: 1000 };
  if (key === 'EA') return { code: 'EA', factor: 1 };
  return null;
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

function cleanText(value) {
  if (value == null) return '';
  var text = String(value).trim();
  return !text || text.toLowerCase() === 'null' ? '' : text;
}

function purchaseUnitCode(value) {
  var unit = cleanText(value);
  var lower = unit.toLowerCase();
  var aliases = {
    g: 'G', '克': 'G', kg: 'KG', '公斤': 'KG', '千克': 'KG', '斤': 'JIN',
    ml: 'ML', '毫升': 'ML', l: 'L', '升': 'L',
    '个': 'EA', '只': 'EA', '枚': 'EA', '颗': 'EA', '张': 'EA', '条': 'EA', '根': 'EA',
  };
  return aliases[lower] || aliases[unit] || unit.toUpperCase();
}

function purchaseSpec(component) {
  var goods = (component && component.rawGoods) || {};
  var name = cleanText(goods.gbDgGoodsStandardname || goods.standardName);
  var weight = cleanText(goods.gbDgGoodsStandardWeight || goods.standardWeight);
  return [name, weight].filter(function (value) { return !!value; }).join(' ');
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
  var pendingMatches = pending && pending.changeType === 'REPLACE'
    && Number(pending.replacedRawGoodsId) === Number(previous.rawGoodsId)
    && Number(pending.newRawGoodsId) === Number(next.rawGoodsId);
  var oldEvidence = pendingMatches && pending.oldGoods && pending.oldGoods.evidence;
  var newEvidence = pendingMatches && pending.newGoods && pending.newGoods.evidence;
  return {
    replacedRawGoodsId: Number(previous.rawGoodsId),
    replacementRawGoodsId: Number(next.rawGoodsId),
    replacedName: previous.name,
    replacementName: next.name,
    replacedSpec: purchaseSpec(previous),
    replacementSpec: purchaseSpec(next),
    replacedPurchaseUnitCode: oldEvidence && oldEvidence.purchaseUnitCode
      ? oldEvidence.purchaseUnitCode
      : purchaseUnitCode((previous.rawGoods || {}).gbDgGoodsStandardname),
    replacementPurchaseUnitCode: newEvidence && newEvidence.purchaseUnitCode
      ? newEvidence.purchaseUnitCode
      : purchaseUnitCode((next.rawGoods || {}).gbDgGoodsStandardname),
    explicitlyReplaced: !!pendingMatches,
  };
}

function componentKey(component) {
  var kind = String(component.itemKind || 'RAW_GOODS');
  var id = kind === 'INTERMEDIATE_PRODUCT'
    ? component.intermediateProductId : component.rawGoodsId;
  return kind + ':' + String(id || component.name || '');
}

function componentView(component, index, baseUrl) {
  var row = Object.assign({}, component || {});
  var goods = row.rawGoods || {};
  var standardName = cleanText(goods.gbDgGoodsStandardname || goods.standardName);
  var standardWeight = cleanText(goods.gbDgGoodsStandardWeight || goods.standardWeight);
  var imagePath = cleanText(goods.gbDgNxFatherImg || goods.gbDgNxFatherImgLarge);
  row._key = componentKey(row);
  row._index = index + 1;
  row._isIntermediate = row.itemKind === 'INTERMEDIATE_PRODUCT';
  row._amountText = numberText(row.quantityPerPortion) + ' ' + unitText(row.unitCode);
  row._specText = [standardName, standardWeight].filter(function (value) { return !!value; }).join(' ');
  row._imageUrl = !row._isIntermediate && imagePath
    ? (/^https?:\/\//i.test(imagePath) ? imagePath : String(baseUrl || '') + imagePath)
    : '';
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
    var byEnd = String(right.effectiveEnd).localeCompare(String(left.effectiveEnd));
    return byEnd || String(right.effectiveStart).localeCompare(String(left.effectiveStart));
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
  var state = (cost && cost.state) || '';
  return COST_STATE_TEXT[state] || '';
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
  var key = String(status || '').toUpperCase();
  if (key === 'DRAFT') return '草稿';
  if (key === 'PUBLISHED') return '已发布';
  if (key === 'RETIRED') return '已退役';
  return status || '';
}

// 后端 activeIntervals 已按内容修订绑定；页面直接消费，不再用 versionNo 反推归属。
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
  row._isCurrent = row._intervals.some(function (interval) {
    return intervalContains(interval, today);
  });
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

function decorateVersions(versions, timeline, baseUrl, businessToday, storeDepartmentId) {
  var today = businessToday || localDateText();
  var rows = (versions || []).slice().sort(function (left, right) {
    return Number(right.versionNo || 0) - Number(left.versionNo || 0);
  }).map(function (version) {
    var row = Object.assign({}, version);
    row._contentVersionId = Number(row.latestContentVersionId || row.id || 0);
    row._components = (row.componentSummary || []).map(function (component, index) {
      return componentView(component, index, baseUrl);
    });
    // 只取后端为该内容修订返回的 ACTIVE 区间，不按 versionNo 关联同一业务版本下的其他修订。
    row._intervals = normalizeActiveIntervals(row.activeIntervals, storeDepartmentId);
    row._isCurrent = row._intervals.some(function (interval) {
      return intervalContains(interval, today);
    });
    row._isDraft = String(row.status || '').toUpperCase() === 'DRAFT';
    row._canApply = String(row.status || '').toUpperCase() === 'PUBLISHED';
    row._statusText = row._isDraft ? '草稿' : (row._isCurrent ? '当前使用' : '已发布');
    var retired = String(row.status || '').toUpperCase() === 'RETIRED';
    if (retired) row._statusText = '已退役';
    row._statusClass = row._isDraft ? 'draft' : (row._isCurrent ? 'current' : 'published');
    if (retired) row._statusClass = 'retired';
    row._publishedText = dateText(row.publishedAt || row.createdAt);
    row._changeReasonText = cleanText(row.changeReason);
    row._usageState = row.usageState || '';
    row._latestNotApplied = row._usageState === 'LATEST_CONTENT_NOT_APPLIED';
    row._costState = (row.cost && row.cost.state) || '';
    row._costStateText = costStateText(row.cost);
    row._costDetailText = costDetailText(row.cost);
    row._contentRevisions = (row.revisions || row.revisionHistory || []).map(function (revision) {
      return decorateContentRevision(revision, baseUrl, today, storeDepartmentId);
    });
    return row;
  });
  var byId = {};
  rows.forEach(function (row) { byId[String(row.id)] = row; });
  rows.forEach(function (row) {
    var base = row.basedOnVersionId ? byId[String(row.basedOnVersionId)] : null;
    var baseIds = {};
    ((base && base._components) || []).forEach(function (component) {
      if (!component._isIntermediate) baseIds[String(component.rawGoodsId)] = true;
    });
    row._changedRawGoods = row._components.filter(function (component) {
      return !component._isIntermediate && !baseIds[String(component.rawGoodsId)];
    });
    var pending = wx.getStorageSync(RECIPE_REPLACEMENT_CONTEXT_PREFIX + String(row.id)) || null;
    row._replacementCandidate = replacementCandidate(row, base, pending);
  });
  return rows;
}

function versionCostChunks(version, businessToday) {
  var today = businessToday || localDateText();
  var rows = [];
  (version._intervals || []).forEach(function (interval) {
    var start = dateText(interval.effectiveStart);
    if (!start || start > today) return;
    var end = interval.effectiveEnd ? offsetDateText(dateText(interval.effectiveEnd), -1) : today;
    if (end > today) end = today;
    if (end < start) return;
    rows = rows.concat(dateRangeChunks(start, end));
  });
  return rows;
}

function aggregateVersionCost(version, reports, foodId, contentVersionId) {
  var strictVersionId = Number(contentVersionId || version.id);
  var dailyRows = [];
  var ingredients = {};
  (reports || []).forEach(function (report) {
    var dish = ((report && report.dishes) || []).find(function (item) {
      return Number(item.foodId) === Number(foodId);
    });
    if (!dish) return;
    (dish.dailyRows || []).forEach(function (daily) {
      // 只认内容修订 ID；不再用 versionNo 把同一业务版本下其他修订的成本算进来。
      if (Number(daily.recipeVersionId) === strictVersionId) dailyRows.push(daily);
    });
    (dish.ingredientSummaries || []).forEach(function (ingredient) {
      var recipeVersionNos = ingredient.recipeVersionNos || [];
      if (recipeVersionNos.length && !recipeVersionNos.some(function (value) {
        return Number(value) === Number(version.versionNo);
      })) return;
      var key = String(ingredient.rawGoodsId) + ':' + String(ingredient.baseUnitCode || '');
      var aggregate = ingredients[key] || {
        totalBaseQuantity: 0,
        completeCostAmount: 0,
        evidenceDateCount: 0,
        allEvidenceComplete: true,
      };
      aggregate.totalBaseQuantity += Number(ingredient.totalBaseQuantity) || 0;
      if (ingredient.completeCostAmount === null || ingredient.completeCostAmount === undefined) {
        aggregate.allEvidenceComplete = false;
      } else {
        aggregate.completeCostAmount += Number(ingredient.completeCostAmount) || 0;
      }
      aggregate.evidenceDateCount += Number(ingredient.evidenceDateCount) || 0;
      aggregate.allEvidenceComplete = aggregate.allEvidenceComplete
        && ingredient.allEvidenceComplete === true;
      ingredients[key] = aggregate;
    });
  });

  var salesQuantity = 0;
  var totalCost = 0;
  var allComplete = dailyRows.length > 0;
  var businessDates = {};
  dailyRows.forEach(function (daily) {
    salesQuantity += Number(daily.salesQuantity) || 0;
    if (daily.businessDate) businessDates[dateText(daily.businessDate)] = true;
    if (daily.completeCostAmount === null || daily.completeCostAmount === undefined
      || String(daily.status || '') !== 'COMPLETED') {
      allComplete = false;
    } else {
      totalCost += Number(daily.completeCostAmount) || 0;
    }
  });

  var components = (version._components || []).map(function (component) {
    var row = Object.assign({}, component);
    // 没有属于该内容修订的当前成本结果时，不借用其他修订的证据反算单价。
    if (!dailyRows.length) {
      row._averagePriceText = row._isIntermediate
        ? '中间料按组成原料核算' : '该内容修订暂无已确认成本';
      row._portionCostText = '—';
      row._costComplete = false;
      return row;
    }
    if (row._isIntermediate) {
      row._averagePriceText = '中间料按组成原料核算';
      row._portionCostText = '—';
      row._costComplete = false;
      return row;
    }
    var base = baseUnitInfo(row.unitCode);
    var summary = base && ingredients[String(row.rawGoodsId) + ':' + base.code];
    var baseQuantity = base ? (Number(row.quantityPerPortion) || 0) * base.factor : 0;
    var averagePrice = summary && summary.allEvidenceComplete && summary.totalBaseQuantity > 0
      ? summary.completeCostAmount / summary.totalBaseQuantity : null;
    if (averagePrice === null || isNaN(Number(averagePrice)) || !(baseQuantity > 0)) {
      row._averagePriceText = summary
        ? '时期价格证据不完整' : '该时期暂无成本证据';
      row._portionCostText = '—';
      row._costComplete = false;
      return row;
    }
    row._averagePriceText = '时期平均采购价 ¥' + decimalText(averagePrice, 8)
      + '/' + unitText(base.code);
    var purchaseUnit = cleanText((row.rawGoods || {}).gbDgGoodsStandardname);
    var packBaseQuantity = purchasePackBaseQuantity(row.rawGoods, base.code);
    if (purchaseUnit && packBaseQuantity > 0) {
      row._averagePriceText = '时期平均采购价 ' + moneyText(averagePrice * packBaseQuantity)
        + '/' + purchaseUnit;
      row._averageBasePriceText = '折 ¥' + decimalText(averagePrice, 8)
        + '/' + unitText(base.code);
    }
    row._portionCostText = moneyText(baseQuantity * averagePrice);
    row._costComplete = true;
    return row;
  });

  version._components = components;
  version._costDateCount = Object.keys(businessDates).length;
  version._salesQuantityText = numberText(salesQuantity);
  version._periodTotalCostText = allComplete ? moneyText(totalCost) : '—';
  version._costPerPortionText = allComplete && salesQuantity > 0
    ? moneyText(totalCost / salesQuantity) : '—';
  version._costComplete = allComplete && salesQuantity > 0;
  if (version._costComplete) {
    version._costStatusText = version._costDateCount + '个营业日 · '
      + version._salesQuantityText + '份 · 累计 ' + version._periodTotalCostText;
  } else if (!dailyRows.length) {
    version._costStatusText = version._costStateText
      || (version._intervals.length
        ? '适用期内暂无营业销量，暂不能计算时期均价' : '尚未设置门店适用时间');
  } else {
    version._costStatusText = '适用期存在缺少配方、价格或换算的营业日，完整成本保持“—”';
  }
  return version;
}

function loadCostFor(target, foodId, identity, businessToday, contentVersionId) {
  var row = Object.assign({}, target, {
    _components: (target._components || []).map(function (component) {
      return Object.assign({}, component);
    }),
  });
  if (String(row.status || '').toUpperCase() === 'DRAFT') {
    row._costPerPortionText = '—';
    row._periodTotalCostText = '—';
    row._costStatusText = '草稿不参与成本核算';
    return Promise.resolve(row);
  }
  var chunks = versionCostChunks(row, businessToday);
  if (!chunks.length) {
    return Promise.resolve(aggregateVersionCost(row, [], foodId, contentVersionId));
  }
  return Promise.all(chunks.map(function (chunk) {
    return preparationApi.getDishDailyCostReport({
      distributerId: identity.distributerId,
      storeDepartmentId: identity.currentStoreId,
      startDate: chunk.startDate,
      endDate: chunk.endDate,
      sortBy: 'status',
      sortOrder: 'desc',
    });
  })).then(function (reports) {
    return aggregateVersionCost(row, reports, foodId, contentVersionId);
  }).catch(function () {
    row._costPerPortionText = '—';
    row._periodTotalCostText = '—';
    row._costStatusText = '版本时期成本读取失败，请稍后重试';
    row._components = row._components.map(function (component) {
      return Object.assign({}, component, {
        _averagePriceText: '成本数据读取失败',
        _portionCostText: '—',
        _costComplete: false,
      });
    });
    return row;
  });
}

function loadVersionCosts(versions, foodId, identity, businessToday) {
  return Promise.all((versions || []).map(function (version) {
    return loadCostFor(version, foodId, identity, businessToday, version._contentVersionId)
      .then(function (row) {
        // 每个内容修订按各自的区间取成本，不共用最新修订的核算结果。
        var applied = (row._contentRevisions || []).filter(function (revision) {
          return revision._isApplied;
        });
        if (!applied.length) return row;
        return Promise.all(applied.map(function (revision) {
          return loadCostFor(revision, foodId, identity, businessToday, revision._contentVersionId);
        })).then(function (loaded) {
          var byId = {};
          loaded.forEach(function (item) { byId[String(item._contentVersionId)] = item; });
          row._contentRevisions = (row._contentRevisions || []).map(function (revision) {
            return byId[String(revision._contentVersionId)] || revision;
          });
          return row;
        });
      });
  }));
}

function buildTimelineItems(timeline, versions, businessToday) {
  var versionById = {};
  (versions || []).forEach(function (row) { versionById[String(row.id)] = row; });
  var rows = (timeline || []).slice().sort(function (left, right) {
    return String(left.effectiveStart).localeCompare(String(right.effectiveStart));
  });
  var items = [];
  rows.forEach(function (row, index) {
    if (index > 0) {
      var previous = rows[index - 1];
      if (previous.effectiveEnd && previous.effectiveEnd < row.effectiveStart) {
        items.push({
          _key: 'gap:' + previous.effectiveEnd + ':' + row.effectiveStart,
          _isGap: true,
          _periodText: previous.effectiveEnd + ' 起 · ' + row.effectiveStart + ' 起停止',
          _isToday: previous.effectiveEnd <= businessToday && businessToday < row.effectiveStart,
        });
      }
    }
    var version = versionById[String(row.recipeVersionId)] || {};
    items.push({
      _key: 'interval:' + row.id,
      _isGap: false,
      _isToday: intervalContains(row, businessToday),
      _versionLabel: 'V' + (version.versionNo || row._versionNo || ''),
      _periodText: row._periodText,
      _changeReasonText: version._changeReasonText || '',
    });
  });
  return items;
}

function previewIntervalView(row, index, versions) {
  var source = Object.assign({}, row || {});
  var version = (versions || []).find(function (item) {
    return Number(item.id) === Number(source.recipeVersionId);
  });
  source._key = String(source.id || 'new') + ':' + String(source.recipeVersionId || '') + ':' + index;
  source._versionLabel = version ? 'V' + version.versionNo : '版本ID ' + source.recipeVersionId;
  source._periodText = intervalText(source);
  return source;
}

Page({
  data: {
    navBarHeight: 0,
    foodId: '',
    foodItem: {},
    recipe: null,
    versions: [],
    timeline: [],
    currentVersion: null,
    draftVersion: null,
    businessToday: '',
    timelineItems: [],
    loading: true,
    serverUrl: '',
    showIntervalEditor: false,
    intervalVersion: null,
    intervalTargetId: null,
    intervalOperation: 'ADD_INTERVAL',
    intervalOperationText: '新增使用时间段',
    intervalStart: '',
    intervalEnd: '',
    intervalHasEnd: false,
    intervalReason: '',
    intervalPreview: null,
    confirmingInterval: false,
    intervalBatchLoading: false,
    intervalBatchHints: [],
    intervalSelectedBatchId: null,
    intervalReplacementCandidate: null,
    intervalRecordReplacement: false,
    replacementPreview: null,
    deletionSubmitting: false,
  },

  onLoad: function (options) {
    var app = getApp();
    var foodItem = wx.getStorageSync('Food') || {};
    var foodId = (options && options.foodId)
      || foodItem.foodId || foodItem.gbDistributerFoodId || '';
    this.identity = preparationUtil.getIdentity();
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      serverUrl: app.globalData.server || '',
      foodId: foodId,
      foodItem: foodItem,
    });
    this._skipFirstShow = true;
    this.loadVersions();
  },

  onShow: function () {
    if (this._skipFirstShow) {
      this._skipFirstShow = false;
      return;
    }
    this.loadVersions();
  },

  loadVersions: function () {
    var that = this;
    var identity = this.identity || preparationUtil.getIdentity();
    if (!this.data.foodId || !identity.distributerId || !identity.currentStoreId) {
      this.setData({ loading: false });
      wx.showToast({ title: '缺少菜品或门店信息', icon: 'none' });
      return Promise.resolve();
    }
    this.setData({ loading: true });
    return preparationApi.getFoodRecipeByFood(this.data.foodId, identity.distributerId)
      .then(function (detail) {
        return Promise.all([
          preparationApi.listFoodVersions(detail.recipe.id, identity.distributerId),
          preparationApi.listFoodEffectiveIntervals(
            detail.recipe.id,
            identity.distributerId,
            identity.currentStoreId
          ),
        ]).then(function (results) {
          var timelinePayload = results[1] || {};
          var businessToday = dateText(timelinePayload.businessToday) || localDateText();
          var timeline = normalizeTimeline(timelinePayload);
          var baseVersions = decorateVersions(
            results[0],
            timeline,
            that.data.serverUrl,
            businessToday,
            identity.currentStoreId
          );
          return loadVersionCosts(baseVersions, that.data.foodId, identity, businessToday).then(function (versions) {
            that.setData({
              loading: false,
              recipe: detail.recipe,
              versions: versions,
              timeline: timeline,
              businessToday: businessToday,
              timelineItems: buildTimelineItems(timeline, versions, businessToday),
              currentVersion: versions.find(function (row) { return row._isCurrent; }) || null,
              draftVersion: versions.find(function (row) { return row._isDraft; }) || null,
            });
          });
        });
      }).catch(function (error) {
        that.setData({ loading: false });
        preparationUtil.showError(error);
      });
  },

  createVersion: function () {
    var event = arguments[0] || {};
    var requestedId = Number(event.currentTarget && event.currentTarget.dataset.versionId || 0);
    var baseVersion = this.data.versions.find(function (row) { return Number(row.id) === requestedId; })
      || this.data.currentVersion
      || this.data.versions.find(function (row) { return !row._isDraft; })
      || this.data.draftVersion;
    var params = [
      'foodId=' + encodeURIComponent(String(this.data.foodId)),
      'returnToManage=1',
    ];
    if (baseVersion && baseVersion.id) params.push('baseVersionId=' + encodeURIComponent(String(baseVersion.id)));
    wx.navigateTo({ url: '../recipeVersionEdit/recipeVersionEdit?' + params.join('&') });
  },

  // 编辑入口必须携带明确的内容修订 ID；若该修订已有适用区间，一并带上区间 ID，
  // 编辑页据此回填已保存的日期，而不是默默退回今天。
  editVersion: function (event) {
    var dataset = (event && event.currentTarget && event.currentTarget.dataset) || {};
    var contentVersionId = Number(dataset.contentVersionId || dataset.versionId || 0);
    var intervalId = Number(dataset.intervalId || 0);
    if (!contentVersionId) {
      wx.showToast({ title: '缺少配方内容修订，请刷新后重试', icon: 'none' });
      return;
    }
    var params = [
      'foodId=' + encodeURIComponent(String(this.data.foodId)),
      'returnToManage=1',
      'contentVersionId=' + encodeURIComponent(String(contentVersionId)),
      'manageVersionId=' + encodeURIComponent(String(contentVersionId)),
      'baseVersionId=' + encodeURIComponent(String(contentVersionId)),
    ];
    if (intervalId > 0) {
      params.push('intervalId=' + encodeURIComponent(String(intervalId)));
    }
    wx.navigateTo({ url: '../recipeVersionEdit/recipeVersionEdit?' + params.join('&') });
  },

  findContentVersion: function (contentVersionId) {
    var found = null;
    (this.data.versions || []).forEach(function (version) {
      if (found) return;
      if (Number(version._contentVersionId) === Number(contentVersionId)) {
        found = version;
        return;
      }
      (version._contentRevisions || []).forEach(function (revision) {
        if (!found && Number(revision._contentVersionId) === Number(contentVersionId)) {
          found = revision;
        }
      });
    });
    return found;
  },

  deleteVersion: function (event) {
    var dataset = (event && event.currentTarget && event.currentTarget.dataset) || {};
    this.previewDeletion(Number(dataset.contentVersionId || 0));
  },

  // 删除统一走"预览影响 → 一次确认 → 提交"。前端不再判断有区间或有成本就禁止删除，
  // 也不再逐个解除区间、取消重算或清理数据，这些由后端在确认时一次完成。
  previewDeletion: function (contentVersionId) {
    var that = this;
    if (this.data.deletionSubmitting) return Promise.resolve();
    var recipe = this.data.recipe;
    if (!contentVersionId || !recipe || !recipe.id) {
      wx.showToast({ title: '缺少配方内容修订，请刷新后重试', icon: 'none' });
      return Promise.resolve();
    }
    var version = this.findContentVersion(contentVersionId);
    if (!version) {
      wx.showToast({ title: '未找到该内容修订，请刷新后重试', icon: 'none' });
      return Promise.resolve();
    }
    var identity = this.identity || preparationUtil.getIdentity();
    wx.showLoading({ title: '读取删除影响', mask: true });
    return preparationApi.previewFoodVersionDeletion(recipe.id, contentVersionId, {
      distributerId: identity.distributerId,
      recipeRowVersion: Number(recipe.rowVersion || 0),
      versionRowVersion: Number(version.rowVersion || 0),
      operatorId: identity.operatorId,
    }).then(function (preview) {
      wx.hideLoading();
      that.confirmDeletion(contentVersionId, preview);
      return preview;
    }).catch(function (error) {
      wx.hideLoading();
      preparationUtil.showError(error);
    });
  },

  // 确认框只用业务语言说明删哪份、解除什么、清理什么、什么不受影响。
  confirmDeletion: function (contentVersionId, preview) {
    var that = this;
    if (!preview || !preview.deletionPreviewToken) {
      wx.showToast({ title: '删除影响读取失败，请重试', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '确认删除这份配方？',
      content: preparationUtil.deletionPreviewText(
        preview,
        this.data.foodItem && this.data.foodItem.dishName
      ),
      confirmText: '确认删除',
      confirmColor: '#d94b4b',
      success: function (result) {
        if (result.confirm) that.performDelete(contentVersionId, preview);
      },
    });
  },

  performDelete: function (contentVersionId, preview) {
    var that = this;
    // 提交期间防止重复点击。
    if (this.data.deletionSubmitting) return;
    var identity = this.identity || preparationUtil.getIdentity();
    var version = this.findContentVersion(contentVersionId);
    if (!version) {
      wx.showToast({ title: '未找到该内容修订，请刷新后重试', icon: 'none' });
      return;
    }
    if (!preview || !preview.deletionPreviewToken) {
      wx.showToast({ title: '删除影响已失效，请重新确认', icon: 'none' });
      return;
    }
    this.setData({ deletionSubmitting: true });
    wx.showLoading({ title: '删除中', mask: true });
    preparationApi.foodVersionAction(this.data.recipe.id, contentVersionId, 'delete', {
      distributerId: identity.distributerId,
      recipeRowVersion: Number(this.data.recipe.rowVersion || 0),
      versionRowVersion: Number(version.rowVersion || 0),
      deletionReason: '用户在配方版本管理页删除内容修订',
      deletionPreviewToken: preview.deletionPreviewToken,
      operatorId: identity.operatorId,
    }).then(function (result) {
      wx.hideLoading();
      that.setData({ deletionSubmitting: false });
      // 只有后端明确返回完成才收口；COMPLETED 且幂等重放同样按已完成处理。
      if (String((result && result.operationStatus) || '') !== 'COMPLETED') {
        wx.showModal({
          title: '删除尚未完成',
          content: '后端没有确认删除完成，页面保持原样，请稍后刷新查看。',
          showCancel: false,
        });
        return;
      }
      wx.showToast({ title: '已删除', icon: 'success' });
      return that.loadVersions();
    }).catch(function (error) {
      wx.hideLoading();
      that.setData({ deletionSubmitting: false });
      // 预览令牌或行版本已变化：重新预览并让用户确认新的影响范围，不静默换令牌继续删除。
      if (Number(error && error.status) === 409) {
        wx.showModal({
          title: '删除影响范围已变化',
          content: '这份配方的内容或使用安排刚被改动，需要按最新情况重新确认。',
          confirmText: '重新确认',
          success: function (modalResult) {
            if (modalResult.confirm) that.previewDeletion(contentVersionId);
          },
        });
        return;
      }
      preparationUtil.showError(error);
    });
  },

  openIntervalEditor: function (event) {
    this._pendingUsageStorageKey = null;
    var versionId = Number(event.currentTarget.dataset.versionId);
    var intervalId = Number(event.currentTarget.dataset.intervalId || 0);
    var operation = String(event.currentTarget.dataset.operation || '').toUpperCase();
    var version = this.data.versions.find(function (row) { return Number(row.id) === versionId; });
    this.openIntervalEditorForVersion(version, intervalId, operation, null);
  },

  openIntervalEditorForVersion: function (version, intervalId, operation, preset) {
    if (!version || !version._canApply) {
      wx.showToast({ title: '只有已发布版本可以设置使用时间', icon: 'none' });
      return;
    }
    var today = this.data.businessToday || localDateText();
    var existing = intervalId ? this.data.timeline.find(function (row) {
      return Number(row.id) === intervalId;
    }) : null;
    var explicitlyEditingInterval = !!existing;
    var setCurrentStart = today;
    if (!existing && operation === 'SET_CURRENT' && !preset) {
      var previous = latestEndedInterval(this.data.timeline, today);
      if (previous && Number(previous.recipeVersionId) === Number(version.id)) {
        existing = previous;
        setCurrentStart = dateText(previous.effectiveStart);
      } else if (previous && previous.effectiveEnd) {
        setCurrentStart = dateText(previous.effectiveEnd);
      }
    }
    if (explicitlyEditingInterval) operation = 'ADJUST_INTERVAL';
    if (!operation) operation = 'ADD_INTERVAL';
    var operationText = {
      SET_CURRENT: '设为当前使用',
      ADD_INTERVAL: '新增使用时间段',
      ADJUST_INTERVAL: '调整现有时间段',
      HISTORICAL_CORRECTION: '修正历史配方',
    }[operation] || '设置使用时间';
    var start = preset && preset.effectiveStart ? dateText(preset.effectiveStart)
      : existing ? dateText(existing.effectiveStart)
      : operation === 'HISTORICAL_CORRECTION' ? offsetDateText(today, -30)
      : operation === 'SET_CURRENT' ? setCurrentStart : today;
    var end = preset && preset.effectiveEnd ? dateText(preset.effectiveEnd)
      : operation === 'SET_CURRENT' ? ''
      : existing ? dateText(existing.effectiveEnd)
      : operation === 'HISTORICAL_CORRECTION' ? today : '';
    this.setData({
      showIntervalEditor: true,
      intervalVersion: version,
      intervalTargetId: existing ? existing.id : null,
      intervalOperation: operation,
      intervalOperationText: operationText,
      intervalStart: start,
      intervalEnd: end,
      intervalHasEnd: !!end,
      intervalReason: preset && preset.reason
        ? String(preset.reason) : operationText + '：V' + version.versionNo,
      intervalPreview: null,
      intervalBatchLoading: true,
      intervalBatchHints: [],
      intervalSelectedBatchId: null,
      intervalReplacementCandidate: version._replacementCandidate || null,
      intervalRecordReplacement: !!(version._replacementCandidate
        && version._replacementCandidate.explicitlyReplaced),
      replacementPreview: null,
    });
    this.loadIntervalBatchHints(version);
  },

  loadIntervalBatchHints: function (version) {
    var that = this;
    var identity = this.identity || preparationUtil.getIdentity();
    var goodsRows = (version && version._changedRawGoods) || [];
    if (!goodsRows.length) {
      this.setData({ intervalBatchLoading: false, intervalBatchHints: [] });
      return;
    }
    Promise.all(goodsRows.map(function (goods) {
      return preparationApi.listHistoricalReceiptBatches({
        distributerId: identity.distributerId,
        storeDepartmentId: identity.currentStoreId,
        rawGoodsId: goods.rawGoodsId,
        notAfter: localDateText(),
        limit: 8,
      }).then(function (batches) {
        return (batches || []).map(function (batch) {
          var row = Object.assign({}, batch);
          row._key = goods.rawGoodsId + ':' + batch.stockBatchId;
          row._goodsName = goods.name;
          row._dateText = dateText(batch.receiptBusinessDate);
          row._quantityText = cleanText(batch.quantityText)
            + (cleanText(batch.unitCode) ? ' ' + cleanText(batch.unitCode) : '');
          return row;
        });
      });
    })).then(function (groups) {
      var rows = [];
      groups.forEach(function (group) { rows = rows.concat(group); });
      rows.sort(function (left, right) {
        return String(right._dateText).localeCompare(String(left._dateText));
      });
      that.setData({ intervalBatchLoading: false, intervalBatchHints: rows });
    }).catch(function () {
      that.setData({ intervalBatchLoading: false, intervalBatchHints: [] });
    });
  },

  chooseIntervalBatch: function (event) {
    var key = String(event.currentTarget.dataset.key || '');
    var batch = this.data.intervalBatchHints.find(function (row) { return row._key === key; });
    if (!batch) return;
    var reason = String(this.data.intervalReason || '').replace(/；参考入库批次#[^；]+$/, '');
    this.setData({
      intervalSelectedBatchId: batch.stockBatchId,
      intervalStart: batch._dateText,
      intervalReason: reason + '；参考入库批次#' + batch.stockBatchId,
      intervalPreview: null,
      replacementPreview: null,
    });
  },

  closeIntervalEditor: function () {
    if (this.data.confirmingInterval) return;
    this.setData({ showIntervalEditor: false, intervalPreview: null });
  },

  stopPropagation: function () {},

  onIntervalStartChange: function (event) {
    var start = event.detail.value;
    var end = this.data.intervalEnd;
    if (this.data.intervalHasEnd && (!end || end <= start)) end = offsetDateText(start, 1);
    this.setData({ intervalStart: start, intervalEnd: end, intervalPreview: null, replacementPreview: null });
  },

  onIntervalEndChange: function (event) {
    this.setData({ intervalEnd: event.detail.value, intervalPreview: null, replacementPreview: null });
  },

  onIntervalEndSwitch: function (event) {
    this.setData({
      intervalHasEnd: !!event.detail.value,
      intervalEnd: event.detail.value
        ? (this.data.intervalEnd > this.data.intervalStart
          ? this.data.intervalEnd : offsetDateText(this.data.intervalStart, 1)) : '',
      intervalPreview: null,
      replacementPreview: null,
    });
  },

  chooseIntervalDuration: function (event) {
    var hasEnd = String(event.currentTarget.dataset.hasEnd) === '1';
    this.setData({
      intervalHasEnd: hasEnd,
      intervalEnd: hasEnd
        ? (this.data.intervalEnd > this.data.intervalStart
          ? this.data.intervalEnd : offsetDateText(this.data.intervalStart, 1)) : '',
      intervalPreview: null,
      replacementPreview: null,
    });
  },

  onIntervalReasonInput: function (event) {
    this.setData({ intervalReason: event.detail.value, intervalPreview: null, replacementPreview: null });
  },

  onReplacementSwitch: function (event) {
    this.setData({
      intervalRecordReplacement: !!event.detail.value,
      intervalPreview: null,
      replacementPreview: null,
    });
  },

  intervalRequest: function () {
    var identity = this.identity || preparationUtil.getIdentity();
    return {
      distributerId: identity.distributerId,
      storeDepartmentId: identity.currentStoreId,
      targetIntervalId: this.data.intervalTargetId || null,
      effectiveStart: this.data.intervalStart,
      effectiveEnd: this.data.intervalHasEnd ? this.data.intervalEnd : null,
      businessOperation: this.data.intervalOperation,
      adjustmentReason: String(this.data.intervalReason || '').trim(),
      operatorId: identity.operatorId,
    };
  },

  replacementRequest: function () {
    var identity = this.identity || preparationUtil.getIdentity();
    var candidate = this.data.intervalReplacementCandidate;
    if (!candidate) return null;
    if (!candidate.replacedPurchaseUnitCode || !candidate.replacementPurchaseUnitCode) {
      throw {
        preparationError: true,
        status: 400,
        message: '新旧商品的采购包装规格不完整，请先补齐商品规格',
      };
    }
    return {
      distributerId: identity.distributerId,
      storeDepartmentId: identity.currentStoreId,
      replacedRawGoodsId: candidate.replacedRawGoodsId,
      replacementRawGoodsId: candidate.replacementRawGoodsId,
      effectiveStart: this.data.intervalStart,
      effectiveEnd: this.data.intervalHasEnd ? this.data.intervalEnd : null,
      replacedPurchaseUnitCode: candidate.replacedPurchaseUnitCode,
      replacementPurchaseUnitCode: candidate.replacementPurchaseUnitCode,
      sourceRecipeVersionId: this.data.intervalVersion.id,
      adjustmentReason: String(this.data.intervalReason || '').trim(),
      operatorId: identity.operatorId,
    };
  },

  previewInterval: function () {
    var that = this;
    var version = this.data.intervalVersion;
    var request = this.intervalRequest();
    if (!request.adjustmentReason) {
      wx.showToast({ title: '请填写调整原因', icon: 'none' });
      return;
    }
    if (request.effectiveEnd && request.effectiveEnd <= request.effectiveStart) {
      wx.showToast({ title: '停止日期必须晚于启用日期', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '计算影响范围', mask: true });
    var recipePreviewPromise = preparationApi.previewFoodEffectiveInterval(
      this.data.recipe.id, version.id, request
    );
    var replacementPreviewPromise = Promise.resolve(null);
    if (this.data.intervalRecordReplacement && this.data.intervalReplacementCandidate) {
      try {
        replacementPreviewPromise = preparationApi.previewRawGoodsReplacement(this.replacementRequest());
      } catch (error) {
        wx.hideLoading();
        preparationUtil.showError(error);
        return;
      }
    }
    Promise.all([recipePreviewPromise, replacementPreviewPromise])
      .then(function (results) {
        wx.hideLoading();
        var preview = results[0];
        var replacementPreview = results[1];
        preview._affectedText = dateText(preview.affectedEffectiveStart) + ' 至 '
          + (preview.affectedEffectiveEnd ? dateText(preview.affectedEffectiveEnd) + '（不含）' : '以后');
        preview._afterTimeline = (preview.afterTimeline || []).map(function (row, index) {
          return previewIntervalView(row, index, that.data.versions);
        });
        preview._gapCount = (preview.gaps || []).length;
        var impact = preview.costImpact || {};
        impact._salesText = numberText(impact.salesQuantity || 0) + ' 份';
        impact._oldCostText = moneyText(impact.oldCompleteCostAmount);
        impact._newCostText = moneyText(impact.newCompleteCostAmount);
        impact._differenceText = moneyText(impact.completeCostDifference);
        impact._hasIncomplete = Number(impact.oldIncompleteRecordCount || 0) > 0
          || Number(impact.newIncompleteRecordCount || 0) > 0;
        impact._dateText = impact.actualBusinessDateStart
          ? dateText(impact.actualBusinessDateStart) + ' 至 '
            + dateText(impact.actualBusinessDateEnd) + '（不含）'
          : '该范围内暂无已导入销量';
        preview.costImpact = impact;
        that.setData({ intervalPreview: preview, replacementPreview: replacementPreview });
      }).catch(function (error) {
        wx.hideLoading();
        preparationUtil.showError(error);
      });
  },

  confirmInterval: function () {
    var that = this;
    var preview = this.data.intervalPreview;
    var version = this.data.intervalVersion;
    if (!preview || !preview.previewToken) {
      wx.showToast({ title: '请先预览影响范围', icon: 'none' });
      return;
    }
    var request = Object.assign({}, this.intervalRequest(), {
      expectedTimelineRevision: preview.timelineRevision,
      expectedPreviewToken: preview.previewToken,
    });
    this.setData({ confirmingInterval: true });
    wx.showLoading({ title: '保存适用时间', mask: true });
    var confirmPromise;
    if (this.data.intervalRecordReplacement && this.data.intervalReplacementCandidate) {
      var replacementPreview = this.data.replacementPreview;
      if (!replacementPreview || !replacementPreview.previewToken) {
        wx.hideLoading();
        this.setData({ confirmingInterval: false, intervalPreview: null });
        wx.showToast({ title: '请重新预览包装升级影响', icon: 'none' });
        return;
      }
      var replacementRequest;
      try {
        replacementRequest = Object.assign({}, this.replacementRequest(), {
          expectedTimelineRevision: replacementPreview.timelineRevision,
          expectedPreviewToken: replacementPreview.previewToken,
        });
      } catch (error) {
        wx.hideLoading();
        this.setData({ confirmingInterval: false, intervalPreview: null, replacementPreview: null });
        preparationUtil.showError(error);
        return;
      }
      confirmPromise = preparationApi.confirmFoodEffectiveIntervalWithReplacement(
        this.data.recipe.id,
        version.id,
        { recipeInterval: request, rawGoodsReplacement: replacementRequest }
      );
    } else {
      confirmPromise = preparationApi.confirmFoodEffectiveInterval(this.data.recipe.id, version.id, request);
    }
    confirmPromise
      .then(function (result) {
        if (that._pendingUsageStorageKey) {
          wx.removeStorageSync(that._pendingUsageStorageKey);
          that._pendingUsageStorageKey = null;
        }
        if (that.data.intervalReplacementCandidate) {
          wx.removeStorageSync(RECIPE_REPLACEMENT_CONTEXT_PREFIX + String(version.id));
        }
        var intervalResult = result && result.recipeInterval ? result.recipeInterval : result;
        var requestId = intervalResult && intervalResult.recalculationRequestId;
        var identity = that.identity || preparationUtil.getIdentity();
        return preparationApi.waitForDishCostRecalculation(
          requestId,
          identity.distributerId,
          30
        ).then(function (recalculation) {
          wx.hideLoading();
          that.setData({
            confirmingInterval: false,
            showIntervalEditor: false,
            intervalPreview: null,
            replacementPreview: null,
          });
          var status = String(recalculation && recalculation.status || '');
          var failed = Number(recalculation && recalculation.failedGrainCount || 0);
          if (status === 'FAILED' || status === 'COMPLETED_WITH_FAILURES') {
            wx.showModal({
              title: '成本更新未全部完成',
              content: '使用时间已保存，但有 ' + failed + ' 条成本更新失败，旧版本暂未删除。',
              showCancel: false,
            });
          } else if (recalculation && (recalculation.pollTimedOut || status === 'QUERY_FAILED')) {
            wx.showModal({
              title: '成本仍在更新',
              content: '系统尚未确认成本全部完成，旧版本暂不删除，请稍后刷新查看。',
              showCancel: false,
            });
          } else {
            var completed = Number(recalculation && recalculation.completedGrainCount || 0);
            wx.showToast({
              title: completed ? '已更新并重算' + completed + '条' : '适用时间已更新',
              icon: 'success',
            });
          }
          return that.loadVersions();
        });
      }).catch(function (error) {
        wx.hideLoading();
        that.setData({ confirmingInterval: false, intervalPreview: null });
        preparationUtil.showError(error);
      });
  },

  removeInterval: function (event) {
    var that = this;
    var intervalId = Number(event.currentTarget.dataset.intervalId);
    var interval = this.data.timeline.find(function (row) { return Number(row.id) === intervalId; });
    if (!interval) return;
    var identity = this.identity || preparationUtil.getIdentity();
    var request = {
      distributerId: identity.distributerId,
      storeDepartmentId: identity.currentStoreId,
      adjustmentReason: '移除 V' + interval._versionNo + ' 的门店适用区间',
      operatorId: identity.operatorId,
    };
    wx.showLoading({ title: '计算影响范围', mask: true });
    preparationApi.previewRemoveFoodEffectiveInterval(this.data.recipe.id, intervalId, request)
      .then(function (preview) {
        wx.hideLoading();
        wx.showModal({
          title: '移除这段适用时间？',
          content: '移除后 ' + interval._periodText + ' 将没有该配方；空档日期会进入待核算状态。',
          confirmText: '确认移除',
          confirmColor: '#d94b4b',
          success: function (result) {
            if (!result.confirm) return;
            wx.showLoading({ title: '正在移除', mask: true });
            preparationApi.confirmRemoveFoodEffectiveInterval(
              that.data.recipe.id,
              intervalId,
              Object.assign({}, request, {
                expectedTimelineRevision: preview.timelineRevision,
                expectedPreviewToken: preview.previewToken,
              })
            ).then(function () {
              wx.hideLoading();
              wx.showToast({ title: '适用时间已移除', icon: 'success' });
              return that.loadVersions();
            }).catch(function (error) {
              wx.hideLoading();
              preparationUtil.showError(error);
            });
          },
        });
      }).catch(function (error) {
        wx.hideLoading();
        preparationUtil.showError(error);
      });
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  },
});
