/**
 * 店内公告牌：人工公告 + 今日采购价格影响
 * 统一按时间倒序展示（最新在上）
 */

var api = require('../../services/api');

var PAGE_SIZE = 20;

var SKIPPED_REASON_LABELS = {
  BELOW_THRESHOLD: '未超过影响阈值',
  NO_RECIPE_LINES: '没有关联菜品配方',
  ZERO_USAGE: '配方用量为 0 或无法解析',
  NO_DISH_PRICE: '菜品售价缺失',
  UNIT_CONVERSION_UNSUPPORTED: '单位暂不支持换算',
};

var NOTE_TYPE_LABELS = {
  MANUAL: '手动记录',
  FROM_RUN: 'AI 建议',
  FROM_PIN: '图钉升级',
  FROM_SELECTION: '选中文本',
  FROM_MESSAGE: '消息记录',
};

var NOTE_TYPE_COLORS = {
  MANUAL: { bg: '#f0f4ff', color: '#4a6cf7' },
  FROM_RUN: { bg: '#e8f5e9', color: '#2e7d32' },
  FROM_PIN: { bg: '#fff3e0', color: '#e65100' },
  FROM_SELECTION: { bg: '#f3e5f5', color: '#7b1fa2' },
  FROM_MESSAGE: { bg: '#e3f2fd', color: '#1565c0' },
};

var DEFAULT_CATEGORY_STYLE = { bg: '#e8f5e9', color: '#2e7d32', icon: '•' };

Page({
  data: {
    loading: true,
    emptyReason: '',
    boardType: '',
    isManager: false,
    storeName: '',
    scopeHeaderLabel: '',
    summary: {
      noteCount: 0,
      priceChangedGoodsCount: 0,
      affectedDishCount: 0,
    },
    feedItems: [],
    navBarHeight: 0,
    showRecipeDebug: false,
  },

  onLoad: function (options) {
    var boardType = options.boardType || 'MANAGER_DAILY_BOARD';
    this.setData({
      boardType: boardType,
      isManager: boardType === 'MANAGER_DAILY_BOARD',
      navBarHeight: getApp().globalData.navBarHeight || 88,
    });
    this._loadBoard();
  },

  onPullDownRefresh: function () {
    this._loadBoard();
    wx.stopPullDownRefresh();
  },

  onRetry: function () {
    this._loadBoard();
  },

  onToggleRecipeDebug: function () {
    this.setData({ showRecipeDebug: !this.data.showRecipeDebug });
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  },

  _loadBoard: function () {
    var that = this;
    var userInfo = wx.getStorageSync('userInfo') || {};
    var userId = userInfo.gbDepartmentUserId;

    if (!userId) {
      that.setData({ loading: false, emptyReason: '未登录' });
      return;
    }

    var departmentId, distributerId;

    if (that.data.isManager) {
      var mendianInfo = wx.getStorageSync('mendianInfo');
      if (!mendianInfo) {
        that.setData({ loading: false, emptyReason: '门店信息缺失' });
        return;
      }
      departmentId = mendianInfo.gbDepartmentId;
      distributerId = mendianInfo.gbDepartmentDisId;
    } else {
      var depInfo = wx.getStorageSync('orderDepInfo');
      if (!depInfo) {
        mendianInfo = wx.getStorageSync('mendianInfo');
        if (!mendianInfo) {
          that.setData({ loading: false, emptyReason: '部门信息缺失' });
          return;
        }
        departmentId = mendianInfo.gbDepartmentId;
        distributerId = mendianInfo.gbDepartmentDisId;
      } else {
        departmentId = depInfo.gbDepartmentId;
        var mInfo = wx.getStorageSync('mendianInfo') || {};
        distributerId = depInfo.gbDepartmentDisId || mInfo.gbDepartmentDisId || userInfo.gbDuDistributerId;
      }
    }

    that.setData({ loading: true });

    var catParams = { userId: userId };
    if (distributerId) catParams.distributerId = distributerId;

    var catPromise = api.getWorkRecordCategories(catParams).catch(function () {
      return { result: { data: [] } };
    });

    var boardPromise = api.getDailyBoard({
      userId: userId,
      departmentId: departmentId,
      distributerId: distributerId,
      boardType: that.data.boardType,
      page: 1,
      pageSize: PAGE_SIZE,
    });

    Promise.all([catPromise, boardPromise])
      .then(function (results) {
        var categoryByName = _buildCategoryByName(results[0]);
        var res = results[1];
        var result = (res && res.result) || res || {};
        var data = result.data || result;

        if (!data) {
          that.setData({ loading: false, emptyReason: '暂无数据' });
          return;
        }

        var rawNotes = [];
        if (data.sections && data.sections.managerNotes && data.sections.managerNotes.items) {
          rawNotes = data.sections.managerNotes.items;
        } else if (data.managerNotes) {
          rawNotes = data.managerNotes;
        }

        var feedItems = [];
        var i;

        for (i = 0; i < rawNotes.length; i++) {
          var mapped = _mapNoteItem(rawNotes[i], i, categoryByName);
          if (mapped) feedItems.push(mapped);
        }

        if (that.data.isManager) {
          var purchaseCard = _extractPurchaseCard(data);
          var purchaseItem = _mapPurchaseFeedItem(purchaseCard, data.asOfDate);
          if (purchaseItem) feedItems.push(purchaseItem);
        }

        feedItems.sort(function (a, b) {
          return (b._sortTs || 0) - (a._sortTs || 0);
        });

        if (feedItems.length === 0) {
          that.setData({
            loading: false,
            storeName: data.storeName || '',
            scopeHeaderLabel: data.scopeHeaderLabel || data.storeName || '',
            feedItems: [],
            summary: { noteCount: 0, priceChangedGoodsCount: 0, affectedDishCount: 0 },
            emptyReason: (data.emptyState && data.emptyState.message) || '暂无公告',
          });
          return;
        }

        var apiSummary = data.summary || {};
        var summary = _buildSummary(feedItems, apiSummary);

        that.setData({
          loading: false,
          emptyReason: '',
          storeName: data.storeName || '',
          scopeHeaderLabel: data.scopeHeaderLabel || data.storeName || '',
          summary: summary,
          feedItems: feedItems,
          showRecipeDebug: false,
        });
      })
      .catch(function (err) {
        console.error('[公告牌] 加载失败', err);
        that.setData({ loading: false, emptyReason: '加载失败' });
        wx.showToast({ title: '加载失败', icon: 'none' });
      });
  },
});

function _extractPurchaseCard(data) {
  var cards = data.cards || [];
  var i;
  for (i = 0; i < cards.length; i++) {
    if ((cards[i].cardType || '') === 'MANAGER_PURCHASE_PRICE_IMPACT_CARD') {
      return cards[i];
    }
  }
  var section = data.sections && data.sections.purchasePriceImpact;
  if (section && section.payload) {
    return {
      cardType: 'MANAGER_PURCHASE_PRICE_IMPACT_CARD',
      payload: section.payload,
    };
  }
  return null;
}

function _buildCategoryByName(catRes) {
  var result = (catRes && catRes.result) || catRes || {};
  var list = result.data || result || [];
  var map = {};
  (Array.isArray(list) ? list : []).forEach(function (item) {
    var name = (item.name || item.categoryName || '').trim();
    if (!name) return;
    map[name] = {
      name: name,
      code: item.id || item.categoryId || item.code || '',
      icon: item.icon || item.emoji || DEFAULT_CATEGORY_STYLE.icon,
      bg: item.bgColor || item.backgroundColor || DEFAULT_CATEGORY_STYLE.bg,
      color: item.color || item.textColor || DEFAULT_CATEGORY_STYLE.color,
    };
  });
  return map;
}

function _resolveCategoryMeta(title, categoryByName) {
  if (!title || !categoryByName) return null;
  return categoryByName[title.trim()] || null;
}

function _resolveNoteTypeMeta(note, isAi) {
  var noteType = note.noteType || (isAi ? 'FROM_RUN' : 'MANUAL');
  var colors = NOTE_TYPE_COLORS[noteType] || NOTE_TYPE_COLORS.MANUAL;
  return {
    noteTypeLabel: NOTE_TYPE_LABELS[noteType] || NOTE_TYPE_LABELS.MANUAL,
    noteTypeBg: colors.bg,
    noteTypeColor: colors.color,
  };
}

function _mapNoteItem(note, index, categoryByName) {
  if (!note) return null;

  var type = note.announcementType || note.sourceType || 'TEXT';
  var rawTime = note.publishedAt || note.createdAt || '';
  var sortTs = _parseTs(rawTime);
  var sourceCard = note.sourceCard || null;

  if (!sourceCard && note.cardSnapshotJson) {
    try {
      var snap = typeof note.cardSnapshotJson === 'string'
        ? JSON.parse(note.cardSnapshotJson)
        : note.cardSnapshotJson;
      if (snap && snap.cardType) sourceCard = snap;
    } catch (e) {}
  }

  var oldCards = null;
  if (note.cardsSnapshotJson) {
    try {
      oldCards = typeof note.cardsSnapshotJson === 'string'
        ? JSON.parse(note.cardsSnapshotJson)
        : note.cardsSnapshotJson;
    } catch (e) {}
  }

  var isAi = type === 'AI_MESSAGE';
  var hasSourceCard = !!(sourceCard && sourceCard.cardType);
  var hasOldCards = Array.isArray(oldCards) && oldCards.length > 0;

  var sourceType = note.sourceType || '';
  var isWorkNote = sourceType === 'WORK_NOTE';
  var isWorkRecord = sourceType === 'WORK_RECORD';
  var title = note.title || (isAi ? '智能消息' : '公告');
  var category = _resolveCategoryMeta(title, categoryByName);
  var displayTitle = title;
  var showTitle = true;

  if (category && title.trim() === category.name) {
    showTitle = false;
  }

  var noteTypeMeta = isWorkNote ? _resolveNoteTypeMeta(note, isAi) : {};
  var categoryName = category ? category.name : (isWorkRecord ? title : '');
  var categoryBg = category ? category.bg : DEFAULT_CATEGORY_STYLE.bg;
  var categoryColor = category ? category.color : DEFAULT_CATEGORY_STYLE.color;
  var categoryIcon = category ? category.icon : DEFAULT_CATEGORY_STYLE.icon;

  if (isWorkRecord && category) {
    showTitle = false;
  }

  return {
    _type: 'note',
    _key: 'note-' + (note.announcementId || index),
    _sortTs: sortTs,
    timeLabel: _fmtTime(rawTime),
    title: title,
    displayTitle: displayTitle,
    _showTitle: showTitle,
    textContent: note.textContent || '',
    publisherName: note.publisherName || '',
    publishedAt: _fmtTime(rawTime),
    sourceType: sourceType,
    categoryName: categoryName,
    categoryBg: categoryBg,
    categoryColor: categoryColor,
    categoryIcon: categoryIcon,
    categoryCode: category ? category.code : '',
    noteTypeLabel: noteTypeMeta.noteTypeLabel || '',
    noteTypeBg: noteTypeMeta.noteTypeBg || '',
    noteTypeColor: noteTypeMeta.noteTypeColor || '',
    _isAi: isAi,
    _isWorkNote: isWorkNote,
    _useWorkNoteStyle: isWorkNote,
    _useWorkRecordStyle: isWorkRecord,
    _hasSourceCard: hasSourceCard,
    _sourceCardType: hasSourceCard ? sourceCard.cardType : '',
    _sourceCardPayload: hasSourceCard ? (sourceCard.payload || sourceCard.cardPayload || {}) : null,
    _sourceCardTitle: hasSourceCard ? (sourceCard.title || sourceCard.cardTitle || '') : '',
    _sourceCardSubtitle: hasSourceCard ? (sourceCard.subtitle || sourceCard.cardSubtitle || '') : '',
    _sourceItemKey: hasSourceCard ? (sourceCard.sourceItemKey || '') : '',
    _hasOldCards: hasOldCards && !hasSourceCard,
    _oldCards: oldCards,
  };
}

function _mapPurchaseFeedItem(card, asOfDate) {
  if (!card) return null;

  var payload = card.payload || {};
  var goodsRows = payload.goodsRows || [];
  var affectedDishes = payload.affectedDishes || [];
  var priceChanged = payload.priceChangedGoodsCount || goodsRows.length || 0;

  if (priceChanged <= 0 && affectedDishes.length === 0) {
    return null;
  }

  var purchaseDate = asOfDate || payload.purchaseDate || '';
  var sortTs = _parseTs(purchaseDate + 'T23:59:59');

  var mappedGoods = goodsRows.map(function (row) {
    var delta = row.unitPriceDelta;
    var deltaNum = delta != null ? Number(delta) : NaN;
    return {
      goodsName: row.goodsName || '',
      currentUnitPrice: row.currentUnitPrice != null ? row.currentUnitPrice : '',
      previousUnitPrice: row.previousUnitPrice != null ? row.previousUnitPrice : '',
      unit: row.unit || '斤',
      unitPriceDelta: _fmtDelta(delta),
      unitPriceDeltaRaw: deltaNum,
      unitPriceDeltaRate: _fmtRate(row.unitPriceDeltaRate),
      purchaserName: row.purchaserName || '',
      purchaseDate: _fmtDate(row.purchaseDate || purchaseDate),
    };
  });

  var mappedDishes = affectedDishes.map(function (dish) {
    return {
      dishName: dish.dishName || '',
      dishPrice: dish.dishPrice != null ? dish.dishPrice : '',
      recipeAmountPerPortion: dish.recipeAmountPerPortion != null ? dish.recipeAmountPerPortion : '',
      recipeAmountUnit: dish.recipeAmountUnit || '',
      normalizedUsagePerPortion: dish.normalizedUsagePerPortion != null ? dish.normalizedUsagePerPortion : '',
      normalizedUsageUnit: dish.normalizedUsageUnit || '',
      costImpactPerPortion: _fmtCostImpact(dish.costImpactPerPortion),
      costImpactPerPortionRaw: dish.costImpactPerPortion,
      grossMarginRateImpact: dish.grossMarginRateImpact != null ? dish.grossMarginRateImpact : '',
      grossMarginFloatThreshold: dish.grossMarginFloatThreshold != null ? dish.grossMarginFloatThreshold : '',
      highImpact: dish.highImpact || false,
    };
  });

  var recipeDebug = (payload.recipeDebug || []).map(function (item) {
    return {
      dishName: item.dishName || '',
      recipeAmountPerPortion: item.recipeAmountPerPortion != null ? item.recipeAmountPerPortion : '',
      recipeAmountUnit: item.recipeAmountUnit || '',
      normalizedUsagePerPortion: item.normalizedUsagePerPortion != null ? item.normalizedUsagePerPortion : '',
      normalizedUsageUnit: item.normalizedUsageUnit || '',
      costImpactPerPortion: _fmtCostImpact(item.costImpactPerPortion),
      grossMarginRateImpact: item.grossMarginRateImpact != null ? item.grossMarginRateImpact : '',
      skippedReason: item.skippedReason || '',
      skippedReasonLabel: SKIPPED_REASON_LABELS[item.skippedReason] || item.skippedReason || '',
      thresholdRate: item.thresholdRate != null ? item.thresholdRate : '',
    };
  });

  var hasGoodsRows = mappedGoods.length > 0;
  var hasAffectedDishes = mappedDishes.length > 0;
  var highImpactDishCount = payload.highImpactDishCount || 0;

  return {
    _type: 'purchase',
    _key: 'purchase-' + (purchaseDate || 'today'),
    _sortTs: sortTs,
    timeLabel: _fmtDate(purchaseDate),
    title: '采购价格影响',
    priceChangedGoodsCount: priceChanged,
    affectedDishCount: payload.affectedDishCount || mappedDishes.length,
    highImpactDishCount: highImpactDishCount,
    _summaryOnly: !hasGoodsRows && !hasAffectedDishes && priceChanged > 0,
    goodsRows: mappedGoods,
    affectedDishes: mappedDishes,
    recipeDebug: recipeDebug,
    hasGoodsRows: hasGoodsRows,
    hasAffectedDishes: hasAffectedDishes,
    hasRecipeDebug: recipeDebug.length > 0,
  };
}

function _buildSummary(feedItems, apiSummary) {
  var noteCount = 0;
  var priceChanged = 0;
  var affectedDishes = 0;
  var i;

  for (i = 0; i < feedItems.length; i++) {
    var item = feedItems[i];
    if (item._type === 'note') noteCount++;
    if (item._type === 'purchase') {
      priceChanged = item.priceChangedGoodsCount || priceChanged;
      affectedDishes = item.affectedDishCount || affectedDishes;
    }
  }

  if (apiSummary) {
    if (apiSummary.managerNoteCount != null) noteCount = apiSummary.managerNoteCount;
    if (apiSummary.purchasePriceChangedGoodsCount != null) {
      priceChanged = apiSummary.purchasePriceChangedGoodsCount;
    }
    if (apiSummary.purchasePriceAffectedDishCount != null) {
      affectedDishes = apiSummary.purchasePriceAffectedDishCount;
    }
  }

  return {
    noteCount: noteCount,
    priceChangedGoodsCount: priceChanged,
    affectedDishCount: affectedDishes,
  };
}

function _parseTs(dateStr) {
  if (!dateStr) return 0;
  var d;
  try { d = new Date(dateStr); } catch (e) { return 0; }
  var ts = d.getTime();
  return isNaN(ts) ? 0 : ts;
}

function _fmtDate(dateStr) {
  if (!dateStr) return '';
  if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
  var d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  var M = d.getMonth() + 1;
  var day = d.getDate();
  return d.getFullYear() + '-' + (M < 10 ? '0' + M : M) + '-' + (day < 10 ? '0' + day : day);
}

function _fmtTime(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  var now = new Date();
  var y = d.getFullYear();
  var M = d.getMonth() + 1;
  var day = d.getDate();
  var h = d.getHours();
  var m = d.getMinutes();
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };

  if (y === now.getFullYear() && M === now.getMonth() + 1 && day === now.getDate()) {
    return '今天 ' + pad(h) + ':' + pad(m);
  }

  var yesterday = new Date(now.getTime() - 86400000);
  if (y === yesterday.getFullYear() && M === yesterday.getMonth() + 1 && day === yesterday.getDate()) {
    return '昨天 ' + pad(h) + ':' + pad(m);
  }

  return y + '-' + pad(M) + '-' + pad(day) + ' ' + pad(h) + ':' + pad(m);
}

function _fmtDelta(val) {
  if (val == null || val === '') return '';
  var num = Number(val);
  if (isNaN(num)) return val;
  return (num >= 0 ? '+' : '') + num.toFixed(2);
}

function _fmtRate(val) {
  if (val == null || val === '') return '';
  var num = Number(val);
  if (isNaN(num)) return val;
  return (num >= 0 ? '+' : '') + num.toFixed(1) + '%';
}

function _fmtCostImpact(val) {
  if (val == null || val === '') return '';
  var num = Number(val);
  if (isNaN(num)) return val;
  return (num >= 0 ? '+' : '') + num.toFixed(3) + '元';
}
