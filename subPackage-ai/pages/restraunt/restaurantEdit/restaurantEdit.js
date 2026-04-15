/**
 * 餐厅画像页面
 * 展示和编辑门店画像信息（基础信息、经营概况、目标客群、老板画像、经营约束）
 * 
 * 接口（来自 aiProfile）:
 * 1. getAiProfile(departmentId)  - 获取门店画像
 * 2. updateAiProfile(data)        - 更新门店画像
 */

var load = require('../../../../lib/load.js');
var ai = require('../../../services/api');

Page({

  data: {
    // 页面状态
    navBarHeight: 0,
    windowWidth: 0,
    windowHeight: 0,
    isLoading: true,
    isEditing: false,
    hasProfile: false,

    // 门店信息
    departmentId: 0,
    departmentName: '',

    // 画像数据
    profile: null,

    // 编辑表单
    formData: {},

    // 经营阶段选项
    stageOptions: ['新开业', '成长期', '成熟期', '衰退期'],
    stageIndex: -1,

    // 风险偏好选项
    riskOptions: ['保守型', '稳健型', '激进型'],
    riskIndex: -1,

    // 决策速度选项
    decisionOptions: ['慢（需多次沟通）', '中（1-3天决定）', '快（当场决定）'],
    decisionIndex: -1,

    // 沟通风格选项
    styleOptions: ['直接型', '细节型', '关系型', '数据型'],
    styleIndex: -1,
  },

  // ========================
  // 生命周期
  // ========================

  onLoad: function (options) {
    var globalData = getApp().globalData;
    var navBarHeight = globalData.statusBarHeight + (globalData.menuButtonInfo.height + (globalData.menuButtonInfo.top - globalData.statusBarHeight) * 2);

    this.setData({
      navBarHeight: navBarHeight * globalData.rpxR,
      windowWidth: wx.getWindowInfo().windowWidth * globalData.rpxR,
      windowHeight: wx.getWindowInfo().windowHeight * globalData.rpxR,
    });

    var mendianInfo = wx.getStorageSync('mendianInfo');
    if (mendianInfo) {
      this.setData({
        departmentId: mendianInfo.gbDepartmentId,
        departmentName: mendianInfo.gbDepartmentName || '门店',
      });
      this.loadProfile();
    } else {
      // 尝试从 userInfo 获取
      var userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        this.setData({
          departmentId: userInfo.gbDuDepartmentId || userInfo.gbDepartmentId,
          departmentName: userInfo.gbDuDepartmentName || '门店',
        });
        this.loadProfile();
      } else {
        this.setData({ isLoading: false });
        wx.showToast({ title: '无法获取门店信息', icon: 'none' });
      }
    }
  },

  // ========================
  // 数据加载
  // ========================

  /** 加载门店画像 */
  loadProfile: function () {
    var that = this;
    this.setData({ isLoading: true });

    ai.getAiProfile(this.data.departmentId)
      .then(function (res) {
        if (res.result.code == 0 && res.result.data) {
          // 直接使用获取到的餐厅画像对象
          var profileData = res.result.data;
          console.log('=== 餐厅画像数据 ===');
          console.log('原始数据:', profileData);
          console.log('====================');

          that.setData({
            hasProfile: true,
            profile: profileData,
            isLoading: false,
          });
        } else {
          // 画像不存在，进入创建模式
          that.setData({
            hasProfile: false,
            profile: null,
            isLoading: false,
          });
        }
      })
      .catch(function (err) {
        console.error('加载门店画像失败:', err);
        that.setData({ isLoading: false });
        wx.showToast({ title: '加载失败', icon: 'none' });
      });
  },

  // ========================
  // 编辑模式
  // ========================

  /** 切换编辑/查看模式 */
  toggleEdit: function () {
    if (this.data.isEditing) {
      // 退出编辑，不保存
      this.setData({ isEditing: false });
      return;
    }

    // 进入编辑模式，初始化表单数据
    var p = this.data.profile || {};
    var formData = {
      restaurantName: p.gbAiRestaurantProfileRestaurantName || '',
      cuisineType: p.gbAiRestaurantProfileCuisineType || '',
      address: p.gbAiRestaurantProfileAddress || '',
      businessDistrict: p.gbAiRestaurantProfileBusinessDistrict || '',
      businessHours: p.gbAiRestaurantProfileBusinessHours || '',
      avgPrice: p.gbAiRestaurantProfileAvgPrice ? String(p.gbAiRestaurantProfileAvgPrice) : '',
      seatCount: p.gbAiRestaurantProfileSeatCount ? String(p.gbAiRestaurantProfileSeatCount) : '',
      followerCount: p.gbAiRestaurantProfileFollowerCount ? String(p.gbAiRestaurantProfileFollowerCount) : '',
      dailyCustomers: p.gbAiRestaurantProfileDailyCustomers ? String(p.gbAiRestaurantProfileDailyCustomers) : '',
      dailyRevenue: p.gbAiRestaurantProfileDailyRevenue ? String(p.gbAiRestaurantProfileDailyRevenue) : '',
      targetAgeRange: p.gbAiRestaurantProfileTargetAgeRange || '',
      targetConsumer: p.gbAiRestaurantProfileTargetConsumer || '',
      bossName: p.gbAiRestaurantProfileBossName || '',
      costSensitive: p.gbAiRestaurantProfileCostSensitive ? String(p.gbAiRestaurantProfileCostSensitive) : '3',
      kitchenCapacity: p.gbAiRestaurantProfileKitchenCapacity ? String(p.gbAiRestaurantProfileKitchenCapacity) : '3',
      staffCount: p.gbAiRestaurantProfileStaffCount ? String(p.gbAiRestaurantProfileStaffCount) : '',
      rentMonthly: p.gbAiRestaurantProfileRentMonthly ? String(p.gbAiRestaurantProfileRentMonthly) : '',
      monthlyWage: p.gbAiRestaurantProfileMonthlyWage ? String(p.gbAiRestaurantProfileMonthlyWage) : '',
      monthlyFixedCost: p.gbAiRestaurantProfileMonthlyFixedCost ? String(p.gbAiRestaurantProfileMonthlyFixedCost) : '',
    };

    // 设置 picker 索引
    var stageIndex = -1;
    var riskIndex = -1;
    var decisionIndex = -1;
    var styleIndex = -1;

    if (p.gbAiRestaurantProfileBusinessStage) {
      stageIndex = this.data.stageOptions.indexOf(p.gbAiRestaurantProfileBusinessStage);
    }
    if (p.gbAiRestaurantProfileRiskPreference) {
      riskIndex = this.data.riskOptions.indexOf(p.gbAiRestaurantProfileRiskPreference);
    }
    if (p.gbAiRestaurantProfileDecisionSpeed) {
      decisionIndex = this.data.decisionOptions.indexOf(p.gbAiRestaurantProfileDecisionSpeed);
    }
    if (p.gbAiRestaurantProfileBossStyle) {
      styleIndex = this.data.styleOptions.indexOf(p.gbAiRestaurantProfileBossStyle);
    }

    this.setData({
      isEditing: true,
      formData: formData,
      stageIndex: stageIndex,
      riskIndex: riskIndex,
      decisionIndex: decisionIndex,
      styleIndex: styleIndex,
    });
  },

  // ========================
  // 表单输入
  // ========================

  onInput: function (e) {
    var field = e.currentTarget.dataset.field;
    var value = e.detail.value;
    var formData = this.data.formData;
    formData[field] = value;
    this.setData({ formData: formData });
  },

  onStageChange: function (e) {
    this.setData({ stageIndex: e.detail.value });
  },

  onRiskChange: function (e) {
    this.setData({ riskIndex: e.detail.value });
  },

  onDecisionChange: function (e) {
    this.setData({ decisionIndex: e.detail.value });
  },

  onStyleChange: function (e) {
    this.setData({ styleIndex: e.detail.value });
  },

  // ========================
  // 保存画像
  // ========================

  /** 保存画像 */
  saveProfile: function () {
    var that = this;
    var formData = this.data.formData;
    var profile = this.data.profile || {};

    // 构造提交数据，传递完整的餐厅画像对象
    var data = {
      gbAiRestaurantProfileId: profile.gbAiRestaurantProfileId || profile.id,
      gbAiRestaurantProfileDepartmentId: this.data.departmentId,
      gbAiRestaurantProfileRestaurantName: formData.restaurantName,
      gbAiRestaurantProfileCuisineType: formData.cuisineType,
      gbAiRestaurantProfileAddress: formData.address,
      gbAiRestaurantProfileBusinessDistrict: formData.businessDistrict,
      gbAiRestaurantProfileBusinessHours: formData.businessHours,
      gbAiRestaurantProfileAvgPrice: formData.avgPrice ? Number(formData.avgPrice) : null,
      gbAiRestaurantProfileSeatCount: formData.seatCount ? Number(formData.seatCount) : null,
      gbAiRestaurantProfileFollowerCount: formData.followerCount ? Number(formData.followerCount) : 0,
      gbAiRestaurantProfileDailyCustomers: formData.dailyCustomers ? Number(formData.dailyCustomers) : null,
      gbAiRestaurantProfileDailyRevenue: formData.dailyRevenue ? Number(formData.dailyRevenue) : null,
      gbAiRestaurantProfileTargetAgeRange: formData.targetAgeRange,
      gbAiRestaurantProfileTargetConsumer: formData.targetConsumer,
      gbAiRestaurantProfileBossName: formData.bossName,
      gbAiRestaurantProfileCostSensitive: formData.costSensitive ? Number(formData.costSensitive) : 3,
      gbAiRestaurantProfileKitchenCapacity: formData.kitchenCapacity ? Number(formData.kitchenCapacity) : 3,
      gbAiRestaurantProfileStaffCount: formData.staffCount ? Number(formData.staffCount) : null,
      gbAiRestaurantProfileRentMonthly: formData.rentMonthly ? Number(formData.rentMonthly) : null,
      gbAiRestaurantProfileMonthlyWage: formData.monthlyWage ? Number(formData.monthlyWage) : null,
      gbAiRestaurantProfileMonthlyFixedCost: formData.monthlyFixedCost ? Number(formData.monthlyFixedCost) : null,
    };

    // picker 选项值
    if (this.data.stageIndex >= 0) {
      data.gbAiRestaurantProfileBusinessStage = this.data.stageOptions[this.data.stageIndex];
    }
    if (this.data.riskIndex >= 0) {
      data.gbAiRestaurantProfileRiskPreference = this.data.riskOptions[this.data.riskIndex];
    }
    if (this.data.decisionIndex >= 0) {
      data.gbAiRestaurantProfileDecisionSpeed = this.data.decisionOptions[this.data.decisionIndex];
    }
    if (this.data.styleIndex >= 0) {
      data.gbAiRestaurantProfileBossStyle = this.data.styleOptions[this.data.styleIndex];
    }

    load.showLoading('保存中');
    ai.updateAiProfile(data)
      .then(function (res) {
        load.hideLoading();
        if (res.result.code == 0) {
          // 反序列化响应数据并更新页面
          var profileData = res.result.data || data;
          var deserializedData = JSON.parse(JSON.stringify(profileData));
          that.setData({
            isEditing: false,
            hasProfile: true,
            profile: deserializedData,
          });
          wx.showToast({ title: '保存成功', icon: 'success' });
        } else {
          wx.showToast({ title: res.result.msg || '保存失败', icon: 'none' });
        }
      })
      .catch(function (err) {
        load.hideLoading();
        console.error('保存失败:', err);
        wx.showToast({ title: '保存失败', icon: 'none' });
      });
  },

  // ========================
  // 工具方法
  // ========================

  /** 返回上一页 */
  toBack: function () {
    wx.navigateBack({ delta: 1 });
  },

});
