/**
 * @file register.js
 * @description 订货客户（分销商门店）注册页：采集门店信息、头像，调用注册接口后写入登录态并进入首页。
 * @page pages/register/register
 *
 * 阅读指引（便于 Code Review / 交接）：
 *   一、依赖与接口清单 —— 本文件调用的所有「后端封装」与「微信原生能力」
 *   二、页面数据 data
 *   三、生命周期
 *   四、表单与协议交互
 *   五、注册提交流程（含后端调用）
 *   六、私有方法（以下划线开头，不在 WXML 中直接绑定）
 */

// =============================================================================
// 一、依赖与接口清单
// =============================================================================

/** 主包 pages 域 API：{@link ../services/pages.js} */
var pagesApi = require('../services/pages');

/**
 * --- 后端接口（经 pages/services/pages.js 封装）---
 *
 * | 本页调用 | 说明 |
 * |----------|------|
 * | pagesApi.gbRegisterWithFile(filePath, restaurantName, code, phone, address) | POST 上传 multipart，路径前缀 gbdistributeruser/gbRegisterWithFile |
 *
 * --- 微信原生 API（本页直接使用，未再封装）---
 *
 * | API | 用途 |
 * |-----|------|
 * | wx.login | 获取临时 code，与注册表单一并提交 |
 * | wx.getStorageSync('userInfo') | onShow 判断是否已登录，已登录则进首页 |
 * | wx.setStorageSync | 注册成功后写入 disInfo、userInfo |
 * | wx.redirectTo | 已登录或注册成功后的页面跳转 |
 * | wx.navigateBack / wx.exitMiniProgram | 返回上一页；直接进入注册页时退出小程序 |
 * | wx.showLoading / wx.hideLoading | 注册请求过程遮罩 |
 * | wx.showToast | 校验失败、接口失败提示 |
 */

// =============================================================================
// 二、页面数据
// =============================================================================

Page({

  /**
   * 页面状态；仅列业务字段含义，具体绑定见 register.wxml
   * @type {Object}
   */
  data: {
    restaurantName: '',
    phone: '',
    address: '',
    avatarUrl: '',
    agreed: false,
    showTerms: false,
    canRegister: false,
    registering: false,
    navBarHeight: 0,
    /** @type {string} wx.login 返回的 code，与注册一并提交 */
    code: '',
  },

  // =============================================================================
  // 三、生命周期
  // =============================================================================

  /**
   * 每次显示：同步自定义导航高度；若本地已有 userInfo 则视为已注册，跳转首页。
   */
  onShow: function () {
    var app = getApp();
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
    });

    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      wx.redirectTo({
        url: '../index/index',
      });
    }
  },

  /**
   * @param {Object} options 路由参数（当前逻辑未使用，保留便于扩展）
   */
  onLoad: function (options) {
    this._refreshWxLoginCode();
  },

  // =============================================================================
  // 四、表单与协议交互
  // =============================================================================

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

  /**
   * 微信「手机号快速验证」按钮回调；需在小程序后台开通能力并完成解密链路后才可拿到明文手机号。
   * @param {WechatMiniprogram.ButtonGetPhoneNumber} e
   */
  onGetPhoneNumber: function (e) {
    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      // TODO: 服务端解密 code 换取手机号，并回写 this.data.phone
    } else {
      wx.showToast({
        title: '您未授权获取手机号',
        icon: 'none'
      });
    }
  },

  /**
   * 表单「提交」入口（若 WXML 有绑定）；当前注册主流程在 onChooseAvatar 中触发。
   */
  onSubmit: function () {
    if (!this.data.restaurantName) {
      wx.showToast({ title: '请输入餐厅名称', icon: 'none' });
      return;
    }
    if (!this.data.phone) {
      wx.showToast({ title: '请输入联系电话', icon: 'none' });
      return;
    }
  },

  onAgreementChange: function (e) {
    var checked = e.detail.value.includes('agree');
    this.setData({ agreed: checked });
    this._updateCanRegister(this.data.restaurantName, checked);
  },

  showTermsModal: function () {
    this.setData({ showTerms: true });
  },

  hideTermsModal: function () {
    this.setData({ showTerms: false });
  },

  /**
   * 模态层点击拦截，避免点击内容区关闭外层；无业务逻辑。
   */
  preventClose: function () {},

  /**
   * 桌面端生成的是可转发的 8 位邀请码；在这里进入统一邀请接收页，
   * 再由服务端摘要决定注册为经营主体负责人还是门店店长。
   */
  openFranchiseInvitation: function () {
    wx.showModal({
      title: '输入加盟邀请码',
      content: '',
      editable: true,
      placeholderText: '请输入 8 位邀请码',
      confirmText: '继续',
      success: function (result) {
        if (!result.confirm) return;
        var inviteCode = String(result.content || '').trim().toUpperCase();
        if (!/^[23456789A-HJ-NP-Z]{8}$/.test(inviteCode)) {
          wx.showToast({ title: '请输入正确的 8 位邀请码', icon: 'none' });
          return;
        }
        wx.navigateTo({
          url: '/pages/storeOwnerInvite/storeOwnerInvite?inviteCode=' + encodeURIComponent(inviteCode),
        });
      },
    });
  },

  /**
   * 取消注册。
   *
   * 未注册用户由首页通过 redirectTo 进入本页时，页面栈只剩本页，
   * 直接调用 navigateBack 不会有可见反应。有上一页时正常返回，
   * 没有上一页时退出小程序，避免审核和用户被困在注册环节。
   */
  toBack: function () {
    var pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
    if (pages.length > 1) {
      wx.navigateBack({
        delta: 1,
        fail: function () {
          this._exitRegistration();
        }.bind(this),
      });
      return;
    }

    this._exitRegistration();
  },

  /** 退出能力不可用时回到非强制注册的介绍页，确保返回操作始终有反应。 */
  _exitRegistration: function () {
    if (typeof wx.exitMiniProgram === 'function') {
      wx.exitMiniProgram({
        fail: function () {
          this._showRegistrationIntro();
        }.bind(this),
      });
      return;
    }

    this._showRegistrationIntro();
  },

  _showRegistrationIntro: function () {
    wx.reLaunch({ url: '/pages/tro/tro' });
  },

  // =============================================================================
  // 五、注册提交流程（含后端调用）
  // =============================================================================

  /**
   * 用户选择头像后触发注册：校验表单 → 调 pagesApi.gbRegisterWithFile → 解析 JSON → 写 Storage → 进首页。
   * @param {WechatMiniprogram.CustomEvent} e open-type="chooseAvatar" 事件
   */
  onChooseAvatar: function (e) {
    var that = this;
    if (that.data.registering) return;
    var avatarUrl = e.detail.avatarUrl;

    if (!that.data.restaurantName) {
      wx.showToast({ title: '请输入餐厅名称', icon: 'none' });
      return;
    }
    if (!that.data.phone) {
      wx.showToast({ title: '请输入联系电话', icon: 'none' });
      return;
    }
    if (!that.data.agreed) {
      wx.showToast({ title: '请先阅读并同意充值条款', icon: 'none' });
      return;
    }

    that.setData({ avatarUrl: avatarUrl, registering: true });
    wx.showLoading({ title: '注册小程序订货客户', mask: true });

    pagesApi.gbRegisterWithFile(
      that.data.avatarUrl,
      that.data.restaurantName,
      that.data.code,
      that.data.phone,
      that.data.address
    ).then(function (res) {
      wx.hideLoading();
      var jsonObject = JSON.parse(res.result);
      if (jsonObject.code === 0) {
        wx.setStorageSync('disInfo', jsonObject.data.disInfo);
        wx.setStorageSync('userInfo', jsonObject.data.depUserInfo);
        wx.setStorageSync('mendianInfo', jsonObject.data.depInfo || jsonObject.data.disInfo.mendianDepartmentList[0]);
        if (jsonObject.data.token) {
          wx.setStorageSync('token', 'Bearer ' + jsonObject.data.token);
          wx.setStorageSync('franchiseTokenExpiresAt', jsonObject.data.tokenExpiresAt || '');
        }

        var mendianInfo = wx.getStorageSync('mendianInfo');
        wx.redirectTo({
          url: '../index/index?depId=' + (mendianInfo ? mendianInfo.gbDepartmentId : ''),
        });
      } else {
        that.setData({ registering: false });
        that._refreshWxLoginCode();
        wx.showToast({
          title: jsonObject.msg || '注册失败',
          icon: 'none'
        });
      }
    }).catch(function (err) {
      wx.hideLoading();
      that.setData({ registering: false });
      that._refreshWxLoginCode();
      console.error('注册异常', err);
      wx.showToast({
        title: '网络异常',
        icon: 'none'
      });
    });
  },

  // =============================================================================
  // 六、私有方法
  // =============================================================================

  /**
   * 刷新 wx.login 的 code，供注册接口使用。
   * @private
   */
  _refreshWxLoginCode: function () {
    var that = this;
    wx.login({
      success: function (res) {
        that.setData({ code: res.code });
      },
      fail: function () {
        wx.showToast({
          title: '请重新操作',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 根据店名是否非空、是否勾选协议，更新「可注册」按钮态。
   * @private
   * @param {string} restaurantName
   * @param {boolean} agreed
   */
  _updateCanRegister: function (restaurantName, agreed) {
    var canRegister = restaurantName.trim().length > 0 && agreed;
    this.setData({ canRegister: canRegister });
  },

});
