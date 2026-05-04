var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil.js');
var apiUrl = require('../../../../config/index.js');
const globalData = getApp().globalData;

import {
  downLoadDepFood,
  cancleDownloadFood,
} from '../../../services/apiDistributerFood';

import {
  deleteFood as apiDeleteFood,
  reStartFood,
} from '../../../services/apiDistributerGbFood';

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

function deleteGbFoodFather(foodId) {
  return new Promise(function (resolve, reject) {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerfood/deleteGbFoodFather/' + foodId,
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

function formatFatherMarginDisplay(cat) {
  var rate = cat.gbDfTargetGrossMarginRate;
  var fl = cat.gbDfGrossMarginFloatAbs;
  var rateStr = '—';
  if (rate != null && rate !== '') {
    var rn = parseFloat(String(rate).trim());
    rateStr = isNaN(rn) ? '—' : rn + '%';
  }
  var floatStr = '—';
  if (fl != null && fl !== '') {
    var fn = parseFloat(String(fl).trim());
    floatStr = isNaN(fn) ? '—' : '±' + fn;
  }
  return { displayTargetMargin: rateStr, displayMarginFloat: floatStr };
}

function normalizeStoreArr(list) {
  var raw = list || [];
  return raw.map(function (cat) {
    var dishes =
      cat.foodEntityList ||
      cat.gbDistributerFoodEntityList ||
      [];
    if (!Array.isArray(dishes)) {
      dishes = [];
    }
    var marginDisp = formatFatherMarginDisplay(cat);
    return Object.assign({}, cat, marginDisp, { foodEntityList: dishes });
  });
}

Page({
  data: {
    showFatherMenu: false,
    fatherItem: null,
    dishItem: null,
    fatherId: '',
    fatherName: '',
    todayDate: '',
    departmentId: '',
    disInfo: null,
    hasDepartmentChoices: false,
    scrollViewTop: 0,
    showChoiceDep: false,
    departmentChoiceList: [],
    selectedDepName: '',
    gbDepId: '',
    showOperationDep: false,
    /** 当前展开的大类 id，null 表示全部收起；同时只展开一个 */
    expandedCatId: null,
  },

  onShow() {
    var disInfo = wx.getStorageSync('disInfo');
    if (disInfo) {
      var mlist = disInfo.mendianDepartmentList || [];
      var depChoiceCount = this._buildFoodDepChoices(disInfo).length;
      this.setData({
        disInfo: disInfo,
        departmentId: mlist.length ? mlist[0].gbDepartmentId : '',
        hasDepartmentChoices: depChoiceCount > 1,
      });
    } else {
      this.setData({
        hasDepartmentChoices: false,
      });
    }
    this._initData();
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
    });
    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
        disId: value.gbDuDistributerId,
        userInfo: value,
      });
    }
  },

  _initData() {
    load.showLoading('获取菜品');
    disGetFood(this.data.disId)
      .then((res) => {
        load.hideLoading();
        if (res.result.code == 0) {
          var normalized = normalizeStoreArr(res.result.data);
          var open = this.data.expandedCatId;
          var stillOpen =
            open != null &&
            normalized.some(function (c) {
              return String(c.gbDistributerFoodId) === String(open);
            });
          this.setData({
            storeArr: normalized,
            toAdd: false,
            expandedCatId: stillOpen ? open : null,
          });
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none',
          });
        }
      })
      .catch(function () {
        load.hideLoading();
      });
  },

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

  addFoodCategory() {
    this.setData({ toAdd: true });
    wx.navigateTo({
      url: '../addFoodFather/addFoodFather?disId=' + this.data.disId + '&type=add',
    });
  },

  toggleCatDishes: function (e) {
    var id = e.currentTarget.dataset.catId;
    if (id === undefined || id === null) {
      return;
    }
    var cur = this.data.expandedCatId;
    if (cur != null && String(cur) === String(id)) {
      this.setData({ expandedCatId: null });
    } else {
      this.setData({ expandedCatId: id });
    }
  },

  addDish(e) {
    var id = e.currentTarget.dataset.fatherId;
    var name = e.currentTarget.dataset.fatherName;
    this.setData({ toAdd: true });
    wx.navigateTo({
      url:
        '../addFood/addFood?fatherId=' +
        id +
        '&fatherName=' +
        name +
        '&type=add',
    });
  },

  showEditFather(e) {
    this.setData({
      fatherItem: e.currentTarget.dataset.item,
      showFatherMenu: true,
    });
  },

  _applyDishFromEventThen(e, fn) {
    var ds = e.currentTarget.dataset;
    this.setData(
      {
        dishItem: ds.item,
        fatherId: ds.fatherId,
        fatherName: ds.fatherName,
      },
      fn
    );
  },

  onDishAddToDepartment(e) {
    var self = this;
    this._applyDishFromEventThen(e, function () {
      self.startAddFoodToDepartment();
    });
  },

  onDishEditRaw(e) {
    var self = this;
    this._applyDishFromEventThen(e, function () {
      wx.setStorageSync('Food', self.data.dishItem);
      wx.navigateTo({
        url: '../addRaw/addRaw?type=edit',
      });
    });
  },

  onDishEditFood(e) {
    var self = this;
    this._applyDishFromEventThen(e, function () {
      self.editFood();
    });
  },

  onDishDeleteFood(e) {
    var self = this;
    this._applyDishFromEventThen(e, function () {
      self.deleteFood();
    });
  },

  onDishRestartFood(e) {
    var self = this;
    this._applyDishFromEventThen(e, function () {
      self.reStartFood();
    });
  },

  noop() {},

  hideMask() {
    this.setData({
      showFatherMenu: false,
      showOperationDep: false,
      showChoiceDep: false,
    });
  },

  hideChoiceDepMask() {
    this.setData({ showChoiceDep: false });
  },

  editFatherFood() {
    this.setData({ toAdd: true, showFatherMenu: false });
    wx.setStorageSync('fatherFood', this.data.fatherItem);
    wx.navigateTo({
      url: '../addFoodFather/addFoodFather?disId=' + this.data.disId + '&type=edit',
    });
  },

  deleteFatherFood() {
    var item = this.data.fatherItem;
    wx.showModal({
      title: '提示',
      content: '确定删除"' + item.gbDfFoodName + '"吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ showFatherMenu: false });
          this._deletFatherFood();
        }
      },
    });
  },

  _deletFatherFood() {
    var foodId = this.data.fatherItem.gbDistributerFoodId;
    deleteGbFoodFather(foodId).then((res) => {
      if (res.result.code == 0) {
        this._initData();
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none',
        });
      }
    });
  },

  editFood() {
    wx.setStorageSync('Food', this.data.dishItem);
    wx.navigateTo({
      url:
        '../addFood/addFood?fatherName=' +
        this.data.fatherName +
        '&type=edit',
    });
  },

  deleteFood() {
    load.showLoading('删除菜品');
    var data = {
      id: this.data.dishItem.gbDistributerFoodId,
    };
    apiDeleteFood(data).then((res) => {
      load.hideLoading();
      if (res.result.code == 0) {
        this._initData();
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none',
        });
      }
      this.setData({
        dishItem: null,
      });
    });
  },

  reStartFood() {
    reStartFood(this.data.dishItem.gbDistributerFoodId).then((res) => {
      load.hideLoading();
      if (res.result.code == 0) {
        this._initData();
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none',
        });
      }
      this.setData({
        dishItem: null,
      });
    });
  },

  startAddFoodToDepartment() {
    var disInfo = wx.getStorageSync('disInfo');
    if (
      !disInfo ||
      !disInfo.mendianDepartmentList ||
      !disInfo.mendianDepartmentList.length
    ) {
      wx.showToast({ title: '未获取门店信息', icon: 'none' });
      return;
    }
    var food = this.data.dishItem;
    if (!food || !food.gbDistributerFoodId) {
      wx.showToast({ title: '菜品数据异常', icon: 'none' });
      return;
    }
    var choices = this._buildFoodDepChoices(disInfo);
    if (!choices.length) {
      wx.showToast({ title: '没有可选部门', icon: 'none' });
      return;
    }
    var priceVal =
      food.gbDfFoodPrice != null && food.gbDfFoodPrice !== ''
        ? String(food.gbDfFoodPrice)
        : '';
    this.setData({
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
      price: e.detail.value,
    });
  },

  downLoadGoods() {
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
    load.showLoading('保存部门菜品');
    downLoadDepFood(data)
      .then((res) => {
        load.hideLoading();
        if (res.result.code == 0) {
          this.setData({
            showOperationDep: false,
            showChoiceDep: false,
            dishItem: null,
            foodId: '',
            price: '',
            gbDepId: '',
            selectedDepName: '',
          });
          this._initData();
        } else {
          wx.showToast({
            title: res.result.msg || '保存失败',
            icon: 'none',
          });
        }
      })
      .catch(function () {
        load.hideLoading();
        wx.showToast({ title: '网络异常', icon: 'none' });
      });
  },

  cancleDownloadFood(e) {
    var depFood = e.currentTarget.dataset.item;
    load.showLoading('取消菜品');
    cancleDownloadFood(depFood).then((res) => {
      load.hideLoading();
      if (res.result.code == 0) {
        this._initData();
      }
    });
  },

  onPageScroll(e) {
    this.setData({
      scrollViewTop: e.scrollTop * globalData.rpxR,
    });
  },

  toBack() {
    wx.navigateBack({ delta: 1 });
  },
});
