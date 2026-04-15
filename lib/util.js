/**
 * 通用工具函数
 * @module lib/util
 */

/**
 * 防抖函数
 */
function debounce(fn, delay) {
  if (typeof delay === 'undefined') delay = 300;
  var timer = null;
  return function () {
    var args = arguments;
    var context = this;
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () {
      fn.apply(context, args);
    }, delay);
  };
}

/**
 * 节流函数
 */
function throttle(fn, interval) {
  if (typeof interval === 'undefined') interval = 300;
  var lastTime = 0;
  return function () {
    var args = arguments;
    var context = this;
    var now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(context, args);
    }
  };
}

/**
 * 深拷贝
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 手机号脱敏 138****1234
 */
function maskPhone(phone) {
  if (!phone || phone.length !== 11) return phone || '';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

/**
 * 金额格式化
 */
function formatMoney(amount, digits) {
  if (typeof digits === 'undefined') digits = 2;
  if (typeof amount !== 'number' || isNaN(amount)) return '0.00';
  return amount.toFixed(digits);
}

/**
 * 生成唯一 ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * 判断是否为空值
 */
function isEmpty(value) {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0) return true;
  return false;
}

module.exports = {
  debounce: debounce,
  throttle: throttle,
  deepClone: deepClone,
  maskPhone: maskPhone,
  formatMoney: formatMoney,
  generateId: generateId,
  isEmpty: isEmpty,
};
