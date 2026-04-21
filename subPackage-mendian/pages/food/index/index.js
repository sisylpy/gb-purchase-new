var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil.js');
var apiUrl = require('../../../../config/index.js');
var foodSalesExcelApi = require('../../../services/foodSalesExcelApi.js');
const globalData = getApp().globalData;

/** 与 apiDistributerFood.disGetFood 一致；本页仅用 require，避免与 enhance 编译混用 import 导致方法未挂上 Page */
function disGetFood(disId) {
  return new Promise(function (resolve, reject) {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerfood/disGetFood/' + disId,
      method: 'GET',
      success: function (res) {
        resolve({ result: res.data });
      },
      fail: function (e) {
        load.hideLoading();
        reject(e);
      },
    });
  });
}


Page({
  data: {
    showOperation: false,
    item: null,
   
    todayDate: '',
    departmentId: '',
    disInfo: null,
  },

  onShow() {
    var disInfo = wx.getStorageSync('disInfo');
    if (disInfo) {
      this.setData({
        disInfo: disInfo,
        departmentId: this._resolveDepartmentId(disInfo),
      });
    }
    if (this.data.toAdd) {
      this._initData();
    }
  },

  onLoad() {
    const today = dateUtils.getArriveDate(0);
    const firstDay = today.substring(0, 8) + '01';
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      todayDate: today,
      foodSalesTemplateStartDate: firstDay,
      foodSalesTemplateEndDate: today,
    })
    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
        disId: value.gbDuDistributerId,
        userInfo: value,
      })
    }
    var disInfo = wx.getStorageSync('disInfo');
    if (disInfo) {
      this.setData({
        disInfo: disInfo,
        departmentId: this._resolveDepartmentId(disInfo),
      })
    }
    this._initData();
  },

  _resolveDepartmentId(disInfo) {
    if (!disInfo) return '';
    if (disInfo.mendianDepartmentList && disInfo.mendianDepartmentList.length) {
      return disInfo.mendianDepartmentList[0].gbDepartmentId;
    }
    if (disInfo.purDepartmentList && disInfo.purDepartmentList.length) {
      return disInfo.purDepartmentList[0].gbDepartmentId;
    }
    if (disInfo.gbDepartmentId) {
      return disInfo.gbDepartmentId;
    }
    return '';
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

  noop() {},

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
