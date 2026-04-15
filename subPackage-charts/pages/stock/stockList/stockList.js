var api = require('../../../services/api');
var config = require('../../../../config/index');
var dateUtil = require('../../../../utils/dateUtil');
var globalData = getApp().globalData;

Page({
  data: {
    nowTime: "",
    searchDepId: -1,
    currentOpen: false,
    expandedRows: {},
    currentExpandedItem: null
  },

  onLoad: function (options) {
    var that = this;
    var windowInfo = wx.getWindowInfo();

    var disInfo = wx.getStorageSync('disInfo');
    if (disInfo) {
      that.setData({ disInfo: disInfo });
    }

    that.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: getApp().globalData.server || config.server,
      greatId: options.greatId,
      whichDay: options.whichDay,
      nowTime: dateUtil.getNowTime(),
      disId: options.disId,
      fatherName: options.fatherName,
      fatherTotal: options.fatherTotal,
      type: options.type,
      dateString: options.dateString,
      currentOpen: true
    });

    this._getInitData();
  },

  open(e) {
    this.setData({ currentOpen: !this.data.currentOpen });
  },

  _getInitData() {
    var that = this;
    var data = {
      disId: that.data.disId,
      searchDepId: that.data.searchDepId,
      greatId: that.data.greatId,
      whichDay: that.data.whichDay,
      type: that.data.type
    };
    wx.showLoading({ title: '获取数据中', mask: true });
    api.disGetDayStockByGreatId(data)
      .then(function (res) {
        wx.hideLoading();
        if (res.result.code == 0) {
          var oneDayData = res.result.data.oneDay;
          if (oneDayData && oneDayData.arr) {
            oneDayData.arr = oneDayData.arr.map(function (goods) {
              return Object.assign({}, goods, { showStockList: false });
            });
          }
          that.setData({
            oneDay: oneDayData,
            currentOpen: true
          });
        }
      })
      .catch(function (err) {
        wx.hideLoading();
        wx.showToast({ title: '网络异常', icon: 'none' });
      });
  },

  showList(e) {
    var that = this;
    var index = e.currentTarget.dataset.index;
    if (index === undefined) return;

    var newArr = [].concat(that.data.oneDay.arr);
    if (newArr[index] && newArr[index].hasOwnProperty('showStockList')) {
      newArr[index].showStockList = !newArr[index].showStockList;
      that.setData({ 'oneDay.arr': newArr });
    }
  },

  showOneDayStock(e) {
    var that = this;
    var itemIndex = e.currentTarget.dataset.itemIndex;
    var batchIndex = e.currentTarget.dataset.batchIndex;
    var currentKey = itemIndex + '_' + batchIndex;

    if (that.data.expandedRows[currentKey]) {
      var newRows = Object.assign({}, that.data.expandedRows);
      delete newRows[currentKey];
      that.setData({
        expandedRows: newRows,
        currentExpandedItem: null
      });
    } else {
      var newRows2 = {};
      newRows2[currentKey] = 'stock';
      that.setData({
        expandedRows: newRows2,
        currentExpandedItem: currentKey
      });
    }
  },

  toFenxi(e) {
    var item = e.currentTarget.dataset.item;
    var purId = e.currentTarget.dataset.purgoods.gbDistributerPurchaseGoodsId;
    var purchaseDate = e.currentTarget.dataset.purgoods.gbDpgPurchaseDate;
    wx.setStorageSync('disGoods', item);
    wx.navigateTo({
      url: '../../../../subPackage-goods/pages/goods/goodsFenxiPurchase/goodsFenxiPurchase?disGoodsId=' + item.gbDistributerGoodsId + '&purGoodsId=' + purId + '&purchaseDate=' + purchaseDate
    });
  },

  toCost(e) {
    var item = e.currentTarget.dataset.item;
    var stockId = e.currentTarget.dataset.id;
    wx.setStorageSync('disGoods', item);
    wx.navigateTo({
      url: '../../goods/stockGoodsList/stockGoodsList?disGoodsId=' + item.gbDistributerGoodsId + '&stockId=' + stockId
    });
  },

  toBack() {
    wx.navigateBack({ delta: 1 });
  }
});
