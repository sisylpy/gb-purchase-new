/**
 * 平台购物车本地存储 + 行级价格展示（与后端 PlatformLineAmountConfirmService 对齐的前端近似）
 */
var priceUtil = require('../../utils/priceUtil');

var STORAGE_KEY = 'platformCartItems';
var TOKEN_KEY = 'platformCartSubmitTokens';
var DEFAULT_MARKET_ID = 1;

function genUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0;
    var v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getBuyerContext() {
  var disInfo = wx.getStorageSync('disInfo') || {};
  var mendianInfo = wx.getStorageSync('mendianInfo') || {};
  var userInfo = wx.getStorageSync('userInfo') || {};
  var orderDepInfo = wx.getStorageSync('orderDepInfo') || {};
  var gbDepartmentId = null;
  var gbDepartmentFatherId = null;

  if (orderDepInfo && orderDepInfo.gbDepartmentId) {
    gbDepartmentId = orderDepInfo.gbDepartmentId;
    gbDepartmentFatherId = orderDepInfo.gbDepartmentFatherId != null
      ? orderDepInfo.gbDepartmentFatherId
      : mendianInfo.gbDepartmentId;
  } else if (userInfo && userInfo.gbDuDepartmentId) {
    gbDepartmentId = userInfo.gbDuDepartmentId;
    gbDepartmentFatherId = userInfo.gbDuDepartmentFatherId != null
      ? userInfo.gbDuDepartmentFatherId
      : userInfo.gbDuDepartmentId;
  } else {
    var subDeps = mendianInfo.gbDepartmentEntityList || [];
    if (subDeps.length === 1) {
      gbDepartmentId = subDeps[0].gbDepartmentId;
    }
    if (!gbDepartmentId && mendianInfo.gbDepartmentId) {
      gbDepartmentId = mendianInfo.gbDepartmentId;
    }
    gbDepartmentFatherId = mendianInfo.gbDepartmentId || gbDepartmentId;
  }

  return {
    marketId: wx.getStorageSync('platformMarketId') || DEFAULT_MARKET_ID,
    gbDistributerId: disInfo.gbDistributerId || null,
    gbDepartmentId: gbDepartmentId,
    gbDepartmentFatherId: gbDepartmentFatherId,
    gbOrderUserId: userInfo.gbDepartmentUserId || null,
    openId: userInfo.gbDuWxOpenId || ''
  };
}

function resolveUnitPrice(goods, standard, level) {
  level = level || 1;
  var price = goods.nxDgWillPrice || goods.nxDgWillPriceOne || '';
  var priceUnit = goods.nxDgGoodsStandardname || '';
  if (String(level) === '2' && goods.nxDgWillPriceTwo && priceUtil.isValidDisplayPrice(goods.nxDgWillPriceTwo)) {
    price = goods.nxDgWillPriceTwo;
    priceUnit = goods.nxDgWillPriceTwoStandard || priceUnit;
  }
  return { price: price, priceUnit: priceUnit };
}

function isLineConfirmable(goods, quantity, standard, level) {
  var qty = Number(quantity);
  if (!quantity || isNaN(qty) || qty <= 0) return false;
  var resolved = resolveUnitPrice(goods, standard, level);
  if (!priceUtil.isValidDisplayPrice(resolved.price)) return false;
  return String(standard) === String(resolved.priceUnit);
}

function calcLineSubtotal(goods, quantity, standard, level) {
  if (!isLineConfirmable(goods, quantity, standard, level)) return null;
  var resolved = resolveUnitPrice(goods, standard, level);
  return (Number(quantity) * Number(resolved.price)).toFixed(2);
}

function enrichLine(goods, line) {
  var resolved = resolveUnitPrice(goods, line.standard, line.level);
  var confirmable = isLineConfirmable(goods, line.quantity, line.standard, line.level);
  line.referencePrice = priceUtil.isValidDisplayPrice(resolved.price) ? String(resolved.price) : '';
  line.pricingUnit = resolved.priceUnit;
  line.priceConfirmStatus = confirmable ? 'CONFIRMED' : 'PENDING';
  line.lineSubtotal = confirmable ? calcLineSubtotal(goods, line.quantity, line.standard, line.level) : null;
  line.referencePriceText = priceUtil.formatReferencePrice(resolved.price, resolved.priceUnit);
  line.subtotalText = confirmable && line.lineSubtotal ? ('¥' + line.lineSubtotal) : '—';
  return line;
}

function loadItems() {
  var raw = wx.getStorageSync(STORAGE_KEY);
  return Array.isArray(raw) ? raw : [];
}

function saveItems(items) {
  wx.setStorageSync(STORAGE_KEY, items);
}

function lineKey(nxDistributerGoodsId, standard) {
  return nxDistributerGoodsId + '|' + standard;
}

function getSubmitToken(nxDistributerId) {
  var tokens = wx.getStorageSync(TOKEN_KEY) || {};
  if (!tokens[nxDistributerId]) {
    tokens[nxDistributerId] = genUuid();
    wx.setStorageSync(TOKEN_KEY, tokens);
  }
  return tokens[nxDistributerId];
}

function clearSubmitToken(nxDistributerId) {
  var tokens = wx.getStorageSync(TOKEN_KEY) || {};
  delete tokens[nxDistributerId];
  wx.setStorageSync(TOKEN_KEY, tokens);
}

function addOrUpdateLine(params) {
  var goods = params.goods;
  var nxDistributerId = params.nxDistributerId;
  var nxDistributerName = params.nxDistributerName || '';
  var quantity = String(params.quantity);
  var standard = params.standard;
  var remark = params.remark || '';
  var level = params.level || 1;
  var ctx = getBuyerContext();

  var items = loadItems();
  var key = lineKey(goods.nxDistributerGoodsId, standard);
  var existingIdx = -1;
  for (var i = 0; i < items.length; i++) {
    if (items[i]._key === key && items[i].nxDistributerId === nxDistributerId) {
      existingIdx = i;
      break;
    }
  }

  var base = {
    _key: key,
    nxDistributerGoodsId: goods.nxDistributerGoodsId,
    nxGoodsId: goods.nxDgNxGoodsId,
    goodsName: goods.nxDgGoodsName,
    quantity: quantity,
    standard: standard,
    remark: remark,
    level: level,
    nxDistributerId: nxDistributerId,
    nxDistributerName: nxDistributerName,
    gbDistributerId: ctx.gbDistributerId,
    gbDepartmentId: ctx.gbDepartmentId,
    gbDepartmentFatherId: ctx.gbDepartmentFatherId,
    marketId: ctx.marketId,
    gbOrderUserId: ctx.gbOrderUserId
  };
  enrichLine(goods, base);

  if (existingIdx >= 0) {
    items[existingIdx] = base;
  } else {
    items.push(base);
  }
  saveItems(items);
  updateTabBadge();
  return base;
}

function removeLine(nxDistributerId, nxDistributerGoodsId, standard) {
  var items = loadItems().filter(function (item) {
    return !(item.nxDistributerId === nxDistributerId
      && item.nxDistributerGoodsId === nxDistributerGoodsId
      && item.standard === standard);
  });
  saveItems(items);
  updateTabBadge();
}

function adjustQty(nxDistributerId, nxDistributerGoodsId, standard, delta, goodsSnapshot) {
  var items = loadItems();
  var key = lineKey(nxDistributerGoodsId, standard);
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    if (item._key === key && item.nxDistributerId === nxDistributerId) {
      var qty = Number(item.quantity) + delta;
      if (qty <= 0) {
        items.splice(i, 1);
      saveItems(items);
      updateTabBadge();
      return null;
      }
      item.quantity = String(qty);
      if (goodsSnapshot) enrichLine(goodsSnapshot, item);
      saveItems(items);
      updateTabBadge();
      return item;
    }
  }
  return null;
}

function getItemsForSupplier(nxDistributerId) {
  return loadItems().filter(function (item) {
    return item.nxDistributerId === nxDistributerId;
  });
}

function getCartLineMap(nxDistributerId) {
  var map = {};
  getItemsForSupplier(nxDistributerId).forEach(function (line) {
    map[line._key] = line;
  });
  return map;
}

function groupBySupplier() {
  var groups = {};
  loadItems().forEach(function (item) {
    var id = item.nxDistributerId;
    if (!groups[id]) {
      groups[id] = {
        nxDistributerId: id,
        nxDistributerName: item.nxDistributerName || ('批发商' + id),
        gbDistributerId: item.gbDistributerId,
        items: [],
        knownTotal: 0,
        pendingCount: 0
      };
    }
    groups[id].items.push(item);
    if (item.priceConfirmStatus === 'CONFIRMED' && item.lineSubtotal) {
      groups[id].knownTotal += Number(item.lineSubtotal);
    } else {
      groups[id].pendingCount += 1;
    }
  });
  return Object.keys(groups).map(function (k) {
    var g = groups[k];
    g.knownTotalText = g.knownTotal.toFixed(2);
    return g;
  });
}

function clearSupplier(nxDistributerId) {
  var items = loadItems().filter(function (item) {
    return item.nxDistributerId !== nxDistributerId;
  });
  saveItems(items);
  clearSubmitToken(nxDistributerId);
  updateTabBadge();
}

function totalCount() {
  return loadItems().length;
}

function buildSubmitPayload(group) {
  var ctx = getBuyerContext();
  var dateUtils = require('../../utils/dateUtil');
  return {
    submitToken: getSubmitToken(group.nxDistributerId),
    marketId: ctx.marketId,
    gbDepartmentId: ctx.gbDepartmentId,
    gbDepartmentFatherId: ctx.gbDepartmentFatherId,
    gbDistributerId: group.gbDistributerId || ctx.gbDistributerId,
    nxDistributerId: group.nxDistributerId,
    gbOrderUserId: ctx.gbOrderUserId,
    deliveryDate: dateUtils.getArriveDate(0),
    remark: '',
    items: group.items.map(function (line) {
      return mapLineToSubmitItem(line);
    })
  };
}

function mapLineToSubmitItem(line) {
  return {
    nxDistributerGoodsId: line.nxDistributerGoodsId,
    nxGoodsId: line.nxGoodsId,
    goodsName: line.goodsName,
    quantity: line.quantity,
    standard: line.standard,
    remark: line.remark || '',
    expectPrice: line.referencePrice || ''
  };
}

/** 选批发商下单：单行立即提交（每次独立 submitToken） */
function buildImmediateSubmitPayload(params) {
  var ctx = getBuyerContext();
  var dateUtils = require('../../utils/dateUtil');
  var goods = params.goods;
  var line = enrichLine(goods, {
    nxDistributerGoodsId: goods.nxDistributerGoodsId,
    nxGoodsId: goods.nxDgNxGoodsId,
    goodsName: goods.nxDgGoodsName,
    quantity: String(params.quantity),
    standard: params.standard,
    remark: params.remark || '',
    level: params.level || 1
  });
  return {
    submitToken: genUuid(),
    marketId: ctx.marketId,
    gbDepartmentId: ctx.gbDepartmentId,
    gbDepartmentFatherId: ctx.gbDepartmentFatherId,
    gbDistributerId: ctx.gbDistributerId,
    nxDistributerId: params.nxDistributerId,
    gbOrderUserId: ctx.gbOrderUserId,
    deliveryDate: dateUtils.getArriveDate(0),
    remark: params.remark || '',
    items: [mapLineToSubmitItem(line)]
  };
}

function clearAllLocalItems() {
  saveItems([]);
  wx.setStorageSync(TOKEN_KEY, {});
  updateTabBadge();
}

function buildDebugSnapshot() {
  var ctx = getBuyerContext();
  return {
    buyerContext: ctx,
    localItems: loadItems(),
    submitTokens: wx.getStorageSync(TOKEN_KEY) || {},
    outstandingBillCache: wx.getStorageSync('platformOutstandingBill') || null,
    lastSubmitBillCache: wx.getStorageSync('platformLastSubmitBill') || null,
    groups: groupBySupplier()
  };
}

function updateTabBadge(count) {
  /** 购物车 Tab 在 app.json tabBar.list 中的下标（0 首页 1 全部类别 2 快照 3 订货） */
  var CART_TAB_INDEX = 3;
  var n = typeof count === 'number' && count >= 0 ? count : totalCount();
  try {
    if (n > 0) {
      wx.setTabBarBadge({
        index: CART_TAB_INDEX,
        text: n > 99 ? '99+' : String(n)
      });
    } else {
      wx.removeTabBarBadge({ index: CART_TAB_INDEX });
    }
  } catch (e) {
    // tab bar may be unavailable on subpackage pages
  }
}

/** 从服务端购物车行数刷新 Tab 角标 */
function refreshTabBadgeFromServer() {
  var ctx = getBuyerContext();
  if (!ctx.gbDepartmentId) {
    updateTabBadge(0);
    return Promise.resolve(0);
  }
  var platformCartApi = require('../services/platformCart');
  return platformCartApi.listLines().then(function (body) {
    var count = 0;
    if (platformCartApi.isOk(body) && body.data) {
      count = body.data.lineCount != null
        ? Number(body.data.lineCount)
        : ((body.data.lines || []).length);
    }
    updateTabBadge(count);
    return count;
  }).catch(function () {
    updateTabBadge(0);
    return 0;
  });
}

/** 格式化 cart/lines/list 行，供页面展示 */
var apiUrl = require('../../config/index');

function encodePathJoin(base, rel) {
  var r = rel == null ? '' : String(rel).replace(/^\s+|\s+$/g, '');
  if (r === '' || r === 'goodsImage/logo.jpg' || r === '/goodsImage/logo.jpg') return '';
  if (/^https?:\/\//i.test(r)) return r;
  var b = String(base || '').replace(/\/+$/, '');
  if (b === '') return r;
  var p = r.replace(/^\/+/, '');
  var parts = p.split('/');
  var enc = [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] !== '') enc.push(encodeURIComponent(parts[i]));
  }
  return b + '/' + enc.join('/');
}

function formatPhoneDisplay(phone) {
  if (!phone) return '';
  var s = String(phone).replace(/\D/g, '');
  if (s.length === 11) {
    return s.slice(0, 3) + ' ' + s.slice(3, 7) + ' ' + s.slice(7);
  }
  return String(phone);
}

function formatUnitPriceText(unitPrice, pricingStandard) {
  if (unitPrice == null || unitPrice === '') return '';
  var n = Number(unitPrice);
  var priceStr = isNaN(n) ? String(unitPrice) : n.toFixed(2);
  return '¥' + priceStr + '/' + (pricingStandard || '');
}

function formatCartLine(raw, imageBase) {
  var base = imageBase || apiUrl.nxServer || '';
  var confirmed = raw.priceConfirmStatus === 'CONFIRMED';
  var hasSupplier = raw.hasSupplierSelected === true || raw.nxDistributerGoodsId != null;
  var supplierRaw = raw.supplier || null;
  var supplier = null;
  if (supplierRaw) {
    supplier = {
      nxDistributerId: supplierRaw.nxDistributerId,
      supplierName: supplierRaw.supplierName || '',
      supplierLogo: supplierRaw.supplierLogo
        ? encodePathJoin(base, supplierRaw.supplierLogo)
        : '',
      supplierAddress: supplierRaw.supplierAddress || '',
      supplierPhone: supplierRaw.supplierPhone || '',
      supplierPhoneDisplay: formatPhoneDisplay(supplierRaw.supplierPhone)
    };
  }
  var goodsImage = raw.goodsImage
    ? encodePathJoin(base, raw.goodsImage)
    : '/images/logo.jpg';
  return {
    nxOrderId: raw.nxOrderId,
    gbOrderId: raw.gbOrderId,
    nxGoodsId: raw.nxGoodsId,
    nxDistributerId: raw.nxDistributerId,
    nxDistributerGoodsId: raw.nxDistributerGoodsId,
    goodsName: raw.goodsName || '商品',
    goodsImage: goodsImage,
    quantity: raw.quantity || '',
    standard: raw.standard || '',
    remark: raw.remark || '',
    priceConfirmStatus: raw.priceConfirmStatus || 'PENDING',
    unitPrice: raw.unitPrice,
    pricingStandard: raw.pricingStandard || raw.standard,
    unitPriceText: formatUnitPriceText(raw.unitPrice, raw.pricingStandard || raw.standard),
    lineSubtotal: raw.lineSubtotal,
    hasSupplier: hasSupplier,
    supplier: supplier,
    editable: raw.editable !== false,
    paymentLocked: raw.paymentLocked === true || raw.paymentProcessing === true,
    paymentProcessing: raw.paymentProcessing === true,
    paymentProcessingMessage: raw.paymentProcessingMessage
      || (raw.paymentProcessing ? '支付处理中' : ''),
    subtotalText: confirmed && raw.lineSubtotal ? ('¥' + raw.lineSubtotal) : '待确认',
    priceHint: confirmed ? ('小计 ¥' + raw.lineSubtotal) : '价格待称重确认'
  };
}

function splitCartLines(lines) {
  var confirmed = [];
  var pending = [];
  (lines || []).forEach(function (raw) {
    var line = formatCartLine(raw);
    if (line.priceConfirmStatus === 'CONFIRMED') {
      confirmed.push(line);
    } else {
      pending.push(line);
    }
  });
  return { confirmedLines: confirmed, pendingPriceLines: pending };
}

module.exports = {
  genUuid: genUuid,
  getBuyerContext: getBuyerContext,
  resolveUnitPrice: resolveUnitPrice,
  isLineConfirmable: isLineConfirmable,
  calcLineSubtotal: calcLineSubtotal,
  enrichLine: enrichLine,
  addOrUpdateLine: addOrUpdateLine,
  removeLine: removeLine,
  adjustQty: adjustQty,
  getItemsForSupplier: getItemsForSupplier,
  getCartLineMap: getCartLineMap,
  groupBySupplier: groupBySupplier,
  clearSupplier: clearSupplier,
  clearSubmitToken: clearSubmitToken,
  getSubmitToken: getSubmitToken,
  totalCount: totalCount,
  buildSubmitPayload: buildSubmitPayload,
  buildImmediateSubmitPayload: buildImmediateSubmitPayload,
  clearAllLocalItems: clearAllLocalItems,
  loadItems: loadItems,
  buildDebugSnapshot: buildDebugSnapshot,
  updateTabBadge: updateTabBadge,
  refreshTabBadgeFromServer: refreshTabBadgeFromServer,
  formatCartLine: formatCartLine,
  splitCartLines: splitCartLines
};
