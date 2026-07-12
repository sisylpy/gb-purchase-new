var load = require('../../../lib/load.js');
const globalData = getApp().globalData;
import apiUrl from '../../../config/index.js';
import {
  indexJrdhUserLoginJj,
  sellerDistributerPurchaseBatchsGb,
} from '../../../services/depOrder';

const { SUPPLIER_SUBSCRIBE_TMPL_IDS } = require('../../../lib/subscribeTemplates.js');

Page({
  data: {
    menuOpen: false,
    mainAnimationData: {},
    menuAnimationData: {},
    refresherTriggered: false,
    skipRefresh: false,
    startX: 0,
    startY: 0,
    isSwiping: false,
    isHorizontalSwipe: false,
    showIndex: 0,
  },

  onLoad() {
    this.setData({
      rpxR: globalData.rpxR,
      countWindowWidth: globalData.windowWidth,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      url: apiUrl.server,
      sideMenuWidth: globalData.windowWidth * 0.8,
    });
    this.mainAnimation = wx.createAnimation({ duration: 300, timingFunction: 'ease-out' });
    this.menuAnimation = wx.createAnimation({ duration: 300, timingFunction: 'ease-out' });
  },

  onShow() {
    const windowInfo = wx.getWindowInfo();
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      countWindowWidth: windowInfo.windowWidth,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
    });

    if (this.data.skipRefresh) {
      this.setData({ skipRefresh: false });
      return;
    }

    if (this.data.supplierId && this.data.gbDisId) {
      this._getSupplierBillsGb();
    } else {
      this._userLogin();
    }
  },

  toggleMenu() {
    if (this.data.menuOpen) {
      this.mainAnimation.translateX(0).step();
      this.menuAnimation.translateX(-this.data.sideMenuWidth).step();
      this.setData({
        mainAnimationData: this.mainAnimation.export(),
        menuAnimationData: this.menuAnimation.export(),
        menuOpen: false,
      });
    } else {
      this.mainAnimation.translateX(this.data.sideMenuWidth).step();
      this.menuAnimation.translateX(this.data.sideMenuWidth).step();
      this.setData({
        mainAnimationData: this.mainAnimation.export(),
        menuAnimationData: this.menuAnimation.export(),
        menuOpen: true,
      });
    }
  },

  sideMenuTouchStart(e) {
    this.setData({
      startX: e.touches[0].pageX,
      startY: e.touches[0].pageY,
      isSwiping: true,
    });
  },

  sideMenuTouchMove(e) {
    if (!this.data.isSwiping) return;
    const deltaX = e.touches[0].pageX - this.data.startX;
    const deltaY = e.touches[0].pageY - this.data.startY;
    this.setData({
      isHorizontalSwipe: Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10,
    });
  },

  sideMenuTouchEnd(e) {
    if (!this.data.isSwiping || !this.data.isHorizontalSwipe) return;
    const deltaX = e.changedTouches[0].pageX - this.data.startX;
    this.setData({ isSwiping: false, isHorizontalSwipe: false });
    if (deltaX < -50) {
      this.toggleMenu();
    }
  },

  supplierSelGb(e) {
    this.toggleMenu();
    const index = e.currentTarget.dataset.index;
    if (this.data.showIndex === index) return;
    this.setSupplierData(this.data.customerArr[index], index);
    this._getSupplierBillsGb();
  },

  _getSupplierBillsGb() {
    if (!this.data.gbDisId || !this.data.supplierId) return;
    load.showLoading('获取数据');
    sellerDistributerPurchaseBatchsGb({
      disId: this.data.gbDisId,
      supplierId: this.data.supplierId,
    }).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        this.setData({
          arr: res.result.data.arr,
          gbDisInfo: res.result.data.disInfo,
        });
      }
    });
  },

  _userLogin() {
    load.showLoading('获取数据中');
    wx.login({
      success: (loginRes) => {
        indexJrdhUserLoginJj(loginRes.code).then((res) => {
          load.hideLoading();
          const userInfo = res.result.data.userInfo;
          this.setData({
            jrdhUserInfo: userInfo,
            sellerId: userInfo.nxJrdhUserId,
            customerArr: res.result.data.arr,
          });
          wx.setStorageSync('jrdhUserInfo', userInfo);

          const returnSupplierId = wx.getStorageSync('returnSupplierId');
          if (returnSupplierId) {
            wx.removeStorageSync('returnSupplierId');
            this.selectSupplierById(returnSupplierId);
          } else {
            this.restoreSelectedSupplier();
          }
          this._getSupplierBillsGb();
        });
      },
    });
  },

  restoreSelectedSupplier() {
    const customerArr = this.data.customerArr;
    if (!customerArr || !customerArr.length) return;
    const saved = parseInt(wx.getStorageSync('showIndex'), 10);
    const index = (!isNaN(saved) && saved >= 0 && saved < customerArr.length) ? saved : 0;
    this.setSupplierData(customerArr[index], index);
  },

  selectSupplierById(supplierId) {
    const customerArr = this.data.customerArr;
    if (!customerArr || !customerArr.length) return false;
    const targetIndex = customerArr.findIndex(
      item => item && item.nxJrdhSupplierId === supplierId
    );
    if (targetIndex !== -1) {
      this.setSupplierData(customerArr[targetIndex], targetIndex);
      return true;
    }
    this.restoreSelectedSupplier();
    return false;
  },

  setSupplierData(supplier, index) {
    if (!supplier || !supplier.nxJrdhSupplierId) return;
    const gbDisId = supplier.gbDistributerEntity
      ? supplier.gbDistributerEntity.gbDistributerId
      : supplier.nxJrdhsGbDistributerId;
    const gbDisInfo = supplier.gbDistributerEntity || {};
    this.setData({
      showIndex: index,
      supplierInfo: supplier,
      supplierId: supplier.nxJrdhSupplierId,
      gbDisInfo,
      gbDisId,
    });
    wx.setStorageSync('showIndex', index);
    wx.setStorageSync('gbDisInfo', gbDisInfo);
  },

  toSupplierDetail(e) {
    this.setData({ skipRefresh: true });
    const { type, month } = e.currentTarget.dataset;
    wx.navigateTo({
      url: '../settlePageGb/settlePageGb?type=' + type
        + '&supplierId=' + this.data.supplierId
        + '&gbDisId=' + this.data.gbDisId
        + '&month=' + month,
    });
  },

  supplierOpenBatchDetailGb(e) {
    const batch = e.currentTarget.dataset.item;
    const batchId = batch.gbDistributerPurchaseBatchId;
    const retName = this.data.gbDisInfo.gbDistributerName;
    const disId = this.data.gbDisId;
    const buyUserId = batch.gbDpbBuyUserId;
    const depId = batch.gbDpbPurDepartmentId;
    this.setData({ skipRefresh: true });

    if (batch.gbDpbPurchaseType == 9) {
      wx.navigateTo({
        url: '../gbOrderBatchReturn/gbOrderBatchReturn?batchId=' + batchId
          + '&retName=' + retName + '&disId=' + disId + '&fromBuyer=0'
          + '&buyUserId=' + buyUserId + '&depId=' + depId
          + '&supplierId=' + this.data.supplierId + '&from=supplier',
      });
    } else {
      wx.navigateTo({
        url: '../gbReceiveBatch/gbReceiveBatch?batchId=' + batchId
          + '&retName=' + retName + '&disId=' + disId
          + '&buyUserId=' + buyUserId + '&depId=' + depId + '&from=supplier',
      });
    }
  },

  toEditUserGb() {
    wx.setStorageSync('jrdhUserInfo', this.data.jrdhUserInfo);
    this.toggleMenu();
    this.setData({ skipRefresh: true });
    wx.navigateTo({ url: '../depUserEdit/depUserEdit' });
  },

  requestSubscribeMessage() {
    wx.requestSubscribeMessage({
      tmplIds: SUPPLIER_SUBSCRIBE_TMPL_IDS,
      success: (res) => {
        const accepted = SUPPLIER_SUBSCRIBE_TMPL_IDS.some(id => res[id] === 'accept');
        if (accepted) {
          this.showSuccessModal();
        } else {
          this.showGuideModal();
        }
      },
      fail: (err) => {
        console.error('订阅失败:', err);
      },
    });
  },

  showSuccessModal() {
    wx.showModal({
      title: '完成订阅提示',
      content: '您已订阅成功，无需重复订阅',
      confirmText: '好的',
      showCancel: false,
    });
  },

  showGuideModal() {
    wx.showModal({
      title: '订阅提示',
      content: '开启通知后，您将及时收到订单状态提醒。您可以在"个人中心-消息设置"中重新开启。',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting();
        }
      },
    });
  },

  onRefresh() {
    this.setData({ refresherTriggered: true });
    if (this.data.supplierId && this.data.gbDisId) {
      this._getSupplierBillsGb();
    } else {
      this._userLogin();
    }
    setTimeout(() => {
      this.setData({ refresherTriggered: false });
    }, 1000);
  },
});
