/**
 * 采购排行卡通用配置与数据规范化
 * 仅依据 cardType + payload，不根据标题/文案猜类型
 */

var PURCHASE_RANKING_CARD_TYPES = [
  'PURCHASE_GOODS_AMOUNT_RANKING_CARD',
  'PURCHASE_GOODS_COUNT_RANKING_CARD',
  'PURCHASE_GOODS_QUANTITY_RANKING_CARD',
  'PURCHASE_STORE_AMOUNT_RANKING_CARD',
  'PURCHASE_SUPPLIER_AMOUNT_RANKING_CARD',
];

var CONFIG = {
  PURCHASE_GOODS_AMOUNT_RANKING_CARD: {
    defaultTitle: '采购金额排行',
    nameLabel: '商品名称',
    nameFields: ['goodsName', 'gbDgGoodsName', 'disGoodsName'],
    metricLabel: '采购金额（元）',
    metricFields: ['purchaseSubtotal', 'amount', 'totalAmount', 'purchaseAmount'],
    metricFormat: 'amount',
    idField: 'disGoodsId',
    supportsRowRecord: true,
    footerUnit: '项商品',
  },
  PURCHASE_GOODS_COUNT_RANKING_CARD: {
    defaultTitle: '采购次数排行',
    nameLabel: '商品名称',
    nameFields: ['goodsName', 'gbDgGoodsName', 'disGoodsName'],
    metricLabel: '采购次数',
    metricFields: ['purchaseTimes', 'count', 'purchaseCount'],
    metricFormat: 'count',
    idField: 'disGoodsId',
    supportsRowRecord: true,
    footerUnit: '项商品',
  },
  PURCHASE_GOODS_QUANTITY_RANKING_CARD: {
    defaultTitle: '采购数量排行',
    nameLabel: '商品名称',
    nameFields: ['goodsName', 'gbDgGoodsName', 'disGoodsName'],
    metricLabel: '采购数量',
    metricFields: ['purchaseQuantity', 'quantity', 'weight', 'totalWeight'],
    metricFormat: 'quantity',
    unitFields: ['unit', 'weightUnit', 'goodsUnit', 'standardName'],
    idField: 'disGoodsId',
    supportsRowRecord: true,
    footerUnit: '项商品',
  },
  PURCHASE_STORE_AMOUNT_RANKING_CARD: {
    defaultTitle: '门店采购金额排行',
    nameLabel: '门店',
    nameFields: ['storeName', 'departmentName', 'depName', 'gbDepartmentName'],
    metricLabel: '采购金额（元）',
    metricFields: ['purchaseSubtotal', 'amount', 'totalAmount', 'purchaseAmount'],
    metricFormat: 'amount',
    idField: 'departmentId',
    supportsRowRecord: false,
    footerUnit: '家门店',
  },
  PURCHASE_SUPPLIER_AMOUNT_RANKING_CARD: {
    defaultTitle: '供应商采购金额排行',
    nameLabel: '供应商',
    nameFields: ['supplierName'],
    metricLabel: '采购金额（元）',
    metricFields: ['purchaseSubtotal', 'amount', 'totalAmount', 'purchaseAmount'],
    metricFormat: 'amount',
    idField: 'supplierId',
    supportsRowRecord: false,
    footerUnit: '家供应商',
  },
};

function isPurchaseRankingCardType(cardType) {
  return PURCHASE_RANKING_CARD_TYPES.indexOf(cardType) >= 0;
}

function pickField(row, fields) {
  if (!row || !fields) return '';
  for (var i = 0; i < fields.length; i++) {
    var v = row[fields[i]];
    if (v !== undefined && v !== null && v !== '') return String(v);
  }
  return '';
}

function pickMetric(row, fields) {
  if (!row || !fields) return null;
  for (var i = 0; i < fields.length; i++) {
    var v = row[fields[i]];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

function fmtAmount(val) {
  if (val === undefined || val === null || val === '') return '—';
  var num = Number(val);
  if (isNaN(num)) return String(val);
  if (num >= 10000) return '¥' + (num / 10000).toFixed(1).replace(/\.0$/, '') + '万';
  var parts = num.toFixed(2).split('.');
  var intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return '¥' + intPart + (parts[1] === '00' ? '' : '.' + parts[1]);
}

function fmtCount(val) {
  if (val === undefined || val === null || val === '') return '—';
  var num = Number(val);
  if (isNaN(num)) return String(val);
  return String(Math.round(num));
}

function fmtQuantity(val, unit) {
  if (val === undefined || val === null || val === '') return '—';
  var num = Number(val);
  var str = isNaN(num) ? String(val) : (num % 1 === 0 ? String(num) : num.toFixed(2));
  return unit ? str + unit : str;
}

function extractRawRows(payload) {
  if (!payload) return [];
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.rankingItems)) return payload.rankingItems;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.list)) return payload.list;
  return [];
}

function normalizeRows(cardType, rawRows) {
  var cfg = CONFIG[cardType];
  if (!cfg || !rawRows || !rawRows.length) return [];

  return rawRows.map(function (row, index) {
    var rank = Number(row.rank);
    if (isNaN(rank) || rank <= 0) rank = index + 1;
    var metricVal = pickMetric(row, cfg.metricFields);
    var unit = cfg.unitFields ? pickField(row, cfg.unitFields) : '';
    var metricStr = '—';
    if (cfg.metricFormat === 'amount') metricStr = fmtAmount(metricVal);
    else if (cfg.metricFormat === 'count') metricStr = fmtCount(metricVal);
    else if (cfg.metricFormat === 'quantity') metricStr = fmtQuantity(metricVal, unit);

    var rowId = row[cfg.idField];
    return {
      rank: rank,
      name: pickField(row, cfg.nameFields) || '—',
      metricStr: metricStr,
      metricVal: metricVal,
      unit: unit,
      rowId: rowId != null ? rowId : null,
      standardName: row.standardName || '',
    };
  });
}

/**
 * 将原始 card + payload 规范为 purchase-ranking-card 所需 cardData
 */
function resolvePurchaseRankingCardData(card) {
  var cardType = card.cardType;
  var cfg = CONFIG[cardType];
  if (!cfg) return null;

  var payload = card.payload || {};
  var rawRows = extractRawRows(payload);
  var rows = normalizeRows(cardType, rawRows);
  var narrative = '';
  if (payload.summary && payload.summary.narrative) narrative = payload.summary.narrative;
  else if (payload.narrative) narrative = payload.narrative;

  return {
    cardType: cardType,
    title: card.title || payload.title || cfg.defaultTitle,
    subtitle: card.subtitle || payload.subtitle || payload.timeLabel || payload.timeDisplayText || '',
    nameLabel: payload.nameLabel || payload.metricName || cfg.nameLabel,
    metricLabel: payload.metricLabel || cfg.metricLabel,
    narrative: narrative,
    rows: rows,
    emptyReason: payload.emptyReason || (rows.length ? '' : '暂无排行数据'),
    supportsRowRecord: cfg.supportsRowRecord,
    footerUnit: cfg.footerUnit,
  };
}

module.exports = {
  PURCHASE_RANKING_CARD_TYPES: PURCHASE_RANKING_CARD_TYPES,
  CONFIG: CONFIG,
  isPurchaseRankingCardType: isPurchaseRankingCardType,
  resolvePurchaseRankingCardData: resolvePurchaseRankingCardData,
  extractRawRows: extractRawRows,
  normalizeRows: normalizeRows,
};
