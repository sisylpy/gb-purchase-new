var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
var dateUtils = require('../../../../utils/dateUtil');
import apiUrl from '../../../../config.js'


import {
  getNxGoodsFenxi
} from '../../../../lib/apiDepOrder.js'

Page({

  onShow(){

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
  
  /**
   * 页面的初始数据
   */
  data: {
    type: "goods",
    typeString: "",
    showSearch: false
  },

  

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      nxDisId: options.nxDisId,
      filterShow: true,
      startDate: dateUtils.getFirstDateInMonth(),
      stopDate: dateUtils.getArriveDate(0),
      dateType: "month",
    
    })

    var disInfo = wx.getStorageSync('disInfo');
    if(disInfo){
      this.setData({
        disInfo: disInfo
      })
    }

   
      this._getInitData();
    
  },

  _getInitData() {
    var data = {
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      nxDisId: this.data.nxDisId,
      gbDisId: this.data.disInfo.gbDistributerId,
      type:  this.data.type,
    }
    load.showLoading("获取数据中");
    getNxGoodsFenxi(data)
      .then(res => {
        load.hideLoading();
        console.log(res.result.data)
        if (res.result.code == 0) {
          this.setData({
            arr: res.result.data.arr,
            nxDisItem: res.result.data.item,
           
          })
        }
      }) 
  },


  toDatePage(){
    this.setData({
      update: true,
    })
    wx.navigateTo({
      url: '../../sel/date/date?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType,
    })
  },




  /**
   * 关闭操作面板
   */
  hideMask() {
    this.setData({
      showStar: false,
      showGoods: ""
    })
  },

  
  showGoodStar(e){
    this.setData({
      showStar: true,
      showGoods: e.currentTarget.dataset.item,
    })
  },


  showSearch(){
    this.setData({
      showSearch: true,
    })
  },


  searchData(e){
    this.setData({
      showSearch: false,
      type: e.currentTarget.dataset.type,
      typeString: e.currentTarget.dataset.string
    })
    this._getInitData();

  },

  cancleSarch(){
    this.setData({
      type: "goods",
      typeString: ""
    })
    this._getInitData();
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


  toDetail(e){
    wx.setStorageSync('disGoods', e.currentTarget.dataset.item);
    wx.navigateTo({
      url: '../../goods/disGoodsPage/disGoodsPage?disGoodsId=' + e.currentTarget.dataset.item.gbDistributerGoodsId,
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

  onUnload(){
    
  }

})