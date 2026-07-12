function isPositiveNum(value) {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  var s = value + '';
  if (s === 'null' || s === 'undefined') {
    return false;
  }
  var n = parseFloat(value);
  return !isNaN(n) && n > 0;
}

function hasOrderStandardScale(order) {
  if (!order || order.gbDoDsStandardScale === null || order.gbDoDsStandardScale === undefined) {
    return false;
  }
  var scale = order.gbDoDsStandardScale + '';
  if (scale === '' || scale === '-1') {
    return false;
  }
  var n = parseFloat(scale);
  return !isNaN(n) && n > 0;
}

function isCartonOrderInput(item) {
  if (!item) {
    return false;
  }
  var goods = item.gbDistributerGoodsEntity;
  var cartonUnit = '';
  if (goods && goods.gbDgCartonUnit) {
    cartonUnit = goods.gbDgCartonUnit;
  } else if (item.gbDpgStandard && goods && goods.gbDgGoodsStandardname
      && item.gbDpgStandard !== goods.gbDgGoodsStandardname
      && isPositiveNum(item.gbDpgBuyScale)) {
    cartonUnit = item.gbDpgStandard;
  }
  if (!cartonUnit) {
    return false;
  }
  var orders = item.gbDepartmentOrdersEntities || [];
  var hasCartonOrder = false;
  for (var i = 0; i < orders.length; i++) {
    if (orders[i] && orders[i].gbDoStandard && String(orders[i].gbDoStandard) === String(cartonUnit)) {
      hasCartonOrder = true;
      break;
    }
  }
  if (!hasCartonOrder) {
    return false;
  }
  if (isPositiveNum(item.gbDpgBuyScale)) {
    return true;
  }
  for (var j = 0; j < orders.length; j++) {
    if (hasOrderStandardScale(orders[j])) {
      return true;
    }
  }
  return !!(goods && isPositiveNum(goods.gbDgItemsPerCarton));
}

function isScalePurGoods(item) {
  return isCartonOrderInput(item);
}

function hasPurGoodsPrice(item, isScale) {
  if (isScale) {
    if (isPositiveNum(item.gbDpgBuyScalePrice) || isPositiveNum(item.gbDpgBuyPrice)) {
      return true;
    }
  } else if (isPositiveNum(item.gbDpgBuyPrice)) {
    return true;
  }
  var orders = item.gbDepartmentOrdersEntities || [];
  for (var i = 0; i < orders.length; i++) {
    if (isPositiveNum(orders[i].gbDoScalePrice) || isPositiveNum(orders[i].gbDoPrice)) {
      return true;
    }
  }
  return false;
}

function hasPurGoodsQty(item) {
  if (isPositiveNum(item.gbDpgBuyQuantity) || isPositiveNum(item.gbDpgBuyScaleQuantity)) {
    return true;
  }
  var orders = item.gbDepartmentOrdersEntities || [];
  for (var i = 0; i < orders.length; i++) {
    if (isPositiveNum(orders[i].gbDoWeight) || isPositiveNum(orders[i].gbDoScaleWeight)) {
      return true;
    }
  }
  return false;
}

function hasPurGoodsSubtotal(item, isScale) {
  if (isPositiveNum(item.gbDpgBuySubtotal)) {
    return true;
  }
  var orders = item.gbDepartmentOrdersEntities || [];
  for (var i = 0; i < orders.length; i++) {
    if (isPositiveNum(orders[i].gbDoSubtotal)) {
      return true;
    }
  }
  if (isScale && isPositiveNum(item.gbDpgBuyScalePrice) && isPositiveNum(item.gbDpgBuyScaleQuantity)) {
    return true;
  }
  if (isPositiveNum(item.gbDpgBuyPrice) && isPositiveNum(item.gbDpgBuyQuantity)) {
    return true;
  }
  return false;
}

/**
 * 供货商编辑页：商品是否已完成（称重+单价），用于 gbDpgIsCheck 打勾。
 */
function computePurGoodsIsCheck(item) {
  if (!item || item.gbDpgStatus != 2) {
    return 0;
  }
  var orders = item.gbDepartmentOrdersEntities;
  if (orders && orders.length) {
    for (var i = 0; i < orders.length; i++) {
      if (orders[i].gbDoBuyStatus == 3) {
        return 1;
      }
    }
  }
  var isScale = isScalePurGoods(item);
  var hasPrice = hasPurGoodsPrice(item, isScale);
  var hasQty = hasPurGoodsQty(item);
  var hasSubtotal = hasPurGoodsSubtotal(item, isScale);
  return (hasPrice && hasQty && hasSubtotal) ? 1 : 0;
}

/** 调试用：返回打勾判断明细 */
function explainPurGoodsIsCheck(item) {
  if (!item || item.gbDpgStatus != 2) {
    return { isCheck: 0, reason: 'gbDpgStatus!=' + (item ? item.gbDpgStatus : 'null') };
  }
  var orders = item.gbDepartmentOrdersEntities || [];
  for (var i = 0; i < orders.length; i++) {
    if (orders[i].gbDoBuyStatus == 3) {
      return { isCheck: 1, reason: 'order.gbDoBuyStatus=3', orderId: orders[i].gbDepartmentOrdersId };
    }
  }
  var isScale = isScalePurGoods(item);
  var hasPrice = hasPurGoodsPrice(item, isScale);
  var hasQty = hasPurGoodsQty(item);
  var hasSubtotal = hasPurGoodsSubtotal(item, isScale);
  return {
    isCheck: (hasPrice && hasQty && hasSubtotal) ? 1 : 0,
    reason: 'fallback',
    isScale: isScale,
    hasPrice: hasPrice,
    hasQty: hasQty,
    hasSubtotal: hasSubtotal,
  };
}

module.exports = {
  isPositiveNum: isPositiveNum,
  computePurGoodsIsCheck: computePurGoodsIsCheck,
  explainPurGoodsIsCheck: explainPurGoodsIsCheck,
};
