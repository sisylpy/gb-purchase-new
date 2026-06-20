var load = require('../../../../lib/load.js');
var globalData = getApp().globalData;
var dateUtils = require('../../../../lib/dateUtil');
var chartsApi = require('../../../services/api.js');
var config = require('../../../../config/index.js');

/** 与 depFoodList 同源：跳转 dishIngredientDashboard 的 foodId = gb_distributer_food_id；配料分析行可能没有嵌套字段时兜底 dishId */
function _resolveDistributerFoodIdFromAnalysisRow(row) {
  if (!row) {
    return '';
  }
  if (row.gbDfBusinessInsight && row.gbDfBusinessInsight.foodId != null && row.gbDfBusinessInsight.foodId !== '') {
    return String(row.gbDfBusinessInsight.foodId);
  }
  if (row.gbDistributerFoodEntity && row.gbDistributerFoodEntity.gbDistributerFoodId != null) {
    return String(row.gbDistributerFoodEntity.gbDistributerFoodId);
  }
  if (row.gbDistributerFoodId != null && row.gbDistributerFoodId !== '') {
    return String(row.gbDistributerFoodId);
  }
  if (row.dishId != null && row.dishId !== '') {
    return String(row.dishId);
  }
  return '';
}

/** 本地按菜品名称（dishName / gbDfFoodName）包含匹配，不请求接口 */
function _filterDishRowsByDishName(list, keyword) {
  var arr = Array.isArray(list) ? list : [];
  var t = (keyword == null ? '' : String(keyword)).trim().toLowerCase();
  if (!t) {
    return arr.slice();
  }
  return arr.filter(function (row) {
    var a = row.dishName != null ? String(row.dishName) : '';
    var b = row.gbDfFoodName != null ? String(row.gbDfFoodName) : '';
    return a.toLowerCase().indexOf(t) !== -1 || b.toLowerCase().indexOf(t) !== -1;
  });
}

Page({
  data: {
    salesDishRows: [],
    salesDishRowsAll: [],
    scopeSalesSubtotals: null,
    loading: false,
    emptyHint: '',
    update: false,
    searchDepId: '-1',
    /** 菜品排序：diffCostPerPortion（成本偏差金额）| diffRate（成本偏差率）| ingredientCount（配料数量） */
    sortBy: 'diffCostPerPortion',
    /** desc 默认与后端一致 */
    sortOrder: 'desc',
    /** 仅看成本偏差≠0 的菜品（前端筛选） */
    abnormalFirst: false,
    searchBarOpen: false,
    searchInputFocus: false,
    dishNameSearch: '',
    dishNameSearchDraft: '',
    mendianInfo: null,
    /** 与 depFoodList 一致：选具体子部门后请求带 subDepId；首项「全部」不带 */
    activeSubDepIndex: 0,
    activeSubDepId: '',
    activeSubDepName: '',
    subDepPickerRange: [],
  },

  onUnload: function () {
    if (this._dishSearchDebounceTimer) {
      clearTimeout(this._dishSearchDebounceTimer);
      this._dishSearchDebounceTimer = null;
    }
  },

  onShow: function () {
    if (this.data.update) {
      this._syncDatesFromMyDateStorage();
      this.setData({ update: false });
      this._fetchReport();
    }
  },

  onLoad: function (options) {
    var userInfo = wx.getStorageSync('userInfo');
    var disId = (options && options.disId) || (userInfo && userInfo.gbDuDistributerId);
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: config.server,
      disId: disId,
    });


    var mendianInfo = wx.getStorageSync('mendianInfo');
    if (mendianInfo && mendianInfo.gbDepartmentId) {
      this.setData({
        mendianInfo: mendianInfo,
        depFatherId: mendianInfo.gbDepartmentId,
      },
      );
    }
    this._syncDatesFromMyDateStorage();
    this._fetchReport();
  },

  _syncDatesFromMyDateStorage() {
    var myDate = wx.getStorageSync('myDate');
    if (myDate) {
      var dateRange;
      if (myDate.name === 'custom') {
        dateRange = dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate);
      } else {
        dateRange = dateUtils.getDateRange(myDate.name);
      }
      this.setData({
        startDate: dateRange.startDate,
        stopDate: dateRange.stopDate,
        dateType: myDate.dateType,
        hanzi: myDate.hanzi || dateRange.name,
      });
    } else {
      this.setData({
        dateType: 'month',
        startDate: dateUtils.getFirstDateInMonth(),
        stopDate: dateUtils.getArriveDate(0),
        hanzi: "本月",
      });
    }
  },


  _fetchReport: function () {
    var that = this;
    load.showLoading('加载中');
    var req = {
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      endDate: this.data.stopDate,
      disId: this.data.disId,
      searchDepId: this.data.searchDepId,
      depFatherId: this.data.depFatherId,
      sortBy: this.data.sortBy || 'diffCostPerPortion',
      sortOrder: this.data.sortOrder || 'desc',
    };
    var sid = this.data.activeSubDepId;
    if (sid != null && sid !== '') {
      req.subDepId = sid;
    }
    chartsApi
      .getGbIngredientAnalysis(req)
      .then(function (res) {
        load.hideLoading();
        console.log("ers", res.result.data);
        var data = (res.result && res.result.data) || {};
        var all = data.salesDishRows || [];
        var so = data.sortOrder;
        var nextOrder = so === 'asc' || so === 'desc' ? so : that.data.sortOrder;
        that.setData({
          loading: false,
          scopeSalesSubtotals: data.scopeSalesSubtotals || null,
          salesDishRowsAll: all,
          sortOrder: nextOrder,
        });
        that._applyDishFilter(all);
      })
      .catch(function () {
        load.hideLoading();
        that.setData({
          loading: false,
          scopeSalesSubtotals: null,
          salesDishRowsAll: [],
          salesDishRows: [],
        });
      });
  },

  _applyDishFilter: function (allRows) {
    var base = allRows || this.data.salesDishRowsAll || [];
    var afterName = _filterDishRowsByDishName(base, this.data.dishNameSearch);
    var out = afterName;
    if (this.data.abnormalFirst) {
      out = [];
      for (var i = 0; i < afterName.length; i++) {
        var d = afterName[i];
        var v = parseFloat(String(d && d.diffCostPerPortion != null ? d.diffCostPerPortion : '').trim());
        if (!isNaN(v) && Math.abs(v) > 1e-6) {
          out.push(d);
        }
      }
    }
    this.setData({ salesDishRows: out });
  },

  onToggleSearchBar: function () {
    var open = !this.data.searchBarOpen;
    if (open) {
      this.setData({
        searchBarOpen: true,
        searchInputFocus: true,
        dishNameSearchDraft: this.data.dishNameSearch || this.data.dishNameSearchDraft || '',
      });
    } else {
      this.setData({
        searchBarOpen: false,
        searchInputFocus: false,
      });
    }
  },

  onDishNameSearchInput: function (e) {
    var that = this;
    var v = (e.detail && e.detail.value) || '';
    this.setData({ dishNameSearchDraft: v });
    if (this._dishSearchDebounceTimer) {
      clearTimeout(this._dishSearchDebounceTimer);
    }
    this._dishSearchDebounceTimer = setTimeout(function () {
      var t = (that.data.dishNameSearchDraft || '').trim();
      if (t === (that.data.dishNameSearch || '')) {
        return;
      }
      that.setData({ dishNameSearch: t }, function () {
        that._applyDishFilter();
      });
    }, 350);
  },

  onDishNameSearchConfirm: function (e) {
    var v = ((e.detail && e.detail.value) || this.data.dishNameSearchDraft || '').trim();
    if (this._dishSearchDebounceTimer) {
      clearTimeout(this._dishSearchDebounceTimer);
      this._dishSearchDebounceTimer = null;
    }
    var that = this;
    this.setData({ dishNameSearch: v, dishNameSearchDraft: v }, function () {
      that._applyDishFilter();
    });
  },

  onDishNameSearchClear: function () {
    if (this._dishSearchDebounceTimer) {
      clearTimeout(this._dishSearchDebounceTimer);
      this._dishSearchDebounceTimer = null;
    }
    var that = this;
    this.setData({ dishNameSearch: '', dishNameSearchDraft: '' }, function () {
      that._applyDishFilter();
    });
  },

  /** 切换菜品详情展开/收起 */
  onToggleDishDetail: function (e) {
    var idx = e.currentTarget.dataset.index;
    if (idx === undefined || idx === null) return;
    var key = 'salesDishRows[' + idx + ']._expanded';
    var current = this.data.salesDishRows[idx] && this.data.salesDishRows[idx]._expanded;
    this.setData({
      [key]: !current
    });
  },

  onToggleAbnormal: function () {
    var next = !this.data.abnormalFirst;
    this.setData({ abnormalFirst: next });
    this._applyDishFilter();
  },

  onIngredientSort: function (e) {
    var that = this;
    var sort = e.currentTarget.dataset.sort;
    if (!sort) {
      return;
    }
    var curBy = this.data.sortBy;
    var curOrder = this.data.sortOrder || 'desc';
    if (sort === curBy) {
      var nextOrder = curOrder === 'asc' ? 'desc' : 'asc';
      this.setData({ sortOrder: nextOrder }, function () {
        that._fetchReport();
      });
    } else {
      this.setData({ sortBy: sort, sortOrder: 'desc' }, function () {
        that._fetchReport();
      });
    }
  },

  onMoreFilter: function () {},

  toDatePage: function () {
    this.setData({ update: true });
    wx.navigateTo({
      url:
        '/pages/common/selectDate/selectDate?startDate=' +
        this.data.startDate +
        '&stopDate=' +
        this.data.stopDate +
        '&dateType=' +
        (this.data.dateType || 'month'),
    });
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  },

  /** 与 depFoodList「查看配料成本分析」同源：配料看板页 */
  onOpenIngredients: function (e) {
    var dish = e.currentTarget.dataset.dish;
    if (!dish) {
      return;
    }
    var foodId = _resolveDistributerFoodIdFromAnalysisRow(dish);
    if (!foodId) {
      wx.showToast({ title: '缺少菜品ID，无法打开配料看板', icon: 'none' });
      return;
    }
    var d = this.data;
    if (!d.startDate || !d.stopDate) {
      wx.showToast({ title: '请先在页顶选择有效日期', icon: 'none' });
      return;
    }
    var disId = d.disId;
    if (disId == null || disId === '') {
      var disInfo = wx.getStorageSync('disInfo');
      if (disInfo && disInfo.gbDistributerId != null) {
        disId = disInfo.gbDistributerId;
      }
    }
    if (disId == null || disId === '') {
      wx.showToast({ title: '缺少门店信息', icon: 'none' });
      return;
    }
    var depFather = d.depFatherId;
    if (depFather == null || depFather === '') {
      wx.showToast({ title: '缺少父部门，无法查配料', icon: 'none' });
      return;
    }
    var q = [
      'foodId=' + encodeURIComponent(foodId),
      'startDate=' + encodeURIComponent(d.startDate),
      'stopDate=' + encodeURIComponent(d.stopDate),
      'endDate=' + encodeURIComponent(d.stopDate),
      'disId=' + encodeURIComponent(String(disId)),
      'depFatherId=' + encodeURIComponent(String(depFather)),
    ];
    var name = dish.dishName || dish.gbDfFoodName;
    if (name) {
      q.push('foodName=' + encodeURIComponent(String(name)));
    }
    if (d.hanzi) {
      q.push('hanzi=' + encodeURIComponent(String(d.hanzi)));
    }
    wx.navigateTo({
      url: '/subPackage-mendian/pages/management/dishIngredientDashboard/dishIngredientDashboard?' + q.join('&'),
    });
  },
});
