/**
 * 业务卡片「加入工作记录」配置（from-business-card 主链）
 * 业务卡片操作区不得再走 work-notes 接口。
 */

/** 支持整卡加入（sourceItemKey=__CARD__） */
var WORK_RECORD_CARD_TYPES = [
  'PURCHASE_ANOMALY_CARD',
  'PURCHASE_GOODS_AMOUNT_RANKING_CARD',
  'PURCHASE_GOODS_COUNT_RANKING_CARD',
  'PURCHASE_GOODS_QUANTITY_RANKING_CARD',
  'PURCHASE_GOODS_BUSINESS_ANALYSIS_CARD',
  'WAREHOUSE_INVENTORY_RISK_LIST_CARD',
  'PURCHASE_STORE_AMOUNT_RANKING_CARD',
  'PURCHASE_SUPPLIER_AMOUNT_RANKING_CARD',
];

/** 后端明确支持行级 sourceItemKey 的卡（如 goodsId: / disGoodsId:） */
var ROW_LEVEL_WORK_RECORD_CARD_TYPES = [
  'WAREHOUSE_INVENTORY_RISK_LIST_CARD',
  'PURCHASE_GOODS_AMOUNT_RANKING_CARD',
  'PURCHASE_GOODS_COUNT_RANKING_CARD',
  'PURCHASE_GOODS_QUANTITY_RANKING_CARD',
  'PURCHASE_STORE_AMOUNT_RANKING_CARD',
  'PURCHASE_SUPPLIER_AMOUNT_RANKING_CARD',
];

function isWorkRecordCardType(cardType) {
  return WORK_RECORD_CARD_TYPES.indexOf(cardType) >= 0;
}

function supportsRowLevelWorkRecord(cardType) {
  return ROW_LEVEL_WORK_RECORD_CARD_TYPES.indexOf(cardType) >= 0;
}

/**
 * 规范化 sourceItemKey：默认 __CARD__，禁止把 cardKey（如 PURCHASE_ANOMALY_CARD_0）传给后端
 */
function sanitizeSourceItemKey(itemKey) {
  if (!itemKey || typeof itemKey !== 'string') return '__CARD__';
  if (/^[A-Z][A-Z0-9_]*_\d+$/.test(itemKey)) return '__CARD__';
  return itemKey;
}

/**
 * 根据卡类型与触发来源决定最终 sourceItemKey
 * @param {string} cardType
 * @param {string} rawItemKey - 事件传入的 itemKey
 * @param {boolean} fromRowTrigger - 是否来自组件行级按钮（detail.itemKey 且非 __CARD__）
 */
function resolveSourceItemKey(cardType, rawItemKey, fromRowTrigger) {
  var key = sanitizeSourceItemKey(rawItemKey || '__CARD__');
  if (fromRowTrigger && supportsRowLevelWorkRecord(cardType) && key !== '__CARD__') {
    return key;
  }
  return '__CARD__';
}

module.exports = {
  WORK_RECORD_CARD_TYPES: WORK_RECORD_CARD_TYPES,
  ROW_LEVEL_WORK_RECORD_CARD_TYPES: ROW_LEVEL_WORK_RECORD_CARD_TYPES,
  isWorkRecordCardType: isWorkRecordCardType,
  supportsRowLevelWorkRecord: supportsRowLevelWorkRecord,
  sanitizeSourceItemKey: sanitizeSourceItemKey,
  resolveSourceItemKey: resolveSourceItemKey,
};
