/**
 * stockGoodsBusiness 页面 HTTP 接口（原 lib/apiDepOrder）
 * 库存调整已统一为 saveDepGoodsStockAdjust，与 resGoodsAi 一致。
 */

var request = require('../../lib/request');

// ===== 部门商品 / 库存流水 =====

var getDepGoodsBusiness = function (data) {
  return request.post(
    'gbdepartmentgoodsstock/getDepGoodsBusiness',
    {
      depGoodsId: data.depGoodsId,
      startDate: data.startDate,
      stopDate: data.stopDate,
    },
    { useUrlParams: true }
  );
};

var deleteReduceItem = function (id) {
  return request.get('gbdepartmentgoodsstockreduce/deleteReduceItem/' + id);
};

/** 删除损耗/星级附件（与历史方法名 delAttem 对应，若后端路径不同请改此处） */
var deleteReduceAttachment = function (attachId) {
  return request.get('gbdepartmentgoodsstockreduceattachment/delAttem/' + attachId);
};

// ===== 部门库存统一调整（与 resGoodsAiApi 一致） =====

var saveDepGoodsStockAdjust = function (kind, stock) {
  return request.post('gbdepartmentdisgoods/saveDepGoodsStockAdjust', {
    kind: kind,
    stock: stock,
  });
};

// ===== gbdepartmentgoodsstock / 附件 =====

var changeStockStars = function (data) {
  return request.post('gbdepartmentgoodsstock/changeStockStars', data, { useUrlParams: true });
};

var reduceAttachmentSaveWithFile = function (filePathList, userName, id) {
  return request.uploadFile(
    'gbdepartmentgoodsstockreduceattachment/reduceAttachmentSaveWithFile',
    filePathList[0],
    'file',
    { userName: userName, id: id }
  );
};

var reduceAttachmentSaveWithFileStar = function (filePathList, userName, id, stars, userId) {
  return request.uploadFile(
    'gbdepartmentgoodsstock/reduceAttachmentSaveWithFileStar',
    filePathList[0],
    'file',
    { userName: userName, id: id, stars: stars, userId: userId }
  );
};

module.exports = {
  getDepGoodsBusiness: getDepGoodsBusiness,
  deleteReduceItem: deleteReduceItem,
  deleteReduceAttachment: deleteReduceAttachment,
  saveDepGoodsStockAdjust: saveDepGoodsStockAdjust,
  changeStockStars: changeStockStars,
  reduceAttachmentSaveWithFile: reduceAttachmentSaveWithFile,
  reduceAttachmentSaveWithFileStar: reduceAttachmentSaveWithFileStar,
};
