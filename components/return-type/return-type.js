Component({
  /**
   * 组件的属性列表
   */
  properties: {
    //是否显示modal
    show: {
      type: Boolean,
      value: true
    },

    item: {
      type: Object,
      value: ""
    },
    orders: {
      type: Object,
      value: ""
    },
    depName: {
      type: String,
      value: ""
    },
    windowHeight: {
      type: String,
      value: ""
    },
   

  },

  /**
   * 组件的初始数据
   */
  data: {

  },

  /**
   * 组件的方法列表
   */
  methods: {

   


    clickMask() {
      this.setData({
        show: false
      })
    },

    cancle() {
      this.setData({
        show: false,
        returnDep: -1,
      })
      this.triggerEvent('cancle')
    },

   
    confirm(e) {
      this.triggerEvent('confirmReturn', {
       
      })
      this.setData({
        show: false,
       
      })



    },




    getApplyNumber: function (e) {

      var numberStr = this.data.item.gbDpbPaySubtotal;
      var sellSub = this.data.item.gbDpbSubtotal;
      var itemData = "item.gbDpbPaySubtotal";
      var itemOweData = "item.gbDpbOweSubtotal";

      var y = String(numberStr).indexOf("."); //获取小数点的位置
      if (y !== -1) {
        var count = String(numberStr).length - y; //获取小数点后的个数
      }
      if (Number(e.detail.value) > Number(this.data.item.gbDpbSubtotal)) {
        wx.showToast({
          title: '最大不能超过应付金额',
          icon: "none"
        })
        var pay = numberStr.substring(0, numberStr.length);
        var owe = Number(sellSub) - Number(pay);

        this.setData({
          [itemData]: pay,
          [itemOweData]: owe.toFixed(1),
        })

      } else if (count > 2 || count == 2) {

        wx.showToast({
          title: '小数点只能保留一位',
        })
        var pay = numberStr.substring(0, numberStr.length - 1);
        var owe = Number(sellSub) - Number(pay);
        this.setData({
          [itemData]: pay,
          [itemOweData]: owe.toFixed(1),
        })
      } else {
        if (e.detail.value > 0 || e.detail.value == 0) {
          var pay = e.detail.value;
          var owe = Number(sellSub) - Number(pay);

          this.setData({
            [itemData]: pay,
            [itemOweData]: owe.toFixed(1),
          })
        } else {
          wx.showToast({
            title: '只能填写数字',
            icon: 'none'
          })

          // var g
          // var reg = new RegExp("([0]*)([1-9]+[0-9]+)", "g");
          var pay = numberStr.substring(0, numberStr.length);
          var owe = Number(sellSub) - Number(pay);
          this.setData({
            [itemData]: pay,
            [itemOweData]: owe.toFixed(1),
          })
        }
      }
    },







  },




})