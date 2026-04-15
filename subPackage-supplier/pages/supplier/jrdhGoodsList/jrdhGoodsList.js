var load = require('../../../../../lib/load.js');
const globalData = getApp().globalData;


// import {
//   getEveryGoodsJrdh
// } from '../../../../../lib/apiDepOrder.js'

Page({
  onShow() {

    var searchStockDeps = wx.getStorageSync('selStockDepList');
    if (searchStockDeps) {
      this.setData({
        stockDepartmentList: searchStockDeps
      })
    }else{
      this.setData({
        stockDepartmentList: []
      })
    }  

    var searchKitchenDeps = wx.getStorageSync('selKitchenDepList');
    if (searchKitchenDeps) {
      this.setData({
        kitchenDepartmentList: searchKitchenDeps
      })
    }else{
      this.setData({
        kitchenDepartmentList: []
      })
    } 
   
    console.log("11111111-------------");

    if(searchStockDeps || searchKitchenDeps){
      console.log("222222-------------");
      this._getSearchDepIds();
    }else{
      this.setData({
        searchDepIds: -1,
        searchDepName: ""
      })
     
    }
   
    
    this._getInitData();
  },
  /**
   * 页面的初始数据
   */
  data: {

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      disGoodsFatherId: options.fatherId,
      searchDepIds: Number(options.searchDepIds),
      searchDepName: options.searchDepName,
      startDate: options.startDate,
      stopDate: options.stopDate,
      total: options.total,
      fatherName: options.fatherName
    
    })

    
      
    
  },

  _getInitData() {
    var data = {
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      goodsFatherId: this.data.disGoodsFatherId,
      searchDepIds: this.data.searchDepIds,
    }
    load.showLoading("获取数据中");
    getEveryGoodsJrdh(data)
      .then(res => {
        load.hideLoading();
        console.log(res.result.data)
        if (res.result.code == 0) {
          this.setData({
            arr: res.result.data
           
          })
        }
      }) 
  },



  _getSearchDepIds(){
    var ids = "";
    var name = "";
    var selArr = [];
    var stockArr = this.data.stockDepartmentList;
    if(stockArr.length > 0){
      for(var i =0; i < stockArr.length; i++){
        selArr.push(stockArr[i]);
        ids = ids + stockArr[i].gbDepartmentId + ",";
        name = name +  stockArr[i].gbDepartmentName + ",";
      }
    }
    var kitchenArr = this.data.kitchenDepartmentList;
    if(kitchenArr.length > 0){
      for(var i =0; i < kitchenArr.length; i++){
        selArr.push(kitchenArr[i]);
        ids = ids + kitchenArr[i].gbDepartmentId + ",";
        name = name +  kitchenArr[i].gbDepartmentName + ",";
      }
    }

    this.setData({
      searchDepIds: ids,
      searchDepName: name,
    })
  },

  openOperation(e) {
    var detail =  e.currentTarget.dataset.detail;
    if(detail != null){
      this.setData({
        goodsDetail:detail
      })
    }else{
      this.setData({
        goodsDetail:""
      })
    }
    this.setData({
      showOperation: true,
      goodsId: e.currentTarget.dataset.id,
     
      
    })
  },

  /**
   * 关闭操作面板
   */
  hideMask() {
    this.setData({
      showOperation: false,
    
    })
  },


  toOrderList(e){
     wx.setStorageSync('disGoods', e.currentTarget.dataset.item);
    wx.navigateTo({
      url: '../jrdhOrderList/jrdhOrderList?disGoodsId=' + e.currentTarget.dataset.id
       + '&startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate  + '&searchDepIds=' + this.data.searchDepIds + '&searchDepName=' + this.data.searchDepName
       +'&total=' + e.currentTarget.dataset.value,
       
    })
  },

  


  delSearch(){
    wx.removeStorageSync('selDepList');;
    this.setData({
      searchDepIds: -1,
      searchDepName : ""
    })
    this._getInitData();

  },

  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },

})