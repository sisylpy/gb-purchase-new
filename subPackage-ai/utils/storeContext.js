/**
 * 门店上下文：从本地缓存解析 departmentId / 导航栏高度
 */

function resolveStoreContext() {
  var mendianInfo = wx.getStorageSync('mendianInfo');
  if (mendianInfo && mendianInfo.gbDepartmentId) {
    return {
      departmentId: mendianInfo.gbDepartmentId,
      departmentName: mendianInfo.gbDepartmentName || '门店',
    };
  }
  var userInfo = wx.getStorageSync('userInfo');
  if (userInfo) {
    var depId = userInfo.gbDuDepartmentId || userInfo.gbDepartmentId;
    if (depId) {
      return {
        departmentId: depId,
        departmentName: userInfo.gbDuDepartmentName || '门店',
      };
    }
  }
  return null;
}

function getNavBarHeightRpx() {
  var globalData = getApp().globalData;
  var navBarHeight = globalData.statusBarHeight +
    (globalData.menuButtonInfo.height +
      (globalData.menuButtonInfo.top - globalData.statusBarHeight) * 2);
  return navBarHeight * globalData.rpxR;
}

module.exports = {
  resolveStoreContext: resolveStoreContext,
  getNavBarHeightRpx: getNavBarHeightRpx,
};
