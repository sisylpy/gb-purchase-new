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
    applyStandardName: {
      type: String,
      value: ""
    },

    applyRemark: {
      type: String,
      value: ""
    },
    item: {
      type: Object,
      value: ""
    },


    applyNumber: {
      type: String,
      value: ""
    },
    editApply: {
      type: Boolean,
      value: false
    },
    depStandardArr: {
      type: Array,
      value: []
    },
   
    windowWidth: {
      type: Number,
      value: ""
    },
    windowHeight: {
      type: Number,
      value: ""
    },
   
    newStandardName: {
      type: String,
      value: ""
    },
    applySubtotal: {
      type: String,
      value: ""
    },
    canSave: {
      type: Boolean,
      value: false
    },
    hasStock: {
      type: Boolean,
      value: ""
    },

  },

  /**
   * 组件的初始数据
   */
  data: {
    showInput: false,

  },

  /**
   * 组件的方法列表
   */
  methods: {

    showInputStandard() {
      this.setData({
        showAddStandard: true
      })
    },
    cancleStandard() {
      this.setData({
        showAddStandard: false
      })
    },

    confirmStandard() {
      console.log(this.data.newStandardName)
      if (this.data.newStandardName.length > 0) {
        this.triggerEvent('confirmStandard', {
          newStandardName: this.data.newStandardName,
        })
        this.setData({
          showAddStandard: false,
          newStandardName: ""
        })
      }
    },

    changeStock(e){
      console.log("this.dahasStock", this.data.hasStock)
      if(this.data.hasStock){

        this.setData({
          stockIsZero: e.detail.value
        })
      }else{

        wx.showToast({
          title: '没有库存，不需要清零',
          icon: 'none'
        })
      }

    },

    clickMask() {
      this.setData({
        show: false,
        applyNumber: "",
        applyRemark: "",
        remarkContent: "",
        goodsStandard: "",
        editApply: false,
      })
    },

    cancle() {
      this.setData({
        show: false,
        applyNumber: "",
        applyRemark: "",
        remarkContent: "",
        goodsStandard: "",
        editApply: false,
        editApply: false,
        depStandardArr: [],
        applySubtotal: "0.0元",
        newStandardName: ""
      })
      this.triggerEvent('cancle')
    },

    confirm(e) {

      if (this.data.showAddStandard) {
        wx.showModal({
          title: '未完成添加新规格',
          content: '可以"关闭"规格',
          complete: (res) => {
            if (res.cancel) {

            }

            if (res.confirm) {

            }
          }
        })
      } else {

        if (this.data.applyNumber > 0) {
          var regex = /^[0]+/; //整数验证正则        
          var apply = "";
          if (this.data.applyNumber.indexOf(".") !== -1) {
            apply = this.data.applyNumber;
          } else {
            apply = this.data.applyNumber.replace(regex, "");
          }
          this.triggerEvent('confirm', {
            applyNumber: apply,
            applyStandardName: this.data.applyStandardName,
            applyRemark: this.data.applyRemark,
            stockIsZero: this.data.stockIsZero

          })

          this.setData({
            show: false,
            applyNumber: "",
            applyRemark: "",
            remarkContent: "",
            goodsStandard: "",
            stockIsZero: false,
            editApply: false,
            applySubtotal: "0.0元",
            newStandardName: ""

          })
        } else {
          wx.showToast({
            title: '数量只能填写数字',
            icon: "none"
          })
        }
      }




    },

    // standardchange: function () {
    //   console.log("chanst")
    //   var name = e.currentTarget.dataset.name;
    //   this.triggerEvent('changeStandard', {
    //     applyStandardName: name
    //   })

    // },




    getApplyNumber: function (e) {

      var numberStr = this.data.applyNumber.toString();
      var y = String(numberStr).indexOf("."); //获取小数点的位置
      if (y !== -1) {
        var count = String(numberStr).length - y; //获取小数点后的个数
      }

      if (e.detail.value > 9999) {
        wx.showToast({
          title: '最大不能超过9999',
          icon: "none"
        })

        this.setData({
          applyNumber: numberStr.substring(0, numberStr.length),
        })

      } else if (count > 2 || count == 2) {

        wx.showToast({
          title: '小数点只能保留一位',
        })
        this.setData({
          applyNumber: numberStr.substring(0, numberStr.length - 1),
        })
      } else {
        console.log(e.detail.value + " else lide ")
        if (e.detail.value > 0 || e.detail.value == 0) {
          this.setData({
            applyNumber: e.detail.value
          })
        } else {
          wx.showToast({
            title: '只能填写数字',
            icon: 'none'
          })
          // var g
          // var reg = new RegExp("([0]*)([1-9]+[0-9]+)", "g");
          this.setData({
            applyNumber: numberStr.substring(0, numberStr.length),
          })
        }
      }

      if (this.data.applyNumber > 0) {
        this.setData({
          canSave: true,
        })
      } else {
        this.setData({
          canSave: false
        })
      }

      // var three = this.data.item.nxDgBuyingPriceThreeUpdate;
      // var two = this.data.item.nxDgBuyingPriceTwoUpdate;
      // console.log(three);
      // console.log(two);

      // if(Number(this.data.applyNumber) > Number(three) || Number(this.data.applyNumber) == Number(three)){
      //   this.setData({
      //     level: 3
      //   })
      // }else  if(Number(this.data.applyNumber) > Number(two) || Number(this.data.applyNumber) == Number(two) ){
      //   this.setData({
      //     level: 2
      //   })
      // }else  {
      //   this.setData({
      //     level: 1
      //   })
      // }

    },



    addRemark: function (e) {
      if (e.detail.value.length < 15) {
        this.setData({
          applyRemark: e.detail.value,
          canSave: true
        })
      } else {
        wx.showToast({
          title: '最多输入15个字符。',
          icon: 'none'
        })
        var str = this.data.applyRemark;
        this.setData({
          applyRemark: str.substring(0, e.detail.value.length),
          canSave: true
        })
      }
    },


    changeStandard: function (e) {
      console.log("changeStandardchangeStandard");

      var name = e.currentTarget.dataset.name;
      this.triggerEvent('changeStandard', {
        applyStandardName: name,
      })
      this.setData({
        canSave: true
      })
      console.log(this.data.canSave)
    },


    addStanard(e) {
      this.setData({
        newStandardName: e.detail.value,
        canSave: true,
      })
    },

    delApply: function () {
      this.triggerEvent('delApply', {})
      this.setData({
        show: false,
        applyNumber: "",
        applyRemark: "",
        remarkContent: "",
        goodsStandard: "",
        editApply: false,
        applySubtotal: "0.0元",
        newStandardName: ""

      })
    },


    delStandard(e){
      console.log("delStandarddelStandard")
      
      this.triggerEvent('delStandard', {
        id: e.currentTarget.dataset.id,
        standardName: e.currentTarget.dataset.name,

      })

    },

  },




})
