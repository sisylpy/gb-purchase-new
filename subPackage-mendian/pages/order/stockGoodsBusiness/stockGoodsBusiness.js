var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil');
var config = require('../../../../config/index.js');
var stockApi = require('../../../services/stockGoodsBusinessApi.js');

Page({

  onShow() {

     // 推荐直接用新API
     let windowInfo = wx.getWindowInfo();
     let globalData = getApp().globalData;
     this.setData({
       windowWidth: windowInfo.windowWidth * globalData.rpxR,
       windowHeight: windowInfo.windowHeight * globalData.rpxR,
       navBarHeight: globalData.navBarHeight * globalData.rpxR,
     });


     var myDate = wx.getStorageSync('myDate');
      if(myDate){
        this.setData({
          startDate: dateUtils.getDateRange(myDate.name).startDate,
          stopDate: dateUtils.getDateRange(myDate.name).stopDate,
          dateType: myDate.dateType,
        })
      }else{
        this.setData({
          dateType: 'month',
          startDate: dateUtils.getFirstDateInMonth(),
          stopDate: dateUtils.getArriveDate(0),
        })
      }
    this._getInitData();

  },

  data: {
    consultItem: {
      type: Object,
      value: ""
    },
    canSure: {
      type: Boolean,
      value: true
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
    showStockArr: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {


    this.setData({
      url: config.server,
      depGoodsId: options.depGoodsId,
      index: options.index,
      name: options.name,
      standard: options.standard,
      value: options.value,
      today: dateUtils.getArriveDate(0),
     
      nowTime: dateUtils.getNowTime(),

    })

    var userValue = wx.getStorageSync('userInfo');
    if (userValue) {
      this.setData({
        userInfo: userValue
      })
    }


    var disGoods = wx.getStorageSync('disGoods');
    if (disGoods) {
      this.setData({
        disGoods: disGoods
      })
    }

    var disInfo = wx.getStorageSync('disInfo');
    if (disInfo) {
      this.setData({
        disInfo: disInfo
      })
    }


  },

  _getInitData() {
    var data = {
      depGoodsId: this.data.depGoodsId,
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
    }
    load.showLoading("获取数据中")
    stockApi.getDepGoodsBusiness(data)
      .then(res => {
        load.hideLoading();

        if (res.result.code == 0) {
          this.setData({
            stockArr: res.result.data,
          })

        } else {
          this.setData({
            stockArr: []
          })
        }
      })
  },

  changeStar(e){
    var item = e.currentTarget.dataset.item;
    item.gbDistributerGoodsEntity = this.data.disGoods;

    this.setData({
      showStar: true,
      index: e.currentTarget.dataset.index,
      item: item,
      consultItem: JSON.parse(JSON.stringify(item)),
      canSure:false

    })
  },

  toDate(){
    wx.navigateTo({
      url: '../stockGoodsBusinessDate/stockGoodsBusinessDate?depGoodsId=' + this.data.depGoodsId,
    })
  }, 

  // stock
  showStock(e) {
    var item = e.currentTarget.dataset.item;
    
    item.gbDistributerGoodsEntity = this.data.disGoods;

    if (item.gbDgsWasteFullTime !== null  && item.gbDgsWasteFullTime !== '') {
      var endTime = item.gbDgsWasteFullTime;
      var startTime = this.data.nowTime;
      var endTimeFormat = endTime.replace(/-/g, '/') //所有的- 都替换成/
      var endTimeDown = Date.parse(new Date(endTimeFormat));
      var startTimeFormat = startTime.replace(/-/g, '/') //所有的- 都替换成/
      var startTimeDown = Date.parse(new Date(startTimeFormat));
      var thisResult = Number(endTimeDown) - Number(startTimeDown);
      thisResult = Math.floor(thisResult / 1000 / 60 / 60);
      if (thisResult < 0) { // 超过废弃时间
        var restWeight = item.gbDgsRestWeight;
        item.gbDgsMyWasteWeight = restWeight;
        item.gbDgsMyProduceWeight = "0";
        this.setData({
          canWaste: true,
          canSure: true,
          showType: 4,
        })
      } else {
        item.gbDgsMyProduceWeight = item.gbDgsRestWeight;
        this.setData({
          canWaste: false,
          resultTime: thisResult,
          canSure: true,
          showType: 1
        })
      }
    } else {
      item.gbDgsMyProduceWeight = item.gbDgsRestWeight;
      this.setData({
        canWaste: false,
        canSure: true,
        showType: 1
      })
    }

    console.log("item.gbDgsRestWeight" + item.gbDgsRestWeight);
    this.setData({
      showStock: true,
      index: e.currentTarget.dataset.index,
      item: item,
      consultItem: JSON.parse(JSON.stringify(item)),

    })
  },

  confirmStock(e) {
    var item = e.detail.item;
    var showType = e.detail.showType;
    if (this.data.transfer !== '1') {
      item.gbDgsReduceWeightUserId = this.data.userInfo.gbDepartmentUserId;
    }

    var kindMap = { 1: 'produce', 2: 'loss', 3: 'return', 4: 'waste' };
    var kind = kindMap[showType];
    if (!kind) {
      if (showType == 5) {
        // 星级 + 附件流程见 confirmStar / confirmStar1
      }
      return;
    }

    if (showType == 3) {
      item.gbDgsReturnUserId = this.data.userInfo.gbDepartmentUserId;
      this.setData({
        src: e.detail.srcReturn,
        reason: e.detail.reason,
      });
    }

    var that = this;
    load.showLoading("保存数据中");
    console.log(item);
    stockApi.saveDepGoodsStockAdjust(kind, item).then(function (res) {
      load.hideLoading();
      if (res.result.code != 0) {
        wx.showToast({
          title: res.result.msg,
          icon: 'none',
        });
        return;
      }

      var pages = getCurrentPages();
      if (pages.length >= 2) {
        var prevPage = pages[pages.length - 2];
        prevPage.setData({ update: true });
      }

      if (showType == 3) {
        var payload = res.result.data || {};
        var reduceId =
          payload.id != null && payload.id !== ''
            ? payload.id
            : payload.gbDepartmentGoodsStockReduceId;
        var src = that.data.src;
        var userName = that.data.reason;
        if (src && src.length > 0 && reduceId != null && reduceId !== '') {
          load.showLoading("保存数据中");
          console.log("filelellee", src, "userName", userName, "idididiid", reduceId);
          stockApi.reduceAttachmentSaveWithFile(src, userName, reduceId).then(function (attachRes) {
            load.hideLoading();
            if (attachRes.result == '{"code":0}') {
              that._getInitData();
            } else {
              wx.showToast({
                title: attachRes.result.msg,
                icon: 'none',
              });
            }
          });
          return;
        }
      }

      that._getInitData();
    });
  },

  confirmStar(e){
   
   var that = this;
    var src = e.detail.src;
    var reason = e.detail.reason;
    var id = this.data.item.gbDepartmentGoodsStockId;
    var userId = this.data.userInfo.gbDepartmentUserId;
    var stars = e.detail.item.gbDgsStars;
     load.showLoading("保存数据中")
     console.log("stars", stars)
    stockApi.reduceAttachmentSaveWithFileStar(src, reason, id,stars, userId).then((res) => {
      console.log(res);
      load.hideLoading();
      console.log("resres", res.result)
      if (res.result == '{"code":0}') {
        that.setData({
          showStar: false
        })
        that._getInitData();
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: 'none',
        });
      }
    })
  },


  delAttem(){
    
    stockApi.deleteReduceAttachment(this.data.item.starReduce.gbDeGoodsStockReduceAttachmentEntity.gbDepartmentGoodsStockReduceAttachId).then(res => {
      if(res.result.code == 0){
        this.setData({
          showStar:false
        })
        this._getInitData();
      }
    })
  },


  confirmStar1(e){
    var that = this;
    this.setData({
      src: e.detail.src,
      srcLarge: e.detail.srcLarge,
      reason: e.detail.reason,
      stars:  e.detail.item.gbDgsStars,
    })
    
    var data = {
      id: this.data.item.gbDepartmentGoodsStockId,
      stars: e.detail.item.gbDgsStars,
      userId: this.data.userInfo.gbDepartmentUserId
    }
    load.showLoading("修改新鲜度")
    stockApi.changeStockStars(data).then(res => {
      if (res.result.code == 0) {
        load.hideLoading();
        var changeData = "stockArr[" + this.data.index + "].gbDgsStars"
        this.setData({
          showStock: false,
          [changeData]: e.detail.item.gbDgsStars
        })      
       
        var reason = that.data.reason;
        var id = that.data.item.gbDepartmentGoodsStockId;
        var stars = that.data.stars;
        var src = that.data.src;
         load.showLoading("保存数据中")
        stockApi.reduceAttachmentSaveWithFileStar(src, reason, id, stars, that.data.userInfo.gbDepartmentUserId).then((res) => {
          console.log(res);
          load.hideLoading();
          if (res.result.code == 0) {
            console.log("that",that);
            that._getInitData();
          } else {
            load.hideLoading();
            wx.showToast({
              title: res.result.msg,
              icon: 'none',
            });
          }
        }).catch((error) => {
          load.hideLoading();
          wx.showToast({
            title: '上传失败，请重试',
            icon: 'none',
          });
          console.error(error);
        });
      }
    });
  },

  // 更新上一个页面的 depGoodsArrAi 数组
  updatePrevPageDepGoodsArrAi(resData) {
    try {
      var pages = getCurrentPages();
      
      // 检查页面栈是否足够长
      if (pages.length < 2) {
        console.warn('页面栈长度不足，无法更新上一个页面');
        return false;
      }
      
      var prevPage = pages[pages.length - 2]; // 获取上一个页面实例
      
      // 检查上一个页面是否存在
      if (!prevPage) {
        console.warn('上一个页面不存在');
        return false;
      }
      
      // 检查上一个页面是否有 depGoodsArrAi 数据
      if (!prevPage.data.depGoodsArrAi || !Array.isArray(prevPage.data.depGoodsArrAi)) {
        console.warn('上一个页面没有 depGoodsArrAi 数组数据');
        return false;
      }
        // 检查上一个页面是否有 depGoodsArrAi 数据
        if (!prevPage.data.depGoodsArrAi || !Array.isArray(prevPage.data.depGoodsArrAi)) {
          console.warn('上一个页面没有 depGoodsArrAi 数组数据');
          return false;
        }
      // 获取商品索引
      var goodsIndex = this.data.index;
      
      // 检查索引是否有效
      if (goodsIndex === undefined || goodsIndex < 0 || goodsIndex >= prevPage.data.depGoodsArrAi.length) {
        console.warn('商品索引无效:', goodsIndex);
        return false;
      }
      
      // 构建动态属性名
      var dataKey = "depGoodsArrAi[" + goodsIndex + "]";
      
      // 更新上一个页面的数据
      prevPage.setData({
        [dataKey]: resData,
        update: true // 同时设置更新标记
      });
      
      console.log('成功更新上一个页面的 depGoodsArrAi[' + goodsIndex + ']:', resData);
      return true;
      
    } catch (error) {
      console.error('更新上一个页面数据时发生错误:', error);
      return false;
    }
  },

  updateStars(e) {
    console.log(e);
    var data = {
      id: this.data.item.gbDepartmentGoodsStockId,
      stars: e.detail.gbDgsStars,
    }
    stockApi.changeStockStars(data).then(res => {
      if (res.result.code == 0) {
        // 更新上一个页面的数据
        var updateSuccess = this.updatePrevPageDepGoodsArrAi(res.result.data);
        
        if (updateSuccess) {
          console.log('成功更新上一个页面数据');
        } else {
          console.warn('更新上一个页面数据失败');
        }
        
        this.setData({
          showStock: false,
          item: "",
        })
        this._getInitData();
      }
    })
  },











  deleteReduce(e) {

    console.log(e)
    var id = e.currentTarget.dataset.id;

    stockApi.deleteReduceItem(id)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          // 更新上一个页面的数据
          var updateSuccess = this.updatePrevPageDepGoodsArrAi(res.result.data);
          
          if (updateSuccess) {
            console.log('成功更新上一个页面数据');
          } else {
            console.warn('更新上一个页面数据失败');
          }

          this._getInitData()
        }
      })

  },


  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },




})