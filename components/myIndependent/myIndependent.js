
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    //是否显示modal
    show: {
      type: Boolean,
      value: false
    },
   
    item: {
      type: Object,
      value: ""
    },
    url: {
      type: String,
      value: ""
    },
    windowHeight:{
      type: String,
      value: ""
    },
    windowWidth: {
      type: String,
      value: ""
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
      this.setData({ show: false })
    },

    









  },
  

  
  
})
