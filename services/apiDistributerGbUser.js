/**
 * Gb 分销商用户登录、采购员注册、邀请注册
 * group + mendian 子包及主包 invite 页面共用
 * @module services/apiDistributerGbUser
 */

var requestUtil = require('../lib/request');

var gbLogin = function (code) {
  return requestUtil.get('gbdepartmentuser/gbLogin/' + code);
};

var gbSubDepUserLogin = function (code) {
  return requestUtil.get('gbdepartmentuser/gbSubDepUserLogin/' + code);
};

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

var getDisInfo = function (disId) {
  return requestUtil.get('gbdistributer/getDisInfo/' + disId);
};

var updateDisContent = function (data) {
  return requestUtil.post('gbdepartment/updateDisContent', data);
};

module.exports = {
  gbLogin: gbLogin,
  gbSubDepUserLogin: gbSubDepUserLogin,
  gbPurchaserRegitsteWithFile: gbPurchaserRegitsteWithFile,
  gbRegisterWithFileInvite: gbRegisterWithFileInvite,
  getDisInfo: getDisInfo,
  updateDisContent: updateDisContent,
};
