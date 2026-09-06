var requestUtil = require('../lib/request');
var config = require('../config/index');

function registerWithFile(avatarUrl, restaurantName, code, phone, address, marketId) {
  return requestUtil.uploadFile(
    'platform/customer/register',
    avatarUrl,
    'file',
    {
      restaurantName: restaurantName,
      code: code,
      phone: phone,
      address: address || '',
      marketId: marketId != null ? marketId : config.DEFAULT_MARKET_ID,
    }
  );
}

module.exports = {
  registerWithFile: registerWithFile,
};
