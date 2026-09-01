/**
 * 实时语音识别凭证 API。
 * 永久腾讯云密钥只保存在服务端；小程序只接收短期 STS 凭证。
 */
var requestUtil = require('../lib/request');

var getTemporaryCredential = function () {
  return requestUtil.get('speech/temporary-credential', {}, {
    showErrorToast: false,
  });
};

module.exports = {
  getTemporaryCredential: getTemporaryCredential,
};
