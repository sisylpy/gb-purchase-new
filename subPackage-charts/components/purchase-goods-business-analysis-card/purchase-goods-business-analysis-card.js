/**
 * 采购商品经营分析卡片（PURCHASE_GOODS_BUSINESS_ANALYSIS_CARD）
 *
 * 仅展示后端 PurchaseGoodsBusinessAnalysis 结果，不做重算/猜测：
 *  - 库存覆盖：综合支撑天数只在 forecast 完整（非 combinedCoverDaysIncomplete）时展示；
 *  - 理论消耗为 base 单位（克/毫升/个），采购量为采购单据数量（无单位码），
 *    两者不可直接比较，后端已停发采购/理论比值（purchaseToTheoryRatio=null），此处显示「单位不可比」；
 *  - 明细行区分缺失/不可计算/真实零销量/正常，不使用 0.00 掩盖字段缺失。
 */
function textOrDash(v) {
  return v === null || v === undefined || v === '' ? '-' : String(v);
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

    // 采购
    purchaseAmount: '',
    purchaseQty: '',
    purchaseCount: '',
    theoryQty: '',
    theoryUnit: '',
    theoryNote: '',
    ratioDisplay: '-',
    ratioTag: '',

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
      var payload = data.payload || data;
      var summary = payload.summary || {};
      var inv = payload.inventorySection || {};
      var pv = payload.purchaseVolumeSection || {};
      var signals = (payload.judgmentSignals && Array.isArray(payload.judgmentSignals))
        ? payload.judgmentSignals : [];
      var knownGaps = (payload.knownGaps && Array.isArray(payload.knownGaps))
        ? payload.knownGaps : [];
      var rawRows = (payload.dishRows && Array.isArray(payload.dishRows))
        ? payload.dishRows : [];

      // ===== 库存覆盖：仅在预测完整（非 incomplete）时展示天数 =====
      var incomplete = inv.combinedCoverDaysIncomplete === true
        || inv.combinedCoverDaysIncomplete === 'true';
      var coverDays = (!incomplete && !isEmptyValue(inv.combinedCoverDays))
        ? Number(inv.combinedCoverDays) : null;
      var coverAvailable = coverDays !== null && !isNaN(coverDays);
      var coverBadgeText = coverAvailable
        ? '综合可支撑'
        : (incomplete ? '数据缺口' : '暂无可用天数');

      // ===== 采购量 / 理论消耗 =====
      var theoryQty = textOrDash(pv.theoreticalConsumptionQty);
      var theoryUnit = pv.theoreticalConsumptionUnit || '';
      var ratio = (pv.purchaseToTheoryRatio === null || pv.purchaseToTheoryRatio === undefined || pv.purchaseToTheoryRatio === '')
        ? null : Number(pv.purchaseToTheoryRatio);
      var ratioDisplay = '-';
      var ratioTag = '单位不可比';
      if (ratio !== null && !isNaN(ratio)) {
        ratioDisplay = ratio.toFixed(2);
        ratioTag = '';
      }

      // ===== 明细行 =====
      var rows = rawRows.map(function (r) {
        var fs = r.forecastStatus || '';
        var isIncluded = fs === 'INCLUDED';
        var isZeroSales = fs === 'EXCLUDED_ZERO_SALES';

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

      // ===== 缺口文案 =====
      var gapMap = {
        no_linked_dish_for_goods: '该原料未关联到菜品',
        stock_unit_missing: '部分库存批次缺少单位码，未按斤推算，综合预测不完整',
        stock_unit_unresolved: '部分库存批次单位无法换算，综合预测不完整',
        stock_unit_dimension_conflict: '库存批次单位维度不一致，综合预测不完整',
        inventory_rest_weight_missing: '库存剩余量数据缺失',
        recipe_unit_unresolved: '部分菜品配方用量无单位或无法换算，未计入预测',
        recipe_unit_dimension_mismatch: '部分菜品配方用量维度与库存不一致，未计入预测',
        sales_data_missing: '部分菜品基线无销量记录，按数据缺失处理',
        zero_sales_dish_excluded_from_forecast: '存在基线真实零销量菜品（预测期不消耗）',
        all_related_dishes_zero_sales: '相关菜品基线均无销量，无法给出支撑天数',
        purchase_quantity_unit_not_resolved_for_ratio: '采购单据数量未记录单位码，未输出采购/理论比值',
      };
      var gapTexts = [];
      var seen = {};
      (knownGaps || []).forEach(function (code) {
        var key = String(code);
        if (seen[key]) return;
        seen[key] = true;
        gapTexts.push(gapMap[key] || key);
      });

      // 信号→徽标
      var signalTexts = [];
      var signalMap = {
        PURCHASE_VOLUME_RATIO_NOT_AVAILABLE: '',
        STOCK_COVER_FORECAST_INCOMPLETE: '库存覆盖预测不完整',
        LOW_STOCK_COVER_DAYS: '库存偏低',
        HIGH_STOCK_COVER_DAYS: '库存较充足',
        ZERO_OR_MISSING_STOCK: '库存缺失或为零',
        NO_LINKED_DISH: '未关联菜品',
      };
      signals.forEach(function (s) {
        var label = signalMap[s.code] || s.code;
        if (label) signalTexts.push(label);
      });
      // 冗余信号去除
      if (incomplete) {
        signalTexts = signalTexts.filter(function (t) {
          return t !== '库存偏低' && t !== '库存较充足';
        });
      }

      this.setData({
        visible: true,
        title: data.title || (payload.goodsName ? payload.goodsName + '·采购经营分析' : '采购经营分析'),
        subtitle: data.subtitle || summary.purchaseTimeLabel || '',
        goodsName: payload.goodsName || data.goodsName || '',

        stockQty: textOrDash(inv.currentStockQty),
        stockUnit: textOrDash(inv.stockUnit),
        coverAvailable: coverAvailable,
        coverDaysText: coverAvailable ? coverDays.toFixed(2) : '',
        coverBadgeText: coverBadgeText,
        coverLow: coverAvailable && coverDays < 1,
        coverUnit: coverAvailable ? '天' : '',
        stockNote: incomplete ? '综合覆盖预测有数据缺口，天数未给出' : '',

        purchaseAmount: textOrDash(pv.totalPurchaseAmount),
        purchaseQty: textOrDash(pv.totalPurchaseQuantity),
        purchaseCount: textOrDash(pv.totalPurchaseLineCount),
        theoryQty: theoryQty,
        theoryUnit: theoryUnit,
        theoryNote: pv.theoreticalConsumptionBasisNote || '',
        ratioDisplay: ratioDisplay,
        ratioTag: ratioTag,

        dishRows: rows,
        gapTexts: gapTexts,
        signalTexts: signalTexts,
      });
    },
  },
});
