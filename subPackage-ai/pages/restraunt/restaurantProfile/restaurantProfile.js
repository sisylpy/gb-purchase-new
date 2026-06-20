/**
 * 餐厅经营看板
 *
 * 接口: getRevenueStats(departmentId, { startDate, endDate })
 */

var ai = require('../../../services/api');
var dateUtils = require('../../../../lib/dateUtil');
var storeContext = require('../../../utils/storeContext');
var dateRangeUtil = require('../../../utils/dateRangeUtil');

Page({
  data: {
    navBarHeight: 0,
    isLoading: true,
    hasData: false,
    errorMsg: '',
    departmentId: 0,

    profile: null,
    dashboard: null,
    stats: null,

    startDate: '',
    stopDate: '',
    dateType: 'month',
    hanzi: '本月',
    update: false,

    animReady: false,
  },

  onLoad: function () {
    this.setData({ navBarHeight: storeContext.getNavBarHeightRpx() });

    var datePatch = dateRangeUtil.datePatchFromStorage(dateUtils);
    var store = storeContext.resolveStoreContext();

    if (store) {
      this.setData(Object.assign({ departmentId: store.departmentId }, datePatch));
      this.loadData();
    } else {
      this.setData(Object.assign({ isLoading: false, errorMsg: '无法获取门店信息' }, datePatch));
    }
  },

  onShow: function () {
    if (this.data.update) {
      var myDate = wx.getStorageSync('myDate');
      if (myDate) {
        this.setData(Object.assign({ update: false }, dateRangeUtil.datePatchFromStorage(dateUtils)));
      }
      if (this.data.departmentId > 0) {
        this.loadData();
      }
      return;
    }

    if (this.data.departmentId > 0) {
      this.loadData();
    }
  },

  loadData: function () {
    var that = this;
    this.setData({ isLoading: true, animReady: false });

    ai.getRevenueStats(this.data.departmentId, dateRangeUtil.buildStatsQuery(this))
      .then(function (res) {
        var r = res.result || {};
        var ok = r.code == 0 && (r.stats != null || r.dashboard != null);
        if (!ok) {
          that.setData({
            isLoading: false,
            hasData: false,
            errorMsg: r.msg || '暂无数据',
            profile: null,
            dashboard: null,
            stats: null,
          });
          return;
        }

        that.setData({
          profile: r.profile || null,
          dashboard: r.dashboard || null,
          stats: r.stats || null,
          hasData: true,
          isLoading: false,
        });

        setTimeout(function () {
          that.setData({ animReady: true });
        }, 300);
      })
      .catch(function (err) {
        console.error('[restaurantProfile] getRevenueStats failed', err);
        that.setData({ isLoading: false, errorMsg: '加载失败' });
      });
  },

  toEditProfile: function () {
    wx.navigateTo({
      url: '/subPackage-ai/pages/restraunt/restaurantEdit/restaurantEdit',
    });
  },

  toDatePage: function () {
    this.setData({ update: true });
    wx.navigateTo({
      url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate +
        '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType,
    });
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  },
});
