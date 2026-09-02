/**
 * 单菜利润处方卡 - 菜品价格与配方诊断卡
 *
 * cardData（由 _resolveDisplayCard 预构建）：
 * {
 *   dishName, status, diagnosisSummary,
 *   currentPrice, outboundAllocatedCostPerPortion, targetGrossMarginRate,
 *   suggestedPrice, formulaId,
 *   theoreticalCostPerPortion, costGapPerPortion, costGapRate,
 *   ingredientRows: [{ ingredientName, theoreticalQuantity, actualQuantity,
 *       unitPrice, unitPriceSource, cost, reviewFlags }],
 *   recommendedActions: [{ actionName, priority, reason, evidenceRefId }],
 *   capabilityLimits, title
 * }
 */

var UNIT_PRICE_SOURCE_MAP = {
  OUTBOUND_TYPE1_AVG: '本期出库均价',
  OUTBOUND_TYPE1_AVG_全称: '本期成本均价',
  PURCHASE_LATEST: '最新采购价',
  MANUAL: '手动录入价',
  DEFAULT: '参考价',
};

var PRIORITY_MAP = {
  HIGH: { label: '高', cls: 'dpp-priority-high' },
  MEDIUM: { label: '中', cls: 'dpp-priority-medium' },
  LOW: { label: '低', cls: 'dpp-priority-low' },
  // 数字优先级映射（后端返回的优先级为 1=高, 2=中, 3=低）
  1: { label: '高', cls: 'dpp-priority-high' },
  2: { label: '中', cls: 'dpp-priority-medium' },
  3: { label: '低', cls: 'dpp-priority-low' },
};

var REVIEW_FLAG_MAP = {
  USAGE_ABNORMAL: '用量异常',
  FOCUS_INGREDIENT: '核心配料',
};

function resolveUnitPriceSource(source) {
  if (!source) return '—';
  // 优先精确匹配
  if (UNIT_PRICE_SOURCE_MAP[source]) return UNIT_PRICE_SOURCE_MAP[source];
  // 默认直接用 source 原文（兜底）
  return source;
}

function resolveCapabilityLimits(limits) {
  // limits 现在由 _resolveDisplayCard 预转为 string[]（中文提示数组）
  if (!limits || !Array.isArray(limits) || limits.length === 0) return [];
  return limits.filter(function (item) {
    return item && typeof item === 'string' && item.trim().length > 0;
  });
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
    dishName: '',
    status: '',
    diagnosisSummary: '',

    // 价格建议
    currentPrice: null,
    outboundAllocatedCostPerPortion: null,
    targetGrossMarginRate: null,
    suggestedPrice: null,
    formulaId: '',

    // 成本差异
    theoreticalCostPerPortion: null,
    costGapPerPortion: null,
    costGapRate: null,

    // 配料复核
    ingredientRows: [],

    // 行动建议
    recommendedActions: [],

    // 能力边界
    capabilityHints: [],

    // 状态判定
    isSuccess: false,
    isFailed: false,

    _PRIORITY_MAP: PRIORITY_MAP,
  },

  methods: {
    _onCardDataChange: function (newVal) {
      if (!newVal) {
        this.setData({ visible: false });
        return;
      }

      console.log('[DISH_PROFIT_PRESCRIPTION_CARD] cardData =', JSON.stringify(newVal, null, 2));

      var status = (newVal.status || '').toUpperCase();
      var isSuccess = status === 'SUCCESS';
      var isFailed = !isSuccess;

      this.setData({
        visible: true,
        title: newVal.title || '菜品价格与配方诊断',
        dishName: newVal.dishName || '—',
        status: status,
        diagnosisSummary: newVal.diagnosisSummary || '',
        currentPrice: newVal.currentPrice !== undefined && newVal.currentPrice !== null ? newVal.currentPrice : null,
        outboundAllocatedCostPerPortion: newVal.outboundAllocatedCostPerPortion !== undefined && newVal.outboundAllocatedCostPerPortion !== null ? newVal.outboundAllocatedCostPerPortion : null,
        targetGrossMarginRate: newVal.targetGrossMarginRate !== undefined && newVal.targetGrossMarginRate !== null ? newVal.targetGrossMarginRate : null,
        suggestedPrice: newVal.suggestedPrice !== undefined && newVal.suggestedPrice !== null ? newVal.suggestedPrice : null,
        formulaId: newVal.formulaId || '',
        theoreticalCostPerPortion: newVal.theoreticalCostPerPortion !== undefined ? newVal.theoreticalCostPerPortion : null,
        costGapPerPortion: newVal.costGapPerPortion !== undefined ? newVal.costGapPerPortion : null,
        costGapRate: newVal.costGapRate !== undefined ? newVal.costGapRate : null,
        ingredientRows: Array.isArray(newVal.ingredientRows) ? newVal.ingredientRows : [],
        recommendedActions: Array.isArray(newVal.recommendedActions) ? newVal.recommendedActions : [],
        capabilityHints: resolveCapabilityLimits(newVal.capabilityHints),
        isSuccess: isSuccess,
        isFailed: isFailed,
      });
    },
  },
});

// 导出工具方法供 wxml 使用（wxs 替代）
module.exports = {
  resolveUnitPriceSource: resolveUnitPriceSource,
};
