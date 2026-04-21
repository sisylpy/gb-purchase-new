// pages/customer/customer.js


var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
import apiUrl from '../../../../config/index.js'

import {
  getFoodList,
  downLoadDepFood,
  cancleDownloadFood
} from '../../../services/apiDistributerFood'

import {
  deleteFood,
} from '../../../services/apiDistributerGbFood'



Page({


  data: {
    scrollViewTop: 0,
    showChoiceDep: false,
    departmentChoiceList: [],
    selectedDepName: '',
    gbDepId: '',
    showOperationDep: false,
  },

  onShow(){
    this._initData();  

  },

  /**
   * 将「门店 + 子部门」展平为可选销售部门列表（一项则无需弹窗）。
   */
  _buildFoodDepChoices(disInfo) {
    var choices = [];
    var list = (disInfo && disInfo.mendianDepartmentList) || [];
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      var subs = m.gbDepartmentEntityList || [];
      var hasSubs = m.gbDepartmentSubAmount > 0 && subs.length > 0;
      if (!hasSubs) {
        choices.push({
          gbDepartmentId: m.gbDepartmentId,
          gbDepartmentName: m.gbDepartmentName,
          gbDfDepFatherId: m.gbDepartmentId,
        });
      } else {
        for (var j = 0; j < subs.length; j++) {
          var s = subs[j];
          choices.push({
            gbDepartmentId: s.gbDepartmentId,
            gbDepartmentName: m.gbDepartmentName + ' · ' + s.gbDepartmentName,
            gbDfDepFatherId: m.gbDepartmentId,
          });
        }
      }
    }
    return choices;
  },

  _findMendianById(disInfo, fatherId) {
    var list = (disInfo && disInfo.mendianDepartmentList) || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].gbDepartmentId === fatherId) return list[i];
    }
    return null;
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
    var value = wx.getStorageSync('disInfo');
    if (value && value.mendianDepartmentList && value.mendianDepartmentList.length) {
      this.setData({
        disInfo: value,
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
      item: e.currentTarget.dataset.item
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

  noop() {},

  hideMask(){
    this.setData({
      showOperation: false,
      showOperationDep: false,
      showChoiceDep: false,
    })
  },

  hideChoiceDepMask() {
    this.setData({ showChoiceDep: false });
  },

  /** 从操作菜单进入：先选部门（多选一时弹层），再打开价格弹窗 */
  startAddFoodToDepartment() {
    var disInfo = wx.getStorageSync('disInfo');
    if (!disInfo || !disInfo.mendianDepartmentList || !disInfo.mendianDepartmentList.length) {
      wx.showToast({ title: '未获取门店信息', icon: 'none' });
      return;
    }
    var food = this.data.item;
    if (!food || !food.gbDistributerFoodId) {
      wx.showToast({ title: '菜品数据异常', icon: 'none' });
      return;
    }
    var choices = this._buildFoodDepChoices(disInfo);
    if (!choices.length) {
      wx.showToast({ title: '没有可选部门', icon: 'none' });
      return;
    }
    var priceVal = food.gbDfFoodPrice != null && food.gbDfFoodPrice !== '' ? String(food.gbDfFoodPrice) : '';
    this.setData({
      showOperation: false,
      disInfo: disInfo,
      price: priceVal,
      foodId: food.gbDistributerFoodId,
    });
    if (choices.length === 1) {
      var c0 = choices[0];
      var depItem0 = this._findMendianById(disInfo, c0.gbDfDepFatherId);
      if (!depItem0) {
        wx.showToast({ title: '门店数据异常', icon: 'none' });
        return;
      }
      this.setData({
        gbDepId: c0.gbDepartmentId,
        selectedDepName: c0.gbDepartmentName,
        depItem: depItem0,
        showOperationDep: true,
      });
      return;
    }
    this.setData({
      showChoiceDep: true,
      departmentChoiceList: choices,
    });
  },

  selectDepartmentForFood(e) {
    var choice = e.currentTarget.dataset.item;
    if (!choice || !choice.gbDepartmentId) return;
    var disInfo = this.data.disInfo || wx.getStorageSync('disInfo');
    var depItem = this._findMendianById(disInfo, choice.gbDfDepFatherId);
    if (!depItem) {
      wx.showToast({ title: '门店数据异常', icon: 'none' });
      return;
    }
    this.setData({
      showChoiceDep: false,
      gbDepId: choice.gbDepartmentId,
      selectedDepName: choice.gbDepartmentName,
      depItem: depItem,
      showOperationDep: true,
    });
  },

  getNewPrice(e) {
    this.setData({
      price: e.detail.value
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
  },




  downLoadGoods(e) {
    var gbDepId = this.data.gbDepId;
    var disInfo = this.data.disInfo || wx.getStorageSync('disInfo');
    var depItem = this.data.depItem;
    if (!gbDepId || !disInfo || !depItem) {
      wx.showToast({ title: '请选择销售部门', icon: 'none' });
      return;
    }
    var priceStr = (this.data.price != null ? String(this.data.price) : '').trim();
    if (priceStr === '' || isNaN(Number(priceStr))) {
      wx.showToast({ title: '请输入有效价格', icon: 'none' });
      return;
    }
    var fatherId = this.data.fatherId;
    var foodFatherId = 0;
    if (fatherId != null && fatherId !== '') {
      var n = parseInt(fatherId, 10);
      foodFatherId = isNaN(n) ? 0 : n;
    }
    var data = {
      gbDfDepId: gbDepId,
      gbDfDepFatherId: depItem.gbDepartmentId,
      gbDfFoodFatherId: foodFatherId,
      gbDfFoodId: this.data.foodId,
      gbDfFoodPrice: Number(priceStr),
      gbDfDistributerId: disInfo.gbDistributerId,
      gbDfStatus: 0,
    };
    load.showLoading("保存部门菜品")
    downLoadDepFood(data).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        this.setData({
          showOperation: false,
          showOperationDep: false,
          showChoiceDep: false,
          item: "",
          foodId: "",
          price: "",
          gbDepId: "",
          selectedDepName: "",
        })
        this._initData();
      } else {
        wx.showToast({
          title: res.result.msg || '保存失败',
          icon: 'none'
        })
      }
    }).catch(function() {
      load.hideLoading();
      wx.showToast({ title: '网络异常', icon: 'none' });
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