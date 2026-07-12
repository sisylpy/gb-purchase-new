/**
 * 主包 pages 域 API（登录、注册）
 */
var requestUtil = require('../../lib/request');

function gbLoginIndex(code) {
  return requestUtil.get('gbdepartmentuser/gbLoginIndex/' + code);
}

function gbRegisterWithFile(avatarUrl, restaurantName, code, phone, address) {
  return requestUtil.uploadFile(
    'gbdistributeruser/gbRegisterWithFile',
    avatarUrl,
    'file',
    {
      restaurantName: restaurantName,
      code: code,
      phone: phone,
      address: address || '',
    }
  );
}

module.exports = {
  gbLoginIndex: gbLoginIndex,
  gbRegisterWithFile: gbRegisterWithFile,
};
