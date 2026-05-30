/**
 * 主包：Gb 分销商用户登录、采购员注册、邀请注册上传
 * 供 pages/invite* 等主包页面使用（与子包 subPackage-mendian/services/apiDistributerGbUser 接口路径保持一致）。
 * @module services/apiDistributerGbUser
 */

var requestUtil = require('../lib/request');

/**
 * 微信 code 登录（订货端 Gb）
 * GET gbdepartmentuser/gbLogin/{code}
 * @param {string} code wx.login 返回的 code
 */
var gbLogin = function (code) {
  return requestUtil.get('gbdepartmentuser/gbLogin/' + code);
};

/**
 * 采购员注册（上传头像）
 * POST multipart gbdepartmentuser/gbPurchaserRegitsteWithFile
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

/**
 * 邀请注册：门店/订货客户注册（上传头像）
 * POST multipart gbdistributeruser/gbRegisterWithFileInvite
 * @param {string} avatarUrl 头像临时路径
 * @param {string} restaurantName 餐厅名称
 * @param {string} code wx.login code
 * @param {string} phone 电话
 * @param {string} address 地址
 * @param {string|number} disId 分销商 id
 */
var gbRegisterWithFileInvite = function (avatarUrl, restaurantName, code, phone, address, disId) {
  return requestUtil.uploadFile(
    'gbdepartmentuser/gbRegisterWithFileInvite',
    avatarUrl,
    'file',
    {
      restaurantName: restaurantName,
      code: code,
      phone: phone,
      address: address,
      disId: disId,
    }
  );
};

module.exports = {
  gbLogin: gbLogin,
  gbPurchaserRegitsteWithFile: gbPurchaserRegitsteWithFile,
  gbRegisterWithFileInvite: gbRegisterWithFileInvite,
};
