const globalData = getApp().globalData;

var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil.js');
var apiUrl = require('../../../../config/index');
var api = require('../../../services/api.js');
var foodSalesTemplateWx = require('../../../../lib/foodSalesTemplateWx.js');
var foodSalesExcelApi = require('../../../../lib/foodSalesExcelApi.js');

/**
 * GET gbdepfood/depGetDepFoodList
 * depFatherId 必填；subDepid 可选（有子部门时传子部门 id，仅父级铺位不传则查父下全部子部门）。
 */
function depGetDepFoodList(depFatherId, subDepid) {
  var qs = 'depFatherId=' + encodeURIComponent(String(depFatherId));
  if (subDepid != null && subDepid !== '') {
    qs += '&subDepid=' + encodeURIComponent(String(subDepid));
  }
  return new Promise(function (resolve, reject) {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepfood/depGetDepFoodList?' + qs,
      method: 'GET',
      success: function (res) {
        resolve({ result: res.data });
      },
      fail: function (e) {
        load.hideLoading();
        reject(e);
      },
    });
  });
}

/** 当前部门选项 → 新接口参数（与同页 departmentChoiceList 项结构一致） */
function depFatherAndSubDepForChoice(ch) {
  if (!ch || ch.gbDfDepFatherId == null || ch.gbDfDepFatherId === '') {
    return null;
  }
  var father = Number(ch.gbDfDepFatherId);
  var selfId =
    ch.gbDepartmentId != null && ch.gbDepartmentId !== ''
      ? Number(ch.gbDepartmentId)
      : NaN;
  if (isNaN(father)) {
    return null;
  }
  var subDepid =
    !isNaN(selfId) && selfId !== father ? selfId : undefined;
  return { depFatherId: father, subDepid: subDepid };
}

/**
 * 与 chefOrder/mendian/index 缓存一致：父部门 mendianInfo.gbDepartmentId，
 * 有子部门时子部门默认 gbDepartmentEntityList[0]。无子部门时不传 subDepid。
 */
function depFatherAndSubDepFromMendianInfo(mi) {
  if (!mi || mi.gbDepartmentId == null || mi.gbDepartmentId === '') {
    return null;
  }
  var father = Number(mi.gbDepartmentId);
  if (isNaN(father)) {
    return null;
  }
  var subs = mi.gbDepartmentEntityList || [];
  var hasSubs =
    (mi.gbDepartmentSubAmount != null &&
      Number(mi.gbDepartmentSubAmount) > 0 &&
      subs.length > 0) ||
    subs.length > 0;
  var subFirst = subs[0];
  var subDepid =
    hasSubs &&
    subFirst &&
    subFirst.gbDepartmentId != null &&
    subFirst.gbDepartmentId !== ''
      ? Number(subFirst.gbDepartmentId)
      : undefined;
  return { depFatherId: father, subDepid: subDepid };
}

/** salesDepIndex 与 mendianInfo 默认子部门（或仅存父的一条）对齐 */
function indexOfMendianDefaultSalesDep(choices, mi) {
  if (!choices || !choices.length || !mi) {
    return 0;
  }
  var subs = mi.gbDepartmentEntityList || [];
  var hasSubs =
    (mi.gbDepartmentSubAmount != null &&
      Number(mi.gbDepartmentSubAmount) > 0 &&
      subs.length > 0) ||
    subs.length > 0;
  var fatherId = mi.gbDepartmentId;
  var i;
  if (!hasSubs) {
    for (i = 0; i < choices.length; i++) {
      if (
        Number(choices[i].gbDepartmentId) === Number(fatherId) &&
        Number(choices[i].gbDfDepFatherId) === Number(fatherId)
      ) {
        return i;
      }
    }
    return 0;
  }
  var subId =
    subs.length > 0 &&
    subs[0] &&
    subs[0].gbDepartmentId != null &&
    subs[0].gbDepartmentId !== ''
      ? subs[0].gbDepartmentId
      : null;
  if (subId == null) {
    return 0;
  }
  for (i = 0; i < choices.length; i++) {
    if (
      Number(choices[i].gbDfDepFatherId) === Number(fatherId) &&
      Number(choices[i].gbDepartmentId) === Number(subId)
    ) {
      return i;
    }
  }
  return 0;
}

/** 将 GbDepFoodEntity[] 转为销售页表格行（原 disGetFood 分类结构不再使用） */
function flattenSalesFoodRowsFromDepFoodEntities(list) {
  var rows = [];
  var raw = Array.isArray(list) ? list : [];
  for (var i = 0; i < raw.length; i++) {
    var item = raw[i];
    var nested = item.gbDistributerFoodEntity || {};
    var fid =
      item.gbDfFoodId != null && item.gbDfFoodId !== ''
        ? item.gbDfFoodId
        : nested.gbDistributerFoodId != null
          ? nested.gbDistributerFoodId
          : item.gbDistributerFoodId;
    if (fid == null || fid === '') {
      continue;
    }
    var fname =
      item.gbDfFoodName != null && item.gbDfFoodName !== ''
        ? String(item.gbDfFoodName)
        : nested.gbDfFoodName != null
          ? String(nested.gbDfFoodName)
          : '';
    var price =
      item.gbDfFoodPrice != null && item.gbDfFoodPrice !== ''
        ? item.gbDfFoodPrice
        : nested.gbDfFoodPrice;
    var status =
      item.gbDfStatus != null ? item.gbDfStatus : nested.gbDfStatus;
    var rowId =
      item.gbDepFoodId != null && item.gbDepFoodId !== ''
        ? String(item.gbDepFoodId)
        : 'r' + i;
    rows.push({
      rowKey: rowId + '_' + String(fid),
      catName: '',
      foodName: fname,
      unitPriceDisplay: price != null && price !== '' ? String(price) : '—',
      foodId: fid,
      qtyStr: '',
      offShelf: status == 1,
    });
  }
  return rows;
}

function qtyToQtyStr(sum) {
  var n = parseFloat(String(sum));
  if (isNaN(n) || n <= 0) return '';
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  var s = n.toFixed(4).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  return s;
}

function scalarToInputStr(val) {
  if (val == null || val === '') return '';
  return String(val);
}

/**
 * dailyRevenue 字段可能在 camelCase 或与列表一致的 gbAiDailyRevenue* 前缀
 */
function pickDr(obj, keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (var i = 0; i < keys.length; i++) {
    var v = obj[keys[i]];
    if (v != null && v !== '') return v;
  }
  return undefined;
}

function formatDrMoney(v) {
  if (v == null || v === '') return '';
  var n = parseFloat(String(v).trim());
  if (isNaN(n)) return String(v);
  return n.toFixed(2);
}

function buildDailyRevenueView(dr) {
  var o = dr && typeof dr === 'object' ? dr : {};
  var hasRecord =
    o.hasRecord === true ||
    o.hasRecord === 1 ||
    o.hasRecord === '1';
  var rid = pickDr(o, ['gbAiDailyRevenueId']);
  if (rid != null && rid !== '') {
    hasRecord = true;
  }

  function money(keys) {
    return formatDrMoney(pickDr(o, keys));
  }

  function intStr(keys) {
    var v = pickDr(o, keys);
    if (v == null || v === '') return '';
    var n = parseInt(v, 10);
    return isNaN(n) ? String(v) : String(n);
  }

  var gross = money(['grossRevenue', 'gbAiDailyRevenueGrossRevenue']);
  var net = money(['netRevenue', 'gbAiDailyRevenueNetRevenue']);
  var dineStored = money([
    'dineInRevenueStored',
    'gbAiDailyRevenueDineInRevenue',
  ]);
  var dineFromDishes = money(['dineInRevenueFromDishes']);
  var takeout = money(['takeoutRevenue', 'gbAiDailyRevenueTakeoutRevenue']);
  var platform = money(['platformFee', 'gbAiDailyRevenuePlatformFee']);

  if (!hasRecord && (gross || net || dineStored || dineFromDishes || takeout)) {
    hasRecord = true;
  }

  var notesVal = pickDr(o, ['notes', 'gbAiDailyRevenueNotes']);
  var weekVal = pickDr(o, ['weekday', 'gbAiDailyRevenueWeekday']);
  var holVal = pickDr(o, ['holiday', 'gbAiDailyRevenueHoliday']);

  return {
    hasRecord: hasRecord,
    grossRevenue: gross,
    netRevenue: net,
    dineInRevenueStored: dineStored,
    dineInRevenueFromDishes: dineFromDishes,
    dineInOrders: intStr(['dineInOrders', 'gbAiDailyRevenueDineInOrders']),
    dineInCustomers: intStr(['dineInCustomers', 'gbAiDailyRevenueDineInCustomers']),
    takeoutRevenue: takeout,
    takeoutOrders: intStr(['takeoutOrders', 'gbAiDailyRevenueTakeoutOrders']),
    platformFee: platform,
    notes: notesVal != null && notesVal !== '' ? String(notesVal) : '',
    weekday: weekVal != null && weekVal !== '' ? String(weekVal) : '',
    holiday: holVal != null && holVal !== '' ? String(holVal) : '',
  };
}

/** 单个门店行（mendianDepartmentList 的一项或缓存 mendianInfo）→ 销售部门 picker 选项 */
function foodDepChoicesFromMendianDepartmentRow(m) {
  var choices = [];
  if (!m || m.gbDepartmentId == null || m.gbDepartmentId === '') {
    return choices;
  }
  var subs = m.gbDepartmentEntityList || [];
  var hasSubs =
    (m.gbDepartmentSubAmount != null &&
      Number(m.gbDepartmentSubAmount) > 0 &&
      subs.length > 0) ||
    subs.length > 0;
  if (!hasSubs) {
    choices.push({
      gbDepartmentId: m.gbDepartmentId,
      gbDepartmentName: m.gbDepartmentName || '',
      gbDfDepFatherId: m.gbDepartmentId,
    });
  } else {
    for (var j = 0; j < subs.length; j++) {
      var s = subs[j];
      choices.push({
        gbDepartmentId: s.gbDepartmentId,
        gbDepartmentName:
          (m.gbDepartmentName || '') +
          ' · ' +
          ((s && s.gbDepartmentName) || ''),
        gbDfDepFatherId: m.gbDepartmentId,
      });
    }
  }
  return choices;
}

/** 全部门店（旧逻辑，仅无 mendianInfo 时兜底） */
function buildFoodDepChoices(disInfo) {
  var choices = [];
  var list = (disInfo && disInfo.mendianDepartmentList) || [];
  for (var i = 0; i < list.length; i++) {
    var part = foodDepChoicesFromMendianDepartmentRow(list[i]);
    for (var k = 0; k < part.length; k++) {
      choices.push(part[k]);
    }
  }
  return choices;
}

/**
 * 当前门店：仅 mendianInfo.gbDepartmentId 对应那一家的子部门，避免多店混在一个 picker 里。
 * 优先 disInfo 里同 id 行（数据更全）；对不上则用缓存 mendianInfo 自身建树。
 */
function buildDepartmentChoiceListForCurrentMendian(disInfo, mendianStored) {
  if (
    mendianStored == null ||
    mendianStored.gbDepartmentId == null ||
    mendianStored.gbDepartmentId === ''
  ) {
    return buildFoodDepChoices(disInfo);
  }
  var list = (disInfo && disInfo.mendianDepartmentList) || [];
  var target = Number(mendianStored.gbDepartmentId);
  var i;
  for (i = 0; i < list.length; i++) {
    if (Number(list[i].gbDepartmentId) === target) {
      return foodDepChoicesFromMendianDepartmentRow(list[i]);
    }
  }
  return foodDepChoicesFromMendianDepartmentRow(mendianStored);
}

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
    salesFoodRows: [],
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
    var isEdit =
      options.edit === '1' ||
      options.edit === 'true' ||
      options.mode === 'edit';
    var pageTitle = isEdit ? '修改菜品销量' : '添加菜品销量';

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
      isEditMode: isEdit,
      pageTitle: pageTitle,
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
    depGetDepFoodList(depParam.depFatherId, depParam.subDepid)
      .then(function (res) {
        load.hideLoading();
        self.setData({ foodsLoading: false });
        if (res.result.code == 0) {
          var rows = flattenSalesFoodRowsFromDepFoodEntities(res.result.data);
          self.setData({ salesFoodRows: rows, foodCatalogReady: true });
          self._recalcDineInFromDishes();
          if (self.data.isEditMode) {
            self._fetchDailySalesAndFillForm();
          }
        } else {
          wx.showToast({ title: res.result.msg || '加载失败', icon: 'none' });
        }
      })
      .catch(function () {
        load.hideLoading();
        self.setData({ foodsLoading: false });
        wx.showToast({ title: '网络异常', icon: 'none' });
      });
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

  _pickSalesDepIndexFromLines: function (linesIn, choiceList) {
    choiceList = choiceList || [];
    linesIn = linesIn || [];
    var depCount = {};
    for (var i = 0; i < linesIn.length; i++) {
      var ln = linesIn[i];
      var q = parseFloat(String(ln.quantity != null ? ln.quantity : '').trim());
      if (isNaN(q) || q <= 0) continue;
      var did = ln.depId;
      if (did == null || did === '') continue;
      var k = String(did);
      depCount[k] = (depCount[k] || 0) + 1;
    }
    var bestK = '';
    var bestN = -1;
    for (var k2 in depCount) {
      if (depCount[k2] > bestN) {
        bestN = depCount[k2];
        bestK = k2;
      }
    }
    if (!bestK || bestN < 0) return -1;
    var targetId = Number(bestK);
    for (var j = 0; j < choiceList.length; j++) {
      if (Number(choiceList[j].gbDepartmentId) === targetId) {
        return j;
      }
    }
    return -1;
  },

  /**
   * 将 getDailyFoodSalesAndRevenue 返回的 submitShape 回填到当前列表与指标区
   */
  _applySubmitShapeToForm: function (submitShape) {
    var shape = submitShape || {};
    var rowsSource = this.data.salesFoodRows || [];
    var rows = [];
    for (var a = 0; a < rowsSource.length; a++) {
      rows.push(Object.assign({}, rowsSource[a]));
    }
    var qtyMap = {};
    var linesIn = shape.lines || [];
    for (var i = 0; i < linesIn.length; i++) {
      var ln = linesIn[i];
      var q = parseFloat(String(ln.quantity != null ? ln.quantity : '').trim());
      if (isNaN(q) || q <= 0) continue;
      var sk = String(ln.foodId);
      qtyMap[sk] = (qtyMap[sk] || 0) + q;
    }
    for (var j = 0; j < rows.length; j++) {
      var r = rows[j];
      var mq = qtyMap[String(r.foodId)];
      r.qtyStr = mq != null ? qtyToQtyStr(mq) : '';
    }

    var patch = {
      salesFoodRows: rows,
      dineInOrderCount: scalarToInputStr(shape.dineInOrders),
      dineInCustomerCount: scalarToInputStr(shape.dineInCustomers),
      takeoutRevenue: scalarToInputStr(shape.takeoutRevenue),
      takeoutOrderCount: scalarToInputStr(shape.takeoutOrders),
      platformFee: scalarToInputStr(shape.platformFee),
      notes: scalarToInputStr(shape.notes),
    };
    var depIdx = this._pickSalesDepIndexFromLines(linesIn, this.data.departmentChoiceList || []);
    if (depIdx >= 0 && this.data.hasDepartmentChoices) {
      patch.salesDepIndex = depIdx;
    }
    if (
      !this.data.isEditMode &&
      shape.recordDate != null &&
      shape.recordDate !== '' &&
      /^\d{4}-\d{2}-\d{2}$/.test(String(shape.recordDate).substring(0, 10))
    ) {
      patch.singleDate = String(shape.recordDate).substring(0, 10);
    }
    this.setData(patch);
  },

  /**
   * 拉取指定日已有数据并回填（需目录已就绪）
   * @param {string} [recordDateHint] yyyy-MM-dd，默认当前 data.singleDate
   */
  _fetchDailySalesAndFillForm: function (recordDateHint) {
    var self = this;
    if (!self.data.foodCatalogReady || !self.data.disId) {
      return;
    }
    if (self._dailySalesFetchBusy) {
      return;
    }
    var recordDate =
      recordDateHint != null && recordDateHint !== ''
        ? String(recordDateHint).trim().substring(0, 10)
        : self.data.singleDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(recordDate || '')) {
      return;
    }
    var depFatherId = self._fatherDepForCurrentSelection();
    var distributerId = self._resolveDistributerId();
    var subDepIdVal = self._getSalesDepId();
    if (!depFatherId || !distributerId) {
      return;
    }
    if (
      subDepIdVal === '' ||
      subDepIdVal == null ||
      isNaN(Number(subDepIdVal))
    ) {
      return;
    }
    self._dailySalesFetchBusy = true;
    api
      .getDailyFoodSalesAndRevenue({
        depFatherId: Number(depFatherId),
        subDepId: Number(subDepIdVal),
        distributerId: Number(distributerId),
        recordDate: recordDate,
      })
      .then(function (res) {
        self._dailySalesFetchBusy = false;
        var code = res.result.code;
        if (code !== 0 && code !== '0') {
          wx.showToast({
            title: res.result.msg || '加载当日数据失败',
            icon: 'none',
          });
          return;
        }
        var d = res.result.data || {};
        var submitShape = d.submitShape;

        var lc = null;
        if (d.lineCount != null && d.lineCount !== '') {
          lc = Number(d.lineCount);
          if (isNaN(lc)) lc = null;
        }

        self.setData({
          dailyRevenueView: buildDailyRevenueView(d.dailyRevenue),
          fetchLineCount: lc,
        });

        if (submitShape) {
          self._applySubmitShapeToForm(submitShape);
        } else {
          self._applySubmitShapeToForm({});
        }
        self._recalcDineInFromDishes();
      })
      .catch(function () {
        self._dailySalesFetchBusy = false;
        wx.showToast({ title: '加载当日数据失败', icon: 'none' });
      });
  },

  onDateChange: function (e) {
    if (this.data.isEditMode) return;
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
    var idx = e.currentTarget.dataset.index;
    var val = e.detail.value;
    var key = 'salesFoodRows[' + idx + '].qtyStr';
    var patch = {};
    patch[key] = val;
    this.setData(patch);
    this._recalcDineInFromDishes();
  },

  _recalcDineInFromDishes: function () {
    var rows = this.data.salesFoodRows || [];
    var sum = 0;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var q = parseFloat(String(r.qtyStr || '').trim());
      if (isNaN(q) || q <= 0) continue;
      var p = parseFloat(String(r.unitPriceDisplay === '—' ? '0' : r.unitPriceDisplay).trim());
      if (isNaN(p)) p = 0;
      sum += q * p;
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
    if (this.data.isEditMode) return;
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
    if (this.data.isEditMode) return;
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

  _isExcelChatFile: function (f) {
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

  _promptNonExcelChatFile: function (f) {
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

  onUploadCombinedExcel: function () {
    if (this.data.isEditMode) return;
    var departmentId = this._ensureTemplateDepartmentId();
    if (!departmentId) return;
    var distributerId = this._resolveDistributerId();
    if (!distributerId) {
      wx.showToast({ title: '缺少批发商信息', icon: 'none' });
      return;
    }
    var that = this;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success: function (res) {
        var list = res.tempFiles || [];
        var f = list[0];
        if (!f || !f.path) {
          wx.showToast({ title: '未获取到文件', icon: 'none' });
          return;
        }
        if (!that._isExcelChatFile(f)) {
          that._promptNonExcelChatFile(f);
          return;
        }
        wx.showModal({
          title: '确认上传',
          content: '确定上传该合并模板 Excel（菜品销量 + 日营业额）？',
          success: function (modalRes) {
            if (modalRes.confirm) {
              that._uploadCombinedExcelFile(f.path, departmentId, distributerId);
            }
          },
        });
      },
      fail: function (err) {
        var msg = err && err.errMsg ? String(err.errMsg) : '';
        if (msg.indexOf('cancel') >= 0 || msg.indexOf('取消') >= 0) {
          return;
        }
        wx.showToast({ title: '未选择文件', icon: 'none' });
      },
    });
  },

  _uploadCombinedExcelFile: function (filePath, departmentId, distributerId) {
    var that = this;
    wx.showLoading({ title: '正在上传...', mask: true });
    foodSalesExcelApi
      .uploadCombinedDailyExcel(filePath, departmentId, distributerId)
      .then(function (res) {
        wx.hideLoading();
        var code = res.result && res.result.code;
        var msg = res.result && res.result.msg;
        if (code === 0 || code === '0') {
          wx.showToast({ title: '导入成功', icon: 'success' });
          if (that.data.isEditMode && that.data.foodCatalogReady) {
            that._fetchDailySalesAndFillForm();
          }
        } else {
          wx.showToast({ title: msg || '上传失败', icon: 'none' });
        }
      })
      .catch(function (err) {
        wx.hideLoading();
        console.error('upload combined excel', err);
        wx.showToast({ title: '网络请求失败', icon: 'none' });
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
    var rows = this.data.salesFoodRows || [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var q = parseFloat(String(r.qtyStr || '').trim());
      if (isNaN(q) || q <= 0) continue;
      lines.push({
        depId: subNum,
        foodId: Number(r.foodId),
        quantity: q,
      });
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
    var self = this;
    var savePromise = self.data.isEditMode
      ? api.updateDailyFoodSalesAndRevenue(body)
      : api.submitDailyFoodSalesAndRevenue(body);
    savePromise.then(function (res) {
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
