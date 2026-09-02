const globalData = getApp().globalData;

var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil.js');
var apiUrl = require('../../../../config/index');
var api = require('../../../services/api.js');
var foodSalesTemplateWx = require('../../../../lib/foodSalesTemplateWx.js');
var foodSalesDepUtil = require('../../../utils/foodSalesDepUtil');

var depFatherAndSubDepForChoice = foodSalesDepUtil.depFatherAndSubDepForChoice;
var depFatherAndSubDepFromMendianInfo = foodSalesDepUtil.depFatherAndSubDepFromMendianInfo;
var indexOfMendianDefaultSalesDep = foodSalesDepUtil.indexOfMendianDefaultSalesDep;
var buildGroupedRows = foodSalesDepUtil.buildGroupedRows;
var buildDepartmentChoiceListForCurrentMendian = foodSalesDepUtil.buildDepartmentChoiceListForCurrentMendian;

Page({
  data: {
    windowWidth: 0,
    windowHeight: 0,
    navBarHeight: 0,
    disId: '',
    disInfo: null,
    depFatherId: '',
    mendianInfo: null,
    /** true：菜品目录请求子部门取自 mendianInfo（与订货端一致）；用户改部门后为 false */
    catalogBoundToMendian: false,
    departmentChoiceList: [],
    salesDepIndex: 0,
    hasDepartmentChoices: false,
    foodGroups: [],
    expandedGroupId: '',
    foodsLoading: false,

    singleDate: '',
    todayDate: '',

    dineInOrderCount: '',
    dineInCustomerCount: '',
    takeoutRevenue: '',
    takeoutOrderCount: '',
    platformFee: '',
    notes: '',

    showCombinedTemplateModal: false,
    combinedTemplateStartDate: '',
    combinedTemplateEndDate: '',

    foodCatalogReady: false,

    dineInFromDishes: '0.00',

    /** 仅编辑模式：get 接口 data.dailyRevenue 归一化后用于只读展示 */
    dailyRevenueView: null,
    /** get 返回的 lineCount，有则展示 */
    fetchLineCount: null,

    /** 从每日营业额列表点某一天进入时为 true：拉取已有数据回填，保存走 update */
    isEditMode: false,
    pageTitle: '添加菜品销量',
  },

  onLoad: function (options) {
    var today = dateUtils.getArriveDate(0);
    var firstDay = today.substring(0, 8) + '01';
    var anchorParam =
      options.anchorDate != null && options.anchorDate !== ''
        ? String(options.anchorDate).trim().substring(0, 10)
        : '';
    var anchorOk = /^\d{4}-\d{2}-\d{2}$/.test(anchorParam);
    if (anchorOk && anchorParam > today) {
      anchorParam = today;
    }
    var useAnchor = anchorOk;
    var templateStart = useAnchor ? anchorParam : firstDay;
    if (templateStart > today) {
      templateStart = today;
    }
    var templateEnd = today;
    if (useAnchor && templateStart > templateEnd) {
      templateEnd = templateStart;
    }
    var initialSingle = useAnchor ? anchorParam : today;
    if (initialSingle > today) {
      initialSingle = today;
    }
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      todayDate: today,
      singleDate: initialSingle,
      combinedTemplateStartDate: templateStart,
      combinedTemplateEndDate: templateEnd,
      isEditMode: false,
      pageTitle: '添加菜品销量',
    });

    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.gbDuDistributerId) {
      this.setData({ disId: userInfo.gbDuDistributerId });
    }

    var disInfo = wx.getStorageSync('disInfo');
    if (disInfo) {
      var mendianStored = wx.getStorageSync('mendianInfo');
      var choices = buildDepartmentChoiceListForCurrentMendian(
        disInfo,
        mendianStored
      );
      var patch = {
        disInfo: disInfo,
        depFatherId:
          mendianStored && mendianStored.gbDepartmentId
            ? mendianStored.gbDepartmentId
            : '',
        departmentChoiceList: choices,
        hasDepartmentChoices: choices.length > 1,
        salesDepIndex: 0,
        catalogBoundToMendian: false,
      };
      if (mendianStored && mendianStored.gbDepartmentId) {
        patch.mendianInfo = mendianStored;
        patch.salesDepIndex = indexOfMendianDefaultSalesDep(
          choices,
          mendianStored
        );
        patch.catalogBoundToMendian = true;
      }
      this.setData(patch);
    }
  },

  onShow: function () {
    if (!this.data.disId || this.data.foodCatalogReady) {
      return;
    }
    this._loadFoodCatalog();
  },

  _getSelectedDepChoice: function () {
    var list = this.data.departmentChoiceList || [];
    var idx = this.data.salesDepIndex || 0;
    return list[idx] || list[0] || null;
  },

  /** depGetDepFoodList：绑定当前门店时用 mendianInfo 的子部门（与 chefOrder 一致），用户改 picker 后用选项 */
  _getDepFoodCatalogParams: function () {
    var mi = this.data.mendianInfo || wx.getStorageSync('mendianInfo');
    if (this.data.catalogBoundToMendian && mi) {
      var fromMi = depFatherAndSubDepFromMendianInfo(mi);
      if (fromMi) {
        return fromMi;
      }
    }
    return depFatherAndSubDepForChoice(this._getSelectedDepChoice());
  },

  /**
   * lines[].depId：子部门 id（与 depGetDepFoodList 的 subDepid 一致）。
   * 仅有父级门店、无子部门行时退回父级 id。
   */
  _getSalesDepId: function () {
    var mi = this.data.mendianInfo || wx.getStorageSync('mendianInfo');
    var ch = this._getSelectedDepChoice();

    function firstSubDepIdFromMi(m) {
      if (!m) {
        return null;
      }
      var p = depFatherAndSubDepFromMendianInfo(m);
      if (p && p.subDepid != null && p.subDepid !== '') {
        return p.subDepid;
      }
      return null;
    }

    if (ch && ch.gbDepartmentId != null && ch.gbDepartmentId !== '') {
      var cid = Number(ch.gbDepartmentId);
      var fidRaw = ch.gbDfDepFatherId;
      var fid =
        fidRaw != null && fidRaw !== '' ? Number(fidRaw) : NaN;
      if (!isNaN(cid) && !isNaN(fid) && cid !== fid) {
        return ch.gbDepartmentId;
      }
      var fromMiWhenParentRow = firstSubDepIdFromMi(mi);
      if (fromMiWhenParentRow != null) {
        return fromMiWhenParentRow;
      }
      return ch.gbDepartmentId;
    }

    var subFallback = firstSubDepIdFromMi(mi);
    if (subFallback != null) {
      return subFallback;
    }
    return this.data.depFatherId;
  },

  /** 与当前销售部门对应的父部门 id（submit 的 depFatherId、模板 download 的 departmentId） */
  _fatherDepForCurrentSelection: function () {
    var ch = this._getSelectedDepChoice();
    if (ch && ch.gbDfDepFatherId != null && ch.gbDfDepFatherId !== '') {
      return ch.gbDfDepFatherId;
    }
    return this._resolveFatherDepartmentId();
  },

  _loadFoodCatalog: function () {
    var self = this;
    if (!self.data.disId) {
      wx.showToast({ title: '未获取批发商信息', icon: 'none' });
      return;
    }
    var depParam = self._getDepFoodCatalogParams();
    if (!depParam) {
      wx.showToast({ title: '未获取门店部门信息', icon: 'none' });
      return;
    }
    self.setData({ foodsLoading: true });
    load.showLoading('加载菜品');
    api.depGetDepFoodList(depParam.depFatherId, depParam.subDepid)
      .then(function (res) {
        load.hideLoading();
        console.log("depGetDepFoodList", res.result.data);

        self.setData({ foodsLoading: false });
        if (res.result.code == 0) {
          var groups = buildGroupedRows(res.result.data);
          self.setData({ foodGroups: groups, foodCatalogReady: true });
          self._recalcDineInFromDishes();
        } else {
          wx.showToast({ title: res.result.msg || '加载失败', icon: 'none' });
        }
      })
      
  },

  onSalesDepChange: function (e) {
    var idx = parseInt(e.detail.value, 10) || 0;
    var self = this;
    self.setData(
      { salesDepIndex: idx, catalogBoundToMendian: false },
      function () {
        if (self.data.disId) {
          self._loadFoodCatalog();
        }
      }
    );
  },

  onDateChange: function (e) {
    var d = e.detail.value;
    this.setData({ singleDate: d });
  },

  onDineInOrderInput: function (e) {
    this.setData({ dineInOrderCount: e.detail.value });
  },

  onDineInCustomerInput: function (e) {
    this.setData({ dineInCustomerCount: e.detail.value });
  },

  onTakeoutInput: function (e) {
    this.setData({ takeoutRevenue: e.detail.value });
  },

  onTakeoutOrderInput: function (e) {
    this.setData({ takeoutOrderCount: e.detail.value });
  },

  onPlatformFeeInput: function (e) {
    this.setData({ platformFee: e.detail.value });
  },

  onNotesInput: function (e) {
    this.setData({ notes: e.detail.value });
  },

  onFoodQtyInput: function (e) {
    var gid = e.currentTarget.dataset.gid;
    var idx = e.currentTarget.dataset.index;
    var val = e.detail.value;
    var groups = this.data.foodGroups;
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].groupId === gid) {
        groups[i].children[idx].qtyStr = val;
        break;
      }
    }
    this.setData({ foodGroups: groups });
    this._recalcDineInFromDishes();
  },

  /** 点击父级分类：手风琴展开/收起 */
  onParentGroupTap: function (e) {
    var gid = e.currentTarget.dataset.gid;
    var currentExpanded = this.data.expandedGroupId;
    var nextExpanded = (currentExpanded === gid) ? '' : gid;
    var groups = this.data.foodGroups;
    for (var i = 0; i < groups.length; i++) {
      groups[i].expanded = (groups[i].groupId === nextExpanded);
    }
    this.setData({
      foodGroups: groups,
      expandedGroupId: nextExpanded,
    });
  },

  _recalcDineInFromDishes: function () {
    var groups = this.data.foodGroups || [];
    var sum = 0;
    for (var i = 0; i < groups.length; i++) {
      var children = groups[i].children || [];
      for (var j = 0; j < children.length; j++) {
        var r = children[j];
        var q = parseFloat(String(r.qtyStr || '').trim());
        if (isNaN(q) || q <= 0) continue;
        var p = parseFloat(String(r.unitPriceDisplay === '—' ? '0' : r.unitPriceDisplay).trim());
        if (isNaN(p)) p = 0;
        sum += q * p;
      }
    }
    this.setData({ dineInFromDishes: sum.toFixed(2) });
  },

  _resolveFatherDepartmentId: function () {
    var mi = this.data.mendianInfo || wx.getStorageSync('mendianInfo');
    if (mi && mi.gbDepartmentId != null && mi.gbDepartmentId !== '') {
      return mi.gbDepartmentId;
    }
    return '';
  },

  _ensureTemplateDepartmentId: function () {
    var id = this._fatherDepForCurrentSelection();
    if (!id) {
      wx.showToast({ title: '请先登录门店', icon: 'none' });
      return '';
    }
    return id;
  },

  _resolveDistributerId: function () {
    var disInfo = this.data.disInfo || wx.getStorageSync('disInfo');
    if (disInfo && disInfo.gbDistributerId != null) {
      return disInfo.gbDistributerId;
    }
    return '';
  },

  onDownloadCombinedTemplate: function () {
    if (!this._ensureTemplateDepartmentId()) return;
    var today = dateUtils.getArriveDate(0);
    var patch = { showCombinedTemplateModal: true, todayDate: today };
    if (this.data.combinedTemplateStartDate > today) {
      patch.combinedTemplateStartDate = today;
    }
    if (this.data.combinedTemplateEndDate > today) {
      patch.combinedTemplateEndDate = today;
    }
    this.setData(patch);
  },

  onCloseCombinedTemplateModal: function () {
    this.setData({ showCombinedTemplateModal: false });
  },

  onCombinedTemplateStartChange: function (e) {
    var value = e.detail.value;
    var today = dateUtils.getArriveDate(0);
    var v = value > today ? today : value;
    var end0 = this.data.combinedTemplateEndDate;
    var patch = { combinedTemplateStartDate: v };
    if (end0 && v > end0) {
      patch.combinedTemplateEndDate = v;
    }
    this.setData(patch);
  },

  onCombinedTemplateEndChange: function (e) {
    var value = e.detail.value;
    var today = dateUtils.getArriveDate(0);
    var v = value > today ? today : value;
    var start0 = this.data.combinedTemplateStartDate;
    if (start0 && v < start0) {
      v = start0;
    }
    this.setData({ combinedTemplateEndDate: v });
  },

  onConfirmDownloadCombined: function () {
    var startDate = this.data.combinedTemplateStartDate;
    var endDate = this.data.combinedTemplateEndDate;
    if (!startDate || !endDate) {
      wx.showToast({ title: '请选择日期范围', icon: 'none' });
      return;
    }
    if (startDate > endDate) {
      wx.showToast({ title: '开始日期不能晚于结束日期', icon: 'none' });
      return;
    }
    var today = dateUtils.getArriveDate(0);
    if (startDate > today || endDate > today) {
      wx.showToast({ title: '开始/结束日期不能晚于今天', icon: 'none' });
      return;
    }
    var departmentId = this._ensureTemplateDepartmentId();
    if (!departmentId) return;
    this.onCloseCombinedTemplateModal();
    foodSalesTemplateWx.downloadCombinedDailyTemplate(apiUrl.apiUrl, startDate, endDate, departmentId);
  },

  onUploadCombinedExcel: function () {
    this._openUnifiedImport('standard');
  },

  _openUnifiedImport: function (mode) {
    var route = 'subPackage-charts/pages/sales/dailyTurnover/dailyTurnover';
    var pages = getCurrentPages();
    var previous = pages.length > 1 ? pages[pages.length - 2] : null;
    if (previous && previous.route === route) {
      wx.setStorageSync('dailyTurnoverUnifiedImportRequest', {
        mode: mode,
        requestedAt: Date.now(),
      });
      wx.navigateBack();
      return;
    }
    wx.redirectTo({
      url: '/' + route + '?autoImport=' + encodeURIComponent(mode),
    });
  },

  onSave: function () {
    if (!this.data.singleDate) {
      wx.showToast({ title: '请选择日期', icon: 'none' });
      return;
    }
    var depFatherId = this._fatherDepForCurrentSelection();
    var distributerId = this._resolveDistributerId();
    var subDepId = this._getSalesDepId();
    var subNum = Number(subDepId);
    if (
      !depFatherId ||
      !distributerId ||
      subDepId === '' ||
      subDepId == null ||
      isNaN(subNum)
    ) {
      wx.showToast({ title: '门店或批发商信息不完整', icon: 'none' });
      return;
    }

    var lines = [];
    var groups = this.data.foodGroups || [];
    for (var gi = 0; gi < groups.length; gi++) {
      var children = groups[gi].children || [];
      for (var ci = 0; ci < children.length; ci++) {
        var r = children[ci];
        var q = parseFloat(String(r.qtyStr || '').trim());
        if (isNaN(q) || q <= 0) continue;
        lines.push({
          depId: subNum,
          foodId: Number(r.foodId),
          quantity: q,
        });
      }
    }

    var dineInOrders = parseInt(this.data.dineInOrderCount, 10) || 0;
    var dineInCustomers = parseInt(this.data.dineInCustomerCount, 10) || 0;
    var takeoutRevenue = parseFloat(this.data.takeoutRevenue) || 0;
    var takeoutOrders = parseInt(this.data.takeoutOrderCount, 10) || 0;
    var platformFee = parseFloat(this.data.platformFee) || 0;

    var hasMetrics =
      dineInOrders > 0 ||
      dineInCustomers > 0 ||
      takeoutRevenue > 0 ||
      takeoutOrders > 0 ||
      platformFee > 0;
    var notes = (this.data.notes || '').trim();

    if (!lines.length && !hasMetrics && !notes) {
      wx.showToast({ title: '请填写菜品销量或其它营业数据', icon: 'none' });
      return;
    }

    // depFatherId=父门店；subDepId=当前子部门（与 depGetDepFoodList 一致）；lines[].depId 可省略则用根 subDepId
    var body = {
      recordDate: this.data.singleDate,
      depFatherId: Number(depFatherId),
      subDepId: subNum,
      distributerId: Number(distributerId),
      lines: lines,
      dineInOrders: dineInOrders,
      dineInCustomers: dineInCustomers,
      takeoutRevenue: takeoutRevenue,
      takeoutOrders: takeoutOrders,
      platformFee: platformFee,
      notes: notes,
    };

    load.showLoading('保存中...');
    
    var savePromise = api.submitDailyFoodSalesAndRevenue(body);
    savePromise.then(function (res) {
        console.log("depGetDepFoodList", res.result.data);
        load.hideLoading();
        if (res.result.code == 0) {
          wx.showToast({ title: '保存成功', icon: 'success' });
          setTimeout(function () {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({ title: res.result.msg || '保存失败', icon: 'none' });
        }
      })
      .catch(function () {
        load.hideLoading();
        wx.showToast({ title: '网络请求失败', icon: 'none' });
      });
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  },
});
