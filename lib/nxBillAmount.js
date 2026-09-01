/**
 * 生成 NX 配送账单金额展示数据。
 *
 * 只有配送商完成订单、purchaseBatch 进入待收货及后续状态，并且已经关联
 * nx_department_bill 后，精彩账本才可以展示优惠与应付金额。
 */

function moneyText(value) {
  var amount = Number(value);
  return isNaN(amount) ? '0.00' : amount.toFixed(2);
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function build(batch) {
  if (!batch) return null;

  var status = Number(batch.gbDpbStatus);
  var nxBillId = Number(batch.gbDpbNxBillId);
  if (isNaN(status) || status < 2 || isNaN(nxBillId) || nxBillId <= 0) {
    return null;
  }

  var goodsAmount = Number(batch.gbDpbSubtotal);
  var discountAmount = Number(batch.gbDpbNxCouponDiscountAmount);
  var deliveryFee = Number(batch.gbDpbNxDeliveryFee);
  var payAmount = Number(batch.gbDpbPaySubtotal);

  goodsAmount = isNaN(goodsAmount) ? 0 : goodsAmount;
  discountAmount = isNaN(discountAmount) ? 0 : discountAmount;
  deliveryFee = isNaN(deliveryFee) ? 0 : deliveryFee;
  if (isNaN(payAmount)) {
    payAmount = Math.max(0, goodsAmount + deliveryFee - discountAmount);
  }

  return {
    nxBillId: nxBillId,
    goodsAmount: moneyText(goodsAmount),
    discountAmount: moneyText(discountAmount),
    deliveryFee: moneyText(deliveryFee),
    payAmount: moneyText(payAmount),
    couponName: batch.gbDpbNxCouponName || '',
    hasCouponDiscount: discountAmount > 0,
    showDeliveryFee: hasValue(batch.gbDpbNxDeliveryFee),
  };
}

module.exports = {
  build: build,
};
