/**
 * 菜品销量编辑页展示辅助
 */
var foodSalesDepUtil = require('./foodSalesDepUtil');

var WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

var SALES_TYPES = [
  { label: '正常销售', value: 1 },
  { label: '赠送', value: 4 },
  { label: '员工餐', value: 5 },
];

function parseDateDisplay(dateStr) {
  var d = String(dateStr || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return { dateDisplay: '', weekDisplay: '' };
  }
  var parts = d.split('-');
  var month = parseInt(parts[1], 10);
  var day = parseInt(parts[2], 10);
  var dateObj = new Date(parseInt(parts[0], 10), month - 1, day);
  var week = WEEKDAYS[dateObj.getDay()] || '';
  return {
    dateDisplay: month + '月' + day + '日',
    weekDisplay: week,
  };
}

function getDepParamsFromMendian(mi) {
  var p = foodSalesDepUtil.depFatherAndSubDepFromMendianInfo(mi);
  if (!p) return null;
  return { depFatherId: p.depFatherId, subDepId: p.subDepid };
}

module.exports = {
  WEEKDAYS: WEEKDAYS,
  SALES_TYPES: SALES_TYPES,
  parseDateDisplay: parseDateDisplay,
  getDepParamsFromMendian: getDepParamsFromMendian,
};
