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

      // 基础信息
      var goodsName = cd2.goodsName || '';
      var stockSnapshotLabel = cd2.stockSnapshotLabel || '';
      var title = cd2.title || (goodsName ? goodsName + ' · 库存批次' : '库存批次');

      // summary
      var summary = cd2.summary || {};
      var activeBatchCount = summary.activeBatchCount != null ? summary.activeBatchCount : 0;

      // 按单位分组的批次
      var rawGroups = cd2.batchesByUnit && Array.isArray(cd2.batchesByUnit) ? cd2.batchesByUnit : [];
      var isEmpty = rawGroups.length === 0;

      // 预处理每组、每批次：格式化数字
      var unitGroups = [];
      for (var g = 0; g < rawGroups.length; g++) {
        var group = rawGroups[g];
        var rawBatches = group.batches && Array.isArray(group.batches) ? group.batches : [];
        var batches = [];
        for (var b = 0; b < rawBatches.length; b++) {
          var bt = rawBatches[b];
          var unitPrice = bt.unitPrice != null ? Number(bt.unitPrice).toFixed(2) : '0.00';
          var unit = bt.unit || group.unit || '';
          var restQty = bt.restQty != null ? String(bt.restQty) : '0';
          var inboundQty = bt.inboundQty != null ? String(bt.inboundQty) : '0';
          var inboundDateDisplay = bt.inboundDate || '';

          // 消耗明细行
          var consumeItems = [];
          var consumeFields = [
            { key: 'produceQty', label: '生产领用' },
            { key: 'wasteQty', label: '报损' },
            { key: 'lossQty', label: '损耗' },
            { key: 'returnQty', label: '退货' },
            { key: 'employeeMealQty', label: '员工餐' },
            { key: 'otherConsumedQty', label: '其他消耗' },
          ];
          for (var c = 0; c < consumeFields.length; c++) {
            var cf = consumeFields[c];
            var val = bt[cf.key];
            if (val != null && Number(val) !== 0) {
              consumeItems.push({ label: cf.label, value: String(val), unit: unit });
            }
          }

          // 是否账实相符
          var balanceOk = bt.balanceOk !== false;
          var balanceDiff = bt.balanceDifference != null ? String(bt.balanceDifference) : '0';

          batches.push({
            stockBatchId: bt.stockBatchId,
            _inboundDate: inboundDateDisplay,
            _inboundQty: inboundQty,
            _restQty: restQty,
            _unitPrice: unitPrice,
            _unit: unit,
            _consumeItems: consumeItems,
            _balanceOk: balanceOk,
            _balanceDiff: balanceDiff,
            _raw: bt,
          });
        }
        unitGroups.push({
          unit: group.unit || '—',
          batchCount: group.batchCount || batches.length,
          batches: batches,
        });
      }

      that.setData({
        _title: title,
        _subtitle: stockSnapshotLabel,
        _goodsName: goodsName,
        _activeBatchCount: activeBatchCount,
        _unitGroups: unitGroups,
        _isEmpty: isEmpty,
        _emptyReason: cd2.emptyReason || '该时间范围内暂无库存批次',
      });
    },
  },
  methods: {},
});
