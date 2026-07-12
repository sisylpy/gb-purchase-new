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

      // summary 汇总信息
      var summary = cd2.summary || {};
      var goodsName = summary.goodsName || '';
      var unit = summary.unit || '';
      var totalPurchaseQuantity = summary.totalPurchaseQuantity != null ? String(summary.totalPurchaseQuantity) : '0';
      var totalPurchaseAmount = summary.totalPurchaseAmount != null ? Number(summary.totalPurchaseAmount).toFixed(2) : '0.00';
      var purchaseLineCount = summary.purchaseLineCount != null ? Number(summary.purchaseLineCount) : 0;

      // 采购明细行
      var rawLines = cd2.lines && Array.isArray(cd2.lines) ? cd2.lines : [];
      var isEmpty = cd2.status === 'EMPTY' || rawLines.length === 0;

      // 预处理 lines：格式化数字字段
      var lines = [];
      for (var i = 0; i < rawLines.length; i++) {
        var it = rawLines[i];
        var sourceTag = '';
        var rightLabel = '采购人';
        var rightValue = it.purchaserName || '';
        if (it.supplierDisplayStatus === 'SELF_PURCHASE') {
          sourceTag = '自采';
        } else if (it.supplierName) {
          sourceTag = '供货商';
          rightLabel = '供货商';
          rightValue = it.supplierName;
        }
        lines.push(Object.assign({}, it, {
          _qtyDisplay: (it.quantity != null ? it.quantity : '') + (it.unit || ''),
          _priceDisplay: it.unitPrice != null ? Number(it.unitPrice).toFixed(2) : '0.00',
          _amountDisplay: it.amount != null ? Number(it.amount).toFixed(2) : '0.00',
          _sourceTag: sourceTag,
          _rightLabel: rightLabel,
          _rightValue: rightValue,
        }));
      }

      // 标题：优先 cardData 顶层 title，回退 goodsName
      var title = cd2.title || goodsName || '采购商品';

      that.setData({
        _isEmpty: isEmpty,
        _goodsName: goodsName,
        _unit: unit,
        _totalPurchaseQuantity: totalPurchaseQuantity,
        _totalPurchaseAmount: totalPurchaseAmount,
        _purchaseLineCount: purchaseLineCount,
        _lines: lines,
        _lineCount: rawLines.length,
        _title: title,
        _timeLabel: cd2.timeLabel || '',
        _scopeLabel: cd2.scopeLabel || '',
        _emptyReason: cd2.emptyReason || '该时间范围内暂无采购记录',
      });
    },
  },
  methods: {},
});
