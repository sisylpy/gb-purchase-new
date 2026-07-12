Component({
  properties: {
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
    /** 可选：订货列表里的 nx 商品，用于展示外包装规格 */
    nxGoods: {
      type: Object,
      value: null
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

  lifetimes: {
    attached() {
      this._updateOuterPackChip(this.properties.nxGoods);
    },
  },

  observers: {
    nxGoods: function (nxGoods) {
      this._updateOuterPackChip(nxGoods);
    },
    show: function (show) {
      if (show) {
        this._syncApplyFieldsFromProps();
      }
    },
  },

  data: {
    showInput: false,
    showOuterPack: false,
    /** nxGoodsCartonUnit：外包装单位名称，订货规格 */
    outerPackStandard: "",
    /** 外包装展示文案，如 6桶*箱 */
    outerPackLabel: "",
  },

  methods: {

    _updateOuterPackChip(nxGoods) {
      if (!nxGoods || typeof nxGoods !== "object") {
        this.setData({ showOuterPack: false, outerPackStandard: "", outerPackLabel: "" });
        return;
      }
      const unit = nxGoods.nxGoodsCartonUnit != null ? String(nxGoods.nxGoodsCartonUnit).trim() : "";
      const ipc = nxGoods.nxGoodsItemsPerCarton;
      const std = nxGoods.nxGoodsStandardname != null ? String(nxGoods.nxGoodsStandardname).trim() : "";
      var label = unit;
      if (unit && ipc != null && ipc !== "" && String(ipc) !== "null") {
        label = String(ipc) + std + "*" + unit;
      }
      this.setData({
        outerPackStandard: unit,
        outerPackLabel: label,
        showOuterPack: !!unit,
      });
    },

    _syncApplyFieldsFromProps() {
      const applyNumber = this.properties.applyNumber;
      const hasNumber = applyNumber !== '' && applyNumber != null && Number(applyNumber) > 0;
      this.setData({
        applyNumber: applyNumber != null && applyNumber !== '' ? String(applyNumber) : '',
        applyRemark: this.properties.applyRemark || '',
        canSave: this.properties.canSave || hasNumber,
      });
    },

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
        stockIsZero: false,
        hasStock: false
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
        depStandardArr: [],
        applySubtotal: "0.0元",
        newStandardName: "",
        stockIsZero: false,
        hasStock: false
      })
      this.triggerEvent('cancle')
    },

    confirm(e) {

      if (!this.data.canSave) {
        wx.showToast({
          title: '请填写数量',
          icon: "none"
        })
        return;
      }

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
            newStandardName: "",
            hasStock: false

          })
        } else {
          wx.showToast({
            title: '数量只能填写数字',
            icon: "none"
          })
        }
      }



    },

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