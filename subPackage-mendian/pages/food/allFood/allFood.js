

var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
import apiUrl from '../../../../config/index.js'

import {
  depGetAllFood,
  downLoadDepFood,
  cancleDownloadFood
} from '../../../services/apiDistributerFood'

Page({


  data: {
    scrollViewTop: 0,

  },
  onShow() {
    if (this.data.toAdd) {
      this._initData();
    }
  },

  onLoad(optons) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      disId: optons.disId,
      url: apiUrl.server ,
      type: optons.type,
    })

    var value = wx.getStorageSync('depItem');
    if (value) {
      this.setData({
        depItem: value,
        depArr: value.gbDepartmentEntityList
      })
    }

    this._initData();

  },

  _initData() {
      var data = {
        disId: this.data.disId,
        depFatherId: this.data.depItem.gbDepartmentId
      }
      load.showLoading("获取供货商")
    depGetAllFood(data).then(res => {
      if (res.result.code == 0) {
        load.hideLoading();
        this.setData({
          foodArr: res.result.data,
          toAdd: false

        })
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })

  },





  /**
   * 
   * @param {*} e 
   */
  onPageScroll: function (e) { // 页面滚动监听
    console.log(e)
    this.setData({
      scrollViewTop: e.scrollTop * globalData.rpxR,
    })

  },
  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },

  showDownloadFood(e) {
    this.setData({
      showOperation: true,
      item: e.currentTarget.dataset.item,
      foodId: e.currentTarget.dataset.item.gbDistributerFoodId,
      price: e.currentTarget.dataset.item.gbDfFoodPrice,
    })
  },

  getNewPrice(e) {
    this.setData({
      price: e.detail.value
    })
  },
  selectItem(e) {
    console.log(e);
  
    var index = e.currentTarget.dataset.index;
    this.setData({
      gbDepId: e.currentTarget.dataset.id,
    })
   

    for (var i = 0; i < this.data.depArr.length; i++) {
      var selItemData = "depArr[" + i + "].isSelected";
      if (i == index) {
        this.setData({
          [selItemData]: true,
        })
      } else {
        this.setData({
          [selItemData]: false,
        })
      }
    }
  },

  downLoadGoods(e) {
    if(this.data.depItem.gbDepartmentSubAmount == 0){
      this.setData({
        gbDepId: this.data.depItem.gbDepartmentId,
      })
    }
    // var data = {
    //   depId: this.data.gbDepId,
    //   depFatherId: this.data.depItem.gbDepartmentId,
    //   foodId: this.data.foodId,
    //   price: this.data.price,
    // }
    var data = {
      gbDfDepId: 1,
      gbDfDepFatherId: 2,
      gbDfFoodFatherId: 1,
      gbDfFoodId: 3,
      gbDfFoodPrice:55,
      gbDfDistributerId: 1,
      gbDfStatus: 0,
    }
    load.showLoading("保存部门菜品")
    downLoadDepFood(data).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        this.setData({
          showOperation: false,
          item: "",
          foodId: "",
          price: "",
        })
        // var pages = getCurrentPages();
        // var prevPage = pages[pages.length - 2]; //上一个页面
        // //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
        // prevPage.setData({
        //   updateFood: true
        // })
        // this._initData();
      }
    })
  },

  cancleDownloadFood(e){
    var depFood = e.currentTarget.dataset.item;
    load.showLoading("取消菜品")
    cancleDownloadFood(depFood).then(res =>{
      load.hideLoading();
      if(res.result.code == 0){
        this._initData();
      }
    })

  }









})