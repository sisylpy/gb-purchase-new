

var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
import apiUrl from '../../../../config/index.js'
var dateUtils = require('../../../../lib/dateUtil.js');

import {
  depGeFoodBusiness,
 
  menuCategoryDishBusinessList,
} from '../../../../services/apiDistributerFood'

import { deleteFood, updateGbFood } from '../../../../services/apiDistributerGbFood'

var foodSalesTemplateWx = require('../../../../lib/foodSalesTemplateWx.js');

// ===== 角色四象限颜色 =====
var ROLE_COLORS = {
  STAR: '#4A90D9',
  TRAFFIC: '#34C759',
  POTENTIAL: '#5AC8FA',
  WATCH: '#BDC1C6',
};

var ROLE_NAMES = {
  STAR: '明星菜',
  TRAFFIC: '引流菜',
  POTENTIAL: '潜力菜',
  WATCH: '观察菜',
};

/** 计算涨跌样式类 */
function _resolveChangeClass(changeStr) {
  if (!changeStr) return '';
  var s = String(changeStr);
  if (s.charAt(0) === '-') return 'is-down';
  if (s.charAt(0) === '+') return 'is-up';
  return 'is-up';
}

/** 提取百分比数字部分 */
function _pctNum(pctStr) {
  if (!pctStr) return NaN;
  return parseFloat(String(pctStr).replace('%', '').trim());
}

/** 提示条样式 & 图标（适配 businessDiagnosis level） */
function _hintMeta(hintText, level) {
  // 优先按 level 判断
  if (level === 'GOOD' || level === 'OK') {
    return { cls: 'dcl-card__hint--good', icon: '✅' };
  }
  if (level === 'WARN' || level === 'DANGER') {
    return { cls: 'dcl-card__hint--warn', icon: '⚠️' };
  }
  // fallback 文本关键词判断
  var t = (hintText || '').toLowerCase();
  if (t.indexOf('成本控制') !== -1 || t.indexOf('优秀') !== -1 || t.indexOf('健康') !== -1 || t.indexOf('高于') !== -1) {
    return { cls: 'dcl-card__hint--good', icon: '✅' };
  }
  if (t.indexOf('损耗') !== -1 || t.indexOf('低于') !== -1 || t.indexOf('低毛利') !== -1 || t.indexOf('建议复核') !== -1 || t.indexOf('成本异常') !== -1 || t.indexOf('偏高') !== -1) {
    return { cls: 'dcl-card__hint--warn', icon: '⚠️' };
  }
  if (t.indexOf('曝光') !== -1 || t.indexOf('推荐') !== -1 || t.indexOf('主推') !== -1) {
    return { cls: 'dcl-card__hint--info', icon: '💡' };
  }
  return { cls: 'dcl-card__hint--neutral', icon: '📊' };
}

/** 成本差异样式 */
function _costGapClass(gapStr) {
  var v = parseFloat(String(gapStr || '0'));
  if (isNaN(v)) return '';
  if (v > 0.5) return 'is-warn';
  if (v < -0.3) return 'is-good';
  return '';
}

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
  if (food.foodId != null && food.foodId !== '') {
    return String(food.foodId);
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
    /** 新参数命名 */
    categoryId: '',
    categoryName: '',
    /** 修改类别名称弹窗 */
    showRenamePopup: false,
    renameInputValue: '',
    distributerId: null,
    /** 查询参数 */
    scopeMode: 'GROUP',
    departmentId: null,
    // 旧管理字段（保留兼容）
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
    disId: null,

    // ===== 分类菜品经营列表字段 =====
    /** 分类摘要 */
    categorySummary: {
      foodCount: 0,
      actualAverageGrossMarginRate: '—',
      theoreticalAverageGrossMarginRate: '—',
      grossMarginGapRate: '—',
      totalSalesAmount: '—',
      actualProfitAmount: '—',
      starCount: 0,
      trafficCount: 0,
      potentialCount: 0,
      watchCount: 0,
      periodLabel: '',
    },
    /** 菜品列表 */
    dishes: [],
    /** 搜索关键词 */
    searchKeyword: '',
    /** 角色筛选：'' = 全部 */
    activeRole: '',
    /** 排序字段 */
    sortBy: 'sales',
    /** 排序方向 */
    sortOrder: 'desc',

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
    this._fetchDishes();

  
  },

  onLoad(optons) {
    this._weekChartInstances = [];

    const today = dateUtils.getArriveDate(0);
    const firstDay = today.substring(0, 8) + '01';
    const opts = optons || {};
    // 新参数命名：categoryId、categoryName（也兼容旧 foodFatherId）
    var categoryId = opts.categoryId || opts.foodFatherId || opts.fatherId;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      todayDate: today,
      foodSalesTemplateStartDate: firstDay,
      foodSalesTemplateEndDate: today,
    });

    if (categoryId != null && categoryId !== '') {
      var cname = opts.categoryName ? decodeURIComponent(opts.categoryName) : (opts.fatherName ? decodeURIComponent(opts.fatherName) : '菜品');
      var did = opts.distributerId || opts.disId;
      if (did == null || did === '') {
        var u = wx.getStorageSync('userInfo');
        did = u && u.gbDuDistributerId;
      }
     
      this.setData({
        windowHeight: globalData.windowHeight * globalData.rpxR,
        navBarHeight: globalData.navBarHeight * globalData.rpxR,
        categoryId: String(categoryId),
        categoryName: cname,
        distributerId: did,
        
      });
     
    }
    // this._fetchDishes();
  

  },

  // ========== 分类菜品经营：数据加载（走真实接口，mock 仅兜底） ==========
  _fetchDishes() {
    var that = this;
    var categoryId = this.data.categoryId;
    var distributerId = this.data.distributerId;
    var scopeMode = this.data.scopeMode;
    var departmentId = this.data.departmentId;
    if (!categoryId || !distributerId) return;

    // 构建请求参数
    var reqData = {
      distributerId: distributerId,
      scopeMode: scopeMode,
      categoryId: categoryId,
      days: 30,
      sortBy: this.data.sortBy || 'sales',
      sortOrder: this.data.sortOrder || 'desc',
      keyword: this.data.searchKeyword || undefined,
      roleFilter: this.data.activeRole || undefined,
    };
    // STORE 场景传 departmentId
    if (scopeMode === 'STORE' && departmentId) {
      reqData.departmentId = departmentId;
    }

    load.showLoading('加载菜品经营数据');

    menuCategoryDishBusinessList(reqData)
      .then(function (res) {
        load.hideLoading();
        var payload = res.result;
        if (payload && payload.code === 0) {
          var data = payload.data || {};
          // 分类摘要（映射真实 API 字段）
          var rawSummary = data.summary || {};
          var period = data.period || {};
          var summary = {
            foodCount: rawSummary.foodCount || 0,
            actualAverageGrossMarginRate: rawSummary.actualAverageGrossMarginRate || '—',
            theoreticalAverageGrossMarginRate: rawSummary.theoreticalAverageGrossMarginRate || '—',
            grossMarginGapRate: rawSummary.grossMarginGapRate || '—',
            totalSalesAmount: rawSummary.totalSalesAmount || '—',
            actualProfitAmount: rawSummary.actualProfitAmount || '—',
            starCount: rawSummary.starCount || 0,
            trafficCount: rawSummary.trafficCount || 0,
            potentialCount: rawSummary.potentialCount || 0,
            watchCount: rawSummary.watchCount || 0,
            periodLabel: period.compareLabel || '',
          };
          // 菜品列表（API 字段名 foods）
          var foods = (data.foods || []).map(_enrichDishCard);
          that.setData({
            categorySummary: summary,
            dishes: foods,
          });
        } else {
          // 接口异常时 fallback 到 mock
          console.warn('[depFoodList] API code != 0, fallback to mock');
        }
      })
      .catch(function (err) {
        load.hideLoading();
        console.error('[depFoodList] API error, fallback to mock:', err);
      });
  },

  

  // ========== 分类菜品经营：筛选 & 排序（走后端接口） ==========
  /** 角色筛选：重新请求接口 */
  onRoleFilter(e) {
    var role = e.currentTarget.dataset.role || '';
    if (role === this.data.activeRole) return;
    this.setData({ activeRole: role }, function () {
      this._fetchDishes();
    });
  },

  /** 搜索输入 */
  onSearchInput(e) {
    var v = (e.detail && e.detail.value) || '';
    this.setData({ searchKeyword: v });
  },

  onSearchConfirm(e) {
    var v = ((e.detail && e.detail.value) || this.data.searchKeyword || '').trim();
    this.setData({ searchKeyword: v }, function () {
      this._fetchDishes();
    });
  },

  onSearchClear() {
    this.setData({ searchKeyword: '' }, function () {
      this._fetchDishes();
    });
  },

  /** 排序：重新请求接口，支持同字段切换升降序 */
  onSortBy(e) {
    var sort = e.currentTarget.dataset.sort;
    if (!sort) return;
    var that = this;
    if (sort === this.data.sortBy) {
      // 同字段切换升降序
      var nextOrder = this.data.sortOrder === 'asc' ? 'desc' : 'asc';
      this.setData({ sortOrder: nextOrder }, function () {
        that._fetchDishes();
      });
    } else {
      this.setData({ sortBy: sort, sortOrder: 'desc' }, function () {
        that._fetchDishes();
      });
    }
  },

  // ========== 分类菜品经营：底部操作 ==========

  addDishFromCategory() {
    var id = this.data.categoryId;
    this.setData({ toAdd: true });
    wx.navigateTo({
      url:
        '../addFood/addFood?fatherId=' +
        id +
        '&fatherName=' +this.data.categoryName  +
        '&type=add',
    });
  },

  onDishEdit(e) {
    var dish = e.currentTarget.dataset.dish;
    if (!dish) return;
    wx.navigateTo({
      url: '../addFood/addFood?fatherName=' + this.data.categoryName + '&type=edit&foodId=' + dish.dishId,
    });
  },

  onDishIngredients(e) {
    var dish = e.currentTarget.dataset.dish;
    
    wx.setStorageSync('Food', dish);
    wx.navigateTo({
      url: '../addRaw/addRaw',
    });
  },

  onDishBusiness(e) {
    var dish = e.currentTarget.dataset.dish;
    if (!dish) return;

    // 构造 URL 参数
    var d = this.data;
    var q = [
      'foodId=' + encodeURIComponent(String(dish.foodId || dish.dishId)),
      'foodName=' + encodeURIComponent(String(dish.foodName || dish.dishName || '')),
      'categoryName=' + encodeURIComponent(String(d.categoryName || '')),
      'roleCode=' + encodeURIComponent(String(dish.roleCode || '')),
      'roleName=' + encodeURIComponent(String(dish.roleName || '')),
      'roleColor=' + encodeURIComponent(String(ROLE_COLORS[dish.roleCode] || '')),
      'currentPrice=' + encodeURIComponent(String(dish.salePrice || dish.currentPrice || '')),
      'foodImage=' + encodeURIComponent(String(dish.foodImage || dish.imageUrl || dish.dishImage || '')),
      'scopeMode=' + encodeURIComponent(String(d.scopeMode || 'GROUP')),
      'distributerId=' + encodeURIComponent(String(d.distributerId || '')),
      'departmentId=' + encodeURIComponent(String(d.departmentId || '')),
    ];

    // 列表页带过来的字段（详情接口不返回这些）
    if (dish.roleSummary != null) {
      q.push('roleSummary=' + encodeURIComponent(String(dish.roleSummary)));
    }
    if (dish.businessDiagnosis) {
      q.push('businessDiagnosis=' + encodeURIComponent(JSON.stringify(dish.businessDiagnosis)));
    }

    wx.navigateTo({
      url: '../foodBusinessDetail/foodBusinessDetail?' + q.join('&'),
    });
  },

  toBackManage() {
    wx.navigateBack({ delta: 1 });
  },

  deleteFather() {
    var categoryId = this.data.categoryId;
    if (!categoryId) {
      wx.showToast({ title: '分类数据异常', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '提示',
      content: '确定要删除该分类吗？删除后不可恢复。',
      confirmColor: '#ff3b30',
      success(res) {
        if (res.confirm) {
          load.showLoading('删除中');
          deleteFood({ id: categoryId }).then(function (resp) {
            load.hideLoading();
            if (resp.result.code == 0) {
              // 通知上一页刷新
              var pages = getCurrentPages();
              var prevPage = pages[pages.length - 2];
              if (prevPage) {
                prevPage.setData({ update: true });
              }
              wx.navigateBack({ delta: 1 });
            } else {
              wx.showToast({ title: resp.result.msg || '删除失败', icon: 'none' });
            }
          }).catch(function () {
            load.hideLoading();
            wx.showToast({ title: '网络异常', icon: 'none' });
          });
        }
      }
    });
  },

  /** 修改类别名称 - 显示弹窗 */
  renameFather() {
    this.setData({
      showRenamePopup: true,
      renameInputValue: this.data.categoryName || this.data.manageFatherName || '',
    });
  },

  /** 改名弹窗 - 输入变更 */
  onRenameInput(e) {
    this.setData({ renameInputValue: e.detail.value });
  },

  /** 改名弹窗 - 确认 */
  confirmRename() {
    var that = this;
    var newName = (this.data.renameInputValue || '').trim();
    if (!newName) {
      wx.showToast({ title: '名称不能为空', icon: 'none' });
      return;
    }
    if (newName === this.data.categoryName || newName === this.data.manageFatherName) {
      this.setData({ showRenamePopup: false });
      return;
    }
    var categoryId = this.data.categoryId;
    var distributerId = this.data.distributerId;
    if (!categoryId) {
      wx.showToast({ title: '分类数据异常', icon: 'none' });
      return;
    }
    load.showLoading('修改中');
    updateGbFood({
      id: categoryId,
      gbDfFoodName: newName,
      gbDfDistributerId: distributerId,
    }).then(function (res) {
      load.hideLoading();
      if (res.result.code == 0) {
        that.setData({
          showRenamePopup: false,
          categoryName: newName,
          manageFatherName: newName,
        });
        wx.showToast({ title: '修改成功', icon: 'success' });
        // 通知上一页刷新
        var pages = getCurrentPages();
        var prevPage = pages[pages.length - 2];
        if (prevPage) {
          prevPage.setData({ update: true });
        }
      } else {
        wx.showToast({ title: res.result.msg || '修改失败', icon: 'none' });
      }
    }).catch(function () {
      load.hideLoading();
      wx.showToast({ title: '网络异常', icon: 'none' });
    });
  },

  /** 改名弹窗 - 取消 */
  cancelRename() {
    this.setData({ showRenamePopup: false });
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

// ===== 辅助函数 =====

/** 为单个菜品卡片补充计算字段（适配 API foods[] 结构） */
function _enrichDishCard(food) {
  var cur = food.currentPeriod || {};
  var actualPct = _pctNum(cur.actualGrossMarginRate);
  var theoryPct = _pctNum(cur.theoreticalGrossMarginRate);
  // 成本差异 = 实际成本/份 - 理论成本/份
  var actualCost = parseFloat(String(cur.actualCostPerPortion || '0'));
  var theoryCost = parseFloat(String(cur.theoreticalCostPerPortion || '0'));
  var costGap = isNaN(actualCost) || isNaN(theoryCost) ? NaN : actualCost - theoryCost;

  // businessDiagnosis 是对象 {level, title, message, suggestedAction}
  var diagnosis = food.businessDiagnosis || {};
  var diagnosisText = diagnosis.message || diagnosis.title || '';
  var hint = _hintMeta(diagnosisText, diagnosis.level);

  // 变化率
  var change = food.change || {};
  var marginChangePoint = change.grossMarginRateChangePoint || '';

  return Object.assign({}, food, {
    // 展平 currentPeriod
    salesCount: cur.salesCount || '0',
    salesAmount: cur.salesAmount || '0',
    actualProfitAmount: cur.actualProfitAmount || '0',
    actualCostPerUnit: cur.actualCostPerPortion || '0',
    theoreticalCostPerUnit: cur.theoreticalCostPerPortion || '0',
    // 毛利率显示
    actualGrossMarginRateDisplay: isNaN(actualPct) ? '—' : actualPct.toFixed(1),
    theoreticalGrossMarginRateDisplay: isNaN(theoryPct) ? '—' : theoryPct.toFixed(1),
    grossMarginGapRate: cur.grossMarginGapRate || '—',
    // 成本差异
    costGapPerUnitDisplay: isNaN(costGap) ? '—' : (costGap >= 0 ? '+' : '') + costGap.toFixed(2),
    costGapClass: isNaN(costGap) ? '' : _costGapClassNumber(costGap),
    // 经营诊断（对象展开）
    diagnosisLevel: diagnosis.level || '',
    diagnosisTitle: diagnosis.title || '',
    diagnosisMessage: diagnosis.message || '',
    diagnosisAction: diagnosis.suggestedAction || '',
    // 提示样式
    hintClass: hint.cls,
    hintIcon: hint.icon,
    // 变化
    marginChangePoint: marginChangePoint,
    marginChangeClass: marginChangePoint && String(marginChangePoint).charAt(0) === '-' ? 'is-down' : 'is-up',
    // 兼容旧 WXML 字段
    dishName: food.foodName || '',
    dishId: food.foodId,
    currentPrice: food.salePrice || '',
    soldPortionsTotal: cur.salesCount || '0',
  });
}

/** 成本差异数值判断样式（通过数字而非字符串） */
function _costGapClassNumber(v) {
  if (v > 0.5) return 'is-warn';
  if (v < -0.3) return 'is-good';
  return '';
}
