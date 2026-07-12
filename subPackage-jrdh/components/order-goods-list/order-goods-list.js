Component({
  properties: {
    mode: { type: String, value: 'simple' },
    styleVariant: { type: String, value: 'dashed' },
    batch: { type: Object, value: null },
    batchStatus: { type: Number, value: 0 },
    windowWidth: { type: Number, value: 750 },
    scrollHeight: { type: Number, value: 400 },
    fillHeight: { type: Boolean, value: false },
    focusIndex: { type: Number, value: -1 },
    bizType: { type: String, value: 'order' },
  },
  methods: {
    onShowOperation(e) {
      this.triggerEvent('showoperation', { index: e.currentTarget.dataset.index });
    },
  },
});
