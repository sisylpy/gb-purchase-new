/**
 * pasteDepList 本地缓存读写
 * 仅缓存 gbDoStatus === -2 的未匹配草稿订单
 * 结构: [{ depId, arr, saveCount, strArr, nxArr, searchStr }]
 */

function filterDraftOrders(orderArr) {
  if (!Array.isArray(orderArr)) return [];
  return orderArr.filter(o => o.gbDoStatus === -2);
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
    a.gbDoStatus === -2 &&
    b.gbDoStatus === -2 &&
    String(a.gbDoGoodsName || '') === String(b.gbDoGoodsName || '') &&
    String(a.gbDoQuantity || '') === String(b.gbDoQuantity || '') &&
    String(a.gbDoStandard || '') === String(b.gbDoStandard || '')
  );
}

/**
 * 从缓存移除一条订单；若该部门 arr 为空则删除整个部门条目
 * @returns {Array} 更新后的 pasteDepList
 */
function removeOrderFromPasteDepList({ depId, orderId, applyItem }) {
  const pasteDepList = getPasteDepList();
  const depIndex = pasteDepList.findIndex(item => String(item.depId) === String(depId));
  if (depIndex < 0) return pasteDepList;

  const entry = pasteDepList[depIndex];
  let arr = filterDraftOrders(entry.arr || []);

  if (orderId != null && orderId !== '') {
    arr = arr.filter(o => String(o.gbDepartmentOrdersId) !== String(orderId));
  }
  if (applyItem) {
    arr = arr.filter(o => !isSameOrder(o, applyItem));
  }

  if (arr.length === 0) {
    pasteDepList.splice(depIndex, 1);
  } else {
    pasteDepList[depIndex] = {
      ...entry,
      arr,
      saveCount: null,
    };
  }

  return persistPasteDepList(pasteDepList);
}

/**
 * 写入部门订单缓存（仅 gbDoStatus === -2）；无草稿时删除该部门条目
 */
function saveOrdersToPasteDepList({ depId, orderArr, pasteDepList }) {
  let list = pasteDepList || getPasteDepList();
  const draftOrders = filterDraftOrders(orderArr);

  if (draftOrders.length === 0) {
    list = list.filter(item => String(item.depId) !== String(depId));
    return persistPasteDepList(list);
  }

  let depIndex = list.findIndex(item => String(item.depId) === String(depId));
  if (depIndex < 0) {
    list.push({
      depId,
      arr: draftOrders,
      saveCount: null,
      strArr: [],
      nxArr: [],
      searchStr: '',
    });
  } else {
    list[depIndex] = {
      ...list[depIndex],
      depId,
      arr: draftOrders,
      saveCount: null,
    };
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
 * 清理全量缓存：移除所有非 -2 订单，删除已无草稿的部门条目
 */
function sanitizePasteDepList() {
  const sanitized = getPasteDepList()
    .map(entry => ({
      ...entry,
      arr: filterDraftOrders(entry.arr),
      saveCount: null,
    }))
    .filter(entry => entry.arr && entry.arr.length > 0);
  return persistPasteDepList(sanitized);
}

module.exports = {
  filterDraftOrders,
  getPasteDepList,
  persistPasteDepList,
  removeOrderFromPasteDepList,
  saveOrdersToPasteDepList,
  removeDepFromPasteDepList,
  sanitizePasteDepList,
  isSameOrder,
};
