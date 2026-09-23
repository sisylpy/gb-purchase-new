const globalData = getApp().globalData;
var franchiseApi = require('../../services/franchiseInspection');

var FRANCHISEE_OWNER_ROLE = 'FRANCHISEE_OWNER';
var STORE_MANAGER_ROLE = 'STORE_MANAGER';

function roleView(summary, relayMode) {
  var targetRole = String(summary && summary.targetRole || '').trim().toUpperCase();
  var owner = targetRole === FRANCHISEE_OWNER_ROLE;
  var storeCount = Number(summary && summary.storeCount || 0);
  var subjectName = owner
    ? (summary.franchiseeBusinessName || '加盟经营主体')
    : (summary.storeName || '门店');
  var roleName = owner ? '经营主体负责人' : '门店店长';
  return {
    targetRole: targetRole,
    owner: owner,
    navTitle: (relayMode ? '邀请' : '') + roleName + (relayMode ? '' : '注册'),
    subjectName: subjectName,
    scopeText: owner ? '管理 ' + storeCount + ' 家门店' : '仅负责本店',
    relayTip: owner
      ? '把注册链接发送给该经营主体负责人。对方注册后，可以管理该经营主体下的 ' + storeCount + ' 家门店。'
      : '把注册链接发送给本店店长。对方注册后只负责本店，不会获得其他门店权限。',
    acceptTip: owner
      ? '注册完成后，你将作为该经营主体负责人进入精彩账本，可以查看全部 ' + storeCount + ' 家门店，也可以切换到单店视角。'
      : '注册完成后，你将作为本店店长进入精彩账本，仅负责本店的日常经营与整改任务。',
    shareButtonText: '邀请' + roleName,
    inputPlaceholder: owner ? '请输入负责人姓名' : '请输入店长姓名',
    acceptButtonText: owner ? '确认注册并管理门店' : '确认注册并进入本店',
  };
}

Page({
  data: {
    lookup: '',
    lookupParam: 'inviteToken',
    loading: true,
    saving: false,
    summary: null,
    roleView: {
      targetRole: '',
      owner: false,
      navTitle: '确认邀请',
    },
    userName: '',
    error: '',
    relayMode: false,
  },

  onLoad: function (options) {
    var lookup = String(options.inviteToken || options.inviteCode || options.scene || '').trim();
    var relayMode = String(options.relay || '') === '1';
    var lookupParam = options.inviteToken ? 'inviteToken' : options.inviteCode ? 'inviteCode' : 'scene';
    this.setData({
      lookup: lookup,
      lookupParam: lookupParam,
      relayMode: relayMode,
      roleView: Object.assign({}, this.data.roleView, {
        navTitle: relayMode ? '邀请成员' : '确认邀请',
      }),
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
    });
    if (!lookup) {
      this.setData({ loading: false, error: '邀请无效' });
      return;
    }
    this.loadSummary();
  },

  loadSummary: function () {
    var that = this;
    this.setData({ loading: true, error: '' });
    franchiseApi.getRoleInvitationSummary(this.data.lookup).then(function (summary) {
      var view = roleView(summary, that.data.relayMode);
      if (view.targetRole !== FRANCHISEE_OWNER_ROLE && view.targetRole !== STORE_MANAGER_ROLE) {
        return Promise.reject({ message: '该邀请的角色无法识别，请联系管理员重新生成' });
      }
      that.setData({ loading: false, summary: summary, roleView: view });
    }).catch(function (error) {
      that.setData({ loading: false, error: error.message || '邀请信息加载失败' });
    });
  },

  inputName: function (event) {
    this.setData({ userName: event.detail.value, error: '' });
  },

  accept: function () {
    if (this.data.saving || !this.data.summary || !this.data.summary.acceptable) return;
    var userName = String(this.data.userName || '').trim();
    if (!userName) {
      this.setData({ error: this.data.roleView.owner ? '请输入负责人姓名' : '请输入店长姓名' });
      return;
    }
    var that = this;
    this.setData({ saving: true, error: '' });
    wx.showLoading({ title: '正在接受邀请' });
    var acceptRequest = this.data.roleView.owner
      ? franchiseApi.acceptFranchiseeOwnerInvitation
      : franchiseApi.acceptStoreOwnerInvitation;
    acceptRequest(this.data.lookup, { userName: userName }).then(function () {
      wx.hideLoading();
      wx.showToast({ title: '注册成功', icon: 'success' });
      var targetPage = that.data.roleView.owner
        ? '/subPackage-inspection/pages/home/home'
        : '/pages/index/index';
      setTimeout(function () { wx.reLaunch({ url: targetPage }); }, 500);
    }).catch(function (error) {
      wx.hideLoading();
      that.setData({ saving: false, error: error.message || '注册失败，请重试' });
    });
  },

  onShareAppMessage: function () {
    var summary = this.data.summary || {};
    var title = this.data.roleView.owner
      ? (summary.franchiseeBusinessName || '加盟经营主体') + '邀请你成为经营主体负责人'
      : (summary.storeName || '门店') + '邀请你成为门店店长';
    return {
      title: title,
      path: '/pages/storeOwnerInvite/storeOwnerInvite?' + this.data.lookupParam + '=' + encodeURIComponent(this.data.lookup),
    };
  },

  toBack: function () {
    if (this.data.relayMode && wx.navigateBackMiniProgram) {
      wx.navigateBackMiniProgram();
      return;
    }
    wx.navigateBack({ delta: 1 });
  },
});
