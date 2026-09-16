/**
 * 卡片标准化工具 — 复用自 aiChat 的 _resolveDisplayCard / _normalizeCards 逻辑
 *
 * 输入：(cards: Array<{ cardType, title, subtitle, chartType, payload }>)
 * 输出：(Array<{ cardType, cardData }>)
 *
 * 用于 aiChat 和 pinDetail 统一卡片解析。
 */

var workRecordCardTypes = require('./workRecordCardTypes');
var businessRankingCardUtil = require('./businessRankingCardUtil');
var moneyFormatter = require('./moneyFormatter');

/**
 * 解析单个 card：从 card.payload 提取 cardData
 * card 统一格式：{ cardType, title, subtitle, chartType, payload }
 * 输出：{ cardType, cardData }
 */
function resolveDisplayCard(card) {
  if (!card || !card.cardType) {
    console.log('[cardNormalizer] resolveDisplayCard ❌ card 无效或缺少 cardType');
    return null;
  }
  console.log('[cardNormalizer] resolveDisplayCard cardType:', card.cardType, 'card:', JSON.stringify(card));
  var payload = card.payload || null;

  if (card.cardType === 'MENU_PORTFOLIO_QUADRANT_CARD') {
    var cats = (payload && Array.isArray(payload.categories)) ? payload.categories : [];
    if (cats.length === 0) {
      return {
        cardType: card.cardType,
        cardData: {
          title: card.title || '菜单结构四象限',
          subtitle: '',
          totalDishCount: 0,
          categories: [],
          emptyReason: card.subtitle || (payload && payload.noDataReason) || '该时间范围内暂无菜品数据，暂不能做菜单结构分析',
        },
      };
    }
    return {
      cardType: card.cardType,
      cardData: {
        title: card.title || payload.title || '菜单结构四象限',
        subtitle: card.subtitle || payload.subtitle || '本轮菜单内相对分层（销量与实际利润中位数阈值，非绝对行业标准）',
        totalDishCount: payload.totalDishCount || 0,
        categories: cats,
      },
    };
  }

  if (card.cardType === 'DISH_COST_ANALYSIS_CARD') {
    return { cardType: card.cardType, cardData: payload };
  }

  if (card.cardType === 'DISH_SALES_CARD') {
    return { cardType: card.cardType, cardData: payload };
  }

  if (card.cardType === 'DISH_BUSINESS_OVERVIEW_CARD') {
    return {
      cardType: card.cardType,
      cardData: Object.assign({}, payload || {}, {
        title: card.title || '单菜经营概览',
        subtitle: card.subtitle || (payload && payload.timeLabel) || '',
      }),
    };
  }

  if (card.cardType === 'MENU_HIGH_SALES_LOW_MARGIN_CARD') {
    var isEmpty = payload && payload.status === 'EMPTY';
    return {
      cardType: card.cardType,
      cardData: {
        title: card.title || payload.title || '畅销低利菜',
        totalRiskDishCount: payload ? payload.totalRiskDishCount : 0,
        summary: payload ? payload.summary : '',
        dishes: payload && Array.isArray(payload.dishes) ? payload.dishes : [],
        empty: isEmpty,
      },
    };
  }

  if (card.cardType === 'MENU_ACTION_RECOMMENDATION_CARD') {
    var isEmpty2 = payload && payload.status === 'EMPTY';
    var aiContent = {
      mainSummary: payload ? (payload.mainSummary || payload.summary || '') : '',
      keyFindings: (payload && Array.isArray(payload.keyFindings)) ? payload.keyFindings : [],
      focusSections: (payload && Array.isArray(payload.focusSections)) ? payload.focusSections : [],
      nextSteps: (payload && Array.isArray(payload.nextSteps)) ? payload.nextSteps : [],
      supportingEvidence: (payload && Array.isArray(payload.supportingEvidence)) ? payload.supportingEvidence : [],
      capabilityBoundaryZh: payload ? (payload.capabilityBoundaryZh || '') : '',
    };
    return {
      cardType: card.cardType,
      cardData: {
        title: card.title || (payload && payload.title) || '菜单优化方案',
        shopName: payload ? (payload.scopeLabel || payload.shopName || '') : '',
        timeLabel: payload ? (payload.timeLabel || '') : '',
        aiContent: aiContent,
        empty: isEmpty2,
      },
    };
  }

  if (card.cardType === 'DISH_PROFIT_PRESCRIPTION_CARD') {
    var pricing = (payload && payload.pricing && typeof payload.pricing === 'object') ? payload.pricing : null;
    var margin = (payload && payload.margin && typeof payload.margin === 'object') ? payload.margin : null;
    var sp = (payload && payload.suggestedPrice && typeof payload.suggestedPrice === 'object') ? payload.suggestedPrice : null;
    var diagnosis = (payload && payload.diagnosis && typeof payload.diagnosis === 'object') ? payload.diagnosis : null;

    var _getMulti = function () {
      var args = Array.prototype.slice.call(arguments);
      var names = args[args.length - 1];
      for (var ci = 0; ci < args.length - 1; ci++) {
        var obj = args[ci];
        if (!obj) continue;
        for (var ni = 0; ni < names.length; ni++) {
          var v = obj[names[ni]];
          if (v !== undefined && v !== null) return v;
        }
      }
      return undefined;
    };

    var caps = payload && payload.capabilityLimits;
    var capabilityHints = [];
    if (caps && typeof caps === 'object' && !Array.isArray(caps)) {
      if (caps.crossStoreDishRank === 'NOT_IN_P1') capabilityHints.push('暂不支持跨门店菜品排名对比');
      if (caps.latestPurchasePrice === 'NOT_IN_P1') capabilityHints.push('暂不包含最新采购价');
      if (caps.externalMarketBenchmark === 'NOT_IN_P1') capabilityHints.push('暂不包含外部市场价格基准');
    }

    return {
      cardType: card.cardType,
      cardData: {
        title: card.title || (payload && payload.title) || '菜品价格与配方诊断',
        dishName: payload ? (payload.dishName || '') : '',
        status: payload ? (payload.status || '') : '',
        diagnosisSummary: (diagnosis && diagnosis.headlineZh) || (payload && payload.summary) || '',
        currentPrice: _getMulti(pricing, margin, payload, ['salesUnitPrice', 'listPricePerPortion', 'currentPrice', 'salePrice']),
        outboundAllocatedCostPerPortion: _getMulti(
          margin,
          pricing,
          payload,
          ['outboundAllocatedCostPerPortion']
        ),
        targetGrossMarginRate: _getMulti(sp, margin, payload, ['targetGrossMarginRate', 'grossMarginStandardTarget', 'targetMarginRate']),
        suggestedPrice: _getMulti(sp, payload, ['suggestedPricePerPortion', 'suggestedPrice', 'advisedPrice']),
        formulaId: _getMulti(sp, payload, ['formulaId', 'formula']) || '',
        theoreticalCostPerPortion: _getMulti(margin, payload, ['theoryCostPerPortion', 'theoreticalCostPerPortion']),
        costGapPerPortion: _getMulti(margin, payload, ['diffCostPerPortion', 'costGapPerPortion', 'costGap']),
        costGapRate: _getMulti(margin, payload, ['costGapRate', 'gapRate']),
        ingredientRows: (payload && Array.isArray(payload.ingredientRows)) ? payload.ingredientRows : [],
        recommendedActions: (payload && Array.isArray(payload.recommendedActions)) ? payload.recommendedActions
          : (payload && Array.isArray(payload.actions)) ? payload.actions : [],
        capabilityHints: capabilityHints,
      },
    };
  }

  if (card.cardType === 'PURCHASE_GOODS_DETAIL_CARD') {
    return {
      cardType: card.cardType,
      cardData: Object.assign({
        title: card.title || '',
        timeLabel: (payload && payload.timeLabel) || '',
        reportLabel: card.subtitle || (payload && payload.reportLabel) || '',
        scopeLabel: (payload && payload.scopeLabel) || '',
        emptyReason: (payload && payload.emptyReason) || '',
        totalPurchaseAmount: (payload && payload.totalPurchaseAmount != null) ? payload.totalPurchaseAmount : null,
        purchaseOrderCount: (payload && payload.purchaseOrderCount != null) ? payload.purchaseOrderCount : 0,
        status: (payload && payload.status) || 'OK',
        items: (payload && Array.isArray(payload.items)) ? payload.items : [],
        warnings: (payload && Array.isArray(payload.warnings)) ? payload.warnings : [],
      }, payload),
    };
  }

  if (card.cardType === 'REVENUE_REPORT_CARD') {
    return { cardType: card.cardType, cardData: payload };
  }

  if (card.cardType === 'PURCHASE_CHECK_CARD') {
    var rawItems = (payload && Array.isArray(payload.unitPriceChangedItems)) ? payload.unitPriceChangedItems : [];
    var priceItems = rawItems.map(function (item) {
      return {
        goodsName: item.goodsName || item.name || '',
        standardName: item.standardName || '',
        currentUnitPrice: item.currentUnitPrice || '',
        previousUnitPrice: item.previousUnitPrice || '',
        changePercent: item.priceChangePercent || '',
        reason: item.reason || '',
      };
    });
    return {
      cardType: card.cardType,
      cardData: Object.assign({}, payload, {
        priceAnomalyItems: priceItems,
        unitPriceChangedItems: rawItems,
      }),
    };
  }

  if (card.cardType === 'STOCK_RECONCILE_CARD') {
    var rawDiffItems = (payload && Array.isArray(payload.ingredientDiffItems)) ? payload.ingredientDiffItems : [];
    var diffItems = rawDiffItems.map(function (item) {
      return {
        foodName: item.ingredientName || item.foodName || '',
        theoryCost: item.theoryUsage || item.theoryCost || '',
        actualUsage: item.actualUsage || '',
        diffUsage: item.diffUsage || '',
        diffCostAmount: item.diffCostAmount || '',
      };
    });
    return {
      cardType: card.cardType,
      cardData: Object.assign({}, payload, {
        topDiffItems: diffItems,
        topDiffItemCount: payload.ingredientDiffItemCount || rawDiffItems.length,
        ingredientDiffItems: rawDiffItems,
      }),
    };
  }

  if (card.cardType === 'STOCK_REDUCE_SUMMARY_CARD') {
    return { cardType: card.cardType, cardData: resolveStockReduceSummaryCardData(card) };
  }

  if (card.cardType === 'REORDER_REMINDER_CARD') {
    return { cardType: card.cardType, cardData: payload };
  }

  if (card.cardType === 'DISH_SALES_RANKING_CARD') {
    var timeText = (payload && payload.timeDisplayText) || (payload && payload.timeLabel) || '';
    var baseTitle = card.title || '菜品排行';
    var combinedTitle = timeText ? timeText + '·' + baseTitle : baseTitle;
    var metricLabel = (payload && payload.metricLabel) || '';
    var subtitle = card.subtitle || (metricLabel ? '按' + metricLabel + '排序' : '');
    return { cardType: card.cardType, cardData: { title: combinedTitle, subtitle: subtitle, payload: payload || {} } };
  }

  if (card.cardType === 'DISH_PROFIT_COST_RANKING_CARD') {
    var timeText2 = (payload && payload.timeDisplayText) || (payload && payload.timeLabel) || '';
    var baseTitle2 = card.title || '菜品成本排行';
    var combinedTitle2 = timeText2 ? timeText2 + '·' + baseTitle2 : baseTitle2;
    var metricLabel2 = (payload && payload.metricLabel) || '';
    var subtitle2 = card.subtitle || (metricLabel2 ? '按' + metricLabel2 + '排序' : '');
    return { cardType: card.cardType, cardData: { title: combinedTitle2, subtitle: subtitle2, payload: payload || {} } };
  }

  if (card.cardType === 'DISH_PROFIT_RANKING_CARD') {
    var timeText3 = (payload && payload.timeDisplayText) || (payload && payload.timeLabel) || '';
    var baseTitle3 = card.title || '菜品利润排行';
    var combinedTitle3 = timeText3 ? timeText3 + '·' + baseTitle3 : baseTitle3;
    var metricLabel3 = (payload && payload.metricLabel) || '';
    var subtitle3 = card.subtitle || (metricLabel3 ? '按' + metricLabel3 + '排序' : '');
    return { cardType: card.cardType, cardData: { title: combinedTitle3, subtitle: subtitle3, payload: payload || {} } };
  }

  if (card.cardType === 'DISH_INGREDIENT_COVER_DAYS_CARD') {
    var title4 = card.title || (payload ? (payload.dishName || '') + '·配料可支撑天数' : '配料可支撑天数');
    var subtitle4 = card.subtitle || (payload ? (payload.stockSnapshotLabel || '') : '');
    return { cardType: card.cardType, cardData: Object.assign({}, payload, { title: title4, subtitle: subtitle4 }) };
  }

  if (card.cardType === 'WAREHOUSE_INVENTORY_RISK_LIST_CARD') {
    var title5 = card.title || '库存风险关注列表';
    var subtitle5 = card.subtitle || (payload ? (payload.stockSnapshotLabel || payload.timeLabel || '') : '');
    return { cardType: card.cardType, cardData: Object.assign({}, payload, { title: title5, subtitle: subtitle5 }) };
  }

  if (card.cardType === 'WAREHOUSE_STOCK_RANKING_CARD') {
    var title6 = card.title || '账面库存排行';
    var subtitle6 = card.subtitle || (payload ? (payload.stockSnapshotLabel || payload.timeLabel || '') : '');
    return { cardType: card.cardType, cardData: Object.assign({}, payload, { title: title6, subtitle: subtitle6 }) };
  }

  if (card.cardType === 'GOODS_SUPPORTED_DISH_COVER_CARD') {
    var title7 = card.title || (payload ? (payload.goodsName || '') + '·可支撑菜品' : '原料可支撑菜品');
    var subtitle7 = card.subtitle || (payload ? (payload.stockSnapshotLabel || '') : '');
    return { cardType: card.cardType, cardData: Object.assign({}, payload, { title: title7, subtitle: subtitle7 }) };
  }

  if (card.cardType === 'WAREHOUSE_NEAR_EXPIRY_RISK_CARD') {
    var title8 = card.title || '最佳库存时间风险';
    var subtitle8 = card.subtitle || (payload ? (payload.stockSnapshotLabel || payload.timeLabel || '') : '');
    return { cardType: card.cardType, cardData: Object.assign({}, payload, { title: title8, subtitle: subtitle8 }) };
  }

  if (card.cardType === 'WAREHOUSE_INVENTORY_SUPERVISION_CARD') {
    var title9 = card.title || '库存监督/诊断';
    var subtitle9 = card.subtitle || (payload ? (payload.stockSnapshotLabel || payload.timeLabel || '') : '');
    return { cardType: card.cardType, cardData: Object.assign({}, payload, { title: title9, subtitle: subtitle9 }) };
  }

  if (card.cardType === 'WAREHOUSE_WASTE_RISK_CARD') {
    var titleWaste = card.title || '保鲜废弃到期风险';
    var subtitleWaste = card.subtitle || (payload ? (payload.stockSnapshotLabel || payload.timeLabel || '') : '');
    return { cardType: card.cardType, cardData: Object.assign({}, payload, { title: titleWaste, subtitle: subtitleWaste }) };
  }

  if (card.cardType === 'WAREHOUSE_FRESHNESS_MANAGEMENT_CARD') {
    var titleFreshness = card.title || '商品保鲜管理';
    var subtitleFreshness = card.subtitle || (payload ? (payload.stockSnapshotLabel || '') : '');
    return { cardType: card.cardType, cardData: Object.assign({}, payload, { title: titleFreshness, subtitle: subtitleFreshness }) };
  }

  if (card.cardType === 'WAREHOUSE_OUT_OF_STOCK_CARD') {
    var titleOos = card.title || '缺货/断货清单';
    var subtitleOos = card.subtitle || (payload ? (payload.stockSnapshotLabel || payload.timeLabel || '') : '');
    return { cardType: card.cardType, cardData: Object.assign({}, payload, { title: titleOos, subtitle: subtitleOos }) };
  }

  if (card.cardType === 'PURCHASE_ANOMALY_CARD') {
    var anomalyKind = payload ? (payload.anomalyKind || '') : '';
    var title13 = anomalyKind ? '采购异常 · ' + anomalyKind : (card.title || '采购异常');
    return {
      cardType: card.cardType,
      cardData: {
        title: title13,
        subtitle: card.subtitle || '',
        anomalyKind: anomalyKind,
        timeLabel: payload ? (payload.timeLabel || '') : '',
        scopeLabel: payload ? (payload.scopeLabel || '') : '',
        focusRows: (payload && Array.isArray(payload.focusRows)) ? payload.focusRows : [],
        secondaryRows: (payload && Array.isArray(payload.secondaryRows)) ? payload.secondaryRows : [],
      },
    };
  }

  if (card.cardType === 'PURCHASE_GOODS_BUSINESS_ANALYSIS_CARD') {
    var sourceSection = payload && payload.purchaseSourceSection;
    var goodsName = (sourceSection && sourceSection.goodsName) || (payload && payload.goodsName) || '';
    var title10 = goodsName ? goodsName + ' · 采购经营分析' : (card.title || '');
    return { cardType: card.cardType, cardData: Object.assign({}, payload, { title: title10, subtitle: card.subtitle || '' }) };
  }

  if (card.cardType === 'PURCHASE_GOODS_ANCHOR_DETAIL_CARD') {
    var summary = payload && payload.summary;
    var goodsName2 = summary ? summary.goodsName : '';
    var title11 = goodsName2 ? goodsName2 + ' · 采购明细' : (card.title || '采购商品');
    return { cardType: card.cardType, cardData: Object.assign({}, payload, { title: title11 }) };
  }

  if (card.cardType === 'PURCHASE_SUPPLIER_GOODS_DETAIL_CARD') {
    return {
      cardType: card.cardType,
      cardData: resolvePurchaseSupplierGoodsDetailCardData(card),
    };
  }

  if (card.cardType === 'GOODS_STOCK_BATCH_DETAIL_CARD') {
    var goodsName3 = payload ? payload.goodsName : '';
    var title12 = goodsName3 ? goodsName3 + ' · 库存批次' : (card.title || '库存批次');
    return { cardType: card.cardType, cardData: Object.assign({}, payload, { title: title12, subtitle: card.subtitle || (payload && payload.stockSnapshotLabel) || '' }) };
  }

  if (businessRankingCardUtil.isBusinessRankingCardType(card.cardType)) {
    var rankingData = businessRankingCardUtil.resolveBusinessRankingCardData(card);
    return {
      cardType: card.cardType,
      cardData: rankingData,
    };
  }

  return { cardType: card.cardType, cardData: payload };
}

/**
 * 供货商采购明细卡 ViewModel：单一商品在各供货商口径下的采购明细。
 * 仅整理字段，组件不自行猜字段；行字段按后端真实结构做兼容回退取值。
 */
function resolvePurchaseSupplierGoodsDetailCardData(card) {
  var payload = card.payload || {};
  var summary = payload.summary || {};
  var goodsName = summary.goodsName || '';

  function pick(obj, keys) {
    if (!obj) return null;
    for (var i = 0; i < keys.length; i++) {
      var v = obj[keys[i]];
      if (v != null && String(v) !== '' && String(v).toLowerCase() !== 'null') return v;
    }
    return null;
  }

  var focusRows = Array.isArray(payload.focusRows) ? payload.focusRows : [];
  var secondaryRows = Array.isArray(payload.secondaryRows) ? payload.secondaryRows : [];

  var suppliers = [];
  function mapRow(row, isFocus) {
    if (!row) return;
    suppliers.push({
      key: suppliers.length,
      supplierName: pick(row, ['supplierName']) || '（未命名供应商）',
      purchaseAmount: pick(row, ['totalPurchaseAmount', 'purchaseAmount']),
      quantity: pick(row, ['buyQuantity', 'purchaseQuantity', 'goodsQuantity', 'quantity', 'purchaseWeight']),
      unitPrice: pick(row, [
        'unitPrice',
        'avgUnitPrice',
        'buyPrice',
        'avgBuyPrice',
        'averageBuyPrice',
        'weightedAvgBuyPrice',
        'purchaseAvgPrice',
        'goodsAveragePrice',
        'gbDgGoodsAveragePrice',
        'averagePrice',
      ]),
      purchaseCount: pick(row, [
        'orderCount',
        'recordCount',
        'purchaseTimes',
        'purchaseCount',
        'purchaseLineCount',
      ]),
      unit: pick(row, ['unit', 'standardUnit', 'weightUnit']),
      isFocus: !!isFocus,
    });
  }
  focusRows.forEach(function (r) {
    mapRow(r, true);
  });
  secondaryRows.forEach(function (r) {
    mapRow(r, false);
  });

  var status = payload.status || (suppliers.length ? 'OK' : 'EMPTY');
  var title = goodsName ? goodsName + ' · 供货商采购明细' : (card.title || '供货商采购明细');

  return {
    cardType: card.cardType,
    title: title,
    goodsName: goodsName,
    timeLabel: payload.timeLabel || '',
    scopeLabel: payload.scopeLabel || '',
    status: status,
    emptyReason: payload.emptyReason || '',
    suppliers: suppliers,
  };
}

/**
 * 出库/核销汇总卡 ViewModel：后端 payload → 唯一展示模型；组件只消费，不判断业务。
 * 支持 summaryType：OVERALL / PRODUCTION / WASTE / LOSS / RETURN（一张卡复用）。
 */
function resolveStockReduceSummaryCardData(card) {
  var payload = card.payload || {};
  var summaryType = payload.summaryType || '';
  var businessName = summaryTypeLabel(summaryType, payload.metricLabel);

  var availability = payload.availability
    || (payload.status === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE');
  var amount = payload.amount;
  var amountText = (amount !== undefined && amount !== null && amount !== '')
    ? moneyFormatter.formatCny(amount)
    : '';
  var hasAmount = amountText !== '';

  var timeLabel = payload.timeLabel || '';
  var scopeLabel = payload.scopeLabel || '';
  var scopeText = [timeLabel, scopeLabel].filter(Boolean).join(' · ');

  var focusRows = normalizeSummaryRows(payload.focusRows);
  var secondaryRows = normalizeSummaryRows(payload.secondaryRows);
  // 单类型卡 focusRows 仅 1 行且等于头条事实，避免与头条重复；OVERALL 为多行拆解才展示。
  var showFocus = focusRows.length > 1;

  return {
    cardType: card.cardType,
    title: businessName,
    businessName: businessName,
    summaryType: summaryType,
    metricLabel: payload.metricLabel || '',
    amountText: amountText,
    hasAmount: hasAmount,
    availability: availability,
    status: payload.status || (availability === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'OK'),
    reason: payload.reason || '',
    timeLabel: timeLabel,
    scopeLabel: scopeLabel,
    scopeText: scopeText,
    focusRows: showFocus ? focusRows : [],
    secondaryRows: secondaryRows,
    subtitle: buildSummarySubtitle(businessName, amountText, scopeText, availability, payload.reason),
  };
}

function summaryTypeLabel(summaryType, metricLabel) {
  if (summaryType === 'PRODUCTION') return '生产耗用';
  if (summaryType === 'OUTPUT') return '出品耗用';
  if (summaryType === 'WASTE') return '废弃';
  if (summaryType === 'LOSS') return '损耗';
  if (summaryType === 'RETURN') return '退货';
  if (summaryType === 'OVERALL') return '出库/核销汇总';
  return metricLabel ? String(metricLabel).replace(/金额$/, '') : '出库/核销';
}

function normalizeSummaryRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(function (row) {
    if (!row) return null;
    var amt = row.amount;
    return {
      reduceType: row.reduceType || '',
      label: row.label || '',
      amountText: (amt !== undefined && amt !== null && amt !== '')
        ? moneyFormatter.formatCny(amt)
        : '',
      metricCode: row.metricCode || '',
    };
  }).filter(Boolean);
}

function buildSummarySubtitle(businessName, amountText, scopeText, availability, reason) {
  if (availability === 'UNAVAILABLE') {
    return (businessName ? businessName + '：' : '') + (reason || '当前数据暂不可用')
      + (scopeText ? '（' + scopeText + '）' : '');
  }
  return (businessName ? businessName + '：' : '') + (amountText || '')
    + (scopeText ? '（' + scopeText + '）' : '');
}

function normalizeCards(cards) {
  if (!cards || !Array.isArray(cards)) return null;
  var out = cards.map(function (card, index) {
    var resolved = resolveDisplayCard(card);
    if (resolved) {
      resolved._cardKey = (resolved.cardType || 'card') + '_' + index;
      resolved._cardIndex = index;
      resolved.cardInstanceId = card.cardInstanceId || '';
      resolved._cardTitle = card.title || '';
      resolved._supportsWorkRecord = workRecordCardTypes.isWorkRecordCardType(resolved.cardType);
      resolved._supportsRowWorkRecord = workRecordCardTypes.supportsRowLevelWorkRecord(resolved.cardType);
      var rankingCfg = businessRankingCardUtil.CONFIG[resolved.cardType];
      resolved._allowsRowRecordUI = !!(rankingCfg && rankingCfg.supportsRowRecord)
        || resolved.cardType === 'WAREHOUSE_INVENTORY_RISK_LIST_CARD';
    }
    return resolved;
  }).filter(Boolean);
  console.log('[cardNormalizer] normalizeCards 输出:', JSON.stringify(out));
  return out;
}

module.exports = {
  resolveDisplayCard: resolveDisplayCard,
  normalizeCards: normalizeCards,
};
