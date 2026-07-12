/** 供货商端微信小程序订阅消息模板 ID（与后端 WxSubscribeTemplateIds 一致） */
const ORDER_NEW = 'CgludlqVZc_vmFaZUgVFC-iprkydrtOfF_GcODltpTc';
const ORDER_CHANGE = 'wCtYVih8kAdCHjfaYL1qwOtQnmQEKAGO_EgRmlB6cOE';
const ORDER_RETURN = 'TE6HIkd7LRQ08zdnQXowRjZu8OBK0eGEd368p2NtTeA';

/** 供货商端需一次性授权的三个模板 */
const SUPPLIER_SUBSCRIBE_TMPL_IDS = [ORDER_CHANGE, ORDER_RETURN, ORDER_NEW];

module.exports = {
  ORDER_NEW,
  ORDER_CHANGE,
  ORDER_RETURN,
  SUPPLIER_SUBSCRIBE_TMPL_IDS,
};
