
var load = require('../../../../lib/load.js');
var globalData = getApp().globalData;
var dateUtils = require('../../../../lib/dateUtil.js');
var http = require('../../../../lib/request.js');
var storeRootDepartmentId = require('../../../../lib/storeRootDepartment').storeRootDepartmentId;

Page({

  data: {
    navBarHeight: 0,

    // 页面参数
    dishId: '',
    dishName: '',
    dishImage: '',
    disId: '',
    depFatherId: '',

    // 日期
    startDate: '',
    stopDate: '',
    hanzi: '',

    // 汇总
    summary: null,

    // 每日数据
    dailyRows: [],

    // 图表类型
    chartTab: 'portions', // portions | amount

    // 编辑弹窗
    showEditPopup: false,
    editDateLabel: '',
    editDayIndex: -1,
    editTypes: [
      { type: 1, name: '正常销售', priceField: 'price1', qtyField: 'type1', color: '#52c41a' },
      { type: 2, name: '折扣销售', priceField: 'price2', qtyField: 'type2', color: '#1890ff' },
      { type: 3, name: '会员销售', priceField: 'price3', qtyField: 'type3', color: '#722ed1' },
      { type: 4, name: '赠送', priceField: 'price4', qtyField: 'type4', color: '#fa8c16' },
      { type: 5, name: '员工餐', priceField: 'price5', qtyField: 'type5', color: '#e74c3c' },
    ],
    editForm: {
      price1: '',
      price2: '',
      price3: '',
      price4: '',
      price5: '',
      type1: '',
      type2: '',
      type3: '',
      type4: '',
      type5: '',
    },

    loading: false,
  },

  onLoad(options) {
    this.setData({
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      dishId: options.dishId || options.foodId || '',
      dishName: options.dishName ? decodeURIComponent(options.dishName) : (options.foodName ? decodeURIComponent(options.foodName) : ''),
      dishImage: options.dishImage ? decodeURIComponent(options.dishImage) : '',
      disId: options.disId || '',
      depFatherId: options.depFatherId || this._getDepFatherId(),
      dishPrice: options.dishPrice || '',
    });

    this._syncDates();
    this._fetchData();
  },

  onShow() {
    // 从日期选择页返回后刷新
    if (this._needRefresh) {
      this._needRefresh = false;
      this._syncDates();
      this._fetchData();
    }
  },

  /** 获取门店根部门（SSOT：与后端 requireStoreRoot 一致） */
  _getDepFatherId: function () {
    var mendianInfo = wx.getStorageSync('mendianInfo');
    return storeRootDepartmentId(mendianInfo);
  },

  _syncDates() {
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
        hanzi: myDate.hanzi || dateRange.name,
      });
    } else {
      this.setData({
        startDate: dateUtils.getFirstDateInMonth(),
        stopDate: dateUtils.getArriveDate(0),
        hanzi: '本月',
      });
    }
  },

  _fetchData() {
    var that = this;
    var d = this.data;

    if (!d.dishId) {
      load.showToast('缺少菜品ID');
      return;
    }

    this.setData({ loading: true });

    var reqData = {
      dishId: d.dishId,
      startDate: d.startDate,
      stopDate: d.stopDate,
      disId: d.disId,
      depFatherId: d.depFatherId,
    };
    

    http.post('gbdepfood/getDishDailySalesRange', reqData, { showLoading: false })
      .then(function(res) {
        that.setData({ loading: false });

        var payload = res.result;
        if (!payload || payload.code !== 0) {
          load.showToast(payload && payload.msg ? payload.msg : '数据加载失败');
          return;
        }

        var data = payload.data || {};
        var summary = data.summary || null;
        var dailyRows = data.dailyRows || [];

        // 计算图表条形高度
        that._calcBarHeights(dailyRows);

        that.setData({
          summary: summary,
          dailyRows: dailyRows,
        });
      })
      .catch(function(err) {
        that.setData({ loading: false });
        console.error('[dishDailySales] API error:', err);
        load.showToast('网络请求失败');
      });
  },

  /** 计算图表条形高度 */
  _calcBarHeights(dailyRows) {
    var maxPortions = 0;
    var maxAmount = 0;
    for (var i = 0; i < dailyRows.length; i++) {
      var p = parseFloat(dailyRows[i].operatingSalesPortions) || 0;
      var a = parseFloat(dailyRows[i].salesAmount) || 0;
      if (p > maxPortions) maxPortions = p;
      if (a > maxAmount) maxAmount = a;
    }
    var maxBarH = 160; // 最大条形高度 rpx
    for (var i = 0; i < dailyRows.length; i++) {
      var p = parseFloat(dailyRows[i].operatingSalesPortions) || 0;
      var a = parseFloat(dailyRows[i].salesAmount) || 0;
      dailyRows[i]._portionBarH = maxPortions > 0 ? Math.max(4, (p / maxPortions) * maxBarH) : 4;
      dailyRows[i]._amountBarH = maxAmount > 0 ? Math.max(4, (a / maxAmount) * maxBarH) : 4;
    }
  },

  /** 跳转日期选择页 */
  toDatePageSearch() {
    var that = this;
    wx.navigateTo({
      url: '/pages/common/selectDate/selectDate?parent=dishDailySales',
      events: {
        onDateChanged: function() {
          that._needRefresh = true;
        }
      },
    });
  },

  /** 切换图表类型 */
  onChartTab(e) {
    var tab = e.currentTarget.dataset.tab;
    this.setData({ chartTab: tab });
  },

  /** 打开编辑弹窗 */
  onEditDay(e) {
    var row = e.currentTarget.dataset.row;
    var idx = e.currentTarget.dataset.index;

    // 格式化日期标签
    var dateStr = row.date || row.salesDate || '';
    var label = dateStr;
    if (dateStr.length >= 10) {
      var month = dateStr.substring(5, 7);
      var day = dateStr.substring(8, 10);
      if (month.charAt(0) === '0') month = month.charAt(1);
      if (day.charAt(0) === '0') day = day.charAt(1);
      label = month + '月' + day + '日';
    }

    // 从 records 中按 type 取对应单价
    var prices = {};
    var records = row.records || [];
    for (var r = 0; r < records.length; r++) {
      var rec = records[r];
      var t = rec.gbDfsType;
      if (t >= 1 && t <= 5 && rec.gbDfsActualUnitPrice != null) {
        prices['price' + t] = String(rec.gbDfsActualUnitPrice);
      }
    }

    this.setData({
      showEditPopup: true,
      editDateLabel: label,
      editDayIndex: idx,
      editForm: {
        price1: prices.price1 || this.data.dishPrice || '',
        price2: prices.price2 || '',
        price3: prices.price3 || '',
        price4: prices.price4 || '',
        price5: '0',
        type1: row.normalPortions != null ? String(row.normalPortions) : '',
        type2: row.discountPortions != null ? String(row.discountPortions) : '',
        type3: row.memberPortions != null ? String(row.memberPortions) : '',
        type4: row.complimentaryPortions != null ? String(row.complimentaryPortions) : '',
        type5: row.employeeMealPortions != null ? String(row.employeeMealPortions) : '',
      },
    });
  },

  /** 编辑输入 */
  onEditInput(e) {
    var field = e.currentTarget.dataset.field;
    var value = e.detail.value || '';
    var editForm = this.data.editForm;
    editForm[field] = value;
    this.setData({ editForm: editForm });
  },

  /** 阻止弹窗内点击冒泡到 overlay */
  onPreventClose() {},

  /** 关闭弹窗 */
  onClosePopup() {
    this.setData({ showEditPopup: false });
  },

  /** 保存编辑 */
  onSaveEdit() {
    var that = this;
    var d = this.data;
    var row = d.dailyRows[d.editDayIndex];

    if (!row) return;

    var items = [];
    var typeNames = ['type1', 'type2', 'type3', 'type4', 'type5'];
    for (var i = 0; i < typeNames.length; i++) {
      var field = typeNames[i];
      var val = parseFloat(d.editForm[field]);
      if (!isNaN(val) && val >= 0) {
        var item = {
          type: i + 1,
          portions: val,
        };
        // type4/5 强制 actualUnitPrice = 0；type1/2/3 使用各自填写的单价
        if (i + 1 === 4 || i + 1 === 5) {
          item.actualUnitPrice = 0;
        } else {
          var p = parseFloat(d.editForm['price' + (i + 1)]);
          if (!isNaN(p)) {
            item.actualUnitPrice = p;
          }
        }
        items.push(item);
      }
    }

    var saveData = {
      dishId: d.dishId,
      depFatherId: d.depFatherId,
      disId: d.disId,
      salesDate: row.date || row.salesDate,
      items: items,
    };

    load.showLoading('保存中...');

    http.post('gbdepfood/saveDishDailySalesBatch', saveData, { showLoading: false })
      .then(function(res) {
        load.hideLoading();
        var payload = res.result;
        if (payload && payload.code === 0) {
          load.showToast('保存成功');
          that.setData({ showEditPopup: false });
          // 刷新数据
          that._fetchData();
        } else {
          load.showToast(payload && payload.msg ? payload.msg : '保存失败');
        }
      })
      .catch(function(err) {
        load.hideLoading();
        console.error('[dishDailySales] save error:', err);
        load.showToast('网络请求失败');
      });
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

});
