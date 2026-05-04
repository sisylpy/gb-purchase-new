

var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
import apiUrl from '../../../../config/index.js'
var dateUtils = require('../../../../lib/dateUtil.js');

import {
  depGetAllFood,
  cancleDownloadFood
} from '../../../services/apiDistributerFood'
var foodSalesExcelApi = require('../../../../lib/foodSalesExcelApi.js');
var foodSalesTemplateWx = require('../../../../lib/foodSalesTemplateWx.js');

/** 仅做 JSON 解析与空对象防护，其余字段与接口 `depGetAllFood` 根对象一致。 */
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
    var weekSeries = ins ? _buildWeekdaySeries(ins.weekdayQty || {}, weekdayLegend) : null;
    var weekDomId = 'wc_' + String(rowKey).replace(/\W/g, '_');
    return Object.assign({}, food, {
      _rowKey: rowKey,
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
     * depGetAllFood sortBy（四参齐全时后端排序）：sales | margin | profit
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

  },

  onUnload() {
    if (this._foodSearchDebounceTimer) {
      clearTimeout(this._foodSearchDebounceTimer);
      this._foodSearchDebounceTimer = null;
    }
    this._disposeWeekCharts();
  },

  onShow() {
    if (this.data.update) {
      this._syncDatesFromMyDateStorage();
      this.setData({ update: false });
      this._initData();
      return;
    }
    if (this.data.toAdd) {
      this._initData();
    }
  },

  onLoad(optons) {
    this._weekChartInstances = [];

    const today = dateUtils.getArriveDate(0);
    const firstDay = today.substring(0, 8) + '01';
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      todayDate: today,
      foodSalesTemplateStartDate: firstDay,
      foodSalesTemplateEndDate: today,
    })


    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      disId: optons.disId,
      url: apiUrl.server ,
      type: optons.type,
    })

    var value = wx.getStorageSync('disInfo');
    if (value) {
      this.setData({
        disInfo: value,
        depFatherId: value.mendianDepartmentList[0].gbDepartmentId
      })
    }
    this._syncDatesFromMyDateStorage();

    this._initData();

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

  _initData() {
      var data = {
        startDate: this.data.startDate,
        stopDate: this.data.stopDate,
        disId: this.data.disId,
        depFatherId: this.data.depFatherId,
        sortBy: this.data.foodSortBy || 'sales',
        sortOrder: this.data.foodSortOrder || 'desc',
      }
      load.showLoading("加载菜品经营数据");
    depGetAllFood(data)
      .then(res => {
        console.log("res",res);
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
        console.error('depGetAllFood', err);
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
    if (!need) return;

    var echartsMod = _getPageEcharts();
    if (!echartsMod || !echartsMod.init) {
      console.warn('[depFoodList] echarts not available');
      return;
    }

    setTimeout(function () {
      rows.forEach(function (food) {
        if (!food._hasInsightRow) return;
        var domId = food._weekChartDomId;
        if (!domId) return;
        var comp = that.selectComponent('#' + domId);
        if (!comp || typeof comp.init !== 'function') return;
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
          console.warn('[depFoodList] week chart', domId, err);
        }
      });
    }, 240);
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
      'endDate=' + encodeURIComponent(d.stopDate),
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

  _ensureDepartmentForExcel() {
    const disInfo = wx.getStorageSync('disInfo');
    const departmentId = disInfo ? this._resolveDepartmentId(disInfo) : this.data.departmentId;
    if (!departmentId) {
      wx.showToast({ title: '请先登录门店并选择部门', icon: 'none' });
      return '';
    }
    if (departmentId !== this.data.departmentId) {
      this.setData({ departmentId: departmentId, disInfo: disInfo || this.data.disInfo });
    }
    return departmentId;
  },

  _resolveDistributerId() {
    const disInfo = this.data.disInfo || wx.getStorageSync('disInfo');
    if (disInfo && disInfo.gbDistributerId) {
      return disInfo.gbDistributerId;
    }
    return this.data.disId || '';
  },

  /** 下载菜品销量 Excel 模板：选择日期范围 */
  onDownloadFoodSalesTemplate() {
    if (!this._ensureDepartmentForExcel()) return;
    const today = dateUtils.getArriveDate(0);
    const patch = { showFoodSalesTemplateModal: true, todayDate: today };
    if (this.data.foodSalesTemplateStartDate > today) {
      patch.foodSalesTemplateStartDate = today;
    }
    if (this.data.foodSalesTemplateEndDate > today) {
      patch.foodSalesTemplateEndDate = today;
    }
    this.setData(patch);
  },

  _resolveDepartmentId(disInfo) {
    if (!disInfo) return '';
    if (disInfo.mendianDepartmentList && disInfo.mendianDepartmentList.length) {
      return disInfo.mendianDepartmentList[0].gbDepartmentId;
    }
   
    return '';
  },

  onCloseFoodSalesTemplateModal() {
    this.setData({ showFoodSalesTemplateModal: false });
  },

  onFoodSalesTemplateStartChange(e) {
    const value = e.detail.value;
    const today = dateUtils.getArriveDate(0);
    let v = value > today ? today : value;
    const { foodSalesTemplateEndDate: end0 } = this.data;
    const patch = { foodSalesTemplateStartDate: v };
    if (end0 && v > end0) {
      patch.foodSalesTemplateEndDate = v;
    }
    this.setData(patch);
  },

  onFoodSalesTemplateEndChange(e) {
    const value = e.detail.value;
    const today = dateUtils.getArriveDate(0);
    let v = value > today ? today : value;
    const { foodSalesTemplateStartDate: start0 } = this.data;
    if (start0 && v < start0) {
      v = start0;
    }
    this.setData({ foodSalesTemplateEndDate: v });
  },

  onConfirmDownloadFoodSales() {
    const startDate = this.data.foodSalesTemplateStartDate;
    const endDate = this.data.foodSalesTemplateEndDate;
    if (!startDate || !endDate) {
      wx.showToast({ title: '请选择日期范围', icon: 'none' });
      return;
    }
    if (startDate > endDate) {
      wx.showToast({ title: '开始日期不能晚于结束日期', icon: 'none' });
      return;
    }
    const today = dateUtils.getArriveDate(0);
    if (startDate > today || endDate > today) {
      wx.showToast({ title: '开始/结束日期不能晚于今天', icon: 'none' });
      return;
    }
    const departmentId = this._ensureDepartmentForExcel();
    if (!departmentId) return;
    this.onCloseFoodSalesTemplateModal();
    this._downloadFoodSalesTemplateFile(startDate, endDate, departmentId);
  },

  _downloadFoodSalesTemplateFile(startDate, endDate, departmentId) {
    foodSalesTemplateWx.downloadFoodSalesSmartTemplate(apiUrl.apiUrl, startDate, endDate, departmentId);
  },

  /** 聊天文件是否为 Excel（不依赖 extension 过滤，避免微信列表里「已打开却看不到」） */
  _isExcelChatFile(f) {
    if (!f) return false;
    var name = String(f.name || '').toLowerCase();
    var path = String(f.path || '').toLowerCase();
    return (
      name.endsWith('.xlsx') ||
      name.endsWith('.xls') ||
      path.endsWith('.xlsx') ||
      path.endsWith('.xls')
    );
  },

  /** 非 Excel 时给出可操作建议（常见误选：Mac Numbers 的 .numbers） */
  _promptNonExcelChatFile(f) {
    var name = String((f && f.name) || '').toLowerCase();
    if (name.endsWith('.numbers')) {
      wx.showModal({
        title: '当前是 Numbers 格式',
        content:
          '您选的是 Apple「Numbers」表格（.numbers），与 Excel（.xlsx/.xls）不同，无法直接导入。\n\n请用 Numbers 打开后：右上角「共享」→「Excel」→ 导出 .xlsx，再发到微信里上传。',
        showCancel: false,
        confirmText: '知道了',
      });
      return;
    }
    wx.showToast({
      title: '请选 .xlsx 或 .xls（Excel）',
      icon: 'none',
      duration: 2800,
    });
  },

  /** 上传菜品销量 Excel */
  onUploadFoodSalesExcel() {
    const departmentId = this._ensureDepartmentForExcel();
    if (!departmentId) return;
    const distributerId = this._resolveDistributerId();
    if (!distributerId) {
      wx.showToast({ title: '缺少批发商信息', icon: 'none' });
      return;
    }
    const that = this;
    // 不传 extension：微信会列出更多会话文件；传了 extension 时部分机型/来源下已打开的表仍不显示
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success(res) {
        var list = res.tempFiles || [];
        var f = list[0];
        if (!f || !f.path) {
          wx.showToast({ title: '未获取到文件', icon: 'none' });
          return;
        }
        var okExcel = that._isExcelChatFile(f);
        if (!okExcel) {
          that._promptNonExcelChatFile(f);
          return;
        }
        const tempFilePath = f.path;
        wx.showModal({
          title: '确认上传',
          content: '确定上传该 Excel 导入菜品销量数据？',
          success(modalRes) {
            if (modalRes.confirm) {
              that._uploadFoodSalesExcelFile(tempFilePath, departmentId, distributerId);
            }
          },
        });
      },
      fail(err) {
        var msg = err && err.errMsg ? String(err.errMsg) : '';
        if (msg.indexOf('cancel') >= 0 || msg.indexOf('取消') >= 0) {
          return;
        }
        wx.showToast({ title: '未选择文件', icon: 'none' });
      },
    });
  },

  _uploadFoodSalesExcelFile(filePath, departmentId, distributerId) {
    wx.showLoading({ title: '正在上传...', mask: true });
    foodSalesExcelApi
      .uploadFoodSalesExcel(filePath, departmentId, distributerId)
      .then((res) => {
        wx.hideLoading();
        const code = res.result && res.result.code;
        const msg = res.result && res.result.msg;
        if (code === 0 || code === '0') {
          wx.showToast({ title: '上传成功', icon: 'success' });
          this._initData();
        } else {
          wx.showToast({ title: msg || '上传失败', icon: 'none' });
        }
      })
      .catch((err) => {
        wx.hideLoading();
        console.error('upload food sales excel', err);
        wx.showToast({ title: '网络请求失败', icon: 'none' });
      });
  },

  cancleDownloadFood(e){
    var depFood = e.currentTarget.dataset.item;
    load.showLoading("取消菜品")
    cancleDownloadFood(depFood).then(res =>{
      load.hideLoading();
      if(res.result.code == 0){
        this._initData();
      }
    })

  },




  toDatePage() {
    console.log("dddfd")
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