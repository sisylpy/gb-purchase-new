/**
 * 统一业务卡渲染组件 — 仅负责展示，不含图钉/工作记录/公告等业务动作
 *
 * 输入：cardType + payload（或预构建 cardData）+ title/subtitle
 * 场景：chat / pin / workRecord / announcement
 */
var cardNormalizer = require('../../utils/cardNormalizer');
var purchaseRankingCardUtil = require('../../utils/purchaseRankingCardUtil');
var workRecordCardTypes = require('../../utils/workRecordCardTypes');

/** 已有独立 UI 组件的 cardType */
var DISPLAY_COMPONENT_TYPES = {
  MENU_PORTFOLIO_QUADRANT_CARD: true,
  DISH_COST_ANALYSIS_CARD: true,
  DISH_SALES_CARD: true,
  MENU_HIGH_SALES_LOW_MARGIN_CARD: true,
  MENU_ACTION_RECOMMENDATION_CARD: true,
  DISH_PROFIT_PRESCRIPTION_CARD: true,
  REVENUE_REPORT_CARD: true,
  PURCHASE_CHECK_CARD: true,
  PURCHASE_ANOMALY_CARD: true,
  STOCK_RECONCILE_CARD: true,
  REORDER_REMINDER_CARD: true,
  PURCHASE_GOODS_DETAIL_CARD: true,
  DISH_SALES_RANKING_CARD: true,
  DISH_PROFIT_COST_RANKING_CARD: true,
  DISH_PROFIT_RANKING_CARD: true,
  DISH_INGREDIENT_COVER_DAYS_CARD: true,
  WAREHOUSE_INVENTORY_RISK_LIST_CARD: true,
  WAREHOUSE_STOCK_RANKING_CARD: true,
  GOODS_SUPPORTED_DISH_COVER_CARD: true,
  WAREHOUSE_NEAR_EXPIRY_RISK_CARD: true,
  WAREHOUSE_INVENTORY_SUPERVISION_CARD: true,
  WAREHOUSE_WASTE_RISK_CARD: true,
  PURCHASE_GOODS_BUSINESS_ANALYSIS_CARD: true,
  PURCHASE_GOODS_ANCHOR_DETAIL_CARD: true,
  GOODS_STOCK_BATCH_DETAIL_CARD: true,
};

// 采购排行 5 种卡 — 共用 purchase-ranking-card
purchaseRankingCardUtil.PURCHASE_RANKING_CARD_TYPES.forEach(function (t) {
  DISPLAY_COMPONENT_TYPES[t] = true;
});

/** 第一批工作记录卡（必须能渲染，不允许 fallback） */
var BATCH_WORK_RECORD_CARD_TYPES = workRecordCardTypes.WORK_RECORD_CARD_TYPES;

function canRenderCardType(cardType) {
  return !!DISPLAY_COMPONENT_TYPES[cardType];
}

Component({
  properties: {
    cardType: {
      type: String,
      value: '',
    },
    payload: {
      type: Object,
      value: null,
    },
    /** 已标准化的 cardData（aiChat 预构建时传入，优先于 payload） */
    cardData: {
      type: Object,
      value: null,
    },
    title: {
      type: String,
      value: '',
    },
    subtitle: {
      type: String,
      value: '',
    },
    sourceItemKey: {
      type: String,
      value: '',
    },
    readonly: {
      type: Boolean,
      value: true,
    },
    /** chat | pin | workRecord | announcement */
    scene: {
      type: String,
      value: 'chat',
    },
    /** 仅 chat 场景 WIR 行级记入时透传 */
    messageId: {
      type: null,
      value: null,
    },
    runId: {
      type: null,
      value: null,
    },
  },

  data: {
    _resolvedCardData: null,
    _showFallback: false,
    _fallbackText: '',
    _fallbackSub: '',
    _canRender: false,
  },

  observers: {
    'cardType, payload, cardData, title, subtitle': function () {
      this._resolveCard();
    },
  },

  lifetimes: {
    attached: function () {
      this._resolveCard();
    },
  },

  methods: {
    _resolveCard: function () {
      var cardType = this.properties.cardType || '';
      if (!cardType) {
        this.setData({
          _resolvedCardData: null,
          _canRender: false,
          _showFallback: true,
          _fallbackText: '暂不支持卡片展示',
          _fallbackSub: '',
        });
        return;
      }

      var cardData = this.properties.cardData;
      if (!cardData) {
        var resolved = cardNormalizer.resolveDisplayCard({
          cardType: cardType,
          title: this.properties.title || '',
          subtitle: this.properties.subtitle || '',
          payload: this.properties.payload || {},
        });
        cardData = resolved ? resolved.cardData : null;
      } else if (purchaseRankingCardUtil.isPurchaseRankingCardType(cardType) && !cardData.rows) {
        // cardData 可能是原始 payload，再规范一次
        var rankingResolved = purchaseRankingCardUtil.resolvePurchaseRankingCardData({
          cardType: cardType,
          title: this.properties.title || cardData.title || '',
          subtitle: this.properties.subtitle || cardData.subtitle || '',
          payload: cardData.payload || cardData,
        });
        if (rankingResolved) cardData = rankingResolved;
      }

      var canRender = !!(cardData && canRenderCardType(cardType));

      if (canRender) {
        this.setData({
          _resolvedCardData: cardData,
          _canRender: true,
          _showFallback: false,
          _fallbackText: '',
          _fallbackSub: '',
        });
        return;
      }

      var fbTitle = this.properties.title || cardType;
      var fbSub = this.properties.subtitle || '';
      var payload = this.properties.payload || {};
      var summary = payload.summaryText || payload.rawFactText || payload.narrative || '';
      if (!summary && payload.summary && payload.summary.narrative) {
        summary = payload.summary.narrative;
      }

      this.setData({
        _resolvedCardData: null,
        _canRender: false,
        _showFallback: true,
        _fallbackText: BATCH_WORK_RECORD_CARD_TYPES.indexOf(cardType) >= 0
          ? '暂无卡片数据'
          : (canRenderCardType(cardType) ? '暂无卡片数据' : ('暂不支持卡片展示（' + cardType + '）')),
        _fallbackSub: fbSub || summary || fbTitle,
      });
    },

    /** 透传子组件行级记入事件（仅展示层转发，不执行业务） */
    onBubbleRecordWork: function (e) {
      this.triggerEvent('recordWork', e.detail || {});
    },
  },
});
