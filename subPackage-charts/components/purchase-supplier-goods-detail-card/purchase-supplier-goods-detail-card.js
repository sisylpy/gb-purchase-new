/**
 * 供货商采购明细卡 — 单一商品在某时间/组织范围内，各供货商的采购明细
 *
 * cardData（由 cardNormalizer.resolvePurchaseSupplierGoodsDetailCardData 预构建）：
 * {
 *   title, goodsName, timeLabel, scopeLabel,
 *   status: 'OK' | 'EMPTY',
 *   emptyReason,
 *   suppliers: [
 *     { key, supplierName, purchaseAmount, quantity, unitPrice, purchaseCount, unit, isFocus }
 *   ]
 * }
 */
Component({
  properties: {
    cardData: {
      type: Object,
      value: null,
    },
  },
  data: {},
  observers: {
    'cardData': function (cd) {
      var that = this;
      var cd2 = cd || {};

      function fmtMoney(v) {
        var n = parseFloat(v);
        if (isNaN(n)) return v != null && v !== '' ? String(v) : '0.00';
        return n.toFixed(2);
      }
      function fmtPrice(v) {
        var n = parseFloat(v);
        if (isNaN(n)) return v != null && v !== '' ? String(v) : '0.0000';
        return n.toFixed(4);
      }
      function fmtInt(v) {
        var n = parseFloat(v);
        if (isNaN(n)) return v != null && v !== '' ? String(v) : '0';
        return String(Math.round(n));
      }

      var suppliers = (cd2.suppliers || []).map(function (s) {
        var unit = s.unit || '';
        return {
          key: s.key,
          supplierName: s.supplierName || '（未命名供应商）',
          isFocus: !!s.isFocus,
          amountDisplay: fmtMoney(s.purchaseAmount) + '元',
          qtyDisplay: fmtInt(s.quantity) + (unit ? unit : ''),
          priceDisplay: fmtPrice(s.unitPrice) + (unit ? ('元/' + unit) : '元'),
          countDisplay: fmtInt(s.purchaseCount) + '笔',
        };
      });

      var status = cd2.status || (suppliers.length ? 'OK' : 'EMPTY');
      var isEmpty = status === 'EMPTY' || suppliers.length === 0;
      var title = cd2.title
        || (cd2.goodsName ? (cd2.goodsName + ' · 供货商采购明细') : '供货商采购明细');

      that.setData({
        _title: title,
        _goodsName: cd2.goodsName || '',
        _timeLabel: cd2.timeLabel || '',
        _scopeLabel: cd2.scopeLabel || '',
        _isEmpty: isEmpty,
        _emptyReason: cd2.emptyReason || '该时间范围内暂无该商品的供货商采购明细',
        _suppliers: suppliers,
        _supplierCount: suppliers.length,
      });
    },
  },
  methods: {},
});
