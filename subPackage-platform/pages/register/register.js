var platformRegister = require('../../services/platformRegister');
var platformSession = require('../../services/platformSession');
var platformConfig = require('../../config');
var routes = require('../../utils/routes');

Page({
  data: {
    restaurantName: '',
    phone: '',
    address: '',
    avatarUrl: '',
    agreed: false,
    showTerms: false,
    canRegister: false,
    code: '',
  },

  onLoad: function (options) {
    this._returnBackAfterRegister = !!(options && options.from === 'goods');
    this._refreshWxLoginCode();
  },

  onShow: function () {
    if (platformSession.isLoggedIn()) {
      this._finishRegisterNavigation();
    }
  },

  _finishRegisterNavigation: function () {
    if (this._returnBackAfterRegister) {
      wx.navigateBack();
      return;
    }
    wx.redirectTo({ url: routes.HOME });
  },

  onRestaurantNameInput: function (e) {
    var value = e.detail.value;
    this.setData({ restaurantName: value });
    this._updateCanRegister(value, this.data.agreed);
  },

  onPhoneInput: function (e) {
    this.setData({ phone: e.detail.value });
  },

  onAddressInput: function (e) {
    this.setData({ address: e.detail.value });
  },

  onAgreementChange: function (e) {
    var checked = e.detail.value.indexOf('agree') >= 0;
    this.setData({ agreed: checked });
    this._updateCanRegister(this.data.restaurantName, checked);
  },

  showTermsModal: function () {
    this.setData({ showTerms: true });
  },

  hideTermsModal: function () {
    this.setData({ showTerms: false });
  },

  preventClose: function () {},

  onChooseAvatar: function (e) {
    var that = this;
    var avatarUrl = e.detail.avatarUrl;

    if (!that.data.restaurantName.trim()) {
      wx.showToast({ title: '请输入餐厅名称', icon: 'none' });
      return;
    }
    if (!that.data.phone.trim()) {
      wx.showToast({ title: '请输入联系电话', icon: 'none' });
      return;
    }
    if (!that.data.agreed) {
      wx.showToast({ title: '请先阅读并同意注册条款', icon: 'none' });
      return;
    }
    if (!that.data.code) {
      that._refreshWxLoginCode();
      wx.showToast({ title: '请重新点击提交', icon: 'none' });
      return;
    }

    that.setData({ avatarUrl: avatarUrl });
    wx.showLoading({ title: '注册京采饭店', mask: true });

    platformRegister.registerWithFile(
      avatarUrl,
      that.data.restaurantName.trim(),
      that.data.code,
      that.data.phone.trim(),
      that.data.address.trim(),
      platformConfig.DEFAULT_MARKET_ID
    ).then(function (res) {
      wx.hideLoading();
      var body = platformSession.parseBody(res);
      if (body && body.code === 0 && body.data) {
        platformSession.saveLoginSession(body.data);
        that._finishRegisterNavigation();
        return;
      }
      wx.showToast({ title: (body && body.msg) ? body.msg : '注册失败', icon: 'none' });
      that._refreshWxLoginCode();
    }).catch(function (err) {
      wx.hideLoading();
      console.error('[platform/register]', err);
      wx.showToast({ title: '网络异常', icon: 'none' });
      that._refreshWxLoginCode();
    });
  },

  _refreshWxLoginCode: function () {
    var that = this;
    wx.login({
      success: function (res) {
        that.setData({ code: res.code });
      },
    });
  },

  _updateCanRegister: function (restaurantName, agreed) {
    this.setData({ canRegister: restaurantName.trim().length > 0 && agreed });
  },
});
