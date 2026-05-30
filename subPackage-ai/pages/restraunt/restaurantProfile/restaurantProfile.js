/**
 * 餐厅经营看板
 *
 * 接口: getRevenueStats(departmentId, { startDate, endDate })
 * startDate/endDate 为 yyyy-MM-dd，可与日营收 department_id、核销 father_id 同区间对齐；不传则后端默认。
 * setData({ profile, dashboard, stats }) 与接口字段一致；
 * 页面展示以 dashboard 分模块为主，WXML 直接绑定路径，不在此拼装业务对象。
 */

var ai = require('../../../services/api');
var dateUtils = require('../../../../lib/dateUtil');

function buildStatsQuery(page) {
  var s = page.data.startDate;
  var e = page.data.stopDate;
  var q = {};
  if (s) q.startDate = s;
  if (e) q.endDate = e;
  return q;
}


Page({



  onShow() {

    if (this.data.update) {
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
          update: false,
        });
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
    var globalData = getApp().globalData;
    var navBarHeight = globalData.statusBarHeight + (globalData.menuButtonInfo.height + (globalData.menuButtonInfo.top - globalData.statusBarHeight) * 2);

    this.setData({
      navBarHeight: navBarHeight * globalData.rpxR,
    });
    

    var datePatch = {};
    var myDate = wx.getStorageSync('myDate');
    if (myDate) {
      var dateRange;
      if (myDate.name === 'custom') {
        dateRange = dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate);
      } else {
        dateRange = dateUtils.getDateRange(myDate.name);
      }
      datePatch = {
        startDate: dateRange.startDate,
        stopDate: dateRange.stopDate,
        dateType: myDate.dateType,
        hanzi: myDate.hanzi || dateRange.name,
      };
    } else {
      datePatch = {
        dateType: 'month',
        startDate: dateUtils.getFirstDateInMonth(),
        stopDate: dateUtils.getArriveDate(0),
        hanzi: '本月',
      };
    }

    var mendianInfo = wx.getStorageSync('mendianInfo');
    if (mendianInfo) {
      this.setData(Object.assign({ departmentId: mendianInfo.gbDepartmentId }, datePatch));
      this.loadData();
    } else {
      var userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        this.setData(
          Object.assign({ departmentId: userInfo.gbDuDepartmentId || userInfo.gbDepartmentId }, datePatch)
        );
        this.loadData();
      } else {
        this.setData(Object.assign({ isLoading: false, errorMsg: '无法获取门店信息' }, datePatch));
      }
    }
  },




  loadData: function () {
    var that = this;
    this.setData({ isLoading: true });

    ai.getRevenueStats(this.data.departmentId, buildStatsQuery(this))
      .then(function (res) {
        var r = res.result || {};
        console.log("rers", res.result)
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
        console.log('[restaurantProfile/getRevenueStats] request catch', err);
        that.setData({ isLoading: false, errorMsg: '加载失败' });
      });
  },

  toEditProfile: function () {
    wx.navigateTo({
      url: '/subPackage-ai/pages/restraunt/restaurantEdit/restaurantEdit',
    });
  },

  toAiChat: function () {
    wx.navigateTo({
      url: '/subPackage-ai/pages/ai/aiChat/aiChat',
    });
  },


  toDatePage() {
    console.log("dddfd")
    this.setData({
      update: true
    })
    wx.navigateTo({
      url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate +
        '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType,
    })
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  },
});
