/**
 * pasteDepList 本地缓存读写
 * 结构: [{ depId, arr, orderSubmitted, strArr, nxArr, searchStr }]
 *
 * - 草稿（未点「匹配商品」）：仅缓存 gbDoStatus === -2 的订单，orderSubmitted = false
 * - 已匹配结果：缓存完整列表，orderSubmitted = true；若全部匹配成功则清除该部门缓存
 */

function filterDraftOrders(orderArr) {
  if (!Array.isArray(orderArr)) return [];
  return orderArr.filter(o => Number(o.gbDoStatus) === -2);
}

function hasUnmatchedOrders(orderArr) {
  if (!Array.isArray(orderArr)) return false;
  return orderArr.some(o => Number(o.gbDoStatus) === -2);
}

/** 读取缓存，无 key 时返回 [] */
function getPasteDepList() {
  const list = wx.getStorageSync('pasteDepList');
  return Array.isArray(list) ? list : [];
}

/** 写入缓存；列表为空时移除 storage key */
function persistPasteDepList(list) {
  const next = Array.isArray(list) ? list : [];
  if (next.length === 0) {
    try {
      wx.removeStorageSync('pasteDepList');
    } catch (e) {
      console.warn('pasteDepList 缓存移除失败', e);
    }
    return [];
  }
  wx.setStorageSync('pasteDepList', next);
  return next;
}

function isSameOrder(a, b) {
  if (!a || !b) return false;
  if (a.gbDepartmentOrdersId != null && b.gbDepartmentOrdersId != null) {
    return String(a.gbDepartmentOrdersId) === String(b.gbDepartmentOrdersId);
  }
  return (
    Number(a.gbDoStatus) === -2 &&
    Number(b.gbDoStatus) === -2 &&
    String(a.gbDoGoodsName || '') === String(b.gbDoGoodsName || '') &&
    String(a.gbDoQuantity || '') === String(b.gbDoQuantity || '') &&
    String(a.gbDoStandard || '') === String(b.gbDoStandard || '')
  );
}

function shouldClearDepEntry(orderSubmitted, arr) {
  if (!arr || !arr.length) return true;
  if (orderSubmitted && !hasUnmatchedOrders(arr)) return true;
  if (!orderSubmitted && filterDraftOrders(arr).length === 0) return true;
  return false;
}

function normalizeDepEntry(entry) {
  const orderSubmitted = !!entry.orderSubmitted;
  const arr = Array.isArray(entry.arr) ? entry.arr : [];
  if (shouldClearDepEntry(orderSubmitted, arr)) return null;

  return {
    ...entry,
    arr: orderSubmitted ? arr : filterDraftOrders(arr),
    orderSubmitted,
  };
}

/**
 * 从缓存移除一条订单；若该部门已无未匹配订单则删除整个部门条目
 * @returns {Array} 更新后的 pasteDepList
 */
function removeOrderFromPasteDepList({ depId, orderId, applyItem }) {
  const pasteDepList = getPasteDepList();
  const depIndex = pasteDepList.findIndex(item => String(item.depId) === String(depId));
  if (depIndex < 0) return pasteDepList;

  const entry = pasteDepList[depIndex];
  const orderSubmitted = !!entry.orderSubmitted;
  let arr = orderSubmitted ? (entry.arr || []).slice() : filterDraftOrders(entry.arr || []);

  if (orderId != null && orderId !== '') {
    arr = arr.filter(o => String(o.gbDepartmentOrdersId) !== String(orderId));
  }
  if (applyItem) {
    arr = arr.filter(o => !isSameOrder(o, applyItem));
  }

  if (shouldClearDepEntry(orderSubmitted, arr)) {
    pasteDepList.splice(depIndex, 1);
  } else {
    pasteDepList[depIndex] = normalizeDepEntry({
      ...entry,
      arr: orderSubmitted ? arr : filterDraftOrders(arr),
      orderSubmitted,
    });
  }

  return persistPasteDepList(pasteDepList);
}

/**
 * 写入部门订单缓存
 * @param {boolean} orderSubmitted 是否已调用「匹配商品」
 */
function saveOrdersToPasteDepList({ depId, orderArr, pasteDepList, orderSubmitted = false }) {
  let list = pasteDepList || getPasteDepList();
  const arr = Array.isArray(orderArr) ? orderArr : [];
  const submitted = !!orderSubmitted;

  if (shouldClearDepEntry(submitted, arr)) {
    list = list.filter(item => String(item.depId) !== String(depId));
    return persistPasteDepList(list);
  }

  const storedArr = submitted ? arr : filterDraftOrders(arr);
  let depIndex = list.findIndex(item => String(item.depId) === String(depId));

  const nextEntry = {
    depId,
    arr: storedArr,
    orderSubmitted: submitted,
    strArr: depIndex >= 0 ? (list[depIndex].strArr || []) : [],
    nxArr: depIndex >= 0 ? (list[depIndex].nxArr || []) : [],
    searchStr: depIndex >= 0 ? (list[depIndex].searchStr || '') : '',
  };

  if (depIndex < 0) {
    list.push(nextEntry);
  } else {
    list[depIndex] = { ...list[depIndex], ...nextEntry };
  }

  return persistPasteDepList(list);
}

/**
 * 删除指定部门的整个缓存条目
 */
function removeDepFromPasteDepList(depId) {
  const list = getPasteDepList().filter(
    item => String(item.depId) !== String(depId)
  );
  return persistPasteDepList(list);
}

/**
 * 清理全量缓存：移除已无未匹配订单的部门条目
 */
function sanitizePasteDepList() {
  const sanitized = getPasteDepList()
    .map(entry => normalizeDepEntry(entry))
    .filter(Boolean);
  return persistPasteDepList(sanitized);
}

/**
 * 读取指定部门的缓存会话
 */
function loadPasteSession(depId) {
  const entry = getPasteDepList().find(item => String(item.depId) === String(depId));
  if (!entry) return null;
  const normalized = normalizeDepEntry(entry);
  if (!normalized) return null;
  return {
    orderArr: normalized.arr,
    orderSubmitted: normalized.orderSubmitted,
  };
}

module.exports = {
  filterDraftOrders,
  hasUnmatchedOrders,
  getPasteDepList,
  persistPasteDepList,
  removeOrderFromPasteDepList,
  saveOrdersToPasteDepList,
  removeDepFromPasteDepList,
  sanitizePasteDepList,
  loadPasteSession,
  isSameOrder,
};
