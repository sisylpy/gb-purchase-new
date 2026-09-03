var load = require('../../../../lib/load.js');
var globalData = getApp().globalData;
var dateUtils = require('../../../../lib/dateUtil');
var chartsApi = require('../../../services/api.js');

function _money(value) {
  if (value === null || value === undefined || value === '') return '—';
  var number = Number(value);
  return isNaN(number) ? '—' : number.toFixed(2);
}

function _quantity(value) {
  if (value === null || value === undefined || value === '') return '0';
  var number = Number(value);
  if (isNaN(number)) return String(value);
  return number.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function _rate(value) {
  if (value === null || value === undefined || value === '') return '—';
  var number = Number(value);
  return isNaN(number) ? '—' : number.toFixed(2);
}

function _number(value, digits) {
  if (value === null || value === undefined || value === '') return '—';
  var number = Number(value);
  if (isNaN(number)) return String(value);
  return number.toFixed(typeof digits === 'number' ? digits : 4)
    .replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

function _unit(value) {
  var labels = { G: '克', KG: '千克', JIN: '斤', ML: '毫升', L: '升', EA: '个' };
  var key = String(value || '').toUpperCase();
  return labels[key] || value || '';
}

function _imageUrl(path) {
  if (!path) return '';
  var value = String(path);
  if (/^https?:\/\//i.test(value)) return value;
  return String(globalData.server || '') + value;
}

function _rangeText(minimum, maximum, suffix, digits) {
  if (minimum === null || minimum === undefined || minimum === '') return '—';
  var minText = _number(minimum, digits);
  var maxText = _number(maximum, digits);
  var body = Number(minimum) === Number(maximum) || maxText === '—'
    ? minText : minText + '–' + maxText;
  return body + (suffix || '');
}

function _normalizeIngredient(row) {
  var item = Object.assign({}, row || {});
  var unit = _unit(item.baseUnitCode);
  var versions = (item.recipeVersionNos || []).map(function (version) { return 'V' + version; });
  item._key = String(item.rawGoodsId || '') + ':' + String(item.baseUnitCode || '');
  item._name = item.rawGoodsName || ('配料 #' + (item.rawGoodsId || ''));
  item._spec = [item.rawGoodsStandardName, item.rawGoodsStandardWeight].filter(function (value) {
    return value !== null && value !== undefined && String(value).trim() !== '';
  }).join(' ');
  item._imageUrl = _imageUrl(item.rawGoodsImage);
  item._portionText = _rangeText(
    item.minimumBaseQuantityPerPortion, item.maximumBaseQuantityPerPortion, ' ' + unit + '/份', 4
  );
  item._totalQuantityText = _rangeText(item.totalBaseQuantity, item.totalBaseQuantity, ' ' + unit, 4);
  item._priceText = item.minimumHistoricalBaseUnitPrice == null
    ? '—'
    : '¥' + _rangeText(
      item.minimumHistoricalBaseUnitPrice, item.maximumHistoricalBaseUnitPrice, '/' + unit, 8
    );
  item._costText = item.completeCostAmount == null ? '—' : '¥' + _money(item.completeCostAmount);
  item._knownCostText = Number(item.knownCostAmount || 0) > 0 ? '¥' + _money(item.knownCostAmount) : '—';
  item._versionText = versions.length ? versions.join('、') : '配方版本待确认';
  item._dateText = item.firstBusinessDate
    ? String(item.firstBusinessDate).slice(5) + ' 至 ' + String(item.lastBusinessDate || item.firstBusinessDate).slice(5)
    : '';
  item._missingReasonText = (item.missingReasons || []).join('；');
  return item;
}

function _normalizeDaily(row) {
  var item = Object.assign({}, row || {});
  item.salesQuantityText = _quantity(item.salesQuantity);
  item.revenueAmountText = _money(item.revenueAmount);
  item.completeCostAmountText = _money(item.completeCostAmount);
  item.knownCostAmountText = _money(item.knownCostAmount);
  item.completionRateText = _rate(item.completionRate);
  item.recipeVersionText = item.recipeVersionNo == null ? '无有效版本' : 'V' + item.recipeVersionNo;
  item.missingReasonText = Array.isArray(item.missingReasons) ? item.missingReasons.join('；') : '';
  item.isComplete = item.status === 'COMPLETED' && item.completeCostAmount != null;
  item.isPartial = item.status === 'PARTIAL';
  item.isCalculating = item.status === 'RECALCULATION_PENDING';
  item.hasKnownEvidence = Number(item.completionRate || 0) > 0;
  return item;
}

function _normalizeDish(row) {
  var item = Object.assign({}, row || {});
  item.salesQuantityText = _quantity(item.salesQuantity);
  item.revenueAmountText = _money(item.revenueAmount);
  item.totalCostText = _money(item.totalHistoricalTheoreticalCostAmount);
  item.resolvedCostText = _money(item.resolvedHistoricalTheoreticalCostAmount);
  item.knownPartialCostText = _money(item.knownPartialCostAmount);
  item.costPerPortionText = _money(item.completeCostPerPortion);
  item.grossMarginRateText = _rate(item.completeGrossMarginRate);
  item.salesCoverageRateText = _rate(item.salesCoverageRate);
  item.evidenceCoverageRateText = _rate(item.evidenceCoverageRate);
  item.missingReasonText = Array.isArray(item.missingReasons) ? item.missingReasons.join('；') : '';
  item.hasKnownEvidence = Number(item.evidenceCoverageRate || 0) > 0;
  item.ingredientSummaries = (item.ingredientSummaries || []).map(_normalizeIngredient);
  item.dailyRows = (item.dailyRows || []).map(_normalizeDaily);
  item._expanded = false;
  return item;
}

function _normalizeSummary(summary) {
  var item = Object.assign({}, summary || {});
  item.totalSalesQuantityText = _quantity(item.totalSalesQuantity);
  item.totalRevenueText = _money(item.totalRevenue);
  item.totalCostText = _money(item.totalHistoricalTheoreticalCostAmount);
  item.resolvedCostText = _money(item.resolvedHistoricalTheoreticalCostAmount);
  item.knownPartialCostText = _money(item.knownPartialCostAmount);
  item.grossProfitText = _money(item.completeGrossProfitAmount);
  item.grossMarginRateText = _rate(item.completeGrossMarginRate);
  item.salesCoverageRateText = _rate(item.salesCoverageRate);
  item.evidenceCoverageRateText = _rate(item.evidenceCoverageRate);
  item.hasResolvedCost = Number(item.completedGrainCount || 0) > 0;
  item.hasKnownEvidence = Number(item.evidenceCoverageRate || 0) > 0;
  return item;
}

function _filterDishRows(list, keyword) {
  var rows = Array.isArray(list) ? list : [];
  var value = (keyword == null ? '' : String(keyword)).trim().toLowerCase();
  if (!value) return rows.slice();
  return rows.filter(function (row) {
    return String(row.dishName || '').toLowerCase().indexOf(value) !== -1;
  });
}

Page({
  data: {
    dishRows: [],
    dishRowsAll: [],
    reportSummary: null,
    loading: false,
    emptyHint: '',
    update: false,
    sortBy: 'status',
    sortOrder: 'desc',
    searchBarOpen: false,
    searchInputFocus: false,
    dishNameSearch: '',
    dishNameSearchDraft: '',
  },

  onLoad: function (options) {
    var userInfo = wx.getStorageSync('userInfo');
    var disInfo = wx.getStorageSync('disInfo');
    var mendianInfo = wx.getStorageSync('mendianInfo');
    var disId = (options && options.disId)
      || (disInfo && disInfo.gbDistributerId)
      || (userInfo && userInfo.gbDuDistributerId);
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      disId: disId,
      depFatherId: mendianInfo && mendianInfo.gbDepartmentId,
    });
    this._syncDatesFromMyDateStorage();
    this._fetchReport();
  },

  onShow: function () {
    if (!this.data.update) return;
    this._syncDatesFromMyDateStorage();
    this.setData({ update: false });
    this._fetchReport();
  },

  onUnload: function () {
    if (this._dishSearchDebounceTimer) clearTimeout(this._dishSearchDebounceTimer);
  },

  _syncDatesFromMyDateStorage: function () {
    var myDate = wx.getStorageSync('myDate');
    var dateRange;
    if (myDate) {
      dateRange = myDate.name === 'custom'
        ? dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate)
        : dateUtils.getDateRange(myDate.name);
      this.setData({
        startDate: dateRange.startDate,
        stopDate: dateRange.stopDate,
        dateType: myDate.dateType,
        hanzi: myDate.hanzi || dateRange.name,
      });
      return;
    }
    this.setData({
      dateType: 'month',
      startDate: dateUtils.getFirstDateInMonth(),
      stopDate: dateUtils.getArriveDate(0),
      hanzi: '本月',
    });
  },

  _fetchReport: function () {
    var that = this;
    if (!this.data.disId || !this.data.depFatherId || !this.data.startDate || !this.data.stopDate) {
      this.setData({
        reportSummary: null,
        dishRowsAll: [],
        dishRows: [],
        emptyHint: '缺少门店或日期信息，暂时无法核算',
      });
      return;
    }
    load.showLoading('加载成本中');
    this.setData({ loading: true, emptyHint: '' });
    chartsApi.getDishDailyCostReport({
      distributerId: this.data.disId,
      storeDepartmentId: this.data.depFatherId,
      startDate: this.data.startDate,
      endDate: this.data.stopDate,
      sortBy: this.data.sortBy || 'status',
      sortOrder: this.data.sortOrder || 'desc',
    }).then(function (res) {
      load.hideLoading();
      var result = res.result || {};
      if (result.code !== 0 || !result.data) {
        throw new Error(result.msg || '成本报表加载失败');
      }
      var data = result.data;
      var rows = (data.dishes || []).map(_normalizeDish);
      that.setData({
        loading: false,
        reportSummary: _normalizeSummary(data.summary),
        dishRowsAll: rows,
        emptyHint: rows.length ? '' : '当前日期范围还没有可核算的销量版本',
      });
      that._applyDishFilter(rows);
    }).catch(function (error) {
      load.hideLoading();
      that.setData({
        loading: false,
        reportSummary: null,
        dishRowsAll: [],
        dishRows: [],
        emptyHint: (error && error.message) || '成本报表加载失败',
      });
    });
  },

  _applyDishFilter: function (rows) {
    this.setData({
      dishRows: _filterDishRows(rows || this.data.dishRowsAll, this.data.dishNameSearch),
    });
  },

  onToggleDishDetail: function (e) {
    var index = e.currentTarget.dataset.index;
    if (index === undefined || index === null) return;
    var key = 'dishRows[' + index + ']._expanded';
    this.setData({ [key]: !this.data.dishRows[index]._expanded });
  },

  onOpenCostEvidence: function (e) {
    var data = (e && e.currentTarget && e.currentTarget.dataset) || {};
    if (!data.resultId) {
      wx.showToast({ title: '该配料还没有可查看的成本证据', icon: 'none' });
      return;
    }
    this.setData({ update: true });
    wx.navigateTo({
      url: '/subPackage-charts/pages/cost/costEvidenceDetail/costEvidenceDetail'
        + '?resultId=' + encodeURIComponent(data.resultId)
        + '&distributerId=' + encodeURIComponent(this.data.disId || '')
        + '&storeDepartmentId=' + encodeURIComponent(this.data.depFatherId || '')
        + '&foodId=' + encodeURIComponent(data.foodId || '')
        + '&businessDate=' + encodeURIComponent(data.businessDate || '')
        + '&dishName=' + encodeURIComponent(data.dishName || ''),
    });
  },

  onSort: function (e) {
    var that = this;
    var sort = e.currentTarget.dataset.sort;
    if (!sort) return;
    var order = sort === this.data.sortBy && this.data.sortOrder === 'desc' ? 'asc' : 'desc';
    this.setData({ sortBy: sort, sortOrder: order }, function () {
      that._fetchReport();
    });
  },

  onToggleSearchBar: function () {
    var open = !this.data.searchBarOpen;
    this.setData({
      searchBarOpen: open,
      searchInputFocus: open,
      dishNameSearchDraft: this.data.dishNameSearch || '',
    });
  },

  onDishNameSearchInput: function (e) {
    var that = this;
    var value = (e.detail && e.detail.value) || '';
    this.setData({ dishNameSearchDraft: value });
    if (this._dishSearchDebounceTimer) clearTimeout(this._dishSearchDebounceTimer);
    this._dishSearchDebounceTimer = setTimeout(function () {
      that.setData({ dishNameSearch: (that.data.dishNameSearchDraft || '').trim() });
      that._applyDishFilter();
    }, 300);
  },

  onDishNameSearchConfirm: function (e) {
    var value = ((e.detail && e.detail.value) || this.data.dishNameSearchDraft || '').trim();
    if (this._dishSearchDebounceTimer) clearTimeout(this._dishSearchDebounceTimer);
    this.setData({ dishNameSearch: value, dishNameSearchDraft: value });
    this._applyDishFilter();
  },

  onDishNameSearchClear: function () {
    if (this._dishSearchDebounceTimer) clearTimeout(this._dishSearchDebounceTimer);
    this.setData({ dishNameSearch: '', dishNameSearchDraft: '' });
    this._applyDishFilter();
  },

  toDatePage: function () {
    this.setData({ update: true });
    wx.navigateTo({
      url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate
        + '&stopDate=' + this.data.stopDate
        + '&dateType=' + (this.data.dateType || 'month'),
    });
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  },
});
