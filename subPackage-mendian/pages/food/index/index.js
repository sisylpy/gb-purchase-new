var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil.js');
var apiUrl = require('../../../../config/index.js');
const globalData = getApp().globalData;

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
    todayDate: '',
  },

  onShow() {
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
          this.setData({
            storeArr: normalized,
            toAdd: false,
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

  addFoodCategory() {
    this.setData({ toAdd: true });
    wx.navigateTo({
      url: '../addFoodFather/addFoodFather?disId=' + this.data.disId + '&type=add',
    });
  },

  openCategoryFoodList(e) {
    var ds = e.currentTarget.dataset;
    /** data-father-id / data-father-name：勿用 data-item 传整条 cat，dataset 不可靠 */
    var fid = ds.fatherId != null ? ds.fatherId : ds.gbDistributerFoodId;
    if (fid === undefined || fid === null || fid === '') {
      return;
    }
    var name = ds.fatherName != null ? String(ds.fatherName) : '';
    wx.navigateTo({
      url:
        '../depFoodList/depFoodList?foodFatherId=' +
        encodeURIComponent(String(fid)) +
        '&fatherName=' +
        encodeURIComponent(name) +
        '&disId=' +
        encodeURIComponent(String(this.data.disId != null ? this.data.disId : '')),
    });
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
    var fid = e.currentTarget.dataset.fatherId;
    if (fid === undefined || fid === null || fid === '') {
      return;
    }
    var arr = this.data.storeArr || [];
    var match = arr.filter(function (c) {
      return String(c.gbDistributerFoodId) === String(fid);
    });
    if (!match.length) {
      return;
    }
    this.setData({
      fatherItem: match[0],
      showFatherMenu: true,
    });
  },

  noop() {},

  hideMask() {
    this.setData({
      showFatherMenu: false,
    });
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

  onPageScroll(e) {
    this.setData({
      scrollViewTop: e.scrollTop * globalData.rpxR,
    });
  },

  toMenuAi(){
    wx.navigateTo({
      url: '/subPackage-charts/pages/aiChat/aiChat?advisorId=13',
    })
  },

  toBack() {
    wx.navigateBack({ delta: 1 });
  },
});
