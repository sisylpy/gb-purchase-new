var AUTO_SUPPLIER_TYPE = 21;

function numberEquals(value, expected) {
  return value !== null && value !== undefined && Number(value) === expected;
}

function getOrderGoods(order) {
  if (!order || typeof order !== 'object') return null;
  return order.gbDistributerGoodsEntity || order.disgoods || null;
}

function isAutoSupplierOrder(order) {
  if (!order || typeof order !== 'object') return false;
  var goods = getOrderGoods(order);
  var orderMarkedAuto = numberEquals(order.gbDoGoodsType, AUTO_SUPPLIER_TYPE)
    || numberEquals(order.gbDoOrderType, AUTO_SUPPLIER_TYPE);
  var goodsMarkedAuto = goods && numberEquals(goods.gbDgGoodsType, AUTO_SUPPLIER_TYPE);
  var supplierId = goods && goods.gbDgGbSupplierId;
  var hasSupplier = supplierId !== null && supplierId !== undefined && Number(supplierId) > 0;
  return orderMarkedAuto || (goodsMarkedAuto && hasSupplier);
}

function orderGoodsName(order) {
  var goods = getOrderGoods(order);
  return (goods && goods.gbDgGoodsName) || (order && order.gbDoGoodsName) || '该商品';
}

function isAutoSupplierPurchase(purchaseGoods) {
  if (!purchaseGoods || typeof purchaseGoods !== 'object') return false;
  var goods = purchaseGoods.gbDistributerGoodsEntity || {};
  var supplierId = purchaseGoods.gbDgGbSupplierId;
  if (supplierId === null || supplierId === undefined) {
    supplierId = goods.gbDgGbSupplierId;
  }
  return Number(supplierId) > 0
    && (numberEquals(goods.gbDgGoodsType, AUTO_SUPPLIER_TYPE)
      || purchaseGoods.gbDgGbSupplierId !== null && purchaseGoods.gbDgGbSupplierId !== undefined);
}

function purchaseGoodsName(purchaseGoods) {
  if (!purchaseGoods || typeof purchaseGoods !== 'object') return '该商品';
  var goods = purchaseGoods.gbDistributerGoodsEntity || {};
  return purchaseGoods.gbDistributerGoodsName || goods.gbDgGoodsName || '该商品';
}

function chooseMode(autoEnabled, goodsName) {
  if (!autoEnabled) {
    return Promise.resolve(false);
  }

  return new Promise(function (resolve, reject) {
    wx.showActionSheet({
      alertText: '请选择如何处理这条自动订货',
      itemList: ['仅取消本次配送', '永久取消自动订货'],
      success: function (res) {
        if (res.tapIndex === 0) {
          resolve(false);
          return;
        }
        wx.showModal({
          title: '永久取消自动订货',
          content: '将取消本次配送，把“' + goodsName + '”退回未采购，并关闭以后的自动订货。',
          confirmText: '永久取消',
          confirmColor: '#e64340',
          cancelText: '返回',
          success: function (modalRes) {
            if (modalRes.confirm) {
              resolve(true);
            } else {
              reject({ cancelled: true });
            }
          },
          fail: reject,
        });
      },
      fail: reject,
    });
  });
}

/**
 * 自动订货取消选择：false 仅取消本次配送，true 同时永久关闭该商品自动订货。
 * 精彩账本原始订单始终保留并退回未采购。
 */
function chooseDeleteMode(order) {
  return chooseMode(isAutoSupplierOrder(order), orderGoodsName(order));
}

function choosePurchaseDeleteMode(purchaseGoods) {
  return chooseMode(isAutoSupplierPurchase(purchaseGoods), purchaseGoodsName(purchaseGoods));
}

module.exports = {
  isAutoSupplierOrder: isAutoSupplierOrder,
  isAutoSupplierPurchase: isAutoSupplierPurchase,
  chooseDeleteMode: chooseDeleteMode,
  choosePurchaseDeleteMode: choosePurchaseDeleteMode,
};
