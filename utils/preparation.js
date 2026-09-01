var statusLabels = {
  DRAFT: '待领料',
  MATERIALS_ISSUED: '已领料待完成',
  COMPLETED: '已完成',
  CLOSED: '已耗尽关闭',
  ISSUE_REVERSED: '领料已冲销',
  ENABLED: '启用',
  DISABLED: '停用',
  PUBLISHED: '已发布',
  RETIRED: '已退役',
  AVAILABLE: '可用',
  EXPIRED: '已过期',
  EXHAUSTED: '已耗尽',
  CONFIRMED: '已确认',
  REVERSED: '已冲销',
};

var reasonLabels = {
  EXPIRED: '过期',
  OVER_PRODUCTION: '生产过量',
  QUALITY_ISSUE: '质量问题',
  CONTAMINATION: '污染',
  STORAGE_FAILURE: '储存故障',
  OTHER: '其他',
};

function getIdentity() {
  var userInfo = wx.getStorageSync('userInfo') || {};
  var disInfo = wx.getStorageSync('disInfo') || {};
  var mendianInfo = wx.getStorageSync('mendianInfo') || wx.getStorageSync('purDepInfo') || {};
  return {
    userInfo: userInfo,
    disInfo: disInfo,
    mendianInfo: mendianInfo,
    distributerId: userInfo.gbDuDistributerId || disInfo.gbDistributerId || mendianInfo.gbDepartmentDisId,
    operatorId: userInfo.gbDepartmentUserId,
    userDepartmentId: userInfo.gbDuDepartmentId || userInfo.gbDepartmentId,
    currentStoreId: mendianInfo.gbDepartmentId || userInfo.gbDuDepartmentFatherId || userInfo.gbDuDepartmentId,
  };
}

function flattenDepartments(disInfo) {
  var result = [];
  var seen = {};

  function visit(row, storeId) {
    if (!row || !row.gbDepartmentId || seen[row.gbDepartmentId]) return;
    seen[row.gbDepartmentId] = true;
    result.push({
      departmentId: row.gbDepartmentId,
      departmentName: row.gbDepartmentName || ('部门' + row.gbDepartmentId),
      storeId: storeId || row.gbDepartmentId,
      raw: row,
    });
    var children = row.gbDepartmentEntityList || row.children || [];
    children.forEach(function (child) { visit(child, storeId || row.gbDepartmentId); });
  }

  var stores = (disInfo && disInfo.mendianDepartmentList) || [];
  stores.forEach(function (store) { visit(store, store.gbDepartmentId); });
  return result;
}

function enabledPreparationDepartments(capabilities, identity) {
  var enabledIds = {};
  (capabilities || []).forEach(function (row) {
    if (row && row.capabilityCode === 'PREPARATION' && Number(row.enabled) === 1) {
      enabledIds[String(row.departmentId)] = true;
    }
  });
  var known = flattenDepartments(identity.disInfo);
  var result = known.filter(function (row) {
    if (!enabledIds[String(row.departmentId)]) return false;
    if (!identity.currentStoreId) return true;
    return String(row.storeId) === String(identity.currentStoreId) ||
      String(row.departmentId) === String(identity.currentStoreId);
  });

  // 登录缓存不含完整部门树时，仍按后台能力 ID 工作，不按名称猜测。
  Object.keys(enabledIds).forEach(function (id) {
    var exists = result.some(function (row) { return String(row.departmentId) === id; });
    if (!exists && (!identity.currentStoreId || id === String(identity.userDepartmentId))) {
      result.push({ departmentId: Number(id), departmentName: '部门 ' + id, storeId: identity.currentStoreId });
    }
  });
  return result;
}

function flattenFoods(tree) {
  var result = [];
  function visit(row, categoryName) {
    if (!row) return;
    var children = row.foodEntityList || [];
    if (children.length) {
      children.forEach(function (child) {
        visit(child, row.gbDfFoodName || categoryName || '未分类');
      });
      return;
    }
    if (row.gbDfFoodFatherId && Number(row.gbDfStatus || 0) === 0) {
      result.push({
        foodId: row.gbDistributerFoodId,
        foodName: row.gbDfFoodName,
        recipeModel: row.gbDfRecipeModel || 'LEGACY',
        recipeRowVersion: Number(row.gbDfRecipeRowVersion || 0),
        categoryName: categoryName || '未分类',
        raw: row,
      });
    }
  }
  (tree || []).forEach(function (row) { visit(row, ''); });
  return result;
}

function statusLabel(value) {
  return statusLabels[value] || value || '—';
}

function statusClass(value) {
  if (value === 'ENABLED' || value === 'PUBLISHED' || value === 'AVAILABLE' || value === 'COMPLETED' || value === 'CONFIRMED') return 'status-success';
  if (value === 'DRAFT' || value === 'MATERIALS_ISSUED') return 'status-warning';
  if (value === 'EXPIRED' || value === 'DISABLED') return 'status-danger';
  return 'status-muted';
}

function isNil(value) {
  return value === null || typeof value === 'undefined' || value === '';
}

function formatNumber(value, digits, emptyText) {
  if (isNil(value)) return typeof emptyText === 'string' ? emptyText : '—';
  var number = Number(value);
  if (isNaN(number)) return String(value);
  var fixed = number.toFixed(typeof digits === 'number' ? digits : 2);
  return fixed.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

function formatMoney(value, emptyText) {
  if (isNil(value)) return typeof emptyText === 'string' ? emptyText : '—';
  var number = Number(value);
  if (isNaN(number)) return String(value);
  return '¥' + number.toFixed(2);
}

function formatUnitCost(value, emptyText) {
  if (isNil(value)) return typeof emptyText === 'string' ? emptyText : '—';
  var number = Number(value);
  if (isNaN(number)) return String(value);
  return '¥' + formatNumber(number, 8);
}

function formatPercent(value, emptyText) {
  if (isNil(value)) return typeof emptyText === 'string' ? emptyText : '—';
  var number = Number(value);
  if (isNaN(number)) return String(value);
  return (number * 100).toFixed(2) + '%';
}

function datePart(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function timePart(value) {
  if (!value) return '';
  return String(value).replace('T', ' ').slice(0, 16);
}

function pad(number) {
  return number < 10 ? '0' + number : String(number);
}

function localDate(offsetDays) {
  var date = new Date();
  if (offsetDays) date.setDate(date.getDate() + offsetDays);
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function localTime() {
  var date = new Date();
  return pad(date.getHours()) + ':' + pad(date.getMinutes());
}

function toLocalDateTime(date, time) {
  return String(date || '') + 'T' + String(time || '00:00') + ':00';
}

function errorTitle(error) {
  var status = Number(error && error.status || 0);
  if (status === 400) return '业务校验未通过（400）';
  if (status === 403) return '没有操作权限（403）';
  if (status === 404) return '数据不存在（404）';
  if (status === 409) return '数据冲突（409）';
  if (status >= 500) return '服务暂时异常（' + status + '）';
  return '网络请求失败';
}

function showError(error) {
  if (error && error.authenticationFailure) return;
  var message = error && error.message ? error.message : '请求失败，请稍后重试';
  wx.showModal({
    title: errorTitle(error),
    content: message,
    showCancel: false,
  });
}

function confirm(content, title) {
  return new Promise(function (resolve) {
    wx.showModal({
      title: title || '请确认',
      content: content,
      confirmColor: '#187e6e',
      success: function (res) { resolve(!!res.confirm); },
      fail: function () { resolve(false); },
    });
  });
}

function selectCurrentDepartment(options, identity) {
  var savedId = wx.getStorageSync('preparationDepartmentId');
  var selected = (options || []).find(function (row) {
    return String(row.departmentId) === String(savedId);
  });
  if (!selected) {
    selected = (options || []).find(function (row) {
      return String(row.departmentId) === String(identity.userDepartmentId);
    });
  }
  return selected || (options && options[0]) || null;
}

module.exports = {
  getIdentity: getIdentity,
  flattenDepartments: flattenDepartments,
  enabledPreparationDepartments: enabledPreparationDepartments,
  flattenFoods: flattenFoods,
  statusLabel: statusLabel,
  statusClass: statusClass,
  reasonLabels: reasonLabels,
  isNil: isNil,
  formatNumber: formatNumber,
  formatMoney: formatMoney,
  formatUnitCost: formatUnitCost,
  formatPercent: formatPercent,
  datePart: datePart,
  timePart: timePart,
  localDate: localDate,
  localTime: localTime,
  toLocalDateTime: toLocalDateTime,
  showError: showError,
  confirm: confirm,
  selectCurrentDepartment: selectCurrentDepartment,
};
