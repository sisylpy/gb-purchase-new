/**
 * 主包 mendian 域内 API
 * @module services/mendian
 */

var requestUtil = require('../lib/request');

/**
 * 获取群用户列表（订货组用户）
 * POST gbdepartment/getDepUsersByFatherIdGb（参数走 URL query）
 * @param {Object|number|string} data 含 startDate、stopDate、depId；也可只传 depId
 */
var getDepUsersByFatherIdGb = function (data) {
  var payload = data !== null && typeof data === 'object' && !Array.isArray(data) && 'depId' in data
    ? data
    : { depId: data };
  var reqData = { depId: payload.depId };
  if (payload.startDate != null && payload.startDate !== '') {
    reqData.startDate = payload.startDate;
  }
  if (payload.stopDate != null && payload.stopDate !== '') {
    reqData.stopDate = payload.stopDate;
  }
  return requestUtil.post('gbdepartment/getDepUsersByFatherIdGb', reqData, { useUrlParams: true });
};

/**
 * 获取分销商下门店（京）列表
 * GET gbdepartment/getDisDepartmentGbMendianJing/{disId}
 * @param {string|number} disId 分销商 ID
 */
var getDisDepartmentGbMendianJing = function (disId) {
  return requestUtil.get('gbdepartment/getDisDepartmentGbMendianJing/' + disId);
};

/**
 * 更新部门/分组名称等
 * POST gbdepartment/updateGroupNameGb
 * @param {Object} data 部门实体（含 gbDepartmentId、名称等）
 */
var updateGroupNameGb = function (data) {
  return requestUtil.post('gbdepartment/updateGroupNameGb', data);
};

/**
 * 删除部门
 * GET gbdepartment/deleteDepartment/{departmentId}
 * @param {string|number} departmentId 部门 ID
 */
var deleteDepartment = function (departmentId) {
  return requestUtil.get('gbdepartment/deleteDepartment/' + departmentId);
};

/**
 * 保存子部门
 * POST gbdepartment/saveSubDepartment
 * @param {Object} data 部门实体（含父级 id、名称等）
 */
var saveSubDepartment = function (data) {
  return requestUtil.post('gbdepartment/saveSubDepartment', data);
};

/**
 * 获取父部门下子部门列表（Gb）
 * GET gbdepartment/getSubDepartmentsGb/{depFatherId}
 * @param {string|number} depFatherId 父部门 ID
 */
var getSubDepartmentsGb = function (depFatherId) {
  return requestUtil.get('gbdepartment/getSubDepartmentsGb/' + depFatherId);
};

/**
 * 保存新部门（门店）
 * POST gbdepartment/saveGbDepartment
 * @param {Object} data 部门实体
 */
var saveGbDepartment = function (data) {
  return requestUtil.post('gbdepartment/saveGbDepartment', data);
};

/**
 * 获取门店详情（整合子部门+用户，三层数据）
 * GET gbdepartment/getStoreDetailGb/{depId}
 * @param {string|number} depId 部门 ID
 * @returns {Promise} 返回 { users: [], subDepartments: [{ gbDepartmentId, gbDepartmentName, gbDepartmentUserEntities: [] }] }
 */
var getStoreDetailGb = function (depId) {
  return requestUtil.get('gbdepartment/getStoreDetailGb/' + depId);
};

module.exports = {
  getDepUsersByFatherIdGb: getDepUsersByFatherIdGb,
  getDisDepartmentGbMendianJing: getDisDepartmentGbMendianJing,
  updateGroupNameGb: updateGroupNameGb,
  deleteDepartment: deleteDepartment,
  saveSubDepartment: saveSubDepartment,
  getSubDepartmentsGb: getSubDepartmentsGb,
  saveGbDepartment: saveGbDepartment,
  getStoreDetailGb: getStoreDetailGb,
};
