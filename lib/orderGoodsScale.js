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

function isPositive(value) {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  var n = parseFloat(value);
  return !isNaN(n) && n > 0;
}

function isScalePurGoods(item) {
  return isCartonOrderInput(item);
}

function resolveCartonUnit(item) {
  if (!item) {
    return '';
  }
  var entity = item.gbDistributerGoodsEntity;
  if (entity && entity.gbDgCartonUnit) {
    return entity.gbDgCartonUnit;
  }
  var baseUnit = entity && entity.gbDgGoodsStandardname;
  // 新采购行尚未回写 gbDpgBuyScale 时，订单本身已经保存了“箱”及换算系数。
  // 必须先从订单识别大包装，否则会因拿不到 cartonUnit 而错误退回基础单位录入。
  var orders = item.gbDepartmentOrdersEntities ||
    (entity && entity.gbDepartmentOrdersEntities) || [];
  for (var i = 0; i < orders.length; i++) {
    var order = orders[i];
    if (hasOrderStandardScale(order) && order.gbDoStandard &&
      (!baseUnit || String(order.gbDoStandard) !== String(baseUnit))) {
      return order.gbDoStandard;
    }
  }
  // gbDpgStandard 仅在有有效换算系数时表示大包装（如 24瓶/箱），不能把「颗」等订货单位当大包装
  if (item.gbDpgStandard && item.gbDpgStandard !== baseUnit && isPositive(item.gbDpgBuyScale)) {
    return item.gbDpgStandard;
  }
  return '';
}

/** 订货单位为大包装（如箱），按箱录入单价和数量 */
function isCartonOrderInput(item, orders) {
  if (!item) {
    return false;
  }
  var entity = item.gbDistributerGoodsEntity;
  var cartonUnit = resolveCartonUnit(item);
  if (!cartonUnit) {
    return false;
  }
  var list = orders;
  if (!list || !list.length) {
    list = item.gbDepartmentOrdersEntities || [];
  }
  var hasCartonOrder = false;
  for (var i = 0; i < list.length; i++) {
    var o = list[i];
    if (!o) {
      continue;
    }
    if (o.gbDoStandard && String(o.gbDoStandard) === String(cartonUnit)) {
      hasCartonOrder = true;
      break;
    }
  }
  if (!hasCartonOrder) {
    return false;
  }
  if (isPositive(item.gbDpgBuyScale)) {
    return true;
  }
  for (var j = 0; j < list.length; j++) {
    if (hasOrderStandardScale(list[j])) {
      return true;
    }
  }
  return !!(entity && isPositive(entity.gbDgItemsPerCarton));
}

function resolveScaleFactor(item, order) {
  var factor = resolveCartonFactor(order, item);
  if (factor > 0) {
    return factor;
  }
  if (item && item.gbDpgBuyScale !== null && item.gbDpgBuyScale !== '-1' && parseFloat(item.gbDpgBuyScale) > 0) {
    return parseFloat(item.gbDpgBuyScale);
  }
  return 0;
}

function resolveCartonFactor(order, item) {
  if (hasOrderStandardScale(order)) {
    return parseFloat(order.gbDoDsStandardScale);
  }
  if (!item || !isPositive(item.gbDpgBuyScale)) {
    return 0;
  }
  var entity = item.gbDistributerGoodsEntity;
  var cartonUnit = resolveCartonUnit(item);
  if (!cartonUnit || !order || !order.gbDoStandard) {
    return 0;
  }
  if (String(order.gbDoStandard) !== String(cartonUnit)) {
    return 0;
  }
  return parseFloat(item.gbDpgBuyScale);
}

/**
 * 大包装数量 ↔ 基础单位数量互推。
 */
function resolveOrderScaleWeights(order, item) {
  var factor = resolveCartonFactor(order, item);
  if (factor > 0) {
    var scaleWeight = order.gbDoScaleWeight;
    var baseWeight = order.gbDoWeight;

    if (isPositive(scaleWeight)) {
      if (!isPositive(baseWeight)) {
        baseWeight = (parseFloat(scaleWeight) * factor).toFixed(1);
      }
      return {
        gbDoScaleWeight: String(scaleWeight),
        gbDoWeight: String(baseWeight),
      };
    }
    if (isPositive(baseWeight)) {
      return {
        gbDoScaleWeight: (parseFloat(baseWeight) / factor).toFixed(1),
        gbDoWeight: String(baseWeight),
      };
    }
    if (isPositive(order.gbDoQuantity)) {
      scaleWeight = String(order.gbDoQuantity);
      return {
        gbDoScaleWeight: scaleWeight,
        gbDoWeight: (parseFloat(scaleWeight) * factor).toFixed(1),
      };
    }
    return {
      gbDoScaleWeight: scaleWeight,
      gbDoWeight: baseWeight,
    };
  }
  return {
    gbDoScaleWeight: order.gbDoScaleWeight,
    gbDoWeight: order.gbDoWeight,
  };
}

/**
 * 大包装单价 ÷ 系数 → 基础单位单价，保留 2 位小数。
 */
function formatConvertedUnitPrice(scalePrice, factor) {
  if (!isPositive(scalePrice) || !factor || isNaN(factor) || factor <= 0) {
    return '';
  }
  return (parseFloat(scalePrice) / factor).toFixed(2);
}

/**
 * 历史基准单价 × 系数 → 大包装单价，保留 2 位小数。
 */
function formatScalePriceFromBasePrice(basePrice, factor) {
  if (!isPositive(basePrice) || !factor || isNaN(factor) || factor <= 0) {
    return '';
  }
  return (parseFloat(basePrice) * factor).toFixed(2);
}

/**
 * 大包装单价 → 订单 gbDoScalePrice / gbDoPrice / 小计。
 */
function applyScalePriceToOrder(order, item, scalePrice) {
  if (!isPositive(scalePrice)) {
    return null;
  }
  var factor = resolveCartonFactor(order, item);
  if (!factor || factor <= 0) {
    return null;
  }
  var weights = resolveOrderScaleWeights(order, item);
  var scalePriceStr = String(scalePrice).trim();
  var sp = parseFloat(scalePriceStr);
  var result = {
    gbDoScalePrice: scalePriceStr,
    gbDoPrice: formatConvertedUnitPrice(scalePriceStr, factor),
    gbDoScaleWeight: weights.gbDoScaleWeight,
    gbDoWeight: weights.gbDoWeight,
  };
  if (isPositive(weights.gbDoScaleWeight)) {
    result.gbDoSubtotal = (sp * parseFloat(weights.gbDoScaleWeight)).toFixed(2);
  }
  return result;
}

function syncOrderWeightFromScale(order, scaleWeight, item) {
  if (scaleWeight === null || scaleWeight === undefined || scaleWeight === '') {
    return null;
  }
  var factor = 0;
  if (item) {
    factor = resolveCartonFactor(order, item);
  } else if (hasOrderStandardScale(order)) {
    factor = parseFloat(order.gbDoDsStandardScale);
  }
  if (!factor || factor <= 0) {
    return null;
  }
  var sw = parseFloat(scaleWeight);
  if (isNaN(sw) || sw <= 0) {
    return null;
  }
  return (sw * factor).toFixed(1);
}

function isScaleWeightInput(order, item) {
  if (!order) {
    return false;
  }
  if (hasOrderStandardScale(order)) {
    return true;
  }
  if (!item) {
    return false;
  }
  return resolveCartonFactor(order, item) > 0;
}

function setupScalePackFields(item, orders) {
  if (!item || !orders || !orders.length) {
    return 0;
  }
  for (var i = 0; i < orders.length; i++) {
    if (hasOrderStandardScale(orders[i])) {
      item.gbDpgBuyScale = String(orders[i].gbDoDsStandardScale);
      item.gbDpgStandard = orders[i].gbDoStandard;
      return parseFloat(orders[i].gbDoDsStandardScale);
    }
  }
  var entity = item.gbDistributerGoodsEntity;
  var cartonUnit = entity && entity.gbDgCartonUnit;
  var factor = entity && entity.gbDgItemsPerCarton ? parseFloat(entity.gbDgItemsPerCarton) : 0;
  if (cartonUnit && !isNaN(factor) && factor > 0) {
    for (var j = 0; j < orders.length; j++) {
      if (orders[j] && orders[j].gbDoStandard && String(orders[j].gbDoStandard) === String(cartonUnit)) {
        item.gbDpgStandard = cartonUnit;
        item.gbDpgBuyScale = String(factor);
        return factor;
      }
    }
  }
  if (isPositive(item.gbDpgBuyScale)) {
    return parseFloat(item.gbDpgBuyScale);
  }
  return 0;
}

function initOrderScaleWeights(order, item) {
  var weights = resolveOrderScaleWeights(order, item);
  if (weights.gbDoScaleWeight) {
    order.gbDoScaleWeight = weights.gbDoScaleWeight;
  }
  if (weights.gbDoWeight) {
    order.gbDoWeight = weights.gbDoWeight;
  }
}

function applyScalePriceToOrderFields(order, item, scalePrice) {
  initOrderScaleWeights(order, item);
  if (!isPositive(scalePrice)) {
    order.gbDoScalePrice = '';
    order.gbDoPrice = '';
    order.gbDoSubtotal = '';
    return;
  }
  var applied = applyScalePriceToOrder(order, item, scalePrice);
  if (!applied) {
    return;
  }
  order.gbDoScalePrice = applied.gbDoScalePrice;
  order.gbDoPrice = applied.gbDoPrice;
  order.gbDoSubtotal = applied.gbDoSubtotal || '';
  if (applied.gbDoScaleWeight) {
    order.gbDoScaleWeight = applied.gbDoScaleWeight;
  }
  if (applied.gbDoWeight) {
    order.gbDoWeight = applied.gbDoWeight;
  }
}

/** 采购行大包装总数量：优先 gbDpgBuyScaleQuantity，否则累加订单 gbDoScaleWeight。 */
function resolvePurGoodsScaleQuantity(item) {
  if (!item) {
    return 0;
  }
  if (isPositive(item.gbDpgBuyScaleQuantity)) {
    return parseFloat(item.gbDpgBuyScaleQuantity);
  }
  var orders = item.gbDepartmentOrdersEntities || [];
  var total = 0;
  var hasScaleWeight = false;
  for (var i = 0; i < orders.length; i++) {
    if (isPositive(orders[i].gbDoScaleWeight)) {
      total += parseFloat(orders[i].gbDoScaleWeight);
      hasScaleWeight = true;
    }
  }
  if (hasScaleWeight) {
    return total;
  }
  var factor = resolveScaleFactor(item, orders[0]);
  if (isPositive(item.gbDpgBuyQuantity) && factor > 0) {
    return parseFloat(item.gbDpgBuyQuantity) / factor;
  }
  return 0;
}

/** 箱规采购行小计 = 箱价 × 箱数。 */
function computeScalePurGoodsSubtotal(item) {
  if (!item || !isScalePurGoods(item) || !isPositive(item.gbDpgBuyScalePrice)) {
    return '';
  }
  var scaleQty = resolvePurGoodsScaleQuantity(item);
  if (!scaleQty || scaleQty <= 0) {
    return '';
  }
  return (parseFloat(item.gbDpgBuyScalePrice) * scaleQty).toFixed(2);
}

function normalizeUnit(unit) {
  if (unit == null || unit === undefined) {
    return '';
  }
  return (unit + '').trim();
}

/** 订货单位是否与商品小规格或大包装规格完全一致 */
function orderUnitMatchesProductSpec(order, item) {
  if (!order || !item || !order.gbDoStandard) {
    return false;
  }
  var goods = item.gbDistributerGoodsEntity;
  if (!goods) {
    return false;
  }
  var orderStd = normalizeUnit(order.gbDoStandard);
  var baseUnit = normalizeUnit(goods.gbDgGoodsStandardname);
  if (baseUnit && orderStd === baseUnit) {
    return true;
  }
  var cartonUnit = normalizeUnit(resolveCartonUnit(item));
  if (cartonUnit && orderStd === cartonUnit) {
    return true;
  }
  return false;
}

/** 是否可将订货数量默认带出为出库重量 */
function canDefaultOutWeightFromOrder(order, item) {
  return orderUnitMatchesProductSpec(order, item);
}

/** 出库重量是否疑似误把订货数量当重量（单位不一致且数值相同） */
function isStaleOrderQtyAsWeight(order, item) {
  if (!order || !item || canDefaultOutWeightFromOrder(order, item)) {
    return false;
  }
  if (!isPositive(order.gbDoQuantity)) {
    return false;
  }
  var q = parseFloat(order.gbDoQuantity);
  if (isPositive(order.gbDoWeight)) {
    var w = parseFloat(order.gbDoWeight);
    if (!isNaN(w) && Math.abs(w - q) < 0.0001) {
      return true;
    }
  }
  if (isPositive(order.gbDoScaleWeight)) {
    var sw = parseFloat(order.gbDoScaleWeight);
    if (!isNaN(sw) && Math.abs(sw - q) < 0.0001) {
      return true;
    }
  }
  return false;
}

/** 累加订单行 gbDoWeight（基础计量单位，如斤） */
function sumOrderBaseWeight(item) {
  var orders = item && item.gbDepartmentOrdersEntities ? item.gbDepartmentOrdersEntities : [];
  var total = 0;
  var hasWeight = false;
  for (var i = 0; i < orders.length; i++) {
    if (isPositive(orders[i].gbDoWeight)) {
      total += parseFloat(orders[i].gbDoWeight);
      hasWeight = true;
    }
  }
  return { total: total, hasWeight: hasWeight };
}

/** 清除误把订货数量写入出库重量的订单行 */
function clearStaleOrderWeights(item) {
  if (!item) {
    return item;
  }
  var orders = item.gbDepartmentOrdersEntities || [];
  for (var i = 0; i < orders.length; i++) {
    if (isStaleOrderQtyAsWeight(orders[i], item)) {
      orders[i].gbDoWeight = '';
      orders[i].gbDoScaleWeight = '';
    }
  }
  return item;
}

/** 累加订单行订货数量 gbDoQuantity */
function sumOrderQty(item) {
  var orders = item && item.gbDepartmentOrdersEntities ? item.gbDepartmentOrdersEntities : [];
  var total = 0;
  var hasQty = false;
  for (var i = 0; i < orders.length; i++) {
    if (isPositive(orders[i].gbDoQuantity)) {
      total += parseFloat(orders[i].gbDoQuantity);
      hasQty = true;
    }
  }
  if (!hasQty) {
    return { total: 0, hasQty: false };
  }
  return { total: total, hasQty: true };
}

/** 采购行 gbDpgBuyQuantity 是否误把订货数当称重数（单位不一致且无实际称重） */
function isStalePurGoodsBuyQty(item) {
  if (!item || isScalePurGoods(item) || !isPositive(item.gbDpgBuyQuantity)) {
    return false;
  }
  if (sumOrderBaseWeight(item).hasWeight) {
    return false;
  }
  var orders = item.gbDepartmentOrdersEntities || [];
  if (!orders.length) {
    return false;
  }
  var goods = item.gbDistributerGoodsEntity;
  var baseUnit = goods ? normalizeUnit(goods.gbDgGoodsStandardname) : '';
  var orderQtySum = 0;
  var hasOrderQty = false;
  var allNonBaseUnit = true;
  for (var i = 0; i < orders.length; i++) {
    var o = orders[i];
    if (baseUnit && normalizeUnit(o.gbDoStandard) === baseUnit) {
      allNonBaseUnit = false;
      break;
    }
    if (isPositive(o.gbDoQuantity)) {
      orderQtySum += parseFloat(o.gbDoQuantity);
      hasOrderQty = true;
    }
  }
  if (!allNonBaseUnit || !hasOrderQty) {
    return false;
  }
  var buyQty = parseFloat(item.gbDpgBuyQuantity);
  return !isNaN(buyQty) && Math.abs(buyQty - orderQtySum) < 0.0001;
}

/** 非箱规：用订单 gbDoWeight 合计回写采购行 gbDpgBuyQuantity */
function syncPurGoodsQtyFromOrders(item) {
  if (!item) {
    return item;
  }
  clearStaleOrderWeights(item);
  if (isStalePurGoodsBuyQty(item)) {
    item.gbDpgBuyQuantity = '';
  }
  if (isScalePurGoods(item)) {
    syncPurGoodsScaleTotals(item);
    return item;
  }
  var sum = sumOrderBaseWeight(item);
  if (sum.hasWeight) {
    item.gbDpgBuyQuantity = sum.total === Math.floor(sum.total)
      ? String(sum.total)
      : sum.total.toFixed(1);
  }
  return item;
}

/** 同步采购行 gbDpgBuyScaleQuantity / gbDpgBuySubtotal（箱规）。 */
function syncPurGoodsScaleTotals(item) {
  if (!item || !isScalePurGoods(item)) {
    return item;
  }
  var scaleQty = resolvePurGoodsScaleQuantity(item);
  if (scaleQty > 0) {
    var qtyStr = scaleQty === Math.floor(scaleQty) ? String(scaleQty) : scaleQty.toFixed(1);
    item.gbDpgBuyScaleQuantity = qtyStr;
  }
  var subtotal = computeScalePurGoodsSubtotal(item);
  if (subtotal && !isPositive(item.gbDpgBuySubtotal)) {
    item.gbDpgBuySubtotal = subtotal;
  }
  return item;
}

module.exports = {
  hasOrderStandardScale: hasOrderStandardScale,
  isPositive: isPositive,
  isScalePurGoods: isScalePurGoods,
  isCartonOrderInput: isCartonOrderInput,
  resolveCartonUnit: resolveCartonUnit,
  resolveScaleFactor: resolveScaleFactor,
  resolveOrderScaleWeights: resolveOrderScaleWeights,
  formatConvertedUnitPrice: formatConvertedUnitPrice,
  formatScalePriceFromBasePrice: formatScalePriceFromBasePrice,
  applyScalePriceToOrder: applyScalePriceToOrder,
  syncOrderWeightFromScale: syncOrderWeightFromScale,
  isScaleWeightInput: isScaleWeightInput,
  setupScalePackFields: setupScalePackFields,
  initOrderScaleWeights: initOrderScaleWeights,
  applyScalePriceToOrderFields: applyScalePriceToOrderFields,
  resolvePurGoodsScaleQuantity: resolvePurGoodsScaleQuantity,
  computeScalePurGoodsSubtotal: computeScalePurGoodsSubtotal,
  syncPurGoodsScaleTotals: syncPurGoodsScaleTotals,
  syncPurGoodsQtyFromOrders: syncPurGoodsQtyFromOrders,
  sumOrderBaseWeight: sumOrderBaseWeight,
  normalizeUnit: normalizeUnit,
  orderUnitMatchesProductSpec: orderUnitMatchesProductSpec,
  canDefaultOutWeightFromOrder: canDefaultOutWeightFromOrder,
  isStaleOrderQtyAsWeight: isStaleOrderQtyAsWeight,
  clearStaleOrderWeights: clearStaleOrderWeights,
};
