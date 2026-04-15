/**
 * 餐厅经营看板页面（游戏化天平设计）
 * 展示日均收入/支出天平、经营健康度、月度预测、核心指标
 * 
 * 接口（来自 aiRevenue）:
 * 1. getRevenueStats(departmentId) - 获取营业额统计 + 画像数据
 */

var ai = require('../../../services/api');

var weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

Page({

  data: {
    navBarHeight: 0,
    isLoading: true,
    hasData: false,
    errorMsg: '',

    // 门店信息
    departmentId: 0,

    // 统计数据
    stats: null,
    profile: null,

    // 计算后的展示数据
    statusClass: '',
    statusText: '',
    statusLabel: '',

    // 收入端
    avgDailyRevenue: 0,
    avgDineInRevenue: 0,
    avgTakeoutRevenue: 0,
    dineInRatio: 0,

    // 支出端
    avgFixedCost: 0,
    dailyWage: 0,
    dailyRent: 0,
    avgPlatformFee: 0,

    // 健康度
    profitMargin: 0,
    healthPercent: 0,
    healthColor: '#38ef7d',
    safetyLevel: 'safe',
    safetyText: '安全',
    safetyDesc: '状态良好',
    riskMultiple: 0,
    isProfit: true,

    // 月度预测
    dateStr: '',
    weekdayStr: '',
    monthProgress: 0,
    daysPassed: 0,
    monthDays: 0,
    currentMonth: 0,
    estimatedMonthProfit: 0,
    vsIndustryPercent: 0,

    // 核心指标
    staffCount: 0,
    seatCount: 0,
    competitorCount: 0,
    avgPrice: 0,

    // 盈亏分析
    totalRevenue: 0,
    totalNetRevenue: 0,
    dailyNetRevenue: 0,
    breakEvenPoint: 0,
    dailyProfit: 0,
    days: 0,

    // 成本明细
    produceCost: 0,      // 生产成本
    wasteCost: 0,        // 损耗成本
    lossCost: 0,         // 损失成本
    returnCost: 0,       // 退货成本
    productionCost: 0,   // 制作成本
    totalCost: 0,       // 总成本

    // 动画
    animReady: false,
  },

  // ========================
  // 生命周期
  // ========================

  onLoad: function () {
    var globalData = getApp().globalData;
    var navBarHeight = globalData.statusBarHeight + (globalData.menuButtonInfo.height + (globalData.menuButtonInfo.top - globalData.statusBarHeight) * 2);

    this.setData({
      navBarHeight: navBarHeight * globalData.rpxR,
    });

    var mendianInfo = wx.getStorageSync('mendianInfo');
    if (mendianInfo) {
      this.setData({ departmentId: mendianInfo.gbDepartmentId });
      this.loadData();
    } else {
      var userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        this.setData({ departmentId: userInfo.gbDuDepartmentId || userInfo.gbDepartmentId });
        this.loadData();
      } else {
        this.setData({ isLoading: false, errorMsg: '无法获取门店信息' });
      }
    }
  },

  onShow: function () {
    if (this.data.departmentId > 0) {
      this.loadData();
    }
  },

  // ========================
  // 数据加载
  // ========================

  loadData: function () {
    var that = this;
    this.setData({ isLoading: true });

    console.log('[看板] departmentId =', this.data.departmentId);

    ai.getRevenueStats(this.data.departmentId)
      .then(function (res) {
        console.log('[看板] 接口返回 res =', res);
        console.log('[看板] res.result =', res.result);
        if (res.result.code == 0 && res.result.stats) {
          var stats = res.result.stats;
          var profile = res.result.profile;
          console.log('[看板] stats =', stats);
          console.log('[看板] profile =', profile);

          var calcData = that.calcDashboard(stats, profile);
          Object.assign(calcData, {
            stats: stats,
            profile: profile,
            hasData: true,
            isLoading: false,
          });

          that.setData(calcData);

          setTimeout(function () {
            that.setData({ animReady: true });
          }, 300);
        } else {
          console.log('[看板] code != 0 或 stats 为空, res.result =', res.result);
          that.setData({
            isLoading: false,
            hasData: false,
            errorMsg: res.result.msg || '暂无数据',
          });
        }
      })
      .catch(function (err) {
        console.log('[看板] 请求异常 err =', err);
        that.setData({ isLoading: false, errorMsg: '加载失败' });
      });
  },

  // ========================
  // 数据计算
  // ========================

  calcDashboard: function (stats, profile) {
    var avgDailyRevenue = parseFloat(stats.avgDailyRevenue) || 0;
    var avgTakeoutRevenue = parseFloat(stats.avgTakeoutRevenue) || 0;
    var avgDineInRevenue = avgDailyRevenue - avgTakeoutRevenue;  // 堂食 = 日均 - 外卖
    var dineInRatio = avgDailyRevenue > 0 ? Math.round(avgDineInRevenue / avgDailyRevenue * 100) : 0;  // 堂食占比
    var avgFixedCost = parseFloat(stats.avgFixedCost) || 0;
    var avgNetRevenue = parseFloat(stats.avgNetRevenue) || 0;
    var totalRevenue = parseFloat(stats.totalRevenue) || 0;
    var totalNetRevenue = parseFloat(stats.profitAmount) || parseFloat(stats.totalNetRevenue) || 0;
    var breakEvenPoint = parseFloat(stats.breakEvenPoint) || 0;
    var avgPlatformFee = parseFloat(stats.productionCost) || 0;  // 用 productionCost 作为成本参考

    var monthlyWage = parseFloat(profile.gbAiRestaurantProfileMonthlyWage) || parseFloat(profile.monthlyWage) || 0;
    var rentMonthly = parseFloat(profile.gbAiRestaurantProfileRentMonthly) || parseFloat(profile.rentMonthly) || 0;
    var avgPrice = parseFloat(stats.avgPerCustomer) || parseFloat(profile.avgPrice) || 0;
    var staffCount = parseInt(profile.gbAiRestaurantProfileStaffCount) || parseInt(profile.staffCount) || 0;
    var seatCount = parseInt(profile.gbAiRestaurantProfileSeatCount) || parseInt(profile.seatCount) || 0;
    var competitorCount = parseInt(profile.gbAiRestaurantProfileCompetitorCount) || parseInt(profile.nearbyCompetitorCount) || 0;

    var statusClass = 'status-' + (stats.status || 'breakeven');
    var statusText = stats.statusDesc || '未知';
    var statusLabel = '';
    if (stats.status === 'profit') statusLabel = '盈利中';
    else if (stats.status === 'loss') statusLabel = '亏损中';
    else statusLabel = '保本中';

    var profitMargin = avgDailyRevenue > 0
      ? ((avgNetRevenue - avgFixedCost) / avgDailyRevenue * 100)
      : 0;
    profitMargin = Math.round(profitMargin * 10) / 10;

    var dailyProfit = avgNetRevenue - avgFixedCost;
    dailyProfit = Math.round(dailyProfit * 100) / 100;
    var isProfit = dailyProfit >= 0;

    var healthPercent = Math.min(Math.max(profitMargin / 15 * 100, 0), 100);

    var healthColor = '#38ef7d';
    if (profitMargin < 1) healthColor = '#eb3349';
    else if (profitMargin < 5) healthColor = '#f45c43';
    else if (profitMargin < 10) healthColor = '#ffd700';

    var safetyLevel = 'safe';
    var safetyText = '安全';
    var safetyDesc = '状态良好';
    if (profitMargin < 1) {
      safetyLevel = 'critical'; safetyText = '濒危'; safetyDesc = '急需调整';
    } else if (profitMargin < 5) {
      safetyLevel = 'danger'; safetyText = '危险'; safetyDesc = '血量不足';
    } else if (profitMargin < 10) {
      safetyLevel = 'warning'; safetyText = '警戒'; safetyDesc = '需要关注';
    }

    var riskMultiple = avgFixedCost > 0 ? avgNetRevenue / avgFixedCost : 0;
    riskMultiple = Math.round(Math.abs(riskMultiple) * 10) / 10;

    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    var weekdayStr = weekdays[now.getDay()];
    var dateStr = year + '年' + month + '月' + day + '日';
    var monthDays = new Date(year, month, 0).getDate();
    var daysPassed = day;
    var monthProgress = Math.round(daysPassed / monthDays * 100);

    var estimatedMonthProfit = dailyProfit * monthDays;
    estimatedMonthProfit = Math.round(estimatedMonthProfit);
    var absEstimatedProfit = Math.abs(estimatedMonthProfit);

    var industryAvgMonthProfit = avgDailyRevenue * monthDays * 0.05;
    var vsIndustryPercent = 0;
    if (industryAvgMonthProfit > 0) {
      vsIndustryPercent = Math.round(estimatedMonthProfit / industryAvgMonthProfit * 100);
    }

    return {
      statusClass: statusClass,
      statusText: statusText,
      statusLabel: statusLabel,
      avgDailyRevenue: avgDailyRevenue,
      avgDineInRevenue: avgDineInRevenue,
      avgTakeoutRevenue: avgTakeoutRevenue,
      dineInRatio: dineInRatio,
      avgFixedCost: avgFixedCost,
      dailyWage: Math.round(monthlyWage / 30),
      dailyRent: Math.round(rentMonthly / 30),
      avgPlatformFee: avgPlatformFee,
      profitMargin: profitMargin,
      healthPercent: healthPercent,
      healthColor: healthColor,
      safetyLevel: safetyLevel,
      safetyText: safetyText,
      safetyDesc: safetyDesc,
      riskMultiple: riskMultiple,
      isProfit: isProfit,
      dateStr: dateStr,
      weekdayStr: weekdayStr,
      monthProgress: monthProgress,
      daysPassed: daysPassed,
      monthDays: monthDays,
      currentMonth: month,
      estimatedMonthProfit: estimatedMonthProfit,
      absEstimatedProfit: absEstimatedProfit,
      vsIndustryPercent: vsIndustryPercent,
      staffCount: staffCount,
      seatCount: seatCount,
      competitorCount: competitorCount,
      avgPrice: avgPrice,
      totalRevenue: totalRevenue,
      totalNetRevenue: totalNetRevenue,
      dailyNetRevenue: avgNetRevenue,
      breakEvenPoint: breakEvenPoint,
      dailyProfit: dailyProfit,
      days: stats.days || 0,

      // 成本明细
      produceCost: parseFloat(stats.produceCost) || 0,
      wasteCost: parseFloat(stats.wasteCost) || 0,
      lossCost: parseFloat(stats.lossCost) || 0,
      returnCost: parseFloat(stats.returnCost) || 0,
      productionCost: parseFloat(stats.productionCost) || 0,
      totalCost: parseFloat(stats.totalCost) || 0,
    };
  },

  // ========================
  // 页面跳转
  // ========================

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

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  },
});
