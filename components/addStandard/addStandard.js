
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
    itemStandard: {
      type: Object,
      value: ""
    },
   

    standardName: {
      type: String,
      value: ""
    },
    standardScale:{
      type: String,
      value: ""
    },
   
    windowHeight: {
      type: Number,
      value: ""
    },

    goods:{
      type: Object,
      value: ""
    },

    inputScale: {
      type: Boolean,
      value: false
    },

    inputStandard: {
      type: Boolean,
      value: false
    }
  
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
    cancle() {
      this.setData({ show: false, standardName: "", standardScale: "",depGoodsName: "",itemStandard:"" })
      this.triggerEvent('cancle')
    },

    confirm(e) {

      if(this.data.standardName.length > 0){
        this.triggerEvent('confirm', {
          standardName: this.data.standardName,
          standardScale: this.data.standardScale,
        })
      }
     
      this.setData({
        show: false,
        standardName: "",
        standardScale: "",
        depGoodsName: "",
        itemStandard: ""
      })

    },

    getStandard: function (e) {
      console.log(e)
      this.setData({   
        inputStandard: true,
        inputScale: false,
        standardName: e.detail.value
      })
    },

    getScale: function (e) {
      console.log(e)
      this.setData({   
        inputStandard: false,
        inputScale: true,
        standardScale: e.detail.value
      })
    },
    getblue(){
      this.setData({
        inputStandard: false,
      })

    },

    getFocus: function(e){
      this.setData({
        inputStandard: true,
        inputScale: false,

      })
      this.triggerEvent('getFocus', {
        keyboardHeight: e.detail.height,
      })
    },
    getFocusScale(e){
      this.setData({
        inputScale: true,
        inputStandard: false,

      })
      this.triggerEvent('getFocus', {
        keyboardHeight: e.detail.height,
      })
    },
    









  },
  

  
  
})
