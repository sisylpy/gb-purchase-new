// pages/customer/customer.js


var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
import apiUrl from '../../../../config.js'

import {
  getFoodList,
} from '../../../services/apiDistributerFood'

import {
  deleteFood,
} from '../../../services/apiDistributerGbFood'



Page({


  data: {
    scrollViewTop: 0,

  },

  onShow(){
    this._initData();  

  },

  onLoad(optons) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      fatherId: optons.fatherId,
      fatherName: optons.name, 
      url: apiUrl.server ,

    })
    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
              userInfo: value,
      })
    }

    this._initData();

  },

_initData(){
  load.showLoading("获取供货商")
  getFoodList(this.data.fatherId).then(res => {
    load.hideLoading();
    if (res.result.code == 0) {
      this.setData({
        storeArr: res.result.data,
        toAdd:false
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

toFoodDetail(e) {
    var depInfoItem = e.currentTarget.dataset.item;
    wx.navigateTo({
      url: '../FoodDetail/FoodDetail?FoodId=' + depInfoItem.gbDistributerFoodId + '&FoodName=' + depInfoItem.gbDfFoodName,
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

  showEdit(e){
    this.setData({
      showOperation: true,
      item: e.currentTarget.dataset.item,  
    })
  },


  addFood() {
    this.setData({
      toAdd: true,
    })
    wx.navigateTo({
      url: '../addFood/addFood?fatherId=' + this.data.fatherId
       + '&fatherName=' + this.data.fatherName  +'&type=add',
    })
  },
  showEdit(e){
    this.setData({
      showOperation: true,
      item: e.currentTarget.dataset.item
    })
  },
  editFood(e){
    this.setData({
      showOperation: false,

    })
    wx.setStorageSync('Food', this.data.item)
    wx.navigateTo({
      url: '../addFood/addFood?fatherName=' + this.data.fatherName 
        +'&type=edit',
    })
  },

  deleteFood(){
    load.showLoading("删除菜品")
    var data ={
      id: this.data.item.gbDistributerFoodId
    }
    deleteFood(data)
    .then(res =>{
      load.hideLoading();
      if(res.result.code == 0){
        this._initData()
      }else{ 
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
      this.setData({
        showOperation:false,
        item: ""
      })
    })
  },

  hideMask(){
    this.setData({
      showOperation: false
    })
  },

  addRaw(e){
    wx.setStorageSync('Food', this.data.item)
    wx.navigateTo({
      url: '../addRaw/addRaw?type=add',
    })
  },


  editRaw(){
    wx.setStorageSync('Food', this.data.item)
    wx.navigateTo({
      url: '../addRaw/addRaw?type=edit',
    })
  }









})