/**
 * 库存消耗弹窗 showType ↔ saveDepGoodsStockAdjust kind
 * 与后台 GbConstants.StockReduceType 对应（前端 showType 与枚举值对齐）
 */
var SHOW_TYPE_TO_KIND = {
  1: 'produce',
  2: 'loss',
  3: 'return',
  4: 'waste',
  6: 'employee_meal',
};

function kindFromShowType(showType) {
  return SHOW_TYPE_TO_KIND[Number(showType)] || '';
}

module.exports = {
  SHOW_TYPE_TO_KIND: SHOW_TYPE_TO_KIND,
  kindFromShowType: kindFromShowType,
};
