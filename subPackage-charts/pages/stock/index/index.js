var api = require('../../../services/api');
var config = require('../../../../config/index');
var dateUtil = require('../../../../utils/dateUtil');
var globalData = getApp().globalData;

Page({

  onShow: function () {
    var windowInfo = wx.getWindowInfo();
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
    });
  },

  data: {
    searchDepIds: -1,
    searchDepId: -1,
    tab1IndexDep: 0,
    itemIndexDep: 0,
    tab1Index: 0,
    itemIndex: 0,
    dateString: '',
    url: '',
  },

  onLoad: function (options) {
    var that = this;
    that.setData({
      url: getApp().globalData.server || config.server,
    });

    var disInfo = wx.getStorageSync('disInfo');
    if (disInfo) {
      that.setData({
        disInfo: disInfo,
        disId: disInfo.gbDistributerId,
        type: disInfo.gbDistributerStockCycle,
      });

      var value = wx.getStorageSync('mendianInfo');
      if(value){
        this.setData({
          mendianInfo: value,
          depFatherId: value.gbDepartmentId,
        })
      }
      that._getInitData();
    }
  },

  _getInitData: function () {
    var that = this;
    var whichDay = '';
    if (that.data.itemIndex == 0) {
      whichDay = 99;
    } else {
      whichDay = Number(that.data.itemIndex) - 1;
    }
    wx.showLoading({ title: '获取数据中', mask: true });
    var idxDep = that.data.itemIndexDep;
    if (idxDep == null) idxDep = 0;
    var searchSubIds = Number(idxDep) === 0 ? that.data.searchDepIds : that.data.searchDepId;
    var data = {
      disId: that.data.disId,
      depFatherId: that.data.depFatherId,
      searchSubDepIds: searchSubIds,
      whichDay: whichDay,
    };
    api.getMendianStockTypePeriod(data)
      .then(function (res) {
        wx.hideLoading();
        console.log("abc",res.result.data);
        if (res.result.code == 0) {
          if (res.result.data.total && res.result.data.total.restTotal > 0) {
            var processedData = that._addConicGradients(res.result.data);
            var tabIndex = that.data.tab1Index;
            var dateStr = '';
            if (tabIndex == 0) dateStr = res.result.data.total.dateString || '';
            else if (tabIndex == 1) dateStr = res.result.data.in ? res.result.data.in.dateString : '';
            else if (tabIndex == 2) dateStr = res.result.data.one ? res.result.data.one.dateString : '';
            else if (tabIndex == 3) dateStr = res.result.data.two ? res.result.data.two.dateString : '';
            else if (tabIndex == 4) dateStr = res.result.data.three ? res.result.data.three.dateString : '';
            else if (tabIndex == 5) dateStr = res.result.data.exceed ? res.result.data.exceed.dateString : '';

            that.setData({
              total: res.result.data.total,
              totalArr: processedData.arr,
              exceedThree: res.result.data.exceed || '',
              three: res.result.data.three || '',
              two: res.result.data.two || '',
              one: res.result.data.one || '',
              in: res.result.data.in || '',
              arr: processedData,
              dateString: dateStr,
            });
          } else {
            that.setData({
              total: '0.0',
              totalArr: [],
              arr: [],
              exceedThree: '',
              three: '',
              two: '',
              one: '',
              in: '',
            });
          }
        } else {
          wx.showToast({ title: res.result.msg || '获取数据失败', icon: 'none' });
          that.setData({
            total: '0.0',
            totalArr: [],
            arr: [],
          });
        }
      })
      .catch(function (err) {
        wx.hideLoading();
        wx.showToast({ title: '网络异常', icon: 'none' });
      });
  },

  toStockPage: function (e) {
    var that = this;
    var whichDay = '';
    if (that.data.itemIndex == 0) {
      whichDay = 99;
    } else {
      whichDay = Number(that.data.itemIndex) - 1;
    }
    var id = that.data.itemIndexDep == 0 ? that.data.searchDepIds : that.data.searchDepId;

    wx.navigateTo({
      url: '../stockList/stockList?greatId=' + e.currentTarget.dataset.id +
        '&fatherName=' + e.currentTarget.dataset.name +
        '&dateString=' + that.data.dateString +
        '&color=' + encodeURIComponent(e.currentTarget.dataset.color || '') +
        '&fatherTotal=' + e.currentTarget.dataset.total +
        '&whichDay=' + whichDay +
        '&searchDepIds=' + id +
        '&disId=' + that.data.disId +
        '&type=' + that.data.type +
        '&goodsIndex=' + (e.currentTarget.dataset.index || 0)
    });
  },

  onTab1Click: function (event) {
    var that = this;
    var index = event.currentTarget.dataset.index;
    that.setData({
      tab1Index: index,
      itemIndex: index,
      days: event.currentTarget.dataset.days,
      depTotal: event.currentTarget.dataset.total,
    });
  },

  animationfinishDep: function (event) {
    var that = this;
    that.setData({
      tab1IndexDep: event.detail.current,
      itemIndexDep: event.detail.current,
    });
    if (event.detail.current == 0) {
      that.setData({ searchDepId: -1 });
    } else if (that.data.resultDepList && that.data.resultDepList[event.detail.current - 1]) {
      that.setData({ searchDepId: that.data.resultDepList[event.detail.current - 1].gbDepartmentId });
    }
    that._getInitData();
  },

  animationfinish: function (event) {
    var that = this;
    var current = event.detail.current;
    that.setData({
      tab1Index: current,
      itemIndex: current,
    });
    var leftWidth = 0;
    if (current == 0) leftWidth = 0;
    else if (current == 1) leftWidth = 50;
    else if (current == 2) leftWidth = 50;
    else if (current == 3) leftWidth = 100;
    else if (current == 4) leftWidth = 220;
    else if (current >= 5) leftWidth = 250;
    that.setData({ leftWidth: leftWidth });
    that._getInitData();
  },

  _addConicGradients: function (data) {
    var baseColor = '#4CAF50';
    var processArray = function (arr) {
      if (!arr || !Array.isArray(arr)) return arr;
      return arr.map(function (item) {
        var percentage = parseFloat(item.fatherStockTotalPercent) || 0;
        var degree = (percentage / 100) * 360;
        var gradient = 'conic-gradient(' + baseColor + ' 0deg ' + degree + 'deg, #f0f0f0 ' + degree + 'deg 360deg)';
        return Object.assign({}, item, { stockConicGradient: gradient });
      });
    };
    return {
      arr: processArray(data.arr),
      in: data.in ? Object.assign({}, data.in, { arr: processArray(data.in.arr) }) : data.in,
      one: data.one ? Object.assign({}, data.one, { arr: processArray(data.one.arr) }) : data.one,
      two: data.two ? Object.assign({}, data.two, { arr: processArray(data.two.arr) }) : data.two,
      three: data.three ? Object.assign({}, data.three, { arr: processArray(data.three.arr) }) : data.three,
      exceed: data.exceed ? Object.assign({}, data.exceed, { arr: processArray(data.exceed.arr) }) : data.exceed,
    };
  },

  toFilter: function () {
    wx.removeStorageSync('tab1IndexDep');
    wx.navigateTo({
      url: '../../sel/filterStockDepartment/filterStockDepartment',
    });
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  },

});
