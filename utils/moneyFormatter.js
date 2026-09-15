/**
 * 统一 CNY 金额展示格式化（新项目唯一金额格式源）。
 *
 * 规则：固定 2 位小数 + 千分位 + ¥ 前缀；不做 stripTrailingZeros。
 *   6.699999999999999 → ¥6.70
 *   0               → ¥0.00
 *   120             → ¥120.00
 *   1234.5          → ¥1,234.50
 *
 * 所有 CNY 金额（Stock Reduce Summary 卡、以及后续需要统一金额展示处）统一走本方法，
 * 不在文案里单独 round、不做字符串截断、不为 Stock Reduce 造第二套金额格式。
 */
function formatCny(amount) {
  if (amount === undefined || amount === null || amount === '') {
    return '';
  }
  var num = Number(amount);
  if (isNaN(num)) {
    return String(amount);
  }
  var sign = num < 0 ? '-' : '';
  var abs = Math.abs(num);
  var parts = abs.toFixed(2).split('.');
  var intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return sign + '¥' + intPart + '.' + parts[1];
}

module.exports = {
  formatCny: formatCny,
};
