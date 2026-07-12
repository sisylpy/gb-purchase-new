Component({
  properties: {
    retName: { type: String, value: '' },
    statusBarHeight: { type: Number, value: 0 },
    variant: { type: String, value: 'default' },
    titleSuffix: { type: String, value: '' },
  },
  methods: {
    onBack() {
      this.triggerEvent('back');
    },
  },
});
