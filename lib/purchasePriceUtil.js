/**
 * 采购单价：无效值（空、0、0.0、0.00）统一视为未填写，便于用户手工录入。
 */
function normalizePurchasePrice(val) {
  if (val == null || val === "") {
    return "";
  }
  var s = String(val).trim();
  if (s === "" || s === "null") {
    return "";
  }
  var n = Number(s);
  if (isNaN(n) || n <= 0) {
    return "";
  }
  return s;
}

function hasValidPurchasePrice(val) {
  return normalizePurchasePrice(val) !== "";
}

/** 数量/单价输入：最多 1 位小数，上限 99999 */
function sanitizeDigitInput(raw, maxDecimals) {
  if (raw == null) {
    return "";
  }
  var value = String(raw);
  if (value.length === 0) {
    return "";
  }
  var dot = value.indexOf(".");
  if (dot !== -1 && value.length - dot > (maxDecimals || 1) + 1) {
    wx.showToast({ title: "小数点只能保留一位", icon: "none" });
    value = value.substring(0, value.length - 1);
  }
  if (Number(value) > 99999) {
    wx.showToast({ title: "最大不能超过九万九千九百九十九", icon: "none" });
    value = value.substring(0, value.length - 1);
  }
  return value;
}

module.exports = {
  normalizePurchasePrice: normalizePurchasePrice,
  hasValidPurchasePrice: hasValidPurchasePrice,
  sanitizeDigitInput: sanitizeDigitInput,
};
