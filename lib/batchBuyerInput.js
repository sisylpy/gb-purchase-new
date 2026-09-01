/**
 * 供货商是否已打开批次（sellUserRead 后 status >= 0）。
 */
function isSupplierReadBatch(batch) {
  if (!batch) {
    return false;
  }
  var status = Number(batch.gbDpbStatus);
  return !isNaN(status) && status >= 0;
}

/** 批次是否已绑定传统供货商或 NX 配送商。 */
function isSupplierInvolved(batch) {
  if (!batch) {
    return false;
  }
  var sellOpenId = batch.gbDpbSellUserOpenId;
  var supplierId = Number(batch.gbDpbSupplierId);
  var nxDisId = Number(batch.gbDpbNxDistributerId);
  return (sellOpenId != null && String(sellOpenId).trim() !== '')
    || (!isNaN(supplierId) && supplierId > 0)
    || (!isNaN(nxDisId) && nxDisId > 0)
    || !!batch.nxJrdhSupplierEntity;
}

/**
 * 是否为 NX distribute 配送商批次。
 * 新批次优先读取批次上的配送商 ID；供货关系和接单用户用于兼容历史数据。
 */
function isNxDistributerBatch(batch) {
  if (!batch) {
    return false;
  }
  var supplier = batch.nxJrdhSupplierEntity || {};
  var supplierUser = supplier.jrdhUserEntity || {};
  var sellerUser = batch.nxJrdhSellerEntity || {};
  var nxDisIds = [
    batch.gbDpbNxDistributerId,
    supplier.nxJrdhsNxDistributerId,
    supplierUser.nxJrdhNxDistributerId,
    sellerUser.nxJrdhNxDistributerId,
  ];
  return nxDisIds.some(function (id) {
    var value = Number(id);
    return !isNaN(value) && value > 0;
  });
}

/** 配送商是否已经对这个采购商品出库。 */
function isPurchaseGoodsOutbound(purchaseGoods) {
  if (!purchaseGoods) {
    return false;
  }
  if (Number(purchaseGoods.gbDpgOrdersWeightAmount) > 0) {
    return true;
  }
  var orders = Array.isArray(purchaseGoods.gbDepartmentOrdersEntities)
    ? purchaseGoods.gbDepartmentOrdersEntities
    : [];
  return orders.some(function (order) {
    var buyStatus = Number(order && order.gbDoBuyStatus);
    return !isNaN(buyStatus) && buyStatus >= 4;
  });
}

/** 配送商是否已经回复；回复后餐馆端不能再删除订货。 */
function hasSupplierReplied(batch) {
  if (!batch) {
    return false;
  }
  var replyTime = batch.gbDpbSellerReplyFullTime;
  if (replyTime != null && String(replyTime).trim() !== '') {
    return true;
  }
  var status = Number(batch.gbDpbStatus);
  return isSupplierInvolved(batch) && !isNaN(status) && status >= 1;
}

/**
 * 采购员代录入已提交（待收货）且供货商未介入：需先解锁才能再改/删。
 */
function needsBuyerUnlockBatch(batch) {
  if (!batch) {
    return false;
  }
  var status = Number(batch.gbDpbStatus);
  return status === 2 && !isSupplierInvolved(batch);
}

/**
 * 采购员代录入：是否仍可修改称重/单价（未提交或已解锁后的备货中）。
 */
function canBuyerProxyEditBatch(batch) {
  if (!batch) {
    return false;
  }
  var status = Number(batch.gbDpbStatus);
  if (isNaN(status) || status >= 2) {
    return false;
  }
  return true;
}

module.exports = {
  isSupplierReadBatch: isSupplierReadBatch,
  isSupplierInvolved: isSupplierInvolved,
  isNxDistributerBatch: isNxDistributerBatch,
  isPurchaseGoodsOutbound: isPurchaseGoodsOutbound,
  hasSupplierReplied: hasSupplierReplied,
  needsBuyerUnlockBatch: needsBuyerUnlockBatch,
  canBuyerProxyEditBatch: canBuyerProxyEditBatch,
};
