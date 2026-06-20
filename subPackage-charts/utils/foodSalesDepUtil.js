/**
 * 菜品销量页共用：门店/子部门选择与菜品分组渲染
 */

function depFatherAndSubDepForChoice(ch) {
  if (!ch || ch.gbDfDepFatherId == null || ch.gbDfDepFatherId === '') {
    return null;
  }
  var father = Number(ch.gbDfDepFatherId);
  var selfId =
    ch.gbDepartmentId != null && ch.gbDepartmentId !== ''
      ? Number(ch.gbDepartmentId)
      : NaN;
  if (isNaN(father)) {
    return null;
  }
  var subDepid =
    !isNaN(selfId) && selfId !== father ? selfId : undefined;
  return { depFatherId: father, subDepid: subDepid };
}

function depFatherAndSubDepFromMendianInfo(mi) {
  if (!mi || mi.gbDepartmentId == null || mi.gbDepartmentId === '') {
    return null;
  }
  var father = Number(mi.gbDepartmentId);
  if (isNaN(father)) {
    return null;
  }
  var subs = mi.gbDepartmentEntityList || [];
  var hasSubs =
    (mi.gbDepartmentSubAmount != null &&
      Number(mi.gbDepartmentSubAmount) > 0 &&
      subs.length > 0) ||
    subs.length > 0;
  var subFirst = subs[0];
  var subDepid =
    hasSubs &&
    subFirst &&
    subFirst.gbDepartmentId != null &&
    subFirst.gbDepartmentId !== ''
      ? Number(subFirst.gbDepartmentId)
      : undefined;
  return { depFatherId: father, subDepid: subDepid };
}

function indexOfMendianDefaultSalesDep(choices, mi) {
  if (!choices || !choices.length || !mi) {
    return 0;
  }
  var subs = mi.gbDepartmentEntityList || [];
  var hasSubs =
    (mi.gbDepartmentSubAmount != null &&
      Number(mi.gbDepartmentSubAmount) > 0 &&
      subs.length > 0) ||
    subs.length > 0;
  var fatherId = mi.gbDepartmentId;
  var i;
  if (!hasSubs) {
    for (i = 0; i < choices.length; i++) {
      if (
        Number(choices[i].gbDepartmentId) === Number(fatherId) &&
        Number(choices[i].gbDfDepFatherId) === Number(fatherId)
      ) {
        return i;
      }
    }
    return 0;
  }
  var subId =
    subs.length > 0 &&
    subs[0] &&
    subs[0].gbDepartmentId != null &&
    subs[0].gbDepartmentId !== ''
      ? subs[0].gbDepartmentId
      : null;
  if (subId == null) {
    return 0;
  }
  for (i = 0; i < choices.length; i++) {
    if (
      Number(choices[i].gbDfDepFatherId) === Number(fatherId) &&
      Number(choices[i].gbDepartmentId) === Number(subId)
    ) {
      return i;
    }
  }
  return 0;
}

function foodDepChoicesFromMendianDepartmentRow(m) {
  var choices = [];
  if (!m || m.gbDepartmentId == null || m.gbDepartmentId === '') {
    return choices;
  }
  var subs = m.gbDepartmentEntityList || [];
  var hasSubs =
    (m.gbDepartmentSubAmount != null &&
      Number(m.gbDepartmentSubAmount) > 0 &&
      subs.length > 0) ||
    subs.length > 0;
  if (!hasSubs) {
    choices.push({
      gbDepartmentId: m.gbDepartmentId,
      gbDepartmentName: m.gbDepartmentName || '',
      gbDfDepFatherId: m.gbDepartmentId,
    });
  } else {
    for (var j = 0; j < subs.length; j++) {
      var s = subs[j];
      choices.push({
        gbDepartmentId: s.gbDepartmentId,
        gbDepartmentName:
          (m.gbDepartmentName || '') +
          ' · ' +
          ((s && s.gbDepartmentName) || ''),
        gbDfDepFatherId: m.gbDepartmentId,
      });
    }
  }
  return choices;
}

function buildFoodDepChoices(disInfo) {
  var choices = [];
  var list = (disInfo && disInfo.mendianDepartmentList) || [];
  for (var i = 0; i < list.length; i++) {
    var part = foodDepChoicesFromMendianDepartmentRow(list[i]);
    for (var k = 0; k < part.length; k++) {
      choices.push(part[k]);
    }
  }
  return choices;
}

function buildDepartmentChoiceListForCurrentMendian(disInfo, mendianStored) {
  if (
    mendianStored == null ||
    mendianStored.gbDepartmentId == null ||
    mendianStored.gbDepartmentId === ''
  ) {
    return buildFoodDepChoices(disInfo);
  }
  var list = (disInfo && disInfo.mendianDepartmentList) || [];
  var target = Number(mendianStored.gbDepartmentId);
  var i;
  for (i = 0; i < list.length; i++) {
    if (Number(list[i].gbDepartmentId) === target) {
      return foodDepChoicesFromMendianDepartmentRow(list[i]);
    }
  }
  return foodDepChoicesFromMendianDepartmentRow(mendianStored);
}

/**
 * @param {Array} rawGroups depGetDepFoodList 返回的分组
 * @param {{ mode?: 'sales'|'staffMeal' }} [options]
 */
function buildGroupedRows(rawGroups, options) {
  options = options || {};
  var mode = options.mode || 'sales';
  var groups = [];
  var list = Array.isArray(rawGroups) ? rawGroups : [];
  for (var i = 0; i < list.length; i++) {
    var group = list[i];
    var parent = group.parentFood || null;
    var childrenRaw = Array.isArray(group.children) ? group.children : [];

    var parentName = parent && parent.gbDfFoodName ? String(parent.gbDfFoodName) : '未分类';
    var parentFoodId = parent && parent.gbDistributerFoodId != null
      ? String(parent.gbDistributerFoodId)
      : (parent && parent.gbDfFoodFatherId != null ? String(parent.gbDfFoodFatherId) : '');
    var groupId = parentFoodId ? 'g_f' + parentFoodId : ('g_nop_' + i);

    var childRows = [];
    for (var j = 0; j < childrenRaw.length; j++) {
      var item = childrenRaw[j];
      var nested = item.gbDistributerFoodEntity || {};
      var fid =
        item.gbDfFoodId != null && item.gbDfFoodId !== ''
          ? item.gbDfFoodId
          : nested.gbDistributerFoodId != null
            ? nested.gbDistributerFoodId
            : item.gbDistributerFoodId;
      if (fid == null || fid === '') continue;
      var fname =
        item.gbDfFoodName != null && item.gbDfFoodName !== ''
          ? String(item.gbDfFoodName)
          : nested.gbDfFoodName != null
            ? String(nested.gbDfFoodName)
            : '';
      var price =
        item.gbDfFoodPrice != null && item.gbDfFoodPrice !== ''
          ? item.gbDfFoodPrice
          : nested.gbDfFoodPrice;
      var status =
        item.gbDfStatus != null ? item.gbDfStatus : nested.gbDfStatus;
      var rowId =
        item.gbDepFoodId != null && item.gbDepFoodId !== ''
          ? String(item.gbDepFoodId)
          : 'r' + j;

      if (mode === 'staffMeal') {
        childRows.push({
          rowKey: 'r' + i + '_' + j + '_' + String(fid),
          foodName: fname,
          unitPriceDisplay: price != null && price !== '' ? String(price) : '—',
          unitPrice: price != null && price !== '' ? parseFloat(price) : 0,
          foodId: fid,
          offShelf: status == 1,
          staffMealQty: 0,
          staffMealUnitPrice: 0,
          staffMealNotes: '',
        });
      } else {
        childRows.push({
          rowKey: rowId + '_' + String(fid),
          foodName: fname,
          unitPriceDisplay: price != null && price !== '' ? String(price) : '—',
          foodId: fid,
          qtyStr: '',
          offShelf: status == 1,
        });
      }
    }

    groups.push({
      groupId: groupId,
      parentName: parentName,
      parentFoodId: parentFoodId,
      expanded: false,
      children: childRows,
    });
  }
  return groups;
}

module.exports = {
  depFatherAndSubDepForChoice: depFatherAndSubDepForChoice,
  depFatherAndSubDepFromMendianInfo: depFatherAndSubDepFromMendianInfo,
  indexOfMendianDefaultSalesDep: indexOfMendianDefaultSalesDep,
  foodDepChoicesFromMendianDepartmentRow: foodDepChoicesFromMendianDepartmentRow,
  buildFoodDepChoices: buildFoodDepChoices,
  buildDepartmentChoiceListForCurrentMendian: buildDepartmentChoiceListForCurrentMendian,
  buildGroupedRows: buildGroupedRows,
};
