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
    userName: '暂无',
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
      if (error && error.errorCode === 'FRANCHISE_ROLE_MISSING') {
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
      userName: textOrFallback(identity && identity.userName, textOrFallback(user.gbDuWxNickName, '暂无')),
      phone: textOrFallback(user.gbDuWxPhone, '暂无'),
      organizationName: organization,
      storeScope: departmentName || '暂无',
    });
  },

  registerInspector: function () {
    if (this.data.registering) return;
    if (this.data.alreadyInspector) {
      this.enterWorkspace();
      return;
    }
    var that = this;
    this.setData({ registering: true, error: '' });
    api.bootstrapIdentity().then(function (identity) {
      if (!hasInspectorRole(identity)) {
        throw new Error('当前账号尚未获得巡店员身份');
      }
      that.setData({ registering: false, alreadyInspector: true });
      that.enterWorkspace();
    }).catch(function (error) {
      var missingRole = error && error.errorCode === 'FRANCHISE_ROLE_MISSING';
      that.setData({
        registering: false,
        error: missingRole
          ? '当前后台尚未提供统一角色体系下的巡店员注册能力，页面不会伪造注册成功。'
          : (error.message || '当前身份校验失败，请稍后重试'),
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
