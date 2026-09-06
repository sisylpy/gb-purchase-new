/**
 * 采购单 / checkout 结果展示文案
 */
var BILL_PAY = {
  NONE: 'NONE',
  AWAIT_FIRST_PAY: 'AWAIT_FIRST_PAY',
  PARTIAL_PAID: 'PARTIAL_PAID',
  AWAIT_SUPPLEMENT: 'AWAIT_SUPPLEMENT',
  PAID: 'PAID'
};

function buildSubmitSuccessContent(data) {
  return buildCheckoutConfirmContent(data);
}

function buildCheckoutConfirmContent(data) {
  var known = data.knownPayAmount || data.knownTotal || '0.00';
  var supplement = data.supplementDue || '0.00';
  var pending = data.pendingPriceItemCount != null
    ? data.pendingPriceItemCount
    : (data.pendingItemCount || 0);
  var paid = data.paidTotal != null && Number(data.paidTotal) > 0
    ? data.paidTotal
    : known;

  return {
    title: '结算成功',
    content: '采购单 #' + (data.billId || '') + ' 已生成，已知金额 ¥' + paid + ' 已支付。'
      + (pending > 0 ? ('其中 ' + pending + ' 项商品待称重确认，后续可能补款。') : ''),
    showPay: Number(supplement) > 0,
    payPhase: Number(supplement) > 0 ? 'SUPPLEMENT' : '',
    payLabel: Number(supplement) > 0 ? '去补款' : '查看采购单'
  };
}

/** billPending 页展示文案 */
function buildBillPendingView(bill) {
  var pending = bill.pendingPriceItemCount != null
    ? bill.pendingPriceItemCount
    : (bill.pendingItemCount || 0);
  var supplement = Number(bill.supplementDue || 0);
  var payState = bill.billPayState || bill.payStatus || '';
  if (payState === BILL_PAY.AWAIT_FIRST_PAY) {
    var due = bill.payAmount || bill.knownTotal || bill.knownPayAmount || '0.00';
    return {
      statusText: '待支付 ¥' + due,
      pendingNotice: '该采购单尚未完成首付，会阻塞新的购物车结算。本地测试可先清理该 bill，或后续接入 bill/payFirst 微信支付。'
    };
  }
  return {
    statusText: supplement > 0 ? '待补款' : '已知价已支付',
    pendingNotice: pending > 0
      ? '部分商品需称重确认，完成后可能产生补款（仅针对本单已有商品，不可追加新商品）'
      : ''
  };
}

function buildOutstandingBanner(info) {
  if (!info) return null;
  var supplement = Number(info.supplementDue || info.payAmount || 0);
  var payPhase = info.payPhase || '';
  if (payPhase === 'SUPPLEMENT' || supplement > 0) {
    return {
      text: info.message || ('您有待补款采购单 ¥' + (info.supplementDue || info.payAmount || '0.00') + '，请先补款后继续结算'),
      payPhase: 'SUPPLEMENT',
      billId: info.billId
    };
  }
  return {
    text: info.message || info.title || '您有未结清采购单，请先处理后再结算',
    payPhase: payPhase || 'BLOCK',
    billId: info.billId
  };
}

module.exports = {
  BILL_PAY: BILL_PAY,
  buildSubmitSuccessContent: buildSubmitSuccessContent,
  buildCheckoutConfirmContent: buildCheckoutConfirmContent,
  buildBillPendingView: buildBillPendingView,
  buildOutstandingBanner: buildOutstandingBanner
};
