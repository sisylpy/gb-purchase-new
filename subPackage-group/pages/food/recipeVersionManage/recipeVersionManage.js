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
    interval._periodText = intervalText(interval);
    return interval;
  });
}

function decorateVersions(versions, timeline, baseUrl, businessToday) {
  var today = businessToday || localDateText();
  var rows = (versions || []).slice().sort(function (left, right) {
    return Number(right.versionNo || 0) - Number(left.versionNo || 0);
  }).map(function (version) {
    var row = Object.assign({}, version);
    row._components = (row.componentSummary || []).map(function (component, index) {
      return componentView(component, index, baseUrl);
    });
    row._intervals = (timeline || []).filter(function (interval) {
      return Number(interval.recipeVersionId) === Number(row.id);
    });
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

function adjustmentView(row) {
  var source = Object.assign({}, row || {});
  var labels = {
    SET_CURRENT: '设为当前使用',
    ADD_INTERVAL: '新增使用时间段',
    ADJUST_INTERVAL: '调整使用时间段',
    HISTORICAL_CORRECTION: '修正历史配方',
    REMOVE_INTERVAL: '移除使用时间段',
  };
  source._operationText = labels[source.businessOperation]
    || (source.actionType === 'REMOVE' ? '移除使用时间段' : '调整使用时间段');
  source._rangeText = dateText(source.affectedEffectiveStart) + ' 至 '
    + (source.affectedEffectiveEnd ? dateText(source.affectedEffectiveEnd) + '（不含）' : '以后');
  source._timeText = cleanText(source.operatedAt).replace('T', ' ').slice(0, 16);
  return source;
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
    recentAdjustments: [],
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
          var versions = decorateVersions(results[0], timeline, that.data.serverUrl, businessToday);
          that.setData({
            loading: false,
            recipe: detail.recipe,
            versions: versions,
            timeline: timeline,
            businessToday: businessToday,
            timelineItems: buildTimelineItems(timeline, versions, businessToday),
            recentAdjustments: (timelinePayload.recentAdjustments || []).map(adjustmentView),
            currentVersion: versions.find(function (row) { return row._isCurrent; }) || null,
            draftVersion: versions.find(function (row) { return row._isDraft; }) || null,
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

  editVersion: function (event) {
    var versionId = Number(event && event.currentTarget && event.currentTarget.dataset.versionId || 0);
    var params = [
      'foodId=' + encodeURIComponent(String(this.data.foodId)),
      'returnToManage=1',
    ];
    if (versionId > 0) {
      params.push('baseVersionId=' + encodeURIComponent(String(versionId)));
      params.push('manageVersionId=' + encodeURIComponent(String(versionId)));
    }
    wx.navigateTo({ url: '../recipeVersionEdit/recipeVersionEdit?' + params.join('&') });
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
        wx.hideLoading();
        that.setData({
          confirmingInterval: false,
          showIntervalEditor: false,
          intervalPreview: null,
          replacementPreview: null,
        });
        var intervalResult = result && result.recipeInterval ? result.recipeInterval : result;
        var requestId = intervalResult && intervalResult.recalculationRequestId;
        var affected = preview.costImpact && preview.costImpact.affectedSalesRecordCount;
        wx.showToast({
          title: affected ? '已更新并重算' + affected + '条' : '适用时间已更新',
          icon: 'success',
        });
        if (requestId) console.log('[配方版本] 成本重算请求', requestId);
        return that.loadVersions();
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
