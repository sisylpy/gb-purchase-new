var api = require('../../../services/api');
var config = require('../../../../config/index');
var dateUtil = require('../../../../lib/dateUtil');
var globalData = getApp().globalData;

Page({
  data: {
    nowTime: "",
    searchDepId: -1,
    openin: false,
    openone: false,
    opentwo: false,
    openthree: false,
    openfour: false,
    openall: true,
    expandedRows: {},
    currentExpandedItem: null,
    showStock: false,
    showType: 4,
    canWaste: false,
    canSure: false,
    resultTime: "",
    item: {},
    consultItem: {},
    depGoods: {},
    depList: []
  },

  onLoad: function (options) {
    var that = this;
    var windowInfo = wx.getWindowInfo();

    var disInfo = wx.getStorageSync('disInfo');
    if (disInfo) {
      that.setData({ disInfo: disInfo });
    }

    var searchDate = options.stopDate;
    var today = new Date();
    var targetDate = new Date(searchDate);
    var timeDiff = targetDate.getTime() - today.getTime();
    var daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    var howManyDays = "";
    if (daysDiff === 0) {
      howManyDays = "今天";
    } else if (daysDiff === -1) {
      howManyDays = "昨天";
    } else if (daysDiff === -2) {
      howManyDays = "前天";
    } else {
      howManyDays = Math.abs(daysDiff) + "天前";
    }

    that.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: getApp().globalData.server || config.server,
      startDate: options.startDate,
      stopDate: options.stopDate,
      searchDate: options.stopDate,
      nowTime: dateUtil.getNowTime(),
      disId: options.disId,
      howManyDays: howManyDays
    });

    this._getInitData();
  },

  open(e) {
    var which = e.currentTarget.dataset.type;
    var dataField = '';
    if (which === 'openin') dataField = 'in';
    else if (which === 'openone') dataField = 'one';
    else if (which === 'opentwo') dataField = 'two';
    else if (which === 'openthree') dataField = 'three';
    else if (which === 'openfour') dataField = 'exceedThree';

    if (this.data.openall) {
      if (!this.data[dataField] || this.data[dataField].total === 0) {
        return;
      }
    }

    var currentValue = this.data[which];
    this.setData({ [which]: !currentValue });
  },

  _getInitData() {
    var that = this;
    var data = {
      disId: that.data.disId,
      searchDepId: that.data.searchDepId,
      searchDate: that.data.searchDate
    };
    wx.showLoading({ title: '获取数据中', mask: true });
    api.disGetDayStockBySearchDay(data)
      .then(function (res) {
        wx.hideLoading();
        if (res.result.code == 0) {
          var updateData = {
            in: res.result.data.in,
            one: res.result.data.one,
            two: res.result.data.two,
            three: res.result.data.three,
            exceedThree: res.result.data.exceedThree,
            total: res.result.data.total
          };

          if (that.data.openall) {
            if (res.result.data.in && res.result.data.in.total > 0) updateData.openin = true;
            if (res.result.data.one && res.result.data.one.total > 0) updateData.openone = true;
            if (res.result.data.two && res.result.data.two.total > 0) updateData.opentwo = true;
            if (res.result.data.three && res.result.data.three.total > 0) updateData.openthree = true;
            if (res.result.data.exceedThree && res.result.data.exceedThree.total > 0) updateData.openfour = true;
          }

          that.setData(updateData);
        }
      })
      .catch(function (err) {
        wx.hideLoading();
        wx.showToast({ title: '网络异常', icon: 'none' });
      });
  },

  delSearch() {
    wx.removeStorageSync('selDepList');
    this.setData({ searchDepIds: -1, searchDepName: "" });
    this._getInitData();
  },

  showStock(e) {
    var that = this;
    var item = e.currentTarget.dataset.item;
    item.gbDistributerGoodsEntity = that.data.disGoods;
    var mendianInfo = wx.getStorageSync('mendianInfo');
    var depList = mendianInfo ? mendianInfo.gbDepartmentEntityList : [];

    if (depList.length > 1) {
      that.setData({ showType: 6 });
    }

    if (item.gbDgsWasteFullTime !== null && item.gbDgsWasteFullTime !== '') {
      var endTime = item.gbDgsWasteFullTime;
      var startTime = that.data.nowTime;
      var endTimeFormat = endTime.replace(/-/g, '/');
      var endTimeDown = Date.parse(new Date(endTimeFormat));
      var startTimeFormat = startTime.replace(/-/g, '/');
      var startTimeDown = Date.parse(new Date(startTimeFormat));
      var thisResult = Number(endTimeDown) - Number(startTimeDown);
      thisResult = Math.floor(thisResult / 1000 / 60 / 60);

      if (thisResult < 0) {
        var restWeight = item.gbDgsRestWeight;
        item.gbDgsMyWasteWeight = restWeight;
        item.gbDgsMyProduceWeight = "0";
        that.setData({ canWaste: true, canSure: true, showType: 4 });
      } else {
        item.gbDgsMyProduceWeight = item.gbDgsRestWeight;
        that.setData({ canWaste: false, resultTime: thisResult, canSure: true, showType: 1 });
      }
    } else {
      item.gbDgsMyProduceWeight = item.gbDgsRestWeight;
      that.setData({ canWaste: false, canSure: true, showType: 1 });
    }

    that.setData({
      showStock: true,
      item: item,
      consultItem: JSON.parse(JSON.stringify(item)),
      depGoods: e.currentTarget.dataset.goods,
      depList: depList
    });

    if (depList.length > 1) {
      that.setData({ showType: 6 });
    }
  },

  hideMask() {
    this.setData({ showOperation: false, item: "" });
  },

  confirmStock(e) {
    var that = this;
    var item = e.detail.item;
    var showType = e.detail.showType;
    var userInfo = wx.getStorageSync('userInfo');

    if (this.data.transfer !== '1') {
      item.gbDgsReduceWeightUserId = userInfo.gbDepartmentUserId;
    }

    if (showType == 1) {
      wx.showLoading({ title: '保存数据中' });
      api.saveDepProduceGoodsStock(item)
        .then(function (res) {
          wx.hideLoading();
          if (res.result.code == 0) {
            that._getInitData();
          }
        });
    } else if (showType == 2) {
      wx.showLoading({ title: '保存数据中' });
      api.saveDepLossGoodsStock(item)
        .then(function (res) {
          wx.hideLoading();
          if (res.result.code == 0) {
            that._getInitData();
          }
        });
    } else if (showType == 3) {
      if (this.data.transfer !== '1') {
        item.gbDgsReturnUserId = userInfo.gbDepartmentUserId;
      }
      wx.showLoading({ title: '保存数据中' });
      api.saveDepReturnGoodsStock(item)
        .then(function (res) {
          wx.hideLoading();
          if (res.result.code == 0) {
            that._getInitData();
          } else {
            wx.showToast({ title: res.result.msg, icon: 'none' });
          }
        });
    } else if (showType == 4) {
      wx.showLoading({ title: '保存数据中' });
      api.saveDepWasteGoodsStock(item)
        .then(function (res) {
          wx.hideLoading();
          if (res.result.code == 0) {
            that._getInitData();
          }
        });
    } else if (showType == 6) {
      var data = {
        stockId: this.data.item.gbDepartmentGoodsStockId,
        toDepId: e.detail.targetDepId
      };
      api.changeDepStockToAnotherDep(data).then(function (res) {
        if (res.result.code == 0) {
          that._getInitData();
        }
      });
    }
  },

  showOne(e) {
    var that = this;
    var dayIndex = e.currentTarget.dataset.dayIndex;
    var itemIndex = e.currentTarget.dataset.itemIndex;
    var reduceIndex = e.currentTarget.dataset.reduceIndex !== undefined ? e.currentTarget.dataset.reduceIndex : 0;
    var currentKey = dayIndex + '_' + itemIndex + '_' + reduceIndex;

    if (that.data.expandedRows[currentKey]) {
      var newRows = Object.assign({}, that.data.expandedRows);
      delete newRows[currentKey];
      that.setData({ expandedRows: newRows, currentExpandedItem: null });
    } else {
      var newRows2 = {};
      newRows2[currentKey] = 'stock';
      that.setData({ expandedRows: newRows2, currentExpandedItem: currentKey });
    }
  },

  showTwo(e) {
    var that = this;
    var dayIndex = e.currentTarget.dataset.dayIndex;
    var itemIndex = e.currentTarget.dataset.itemIndex;
    var reduceIndex = e.currentTarget.dataset.reduceIndex !== undefined ? e.currentTarget.dataset.reduceIndex : 0;
    var currentKey = dayIndex + '_' + itemIndex + '_' + reduceIndex;

    if (that.data.expandedRows[currentKey] === 'purchase') {
      var newRows = Object.assign({}, that.data.expandedRows);
      delete newRows[currentKey];
      that.setData({ expandedRows: newRows, currentExpandedItem: null });
    } else {
      var newRows2 = {};
      newRows2[currentKey] = 'purchase';
      that.setData({ expandedRows: newRows2, currentExpandedItem: currentKey });
    }
  },

  toFenxi(e) {
    var item = e.currentTarget.dataset.item;
    var id = e.currentTarget.dataset.id;
    wx.setStorageSync('disGoods', item);
    wx.navigateTo({
      url: '/subPackage-charts/pages/cost/goodsFenxiPurchase/goodsFenxiPurchase?disGoodsId=' + id
    });
  },

  toCost(e) {
    var item = e.currentTarget.dataset.item;
    wx.setStorageSync('disGoods', item);
    wx.navigateTo({
      url: '/subPackage-charts/pages/stock/stockGoodsList/stockGoodsList?disGoodsId=' + item.gbDistributerGoodsId
    });
  },

  toBack() {
    wx.navigateBack({ delta: 1 });
  }
});
