const globalData = getApp().globalData;

var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil.js');
var api = require('../../../services/api.js');
var foodSalesDepUtil = require('../../../utils/foodSalesDepUtil');

var depFatherAndSubDepForChoice = foodSalesDepUtil.depFatherAndSubDepForChoice;
var depFatherAndSubDepFromMendianInfo = foodSalesDepUtil.depFatherAndSubDepFromMendianInfo;
var indexOfMendianDefaultSalesDep = foodSalesDepUtil.indexOfMendianDefaultSalesDep;
var buildGroupedRows = foodSalesDepUtil.buildGroupedRows;
var buildDepartmentChoiceListForCurrentMendian = foodSalesDepUtil.buildDepartmentChoiceListForCurrentMendian;

Page({
  data: {
    windowWidth: 0,
    navBarHeight: 0,
    disId: '',
    disInfo: null,
    depFatherId: '',
    mendianInfo: null,

    departmentChoiceList: [],
    salesDepIndex: 0,
    hasDepartmentChoices: false,

    singleDate: '',
    todayDate: '',

    /* ===== 菜品分组列表 ===== */
    foodGroups: [],
    expandedGroupId: '',
    foodsLoading: false,

    /* ===== 弹窗状态 ===== */
    showModal: false,
    // 当前选中的菜品信息
    modalFoodId: null,
    modalFoodName: '',
    modalUnitPrice: '',
    modalQuantity: '',
    modalNotes: '',
    modalIsEdit: false,  // 是否在编辑已有记录

    // 已有员工餐的 foodId -> { quantity, unitPrice, notes } 映射
    mealMap: {},
  },

  onLoad: function () {
    var today = dateUtils.getArriveDate(0);
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      todayDate: today,
      singleDate: today,
    });

    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.gbDuDistributerId) {
      this.setData({ disId: userInfo.gbDuDistributerId });
    }

    var disInfo = wx.getStorageSync('disInfo');
    if (disInfo) {
      var mendianStored = wx.getStorageSync('mendianInfo');
      var choices = buildDepartmentChoiceListForCurrentMendian(disInfo, mendianStored);
      var patch = {
        disInfo: disInfo,
        depFatherId: (mendianStored && mendianStored.gbDepartmentId) ? mendianStored.gbDepartmentId : '',
        departmentChoiceList: choices,
        hasDepartmentChoices: choices.length > 1,
        salesDepIndex: 0,
      };
      if (mendianStored && mendianStored.gbDepartmentId) {
        patch.mendianInfo = mendianStored;
        patch.salesDepIndex = indexOfMendianDefaultSalesDep(choices, mendianStored);
      }
      this.setData(patch);
    }
  },

  onShow: function () {
    if (this.data.disId) {
      this._loadFoodCatalog();
    }
  },

  /* ========== 工具方法 ========== */

  _getSelectedDepChoice: function () {
    var list = this.data.departmentChoiceList || [];
    var idx = this.data.salesDepIndex || 0;
    return list[idx] || list[0] || null;
  },

  _getDepFoodCatalogParams: function () {
    var mi = this.data.mendianInfo || wx.getStorageSync('mendianInfo');
    if (mi) {
      var fromMi = depFatherAndSubDepFromMendianInfo(mi);
      if (fromMi) return fromMi;
    }
    return depFatherAndSubDepForChoice(this._getSelectedDepChoice());
  },

  _fatherDepForCurrentSelection: function () {
    var ch = this._getSelectedDepChoice();
    if (ch && ch.gbDfDepFatherId != null && ch.gbDfDepFatherId !== '') return ch.gbDfDepFatherId;
    var mi = this.data.mendianInfo || wx.getStorageSync('mendianInfo');
    return (mi && mi.gbDepartmentId) ? mi.gbDepartmentId : '';
  },

  _resolveDistributerId: function () {
    var disInfo = this.data.disInfo || wx.getStorageSync('disInfo');
    return (disInfo && disInfo.gbDistributerId != null) ? disInfo.gbDistributerId : '';
  },

  _getSalesDepId: function () {
    var ch = this._getSelectedDepChoice();
    if (ch && ch.gbDepartmentId != null && ch.gbDepartmentId !== '') {
      var cid = Number(ch.gbDepartmentId);
      var fidRaw = ch.gbDfDepFatherId;
      var fid = fidRaw != null && fidRaw !== '' ? Number(fidRaw) : NaN;
      if (!isNaN(cid) && !isNaN(fid) && cid !== fid) return ch.gbDepartmentId;

      var mi = this.data.mendianInfo || wx.getStorageSync('mendianInfo');
      var subs = (mi && mi.gbDepartmentEntityList) || [];
      if (subs.length > 0 && subs[0] && subs[0].gbDepartmentId != null) {
        return subs[0].gbDepartmentId;
      }
      return ch.gbDepartmentId;
    }

    var mi = this.data.mendianInfo || wx.getStorageSync('mendianInfo');
    var subs2 = (mi && mi.gbDepartmentEntityList) || [];
    if (subs2.length > 0 && subs2[0] && subs2[0].gbDepartmentId != null) {
      return subs2[0].gbDepartmentId;
    }
    return this.data.depFatherId;
  },

  /* ========== 数据加载 ========== */

  /** 加载菜品目录 */
  _loadFoodCatalog: function () {
    var self = this;
    if (!self.data.disId) return;
    var depParam = self._getDepFoodCatalogParams();
    if (!depParam) return;

    self.setData({ foodsLoading: true });

    api.depGetDepFoodList(depParam.depFatherId, depParam.subDepid)
      .then(function (res) {
        if (res.result.code == 0) {
          var groups = buildGroupedRows(res.result.data, { mode: 'staffMeal' });
          self.setData({ foodGroups: groups, foodsLoading: false });
          // 加载完菜品后拉取当日员工餐数据
          self._loadDailyMeals();
        } else {
          self.setData({ foodsLoading: false });
        }
      })
      .catch(function () {
        self.setData({ foodsLoading: false });
      });
  },

  /** 加载当日 type=5 员工餐记录，合并到菜品列表 */
  _loadDailyMeals: function () {
    var self = this;
    var depFatherId = self._fatherDepForCurrentSelection();
    var distributerId = self._resolveDistributerId();
    var subDepId = self._getSalesDepId();

    if (!depFatherId || !distributerId) return;

    api.getDailyFoodSalesAndRevenue({
      depFatherId: depFatherId,
      distributerId: distributerId,
      recordDate: self.data.singleDate,
      subDepId: subDepId,
    }).then(function (res) {
      if (res.result.code === 0) {
        var data = res.result.data || {};
        var submitShape = data.submitShape || {};
        var lines = submitShape.lines || [];

        // 构建 mealMap: foodId -> { quantity, unitPrice, notes }
        var mealMap = {};
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          if (line.type === 5 || line.type === '5') {
            mealMap[String(line.foodId)] = {
              quantity: line.quantity || 0,
              unitPrice: line.actualUnitPrice || 0,
              notes: line.notes || '',
            };
          }
        }

        // 合并到 foodGroups
        var groups = self.data.foodGroups;
        for (var gi = 0; gi < groups.length; gi++) {
          var children = groups[gi].children || [];
          for (var ci = 0; ci < children.length; ci++) {
            var child = children[ci];
            var meal = mealMap[String(child.foodId)];
            if (meal) {
              child.staffMealQty = meal.quantity;
              child.staffMealUnitPrice = meal.unitPrice;
              child.staffMealNotes = meal.notes;
            } else {
              child.staffMealQty = 0;
              child.staffMealUnitPrice = 0;
              child.staffMealNotes = '';
            }
          }
        }

        self.setData({ foodGroups: groups, mealMap: mealMap });
      }
    }).catch(function () {});
  },

  /* ========== UI 事件 ========== */

  onDateChange: function (e) {
    this.setData({ singleDate: e.detail.value });
    this._loadDailyMeals();
  },

  onSalesDepChange: function (e) {
    var idx = parseInt(e.detail.value, 10) || 0;
    this.setData({ salesDepIndex: idx });
    this._loadFoodCatalog();
  },

  /** 点击分类头部：展开/收起 */
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

  /** 点击菜品 → 打开弹窗 */
  onDishTap: function (e) {
    var gid = e.currentTarget.dataset.gid;
    var idx = e.currentTarget.dataset.index;
    var groups = this.data.foodGroups;

    var child = null;
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].groupId === gid) {
        child = groups[i].children[idx];
        break;
      }
    }
    if (!child) return;

    var isEdit = child.staffMealQty > 0;

    this.setData({
      showModal: true,
      modalFoodId: child.foodId,
      modalFoodName: child.foodName,
      modalUnitPrice: isEdit ? String(child.staffMealUnitPrice) : String(child.unitPrice || ''),
      modalQuantity: isEdit ? String(child.staffMealQty) : '',
      modalNotes: isEdit ? (child.staffMealNotes || '') : '',
      modalIsEdit: isEdit,
    });
  },

  /** 删除已有员工餐记录 */
  onDeleteMeal: function (e) {
    var self = this;
    var gid = e.currentTarget.dataset.gid;
    var idx = e.currentTarget.dataset.index;
    var groups = self.data.foodGroups;

    var child = null;
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].groupId === gid) {
        child = groups[i].children[idx];
        break;
      }
    }
    if (!child || !child.staffMealQty) return;

    wx.showModal({
      title: '确认删除',
      content: '确定删除「' + child.foodName + '」的员工餐记录？',
      success: function (modalRes) {
        if (!modalRes.confirm) return;

        var depFatherId = self._fatherDepForCurrentSelection();
        var distributerId = self._resolveDistributerId();
        var subDepId = self._getSalesDepId();

        if (!depFatherId || !distributerId || !subDepId) {
          wx.showToast({ title: '门店信息不完整', icon: 'none' }); return;
        }

        load.showLoading('删除中...');
        api.deleteDishSalesLine({
          recordDate: self.data.singleDate,
          depFatherId: Number(depFatherId),
          depId: Number(subDepId),
          distributerId: Number(distributerId),
          foodId: Number(child.foodId),
          type: 5,
        }).then(function (res) {
          load.hideLoading();
          if (res.result.code === 0 && res.result.data && res.result.data.deleted) {
            wx.showToast({ title: '已删除', icon: 'success' });
            setTimeout(function () { self._loadDailyMeals(); }, 500);
          } else {
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }).catch(function () {
          load.hideLoading();
          wx.showToast({ title: '网络请求失败', icon: 'none' });
        });
      },
    });
  },

  /* ========== 弹窗 ========== */

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

  /** 弹窗确认提交 */
  onConfirmModal: function () {
    var self = this;
    var data = self.data;

    if (!data.modalFoodId) {
      wx.showToast({ title: '菜品信息异常', icon: 'none' }); return;
    }
    var qty = parseFloat(String(data.modalQuantity).trim());
    if (isNaN(qty) || qty <= 0) {
      wx.showToast({ title: '请输入有效份数', icon: 'none' }); return;
    }

    var depFatherId = self._fatherDepForCurrentSelection();
    var distributerId = self._resolveDistributerId();
    var subDepId = self._getSalesDepId();

    if (!depFatherId || !distributerId || !subDepId) {
      wx.showToast({ title: '门店信息不完整', icon: 'none' }); return;
    }

    var body = {
      recordDate: data.singleDate,
      depFatherId: Number(depFatherId),
      distributerId: Number(distributerId),
      foodId: Number(data.modalFoodId),
      quantity: qty,
      type: 5,
      // 如果是编辑已有记录且份数变化，使用 SET 覆盖；否则 ADD 累加
      quantityMode: data.modalIsEdit ? 'SET' : 'ADD',
    };

    var price = parseFloat(String(data.modalUnitPrice).trim());
    if (!isNaN(price) && price >= 0) body.actualUnitPrice = price;

    load.showLoading('保存中...');

    api.upsertDishSalesLine(body).then(function (res) {
      load.hideLoading();
      if (res.result.code === 0) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        self.setData({ showModal: false });
        setTimeout(function () { self._loadDailyMeals(); }, 500);
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
