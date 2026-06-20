/**
 * 京采市场主包页面 API
 */
var requestUtil = require('../../lib/request');

function gbLoginIndex(code) {
  return requestUtil.get('gbdepartmentuser/gbLoginIndex/' + code, {}, { backend: 'nx' });
}

module.exports = {
  gbLoginIndex: gbLoginIndex
};
