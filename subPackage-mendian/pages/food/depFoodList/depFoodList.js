

var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
import apiUrl from '../../../../config/index.js'
var dateUtils = require('../../../../lib/dateUtil.js');

import {
 
  menuCategoryDishBusinessList,
} from '../../../../services/apiDistributerFood'



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

/** 成本差异数值判断样式（通过数字而非字符串） */
function _costGapClassNumber(v) {
  if (v > 0.5) return 'is-warn';
  if (v < -0.3) return 'is-good';
  return '';
}

Page({


  data: {
   
    showFoodSalesTemplateModal: false,
    todayDate: '',
    startDate: '',
    stopDate: '',
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


  onShow() {
  
    if (this.data.update) {
      this._syncDatesFromMyDateStorage();
      this.setData({ update: false });
      this._initData();
      return;
    }
   
  },

  onLoad(optons) {

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
      startDate: firstDay,
      stopDate: today,
    });

    if (categoryId != null && categoryId !== '') {
      var cname = opts.categoryName ? decodeURIComponent(opts.categoryName) : (opts.fatherName ? decodeURIComponent(opts.fatherName) : '菜品');
      var did = opts.distributerId || opts.disId;
      if (did == null || did === '') {
        var u = wx.getStorageSync('userInfo');
        did = u && u.gbDuDistributerId;
      }
      var smode = opts.scopeMode || 'GROUP';
      var depId = opts.departmentId || null;
      this.setData({
        windowHeight: globalData.windowHeight * globalData.rpxR,
        navBarHeight: globalData.navBarHeight * globalData.rpxR,
        foodManageMode: true,
        categoryId: String(categoryId),
        categoryName: cname,
        distributerId: did,
        scopeMode: smode,
        departmentId: depId,
        type: opts.type,
        // 兼容旧字段
        manageFoodFatherId: String(categoryId),
        manageFatherName: cname,
        disId: did,
      });
      this._syncDatesFromMyDateStorage();
      this._fetchDishes();
      return;
    }

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
      var patch = this._patchSubDepFromMendian(value);
      this.setData(
        Object.assign(
          {
            mendianInfo: value,
            depFatherId: value.gbDepartmentId,
          },
          patch
        )
      );
    }
    
    this._syncDatesFromMyDateStorage();


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

  /** 获取 depFatherId（逐级兜底：data → mendianInfo → purDepInfo → userInfo） */
  _getDepFatherId: function () {
    var d = this.data;
    if (d.depFatherId) return d.depFatherId;

    var mendianInfo = wx.getStorageSync('mendianInfo');
    if (mendianInfo && mendianInfo.gbDepartmentId) {
      this.setData({ depFatherId: mendianInfo.gbDepartmentId });
      return mendianInfo.gbDepartmentId;
    }

    var purDepInfo = wx.getStorageSync('purDepInfo');
    if (purDepInfo && purDepInfo.gbDepartmentId) {
      this.setData({ depFatherId: purDepInfo.gbDepartmentId });
      return purDepInfo.gbDepartmentId;
    }

    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      var fallback = userInfo.gbDuDepartmentId || userInfo.gbDepartmentId;
      if (fallback && fallback !== d.depFatherId) {
        this.setData({ depFatherId: String(fallback) });
        return String(fallback);
      }
    }

    return '';
  },

  /** 跳转到菜品日销量页面 */
  onDishEdit(e) {
    var dish = e.currentTarget.dataset.dish;
    if (!dish) return;

    var d = this.data;
    var depFatherId = this._getDepFatherId();
    var q = [
      'dishId=' + encodeURIComponent(String(dish.foodId || dish.dishId)),
      'dishName=' + encodeURIComponent(String(dish.foodName || dish.dishName || '')),
      'dishImage=' + encodeURIComponent(String(dish.foodImage || dish.imageUrl || dish.dishImage || '')),
      'disId=' + encodeURIComponent(String(d.disId || '')),
      'depFatherId=' + encodeURIComponent(String(depFatherId)),
      'subDepId=' + encodeURIComponent(String(d.subDepId || d.activeSubDepId || '')),
      'dishPrice=' + encodeURIComponent(String(dish.salePrice || dish.currentPrice || '')),
    ];

    wx.navigateTo({
      url: '../dishDailySales/dishDailySales?' + q.join('&'),
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

  /** 跳转到菜品配料消耗排查页面 */
  onDishCostAudit(e) {
    
    var dish = e.currentTarget.dataset.dish;
    if (!dish) return;
   
    var d = this.data;
    var depFatherId = this._getDepFatherId();
    var q = [
      'foodId=' + encodeURIComponent(String(dish.foodId || dish.dishId)),
      'foodName=' + encodeURIComponent(String(dish.foodName || dish.dishName || '')),
      'foodImage=' + encodeURIComponent(String(dish.foodImage || dish.imageUrl || dish.dishImage || '')),
      'disId=' + encodeURIComponent(String(d.disId || '')),
      'depFatherId=' + encodeURIComponent(String(depFatherId)),
      'startDate=' + encodeURIComponent(String(d.startDate || '')),
      'stopDate=' + encodeURIComponent(String(d.stopDate || '')),
    ];
    wx.navigateTo({
      url: '../../management/dishIngredientDashboard/dishIngredientDashboard?' + q.join('&'),
    });
  },

  toBackManage() {
    wx.navigateBack({ delta: 1 });
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




})
