/**
 * 门店子包：分销商用户登录 / 采购员注册（Gb）
 * 由原 lib/apiDistributer 中 invite、部门用户注册等页使用的接口迁入。
 * @module subPackage-mendian/services/apiDistributerGbUser
 */

var requestUtil = require('../../lib/request');



var updateDisContent = function (data) {
  return requestUtil.post('gbdepartment/updateDisContent', data);
};

var getDisInfo = function(disId){
  return requestUtil.get('gbdistributer/getDisInfo/' + disId);
};
/**
 * 微信 code 登录（订货端 Gb）
 * GET gbdistributeruser/gbLogin/{code}
 * @param {string} code wx.login 返回的 code
 */
var gbLogin = function (code) {
  return requestUtil.get('gbdistributeruser/gbLogin/' + code);
};

/**
 * 采购员注册（上传头像）
 * POST multipart gbdepartmentuser/gbPurchaserRegitsteWithFile
 * @param {string} avatarUrl 头像临时文件路径
 * @param {string} userName 昵称
 * @param {string} code wx.login code
 * @param {string|number} admin 是否管理员等（与后端约定一致）
 * @param {string|number} gbDisId 分销商 id
 * @param {string|number} depFatherId 父部门 id
 * @param {string|number} depId 所选子部门 id
 */
var gbPurchaserRegitsteWithFile = function (avatarUrl, userName, code, admin, gbDisId, depFatherId, depId) {
  return requestUtil.uploadFile(
    'gbdepartmentuser/gbPurchaserRegitsteWithFile',
    avatarUrl,
    'file',
    {
      userName: userName,
      code: code,
      admin: admin,
      gbDisId: gbDisId,
      depFatherId: depFatherId,
      depId: depId,
    }
  );
};



module.exports = {
  gbLogin: gbLogin,
  gbPurchaserRegitsteWithFile: gbPurchaserRegitsteWithFile,
  getDisInfo: getDisInfo,
  updateDisContent: updateDisContent
};
