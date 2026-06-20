/**
 * 采购员录入采购商品（purGoods 页面）接口
 * 从 services/apiDistributer.js 拷贝，路径与参数须与之一致。
 */

var request = require('../lib/request');
var config = require('../config/index');

/**
 * 获取采购商品信息（含价格）
 * POST gbdistributerpurchasegoods/purUserGetPurGoodsInfo
 */
var purUserGetPurGoodsInfo = function (data) {
  return request.post(
    'gbdistributerpurchasegoods/purUserGetPurGoodsInfo',
    {
      purUserId: data.purUserId,
      disGoodsId: data.disGoodsId,
    },
    { useUrlParams: true }
  );
};

/**
 * 完成采购商品入库
 * POST gbdistributerpurchasegoods/finishPurGoodsToStock
 */
var finishPurGoodsToStock = function (data) {
  return request.post('gbdistributerpurchasegoods/finishPurGoodsToStock', data);
};

module.exports = {
  purUserGetPurGoodsInfo: purUserGetPurGoodsInfo,
  finishPurGoodsToStock: finishPurGoodsToStock,
  server: config.server,
  apiUrl: config.apiUrl,
};
