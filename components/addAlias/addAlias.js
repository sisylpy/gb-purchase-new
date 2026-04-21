
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
    itemAlias: {
      type: Object,
      value: ""
    },
   
    depGoodsName: {
      type: String,
      value: ""
    },
    aliasName: {
      type: String,
      value: ""
    },
   
    windowHeight: {
      type: Number,
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
      this.setData({show: false})
    },

    cancle() {
      this.setData({ show: false, aliasName: "",depGoodsName: "" })
      this.triggerEvent('cancle')
    },

    confirm(e) {
      if(this.data.aliasName.length > 0){
        this.triggerEvent('confirm', {
          aliasName: this.data.aliasName,
        })
      }
     

      this.setData({
        show: false,
        aliasName: "",
        depGoodsName: ""

      })
    },

    getAlias: function (e) {
      console.log(e)
      this.setData({   
        aliasName: e.detail.value
      })
    },


    getFocus: function(e){

      this.triggerEvent('getFocus', {
        keyboardHeight: e.detail.height,
      })
    }
    









  },
  

  
  
})
