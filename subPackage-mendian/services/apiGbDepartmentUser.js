/**
 * 门店子包：Gb 部门用户资料更新
 * 由原 lib/apiDepOrder 迁入。
 * @module subPackage-mendian/services/apiGbDepartmentUser
 */

var requestUtil = require('../../lib/request');

/**
 * 更新部门用户（无头像变更）
 * POST gbdepartmentuser/updateGbDepUser（参数走 URL query）
 * @param {{ userName: string, userId: string|number, depId: string|number }} data
 */
var updateGbDepUser = function (data) {
  return requestUtil.post('gbdepartmentuser/updateGbDepUser', data, { useUrlParams: true });
};

/**
 * 更新部门用户（含头像上传）
 * POST multipart gbdepartmentuser/updateGbDepUserWithFile
 * @param {string[]|string} filePathList 临时文件路径；可为 chooseImage 返回的数组或单路径
 * @param {string} userName 昵称
 * @param {string|number} userId gbDepartmentUserId
 * @param {string|number} depId gbDuDepartmentId
 */
var updateGbDepUserWithFile = function (filePathList, userName, userId, depId) {
  var filePath = Array.isArray(filePathList) ? filePathList[0] : filePathList;
  return requestUtil.uploadFile(
    'gbdepartmentuser/updateGbDepUserWithFile',
    filePath,
    'file',
    {
      userName: userName,
      userId: userId,
      depId: depId,
    }
  );
};

module.exports = {
  updateGbDepUser: updateGbDepUser,
  updateGbDepUserWithFile: updateGbDepUserWithFile,
};
