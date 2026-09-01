var load = require('../../../../lib/load.js');
var supplierApi = require('../../../../services/supplier.js');

Page({
  data: {
    navBarHeight: 0,
    supplierName: '配送商优惠券',
    claimableCoupons: [],
    ownedCoupons: [],
    claimingCouponId: null,
    loaded: false
  },

  onLoad: function (options) {
    var globalData = getApp().globalData;
    var disInfo = wx.getStorageSync('disInfo') || {};
    var mendianInfo = wx.getStorageSync('mendianInfo') || {};
    this.setData({
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      nxDisId: Number(options.nxDisId || 0),
      supplierId: Number(options.supplierId || 0),
      supplierName: options.supplierName ? decodeURIComponent(options.supplierName) : '配送商优惠券',
      gbDisId: Number(disInfo.gbDistributerId || mendianInfo.gbDepartmentDisId || 0),
      gbDisName: disInfo.gbDistributerName || mendianInfo.gbDepartmentName || ''
    });
    this.loadCoupons();
  },

  onPullDownRefresh: function () {
    this.loadCoupons(true);
  },

  requestData: function () {
    return {
      nxDisId: this.data.nxDisId,
      supplierId: this.data.supplierId,
      gbDisId: this.data.gbDisId,
      gbDisName: this.data.gbDisName
    };
  },

  loadCoupons: function (silent) {
    if (!this.data.nxDisId || !this.data.supplierId || !this.data.gbDisId) {
      this.setData({ loaded: true });
      wx.showToast({ title: '供货关系信息不完整', icon: 'none' });
      return;
    }
    if (!silent) load.showLoading('获取优惠券');
    var data = this.requestData();
    Promise.all([
      supplierApi.jczbGetClaimableCoupons(data),
      supplierApi.jczbGetOwnedCoupons(data)
    ]).then(function (result) {
      load.hideLoading();
      wx.stopPullDownRefresh();
      var claimable = result[0].result || {};
      var owned = result[1].result || {};
      if (claimable.code !== 0) {
        wx.showToast({ title: claimable.msg || '获取优惠券失败', icon: 'none' });
      }
      this.setData({
        claimableCoupons: this.decorateCoupons(claimable.code === 0 ? claimable.data : []),
        ownedCoupons: this.decorateCoupons(owned.code === 0 ? owned.data : []),
        loaded: true
      });
    }.bind(this)).catch(function () {
      load.hideLoading();
      wx.stopPullDownRefresh();
      this.setData({ loaded: true });
      wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
    }.bind(this));
  },

  decorateCoupons: function (list) {
    return (list || []).map(function (item) {
      var isDiscount = Number(item.couponType) === 1;
      var percent = Number(item.discountPercent || 0);
      var percentText = percent > 10 ? (percent / 10) : percent;
      return Object.assign({}, item, {
        amountText: isDiscount ? percentText + '折' : '¥' + (item.discountAmount || '0'),
        thresholdText: '满' + (item.thresholdAmount || '0') + '元可用',
        scopeText: item.scopeLabel || '全店通用'
      });
    });
  },

  claimCoupon: function (e) {
    var couponId = Number(e.currentTarget.dataset.id || 0);
    if (!couponId || this.data.claimingCouponId) return;
    var data = this.requestData();
    data.couponId = couponId;
    this.setData({ claimingCouponId: couponId });
    supplierApi.jczbClaimCoupon(data).then(function (response) {
      var res = response.result || {};
      this.setData({ claimingCouponId: null });
      if (res.code === 0) {
        wx.showToast({ title: '领取成功', icon: 'success' });
        this.loadCoupons(true);
      } else {
        wx.showToast({ title: res.msg || '领取失败', icon: 'none' });
      }
    }.bind(this)).catch(function () {
      this.setData({ claimingCouponId: null });
      wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
    }.bind(this));
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  }
});
