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
    invitationLookup: '',
    invitation: null,
    error: '',
  },

  onLoad: function (options) {
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR });
    var lookup = String(options.inviteToken || options.inviteCode || options.scene || '').trim();
    try { lookup = decodeURIComponent(lookup); } catch (ignore) {}
    this.setData({ invitationLookup: lookup });
    this.loadInvitation();
  },

  loadInvitation: function () {
    var that = this;
    this.fillLocalProfile();
    this.setData({ loading: true, error: '' });
    if (!this.data.invitationLookup) {
      api.bootstrapIdentity().then(function (identity) {
        if (hasInspectorRole(identity)) {
          that.fillLocalProfile(identity);
          that.setData({ loading: false, alreadyInspector: true });
          that.enterWorkspace();
          return;
        }
        that.setData({ loading: false, error: '请通过总部发送的区域巡店邀请进入，不能自行选择公司或区域。' });
      }).catch(function () {
        that.setData({ loading: false, error: '请通过总部发送的区域巡店邀请进入。' });
      });
      return;
    }
    api.getInspectorInvitationSummary(this.data.invitationLookup).then(function (invitation) {
      if (!invitation.acceptable) {
        that.setData({
          loading: false,
          invitation: invitation,
          error: invitation.invitationStatus === 'USED'
            ? '该邀请已经使用，不能再次加入。'
            : '该邀请已过期、撤销或所属区域已停用。',
        });
        return;
      }
      that.setData({
        loading: false,
        invitation: invitation,
        organizationName: invitation.companyName + ' · ' + invitation.brandName,
        storeScope: invitation.regionName,
      });
    }).catch(function (error) {
      that.setData({
        loading: false,
        error: error.message || '邀请信息加载失败，请联系总部重新发送',
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
    if (!this.data.invitation || !this.data.invitation.acceptable) {
      this.setData({
        registering: false,
        registerStage: '',
        error: '当前邀请不可使用，请联系总部重新发送。',
      });
      return;
    }
    api.acceptInspectorInvitation(this.data.invitationLookup, {
      userName: userName,
      avatarUrl: this.data.avatarUrl,
    }).then(function () {
      that.setData({ registerStage: '加入成功，正在加载区域权限…' });
      return api.getMe();
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

  retry: function () { this.loadInvitation(); },

  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
