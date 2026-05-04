/**
 * 批发商商品 Gb 接口（门店子包）
 * saveLinshiGoodsGb：与后端 Multipart 接口一致，file 可选；无图时走表单 POST。
 */

var config = require('../../config/index.js');

function parseGbDisGoodsEntity(body) {
  if (body == null) {
    return null;
  }
  if (typeof body === 'object') {
    return body;
  }
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * @param {string|string[]|''} filePathList 临时图片路径，可为空数组或空字符串
 * @param {number|string|undefined} depFatherId 父级部门 id，可选
 * @returns {Promise<{ result: any, item: object|null }>}
 */
function saveLinshiGoodsGb(filePathList, goodsName, standard, detail, disId, toDepId, depId, depFatherId) {
  var firstPath = Array.isArray(filePathList) && filePathList.length
    ? filePathList[0]
    : filePathList;
  var hasFile = !!(firstPath && String(firstPath).length > 0);
  var depFatherIdStr =
    depFatherId != null && depFatherId !== '' ? String(depFatherId) : '';

  return new Promise(function (resolve, reject) {
    function onSuccess(res) {
      var item = parseGbDisGoodsEntity(res.data);
      resolve({ result: res.data, item: item });
    }

    var form = {
      goodsName: goodsName != null ? String(goodsName) : '',
      standard: standard != null ? String(standard) : '',
      detail: detail != null ? String(detail) : '',
      disId: disId,
      toDepId: toDepId,
      depId: depId,
      depFatherId: depFatherIdStr,
    };

    if (hasFile) {
      wx.uploadFile({
        url: config.apiUrl + 'gbdistributergoods/saveLinshiGoodsGb',
        filePath: firstPath,
        name: 'file',
        formData: {
          goodsName: form.goodsName,
          standard: form.standard,
          detail: form.detail,
          disId: String(form.disId),
          toDepId: String(form.toDepId),
          depId: String(form.depId),
          depFatherId: depFatherIdStr,
        },
        header: {
          'Content-Type': 'multipart/form-data',
        },
        success: onSuccess,
        fail: reject,
      });
    } else {
      wx.request({
        url: config.apiUrl + 'gbdistributergoods/saveLinshiGoodsGb',
        method: 'POST',
        header: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
        data: form,
        success: onSuccess,
        fail: reject,
      });
    }
  });
}

module.exports = {
  saveLinshiGoodsGb: saveLinshiGoodsGb,
};
