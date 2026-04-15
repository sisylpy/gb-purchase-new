/**
 * 数据格式化工具
 * @module lib/formatter
 */

function formatPrice(amount, digits) {
  if (typeof digits === 'undefined') digits = 2;
  if (typeof amount !== 'number' || isNaN(amount)) return '\u00a50.00';
  return '\u00a5' + amount.toFixed(digits);
}

function formatWeight(weight, unit) {
  if (typeof unit === 'undefined') unit = 'kg';
  if (weight === null || weight === undefined || weight === '0.0' || weight === '') return '-';
  return weight + unit;
}

function formatSpec(weight, standardName) {
  if (weight && weight.length > 0 && weight !== 'null') {
    return '(' + weight + '/' + standardName + ')';
  }
  return '(' + standardName + ')';
}

module.exports = {
  formatPrice: formatPrice,
  formatWeight: formatWeight,
  formatSpec: formatSpec,
};
