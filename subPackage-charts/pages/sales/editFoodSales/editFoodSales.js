const globalData = getApp().globalData;

var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil.js');
var api = require('../../../services/api.js');
var foodSalesDisplayUtil = require('../../../utils/foodSalesDisplayUtil');
var storeRootDepartmentId = require('../../../../lib/storeRootDepartment').storeRootDepartmentId;

var SALES_TYPES = foodSalesDisplayUtil.SALES_TYPES;
var parseDateDisplay = foodSalesDisplayUtil.parseDateDisplay;

Page({
  data: {
    windowWidth: 0,
    windowHeight: 0,
    navBarHeight: 0,

    recordDate: '',
    todayDate: '',
    dateDisplay: '',
    weekDisplay: '',

    depFatherId: '',
    mendianInfo: null,
    disInfo: null,
    distributerId: '',

    foodCategories: [],

    revenueView: null,
    dailyRevenueRaw: null,
    isCompleted: false,

    loading: false,

    /* ===== 弹窗状态 ===== */
    showModal: false,
    modalDepId: '',
    modalFoodId: '',
    modalFoodName: '',
    modalQuantity: '',
    modalUnitPrice: '',
    modalNotes: '',
    modalIsEdit: false,
    modalSalesType: 1,       // 默认正常销售
    modalSalesTypeIndex: 0,  // picker 索引
    modalQuantityFocus: true,
    salesTypes: SALES_TYPES,

    /* ===== 营收弹窗 ===== */
    showRevenueModal: false,
    revDineInOrderCount: '',
    revDineInCustomerCount: '',
    revDineInRevenue: '',
    revTakeoutRevenue: '',
    revTakeoutOrderCount: '',
    revPlatformFee: '',
    revGrossRevenue: '',
    revNotes: '',
  },

  onLoad: function (options) {
    var today = dateUtils.getArriveDate(0);
    var anchorParam =
      options.anchorDate != null && options.anchorDate !== ''
        ? String(options.anchorDate).trim().substring(0, 10)
        : '';
    var anchorOk = /^\d{4}-\d{2}-\d{2}$/.test(anchorParam);
    if (anchorOk && anchorParam > today) {
      anchorParam = today;
    }
    var initialDate = anchorOk ? anchorParam : today;
    var dd = parseDateDisplay(initialDate);

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      todayDate: today,
      recordDate: initialDate,
      dateDisplay: dd.dateDisplay,
      weekDisplay: dd.weekDisplay,
    });

    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.gbDuDistributerId) {
      this.setData({ distributerId: userInfo.gbDuDistributerId });
    }

    var disInfo = wx.getStorageSync('disInfo');
    var mendianInfo = wx.getStorageSync('mendianInfo');
    var patch = { disInfo: disInfo, mendianInfo: mendianInfo };

    if (mendianInfo && mendianInfo.gbDepartmentId) {
      patch.depFatherId = storeRootDepartmentId(mendianInfo);
    }
    this.setData(patch);
  },

  onShow: function () {
    this._loadData();
  },

  _loadData: function () {
    var self = this;
    if (!self.data.depFatherId || !self.data.distributerId) {
      return;
    }
    self.setData({ loading: true });
    load.showLoading('加载中');
    api
      .getDailyFoodSalesAndRevenue({
        depFatherId: Number(self.data.depFatherId),
        distributerId: Number(self.data.distributerId),
        recordDate: self.data.recordDate,
      })
      .then(function (res) {
        console.log("er",res.result.data);
        load.hideLoading();
        self.setData({ loading: false });
        var code = res.result.code;
        if (code !== 0 && code !== '0') {
          wx.showToast({ title: res.result.msg || '加载失败', icon: 'none' });
          return;
        }
        var d = res.result.data || {};
        var foodCategories = Array.isArray(d.foodCategories) ? d.foodCategories : [];
        var dailyRevenue = d.dailyRevenue;

        // 完成状态：有 dailyRevenue 记录
        var isCompleted = !!(dailyRevenue && dailyRevenue.hasRecord);

        self.setData({
          foodCategories: foodCategories,
          revenueView: dailyRevenue || null,
          dailyRevenueRaw: dailyRevenue || null,
          isCompleted: isCompleted,
        });
      })
      .catch(function () {
        load.hideLoading();
        self.setData({ loading: false });
        wx.showToast({ title: '网络请求失败', icon: 'none' });
      });
  },

  onDateChange: function (e) {
    var d = e.detail.value;
    var dd = parseDateDisplay(d);
    this.setData({
      recordDate: d,
      dateDisplay: dd.dateDisplay,
      weekDisplay: dd.weekDisplay,
    });
    this._loadData();
  },

  /** 点击菜品编辑 → 打开弹窗 */
  onEditDish: function (e) {
    var dataset = e.currentTarget.dataset;
    var categoryIndex = parseInt(dataset.categoryIndex, 10);
    var dishId = dataset.dishId;

    // 从 foodCategories[categoryIndex].dishes 中查找对应菜品
    var foodCategories = this.data.foodCategories;
    var category = foodCategories[categoryIndex];
    if (!category) {
      wx.showToast({ title: '未找到分类信息', icon: 'none' });
      return;
    }

    var dishes = category.dishes || [];
    var targetDish = null;
    for (var j = 0; j < dishes.length; j++) {
      if (String(dishes[j].dishId) === String(dishId)) {
        targetDish = dishes[j];
        break;
      }
    }

    if (!targetDish) {
      wx.showToast({ title: '未找到菜品信息', icon: 'none' });
      return;
    }

    var hasSales = targetDish.hasSales === true;

    this.setData({
      showModal: true,
      modalFoodId: dishId,
      modalFoodName: targetDish.dishName || '',
      modalUnitPrice: targetDish.listPrice || '',
      modalQuantity: hasSales ? (targetDish.operatingSalesPortions || '') : '',
      modalNotes: '',
      modalIsEdit: hasSales,
      modalSalesType: 1,
      modalSalesTypeIndex: 0,
      modalQuantityFocus: true,
      // 存储各类型实际份数，切换类型时同步
      modalQtyByType: {
        '1': targetDish.operatingSalesPortions || '',
        '4': targetDish.complimentaryPortions || '',
        '5': targetDish.employeeMealPortions || '',
      },
    });
  },

  /** 打开营收编辑弹窗 */
  onEditAll: function () {
    var dr = this.data.dailyRevenueRaw || {};

    var dineIn = dr.dineInRevenueStored || dr.gbAiDailyRevenueDineInRevenue || '';
    var takeout = dr.takeoutRevenue || dr.gbAiDailyRevenueTakeoutRevenue || '';
    // 总营业额来自菜品销售数据（后端计算），不可编辑
    var gross = dr.grossRevenue || dr.gbAiDailyRevenueGrossRevenue || '';

    this.setData({
      showRevenueModal: true,
      revDineInOrderCount: dr.dineInOrders || dr.gbAiDailyRevenueDineInOrders || '',
      revDineInCustomerCount: dr.dineInCustomers || dr.gbAiDailyRevenueDineInCustomers || '',
      revDineInRevenue: dineIn,
      revTakeoutRevenue: takeout,
      revTakeoutOrderCount: dr.takeoutOrders || dr.gbAiDailyRevenueTakeoutOrders || '',
      revPlatformFee: dr.platformFee || dr.gbAiDailyRevenuePlatformFee || '',
      revGrossRevenue: gross,
      revNotes: dr.notes || dr.gbAiDailyRevenueNotes || '',
    });
  },

  /* ========== 弹窗事件 ========== */

  onCloseModal: function () {
    this.setData({ showModal: false });
  },

  onMaskTap: function () {
    this.setData({ showModal: false });
  },

  onModalQuantityInput: function (e) {
    this.setData({ modalQuantity: e.detail.value });
  },

  onModalUnitPriceInput: function (e) {
    this.setData({ modalUnitPrice: e.detail.value });
  },

  onModalNotesInput: function (e) {
    this.setData({ modalNotes: e.detail.value });
  },

  onSalesTypeChange: function (e) {
    var self = this;
    var idx = parseInt(e.detail.value, 10) || 0;
    var types = this.data.salesTypes || [];
    var item = types[idx];
    var typeValue = item ? item.value : 1;
    var qtyMap = this.data.modalQtyByType || {};
    var patch = {
      modalSalesTypeIndex: idx,
      modalSalesType: typeValue,
      modalQuantityFocus: false,
      // 切换类型后，同步该类型对应的实际份数
      modalQuantity: qtyMap[String(typeValue)] || '',
    };
    // 员工餐（type=5）单价默认为 0
    if (item && item.value === 5) {
      patch.modalUnitPrice = '0';
    }
    this.setData(patch);
    // 重新聚焦份数输入框
    setTimeout(function () {
      self.setData({ modalQuantityFocus: true });
    }, 100);
  },

  /** 弹窗确认提交 */
  onConfirmModal: function () {
    var self = this;
    var data = self.data;

    console.log('[onConfirmModal] modalQuantity raw:', data.modalQuantity, 'type:', typeof data.modalQuantity);
    console.log('[onConfirmModal] modalIsEdit:', data.modalIsEdit, 'modalSalesType:', data.modalSalesType);
    console.log('[onConfirmModal] modalFoodId:', data.modalFoodId, 'modalFoodName:', data.modalFoodName);
    console.log('[onConfirmModal] modalUnitPrice:', data.modalUnitPrice, 'modalNotes:', data.modalNotes);

    if (!data.modalFoodId) {
      wx.showToast({ title: '菜品信息异常', icon: 'none' }); return;
    }
    var qty = parseFloat(String(data.modalQuantity).trim());
    console.log('[onConfirmModal] qty after parse:', qty, 'isNaN:', isNaN(qty));
    if (isNaN(qty) || qty < 0) {
      wx.showToast({ title: '请输入有效份数', icon: 'none' }); return;
    }

    if (!data.depFatherId || !data.distributerId) {
      wx.showToast({ title: '门店信息不完整', icon: 'none' }); return;
    }

    var body = {
      recordDate: data.recordDate,
      depFatherId: Number(data.depFatherId),
      distributerId: Number(data.distributerId),
      foodId: Number(data.modalFoodId),
      quantity: qty,
      type: data.modalSalesType || 1,
      quantityMode: data.modalIsEdit ? 'SET' : 'ADD',
    };

    var price = parseFloat(String(data.modalUnitPrice).trim());
    if (!isNaN(price) && price >= 0) body.actualUnitPrice = price;

    var notes = String(data.modalNotes || '').trim();
    if (notes) body.notes = notes;

    console.log('[onConfirmModal] request body:', JSON.stringify(body));

    load.showLoading('保存中...');

    api.upsertDishSalesLine(body).then(function (res) {
      load.hideLoading();
      console.log('[onConfirmModal] upsertDishSalesLine response:', JSON.stringify(res.result));
      if (res.result.code === 0) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        self.setData({ showModal: false });
        setTimeout(function () { self._loadData(); }, 500);
      } else {
        wx.showToast({ title: res.result.msg || '保存失败', icon: 'none' });
      }
    }).catch(function (err) {
      load.hideLoading();
      console.log('[onConfirmModal] upsertDishSalesLine error:', err);
      wx.showToast({ title: '网络请求失败', icon: 'none' });
    });
  },

  /* ========== 营收弹窗事件 ========== */

  onCloseRevenueModal: function () {
    this.setData({ showRevenueModal: false });
  },

  onRevenueMaskTap: function () {
    this.setData({ showRevenueModal: false });
  },

  onRevDineInOrderInput: function (e) {
    this.setData({ revDineInOrderCount: e.detail.value });
  },

  onRevDineInCustomerInput: function (e) {
    this.setData({ revDineInCustomerCount: e.detail.value });
  },

  onRevDineInRevenueInput: function (e) {
    var val = e.detail.value;
    // 堂食 + 外卖 不能超过总营业额
    var takeout = parseFloat(String(this.data.revTakeoutRevenue || '').trim()) || 0;
    var total = parseFloat(String(this.data.revGrossRevenue || '').trim()) || 0;
    var dineIn = parseFloat(String(val || '').trim()) || 0;
    if (total > 0 && dineIn + takeout > total + 0.01) {
      wx.showToast({ title: '堂食+外卖不能超过总营业额 ¥' + total.toFixed(2), icon: 'none' });
    }
    this.setData({ revDineInRevenue: val });
  },

  onRevTakeoutInput: function (e) {
    var val = e.detail.value;
    // 堂食 + 外卖 不能超过总营业额
    var dineIn = parseFloat(String(this.data.revDineInRevenue || '').trim()) || 0;
    var total = parseFloat(String(this.data.revGrossRevenue || '').trim()) || 0;
    var takeout = parseFloat(String(val || '').trim()) || 0;
    if (total > 0 && dineIn + takeout > total + 0.01) {
      wx.showToast({ title: '堂食+外卖不能超过总营业额 ¥' + total.toFixed(2), icon: 'none' });
    }
    this.setData({ revTakeoutRevenue: val });
  },

  onRevTakeoutOrderInput: function (e) {
    this.setData({ revTakeoutOrderCount: e.detail.value });
  },

  onRevPlatformFeeInput: function (e) {
    this.setData({ revPlatformFee: e.detail.value });
  },

  onRevNotesInput: function (e) {
    this.setData({ revNotes: e.detail.value });
  },

  onConfirmRevenue: function () {
    var self = this;
    var data = self.data;

    if (!data.depFatherId || !data.distributerId) {
      wx.showToast({ title: '门店信息不完整', icon: 'none' });
      return;
    }

    var body = {
      gbAiDailyRevenueRecordDate: data.recordDate,
      gbAiDailyRevenueParentDepartmentId: Number(data.depFatherId),
      gbAiDailyRevenueDistributerId: Number(data.distributerId),
    };

    // 如果有已有记录 ID，带上以更新
    var drRaw = data.dailyRevenueRaw || {};
    var rid = drRaw.gbAiDailyRevenueId;
    if (rid != null && rid !== '') body.gbAiDailyRevenueId = Number(rid);

    var dineInOrders = parseInt(String(data.revDineInOrderCount).trim(), 10);
    if (!isNaN(dineInOrders)) body.gbAiDailyRevenueDineInOrders = dineInOrders;

    var dineInCustomers = parseInt(String(data.revDineInCustomerCount).trim(), 10);
    if (!isNaN(dineInCustomers)) body.gbAiDailyRevenueDineInCustomers = dineInCustomers;

    var dineInRevenue = parseFloat(String(data.revDineInRevenue).trim());
    if (!isNaN(dineInRevenue)) body.gbAiDailyRevenueDineInRevenue = dineInRevenue;

    var takeoutRevenue = parseFloat(String(data.revTakeoutRevenue).trim());
    if (!isNaN(takeoutRevenue)) body.gbAiDailyRevenueTakeoutRevenue = takeoutRevenue;

    var takeoutOrders = parseInt(String(data.revTakeoutOrderCount).trim(), 10);
    if (!isNaN(takeoutOrders)) body.gbAiDailyRevenueTakeoutOrders = takeoutOrders;

    var platformFee = parseFloat(String(data.revPlatformFee).trim());
    if (!isNaN(platformFee)) body.gbAiDailyRevenuePlatformFee = platformFee;

    var notes = String(data.revNotes || '').trim();
    if (notes) body.gbAiDailyRevenueNotes = notes;

    load.showLoading('保存中...');

    api.updateDailyRevenue(body).then(function (res) {
      load.hideLoading();
      if (res.result.code === 0) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        self.setData({ showRevenueModal: false });
        setTimeout(function () { self._loadData(); }, 500);
      } else {
        wx.showToast({ title: res.result.msg || '保存失败', icon: 'none' });
      }
    }).catch(function () {
      load.hideLoading();
      wx.showToast({ title: '网络请求失败', icon: 'none' });
    });
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  },
});
