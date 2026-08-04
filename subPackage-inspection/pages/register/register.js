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
    userName: '—',
    phone: '未填写',
    organizationName: '未获取到所属组织',
    storeScope: '由后台按现有组织关系确定',
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
      that.setData({
        loading: false,
        alreadyInspector: hasInspectorRole(identity),
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
      : (departmentName || distributerName || '未获取到所属组织');
    this.setData({
      userName: textOrFallback(identity && identity.userName, textOrFallback(user.gbDuWxNickName, '—')),
      phone: textOrFallback(user.gbDuWxPhone, '未填写'),
      organizationName: organization,
      storeScope: departmentName || '由后台按现有组织关系确定',
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
    api.registerInspector().then(function () {
      return api.getMe();
    }).then(function (identity) {
      if (!hasInspectorRole(identity)) {
        return Promise.reject({
          inspectionError: true,
          status: 409,
          errorCode: 'INSPECTOR_ROLE_NOT_EFFECTIVE',
          message: '后台已响应注册，但刷新身份后仍未获得巡店员角色',
        });
      }
      that.setData({ registering: false, alreadyInspector: true });
      wx.showToast({ title: '巡店员注册成功', icon: 'success' });
      setTimeout(function () { that.enterWorkspace(); }, 600);
    }).catch(function (error) {
      var missingContract = Number(error && error.status) === 404;
      that.setData({
        registering: false,
        error: missingContract
          ? '当前后台尚未提供巡店员角色注册接口，前端没有伪造注册结果。'
          : (error.message || '巡店员注册失败，请稍后重试'),
      });
    });
  },

  enterWorkspace: function () {
    wx.redirectTo({ url: '/subPackage-inspection/pages/home/home' });
  },

  retry: function () { this.loadProfile(); },

  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
