Component({
  properties: {
    variant: { type: String, value: 'tools' },
    batch: { type: Object, value: null },
    windowWidth: { type: Number, value: 750 },
    btnThirdWidth: { type: Number, value: 240 },
  },
  methods: {
    onWeight() { this.triggerEvent('weight'); },
    onPrice() { this.triggerEvent('price'); },
    onFinish() { this.triggerEvent('finish'); },
    onEdit() { this.triggerEvent('edit'); },
  },
});
