var load = require('../../../lib/load.js');
import apiUrl from '../../../config/index.js';
import {
  indexJrdhUserLoginJj,
  bindJrdhUserToNxDistributer,
  jrdhNxSellerRegisterWithFile
} from '../../../services/depOrder';

Page({
  data: {
    avatarUrl: '/images/user.png',
    nickName: '',
    canRegister: false,
    isLoading: true,
    isSellRegiste: false,
    bindSuccess: false,
    bindError: '',
    nxDisId: null,
    nxDisName: '',
  },

  onLoad: function (options) {
    var windowInfo = wx.getWindowInfo();
    var globalData = getApp().globalData;
    var nxDisName = options.nxDisName || '';
    try {
      nxDisName = decodeURIComponent(nxDisName);
    } catch (e) {}

    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      url: apiUrl.server,
      nxDisId: Number(options.nxDisId || options.disId),
      nxDisName: nxDisName,
      displayNxDisName: nxDisName || ('配送商 #' + Number(options.nxDisId || options.disId)),
    });

    if (!this.data.nxDisId) {
      this.setData({
        isLoading: false,
        bindError: '没有获取到配送商信息，请返回配送小程序后重新打开。',
      });
      return;
    }
    this._userLogin();
  },

  _userLogin: function () {
    var that = this;
    this.setData({ isLoading: true, bindError: '' });
    wx.login({
      success: function (loginRes) {
        indexJrdhUserLoginJj(loginRes.code)
          .then(function (res) {
            if (res.result.code === 0 && res.result.data && res.result.data.userInfo) {
              that._bindExistingUser(res.result.data.userInfo);
              return;
            }
            that.setData({
              isLoading: false,
              isSellRegiste: true,
              bindSuccess: false,
            });
          })
          .catch(function () {
            that.setData({
              isLoading: false,
              bindError: '登录失败，请稍后重试。',
            });
          });
      },
      fail: function () {
        that.setData({
          isLoading: false,
          bindError: '微信登录失败，请稍后重试。',
        });
      },
    });
  },

  _bindExistingUser: function (userInfo) {
    var that = this;
    var boundNxDisId = Number(userInfo.nxJrdhNxDistributerId || 0);
    if (boundNxDisId > 0 && boundNxDisId !== Number(this.data.nxDisId)) {
      this.setData({
        isLoading: false,
        bindError: '当前微信已经绑定了其他配送商，不能重复绑定。',
      });
      return;
    }

    if (boundNxDisId === Number(this.data.nxDisId)) {
      this._openSupplierHome(userInfo);
      return;
    }

    wx.login({
      success: function (loginRes) {
        bindJrdhUserToNxDistributer({
          code: loginRes.code,
          nxDisId: that.data.nxDisId,
        }).then(function (res) {
          if (res.result.code === 0) {
            that._openSupplierHome(res.result.data || userInfo);
          } else {
            that.setData({
              isLoading: false,
              bindError: res.result.msg || '绑定失败，请稍后重试。',
            });
          }
        }).catch(function () {
          that.setData({
            isLoading: false,
            bindError: '绑定失败，请稍后重试。',
          });
        });
      },
      fail: function () {
        that.setData({
          isLoading: false,
          bindError: '微信登录失败，请稍后重试。',
        });
      },
    });
  },

  _openSupplierHome: function (userInfo) {
    if (userInfo) {
      wx.setStorageSync('jrdhUserInfo', userInfo);
    }
    wx.redirectTo({
      url: '../jinriListWithLogin/jinriListWithLogin',
      fail: function () {
        this.setData({
          isLoading: false,
          bindError: '供货商主页打开失败，请稍后重试。',
        });
      }.bind(this),
    });
  },

  goToSupplierHome: function () {
    this._openSupplierHome(this.data.userInfo);
  },

  _showBindSuccess: function (userInfo) {
    this.setData({
      isLoading: false,
      isSellRegiste: false,
      bindSuccess: true,
      bindError: '',
      userInfo: userInfo,
    });
  },

  onNicknameInput: function (e) {
    this.setData({ nickName: e.detail.value });
    this._checkRegister();
  },

  onChooseAvatar: function (e) {
    this.setData({ avatarUrl: e.detail.avatarUrl });
    this._checkRegister();
  },

  _checkRegister: function () {
    this.setData({
      canRegister: this.data.avatarUrl !== '/images/user.png' && this.data.nickName.trim().length > 0,
    });
  },

  save: function () {
    var that = this;
    this.setData({ bindError: '' });
    if (!this.data.canRegister) {
      wx.showToast({
        title: this.data.avatarUrl === '/images/user.png' ? '请选择头像' : '请输入微信昵称',
        icon: 'none',
      });
      return;
    }

    wx.login({
      success: function (loginRes) {
        load.showLoading('注册接单身份');
        jrdhNxSellerRegisterWithFile(
          [that.data.avatarUrl],
          that.data.nickName.trim(),
          loginRes.code,
          that.data.nxDisId
        ).then(function (res) {
          load.hideLoading();
          var result = res.result;
          if (typeof result === 'string') {
            try {
              result = JSON.parse(result);
            } catch (e) {
              result = { code: -1, msg: '服务器返回异常' };
            }
          }
          if (result.code === 0) {
            that._showBindSuccess(result.data || null);
          } else {
            that.setData({ bindError: result.msg || '注册失败，请稍后重试。' });
          }
        }).catch(function (error) {
          load.hideLoading();
          error = error || {};
          var body = error.data || {};
          if (typeof body === 'string') {
            try {
              body = JSON.parse(body);
            } catch (e) {
              body = {};
            }
          }
          that.setData({ bindError: body.message || body.msg || '注册失败，请稍后重试。' });
        });
      },
      fail: function () {
        wx.showToast({ title: '微信登录失败', icon: 'none' });
      },
    });
  },
});
