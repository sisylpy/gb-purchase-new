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
      value: {
        gbDgsStars: 3, // 默认值，外部传入
      },
    },
    modalHeight: {
      type: Number,
      value: ""
    },
    scrollViewTop: {
      type: Number,
      value: ""
    },

    windowHeight: {
      type: Number,
      value: ""
    },
    windowWidth: {
      type: Number,
      value: ""
    },

    consultItem: {
      type: Object,
      value: ""
    },
    canSure: {
      type: Boolean,
      value: true
    },
    nowTime: {
      type: String,
      value: ""
    },
    canWaste: {
      type: Boolean,
      value: false,
    },
    resWeight: {
      type: String,
      value: "0"
    },
    showType: {
      type: String,
      value: ""
    },
    resultTime: {
      type: String,
      value: ""
    },
    depGoods: {
      type: Object,
      value: ""
    }

  },

  /**
   * 组件的初始数据
   */
  data: {
    items: [{
        name: '1',
        value: '销售',
      },
      {
        name: '2',
        value: '损耗',
      },
      {
        name: '3',
        value: '退货',
      },
      {
        name: '4',
        value: '废弃',
      },
      // ,
      // {
      //   name: '5',
      //   value: '新鲜度',
      // }
    ],

    greenStars: [], // 绿色星星数组
    grayStars: [],
    reason: "",
    src: ""
  },
  observers: {
    // 当 item.gbDgsStars 发生变化时触发
    'item.gbDgsStars': function (gbDgsStars) {
      const validStars = parseInt(gbDgsStars, 10);
      if (isNaN(validStars) || validStars < 0) {
        // console.warn("Invalid gbDgsStars value:", gbDgsStars);
        return;
      }
      this.updateStars(validStars);
    },
  },
  
  /**
   * 组件的方法列表
   */
  methods: {


    onStarClick(e) {
      const totalStars = 5;
      const greenCount = this.data.greenStars.length;
      const index = e.currentTarget.dataset.index; // 获取点击的星星索引
        console.log("indeixxxxxx", index);
      // 判断点击的星星属于绿色还是灰色
      const isGreenStar = index < greenCount;
      let newStarCount;
      console.log("indeixxxxxx", isGreenStar);

      if (isGreenStar) {
        // 如果点击的是绿色星星，则减少到当前点击的星星数量
        newStarCount = index + 1;
      } else {  
        // 如果点击的是灰色星星，则增加到当前点击的星星数量
        newStarCount = greenCount + (index - greenCount + 1);
       
      }

      // 限制星星数量范围
      newStarCount = Math.min(Math.max(newStarCount, 0), totalStars);

      // 更新数据
      this.setData({
        'item.gbDgsStars': newStarCount,
      });
 // 强制调用更新星星数组
       this.updateStars(newStarCount);
      // 如果需要将新值传递给父组件，可以通过 triggerEvent 通知父组件
      this.triggerEvent('updateStars', { gbDgsStars: newStarCount });
    },



    updateStars(greenCount) {
      const totalStars = 5; // 总星星数量
      const grayCount = totalStars - greenCount; // 计算灰色星星数量

      this.setData({
        greenStars: new Array(greenCount).fill(1), // 用数组填充绿色星星
        grayStars: new Array(grayCount).fill(1),  // 用数组填充灰色星星
      });
    },


    radioChange(e) {
      var type = e.detail.value;
      console.log(type);
      if(type == 1){
        var restWeight = this.data.item.gbDgsRestWeight;
        var itemData = "item.gbDgsMyProduceWeight";
        this.setData({
          [itemData]: restWeight
        })
        var lossCan =   this._checkLoss();
        var returnCan =  this._checkReturn();
        if(lossCan && returnCan){
          this.setData({
            canChange: true,
          })
        }else{
         
          this._showTishi()
        }
      }
      else if(type == 2){
        var produceCan =   this._checkProduce();
        var returnCan =  this._checkReturn();
        console.log(produceCan);
        console.log(returnCan);
        if(produceCan && returnCan){
          this.setData({
            canChange: true,
          })
        }else{
       
          this._showTishi()
        }
      }
      else if(type == 3){
        var produceCan =  this._checkProduce();
        var lossCan =   this._checkLoss();
        if(produceCan && lossCan){
          this.setData({
            canChange: true,
          })
        }else{
        
          this._showTishi()
        }
      }
      else{
        var produceCan =  this._checkProduce();
        var lossCan =   this._checkLoss();
        var returnCan =  this._checkReturn();
        if(produceCan && lossCan && returnCan){
          this.setData({
            canChange: true,
          })
        }else{
          this._showTishi()

        }
      }
      if(this.data.canChange){
        this._changeShowType(e);
      }
    
    },

    _showTishi(){
      this.setData({
        showType: this.data.showType,
        canChange: false
      })
      wx.showModal({
        title: '有未完成操作',
        content: '只能一次操作一种库存。',
        complete: (res) => {
          if (res.cancel) {
            
          }
      
          if (res.confirm) {
            
          }
        }
      })
    },

    _checkProduce(){
      var prw = this.data.resWeight;
      console.log("------------------")
      console.log(prw);

      if(prw > 0){
        return false;
      }else{
        return true;
      }
    },

    _checkLoss(){
      var retWeight = this.data.item.gbDgsMyLossWeight;
      var src = this.data.src;
      var reason = this.data.reason;
      if(retWeight > 0){
        return false;
      }else{
        return true;
      }
    },

    _checkReturn(){
      var  restWeight = this.data.item.gbDgsMyReturnWeight;
      if(restWeight > 0){
        return false;
      }else{
        return true;
      }
    },


    _changeShowType(e){
      var type = e.detail.value;
      var myReturnWeightData = "item.gbDgsMyReturnWeight";
      var myLossWeightData = "item.gbDgsMyLossWeight";
      this.setData({
        showType: type,
        [myReturnWeightData]: "-1",
        [myLossWeightData]: "-1",
        resWeight: 0,
      })

      if (type == 1) {
        var inventoryWeight = "consultItem.gbDgsRestWeight";
        var restWeightData = "item.gbDgsRestWeight";
        var wasteWeightData = "item.gbDgsMyWasteWeight";
        this.setData({
          canSure: true,
          [inventoryWeight]: this.data.item.gbDgsRestWeight,
          [restWeightData]: this.data.item.gbDgsRestWeight,
          [wasteWeightData]: "0",
        })

      } else if (type == 4) {
        // var endTime = this.data.item.gbDgsWasteFullTime;
        // var startTime = this.data.nowTime;
        // var endTimeFormat = endTime.replace(/-/g, '/') //所有的- 都替换成/
        // var endTimeDown = Date.parse(new Date(endTimeFormat));
        // var startTimeFormat = startTime.replace(/-/g, '/') //所有的- 都替换成/
        // var startTimeDown = Date.parse(new Date(startTimeFormat));
        // var thisResult = Number(endTimeDown) - Number(startTimeDown);
        // thisResult = Math.floor(thisResult / 1000 / 60 / 60);
        // if (thisResult < 0) {
        //   var wasteWeightData = "item.gbDgsMyWasteWeight";
        //   var myProduceWeightData = "item.gbDgsMyProduceWeight";
        //   var restWeight = this.data.item.gbDgsRestWeight;
        //   this.setData({
        //     canWaste: true,
        //     [wasteWeightData]: restWeight,
        //     [myProduceWeightData]: "-1",
        //     canSure: true,
        //   })
        // } else {
        //   this.setData({
        //     canWaste: false,
        //     resultTime: thisResult,
        //     canSure: false
        //   })
        // }
      } else {
        this.setData({
          canSure: false
        })
      }
    },


    costFocus() {
      var inventoryWeight = "consultItem.gbDgsRestWeight";
      this.setData({
        [inventoryWeight]: "",
        canSure: false,
        resWeight: ""
      })
    },


    costFocusWaste() {
      console.log("acd")
      var inventoryWeight = "item.gbDgsMyWasteWeight";
      this.setData({
        [inventoryWeight]: "",
        canSure: false,
      })
    },

    getWasteWeight(e) {
      var myProduceWeightData = "item.gbDgsMyProduceWeight";
      var myWasteWeightData = "item.gbDgsMyWasteWeight";
      var restWeight = this.data.item.gbDgsRestWeight;
      var proWeight = (Number(restWeight) - Number(e.detail.value)).toFixed(1);
      if (e.detail.value.length > 0) {
        if (Number(e.detail.value) < Number(restWeight) || Number(e.detail.value) == Number(restWeight)) {
          this.setData({
            [myProduceWeightData]: proWeight,
            canSure: true,
            [myWasteWeightData]: e.detail.value,
           
          })
        } else {

          wx.showToast({
            title: '输入不正确ww,不能大于剩余数量ww',
            icon: 'none'
          })
          this.setData({
            [myWasteWeightData]: "",
            canSure: false,
            [myProduceWeightData]: "-1",

          })
        }
      } else {
        this.setData({
          canSure: false,
          [myWasteWeightData]: "",
          [myProduceWeightData]: "-1",
        })
      }
    },

  

    getProduceWeight(e) {
      var myProduceWeightData = "item.gbDgsMyProduceWeight";
      var restWeight = this.data.item.gbDgsRestWeight;
      console.log("zhelieiieierestWeightrestWeight" + restWeight)  
      var proWeight = (Number(restWeight) - Number(e.detail.value)).toFixed(1);
      console.log(e.detail.value)
      if (e.detail.value.length > 0) {
        if (Number(e.detail.value) < Number(restWeight) ) {
          this.setData({
            [myProduceWeightData]: proWeight,
            canSure: true,
            resWeight: e.detail.value,
          })
        } else {

          wx.showToast({
            title: '输入不正确,不能大于或等于剩余数量',
            icon: 'none'
          })
          this.setData({
            resWeight: "",
            canSure: false,
          })
        }
      } else {
        this.setData({
          canSure: false,
          resWeight: ""
        })
      }

    
    },


    getReturnWeight(e) {
      var myReturnWeightData = "item.gbDgsMyReturnWeight";
      var restWeight = this.data.item.gbDgsRestWeight;
      if (e.detail.value.length > 0) {
        if (Number(e.detail.value) < Number(restWeight) || Number(e.detail.value) == Number(restWeight)) {
          this.setData({
            [myReturnWeightData]: e.detail.value,
            canSure: true,
          })
        } else {
          wx.showToast({
            title: '不能大于剩余数量',
            icon: 'none'
          })
          this.setData({
            [myReturnWeightData]: "-1",
            canSure: false,
          })
        }
      } else {
        this.setData({
          [myReturnWeightData]: "-1",
          canSure: false,
        })
      }

    },

    getLossReason(e) {
      this.setData({
        reason: e.detail.value
      })
      // this._checkLossCanSure(e)
    },

    //选择图片
    choiceImg: function (e) {
      var _this = this;
      wx.chooseImage({
        count: 1, // 最多可以选择的图片张数，默认9
        sizeType: ['original', 'compressed'], // original 原图，compressed 压缩图，默认二者都有
        sourceType: ['album', 'camera'], // album 从相册选图，camera 使用相机，默认二者都有
        success: function (res) {
          _this.setData({
            src: res.tempFilePaths,
            isSelectImg: true,
          })
        },
        fail: function () {

        },
        complete: function () {
          _this._checkLossCanSure(e)
        }
      })
    },

    delPic(){
      this.setData({
        src: ""
      })
      this._checkLossCanSure()
    },

    _checkLossCanSure(){
      console.log("canlosssosocansave")
      var item = this.data.item;
      if(item.gbDgsMyLossWeight ){
        this.setData({
          canSure: true
        })
      }else{
        this.setData({
          canSure: false
        })
      }
    },


    getLossWeight(e) {
      var myLossWeightData = "item.gbDgsMyLossWeight";
      var restWeight = this.data.item.gbDgsRestWeight;
      if (e.detail.value.length > 0) {
        if (Number(e.detail.value) < Number(restWeight) || Number(e.detail.value) == Number(restWeight)) {
          this.setData({
            [myLossWeightData]: e.detail.value,
          })
        this._checkLossCanSure(e)      
        } else {

          wx.showToast({
            title: '不能大于剩余数量',
            icon: 'none'
          })
          this.setData({
            [myLossWeightData]: "-1",
            canSure: false,
          })
        }
      } else {
        this.setData({
          [myLossWeightData]: "-1",
          canSure: false,
        })
      }
    },


    cancle() {
      this.setData({
        show: false,
        showType: 4,
        canSure: true,
        stockArr: [],
        resWeight: 0,
        reason: "",
        src: ""
      })
      this.triggerEvent('cancle')
    },


    confirm(e) {
      if (this.data.canSure) {
        console.log("stockfonfimrmr",this.data.src);
        this.triggerEvent('confirm', {
          item: this.data.item,
          showType: this.data.showType,
          src: this.data.src,
          reason: this.data.reason,
        })
        this.setData({
          show: false,
          showType: "1",
          canSure: true,
          reason: "",
          src: "",
          resWeight: "0"
        })
      } 
      
    },


    // 


    onStarClick(e) {
      const totalStars = 5;
      const greenCount = this.data.greenStars.length;
      const index = e.currentTarget.dataset.index; // 获取点击的星星索引
      console.log("indeixxxxxx", index);
      // 判断点击的星星属于绿色还是灰色
      const isGreenStar = index < greenCount;
      let newStarCount;
      console.log("indeixxxxxx", isGreenStar);

      if (isGreenStar) {
        // 如果点击的是绿色星星，则减少到当前点击的星星数量
        newStarCount = index + 1;
      } else {
        // 如果点击的是灰色星星，则增加到当前点击的星星数量
        newStarCount = greenCount + (index - greenCount + 1);

      }

      // 限制星星数量范围
      newStarCount = Math.min(Math.max(newStarCount, 0), totalStars);

      // 更新数据
      this.setData({
        'item.gbDgsStars': newStarCount,
        gbDgsStars: newStarCount
      });
      // 强制调用更新星星数组
      //  this.updateStars(newStarCount);
      // 如果需要将新值传递给父组件，可以通过 triggerEvent 通知父组件
      // this.triggerEvent('updateStars', {
      //   gbDgsStars: newStarCount
      // });
    },



    updateStars(greenCount) {
      const totalStars = 5; // 总星星数量
      const grayCount = totalStars - greenCount; // 计算灰色星星数量
      this.setData({
        greenStars: new Array(greenCount).fill(1), // 用数组填充绿色星星
        grayStars: new Array(grayCount).fill(1), // 用数组填充灰色星星
      });
    },


    

    getStarsReason(e) {
      this.setData({
        reason: e.detail.value
      })
      this._checkStarsCanSure();
    },

    //选择图片
    choiceImg: function (e) {
      var _this = this;
      wx.chooseImage({
        count: 1, // 最多可以选择的图片张数，默认9
        sizeType: ['original', 'compressed'], // original 原图，compressed 压缩图，默认二者都有
        sourceType: ['album', 'camera'], // album 从相册选图，camera 使用相机，默认二者都有
        success: function (res) {
          _this.setData({
            src: res.tempFilePaths,
            isSelectImg: true,
          })
        },
        fail: function () {

        },

        complete: function () {
          // _this._checkStarsCanSure(e)
        }
      })
    },

    delPic() {
      this.setData({
        src: ""
      })
      this._checkLossCanSure()
    },

    choiceImgLarge: function (e) {
      var _this = this;
      wx.chooseImage({
        count: 1, // 最多可以选择的图片张数，默认9
        sizeType: ['original', 'compressed'], // original 原图，compressed 压缩图，默认二者都有
        sourceType: ['album', 'camera'], // album 从相册选图，camera 使用相机，默认二者都有
        success: function (res) {
          _this.setData({
            srcLarge: res.tempFilePaths,
            isSelectImg: true,
          })
        },
        fail: function () {

        },
        complete: function () {
          // _this._checkStarsCanSure(e)
        }
      })
    },

    delPicLarge() {
      this.setData({
        srcLarge: ""
      })
      // this._checkLossCanSure()
    },

    

    _checkStarsCanSure(){
      console.log("canlosssosocansave")
     
      if (this.data.src.length > 0 && this.data.reason.length > 0) {
        this.setData({
          canSure: true
        })
      } else {
        this.setData({
          canSure: false
        })
      }
    },


  },

  // lifetimes: {
  //   attached() {

  //       this.updateStars(this.data.item.gbDgsStars);
      
  //     // 初始化星星数据
     
  //   },
  // },










})