var globalData = getApp().globalData;
var load = require('../../../lib/load.js');
var dateUtils = require('../../../lib/dateUtil.js');
var apiUrl = require('../../../config/index.js');

var apiDistributer = require('../../../services/apiDistributer.js');
var depOrder = require('../../../services/depOrder.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    selectArr: [],
    isAllSelected: false,
    selectedCount: 0,
    readOnlyList: false,
    pageTitle: '账单',
    status: '',
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    var gbDisInfo = wx.getStorageSync('gbDisInfo') || {};
    var windowHeight = globalData.windowHeight * globalData.rpxR;
    var statusBarHeight = globalData.statusBarHeight * globalData.rpxR;
    var readOnlyList = options.type === 'all' || options.type === 'havePayed';
    var scrollListHeight = readOnlyList
      ? windowHeight - statusBarHeight - 110 - 60
      : windowHeight - statusBarHeight - 110 - 180;
    var pageTitle = '账单';
    if (options.type === 'all') {
      pageTitle = '全部订单';
    } else if (options.type === 'havePayed') {
      pageTitle = '已结账款';
    }

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: windowHeight,
      statusBarHeight: statusBarHeight,
      scrollListHeight: scrollListHeight,
      readOnlyList: readOnlyList,
      pageTitle: pageTitle,
      url: apiUrl.server,
      status: options.type,
      supplierId: options.supplierId,
      gbDisId: options.gbDisId,
      retName: gbDisInfo.gbDistributerName || '',
      startDate: dateUtils.getMonthFirstAndLastDay(options.month).firstDay,
      stopDate: dateUtils.getMonthFirstAndLastDay(options.month).lastDay,
    });

    // 获取用户信息
    var jrdhUserInfo = wx.getStorageSync('jrdhUserInfo');
    if (jrdhUserInfo) {
      this.setData({
        jrdhUserInfo: jrdhUserInfo
      });
    }

    this._initData();
  },

  _initData() {
    var that = this;
    load.showLoading("获取账单");
    var data = {
      status: this.data.status,
      supplierId: this.data.supplierId,
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      disId: this.data.gbDisId
    };
    apiDistributer.disGetGbSupplierBillsWithStatus(data).then(function (res) {load.hideLoading();
      if (res.result.code == 0) {
        // 初始化每个订单的选中状态
        var arr = res.result.data.map(function (item) {
          item.isSelect = false;
          return item;
        });

        that.setData({
          arr: arr,
          selectArr: [],
          isAllSelected: false,
          selectedCount: 0
        });
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        });
        that.setData({
          arr: []
        });
      }
    });
  },

  selectBill(e) {
    var index = e.currentTarget.dataset.index;
    var isSelect = e.detail.value;
    var arr = this.data.arr;
    var item = arr[index];
    var selectArr = this.data.selectArr;

    // 更新订单的选中状态
    arr[index].isSelect = isSelect;

    if (isSelect) {
      selectArr.push(item);
    } else {
      var selectId = item.gbDistributerPurchaseBatchId;
      selectArr.splice(selectArr.findIndex(function (i) {
        return i.gbDistributerPurchaseBatchId === selectId;
      }), 1);
    }

    // 计算选中数量和全选状态
    var selectedCount = selectArr.length;
    var isAllSelected = selectedCount === arr.length;

    this.setData({
      arr: arr,
      selectArr: selectArr,
      selectedCount: selectedCount,
      isAllSelected: isAllSelected
    });

    this._countTotal();
  },

  _countTotal() {
    var selectArr = this.data.selectArr;
    var temp = 0;
    for (var i = 0; i < selectArr.length; i++) {
      var itemTotal = Number(selectArr[i].gbDpbSubtotal);

      // 如果是退货单（gbDpbPurchaseType == 9），则减去金额
      if (selectArr[i].gbDpbPurchaseType == 9) {
        temp = temp - itemTotal;
      } else {
        temp = temp + itemTotal;
      }
    }
    this.setData({
      total: temp.toFixed(1),
      selAmount: selectArr.length
    });
  },

  // 全选/取消全选
  selectAllBills(e) {
    var that = this;
    var isAllSelected = e.detail.value;
    var arr = this.data.arr;
    var selectArr = [];

    // 更新所有订单的选中状态
    arr.forEach(function (item) {
      item.isSelect = isAllSelected;
      if (isAllSelected) {
        selectArr.push(item);
      }
    });

    // 更新数据
    this.setData({
      arr: arr,
      selectArr: selectArr,
      isAllSelected: isAllSelected,
      selectedCount: isAllSelected ? arr.length : 0
    });

    // 重新计算总金额
    this._countTotal();
  },

  // 清空所有选择
  clearAllSelection() {
    var arr = this.data.arr;

    // 清空所有选中状态
    arr.forEach(function (item) {
      item.isSelect = false;
    });

    // 更新数据
    this.setData({
      arr: arr,
      selectArr: [],
      isAllSelected: false,
      selectedCount: 0
    });

    // 重新计算总金额
    this._countTotal();
  },

  settleBills() {
    this.setData({
      isTishi: true,
    });
  },

  cancleSettle() {
    this.setData({
      isTishi: false,
      selAmount: 0,
    });
    this._initData();
  },

  settleAccount() {
    var that = this;
    load.showLoading("结算订单");

    // 准备接口参数
    var selectArr = this.data.selectArr;
    if (selectArr.length === 0) {
      wx.showToast({
        title: '请选择要结算的订单',
        icon: 'none'
      });
      return;
    }

    // 构建参数
    var params = {
      ids: selectArr.map(function (item) {
        return item.gbDistributerPurchaseBatchId;
      }).join(','), // 批次ID字符串，逗号分隔
      gbDisId: this.data.gbDisId || (this.data.disInfo ? this.data.disInfo.gbDistributerId : undefined), // 配送商ID
      total: this.data.total, // 总金额
      supplierId: this.data.supplierId, // 供应商ID
      userId: this.data.jrdhUserInfo ? this.data.jrdhUserInfo.nxJrdhUserId : undefined // 用户ID
    };depOrder.finishPayPurchaseBatchGb(params).then(function (res) {
      load.hideLoading();
      that.setData({
        isTishi: false,
        selAmount: 0,
        total: ""
      });
      if (res.result.code == 0) {
        wx.showToast({
          title: '结算成功',
          icon: 'success'
        });

        var pages = getCurrentPages();
        var prevPage = pages[pages.length - 2]; // 上一个页面
        // 直接调用上一个页面的setData()方法，把数据存到上一个页面中去
        prevPage.setData({
          skipRefresh: false
        });
        wx.navigateBack({
          delta: 1
        });
      } else {
        wx.showToast({
          title: res.result.msg || '结算失败',
          icon: 'none'
        });
      }
    }).catch(function (err) {
      load.hideLoading();
      wx.showToast({
        title: '结算失败，请重试',
        icon: 'none'
      });
      console.error('结算失败:', err);
    });
  },

  toBack() {
    wx.navigateBack({
      delta: 1,
    });
  },

  openBatchDetail(e) {
    var status = this.data.status;
    if (status !== 'all' && status !== 'havePayed') {
      return;
    }
    var batch = e.currentTarget.dataset.item;
    var batchId = batch.gbDistributerPurchaseBatchId;
    var retName = this.data.retName || '';
    var disId = this.data.gbDisId;
    var buyUserId = batch.gbDpbBuyUserId;
    var depId = batch.gbDpbPurDepartmentId;

    if (batch.gbDpbPurchaseType == 9) {
      wx.navigateTo({
        url: '../gbOrderBatchReturn/gbOrderBatchReturn?batchId=' + batchId
          + '&retName=' + retName + '&disId=' + disId + '&fromBuyer=0'
          + '&buyUserId=' + buyUserId + '&depId=' + depId
          + '&supplierId=' + this.data.supplierId + '&from=supplier',
      });
    } else {
      wx.navigateTo({
        url: '../gbReceiveBatch/gbReceiveBatch?batchId=' + batchId
          + '&retName=' + retName + '&disId=' + disId
          + '&buyUserId=' + buyUserId + '&depId=' + depId + '&from=supplier',
      });
    }
  },
});
