/**
 * 生鲜参考价展示：0.1 / 0 / 空 视为待确认价
 */
function parsePrice(price) {
  if (price === null || price === undefined || price === '') return NaN;
  var n = Number(price);
  return isNaN(n) ? NaN : n;
}

function isValidDisplayPrice(price) {
  var n = parsePrice(price);
  return !isNaN(n) && n > 0.1;
}

function formatReferencePrice(price, unit) {
  if (!isValidDisplayPrice(price)) {
    return '待确认价';
  }
  var n = parsePrice(price);
  var text = n % 1 === 0 ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
  return unit ? ('参考价 ¥' + text + ' / ' + unit) : ('参考价 ¥' + text);
}

module.exports = {
  parsePrice: parsePrice,
  isValidDisplayPrice: isValidDisplayPrice,
  formatReferencePrice: formatReferencePrice
};
