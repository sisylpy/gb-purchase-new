/**
 * 从业务卡片 cardType + cardData 生成「加入店长工作记录」弹窗默认标题与内容
 * 不调用后端 preview 接口
 */
var businessRankingCardUtil = require('./businessRankingCardUtil');

function formatPrice(price) {
  var n = parseFloat(price);
  if (isNaN(n)) return price != null && price !== '' ? String(price) : '—';
  return n.toFixed(2);
}

function formatChangePercent(percent) {
  var p = parseFloat(percent);
  if (isNaN(p)) return '';
  var dir = p >= 0 ? '上涨' : '下跌';
  return dir + Math.abs(p).toFixed(1) + '%';
}

function formatBatchSource(batch) {
  if (!batch) return '—';
  var status = batch.supplierDisplayStatus || '';
  if (status === 'HAS_SUPPLIER_NAME' && batch.supplierName) {
    return batch.supplierName + '（供应商）';
  }
  if (status === 'SELF_PURCHASE') {
    return batch.purchaserName ? '自采 · ' + batch.purchaserName : '自采';
  }
  var type = batch.purchaseSourceType || '';
  if (type === 'SUPPLIER_PURCHASE' && batch.supplierName) {
    return batch.supplierName + '（供应商）';
  }
  if (type === 'SELF_PURCHASE') {
    return batch.purchaserName ? '自采 · ' + batch.purchaserName : '自采';
  }
  return batch.supplierName || batch.purchaserName || '—';
}

function findBatch(compareBatches, role) {
  if (!compareBatches || !compareBatches.length) return null;
  for (var i = 0; i < compareBatches.length; i++) {
    var b = compareBatches[i];
    if (role === 'CURRENT' && b.batchRole === 'CURRENT') return b;
    if (role === 'PREV' && (b.batchRole === 'PREVIOUS' || b.batchRole === 'PREV')) return b;
  }
  return null;
}

function parseItemKeyId(sourceItemKey, prefix) {
  if (!sourceItemKey || sourceItemKey === '__CARD__') return null;
  if (sourceItemKey.indexOf(prefix) !== 0) return null;
  return sourceItemKey.slice(prefix.length);
}

function buildPurchaseAnomalyDraft(cardData, sourceItemKey) {
  var rows = [].concat(cardData.focusRows || [], cardData.secondaryRows || []);
  var row = null;
  var disGoodsId = parseItemKeyId(sourceItemKey, 'disGoodsId:');
  if (disGoodsId) {
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].disGoodsId) === String(disGoodsId)) {
        row = rows[i];
        break;
      }
    }
  }
  if (!row) {
    row = (cardData.focusRows && cardData.focusRows[0]) || rows[0];
  }
  if (!row) {
    return {
      title: cardData.title || '采购异常',
      content: '请关注采购单价异常，建议核实录入错误、规格变化、临时涨价或采购渠道变化。',
    };
  }

  var goodsName = row.goodsName || '—';
  var unit = row.standardName || '';
  var currentBatch = findBatch(row.compareBatches, 'CURRENT');
  var prevBatch = findBatch(row.compareBatches, 'PREV');
  if (!unit && currentBatch && currentBatch.unit) unit = currentBatch.unit;

  var curPrice = formatPrice(row.currentUnitPrice);
  var prevPrice = formatPrice(row.previousUnitPrice);
  var unitSuffix = unit ? ('元/' + unit) : '元';
  var changeStr = formatChangePercent(row.priceChangePercent);

  var title = goodsName + '采购单价异常：' + curPrice + unitSuffix;
  if (changeStr) title += '，较上次' + changeStr;

  var lines = [];
  var goodsLabel = goodsName;
  if (row.standardName) goodsLabel += '（' + row.standardName + '）';
  lines.push('商品：' + goodsLabel);
  lines.push('当前单价：' + curPrice + unitSuffix);
  lines.push('上次单价：' + prevPrice + unitSuffix);
  if (changeStr) lines.push('涨跌幅：' + changeStr);

  if (currentBatch) {
    lines.push('');
    lines.push('【本次采购】');
    lines.push('采购日期：' + (currentBatch.purchaseDate || '—'));
    lines.push('数量：' + (currentBatch.quantity != null ? currentBatch.quantity : '—') + (currentBatch.unit || unit || ''));
    lines.push('金额：' + (currentBatch.amount != null ? ('¥' + currentBatch.amount) : '—'));
    lines.push('采购人/供应商：' + formatBatchSource(currentBatch));
  }
  if (prevBatch) {
    lines.push('');
    lines.push('【上次采购】');
    lines.push('采购日期：' + (prevBatch.purchaseDate || '—'));
    lines.push('数量：' + (prevBatch.quantity != null ? prevBatch.quantity : '—') + (prevBatch.unit || unit || ''));
    lines.push('金额：' + (prevBatch.amount != null ? ('¥' + prevBatch.amount) : '—'));
    lines.push('采购人/供应商：' + formatBatchSource(prevBatch));
  }

  lines.push('');
  lines.push('建议核实：录入错误、规格变化、临时涨价或采购渠道变化');

  return { title: title, content: lines.join('\n') };
}

function buildRankingDraft(cardType, cardData, sourceItemKey) {
  var cfg = businessRankingCardUtil.CONFIG[cardType];
  var title = cardData.title || (cfg && cfg.defaultTitle) || '业务排行';
  var lines = [];
  if (cardData.subtitle) lines.push('统计范围：' + cardData.subtitle);
  if (cardData.narrative) lines.push(cardData.narrative);

  var rows = cardData.rows || [];
  if (sourceItemKey && sourceItemKey !== '__CARD__') {
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].sourceItemKey === sourceItemKey) {
        var one = rows[i];
        title = (one.name || '—') + ' · ' + (cfg ? cfg.defaultTitle : title);
        lines.push('');
        lines.push('排名：第' + one.rank + '名');
        lines.push((cfg ? cfg.nameLabel : '名称') + '：' + one.name);
        lines.push((cfg ? cfg.metricLabel : '指标') + '：' + one.metricStr);
        return { title: title, content: lines.join('\n') };
      }
    }
  }

  if (rows.length) {
    lines.push('');
    lines.push('排行摘要：');
    var limit = Math.min(rows.length, 5);
    for (var j = 0; j < limit; j++) {
      var r = rows[j];
      lines.push((j + 1) + '. ' + r.name + ' — ' + r.metricStr);
    }
    if (rows.length > limit) lines.push('…共' + rows.length + (cardData.footerUnit || '项'));
  } else if (cardData.emptyReason) {
    lines.push(cardData.emptyReason);
  }

  return { title: title, content: lines.join('\n') || '请关注采购排行情况。' };
}

function buildWarehouseRiskDraft(cardData, sourceItemKey) {
  var items = cardData.riskItems || [];
  var goodsId = parseItemKeyId(sourceItemKey, 'goodsId:');
  var item = null;
  if (goodsId) {
    for (var i = 0; i < items.length; i++) {
      if (String(items[i].goodsId) === String(goodsId)) {
        item = items[i];
        break;
      }
    }
  }
  if (!item) item = items[0];

  var narrative = (cardData.summary && cardData.summary.narrative) || cardData.narrative || '';
  var title = cardData.title || '库存风险关注';
  var lines = [];
  if (narrative) lines.push(narrative);

  if (item) {
    title = (item.goodsName || '—') + ' · 库存风险';
    lines.push('');
    lines.push('商品：' + (item.goodsName || '—'));
    if (item.riskLevel) {
      var level = String(item.riskLevel).toUpperCase();
      var levelLabel = level === 'HIGH' ? '高风险' : level === 'MEDIUM' ? '中风险' : level === 'LOW' ? '低风险' : item.riskLevel;
      lines.push('风险等级：' + levelLabel);
    }
    if (item.riskReason) lines.push('风险原因：' + item.riskReason);
    if (item.restWeight != null) {
      lines.push('剩余库存：' + item.restWeight + (item.weightUnit || ''));
    }
    if (item.supportDays != null && item.supportDays !== '') {
      lines.push('预计可支撑：' + item.supportDays + '天');
    }
  } else if (cardData.emptyReason) {
    lines.push(cardData.emptyReason);
  }

  return { title: title, content: lines.join('\n') || '请关注库存风险。' };
}

function buildPurchaseBusinessAnalysisDraft(cardData) {
  var payload = cardData.payload || cardData || {};
  var ps = payload.purchaseSourceSection || {};
  var goodsName = ps.goodsName || payload.goodsName || '—';
  var title = goodsName + ' · 采购经营分析';
  var lines = [];

  var timeLabel = payload.purchaseTimeLabel || cardData.subtitle || '';
  if (timeLabel) lines.push('统计时间：' + timeLabel);
  var scopeLabel = payload.scopeLabel || '';
  if (scopeLabel) lines.push('门店：' + scopeLabel.replace('门店：', '') || scopeLabel);

  if (ps.totalPurchaseQuantity != null) {
    lines.push('采购量：' + ps.totalPurchaseQuantity);
  }
  if (ps.totalPurchaseAmount != null) {
    lines.push('采购金额：¥' + Number(ps.totalPurchaseAmount).toFixed(2));
  }

  var narrative = (payload.summary && payload.summary.narrative) || payload.narrative || '';
  if (narrative) {
    lines.push('');
    lines.push(narrative);
  }

  return { title: title, content: lines.join('\n') || '请关注该商品采购经营情况。' };
}

function buildGenericDraft(cardData, cardTitle) {
  return {
    title: cardData.title || cardTitle || '业务记录',
    content: cardData.subtitle || cardData.narrative || '请关注相关业务情况。',
  };
}

/**
 * @param {string} cardType
 * @param {object} cardData - 页面已预构建的 displayCard.cardData
 * @param {object} opts
 * @param {string} [opts.sourceItemKey='__CARD__']
 * @param {string} [opts.cardTitle]
 * @param {string} [opts.suggestedCategoryName]
 */
function buildWorkRecordDraft(cardType, cardData, opts) {
  opts = opts || {};
  var sourceItemKey = opts.sourceItemKey || '__CARD__';
  cardData = cardData || {};

  var draft;
  if (cardType === 'PURCHASE_ANOMALY_CARD') {
    draft = buildPurchaseAnomalyDraft(cardData, sourceItemKey);
  } else if (businessRankingCardUtil.isBusinessRankingCardType(cardType)) {
    draft = buildRankingDraft(cardType, cardData, sourceItemKey);
  } else if (cardType === 'WAREHOUSE_INVENTORY_RISK_LIST_CARD') {
    draft = buildWarehouseRiskDraft(cardData, sourceItemKey);
  } else if (cardType === 'PURCHASE_GOODS_BUSINESS_ANALYSIS_CARD') {
    draft = buildPurchaseBusinessAnalysisDraft(cardData);
  } else {
    draft = buildGenericDraft(cardData, opts.cardTitle);
  }

  if (opts.suggestedCategoryName) {
    draft.suggestedCategoryName = opts.suggestedCategoryName;
  }
  return draft;
}

module.exports = {
  buildWorkRecordDraft: buildWorkRecordDraft,
};
