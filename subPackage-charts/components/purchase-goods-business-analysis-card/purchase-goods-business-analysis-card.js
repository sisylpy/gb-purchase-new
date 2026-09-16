/**
 * 采购商品经营分析卡片（PURCHASE_GOODS_BUSINESS_ANALYSIS_CARD）
 *
 * 仅展示后端 PurchaseGoodsBusinessAnalysis 结果，不做重算/猜测：
 *  - 库存覆盖：综合支撑天数只在 forecastAvailability=USABLE 时展示；
 *  - 理论消耗为 base 单位（克/毫升/个）；采购单据没有可解析的数量单位时，
 *    不展示采购/理论比值，也不把采购明细条数当成采购量；
 *  - 明细行区分缺失/不可计算/真实零销量/正常，不使用 0.00 掩盖字段缺失。
 */
function textOrDash(v) {
  return v === null || v === undefined || v === '' ? '—' : String(v);
}

function isEmptyValue(v) {
  return v === null || v === undefined || v === '';
}

Component({
  properties: {
    cardData: {
      type: Object,
      value: null,
      observer: '_onCardDataChange',
    },
  },

  data: {
    visible: false,
    title: '',
    subtitle: '',
    goodsName: '',

    // 库存覆盖
    stockQty: '',
    stockUnit: '',
    coverAvailable: false,
    coverDaysText: '',
    coverBadgeText: '',
    coverLow: false,
    coverUnit: '',
    stockNote: '',
    stockStatusText: '',

    // 采购
    purchaseAmount: '',
    purchaseQty: '',
    purchaseCount: '',
    purchaseUnitText: '',
    theoryQty: '',
    theoryUnit: '',
    theoryLabel: '',
    theorySummary: '',
    theoryNote: '',
    ratioDisplay: '-',
    ratioTag: '',

    // 采购价格比较
    priceVisible: false,
    priceConclusion: '',
    currentAvgUnitPrice: '',
    previousAvgUnitPrice: '',
    priceChangePercent: '',
    priceChangeAvailable: false,
    compareLabel: '',

    // 明细
    dishRows: [],

    // 提示
    gapTexts: [],
    signalTexts: [],
  },

  methods: {
    _onCardDataChange: function (data) {
      if (!data) {
        this.setData({ visible: false });
        return;
      }
      // 上游 cardNormalizer 已将正式 Card payload 展平为 cardData。
      var payload = data;
      var inv = payload.inventoryFacts || {};
      var purchase = payload.purchaseFacts || {};
      var consumption = payload.consumptionFacts || {};
      var price = payload.priceFacts || {};
      var signals = (payload.businessSignals && Array.isArray(payload.businessSignals))
        ? payload.businessSignals : [];
      var dataGapMessages = (payload.dataGapMessages && Array.isArray(payload.dataGapMessages))
        ? payload.dataGapMessages : [];
      var rawRows = (payload.dishRows && Array.isArray(payload.dishRows))
        ? payload.dishRows : [];

      // ===== 库存覆盖：仅在预测完整（非 incomplete）时展示天数 =====
      var coverUsable = inv.forecastAvailability === 'USABLE';
      var coverDays = (coverUsable && !isEmptyValue(inv.combinedCoverDays))
        ? Number(inv.combinedCoverDays) : null;
      var coverAvailable = coverDays !== null && !isNaN(coverDays);
      var coverBadgeText = coverAvailable
        ? '综合可支撑'
        : (coverUsable ? '暂无可用天数' : '暂无法准确计算');

      var stockStatusText = '';
      var stockQty = '未知';
      if (inv.inventoryStockStatus === 'AVAILABLE') {
        stockStatusText = '库存正常';
        stockQty = textOrDash(inv.currentStockQty);
      } else if (inv.inventoryStockStatus === 'OUT_OF_STOCK') {
        stockStatusText = '当前为0库存';
        stockQty = '0';
      } else if (inv.inventoryStockStatus === 'UNBOUND') {
        stockStatusText = '未绑定库存商品';
      } else if (inv.inventoryStockStatus === 'INVALID') {
        stockStatusText = '库存数据异常';
      } else if (inv.inventoryStockStatus === 'MISSING') {
        stockStatusText = '库存数据缺失';
      } else {
        stockStatusText = '库存状态未确认';
      }

      // ===== 采购量 / 理论消耗 =====
      var theoryQty = textOrDash(consumption.theoreticalConsumptionQty);
      var theoryUnit = consumption.theoreticalConsumptionUnit || '';
      var consumptionAvailability = consumption.consumptionAvailability;
      var theoryLabel = consumptionAvailability === 'PARTIAL' ? '理论消耗（已知部分）' : '理论消耗';
      var theorySummary = '';
      if (consumptionAvailability === 'PARTIAL') {
        theorySummary = '已计入' + textOrDash(consumption.includedDishCount) + '道关联菜品';
        if (consumption.missingSalesDishCount > 0) {
          theorySummary += '；另有' + consumption.missingSalesDishCount + '道缺少销量数据';
        }
        theorySummary += '；总量暂不完整';
      } else if (consumptionAvailability === 'UNAVAILABLE') {
        theorySummary = '关联菜品数据不足，暂无法计算理论消耗';
      } else if (consumptionAvailability === 'USABLE') {
        theorySummary = '已统计全部' + textOrDash(consumption.includedDishCount) + '道关联菜品';
      } else {
        theorySummary = '理论消耗状态未确认';
      }

      // ===== 明细行 =====
      var rows = rawRows.map(function (r) {
        var isIncluded = r.includedInTheoreticalConsumption === true;
        var isZeroSales = r.zeroSalesInBaseline === true;

        var recipeTxt = '-';
        if (!isEmptyValue(r.recipeUnitPerDish)) {
          recipeTxt = String(r.recipeUnitPerDish)
            + (isEmptyValue(r.recipeUnitPerDishUnit) ? '' : ' ' + String(r.recipeUnitPerDishUnit));
        }
        var salesTxt = '-';
        if (isZeroSales) {
          salesTxt = '0 份';
        } else if (!isEmptyValue(r.salesPortionsInBaseline)) {
          salesTxt = String(r.salesPortionsInBaseline) + ' 份';
        }
        var dailyTxt = '-';
        if (isZeroSales) {
          dailyTxt = '0 份/天';
        } else if (!isEmptyValue(r.dailySalesPortions)) {
          dailyTxt = String(r.dailySalesPortions) + ' 份/天';
        }
        var usageTxt = '-';
        if (!isEmptyValue(r.dailyIngredientUsage)) {
          usageTxt = String(r.dailyIngredientUsage)
            + (isEmptyValue(r.dailyIngredientUsageUnit) ? '' : ' ' + String(r.dailyIngredientUsageUnit));
        }

        return {
          dishId: r.dishId || '',
          dishName: r.dishName || '未知菜品',
          recipeTxt: recipeTxt,
          salesTxt: salesTxt,
          dailyTxt: dailyTxt,
          usageTxt: usageTxt,
          note: r.forecastNote || '',
          rowClass: isIncluded ? '' : 'pgba-tr--excluded',
        };
      });

      var gapTexts = dataGapMessages.map(function (message) { return String(message); });
      var signalTexts = signals.map(function (s) {
        return s.message;
      }).filter(function (message) { return !!message; });

      var priceVisible = !isEmptyValue(price.currentAvgUnitPrice)
        || !isEmptyValue(price.previousAvgUnitPrice)
        || !isEmptyValue(price.priceChangePercent);
      var priceChangeAvailable = !isEmptyValue(price.priceChangePercent);

      this.setData({
        visible: true,
        title: data.title,
        subtitle: data.subtitle,
        goodsName: payload.goodsName,

        stockQty: stockQty,
        stockUnit: inv.stockUnit || '',
        stockStatusText: stockStatusText,
        coverAvailable: coverAvailable,
        coverDaysText: coverAvailable ? coverDays.toFixed(2) : '',
        coverBadgeText: coverBadgeText,
        coverLow: coverAvailable && coverDays < 1,
        coverUnit: coverAvailable ? '天' : '',
        stockNote: coverUsable ? '' : '综合覆盖预测有数据缺口，天数未给出',

        purchaseAmount: textOrDash(purchase.purchaseAmount),
        purchaseQty: textOrDash(purchase.purchaseQuantity),
        purchaseCount: textOrDash(purchase.purchaseLineCount),
        purchaseUnitText: purchase.purchaseQuantityUnitResolved
          ? (purchase.purchaseQuantityUnit || '') : '单位未解析',
        theoryQty: theoryQty,
        theoryUnit: theoryUnit,
        theoryLabel: theoryLabel,
        theorySummary: theorySummary,
        theoryNote: consumption.theoreticalConsumptionBasisNote || '',
        ratioDisplay: '—',
        ratioTag: '采购单位未解析，未计算',

        priceVisible: priceVisible,
        priceConclusion: price.comparisonConclusion || '',
        currentAvgUnitPrice: textOrDash(price.currentAvgUnitPrice),
        previousAvgUnitPrice: textOrDash(price.previousAvgUnitPrice),
        priceChangePercent: textOrDash(price.priceChangePercent),
        priceChangeAvailable: priceChangeAvailable,
        compareLabel: price.compareLabel || '',

        dishRows: rows,
        gapTexts: gapTexts,
        signalTexts: signalTexts,
      });
    },
  },
});
