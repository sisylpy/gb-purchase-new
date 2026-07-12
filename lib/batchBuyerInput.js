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

/**
 * 供货商是否已通过小程序提交批次（完成时写入 gbDpbSellUserOpenId）。
 */
function isSupplierInvolved(batch) {
  if (!batch) {
    return false;
  }
  var sellOpenId = batch.gbDpbSellUserOpenId;
  return sellOpenId != null && String(sellOpenId).trim() !== '';
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
  needsBuyerUnlockBatch: needsBuyerUnlockBatch,
  canBuyerProxyEditBatch: canBuyerProxyEditBatch,
};
