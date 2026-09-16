const globalData = getApp().globalData;

var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil.js');
var apiUrl = require('../../../../config/index');
var api = require('../../../services/api.js');
var foodSalesTemplateWx = require('../../../../lib/foodSalesTemplateWx.js');
var foodSalesDepUtil = require('../../../utils/foodSalesDepUtil');
var storeRootDepartmentId = require('../../../../lib/storeRootDepartment').storeRootDepartmentId;

var buildGroupedRows = foodSalesDepUtil.buildGroupedRows;

Page({
  data: {
    windowWidth: 0,
    windowHeight: 0,
    navBarHeight: 0,
    disId: '',
    disInfo: null,
    depFatherId: '',
    mendianInfo: null,
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
      var patch = {
        disInfo: disInfo,
        depFatherId: mendianStored ? storeRootDepartmentId(mendianStored) || '' : '',
      };
      if (mendianStored && mendianStored.gbDepartmentId) {
        patch.mendianInfo = mendianStored;
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

  /** 销量唯一归属门店。 */
  _fatherDepForCurrentSelection: function () {
    return this._resolveFatherDepartmentId();
  },

  _loadFoodCatalog: function () {
    var self = this;
    if (!self.data.disId) {
      wx.showToast({ title: '未获取批发商信息', icon: 'none' });
      return;
    }
    var depFatherId = self._fatherDepForCurrentSelection();
    if (!depFatherId) {
      wx.showToast({ title: '未获取门店部门信息', icon: 'none' });
      return;
    }
    self.setData({ foodsLoading: true });
    load.showLoading('加载菜品');
    api.depGetDepFoodList(depFatherId)
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
    return storeRootDepartmentId(mi);
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
    if (
      !depFatherId ||
      !distributerId
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

    // 销量事实统一归属 depFatherId，服务端按 foodId 定位门店菜品配置。
    var body = {
      recordDate: this.data.singleDate,
      depFatherId: Number(depFatherId),
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
