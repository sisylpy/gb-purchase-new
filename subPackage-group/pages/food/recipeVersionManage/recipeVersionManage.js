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

function dateText(value) {
  return value ? String(value).slice(0, 10) : '';
}

function numberText(value) {
  var n = Number(value);
  if (isNaN(n)) return String(value || '');
  if (Math.abs(n - Math.round(n)) < 0.000001) return String(Math.round(n));
  return n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
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
    interval._periodText = intervalText(interval);
    return interval;
  });
}

function decorateVersions(versions, timeline, baseUrl) {
  var today = localDateText();
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
    loading: true,
    serverUrl: '',
    showIntervalEditor: false,
    intervalVersion: null,
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
          var timeline = normalizeTimeline(results[1]);
          var versions = decorateVersions(results[0], timeline, that.data.serverUrl);
          that.setData({
            loading: false,
            recipe: detail.recipe,
            versions: versions,
            timeline: timeline,
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
    var baseVersion = this.data.currentVersion
      || this.data.versions.find(function (row) { return !row._isDraft; })
      || this.data.draftVersion;
    var params = [
      'foodId=' + encodeURIComponent(String(this.data.foodId)),
      'returnToManage=1',
    ];
    if (baseVersion && baseVersion.id) params.push('baseVersionId=' + encodeURIComponent(String(baseVersion.id)));
    wx.navigateTo({ url: '../recipeVersionEdit/recipeVersionEdit?' + params.join('&') });
  },

  openIntervalEditor: function (event) {
    var versionId = Number(event.currentTarget.dataset.versionId);
    var version = this.data.versions.find(function (row) { return Number(row.id) === versionId; });
    if (!version || !version._canApply) {
      wx.showToast({ title: '只有已发布版本可以设置使用时间', icon: 'none' });
      return;
    }
    var today = localDateText();
    this.setData({
      showIntervalEditor: true,
      intervalVersion: version,
      intervalStart: today,
      intervalEnd: '',
      intervalHasEnd: false,
      intervalReason: '设置 V' + version.versionNo + ' 门店适用时间',
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
    this.setData({ intervalStart: event.detail.value, intervalPreview: null, replacementPreview: null });
  },

  onIntervalEndChange: function (event) {
    this.setData({ intervalEnd: event.detail.value, intervalPreview: null, replacementPreview: null });
  },

  onIntervalEndSwitch: function (event) {
    this.setData({
      intervalHasEnd: !!event.detail.value,
      intervalEnd: event.detail.value ? (this.data.intervalEnd || this.data.intervalStart) : '',
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
      effectiveStart: this.data.intervalStart,
      effectiveEnd: this.data.intervalHasEnd ? this.data.intervalEnd : null,
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
      .then(function () {
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
        wx.showToast({ title: '适用时间已更新', icon: 'success' });
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
