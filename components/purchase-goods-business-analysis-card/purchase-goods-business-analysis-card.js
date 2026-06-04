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
      var cdData = cd || {};
      var payload = cdData.payload || cdData || {};
      var status = payload.status || 'SUCCESS';

      // ===== 采购来源 =====
      var ps = payload.purchaseSourceSection || {};
      var dsLabelMap = { 'SELF': '自采为主', 'SUPPLIER': '供应商为主', 'OTHER': '其他为主', 'MIXED': '混合采购' };
      var dsLabel = dsLabelMap[ps.dominantPurchaseSource || payload.dominantPurchaseSource] || '—';

      var sourcePills = [];
      function addPill(label, amount, qty) {
        var amt = amount != null ? Number(amount) : 0;
        var q = qty != null ? Number(qty) : 0;
        if (amt > 0 || q > 0) {
          sourcePills.push({
            label: label,
            amount: amt.toFixed(2),
            quantity: q,
          });
        }
      }
      addPill('自采', ps.selfPurchaseAmount, ps.selfPurchaseQuantity);
      addPill('供应商', ps.supplierPurchaseAmount, ps.supplierPurchaseQuantity);
      addPill('其他', ps.otherPurchaseAmount, ps.otherPurchaseQuantity);

      var totalPurchaseAmount = ps.totalPurchaseAmount != null ? Number(ps.totalPurchaseAmount).toFixed(2) : '0.00';
      var totalPurchaseQuantity = ps.totalPurchaseQuantity != null ? Number(ps.totalPurchaseQuantity) : 0;

      // ===== 采购量 =====
      var pv = payload.purchaseVolumeSection || {};
      var purchaseToTheoryRatio = pv.purchaseToTheoryRatio != null ? Number(pv.purchaseToTheoryRatio) : null;
      var theoreticalConsumptionQty = pv.theoreticalConsumptionQty != null ? Number(pv.theoreticalConsumptionQty) : null;
      var ratioPercent = purchaseToTheoryRatio != null ? (purchaseToTheoryRatio * 100).toFixed(1) : '—';

      // ===== 库存快照 =====
      var inv = payload.inventorySection || {};
      var currentStockQty = inv.currentStockQty != null ? Number(inv.currentStockQty) : null;
      var stockUnit = inv.stockUnit || '';
      var firstImpactedDishName = inv.firstImpactedDishName || '';
      var firstImpactedCoverDays = inv.firstImpactedCoverDays != null ? Number(inv.firstImpactedCoverDays) : null;

      // ===== 价格趋势 =====
      var priceSec = payload.priceSection || {};
      var hasPriceChange = priceSec.priceChangeRows && Array.isArray(priceSec.priceChangeRows) && priceSec.priceChangeRows.length > 0;
      var priceTrend = priceSec.priceTrend || 'UNKNOWN';
      var priceCompareLabel = priceSec.compareLabel || '';
      var priceTrendLabelMap = { 'UP': '↑ 上涨', 'DOWN': '↓ 下跌', 'STABLE': '→ 持平', 'UNKNOWN': '暂无数据' };
      var priceTrendLabel = priceTrendLabelMap[priceTrend] || '暂无数据';

      // ===== 关联菜品 =====
      var sm = payload.salesMatchSection || {};
      var dishRows = payload.dishRows && Array.isArray(payload.dishRows) ? payload.dishRows : [];
      var linkedDishCount = sm.linkedDishCount != null ? Number(sm.linkedDishCount) : dishRows.length;

      // ===== 判断信号 =====
      var signals = payload.judgmentSignals && Array.isArray(payload.judgmentSignals) ? payload.judgmentSignals : [];
      var signalLabelMap = {
        'PURCHASE_SOURCE_SELF_ONLY': '纯自采',
        'PURCHASE_VOLUME_BELOW_THEORY': '采购低于理论消耗',
        'PURCHASE_VOLUME_ABOVE_THEORY': '采购高于理论消耗',
      };
      var signalTags = [];
      for (var si = 0; si < signals.length; si++) {
        var s = signals[si];
        var label = signalLabelMap[s.code] || s.code;
        signalTags.push({
          code: s.code,
          label: label,
          severity: s.severity || 'INFO',
        });
      }

      // ===== knownGaps =====
      var knownGaps = payload.knownGaps && Array.isArray(payload.knownGaps) ? payload.knownGaps : [];
      var gapLabels = [];
      var gapLabelMap = {
        'near_expiry_not_in_v1': '暂不含临期/过期数据',
        'frequency_anomaly_not_in_v1': '暂不含采购频次异常',
        'quantity_anomaly_not_in_v1': '暂不含数量异常',
        'amount_spike_not_in_v1': '暂不含金额突增',
        'purchase_stock_reduce_mismatch_not_in_p1': '暂不含采购-库存核减比对',
      };
      for (var gi = 0; gi < knownGaps.length; gi++) {
        var gapLabel = gapLabelMap[knownGaps[gi]] || knownGaps[gi];
        if (gapLabel) gapLabels.push(gapLabel);
      }

      that.setData({
        _title: cdData.title || (payload.goodsName ? payload.goodsName + ' · 采购经营分析' : '采购经营分析'),
        _scopeLabel: payload.scopeLabel || '',
        _timeLabel: payload.purchaseTimeLabel || cdData.subtitle || '',
        _inventoryLabel: payload.inventorySnapshotLabel || '',
        _salesBaselineLabel: payload.salesBaselineLabel || '',
        _totalAmount: totalPurchaseAmount,
        _totalQuantity: totalPurchaseQuantity,
        _totalLineCount: ps.totalPurchaseLineCount != null ? Number(ps.totalPurchaseLineCount) : (pv.totalPurchaseLineCount != null ? Number(pv.totalPurchaseLineCount) : 0),
        _dominantSourceLabel: dsLabel,
        _sourcePills: sourcePills,
        _pvRatioPercent: ratioPercent,
        _pvTheoreticalQty: theoreticalConsumptionQty,
        _hasPriceChange: hasPriceChange,
        _priceTrend: priceTrend,
        _priceCompareLabel: priceCompareLabel,
        _priceTrendLabel: priceTrendLabel,
        _currentStockQty: currentStockQty,
        _stockUnit: stockUnit,
        _firstImpactedDishName: firstImpactedDishName,
        _firstImpactedCoverDays: firstImpactedCoverDays,
        _linkedDishCount: linkedDishCount,
        _dishRows: dishRows,
        _signalTags: signalTags,
        _gapLabels: gapLabels,
        _isEmpty: status === 'EMPTY',
        _emptyReason: payload.emptyReason || '暂无采购经营分析数据',
      });
    },
  },
  methods: {},
});
