/**
 * 餐厅画像页面 — 展示和编辑门店画像
 *
 * 接口: getAiProfile / updateAiProfile
 */

var load = require('../../../../lib/load.js');
var ai = require('../../../services/api');
var storeContext = require('../../../utils/storeContext');
var profileFormUtil = require('../../../utils/profileFormUtil');

Page({
  data: {
    navBarHeight: 0,
    windowWidth: 0,
    windowHeight: 0,
    isLoading: true,
    isEditing: false,
    hasProfile: false,

    departmentId: 0,
    departmentName: '',

    profile: null,
    formData: {},

    stageOptions: profileFormUtil.STAGE_OPTIONS,
    stageIndex: -1,
    riskOptions: profileFormUtil.RISK_OPTIONS,
    riskIndex: -1,
    decisionOptions: profileFormUtil.DECISION_OPTIONS,
    decisionIndex: -1,
    styleOptions: profileFormUtil.STYLE_OPTIONS,
    styleIndex: -1,
  },

  onLoad: function () {
    var globalData = getApp().globalData;
    this.setData({
      navBarHeight: storeContext.getNavBarHeightRpx(),
      windowWidth: wx.getWindowInfo().windowWidth * globalData.rpxR,
      windowHeight: wx.getWindowInfo().windowHeight * globalData.rpxR,
    });

    var store = storeContext.resolveStoreContext();
    if (store) {
      this.setData({
        departmentId: store.departmentId,
        departmentName: store.departmentName,
      });
      this.loadProfile();
    } else {
      this.setData({ isLoading: false });
      wx.showToast({ title: '无法获取门店信息', icon: 'none' });
    }
  },

  loadProfile: function () {
    var that = this;
    this.setData({ isLoading: true });

    ai.getAiProfile(this.data.departmentId)
      .then(function (res) {
        if (res.result.code == 0 && res.result.data) {
          that.setData({
            hasProfile: true,
            profile: res.result.data,
            isLoading: false,
          });
        } else {
          that.setData({
            hasProfile: false,
            profile: null,
            isLoading: false,
          });
        }
      })
      .catch(function (err) {
        console.error('[restaurantEdit] loadProfile failed', err);
        that.setData({ isLoading: false });
        wx.showToast({ title: '加载失败', icon: 'none' });
      });
  },

  toggleEdit: function () {
    if (this.data.isEditing) {
      this.setData({ isEditing: false });
      return;
    }

    var p = this.data.profile || {};
    var pickerOpts = {
      stageOptions: this.data.stageOptions,
      riskOptions: this.data.riskOptions,
      decisionOptions: this.data.decisionOptions,
      styleOptions: this.data.styleOptions,
    };
    var indexes = profileFormUtil.pickerIndexesFromProfile(p, pickerOpts);

    this.setData(Object.assign({
      isEditing: true,
      formData: profileFormUtil.profileToFormData(p),
    }, indexes));
  },

  onInput: function (e) {
    var field = e.currentTarget.dataset.field;
    var formData = this.data.formData;
    formData[field] = e.detail.value;
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

  saveProfile: function () {
    var that = this;
    var data = profileFormUtil.formToSubmitPayload(this.data.formData, this.data.profile, {
      departmentId: this.data.departmentId,
      stageIndex: this.data.stageIndex,
      riskIndex: this.data.riskIndex,
      decisionIndex: this.data.decisionIndex,
      styleIndex: this.data.styleIndex,
      stageOptions: this.data.stageOptions,
      riskOptions: this.data.riskOptions,
      decisionOptions: this.data.decisionOptions,
      styleOptions: this.data.styleOptions,
    });

    load.showLoading('保存中');
    ai.updateAiProfile(data)
      .then(function (res) {
        load.hideLoading();
        if (res.result.code == 0) {
          var profileData = res.result.data || data;
          that.setData({
            isEditing: false,
            hasProfile: true,
            profile: profileData,
          });
          wx.showToast({ title: '保存成功', icon: 'success' });
        } else {
          wx.showToast({ title: res.result.msg || '保存失败', icon: 'none' });
        }
      })
      .catch(function (err) {
        load.hideLoading();
        console.error('[restaurantEdit] saveProfile failed', err);
        wx.showToast({ title: '保存失败', icon: 'none' });
      });
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  },
});
