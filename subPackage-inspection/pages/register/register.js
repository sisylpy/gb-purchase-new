var app = getApp();
var api = require('../../../services/franchiseInspection');

function hasInspectorRole(identity) {
  return !!identity && (identity.roleCodes || []).indexOf('INSPECTOR') >= 0;
}

function textOrFallback(value, fallback) {
  var text = value === null || typeof value === 'undefined' ? '' : String(value).trim();
  return text || fallback;
}

Page({
  data: {
    navBarHeight: 0,
    loading: true,
    registering: false,
    alreadyInspector: false,
    navigating: false,
    userName: '',
    avatarUrl: '',
    registerStage: '',
    phone: '暂无',
    organizationName: '暂无',
    storeScope: '暂无',
    error: '',
  },

  onLoad: function () {
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR });
    this.loadProfile();
  },

  loadProfile: function () {
    var that = this;
    this.fillLocalProfile();
    this.setData({ loading: true, error: '' });
    api.bootstrapIdentity().then(function (identity) {
      that.fillLocalProfile(identity);
      if (hasInspectorRole(identity)) {
        that.setData({ loading: false, alreadyInspector: true });
        that.enterWorkspace();
        return;
      }
      that.setData({
        loading: false,
        alreadyInspector: false,
      });
    }).catch(function (error) {
      if (error && ['FRANCHISE_ROLE_MISSING', 'AUTH_REQUIRED', 'TOKEN_INVALID', 'TOKEN_EXPIRED'].indexOf(error.errorCode) >= 0) {
        that.setData({ loading: false, alreadyInspector: false, error: '' });
        return;
      }
      that.setData({
        loading: false,
        error: error.message || '当前登录身份加载失败，请稍后重试',
      });
    });
  },

  fillLocalProfile: function (identity) {
    var user = wx.getStorageSync('userInfo') || {};
    var department = wx.getStorageSync('mendianInfo') || wx.getStorageSync('orderDepInfo') || {};
    var distributer = wx.getStorageSync('disInfo') || {};
    var distributerName = textOrFallback(distributer.gbDistributerName, '');
    var departmentName = textOrFallback(department.gbDepartmentName, '');
    var organization = distributerName && departmentName && distributerName !== departmentName
      ? distributerName + ' · ' + departmentName
      : (departmentName || distributerName || '暂无');
    this.setData({
      userName: textOrFallback(identity && identity.userName, textOrFallback(user.gbDuWxNickName, this.data.userName)),
      avatarUrl: textOrFallback(user.gbDuWxAvartraUrl, this.data.avatarUrl),
      phone: textOrFallback(user.gbDuWxPhone, '暂无'),
      organizationName: organization,
      storeScope: departmentName || '暂无',
    });
  },

  onUserNameInput: function (event) {
    this.setData({ userName: event.detail.value, error: '' });
  },

  registerInspector: function () {
    if (this.data.registering) return;
    if (this.data.alreadyInspector) {
      this.enterWorkspace();
      return;
    }
    var userName = String(this.data.userName || '').trim();
    if (!userName) {
      this.setData({ error: '请填写巡店员姓名' });
      return;
    }
    var that = this;
    this.setData({ registering: true, registerStage: '正在提交巡店员注册…', error: '' });
    api.registerInspector({
      userName: userName,
      avatarUrl: this.data.avatarUrl,
    }).then(function () {
      that.setData({ registerStage: '注册成功，正在重新微信登录…' });
      return api.refreshIdentity();
    }).then(function (identity) {
      if (!hasInspectorRole(identity)) {
        throw { inspectionError: true, status: 403, errorCode: 'INSPECTOR_ROLE_NOT_EFFECTIVE', message: '重新登录后未获取到巡店员身份，请联系管理员' };
      }
      that.fillLocalProfile(identity);
      that.setData({ registering: false, registerStage: '', alreadyInspector: true });
      that.enterWorkspace();
    }).catch(function (error) {
      that.setData({
        registering: false,
        registerStage: '',
        error: error.message || '巡店员注册失败，请稍后重试',
      });
    });
  },

  enterWorkspace: function () {
    if (this.data.navigating) return;
    this.setData({ navigating: true });
    var that = this;
    wx.redirectTo({
      url: '/subPackage-inspection/pages/home/home',
      fail: function () {
        that.setData({ navigating: false, error: '工作台打开失败，请重试' });
      },
    });
  },

  retry: function () { this.loadProfile(); },

  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
