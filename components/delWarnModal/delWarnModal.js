Component({
  
  properties: {
    showPopup: Boolean,
    type: String,
    message: String,
    warnContent: String,
  },

  observers: {
    'type': function(type) {
      if (type === 'deleteSpec') {
        this.setData({
          popupTitle: '删除部门',
          message: '您确定要删除部门吗？'
        });
      } else if (type === 'deleteOrder') {
        this.setData({
          popupTitle: '删除订单',
          message: '您确定要删除该订单吗？'
        });
      } else if (type === 'deleteGoods') {
        this.setData({
          popupTitle: '删除部门商品',
          message: '您确定要删除该商品吗？'
        });
      }else if (type === 'deletePurGoods') {
        this.setData({
          popupTitle: '删除订货商品',
          message: '您确定要删除该商品订货吗？'
        });
      }else if (type === 'deleteStandard') {
        this.setData({
          popupTitle: '删除商品规格',
          message: '您确定要删除该规格吗？'
        });
      }
    }
  },

  data: {
    popupTitle: '',
    message: ''
  },

  methods: {
    onCancel() {
      this.triggerEvent('closeWarn');
    },
    onConfirm() {
      this.triggerEvent('confirmWarn');
    },
    stopPropagation(event) {
    }
  }
});