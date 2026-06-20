

var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
import apiUrl from '../../../../config/index.js'
var dateUtils = require('../../../../lib/dateUtil.js');

import {
  depGeFoodBusiness,
  getFoodList,
} from '../../../../services/apiDistributerFood'

/** 仅做 JSON 解析与空对象防护，其余字段与接口 `depGeFoodBusiness` 根对象一致。 */
function _normalizeDepGetAllFoodBody(raw) {
  var r = raw;
  if (typeof r === 'string') {
    try {
      r = JSON.parse(r);
    } catch (e) {
      return { code: -1, msg: '数据解析失败' };
    }
  }
  if (!r || typeof r !== 'object') {
    return { code: -1, msg: '' };
  }
  return r;
}

function _toFloat(v) {
  if (v === null || v === undefined || v === '') return NaN;
  return parseFloat(String(v).trim());
}

/** 请求 dishIngredientDashboard 的 foodId = gb_distributer_food_id */
function _resolveDistributerFoodId(food) {
  if (!food) {
    return '';
  }
  if (food.gbDfBusinessInsight && food.gbDfBusinessInsight.foodId != null && food.gbDfBusinessInsight.foodId !== '') {
    return String(food.gbDfBusinessInsight.foodId);
  }
  if (food.gbDistributerFoodEntity && food.gbDistributerFoodEntity.gbDistributerFoodId != null) {
    return String(food.gbDistributerFoodEntity.gbDistributerFoodId);
  }
  if (food.gbDistributerFoodId != null && food.gbDistributerFoodId !== '') {
    return String(food.gbDistributerFoodId);
  }
  return '';
}

/**
 * ec-canvas 需要稳定的 wx:key、domId，以及周维数组；其它展示字段直接用接口 `data[]` / `gbDfBusinessInsight`。
 */
function _enrichFoodRowsForCharts(list, weekdayLegend) {
  var arr = Array.isArray(list) ? list : [];
  return arr.map(function (food, idx) {
    var ins = food.gbDfBusinessInsight;
    var rowKey =
      ins && ins.gbDepFoodId != null && ins.gbDepFoodId !== ''
        ? String(ins.gbDepFoodId)
        : food.gbDepartmentFoodId != null
          ? String(food.gbDepartmentFoodId)
          : 'r' + idx;
    var rowKeyUnique = String(rowKey) + '_' + idx;
    var weekSeries = ins ? _buildWeekdaySeries(ins.weekdayQty || {}, weekdayLegend) : null;
    var weekDomId = 'wc_' + idx + '_' + String(rowKey).replace(/\W/g, '_');
    return Object.assign({}, food, {
      _rowKey: rowKeyUnique,
      _hasInsightRow: !!ins,
      _weekCategories: weekSeries ? weekSeries.categories : [],
      _weekValues: weekSeries ? weekSeries.values : [],
      _weekChartHasData: !!(weekSeries && weekSeries.hasData),
      _weekChartDomId: weekDomId,
    });
  });
}

/** 本地按菜品名称 includes 过滤（不请求接口） */
function _filterFoodRowsByName(list, keyword) {
  var arr = Array.isArray(list) ? list : [];
  var t = (keyword == null ? '' : String(keyword)).trim().toLowerCase();
  if (!t) {
    return arr.slice();
  }
  return arr.filter(function (row) {
    var name = row.gbDfFoodName != null ? String(row.gbDfFoodName) : '';
    return name.toLowerCase().indexOf(t) !== -1;
  });
}

/** 与接口 weekdayLegend 一致：键 "0"～"6"；展示顺序为周一至周日 */
var _WEEK_ORDER = ['1', '2', '3', '4', '5', '6', '0'];
var _WEEK_LABEL_DEFAULT = {
  '0': '周日',
  '1': '周一',
  '2': '周二',
  '3': '周三',
  '4': '周四',
  '5': '周五',
  '6': '周六',
};

function _buildWeekdaySeries(weekdayQty, weekdayLegend) {
  var categories = [];
  var values = [];
  for (var i = 0; i < _WEEK_ORDER.length; i++) {
    var k = _WEEK_ORDER[i];
    var lab =
      weekdayLegend && weekdayLegend[k] != null && weekdayLegend[k] !== ''
        ? String(weekdayLegend[k])
        : _WEEK_LABEL_DEFAULT[k];
    categories.push(lab);
    var raw = weekdayQty && weekdayQty[k];
    var n = _toFloat(raw);
    values.push(isNaN(n) ? 0 : n);
  }
  var hasData = false;
  for (var j = 0; j < values.length; j++) {
    if (values[j] > 0) {
      hasData = true;
      break;
    }
  }
  return { categories: categories, values: values, hasData: hasData };
}

/** 必须用主包 ec-canvas：分包内页面不能 require 另一分包下的 JS（会报 module is not defined） */
var _pageEchartsMod = null;
function _getPageEcharts() {
  if (_pageEchartsMod) return _pageEchartsMod;
  try {
    var mod = require('../../../../ec-canvas/echarts');
    _pageEchartsMod = mod && mod.default ? mod.default : mod;
  } catch (e) {
    console.error('[depFoodList] load echarts from /ec-canvas failed', e);
    _pageEchartsMod = null;
  }
  return _pageEchartsMod;
}

function normalizeDepFoodRow(depFood, idx) {
  var depName = '';
  var ent = depFood.gbDepartmentEntity;
  if (ent && ent.gbDepartmentName != null && ent.gbDepartmentName !== '') {
    depName = String(ent.gbDepartmentName);
  } else if (depFood.gbDepartmentName != null && depFood.gbDepartmentName !== '') {
    depName = String(depFood.gbDepartmentName);
  } else if (depFood.gbDfDepartmentName != null && depFood.gbDfDepartmentName !== '') {
    depName = String(depFood.gbDfDepartmentName);
  }
  var rowKey =
    depFood.gbDepFoodId != null && depFood.gbDepFoodId !== ''
      ? String(depFood.gbDepFoodId)
      : depFood.gbDepartmentFoodId != null && depFood.gbDepartmentFoodId !== ''
        ? String(depFood.gbDepartmentFoodId)
        : depFood.gbDfDepId != null
          ? 'dep_' + depFood.gbDfDepId + '_' + (depFood.gbDfFoodId || '')
          : '';
  return Object.assign({}, depFood, {
    _displayDepName: depName ,
    _depRowKey: rowKey || 'dep_row_' + idx,
  });
}

function attachDepFoodListToDishes(dishes) {
  return dishes.map(function (dish) {
    var raw =
      dish.gbDepFoodEntities ||
      dish.gbDepFoodEntityList ||
      dish.gbDepartmentFoodEntities ||
      [];
    if (!Array.isArray(raw)) {
      raw = [];
    }
    var depFoodList = raw.map(function (item, i) {
      return normalizeDepFoodRow(item, i);
    });
    return Object.assign({}, dish, { depFoodList: depFoodList });
  });
}


Page({


  data: {
   
    showFoodSalesTemplateModal: false,
    todayDate: '',
    foodSalesTemplateStartDate: '',
    foodSalesTemplateEndDate: '',
    update: false,
    foodRows: [],
    bossColumnHintsZh: null,
    businessInsightSummary: null,
    scopeOutboundSubtotals: null,
    insightStartDate: '',
    insightStopDate: '',
    scopeDepIds: null,
    weekdayLegend: null,
    weekEcLazy: { lazyLoad: true },
    /**
     * depGeFoodBusiness sortBy（四参齐全时后端排序）：sales | margin | profit
     * 对应后端：销量份数 / 综合毛利率 / 实际利润
     */
    foodSortBy: 'sales',
    /** desc 默认与后端一致（gbDfSalesAmount 降序） */
    foodSortOrder: 'desc',
    /** 全量列表行数（含被本地搜索隐藏的行），用于区块是否展示 */
    foodRowsSourceCount: 0,
    searchBarOpen: false,
    searchInputFocus: false,
    foodNameSearch: '',
    foodNameSearchDraft: '',
    /** 仅用户选具体子部门后写入；默认空，请求不带 subDepId */
    activeSubDepIndex: 0,
    activeSubDepId: '',
    activeSubDepName: '',
    /** picker 首项为「不按子部门」，其后为 gbDepartmentEntityList */
    subDepPickerRange: [],

    /** 从菜单分类进入：按父级菜品 ID 管理子菜品 */
    foodManageMode: false,
    manageFoodFatherId: '',
    manageFatherName: '',
    manageFoodList: [],
    hasDepartmentChoices: false,
    dishItem: null,
    fatherId: '',
    fatherName: '',
    showChoiceDep: false,
    departmentChoiceList: [],
    selectedDepName: '',
    gbDepId: '',
    showOperationDep: false,
    price: '',
    foodId: '',
    depItem: null,
    toAdd: false,

  },

  onUnload() {
    if (this.data.foodManageMode) {
      return;
    }
    if (this._foodSearchDebounceTimer) {
      clearTimeout(this._foodSearchDebounceTimer);
      this._foodSearchDebounceTimer = null;
    }
    this._disposeWeekCharts();
  },

  onShow() {

     
      if (this.data.update) {
        this.setData({ update: false });
        this._loadManageFoodList();
        return;
      }
     
   
  },

  onLoad(optons) {
    this._weekChartInstances = [];

    const today = dateUtils.getArriveDate(0);
    const firstDay = today.substring(0, 8) + '01';
    const opts = optons || {};
    var foodFatherId = opts.foodFatherId || opts.fatherId;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
     
    });

   

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      disId: opts.disId,
      url: apiUrl.server ,
      type: opts.type,
    })

    var value = wx.getStorageSync('disInfo');
    if (value) {
      this.setData({
        disInfo: value,
      })
    }
    var value = wx.getStorageSync('mendianInfo');
    if (value) {
      this.setData({
        mendianInfo: value,
        depFatherId: value.gbDepartmentId,
      },
      );
    }
    
    this._syncDatesFromMyDateStorage();

    this._initData();

  },

  _loadManageFoodList() {
    var id = this.data.manageFoodFatherId;
    if (!id) {
      return;
    }
    load.showLoading('获取菜品');
    var self = this;
    getFoodList(id)
      .then(function (res) {
        load.hideLoading();
        if (res.result.code == 0) {
          var body = res.result.data;
          var list = [];
          if (Array.isArray(body)) {
            list = body;
          } else if (body && Array.isArray(body.foodEntityList)) {
            list = body.foodEntityList;
          } else if (body && Array.isArray(body.list)) {
            list = body.list;
          }
          var dishes = attachDepFoodListToDishes(list);
          self.setData({ manageFoodList: dishes });
        } else {
          wx.showToast({
            title: res.result.msg || '加载失败',
            icon: 'none',
          });
        }
      })
      .catch(function () {
        load.hideLoading();
        wx.showToast({ title: '网络异常', icon: 'none' });
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

  _initData(overrideSubDepId) {
      var data = {
        startDate: this.data.startDate,
        stopDate: this.data.stopDate,
        disId: this.data.disId,
        depFatherId: this.data.depFatherId,
        sortBy: this.data.foodSortBy || 'sales',
        sortOrder: this.data.foodSortOrder || 'desc',
      };
      var sid =
        overrideSubDepId !== undefined
          ? overrideSubDepId
          : this.data.activeSubDepId;
      if (sid != null && sid !== '') {
        data.subDepId = sid;
      }
      load.showLoading("加载菜品经营数据");
    depGeFoodBusiness(data)
      .then(res => {
        var api = _normalizeDepGetAllFoodBody(res.result);
        if (api.code == 0 || api.code === '0') {
          load.hideLoading();
          var that = this;
          that._disposeWeekCharts();
          var rawList = Array.isArray(api.data) ? api.data : [];
          var enriched = _enrichFoodRowsForCharts(rawList, api.weekdayLegend);
          that._foodRowsSource = enriched;
          var display = _filterFoodRowsByName(enriched, that.data.foodNameSearch);
          that.setData(
            {
              foodRows: display,
              foodRowsSourceCount: enriched.length,
              bossColumnHintsZh: api.bossColumnHintsZh,
              businessInsightSummary: api.businessInsightSummary,
              scopeOutboundSubtotals: api.scopeOutboundSubtotals,
              insightStartDate: api.insightStartDate,
              insightStopDate: api.insightStopDate,
              scopeDepIds: api.scopeDepIds,
              weekdayLegend: api.weekdayLegend,
              foodSortOrder:
                api.sortOrder === 'asc' || api.sortOrder === 'desc' ? api.sortOrder : that.data.foodSortOrder,
            },
            function () {
              that._initWeekdayCharts();
              // 排序后恢复之前的滚动位置，避免页面跳到顶部
              if (that._pendingScrollTop != null) {
                wx.pageScrollTo({
                  scrollTop: that._pendingScrollTop,
                  duration: 0,
                });
                that._pendingScrollTop = null;
              }
            }
          );
        } else {
          load.hideLoading();
          wx.showToast({
            title: api.msg || '加载失败',
            icon: 'none',
          });
        }
      })
      .catch(function (err) {
        load.hideLoading();
        console.error('depGeFoodBusiness', err);
        wx.showToast({ title: '网络异常', icon: 'none' });
      });

  },

  _applyFoodSearchFilter: function () {
    var that = this;
    var src = this._foodRowsSource;
    if (!src || !src.length) {
      this.setData({ foodRows: [] }, function () {
        that._initWeekdayCharts();
      });
      return;
    }
    var rows = _filterFoodRowsByName(src, this.data.foodNameSearch);
    this.setData({ foodRows: rows }, function () {
      that._initWeekdayCharts();
    });
  },

  onToggleSearchBar: function () {
    var open = !this.data.searchBarOpen;
    if (open) {
      this.setData({
        searchBarOpen: true,
        searchInputFocus: true,
        foodNameSearchDraft: this.data.foodNameSearch || this.data.foodNameSearchDraft || '',
      });
    } else {
      this.setData({
        searchBarOpen: false,
        searchInputFocus: false,
      });
    }
  },

  onFoodNameSearchInput: function (e) {
    var that = this;
    var v = (e.detail && e.detail.value) || '';
    this.setData({ foodNameSearchDraft: v });
    if (this._foodSearchDebounceTimer) {
      clearTimeout(this._foodSearchDebounceTimer);
    }
    this._foodSearchDebounceTimer = setTimeout(function () {
      var t = (that.data.foodNameSearchDraft || '').trim();
      if (t === (that.data.foodNameSearch || '')) {
        return;
      }
      that.setData({ foodNameSearch: t }, function () {
        that._applyFoodSearchFilter();
      });
    }, 350);
  },

  onFoodNameSearchConfirm: function (e) {
    var v = ((e.detail && e.detail.value) || this.data.foodNameSearchDraft || '').trim();
    if (this._foodSearchDebounceTimer) {
      clearTimeout(this._foodSearchDebounceTimer);
      this._foodSearchDebounceTimer = null;
    }
    var that = this;
    this.setData({ foodNameSearch: v, foodNameSearchDraft: v }, function () {
      that._applyFoodSearchFilter();
    });
  },

  onFoodNameSearchClear: function () {
    if (this._foodSearchDebounceTimer) {
      clearTimeout(this._foodSearchDebounceTimer);
      this._foodSearchDebounceTimer = null;
    }
    var that = this;
    this.setData({ foodNameSearch: '', foodNameSearchDraft: '' }, function () {
      that._applyFoodSearchFilter();
    });
  },

  onFoodSort: function (e) {
    var that = this;
    var sort = e.currentTarget.dataset.sort;
    if (!sort) {
      return;
    }
    // 保存当前滚动位置，避免请求后页面跳到顶部
    wx.createSelectorQuery()
      .selectViewport()
      .scrollOffset()
      .exec(function (res) {
        if (res && res[0]) {
          that._pendingScrollTop = res[0].scrollTop;
        }
      });
    var curBy = this.data.foodSortBy;
    var curOrder = this.data.foodSortOrder || 'desc';
    if (sort === curBy) {
      var nextOrder = curOrder === 'asc' ? 'desc' : 'asc';
      this.setData({ foodSortOrder: nextOrder }, function () {
        that._initData();
      });
    } else {
      this.setData({ foodSortBy: sort, foodSortOrder: 'desc' }, function () {
        that._initData();
      });
    }
  },

  _disposeWeekCharts: function () {
    var arr = this._weekChartInstances;
    if (!arr) {
      this._weekChartInstances = [];
      return;
    }
    for (var i = 0; i < arr.length; i++) {
      try {
        if (arr[i] && typeof arr[i].dispose === 'function') {
          arr[i].dispose();
        }
      } catch (e) {}
    }
    this._weekChartInstances = [];
  },

  _getWeekLineOption: function (categories, values) {
    var cats = categories || [];
    var vals = values || [];
    return {
      color: ['#187e6e'],
      grid: { left: 6, right: 10, top: 40, bottom: 4, containLabel: true },
      tooltip: { show: false },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: cats,
        axisLabel: { fontSize: 10, color: '#888' },
        axisLine: { lineStyle: { color: '#ddd' } },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { fontSize: 10, color: '#888' },
        splitLine: { lineStyle: { type: 'dashed', color: '#eee' } },
      },
      series: [
        {
          name: '销量',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: { width: 2 },
          data: vals,
          areaStyle: { color: 'rgba(24,126,110,0.12)' },
          label: {
            show: true,
            position: 'top',
            distance: 4,
            fontSize: 10,
            color: '#333',
            formatter: '{c}',
          },
        },
      ],
    };
  },

  _initWeekdayCharts: function () {
    var that = this;
    var rows = this.data.foodRows || [];

    var need = false;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i]._hasInsightRow) {
        need = true;
        break;
      }
    }
    if (!need) {
      return;
    }

    var echartsMod = _getPageEcharts();
    if (!echartsMod || !echartsMod.init) {
      return;
    }

    setTimeout(function () {
      rows.forEach(function (food, idx) {
        if (!food._hasInsightRow) return;
        var domId = food._weekChartDomId;
        if (!domId) {
          return;
        }
        var comp = that.selectComponent('#' + domId);
        if (!comp) {
          return;
        }
        if (typeof comp.init !== 'function') {
          return;
        }
        try {
          comp.init(function (canvas, width, height, dpr) {
            var Chart = echartsMod.init(canvas, null, {
              width: width,
              height: height,
              devicePixelRatio: dpr || (wx.getSystemInfoSync().pixelRatio || 2),
            });
            Chart.setOption(
              that._getWeekLineOption(food._weekCategories, food._weekValues),
              true
            );
            if (!that._weekChartInstances) that._weekChartInstances = [];
            that._weekChartInstances.push(Chart);
            return Chart;
          });
        } catch (err) {
          console.warn('[depFoodList] week chart error', domId, err);
        }
      });
    }, 500);
  },

  _initSingleWeekChart: function (food) {
    var that = this;
    if (!food || !food._hasInsightRow) return;
    var domId = food._weekChartDomId;
    if (!domId) return;

    var echartsMod = _getPageEcharts();
    if (!echartsMod || !echartsMod.init) return;


    var comp = that.selectComponent('#' + domId);
    if (!comp || typeof comp.init !== 'function') {
      return;
    }

    try {
      comp.init(function (canvas, width, height, dpr) {
        var Chart = echartsMod.init(canvas, null, {
          width: width,
          height: height,
          devicePixelRatio: dpr || (wx.getSystemInfoSync().pixelRatio || 2),
        });
        Chart.setOption(
          that._getWeekLineOption(food._weekCategories, food._weekValues),
          true
        );
        if (!that._weekChartInstances) that._weekChartInstances = [];
        that._weekChartInstances.push(Chart);
        return Chart;
      });
    } catch (err) {
    }
  },

  /** 切换菜品详情展开/收起 */
  onToggleFoodDetail: function (e) {
    var idx = e.currentTarget.dataset.index;
    if (idx === undefined || idx === null) return;
    var key = 'foodRows[' + idx + ']._expanded';
    var current = this.data.foodRows[idx] && this.data.foodRows[idx]._expanded;
    var that = this;
    this.setData({
      [key]: !current
    }, function () {
      // 展开后延迟重新初始化图表
      if (!current) {
        var food = that.data.foodRows[idx];
        setTimeout(function () {
          that._initSingleWeekChart(food);
        }, 300);
      }
    });
  },

  onOpenIngredients: function (e) {
    var food = e.currentTarget.dataset.food;
    if (!food) return;
    var foodId = _resolveDistributerFoodId(food);
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
      var disInfo = d.disInfo || wx.getStorageSync('disInfo');
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
      'stopDate=' + encodeURIComponent(d.stopDate),
      'dateType=' + encodeURIComponent(d.dateType),
      'disId=' + encodeURIComponent(String(disId)),
      'depFatherId=' + encodeURIComponent(String(depFather)),
    ];
    if (food.gbDfFoodName) {
      q.push('foodName=' + encodeURIComponent(String(food.gbDfFoodName)));
    }
    if (d.hanzi) {
      q.push('hanzi=' + encodeURIComponent(String(d.hanzi)));
    }
    wx.navigateTo({
      url: '../dishIngredientDashboard/dishIngredientDashboard?' + q.join('&'),
    });
  },

  onCloseFoodSalesTemplateModal() {
    this.setData({ showFoodSalesTemplateModal: false });
  },




  toDatePage() {
    this.setData({
      update: true
    })
    wx.navigateTo({
      url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate +
        '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType,
    })
  },

  // 返回
  toBack() {
    wx.navigateBack({ delta: 1 })
  },



})