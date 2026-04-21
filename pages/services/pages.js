/**
 * 主包 pages 域内 API（微信登录、注册等）
 * @module pages/services/pages
 */

var requestUtil = require('../../lib/request');

/**
 * 微信登录
 * @param {string} code - wx.login 拿到的 code
 */
var gbLoginIndex = function (code) {
  return requestUtil.get('gbdistributeruser/gbLoginIndex/' + code);
};

/**
 * 注册（上传头像文件）
 * @param {string} filePath - 头像临时路径
 * @param {string} restaurantName - 餐厅名称
 * @param {string} code - wx.login code
 * @param {string} phone - 联系电话
 * @param {string} address - 地址
 */
var gbRegisterWithFile = function (filePath, restaurantName, code, phone, address) {
  return new Promise(function (resolve, reject) {
    wx.uploadFile({
      url: requestUtil.apiUrl + 'gbdistributeruser/gbRegisterWithFile',
      filePath: filePath,
      name: 'file',
      header: {
        'Content-Type': 'multipart/form-data'
      },
      formData: {
        restaurantName: restaurantName,
        code: code,
        phone: phone,
        address: address
      },
      success: function (res) {
        if (res.statusCode === 200) {
          resolve({ result: res.data });
        } else {
          reject(res);
        }
      },
      fail: function (e) {
        reject(e);
      }
    });
  });
};

module.exports = {
  gbLoginIndex: gbLoginIndex,
  gbRegisterWithFile: gbRegisterWithFile,
};
