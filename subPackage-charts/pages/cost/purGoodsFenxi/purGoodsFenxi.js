var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
var dateUtils = require('../../../../lib/dateUtil');

import apiUrl from '../../../../config/index.js';
import apiDistributer from '../../../../services/apiDistributer.js';
import * as echarts from '../../../../ec-canvas/echarts';
var storeRootDepartmentId = require('../../../../lib/storeRootDepartment').storeRootDepartmentId;

const PURCHASE_IMAGES = '/subPackage-charts/images/purchase/icon_pack/';

function numberValue(value) {
  var num = Number(value);
  return isNaN(num) ? 0 : num;
}

function round(value, digits) {
  var multiple = Math.pow(10, digits || 0);
  return Math.round(numberValue(value) * multiple) / multiple;
}

function money(value) {
  var num = numberValue(value);
  var parts = num.toFixed(1).replace(/\.0$/, '').split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

function percent(part, total) {
  if (!total) return '0.0';
  return (part * 100 / total).toFixed(1);
}

function sumAmounts(rows) {
  return (rows || []).reduce(function (sum, item) {
    return sum + numberValue(item.totalAmount);
  }, 0);
}

function parseDate(dateString) {
  var parts = (dateString || '').split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function formatDate(date) {
  var month = date.getMonth() + 1;
  var day = date.getDate();
  return date.getFullYear() + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
}

function previousRange(startDate, stopDate) {
  var start = parseDate(startDate);
  var stop = parseDate(stopDate);
  var dayCount = Math.round((stop.getTime() - start.getTime()) / 86400000) + 1;
  var previousStop = new Date(start.getTime());
  previousStop.setDate(previousStop.getDate() - 1);
  var previousStart = new Date(previousStop.getTime());
  previousStart.setDate(previousStart.getDate() - dayCount + 1);
  return { startDate: formatDate(previousStart), stopDate: formatDate(previousStop) };
}

Page({
  data: {
    imageRoot: PURCHASE_IMAGES,
    ecSelf: { lazyLoad: true },
    supplierIds: -1,
    purUserIds: -1,
    loading: true,
    hasData: false,
    purchaseHasData: false,
    businessHasData: false,
    showAllPriceGoods: false,
    showAllGoods: false,
    showAllSubtotalGoods: false,
    purTotalDisplay: '0',
    selfTotalDisplay: '0',
    supplierTotalDisplay: '0',
    purchaseCount: 0,
    selfPercent: '0.0',
    supplierPercent: '0.0',
    purUserData: [],
    supplierCards: [],
    topGoodsPrice: [],
    topTimesGoods: [],
    topSubtotalGoods: [],
    mainPurchaser: '暂无',
    mainGoodsName: '暂无',
    reminderText: '本期暂无明显价格波动，采购节奏较平稳。',
    totalTrend: null,
    countTrend: null,
    lossRateDisplay: '0.0',
    wasteRateDisplay: '0.0',
    returnAmountDisplay: '0',
    employeeMealAmountDisplay: '0',
    lossRateTrend: null,
    wasteRateTrend: null,
    returnAmountTrend: null,
    employeeMealAmountTrend: null
  },

  onLoad: function () {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server
    });
    var disInfo = wx.getStorageSync('disInfo');
    var mendianInfo = wx.getStorageSync('mendianInfo') || {};
    var depFatherId = storeRootDepartmentId(mendianInfo);
    this.setData({ depFatherId: depFatherId });
    if (disInfo) this.setData({
      disInfo: disInfo,
      disId: disInfo.gbDistributerId
    });
    this._syncDatesFromMyDateStorage();
    if (!this.data.disId || !depFatherId) {
      load.showToast(!depFatherId ? '缺少门店信息' : '缺少分销商信息');
      this.setData({ loading: false });
      return;
    }
    this._getSupplierStatistics();
    this._getBusinessStatistics();
  },

  onShow: function () {
    if (this.data.update) {
      this._syncDatesFromMyDateStorage();
      this.setData({ update: false });
      this._getSupplierStatistics();
      this._getBusinessStatistics();
    }
  },

  _syncDatesFromMyDateStorage: function () {
    var myDate = wx.getStorageSync('myDate');
    if (myDate) {
      var dateRange = myDate.name === 'custom'
        ? dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate)
        : dateUtils.getDateRange(myDate.name);
      this.setData({
        startDate: dateRange.startDate,
        stopDate: dateRange.stopDate,
        dateType: myDate.dateType,
        hanzi: myDate.hanzi || dateRange.name
      });
    } else {
      this.setData({
        dateType: 'month',
        startDate: dateUtils.getFirstDateInMonth(),
        stopDate: dateUtils.getArriveDate(0),
        hanzi: '本月'
      });
    }
  },

  _requestStatistics: function (startDate, stopDate) {
    return apiDistributer.getGbPurGoodsStatisticsForDis({
      purUserIds: this.data.purUserIds,
      supplierIds: this.data.supplierIds,
      disId: this.data.disId,
      purDepId: this.data.depFatherId,
      startDate: startDate,
      stopDate: stopDate,
      greatId: -1
    });
  },

  _requestBusinessStatistics: function (startDate, stopDate, includeDetails) {
    return apiDistributer.getGbInventoryBusinessAnalysis({
      disId: this.data.disId,
      startDate: startDate,
      stopDate: stopDate,
      greatId: -1,
      searchDepId: '-1',
      depFatherId: this.data.depFatherId,
      includeDetails: !!includeDetails
    });
  },

  _getBusinessStatistics: function () {
    if (!this.data.depFatherId) return;
    var that = this;
    var requestKey = [this.data.disId, this.data.depFatherId, this.data.startDate, this.data.stopDate].join('-');
    this._businessRequestKey = requestKey;
    this._requestBusinessStatistics(this.data.startDate, this.data.stopDate, false)
      .then(function (res) {
        if (that._businessRequestKey !== requestKey) return;
        if (!res.result || res.result.code !== 0) {
          console.warn('库存业务统计获取失败:', res.result && res.result.msg);
          return;
        }
        that._applyBusinessStatistics(res.result.data || {});
        that._loadPreviousBusinessStatistics(requestKey);
      })
      .catch(function (err) {
        if (that._businessRequestKey !== requestKey) return;
        console.warn('库存业务统计获取失败:', err);
      });
  },

  _applyBusinessStatistics: function (data) {
    var summary = data.summary || {};
    var lossRate = numberValue(summary.lossRate);
    var wasteRate = numberValue(summary.wasteRate);
    var returnAmount = numberValue(summary.returnAmount);
    var employeeMealAmount = numberValue(summary.employeeMealAmount);
    var businessHasData = lossRate > 0 || wasteRate > 0 || returnAmount > 0 || employeeMealAmount > 0;
    this.setData({
      businessHasData: businessHasData,
      hasData: this.data.purchaseHasData || businessHasData,
      lossRate: lossRate,
      lossRateDisplay: lossRate.toFixed(1),
      wasteRate: wasteRate,
      wasteRateDisplay: wasteRate.toFixed(1),
      returnAmount: returnAmount,
      returnAmountDisplay: money(returnAmount),
      employeeMealAmount: employeeMealAmount,
      employeeMealAmountDisplay: money(employeeMealAmount),
      lossRateTrend: null,
      wasteRateTrend: null,
      returnAmountTrend: null,
      employeeMealAmountTrend: null
    });
  },

  _loadPreviousBusinessStatistics: function (requestKey) {
    var that = this;
    var range = previousRange(this.data.startDate, this.data.stopDate);
    this._requestBusinessStatistics(range.startDate, range.stopDate, false).then(function (res) {
      if (that._businessRequestKey !== requestKey || !res.result || res.result.code !== 0) return;
      var previous = (res.result.data && res.result.data.summary) || {};
      that.setData({
        lossRateTrend: that._pointTrend(that.data.lossRate, numberValue(previous.lossRate)),
        wasteRateTrend: that._pointTrend(that.data.wasteRate, numberValue(previous.wasteRate)),
        returnAmountTrend: that._trend(that.data.returnAmount, numberValue(previous.returnAmount)),
        employeeMealAmountTrend: that._trend(that.data.employeeMealAmount, numberValue(previous.employeeMealAmount))
      });
    }).catch(function (err) {
      console.warn('上期库存业务统计获取失败:', err);
    });
  },

  _getSupplierStatistics: function () {
    if (!this.data.depFatherId) return;
    var that = this;
    var requestKey = [this.data.disId, this.data.depFatherId, this.data.startDate, this.data.stopDate].join('-');
    this._statisticsRequestKey = requestKey;
    this.setData({ loading: true });
    load.showLoading('获取数据中');
    this._requestStatistics(this.data.startDate, this.data.stopDate)
      .then(function (res) {
        if (that._statisticsRequestKey !== requestKey) return;
        load.hideLoading();
        if (res.result.code !== 0) {
          that.setData({ loading: false, hasData: false });
          load.showToast(res.result.msg || '获取统计信息失败');
          return;
        }
        that._applyStatistics(res.result.data || {});
        that._loadPreviousStatistics(requestKey);
      })
      .catch(function (err) {
        if (that._statisticsRequestKey !== requestKey) return;
        load.hideLoading();
        that.setData({ loading: false, hasData: false });
        load.showToast('网络请求失败');
        console.error('统计信息接口失败:', err);
      });
  },

  _applyStatistics: function (data) {
    var purTotal = numberValue(data.purTotal);
    var purUsers = (data.purUserData || []).map(function (item) {
      return Object.assign({}, item, { totalAmountDisplay: money(item.totalAmount) });
    }).sort(function (a, b) { return numberValue(b.totalAmount) - numberValue(a.totalAmount); });
    var suppliers = data.supplierData || [];
    var selfTotal = data.selfPurchaseTotal == null ? sumAmounts(purUsers) : numberValue(data.selfPurchaseTotal);
    var supplierTotal = data.supplierPurchaseTotal == null ? sumAmounts(suppliers) : numberValue(data.supplierPurchaseTotal);
    var topTimes = this._normalizeGoods(data.topTimesGoods || []);
    var maxTimes = topTimes.length ? numberValue(topTimes[0].gbDgQuantityDays) : 0;
    topTimes = topTimes.map(function (item) {
      item.barWidth = maxTimes ? Math.max(12, Math.round(numberValue(item.gbDgQuantityDays) * 100 / maxTimes)) : 0;
      return item;
    });
    var topSubtotal = this._normalizeGoods(data.topSubtotalGoods || []).map(function (item) {
      item.subtotalDisplay = money(item.goodsPurTotalSubtotal);
      return item;
    });
    var priceGoods = this._normalizeGoods(data.topGoodsPrice || []).map(function (item) {
      item.fluctuationDisplay = round(item.goodsPriceFluctuation, 1);
      item.diffDisplay = round(item.goodsPriceDiff, 1);
      return item;
    });
    var supplierCards = suppliers.slice().sort(function (a, b) {
      return numberValue(b.totalAmount) - numberValue(a.totalAmount);
    }).map(function (item, index) {
      return Object.assign({}, item, {
        rank: index + 1,
        totalAmountDisplay: money(item.totalAmount),
        sharePercent: percent(numberValue(item.totalAmount), supplierTotal || purTotal),
        purchaseCountDisplay: item.purchaseCount == null ? '--' : item.purchaseCount
      });
    });
    var purchaseCount = numberValue(data.purchaseCount);
    var reminderText = priceGoods.length
      ? priceGoods[0].gbDgGoodsName + '价格波动最明显（' + priceGoods[0].fluctuationDisplay + '%），建议关注后续市场行情，合理安排采购计划。'
      : '本期暂无明显价格波动，采购节奏较平稳。';

    var purchaseHasData = purTotal > 0 || purchaseCount > 0;
    this.setData({
      loading: false,
      purchaseHasData: purchaseHasData,
      hasData: purchaseHasData || this.data.businessHasData,
      supplierItem: data,
      purTotal: purTotal,
      purTotalDisplay: money(purTotal),
      selfTotal: selfTotal,
      selfTotalDisplay: money(selfTotal),
      supplierTotal: supplierTotal,
      supplierTotalDisplay: money(supplierTotal),
      purchaseCount: purchaseCount,
      selfPercent: percent(selfTotal, purTotal),
      supplierPercent: percent(supplierTotal, purTotal),
      purUserData: purUsers,
      supplierCards: supplierCards,
      topGoodsPrice: priceGoods,
      topTimesGoods: topTimes,
      topSubtotalGoods: topSubtotal,
      topSubtotalGoodsSubtotal: data.topSubtotalGoodsSubtotal || 0,
      topSubtotalGoodsPercent: data.topSubtotalGoodsPercent || 0,
      mainPurchaser: purUsers.length ? (purUsers[0].purUserName || purUsers[0].name || '未命名') : '暂无',
      mainGoodsName: topSubtotal.length ? topSubtotal[0].gbDgGoodsName : '暂无',
      reminderText: reminderText,
      totalTrend: null,
      countTrend: null
    }, this._initSelfDonutChart.bind(this));
  },

  _initSelfDonutChart: function () {
    var component = this.selectComponent('#selfDonutChart');
    if (!component || !this.data.purTotal) return;
    var selfTotal = this.data.selfTotal;
    var otherTotal = Math.max(this.data.purTotal - selfTotal, 0);
    var that = this;
    component.init(function (canvas, width, height, dpr) {
      if (that.selfDonutChart) that.selfDonutChart.dispose();
      var chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: dpr
      });
      chart.setOption({
        animation: true,
        tooltip: { show: false },
        series: [{
          type: 'pie',
          radius: ['68%', '88%'],
          center: ['50%', '50%'],
          silent: true,
          avoidLabelOverlap: false,
          label: { show: false },
          labelLine: { show: false },
          data: [
            { value: selfTotal, name: '自采金额', itemStyle: { color: '#20c987' } },
            { value: otherTotal, name: '其他金额', itemStyle: { color: '#e5edf1' } }
          ]
        }]
      });
      that.selfDonutChart = chart;
      return chart;
    });
  },

  _normalizeGoods: function (rows) {
    var server = this.data.url || '';
    return rows.map(function (item) {
      var path = item.gbDgNxFatherImg;
      var imageUrl = '/images/logo.png';
      if (path) imageUrl = /^https?:\/\//.test(path) ? path : server + path;
      return Object.assign({}, item, { imageUrl: imageUrl });
    });
  },

  _loadPreviousStatistics: function (requestKey) {
    var that = this;
    var range = previousRange(this.data.startDate, this.data.stopDate);
    this._requestStatistics(range.startDate, range.stopDate).then(function (res) {
      if (that._statisticsRequestKey !== requestKey || res.result.code !== 0) return;
      var previous = res.result.data || {};
      that.setData({
        totalTrend: that._trend(that.data.purTotal, numberValue(previous.purTotal)),
        countTrend: that._trend(that.data.purchaseCount, numberValue(previous.purchaseCount))
      });
    }).catch(function (err) {
      console.warn('上期采购统计获取失败:', err);
    });
  },

  _trend: function (current, previous) {
    if (!previous) return null;
    var value = round((numberValue(current) - previous) * 100 / previous, 1);
    return { value: Math.abs(value).toFixed(1), direction: value >= 0 ? 'up' : 'down' };
  },

  _pointTrend: function (current, previous) {
    if (!previous) return null;
    var value = round(numberValue(current) - previous, 1);
    return { value: Math.abs(value).toFixed(1), direction: value >= 0 ? 'up' : 'down' };
  },

  toDatePageSearch: function () {
    this.setData({ update: true });
    wx.navigateTo({ url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType });
  },

  toGoodsPage: function (e) {
    wx.setStorageSync('disGoods', e.currentTarget.dataset.goods);
    wx.navigateTo({ url: '/subPackage-charts/pages/cost/purchaseCategoryDetail/purchaseCategoryDetail?focusGoodsId=' + e.currentTarget.dataset.id });
  },

  togglePriceGoodsList: function () { wx.navigateTo({ url: '/subPackage-charts/pages/cost/unitPriceAnalysis/unitPriceAnalysis' }); },
  toggleGoodsList: function () { wx.navigateTo({ url: '/subPackage-charts/pages/cost/purchaseCountAnalysis/purchaseCountAnalysis' }); },
  toggleSubtotalGoodsList: function () { this.setData({ showAllSubtotalGoods: !this.data.showAllSubtotalGoods }); },
  toPurchaser: function () { wx.navigateTo({ url: '/subPackage-charts/pages/cost/selfPurchaseAnalysis/selfPurchaseAnalysis' }); },
  toSupplier: function () { wx.navigateTo({ url: '/subPackage-charts/pages/cost/supplierAnalysis/supplierAnalysis' }); },
  toInventoryBusinessAnalysis: function () {
    this.setData({ update: true });
    wx.navigateTo({ url: '/subPackage-charts/pages/cost/inventoryBusinessAnalysis/inventoryBusinessAnalysis' });
  },
  toBack: function () { wx.navigateBack({ delta: 1 }); }
});
