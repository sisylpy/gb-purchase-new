/**
 * 业务排行卡统一配置与数据规范化。
 * 仅依据 cardType + payload，不根据标题/文案猜类型
 */

var BUSINESS_RANKING_CARD_TYPES = [
  'PURCHASE_GOODS_AMOUNT_RANKING_CARD',
  'PURCHASE_GOODS_COUNT_RANKING_CARD',
  'PURCHASE_GOODS_QUANTITY_RANKING_CARD',
  'PURCHASE_STORE_AMOUNT_RANKING_CARD',
  'PURCHASE_SUPPLIER_AMOUNT_RANKING_CARD',
  'STOCK_REDUCE_RANKING_CARD',
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
  STOCK_REDUCE_RANKING_CARD: {
    defaultTitle: '出库排行',
    nameLabel: '名称',
    nameFields: ['storeName', 'goodsName'],
    metricLabel: '出库金额（元）',
    metricFields: ['amount', 'count'],
    metricFormat: 'amount',
    supportsRowRecord: true,
    footerUnit: '项',
  },
};

function isBusinessRankingCardType(cardType) {
  return BUSINESS_RANKING_CARD_TYPES.indexOf(cardType) >= 0;
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
  // 正式协议：后端只下发 focusRows（主排）+ secondaryRows（次排），按原顺序合并。
  // 排序主权在后端，前端不重排；两者均缺失/非数组时回退空数组以保留真实 EMPTY 状态。
  // 不再兼容 rows / rankingItems / items / list 等历史别名（采购 Ranking 链路无生产者下发）。
  var focus = Array.isArray(payload.focusRows) ? payload.focusRows : [];
  var secondary = Array.isArray(payload.secondaryRows) ? payload.secondaryRows : [];
  return focus.concat(secondary);
}

function normalizeRows(cardType, rawRows, payload) {
  var cfg = CONFIG[cardType];
  if (!cfg || !rawRows || !rawRows.length) return [];

  return rawRows.map(function (row, index) {
    var rank = Number(row.rank);
    if (isNaN(rank) || rank <= 0) rank = index + 1;
    var stockCountRanking = cardType === 'STOCK_REDUCE_RANKING_CARD'
      && payload && payload.metricCode === 'OUTBOUND_COUNT';
    var metricVal = stockCountRanking ? row.count : pickMetric(row, cfg.metricFields);
    var unit = cfg.unitFields ? pickField(row, cfg.unitFields) : '';
    var metricStr = '—';
    if (stockCountRanking) metricStr = fmtCount(metricVal);
    else if (cfg.metricFormat === 'amount') metricStr = fmtAmount(metricVal);
    else if (cfg.metricFormat === 'count') metricStr = fmtCount(metricVal);
    else if (cfg.metricFormat === 'quantity') metricStr = fmtQuantity(metricVal, unit);

    var idField = cfg.idField;
    if (cardType === 'STOCK_REDUCE_RANKING_CARD') {
      idField = payload && payload.rankingEntityType === 'STORE' ? 'storeId' : 'goodsId';
    }
    var rowId = row[idField];
    var itemKeyPrefix = idField === 'storeId' ? 'storeId:'
      : idField === 'goodsId' ? 'goodsId:' : 'disGoodsId:';
    return {
      rank: rank,
      name: pickField(row, cfg.nameFields) || '—',
      metricStr: metricStr,
      metricVal: metricVal,
      unit: unit,
      rowId: rowId != null ? rowId : null,
      sourceItemKey: rowId != null ? itemKeyPrefix + rowId : '__CARD__',
      standardName: row.standardName || '',
    };
  });
}

/**
 * 将原始 card + payload 规范为 business-ranking-card 所需 ViewModel。
 */
function resolveBusinessRankingCardData(card) {
  var cardType = card.cardType;
  var cfg = CONFIG[cardType];
  if (!cfg) return null;

  var payload = card.payload || {};
  var rawRows = extractRawRows(payload);
  var rows = normalizeRows(cardType, rawRows, payload);
  var narrative = '';
  if (payload.summary && payload.summary.narrative) narrative = payload.summary.narrative;
  else if (payload.narrative) narrative = payload.narrative;

  return {
    cardType: cardType,
    title: card.title || payload.title || cfg.defaultTitle,
    subtitle: card.subtitle || payload.subtitle || payload.timeLabel || payload.timeDisplayText || '',
    nameLabel: payload.nameLabel || payload.metricName
      || (payload.rankingEntityType === 'STORE' ? '门店' : cfg.nameLabel),
    metricLabel: payload.metricLabel || cfg.metricLabel,
    narrative: narrative,
    rows: rows,
    status: payload.status || (rows.length ? 'OK' : 'EMPTY'),
    rankingScopeAvailability: payload.rankingScopeAvailability || '',
    emptyReason: payload.message || payload.emptyReason || (rows.length ? '' : '暂无排行数据'),
    supportsRowRecord: cfg.supportsRowRecord,
    footerUnit: cardType === 'STOCK_REDUCE_RANKING_CARD'
      ? (payload.rankingEntityType === 'STORE' ? '家门店' : '项商品')
      : cfg.footerUnit,
  };
}

module.exports = {
  BUSINESS_RANKING_CARD_TYPES: BUSINESS_RANKING_CARD_TYPES,
  CONFIG: CONFIG,
  isBusinessRankingCardType: isBusinessRankingCardType,
  resolveBusinessRankingCardData: resolveBusinessRankingCardData,
  extractRawRows: extractRawRows,
  normalizeRows: normalizeRows,
};
