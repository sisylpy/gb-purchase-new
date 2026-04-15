var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;

import {
  disGetFood,
} from '../../../services/apiDistributerFood'

Page({
  data: {
    showOperation: false,
    item: null,
  },

  onShow() {
    if (this.data.toAdd) {
      this._initData();
    }
  },

  onLoad() {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
    })
    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
        disId: value.gbDuDistributerId,
        userInfo: value,
      })
    }
    this._initData();
  },

  _initData() {
    load.showLoading("获取菜品")
    disGetFood(this.data.disId).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        this.setData({
          storeArr: res.result.data,
          toAdd: false,
        })
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },

  // 跳转菜品列表
  toFoodList(e) {
    wx.navigateTo({
      url: '../foodList/foodList?fatherId=' + e.currentTarget.dataset.id + '&name=' + e.currentTarget.dataset.name,
    })
  },

  // 添加菜品类别
  addFood() {
    this.setData({ toAdd: true })
    wx.navigateTo({
      url: '../addFoodFather/addFoodFather?disId=' + this.data.disId + '&type=add',
    })
  },

  // 长按显示操作菜单
  showEdit(e) {
    this.setData({
      item: e.currentTarget.dataset.item,
      showOperation: true
    })
  },

  // 隐藏遮罩
  hideMask() {
    this.setData({ showOperation: false })
  },

  // 编辑类别
  editFatherFood() {
    this.setData({ toAdd: true, showOperation: false })
    wx.setStorageSync('fatherFood', this.data.item)
    wx.navigateTo({
      url: '../addFoodFather/addFoodFather?disId=' + this.data.disId + '&type=edit',
    })
  },

  // 删除类别
  deleteFatherFood() {
    const item = this.data.item;
    wx.showModal({
      title: '提示',
      content: '确定删除"' + item.gbDfFoodName + '"吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ showOperation: false })
          this._initData();
        }
      }
    })
  },

  // 返回
  toBack() {
    wx.navigateBack({ delta: 1 })
  },
})
