var config = require('../../../../config/index.js');
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil');
var reorderApi = require('../../../services/depReorderReminderApi.js');
var orderApi = require('../../../services/resGoodsAiApi.js');

function enrichReorderRow(raw) {
  var item = Object.assign({}, raw);
  var reason = item.aiRemindReason || 'none';
  var parts = [];
  if (reason.indexOf('habit') !== -1) {
    parts.push('习惯到货');
  }
  if (reason.indexOf('stock_below_two_day_usage') !== -1) {
    parts.push('估算消耗·库存偏紧');
  }
  item.aiRemindReasonText = parts.length ? parts.join(' · ') : '';

  var gp = item.aiRecommendGapWeightProductionOnly;
  var gl = item.aiRecommendGapWeightWithLossWaste;
  var hasGap = (gp != null && gp !== '' && String(gp) !== '0')
    || (gl != null && gl !== '' && String(gl) !== '0');
  var hasDeplete = !!(item.aiEstimateDepleteDateProductionOnly || item.aiEstimateDepleteDateWithLossWaste);
  var prodAvg = item.aiReduceProductionDailyAvg;
  var lossAvg = item.aiReduceLossWasteDailyAvg;
  var hasReduceAvg = (prodAvg != null && prodAvg !== '' && String(prodAvg) !== '0')
    || (lossAvg != null && lossAvg !== '' && String(lossAvg) !== '0');
  item._showAiReducePanel = hasGap || hasDeplete || hasReduceAvg;

  return item;
}

function enrichReorderList(rows) {
  if (!rows || !rows.length) {
    return rows || [];
  }
  return rows.map(enrichReorderRow);
}

Page({

  onShow() {
    var windowInfo = wx.getWindowInfo();
    var globalData = getApp().globalData;
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
    });
  },

  data: {
    url: config.server,
    depGoodsArr: [],
    currentPage: 1,
    limit: 20,
    totalPage: 0,
    totalCount: 0,
    hasMore: true,
    isLoading: false,
    showSkeleton: true,
    dots: '',
    loadingTimer: null,
    fadeAnimation: {},
    show: false,
    depId: '',
    disId: '',
    depInfo: null,
    userInfo: null,
    applyStandardName: '',
    applyNumber: '',
    applyRemark: '',
    applyGoodsName: '',
    applySubtotal: '',
    expectPrice: '',
    editApply: false,
    canSave: false,
    hasStock: false,
    itemDis: null,
    depGoods: null,
    index: 0,
  },

  onLoad: function (options) {
    var disIdOpt = options.disId != null && options.disId !== '' ? options.disId : '';
    this.setData({
      depId: options.depId,
      disId: disIdOpt,
    });

    var orderDepInfo = wx.getStorageSync('orderDepInfo');
    if (orderDepInfo) {
      this.setData({
        depInfo: orderDepInfo,
        depId: this.data.depId || orderDepInfo.gbDepartmentId,
        disId: disIdOpt || orderDepInfo.gbDepartmentDisId || this.data.disId,
      });
    }

    if (!this.data.disId) {
      var disInfo = wx.getStorageSync('disInfo');
      if (disInfo && disInfo.gbDistributerId) {
        this.setData({ disId: disInfo.gbDistributerId });
      }
    }

    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo
      });
    }

    this._getResGoodsWithOrders();
  },

  onReachBottom: function () {
    if (!this.data.hasMore || this.data.isLoading) {
      return;
    }
    var nextPage = this.data.currentPage + 1;
    this._getResGoodsWithOrders(nextPage);
  },

  /**
   * @param {number} [requestPage] 请求页码；不传则用 this.data.currentPage
   */
  _getResGoodsWithOrders: function (requestPage) {
    if (!this.data.depId) {
      load.hideLoading();
      this.setData({ showSkeleton: false, isLoading: false });
      wx.showToast({ title: '缺少部门信息', icon: 'none' });
      return;
    }

    if (this.data.isLoading) {
      return;
    }

    var pageToFetch = requestPage != null ? requestPage : this.data.currentPage;
    if (pageToFetch > 1 && !this.data.hasMore) {
      return;
    }

    this.setData({
      isLoading: true
    });

    load.showLoading('获取数据');
    var data = {
      depId: this.data.depId,
      page: pageToFetch,
      limit: this.data.limit,
    };

    reorderApi.depReorderReminderPage(data)
      .then(function (res) {
        load.hideLoading();
        this.setData({
          isLoading: false,
          showSkeleton: false
        });
        var body = res.result;
        console.log("boody", body);
        if (body && body.code === 0) {
          var pageData = body.page || {};
          var newData = enrichReorderList(pageData.list || []);
          var curr = pageData.currPage || pageToFetch;
          var totalPg = pageData.totalPage || 0;
          // totalPage/totalCount 为 SQL 候选池；列表另按 aiShouldRemindToday 过滤，故某页可能 0 条但仍 hasMore
          var hasMore = curr < totalPg;

          if (newData.length === 0 && hasMore) {
            this.setData({ isLoading: false, showSkeleton: false });
            this._getResGoodsWithOrders(pageToFetch + 1);
            return;
          }

          if (pageToFetch === 1) {
            this.setData({
              depGoodsArr: newData,
              totalCount: pageData.totalCount,
              totalPage: totalPg,
              currentPage: curr,
              hasMore: hasMore,
            });
          } else {
            this.setData({
              depGoodsArr: this.data.depGoodsArr.concat(newData),
              totalCount: pageData.totalCount,
              totalPage: totalPg,
              currentPage: curr,
              hasMore: hasMore,
            });
          }
        } else {
          wx.showToast({
            title: (body && body.msg) ? body.msg : '获取数据失败',
            icon: 'none'
          });
          if (pageToFetch === 1) {
            this.setData({
              depGoodsArr: [],
              hasMore: false
            });
          }
        }
      }.bind(this))
      .catch(function () {
        load.hideLoading();
        this.setData({
          isLoading: false,
          showSkeleton: false
        });
        wx.showToast({
          title: '获取数据失败',
          icon: 'none'
        });
      }.bind(this));
  },

  changeStandard: function (e) {
    this.setData({
      applyStandardName: e.detail.applyStandardName,
      priceLevel: e.detail.level,
    });
    var levelTwoStandard = this.data.itemDis.nxDgWillPriceTwoStandard;
    if (this.data.applyStandardName == levelTwoStandard) {
      this.setData({
        printStandard: levelTwoStandard
      });
    } else {
      this.setData({
        printStandard: this.data.itemDis.nxDgGoodsStandardname
      });
    }
  },

  applyGoodsDep: function (e) {
    var depGoods = e.currentTarget.dataset.depgoods;
    var stocks = depGoods.gbDepartmentGoodsStockEntities;
    this.setData({
      index: e.currentTarget.dataset.index,
      itemDis: e.currentTarget.dataset.disgoods,
      depGoods: depGoods,
      show: true,
      applyNumber: depGoods.aiOrderQuantity,
      applyStandardName: depGoods.gbDdgOrderStandard,
      applyRemark: depGoods.gbDdgOrderRemark || '',
      applyGoodsName: depGoods.gbDdgDepGoodsName || '',
      canSave: true,
      hasStock: Array.isArray(stocks) && stocks.length > 0,
    });
  },

  cancle: function () {
    this.setData({ show: false });
  },

  delApply: function () {
    this.setData({ show: false });
  },

  delStandard: function () {},

  confirmStandard: function () {},

  confirm: function (e) {
    if (!this.data.disId) {
      wx.showToast({ title: '缺少批发商信息', icon: 'none' });
      return;
    }

    var arriveDate = dateUtils.getArriveDate(0);
    var arriveOnlyDate = dateUtils.getArriveOnlyDate(0);
    var weekYear = dateUtils.getArriveWeeksYear(0);
    var week = dateUtils.getArriveWhatDay(0);

    var dg = {
      gbDoOrderUserId: this.data.userInfo.gbDepartmentUserId,
      gbDoDepDisGoodsId: this.data.depGoods.gbDepartmentDisGoodsId,
      gbDoDisGoodsId: this.data.depGoods.gbDdgDisGoodsId,
      gbDoDisGoodsFatherId: this.data.depGoods.gbDdgDisGoodsFatherId,
      gbDoDepartmentId: this.data.depId,
      gbDoDistributerId: this.data.disId,
      gbDoDepartmentFatherId: this.data.depInfo.gbDepartmentFatherId,
      gbDoQuantity: e.detail.applyNumber,
      gbDoStandard: e.detail.applyStandardName,
      gbDoRemark: e.detail.applyRemark,
      gbDoIsAgent: 0,
      gbDoArriveDate: arriveDate,
      gbDoArriveWeeksYear: weekYear,
      gbDoArriveOnlyDate: arriveOnlyDate,
      gbDoArriveWhatDay: week,
      gbDoNxDistributerGoodsId: this.data.itemDis.gbDgNxDistributerGoodsId,
      gbDoNxDistributerId: this.data.itemDis.gbDgNxDistributerId,
      gbDoGoodsType: this.data.itemDis.gbDgGoodsType,
      gbDoOrderType: this.data.itemDis.gbDgGoodsType,
      gbDoDsStandardScale: -1,
      stockIsZero: e.detail.stockIsZero,
      gbDoPrintStandard: this.data.itemDis.gbDgGoodsStandardname,
    };

    load.showLoading('保存订单');
    var self = this;
    orderApi.createDepartmentOrderForJj(dg).then(function (res) {
      load.hideLoading();
      if (res.result.code == 0) {
        wx.setStorageSync('needRefreshOrderData', true);
        var newArr = self.data.depGoodsArr.filter(function (_, i) {
          return i !== self.data.index;
        });
        self.setData({
          depGoodsArr: newArr,
          show: false,
        });
      } else {
        wx.showToast({
          title: '订单保存失败',
          icon: 'none'
        });
      }
    }).catch(function () {
      load.hideLoading();
      wx.showToast({ title: '订单保存失败', icon: 'none' });
    });
  },

  toBack: function () {
    wx.navigateBack({
      delta: 1
    });
  },

});
