/**
 * 采购视角下的「当前门店部门」解析。
 *
 * 背景：门店管理员 (gbDuAdmin=11) 登录态里 gbDuDepartmentId / disInfo.mendianDepartmentList[0] 即该门店。
 * 集团用户 (gbDuAdmin=0) 挂在集团部门，gbDuDepartmentId 不是「门店部门」，不能直接当 depId 用。
 * 集团用户必须先选门店，把该门店在 getDisDepartmentGbMendianJing 里的一行写入 purDepInfo，再进 pages/index。
 *
 * 约定：purDepInfo / mendianInfo 存同一套部门实体（含 gbDepartmentId），与 mendian/index 一致。
 *
 * ⚠️ 列表类接口若仅传 disId 且后端按会话部门过滤，需后端支持集团代门店；前端已保证 depId、订货批次里的部门字段一致。
 */

var GB_DU_ADMIN_GROUP_MANAGER = 0;

/**
 * 是否为集团管理端登录态
 * @param {object} userInfo
 * @returns {boolean}
 */
function isGroupManagerUser(userInfo) {
  if (!userInfo) return false;
  var a = userInfo.gbDuAdmin;
  return a === 0 || a === '0';
}

/**
 * 解析 pages/index 应使用的 depId、同步 mendianInfo。
 * @returns {{ ok: boolean, depId?: number, purDepInfo?: object, mendianInfo?: object, isGroupManager?: boolean, reason?: string }}
 */
function resolveIndexPurchaseContext() {
  var userInfo = wx.getStorageSync('userInfo') || {};
  var disInfo = wx.getStorageSync('disInfo') || {};
  var isGroup = isGroupManagerUser(userInfo);
  var purFromStorage = wx.getStorageSync('purDepInfo');

  if (isGroup) {
    if (purFromStorage && purFromStorage.gbDepartmentId) {
      return {
        ok: true,
        depId: purFromStorage.gbDepartmentId,
        purDepInfo: purFromStorage,
        mendianInfo: purFromStorage,
        isGroupManager: true,
      };
    }
    return { ok: false, reason: 'GROUP_NEED_STORE', isGroupManager: true };
  }

  // 门店端等：显式选择过门店部门则优先
  if (purFromStorage && purFromStorage.gbDepartmentId) {
    return {
      ok: true,
      depId: purFromStorage.gbDepartmentId,
      purDepInfo: purFromStorage,
      mendianInfo: purFromStorage,
      isGroupManager: false,
    };
  }

  var mendianInfo = wx.getStorageSync('mendianInfo');
  if (mendianInfo && mendianInfo.gbDepartmentId) {
    return {
      ok: true,
      depId: mendianInfo.gbDepartmentId,
      purDepInfo: mendianInfo,
      mendianInfo: mendianInfo,
      isGroupManager: false,
    };
  }

  var fallbackDep =
    userInfo.gbDuDepartmentId ||
    userInfo.gbDepartmentId;
  if (fallbackDep) {
    return {
      ok: true,
      depId: fallbackDep,
      purDepInfo: null,
      mendianInfo: null,
      isGroupManager: false,
    };
  }

  return { ok: false, reason: 'NO_DEPARTMENT', isGroupManager: false };
}

/**
 * 集团用户在经营看板选好门店后写入缓存，再进采购首页。
 * @param {object} depRow getDisDepartmentGbMendianJing 列表中的一项
 */
function setGroupSelectedStoreDepartment(depRow) {
  if (!depRow || !depRow.gbDepartmentId) {
    return;
  }
  wx.setStorageSync('purDepInfo', depRow);
  wx.setStorageSync('mendianInfo', depRow);
}

/** 从采购首页返回集团看板时清空代门店上下文 */
function clearGroupStorePurchaseContext() {
  wx.removeStorageSync('purDepInfo');
  wx.removeStorageSync('mendianInfo');
}

module.exports = {
  GB_DU_ADMIN_GROUP_MANAGER: GB_DU_ADMIN_GROUP_MANAGER,
  isGroupManagerUser: isGroupManagerUser,
  resolveIndexPurchaseContext: resolveIndexPurchaseContext,
  setGroupSelectedStoreDepartment: setGroupSelectedStoreDepartment,
  clearGroupStorePurchaseContext: clearGroupStorePurchaseContext,
};
