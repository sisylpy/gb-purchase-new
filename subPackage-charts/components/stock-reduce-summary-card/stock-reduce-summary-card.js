/**
 * 出库/核销汇总卡（STOCK_REDUCE_SUMMARY_CARD）
 * 仅消费 cardNormalizer 产出的 ViewModel，不重新判断后端业务。
 *
 * 支持 summaryType：OVERALL / PRODUCTION / WASTE / LOSS / RETURN
 * 一张卡复用，不按生产耗用/废弃/损耗/退货拆成四个组件。
 */
Component({
  properties: {
    cardData: {
      type: Object,
      value: null,
    },
    readonly: {
      type: Boolean,
      value: true,
    },
  },
  data: {},
  methods: {},
});
