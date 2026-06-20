var api = require('../../../services/api');
var config = require('../../../../config/index');
var dateUtil = require('../../../../lib/dateUtil');
var load = require('../../../../lib/load.js');

Page({
  data: {
    // 页面参数
    disGoodsId: '',
    stockId: '',
    
    // 商品信息
    goodsName: '',
    disGoods: null,
    
    // 筛选条件
    selectedDepId: -1,
    selectedDepName: '',
    depList: [],
    dateRangeText: '全部',
    dateDuring: '',
    
    // 列表数据
    stockList: [],
    totalIn: 0,
    totalRest: 0,
    totalUsed: 0,
    
    // 状态
    loading: false,
    noMore: false,
    
    // 弹窗
    showDepPicker: false,
  },

  onLoad: function (options) {
    var that = this;
    var disInfo = wx.getStorageSync('disInfo');
    var disGoods = wx.getStorageSync('disGoods');

    that.setData({
      windowWidth: getApp().globalData.windowWidth * getApp().globalData.rpxR,
      windowHeight: getApp().globalData.windowHeight * getApp().globalData.rpxR,
      navBarHeight: getApp().globalData.navBarHeight * getApp().globalData.rpxR,
      url: getApp().globalData.server || config.server,
      disGoodsId: options.disGoodsId || '',
      stockId: options.stockId || '',
      disGoods: disGoods,
      goodsName: disGoods ? disGoods.gbDgGoodsName : '商品库存',
      disInfo: disInfo,
    });

    // 获取部门列表
    if (disInfo && disInfo.mendianDepartmentList) {
      that.setData({
        depList: disInfo.mendianDepartmentList
      });
    }

    that._loadData();
  },

  onShow: function () {
    // 返回时刷新数据
    if (this.data.disGoodsId) {
      this._loadData();
    }
  },

  _loadData: function () {
    var that = this;
    that.setData({ loading: true, noMore: false });

    var params = {
      disGoodsId: that.data.disGoodsId,
      searchDepIds: that.data.selectedDepId > 0 ? String(that.data.selectedDepId) : '',
      dateDuring: that.data.dateDuring
    };

    api.depGetGoodsStockListAll(params).then(function (res) {
      that.setData({ loading: false });
      
      if (res.result.code == 0) {
        var data = res.result.data || [];
        // 处理数据，计算汇总
        var totalIn = 0;
        var totalRest = 0;
        
        data = data.map(function (item) {
          var inAmount = parseFloat(item.gbDgsSubtotal) || 0;
          var restAmount = parseFloat(item.gbDgsRestSubtotal) || 0;
          var usedAmount = inAmount - restAmount;
          
          totalIn += inAmount;
          totalRest += restAmount;
          
          // 计算库存天数
          var stockDays = that._calcStockDays(item.gbDgsDate);
          var stockDaysClass = that._getStockDaysClass(stockDays);
          
          // 确定状态
          var statusClass, statusText;
          if (restAmount <= 0) {
            statusClass = 'status-used';
            statusText = '已用完';
          } else if (stockDays > 3) {
            statusClass = 'status-warning';
            statusText = '库存久';
          } else {
            statusClass = 'status-normal';
            statusText = '正常';
          }
          
          return Object.assign({}, item, {
            stockDays: stockDays,
            stockDaysClass: stockDaysClass,
            statusClass: statusClass,
            statusText: statusText
          });
        });

        that.setData({
          stockList: data,
          totalIn: totalIn.toFixed(2),
          totalRest: totalRest.toFixed(2),
          totalUsed: (totalIn - totalRest).toFixed(2)
        });
      } else {
        wx.showToast({ title: res.result.msg || '获取数据失败', icon: 'none' });
      }
    }).catch(function (err) {
      that.setData({ loading: false });
      wx.showToast({ title: '网络异常', icon: 'none' });
    });
  },

  _calcStockDays: function (dateStr) {
    if (!dateStr) return 0;
    var stockDate = new Date(dateStr);
    var now = new Date();
    var diff = now - stockDate;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  },

  _getStockDaysClass: function (days) {
    if (days <= 1) return 'days-fresh';
    if (days <= 3) return 'days-normal';
    return 'days-old';
  },

  // 显示部门选择器
  showDepPicker: function () {
    this.setData({ showDepPicker: true });
  },

  // 隐藏部门选择器
  hideDepPicker: function () {
    this.setData({ showDepPicker: false });
  },

  // 选择部门
  selectDep: function (e) {
    var depId = e.currentTarget.dataset.id;
    var depName = e.currentTarget.dataset.name;
    
    this.setData({
      selectedDepId: depId,
      selectedDepName: depName,
      showDepPicker: false
    });
    
    this._loadData();
  },

  // 显示日期选择
  showDatePicker: function () {
    var that = this;
    var now = new Date();
    var halfYearAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    
    wx.showActionSheet({
      itemList: ['全部', '近7天', '近30天', '近90天', '自定义'],
      success: function (res) {
        var tapIndex = res.tapIndex;
        var dateDuring = '';
        var dateRangeText = '全部';
        
        switch (tapIndex) {
          case 0: // 全部
            dateRangeText = '全部';
            dateDuring = '';
            break;
          case 1: // 近7天
            dateRangeText = '近7天';
            dateDuring = '7';
            break;
          case 2: // 近30天
            dateRangeText = '近30天';
            dateDuring = '30';
            break;
          case 3: // 近90天
            dateRangeText = '近90天';
            dateDuring = '90';
            break;
          case 4: // 自定义
            dateRangeText = '自定义';
            dateDuring = 'custom';
            that._showCustomDatePicker();
            return;
        }
        
        that.setData({
          dateRangeText: dateRangeText,
          dateDuring: dateDuring
        });
        that._loadData();
      }
    });
  },

  _showCustomDatePicker: function () {
    var that = this;
    var now = new Date();
    var halfYearAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    
    wx.navigateTo({
      url: '/pages/common/selectDate/selectDate?startDate=' + that._formatDate(halfYearAgo) + 
           '&stopDate=' + that._formatDate(now) + '&dateType=day&mode=single&callback=selectDateCallback'
    });
    
    // 监听选择日期回调
    wx.eventCenter.once('selectDateCallback', function (dateRange) {
      if (dateRange) {
        that.setData({
          dateRangeText: dateRange.name || '自定义',
          dateDuring: 'custom',
          customStartDate: dateRange.startDate,
          customStopDate: dateRange.stopDate
        });
        that._loadData();
      }
    });
  },

  _formatDate: function (date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  },

  // 阻止冒泡
  stopBubble: function () {},

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  }
});
