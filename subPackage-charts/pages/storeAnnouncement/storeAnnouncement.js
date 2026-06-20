/**
 * 每日公告牌
 *
 * API：
 * - getDailyBoard({ userId, departmentId, distributerId, boardType, asOfDate?, page?, pageSize? })
 *   GET /store-announcements/daily-board
 *
 * boardType：
 * - MANAGER_DAILY_BOARD：管理人员公告牌（门店库存 + 采购价格影响）
 * - ORDER_STAFF_DAILY_BOARD：订货人员公告牌（当前部门库存）
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

var WASTE_RISK_TIER_LABELS = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
  waste_due: '已到废弃时间',
  waste_warning: '废弃预警',
};

var STORAGE_REMINDER_TIER = {
  exceeded: '已超期',
  warning: '即将到期',
  normal: '正常',
};

Page({
  data: {
    loading: true,
    emptyReason: '',
    boardType: '',
    isManager: false,

    // 头部
    storeName: '',
    scopeHeaderLabel: '',
    asOfDate: '',
    dateLabel: '',
    recentDates: [],

    // 摘要统计
    summary: {
      noteCount: 0,
      inventoryAlertCount: 0,
      priceChangedGoodsCount: 0,
      affectedDishCount: 0,
    },

    // 公告列表
    notes: [],

    // 库存卡片
    inventoryCards: [],

    // 采购价格影响卡
    purchasePriceCard: null,

    // 页面状态
    navBarHeight: 0,
    showRecipeDebug: false,
  },

  onLoad: function (options) {
    var boardType = options.boardType || 'MANAGER_DAILY_BOARD';
    var isManager = boardType === 'MANAGER_DAILY_BOARD';
    var asOfDate = options.asOfDate || '';

    this.setData({
      boardType: boardType,
      isManager: isManager,
      asOfDate: asOfDate,
      navBarHeight: getApp().globalData.navBarHeight || 88,
    });

    this._loadBoard(asOfDate);
  },

  onShow: function () {},

  onPullDownRefresh: function () {
    this._loadBoard(this.data.asOfDate);
    wx.stopPullDownRefresh();
  },

  // 切换日期
  onDateTap: function (e) {
    var date = e.currentTarget.dataset.date;
    if (!date || date === this.data.asOfDate) return;
    this.setData({ asOfDate: date });
    this._loadBoard(date);
  },

  // ========== 加载公告牌 ==========

  _loadBoard: function (asOfDate) {
    var that = this;
    var userInfo = wx.getStorageSync('userInfo') || {};
    var userId = userInfo.gbDepartmentUserId;

    if (!userId) {
      console.warn('[公告牌] 跳过：无 userId');
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
        var mendianInfo = wx.getStorageSync('mendianInfo');
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

    var params = {
      userId: userId,
      departmentId: departmentId,
      distributerId: distributerId,
      boardType: that.data.boardType,
      page: 1,
      pageSize: PAGE_SIZE,
    };

    if (asOfDate) {
      params.asOfDate = asOfDate;
    }

    api.getDailyBoard(params)
      .then(function (res) {
        var result = (res && res.result) || res || {};
        var data = result.data || result;

        console.log('========== [公告牌] 接口返回 ==========');
        console.log('[公告牌] storeName:', data.storeName);
        console.log('[公告牌] scopeHeaderLabel:', data.scopeHeaderLabel);
        console.log('[公告牌] summary:', JSON.stringify(data.summary));
        console.log('[公告牌] dateHeader:', JSON.stringify(data.dateHeader));
        console.log('[公告牌] sections:', JSON.stringify(data.sections));
        console.log('[公告牌] cards[]:', JSON.stringify(data.cards));
        console.log('========== [公告牌] 打印完毕 ==========');

        if (!data) {
          that.setData({ loading: false, emptyReason: '暂无数据' });
          return;
        }

        // 空状态
        if (data.inventoryEmptyReason) {
          that.setData({
            loading: false,
            storeName: data.storeName || '',
            scopeHeaderLabel: data.scopeHeaderLabel || (data.storeName + ' · ' + (data.inventoryScopeLabel || '')),
            asOfDate: data.asOfDate || '',
            dateLabel: _getDateLabel(data.dateHeader),
            recentDates: (data.dateHeader && data.dateHeader.recentDates) || [],
            emptyReason: data.inventoryEmptyReason,
          });
          return;
        }

        // —— 头部信息 ——
        var dateLabel = _getDateLabel(data.dateHeader);

        // —— 摘要 ——
        var sum = data.summary || {};
        var summary = {
          noteCount: sum.managerNoteCount || 0,
          inventoryAlertCount: sum.inventoryAlertCount || 0,
          priceChangedGoodsCount: sum.purchasePriceChangedGoodsCount || 0,
          affectedDishCount: sum.purchasePriceAffectedDishCount || 0,
        };

        // —— 公告列表（优先从 sections，回退到顶层） ——
        var rawNotes = [];
        if (data.sections && data.sections.managerNotes && data.sections.managerNotes.items) {
          rawNotes = data.sections.managerNotes.items;
        } else if (data.managerNotes) {
          rawNotes = data.managerNotes;
        }
        var notes = _mapNotes(rawNotes);

        // —— 卡片列表 ——
        var cards = data.cards || [];
        var inventoryCards = [];
        var purchasePriceCard = null;

        for (var i = 0; i < cards.length; i++) {
          var card = cards[i];
          var cardType = card.cardType || '';
          if (cardType === 'MANAGER_PURCHASE_PRICE_IMPACT_CARD') {
            purchasePriceCard = _mapPurchasePriceCard(card);
          } else {
            inventoryCards.push(_mapInventoryCard(card, i));
          }
        }

        // —— 如果没有独立的采购卡，从 summary 构造简单摘要 ——
        if (!purchasePriceCard && summary.priceChangedGoodsCount > 0) {
          purchasePriceCard = {
            _summaryOnly: true,
            title: '采购单价波动',
            priceChangedGoodsCount: summary.priceChangedGoodsCount,
            affectedDishCount: summary.affectedDishCount,
            goodsRows: [],
            affectedDishes: [],
            recipeDebug: [],
            hasGoodsRows: false,
            hasAffectedDishes: false,
            hasRecipeDebug: false,
          };
        }

        that.setData({
          loading: false,
          storeName: data.storeName || '',
          scopeHeaderLabel: data.scopeHeaderLabel || (data.storeName + ' · ' + (data.inventoryScopeLabel || '')),
          asOfDate: data.asOfDate || '',
          dateLabel: dateLabel,
          recentDates: (data.dateHeader && data.dateHeader.recentDates) || [],
          summary: summary,
          notes: notes,
          inventoryCards: inventoryCards,
          purchasePriceCard: purchasePriceCard,
        });
      })
      .catch(function (err) {
        console.error('[公告牌] 加载失败', err);
        that.setData({ loading: false, emptyReason: '加载失败' });
        wx.showToast({ title: '加载失败', icon: 'none' });
      });
  },

  // ========== 展开/折叠 recipeDebug ==========

  onToggleRecipeDebug: function () {
    this.setData({ showRecipeDebug: !this.data.showRecipeDebug });
  },

  // ========== 返回 ==========

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  },
});

// ========== 公告映射 ==========

function _mapNotes(notes) {
  if (!notes || !notes.length) return [];
  return notes.map(function (note) {
    var type = note.announcementType || note.sourceType || 'TEXT';
    var content = note.textContent || '';
    var oldCards = null;
    var sourceCard = note.sourceCard || null;

    // sourceCard：工作记录推送等场景，按 cardType + payload 渲染
    if (!sourceCard && note.cardSnapshotJson) {
      try {
        var snap = typeof note.cardSnapshotJson === 'string'
          ? JSON.parse(note.cardSnapshotJson)
          : note.cardSnapshotJson;
        if (snap && snap.cardType) {
          sourceCard = snap;
        }
      } catch (e) {
        sourceCard = null;
      }
    }

    // 尝试解析旧数据 cardsSnapshotJson（仅标题列表兼容）
    if (note.cardsSnapshotJson) {
      try {
        oldCards = typeof note.cardsSnapshotJson === 'string'
          ? JSON.parse(note.cardsSnapshotJson)
          : note.cardsSnapshotJson;
      } catch (e) {
        oldCards = null;
      }
    }

    // 单卡快照（无 cardType 时作旧列表）
    if (!sourceCard && note.cardSnapshotJson) {
      try {
        var singleSnap = typeof note.cardSnapshotJson === 'string'
          ? JSON.parse(note.cardSnapshotJson)
          : note.cardSnapshotJson;
        if (singleSnap && !singleSnap.cardType) {
          oldCards = Array.isArray(singleSnap) ? singleSnap : [singleSnap];
        }
      } catch (e) {}
    }

    var isAi = type === 'AI_MESSAGE';
    var hasOldCards = Array.isArray(oldCards) && oldCards.length > 0;
    var hasSourceCard = !!(sourceCard && sourceCard.cardType);

    return {
      title: note.title || (isAi ? '智能消息' : '公告'),
      textContent: content,
      publisherName: note.publisherName || '',
      publishedAt: _fmtTime(note.publishedAt || note.createdAt || ''),
      sourceType: note.sourceType || '',
      _isAi: isAi,
      _hasOldCards: hasOldCards && !hasSourceCard,
      _oldCards: oldCards,
      _hasSourceCard: hasSourceCard,
      _sourceCardType: hasSourceCard ? sourceCard.cardType : '',
      _sourceCardPayload: hasSourceCard ? (sourceCard.payload || sourceCard.cardPayload || {}) : null,
      _sourceCardTitle: hasSourceCard ? (sourceCard.title || sourceCard.cardTitle || '') : '',
      _sourceCardSubtitle: hasSourceCard ? (sourceCard.subtitle || sourceCard.cardSubtitle || '') : '',
      _sourceItemKey: hasSourceCard ? (sourceCard.sourceItemKey || '') : '',
    };
  });
}

// ========== 库存卡片映射 ==========

function _mapInventoryCard(card, index) {
  var cardType = card.cardType || '';
  var payload = card.payload || {};
  var riskItems = payload.riskItems || [];

  var base = {
    cardInstanceId: card.cardInstanceId || '',
    cardKey: card.cardKey || '',
    cardIndex: index,
    cardType: cardType,
    title: card.title || payload.cardTitle || '',
    subtitle: card.subtitle || '',
    scopeLabel: payload.scopeLabel || '',
    _type: '',
  };

  if (cardType === 'WAREHOUSE_WASTE_RISK_CARD') {
    base._type = 'waste';
    base.summary = payload.summary || {};
    base.wasteItems = (payload.wasteItems || []).map(function (item) {
      var tier = item.wasteRiskTier || '';
      return {
        goodsName: item.goodsName || '',
        restWeight: item.restWeight != null ? item.restWeight : '',
        weightUnit: item.weightUnit || '',
        stockInDate: _fmtDate(item.stockInDate),
        wasteDeadlineTime: _fmtDate(item.wasteDeadlineTime),
        wasteRiskTier: tier,
        wasteRiskLabel: WASTE_RISK_TIER_LABELS[tier] || tier,
        hoursUntilWaste: item.hoursUntilWaste != null ? item.hoursUntilWaste : '',
        isOverdue: item.isWasteOverdue || tier === 'waste_due',
        minuteLabel: _fmtWasteTime(item.minutesUntilWaste, item.hoursUntilWaste),
      };
    });
    base.wasteCount = base.wasteItems.length;
  } else if (cardType === 'WAREHOUSE_NEAR_EXPIRY_RISK_CARD') {
    base._type = 'storage';
    base.storageDaysLabel = payload.storageDaysLabel || '分类存放天数';
    base.cardSemantic = payload.cardSemantic || '';
    base.reminderSource = payload.reminderSource || '';
    base.summary = payload.summary || {};
    base.nearExpiryItems = riskItems.map(function (item) {
      var tier = item.storageReminderTier || '';
      return {
        goodsName: item.goodsName || '',
        restWeight: item.restWeight != null ? item.restWeight : '',
        weightUnit: item.weightUnit || '',
        stockInDate: _fmtDate(item.stockInDate),
        storageDaysLabel: item.storageDaysLabel || '',
        storageDueDate: _fmtDate(item.storageDueDate),
        daysUntilStorageDue: item.daysUntilStorageDue != null ? item.daysUntilStorageDue : '',
        storageReminderTier: tier,
        storageReminderLabel: STORAGE_REMINDER_TIER[tier] || tier,
        reminderSource: item.reminderSource || '',
        storageDays: item.storageDays != null ? item.storageDays : '',
      };
    });
    base.nearExpiryCount = base.nearExpiryItems.length;
  } else {
    // WAREHOUSE_INVENTORY_RISK_LIST_CARD
    var sectionTitle = payload.sectionTitle || payload.sectionId || '';
    base._type = 'inventory';
    base.sectionTitle = sectionTitle;
    base.riskType = payload.riskType || '';
    base.rowCount = payload.rowCount || 0;
    base.summary = payload.summary || {};
    base.timeLabel = payload.timeLabel || payload.stockSnapshotLabel || '';
    base.riskItems = riskItems.map(function (item) {
      var rt = item.riskType || payload.riskType || '';
      var label = '';
      if (rt === 'SLOW_MOVING' || rt === 'OVERSTOCK_SLOW_MOVING') label = '慢动销';
      else if (rt === 'OVERSTOCK') label = '库存积压';
      else if (rt === 'SHORTAGE_WITHIN_WEEK') label = '一周内需关注';
      else label = rt;

      return {
        goodsName: item.goodsName || '',
        riskTypeLabel: label || sectionTitle,
        restWeight: item.restWeight != null ? item.restWeight : '',
        weightUnit: item.weightUnit || '',
        supportDays: item.supportDays != null ? item.supportDays : '',
        dailyOutboundWeight: item.dailyOutboundWeight != null ? item.dailyOutboundWeight : '',
        periodOutboundWeight: item.periodOutboundWeight != null ? item.periodOutboundWeight : '',
      };
    });
    base.itemCount = base.riskItems.length;
  }

  return base;
}

// ========== 采购价格影响卡映射 ==========

function _mapPurchasePriceCard(card) {
  var payload = card.payload || {};

  var goodsRows = (payload.goodsRows || []).map(function (row) {
    return {
      goodsName: row.goodsName || '',
      currentUnitPrice: row.currentUnitPrice != null ? row.currentUnitPrice : '',
      previousUnitPrice: row.previousUnitPrice != null ? row.previousUnitPrice : '',
      unit: row.unit || '斤',
      unitPriceDelta: _fmtDelta(row.unitPriceDelta),
      unitPriceDeltaRaw: row.unitPriceDelta,
      unitPriceDeltaRate: _fmtRate(row.unitPriceDeltaRate),
      unitPriceDeltaRateRaw: row.unitPriceDeltaRate,
      purchaserName: row.purchaserName || '',
      purchaseDate: _fmtDate(row.purchaseDate),
    };
  });

  var affectedDishes = (payload.affectedDishes || []).map(function (dish) {
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

  return {
    _summaryOnly: false,
    cardInstanceId: card.cardInstanceId || '',
    title: card.title || '采购单价波动与菜品毛利影响',
    subtitle: card.subtitle || '',
    priceChangedGoodsCount: payload.priceChangedGoodsCount || goodsRows.length,
    affectedDishCount: payload.affectedDishCount || affectedDishes.length,
    highImpactDishCount: payload.highImpactDishCount || 0,
    goodsRows: goodsRows,
    affectedDishes: affectedDishes,
    recipeDebug: recipeDebug,
    hasGoodsRows: goodsRows.length > 0,
    hasAffectedDishes: affectedDishes.length > 0,
    hasRecipeDebug: recipeDebug.length > 0,
  };
}

// ========== 工具函数 ==========

function _getDateLabel(dateHeader) {
  if (!dateHeader) return '今天 · 今日数据';
  var full = dateHeader.fullTitleLabel || '';
  if (full) return full;
  var parts = [];
  if (dateHeader.relativeDayLabel) parts.push(dateHeader.relativeDayLabel);
  parts.push(dateHeader.monthDayLabel || '');
  if (dateHeader.weekdayLabel) parts.push(dateHeader.weekdayLabel);
  return parts.join(' · ') || dateHeader.asOfDate || '';
}

function _fmtDate(dateStr) {
  if (!dateStr) return '';
  if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
  var d;
  try { d = new Date(dateStr); } catch (e) { return dateStr; }
  if (isNaN(d.getTime())) return dateStr;
  var M = d.getMonth() + 1;
  var day = d.getDate();
  return d.getFullYear() + '-' + (M < 10 ? '0' + M : M) + '-' + (day < 10 ? '0' + day : day);
}

function _fmtTime(dateStr) {
  if (!dateStr) return '';
  var d;
  try { d = new Date(dateStr); } catch (e) { return dateStr; }
  if (isNaN(d.getTime())) return dateStr;

  var now = new Date();
  var y = d.getFullYear();
  var M = d.getMonth() + 1;
  var day = d.getDate();
  var h = d.getHours();
  var m = d.getMinutes();
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };

  var isToday = y === now.getFullYear() && M === now.getMonth() + 1 && day === now.getDate();
  if (isToday) return '今天 ' + pad(h) + ':' + pad(m);

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

function _fmtWasteTime(minutes, hours) {
  if (minutes != null && minutes < 0) {
    var m = Math.abs(minutes);
    if (m < 60) return '已超 ' + Math.round(m) + ' 分钟';
    var h = Math.floor(m / 60);
    var rm = Math.round(m % 60);
    if (rm === 0) return '已超 ' + h + ' 小时';
    return '已超 ' + h + ' 小时 ' + rm + ' 分钟';
  }
  return '';
}
