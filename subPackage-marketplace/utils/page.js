function message(error, fallback) {
  return (error && error.message) || fallback || '操作失败，请稍后重试';
}

function showError(error, fallback) {
  wx.showToast({ title: message(error, fallback), icon: 'none', duration: 2600 });
}

function money(value) {
  var number = Number(value || 0);
  return isNaN(number) ? '0.00' : number.toFixed(2);
}

function quantity(value) {
  var number = Number(value || 0);
  return isNaN(number) ? 0 : number;
}

function orderStatus(value) {
  var map = { SUBMITTED: '已提交', PENDING_ACCEPT: '待商户接单', ACCEPTED: '商户已接单', PREPARING: '备货中', READY: '已备齐', COMPLETED: '已完成', CANCELLED: '已取消' };
  return map[value] || value || '处理中';
}

module.exports = { showError: showError, money: money, quantity: quantity, orderStatus: orderStatus };
