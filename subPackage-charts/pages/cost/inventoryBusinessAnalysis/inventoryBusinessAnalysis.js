var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil.js');
var apiDistributer = require('../../../../services/apiDistributer.js');
var echarts = require('../../../../ec-canvas/echarts.js');
var globalData = getApp().globalData;

var BUSINESS_TYPES = [
  { key: 'loss', label: '损耗', amountField: 'goodsLossTotal', weightField: 'goodsLossWeightTotal', totalField: 'lossAmount' },
  { key: 'waste', label: '废弃', amountField: 'goodsWasteTotal', weightField: 'goodsWasteWeightTotal', totalField: 'wasteAmount' },
  { key: 'return', label: '退货', amountField: 'goodsReturnTotal', weightField: 'goodsReturnWeightTotal', totalField: 'returnAmount' },
  { key: 'employeeMeal', label: '员工餐', amountField: 'goodsEmployeeMealTotal', weightField: 'goodsEmployeeMealWeightTotal', totalField: 'employeeMealAmount' }
];

function numberValue(value) {
  var num = Number(value);
  return isNaN(num) ? 0 : num;
}

function money(value) {
  var parts = numberValue(value).toFixed(1).replace(/\.0$/, '').split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

function quantity(value) {
  return numberValue(value).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function parseDate(value) {
  var parts = String(value || '').split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function isoDate(date) {
  var month = date.getMonth() + 1;
  var day = date.getDate();
  return date.getFullYear() + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
}

function shortDate(value) {
  var parts = String(value || '').split('-');
  return parts.length === 3 ? Number(parts[1]) + '月' + Number(parts[2]) + '日' : value;
}

Page({
  data: {
    navBarHeight: 0,
    loading: true,
    loaded: false,
    periodKey: 'month',
    departmentIndex: 0,
    departmentList: [{ gbDepartmentId: 0, gbDepartmentName: '全部门店' }],
    departmentNames: ['全部门店'],
    trendMode: 'rate',
    ecTrend: { lazyLoad: true },
    trendRows: [],
    hasTrendData: false,
    businessTypeIndex: 0,
    businessTypeNames: BUSINESS_TYPES.map(function (item) { return item.label; }),
    searchKeyword: '',
    detailRows: [],
    detailRateLabel: '损耗率',
    summary: {
      lossRateDisplay: '0.0', lossWeightDisplay: '0', lossAmountDisplay: '0',
      wasteRateDisplay: '0.0', wasteWeightDisplay: '0', wasteAmountDisplay: '0',
      returnWeightDisplay: '0', returnAmountDisplay: '0',
      employeeMealWeightDisplay: '0', employeeMealAmountDisplay: '0'
    }
  },

  onLoad: function () {
    var disInfo = wx.getStorageSync('disInfo') || {};
    var departments = [{ gbDepartmentId: 0, gbDepartmentName: '全部门店' }]
      .concat(disInfo.gbDepartmentEntityList || []);
    this.setData({
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      disId: disInfo.gbDistributerId,
      departmentList: departments,
      departmentNames: departments.map(function (item) { return item.gbDepartmentName; })
    });
    this._syncDate();
    this._load();
  },

  onShow: function () {
    if (this.data.updateDate) {
      this.setData({ updateDate: false, periodKey: 'custom' });
      this._syncDate();
      this._load();
    }
  },

  onPullDownRefresh: function () {
    this._load();
  },

  onUnload: function () {
    if (this.trendChart) this.trendChart.dispose();
  },

  _syncDate: function () {
    var saved = wx.getStorageSync('myDate');
    var startDate = dateUtils.getFirstDateInMonth();
    var stopDate = dateUtils.getArriveDate(0);
    var periodKey = 'month';
    if (saved) {
      var range = saved.name === 'custom'
        ? dateUtils.getDateRange(saved.name, saved.startDate, saved.stopDate)
        : dateUtils.getDateRange(saved.name);
      startDate = range.startDate;
      stopDate = range.stopDate;
      periodKey = saved.name === 'month' ? 'month' : 'custom';
    }
    this.setData({
      startDate: startDate,
      stopDate: stopDate,
      periodKey: periodKey,
      dateRangeText: shortDate(startDate) + ' - ' + shortDate(stopDate)
    });
  },

  selectPeriod: function (event) {
    var key = event.currentTarget.dataset.key;
    var startDate = key === 'thirty' ? dateUtils.getArriveDate(-29) : dateUtils.getFirstDateInMonth();
    var stopDate = dateUtils.getArriveDate(0);
    this.setData({
      periodKey: key,
      startDate: startDate,
      stopDate: stopDate,
      dateRangeText: shortDate(startDate) + ' - ' + shortDate(stopDate)
    });
    this._load();
  },

  toDatePage: function () {
    this.setData({ updateDate: true });
    wx.navigateTo({
      url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate
        + '&stopDate=' + this.data.stopDate + '&dateType=month'
    });
  },

  changeDepartment: function (event) {
    this.setData({ departmentIndex: Number(event.detail.value) });
    this._load();
  },

  switchTrend: function (event) {
    this.setData({ trendMode: event.currentTarget.dataset.mode }, this._scheduleTrend.bind(this));
  },

  changeBusinessType: function (event) {
    this.setData({ businessTypeIndex: Number(event.detail.value) }, this._applyDetailFilter.bind(this));
  },

  onSearchInput: function (event) {
    this.setData({ searchKeyword: event.detail.value }, this._applyDetailFilter.bind(this));
  },

  _load: function () {
    var that = this;
    var department = this.data.departmentList[this.data.departmentIndex] || {};
    if (!this.data.disId) {
      load.showToast('缺少分销商信息');
      return;
    }
    var requestKey = [this.data.disId, this.data.startDate, this.data.stopDate, department.gbDepartmentId || 0].join('-');
    this._requestKey = requestKey;
    this.setData({ loading: true });
    load.showLoading('获取数据中');
    apiDistributer.getGbInventoryBusinessAnalysis({
      disId: this.data.disId,
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      searchDepId: department.gbDepartmentId ? String(department.gbDepartmentId) : '-1',
      greatId: -1,
      includeDetails: true
    }).then(function (res) {
      if (that._requestKey !== requestKey) return;
      load.hideLoading();
      wx.stopPullDownRefresh();
      if (!res.result || res.result.code !== 0) {
        that.setData({ loading: false, loaded: true });
        load.showToast((res.result && res.result.msg) || '获取失败');
        return;
      }
      that._apply(res.result.data || {});
    }).catch(function (err) {
      if (that._requestKey !== requestKey) return;
      load.hideLoading();
      wx.stopPullDownRefresh();
      that.setData({ loading: false, loaded: true });
      load.showToast('网络请求失败');
      console.error('库存业务分析获取失败:', err);
    });
  },

  _apply: function (data) {
    var summary = data.summary || {};
    var normalizedSummary = {
      lossRate: numberValue(summary.lossRate),
      lossRateDisplay: numberValue(summary.lossRate).toFixed(1),
      lossWeightDisplay: quantity(summary.lossWeight),
      lossAmount: numberValue(summary.lossAmount),
      lossAmountDisplay: money(summary.lossAmount),
      wasteRate: numberValue(summary.wasteRate),
      wasteRateDisplay: numberValue(summary.wasteRate).toFixed(1),
      wasteWeightDisplay: quantity(summary.wasteWeight),
      wasteAmount: numberValue(summary.wasteAmount),
      wasteAmountDisplay: money(summary.wasteAmount),
      returnWeightDisplay: quantity(summary.returnWeight),
      returnAmount: numberValue(summary.returnAmount),
      returnAmountDisplay: money(summary.returnAmount),
      employeeMealWeightDisplay: quantity(summary.employeeMealWeight),
      employeeMealAmount: numberValue(summary.employeeMealAmount),
      employeeMealAmountDisplay: money(summary.employeeMealAmount),
      rateBaseWeight: numberValue(summary.rateBaseWeight)
    };
    this._goodsRows = data.goodsRows || [];
    var trendRows = this._fillDays(data.trend || []);
    var hasTrendData = trendRows.some(function (row) {
      return numberValue(row.lossRate) > 0 || numberValue(row.wasteRate) > 0
        || numberValue(row.returnCostTotal) > 0 || numberValue(row.employeeMealCostTotal) > 0;
    });
    this.setData({
      loading: false,
      loaded: true,
      summary: normalizedSummary,
      trendRows: trendRows,
      hasTrendData: hasTrendData
    }, function () {
      this._applyDetailFilter();
      this._scheduleTrend();
    }.bind(this));
  },

  _fillDays: function (rows) {
    var byDay = {};
    (rows || []).forEach(function (row) { byDay[row.day] = row; });
    var result = [];
    var cursor = parseDate(this.data.startDate);
    var end = parseDate(this.data.stopDate);
    while (cursor <= end) {
      var day = isoDate(cursor);
      var source = byDay[day] || {};
      result.push({
        day: day,
        lossRate: numberValue(source.lossRate),
        wasteRate: numberValue(source.wasteRate),
        returnCostTotal: numberValue(source.returnCostTotal),
        employeeMealCostTotal: numberValue(source.employeeMealCostTotal)
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  },

  _applyDetailFilter: function () {
    var meta = BUSINESS_TYPES[this.data.businessTypeIndex] || BUSINESS_TYPES[0];
    var keyword = String(this.data.searchKeyword || '').trim().toLowerCase();
    var selectedTotal = numberValue(this.data.summary[meta.totalField]);
    var rows = (this._goodsRows || []).map(function (item) {
      var amount = numberValue(item[meta.amountField]);
      var businessWeight = numberValue(item[meta.weightField]);
      var rateBase = numberValue(item.goodsProduceWeightTotal)
        + numberValue(item.goodsLossWeightTotal)
        + numberValue(item.goodsWasteWeightTotal);
      var percent = (meta.key === 'loss' || meta.key === 'waste')
        ? (rateBase ? businessWeight * 100 / rateBase : 0)
        : (selectedTotal ? amount * 100 / selectedTotal : 0);
      return {
        id: item.gbDistributerGoodsId,
        name: item.gbDgGoodsName || '未命名商品',
        unit: item.gbDgGoodsStandardname || '斤',
        weightDisplay: quantity(businessWeight),
        amountDisplay: money(amount),
        percentDisplay: percent.toFixed(1),
        amount: amount,
        weight: businessWeight
      };
    }).filter(function (item) {
      if (item.amount <= 0 && item.weight <= 0) return false;
      return !keyword || item.name.toLowerCase().indexOf(keyword) >= 0;
    }).sort(function (a, b) { return b.amount - a.amount; });
    this.setData({
      detailRows: rows,
      detailRateLabel: meta.key === 'loss' ? '损耗率'
        : (meta.key === 'waste' ? '废弃率' : '金额占比')
    });
  },

  _scheduleTrend: function () {
    var that = this;
    wx.nextTick(function () {
      setTimeout(function () { that._drawTrend(); }, 80);
    });
  },

  _drawTrend: function () {
    var component = this.selectComponent('#businessTrendChart');
    if (!component) {
      this._chartAttempts = (this._chartAttempts || 0) + 1;
      if (this._chartAttempts < 6) setTimeout(this._drawTrend.bind(this), 100);
      return;
    }
    this._chartAttempts = 0;
    var rows = this.data.trendRows || [];
    var isRate = this.data.trendMode === 'rate';
    var that = this;
    component.init(function (canvas, width, height, dpr) {
      if (that.trendChart) that.trendChart.dispose();
      var chart = echarts.init(canvas, null, { width: width, height: height, devicePixelRatio: dpr });
      var labels = rows.map(function (row) {
        var parts = row.day.split('-');
        return Number(parts[1]) + '/' + Number(parts[2]);
      });
      var series = isRate ? [
        { name: '损耗率', color: '#16b875', field: 'lossRate' },
        { name: '废弃率', color: '#ff7a35', field: 'wasteRate' }
      ] : [
        { name: '退货金额', color: '#6c82e8', field: 'returnCostTotal' },
        { name: '员工餐金额', color: '#f0a832', field: 'employeeMealCostTotal' }
      ];
      chart.setOption({
        animation: true,
        color: series.map(function (item) { return item.color; }),
        tooltip: {
          trigger: 'axis',
          formatter: function (params) {
            var lines = [params.length ? params[0].axisValue : ''];
            params.forEach(function (item) {
              lines.push(item.marker + item.seriesName + '：' + (isRate ? item.value + '%' : '￥' + item.value));
            });
            return lines.join('\n');
          }
        },
        grid: { left: 12, right: 10, top: 20, bottom: 10, containLabel: true },
        xAxis: {
          type: 'category', boundaryGap: false, data: labels,
          axisTick: { show: false },
          axisLine: { lineStyle: { color: '#dce9e5' } },
          axisLabel: { color: '#7c8ba0', fontSize: 9, interval: rows.length > 16 ? 2 : 0 }
        },
        yAxis: {
          type: 'value', min: 0, splitNumber: 4,
          axisLine: { show: false }, axisTick: { show: false },
          axisLabel: { color: '#7c8ba0', fontSize: 9, formatter: isRate ? '{value}%' : '{value}' },
          splitLine: { lineStyle: { color: '#edf3f1', type: 'dashed' } }
        },
        series: series.map(function (item) {
          return {
            name: item.name, type: 'line', smooth: true, symbol: 'circle', symbolSize: 5,
            lineStyle: { width: 2, color: item.color },
            itemStyle: { color: item.color },
            areaStyle: { color: item.color, opacity: .06 },
            data: rows.map(function (row) { return numberValue(row[item.field]); })
          };
        })
      });
      that.trendChart = chart;
      return chart;
    });
  },

  toGoodsPage: function (event) {
    var id = event.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/subPackage-charts/pages/cost/purchaseCategoryDetail/purchaseCategoryDetail?focusGoodsId=' + id
    });
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  }
});
