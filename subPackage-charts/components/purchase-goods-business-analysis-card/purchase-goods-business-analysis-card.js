Component({
  properties: {
    cardData: {
      type: Object,
      value: null,
    },
    /** 卡片类型（用于记入工作记录） */
    cardType: {
      type: String,
      value: '',
    },
    /** 所属消息 ID */
    messageId: {
      type: Number,
      value: null,
    },
    /** 所属 Run ID */
    runId: {
      type: Number,
      value: null,
    },
    /** 只读模式（来源卡展示时隐藏行级操作按钮） */
    readonly: {
      type: Boolean,
      value: false,
    },
  },
  data: {},
  observers: {
    'cardData': function (cd) {
      var that = this;
      var cdData = cd || {};
      var payload = cdData.payload || cdData || {};
      var status = payload.status || 'SUCCESS';

      // ===== 商品名称（优先 purchaseSourceSection）=====
      var ps = payload.purchaseSourceSection || {};
      var goodsName = ps.goodsName || payload.goodsName || '';
      var queryGoodsName = payload.goodsName || '';
      var showQueryName = !!(queryGoodsName && queryGoodsName !== goodsName);

      // ===== 门店名称（去掉 "门店：" 前缀）=====
      var scopeLabel = payload.scopeLabel || '';
      var scopeName = scopeLabel.replace('门店：', '') || '—';

      var timeLabel = payload.purchaseTimeLabel || cdData.subtitle || '';

      // ===== 数据截至日期 =====
      var inv = payload.inventorySection || {};
      var stockAsOfDate = inv.stockAsOfDate || '';
      var salesBaselineStop = (payload.salesMatchSection && payload.salesMatchSection.salesBaselineStopDate) || '';
      var dataAsOfDate = stockAsOfDate || salesBaselineStop || '';

      // ===== 采购来源标签 =====
      var dsLabelMap = { 'SELF': '自采为主', 'SUPPLIER': '供应商为主', 'OTHER': '其他为主', 'MIXED': '混合采购' };
      var dsLabel = dsLabelMap[ps.dominantPurchaseSource || payload.dominantPurchaseSource] || '—';

      // ===== 采购来源金额 =====
      var selfAmt = ps.selfPurchaseAmount != null ? Number(ps.selfPurchaseAmount).toFixed(2) : '0.00';
      var supplierAmt = ps.supplierPurchaseAmount != null ? Number(ps.supplierPurchaseAmount).toFixed(2) : '0.00';
      var otherAmt = ps.otherPurchaseAmount != null ? Number(ps.otherPurchaseAmount).toFixed(2) : '0.00';
      var totalPurchaseAmount = ps.totalPurchaseAmount != null ? Number(ps.totalPurchaseAmount).toFixed(2) : '0.00';
      var totalPurchaseQuantity = ps.totalPurchaseQuantity != null ? Number(ps.totalPurchaseQuantity) : 0;
      var totalLineCount = ps.totalPurchaseLineCount != null ? Number(ps.totalPurchaseLineCount) : 0;

      // ===== 采购量 / 理论消耗 / 库存支撑 =====
      var pv = payload.purchaseVolumeSection || {};
      var purchaseToTheoryRatio = pv.purchaseToTheoryRatio != null ? Number(pv.purchaseToTheoryRatio) : null;
      var theoreticalConsumptionQty = pv.theoreticalConsumptionQty != null ? Number(pv.theoreticalConsumptionQty) : null;

      // ===== 库存快照 =====
      var currentStockQty = inv.currentStockQty != null ? Number(inv.currentStockQty) : null;
      var stockUnit = inv.stockUnit || '';
      var firstImpactedDishName = inv.firstImpactedDishName || '';
      var firstImpactedCoverDays = inv.firstImpactedCoverDays != null ? Number(inv.firstImpactedCoverDays) : null;

      var hasStock = !!(currentStockQty != null);
      var stockAsOfDateVal = inv.stockAsOfDate || '';
      var hasCoverDays = !!(firstImpactedCoverDays != null);

      // ===== 用量匹配面板 =====
      var matchTheoryQty = theoreticalConsumptionQty;
      var ratioVal = purchaseToTheoryRatio;
      var ratioText = ratioVal != null ? ratioVal.toFixed(1) : '—';

      // 显示的字符串（预计算，WXML 不支持字符串拼接）
      var theoryQtyDisplay = theoreticalConsumptionQty != null ? String(theoreticalConsumptionQty) : '—';
      var coverDaysDisplay = firstImpactedCoverDays != null ? String(firstImpactedCoverDays) : '—';

      // 理论消耗显示（带单位）
      var matchTheoryQtyDisplay = '';
      if (matchTheoryQty != null) {
        matchTheoryQtyDisplay = String(matchTheoryQty) + ' ' + stockUnit;
      } else {
        matchTheoryQtyDisplay = '—';
      }
      var matchTotalQtyDisplay = String(totalPurchaseQuantity) + ' ' + stockUnit;

      // 采购/理论比标签
      var ratioTag = '';
      var ratioTagHigh = false;
      var ratioTagLow = false;
      var ratioTagNormal = false;
      if (ratioVal != null) {
        if (ratioVal > 1.5) { ratioTag = '采购偏高'; ratioTagHigh = true; }
        else if (ratioVal < 0.7) { ratioTag = '采购偏低'; ratioTagLow = true; }
        else { ratioTag = '基本合理'; ratioTagNormal = true; }
      }

      // ===== 关联菜品 =====
      var dishRows = payload.dishRows && Array.isArray(payload.dishRows) ? payload.dishRows : [];
      var sm = payload.salesMatchSection || {};
      var linkedDishCount = sm.linkedDishCount != null ? Number(sm.linkedDishCount) : dishRows.length;
      var hasDishRows = dishRows.length > 0;

      // ===== 判断信号（按 severity 分组）=====
      var signals = payload.judgmentSignals && Array.isArray(payload.judgmentSignals) ? payload.judgmentSignals : [];
      var signalWarnList = [];
      var signalErrorList = [];
      var signalInfoList = [];
      var signalLabelMap = {
        'PURCHASE_SOURCE_SELF_ONLY': '纯自采模式',
        'PURCHASE_VOLUME_BELOW_THEORY': '采购低于理论用量',
        'PURCHASE_VOLUME_ABOVE_THEORY': '采购高于理论用量',
        'LOW_STOCK_COVER_DAYS': '库存支撑偏低',
        'HIGH_STOCK_COVER_DAYS': '库存积压风险',
        'PRICE_UP_TREND': '价格呈上涨趋势',
        'PRICE_DOWN_TREND': '价格呈下跌趋势',
      };
      for (var si = 0; si < signals.length; si++) {
        var s = signals[si];
        var item = {
          code: s.code,
          label: signalLabelMap[s.code] || s.code,
          severity: s.severity || 'INFO',
        };
        if (item.severity === 'WARN') signalWarnList.push(item);
        else if (item.severity === 'ERROR') signalErrorList.push(item);
        else signalInfoList.push(item);
      }

      var hasSignals = signalWarnList.length + signalErrorList.length + signalInfoList.length > 0;

      // ===== knownGaps =====
      var knownGaps = payload.knownGaps && Array.isArray(payload.knownGaps) ? payload.knownGaps : [];
      var hasGaps = knownGaps.length > 0;

      that.setData({
        _goodsName: goodsName,
        _queryGoodsName: queryGoodsName,
        _showQueryName: showQueryName,
        _dominantSourceLabel: dsLabel,
        _scopeName: scopeName,
        _timeLabel: timeLabel,
        _dataAsOfDate: dataAsOfDate,

        // 采购来源金额
        _selfAmt: selfAmt,
        _supplierAmt: supplierAmt,
        _otherAmt: otherAmt,
        _totalAmount: totalPurchaseAmount,

        // 核心指标
        _totalQuantity: String(totalPurchaseQuantity),
        _totalLineCount: String(totalLineCount),
        _theoryQtyDisplay: theoryQtyDisplay,

        // 库存
        _hasStock: hasStock,
        _currentStockQty: String(currentStockQty != null ? currentStockQty : ''),
        _stockUnit: stockUnit,
        _stockAsOfDate: stockAsOfDateVal,
        _firstImpactedDishName: firstImpactedDishName,
        _coverDaysDisplay: coverDaysDisplay,
        _hasCoverDays: hasCoverDays,

        // 用量匹配面板
        _matchTotalQtyDisplay: matchTotalQtyDisplay,
        _matchTheoryQtyDisplay: matchTheoryQtyDisplay,
        _ratioDisplay: ratioText + ' 倍',
        _ratioTag: ratioTag,
        _ratioTagHigh: ratioTagHigh,
        _ratioTagLow: ratioTagLow,
        _ratioTagNormal: ratioTagNormal,

        // 关联菜品表格
        _hasDishRows: hasDishRows,
        _linkedDishCount: linkedDishCount,
        _dishRows: dishRows,

        // 信号分组
        _hasSignals: hasSignals,
        _signalWarnList: signalWarnList,
        _signalErrorList: signalErrorList,
        _signalInfoList: signalInfoList,

        // 能力边界
        _hasGaps: hasGaps,
        _gapLabels: knownGaps,

        // 空状态
        _isEmpty: status === 'EMPTY' || status === 'ERROR',
        _emptyReason: payload.emptyReason || '暂无采购经营分析数据',
      });
    },
  },
  methods: {},
});
