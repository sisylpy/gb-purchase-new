/**
 * 门店子包：Gb 部门用户资料更新
 * 由原 lib/apiDepOrder 迁入。
 * @module subPackage-mendian/services/apiGbDepartmentUser
 */

var requestUtil = require('../../lib/request');

/**
 * 更新部门用户（昵称 + 可选头像）。统一请求 {@code gbdepartmentuser/updateGbDepUserWithFile}（file 可选）。
 * @param {string} userName
 * @param {string|number} userId gbDepartmentUserId
 * @param {string|number} depId gbDuDepartmentId
 * @param {string|string[]} [tempFilePath] 本地临时路径或 chooseImage 数组，传入则 multipart 上传
 */
var updateGbDepUserWithFile = function (userName, userId, depId, tempFilePath) {
  var path = 'gbdepartmentuser/updateGbDepUserWithFile';
  if (tempFilePath) {
    var filePath = Array.isArray(tempFilePath) ? tempFilePath[0] : tempFilePath;
    return requestUtil.uploadFile(path, filePath, 'file', {
      userName: userName,
      userId: userId,
      depId: depId,
    });
  }
  return requestUtil.post(
    path,
    { userName: userName, userId: userId, depId: depId },
    { useUrlParams: true }
  );
};

/**
 * 更新部门用户管理员角色
 * POST gbdepartmentuser/updateDepUserAdminGb
 * @param {Object} data 用户实体（含 gbDepartmentUserId）
 */
var updateDepUserAdminGb = function (data) {
  return requestUtil.post('gbdepartmentuser/updateDepUserAdminGb', data);
};

module.exports = {
  updateGbDepUserWithFile: updateGbDepUserWithFile,
  updateDepUserAdminGb: updateDepUserAdminGb,
};
