var load = require('../../../lib/load.js');
const globalData = getApp().globalData;
import apiUrl from '../../../config/index.js'

import {
  indexJrdhUserLoginJj,
  sellerDistributerPurchaseBatchsGb,
} from '../../../services/depOrder'

Page({

  onShow() {let windowInfo = wx.getWindowInfo();
    let globalData = getApp().globalData;
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      countWindowWidth: windowInfo.windowWidth,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
    });

    if (this.data.skipRefresh) {this.setData({
        skipRefresh: false
      });
      return;
    }this._userLogin();
  },

  data: {
    canSave: false,
    menuOpen: false,
    mainAnimationData: {},
    menuAnimationData: {},
    refresherTriggered: false,
    skipRefresh: false,
    startX: 0,
    startY: 0,
    isSwiping: false,
    showIndex: 0,
    
  },

  onLoad: function (options) {
    this.setData({
      rpxR: globalData.rpxR,
      countWindowWidth: globalData.windowWidth,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      url: apiUrl.server,
      from: options.from,
    })

    this.setData({
      sideMenuWidth: this.data.countWindowWidth * 0.8,
    });this.mainAnimation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease-out',
    });
    this.menuAnimation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease-out',
    });
  },

  toggleMenu: function () {if (this.data.menuOpen) {
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

  sideMenuTouchStart: function (e) {
    this.setData({
      startX: e.touches[0].pageX,
      startY: e.touches[0].pageY,
      isSwiping: true,
    });
  },

  sideMenuTouchMove: function (e) {
    if (!this.data.isSwiping) return;

    const moveX = e.touches[0].pageX;
    const moveY = e.touches[0].pageY;
    const deltaX = moveX - this.data.startX;
    const deltaY = moveY - this.data.startY;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      this.setData({
        isHorizontalSwipe: true,
      });
    } else {
      this.setData({
        isHorizontalSwipe: false,
      });
    }
  },

  sideMenuTouchEnd: function (e) {
    if (!this.data.isSwiping || !this.data.isHorizontalSwipe) return;

    const endX = e.changedTouches[0].pageX;
    const deltaX = endX - this.data.startX;

    this.setData({
      isSwiping: false,
      isHorizontalSwipe: false,
    });

    if (deltaX < -50) {
      this.toggleMenu();
    }
  },

  stopTouchMove: function () {
    return false;
  },

  supplierSelGb(e) {
    this.toggleMenu();
    var index = e.currentTarget.dataset.index;if (this.data.showIndex !== index) {
      var customerArr = this.data.customerArr;this.setSupplierData(customerArr[index], index);
      this._getSupplerBillsGb();
    }
  },

  _getSupplerBillsGb() {
    var data = {
      disId: this.data.gbDisId,
      supplierId: this.data.supplierId,
    }load.showLoading("获取数据")
    sellerDistributerPurchaseBatchsGb(data)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          this.setData({
            arr: res.result.data.arr,
            gbDisInfo: res.result.data.disInfo,
          })
        }
      })
  },

  toSupplierDetail(e) {this.setData({
      skipRefresh: true
    });wx.navigateTo({
      url: '../settlePageGb/settlePageGb?type=' + e.currentTarget.dataset.type + '&supplierId=' +
      this.data.supplierId + '&gbDisId=' + this.data.gbDisId + '&month=' + e.currentTarget.dataset.month,
    })
  },

  supplierOpenBatchDetailGb(e) {var batch = e.currentTarget.dataset.item;
    var batchId = batch.gbDistributerPurchaseBatchId;
    var retName = this.data.gbDisInfo.gbDistributerName;
    var disId = this.data.gbDisId;
    var buyUserId = batch.gbDpbBuyUserId;
    var depId = batch.gbDpbPurDepartmentId;

    this.setData({
      skipRefresh: true
    });if (batch.gbDpbPurchaseType == 9) {
      wx.navigateTo({
        url: '../gbOrderBatchReturn/gbOrderBatchReturn?batchId=' + batchId + '&retName=' + retName + '&disId=' + disId + '&fromBuyer=0' + '&buyUserId=' + buyUserId + '&depId=' + depId + '&supplierId=' + this.data.supplierId + '&from=supplier'
      })
    } else {
      wx.navigateTo({
        url: '../gbReceiveBatch/gbReceiveBatch?batchId=' + batchId + '&retName=' + retName + '&disId=' + disId + '&buyUserId=' + buyUserId + '&depId=' + depId + '&from=supplier'
      })
    }
  },

  _userLogin() {load.showLoading("获取数据中");
    wx.login({
      success: (res) => {
        indexJrdhUserLoginJj(res.code)
          .then((res) => {
            load.hideLoading();

            this.setData({
              jrdhUserInfo: res.result.data.userInfo,
              sellerId: res.result.data.userInfo.nxJrdhUserId,
              customerArr: res.result.data.arr,
            })

            wx.setStorageSync('jrdhUserInfo', res.result.data.userInfo);

            const returnSupplierId = wx.getStorageSync('returnSupplierId');if (returnSupplierId) {
              wx.removeStorageSync('returnSupplierId');this.selectSupplierById(returnSupplierId);
            } else {this.restoreSelectedSupplier();
            }this._getSupplerBillsGb();
          })
      }
    })
  },

  toSettleGb() {
    this.setData({
      skipRefresh: true
    });

    wx.navigateTo({
      url: '../settlePageGb/settlePageGb?supplierId=' + this.data.supplierId + '&disId=' + this.data.gbDisId,
    })
  },

  toSettle() {
    this.setData({
      skipRefresh: true
    });

    wx.navigateTo({
      url: '../../management/settlePage/settlePage?supplierId=' + this.data.supplierId + '&disId=' + this.data.nxDisId,
    })
  },

  requestSubscribeMessage() {
    wx.requestSubscribeMessage({
      tmplIds: [
        'wCtYVih8kAdCHjfaYL1qwOtQnmQEKAGO_EgRmlB6cOE',
        'TE6HIkd7LRQ08zdnQXowRjZu8OBK0eGEd368p2NtTeA',
        'CgludlqVZc_vmFaZUgVFC-iprkydrtOfF_GcODltpTc'
      ],
      success: (res) => {
        if (res[
          'wCtYVih8kAdCHjfaYL1qwOtQnmQEKAGO_EgRmlB6cOE',
          'TE6HIkd7LRQ08zdnQXowRjZu8OBK0eGEd368p2NtTeA',
          'CgludlqVZc_vmFaZUgVFC-iprkydrtOfF_GcODltpTc'
        ] === 'accept') {this.showSucessModal();
        } else {this.showGuideModal();
        }
      },
      fail: (err) => {
        console.error("订阅失败:", err);
      }
    });
  },

  showSucessModal() {wx.showModal({
      title: '完成订阅提示',
      content: '您已订阅成功，无需重复订阅',
      confirmText: '好的',
      showCancel: false,
      success: (res) => {
        if (res.confirm) {
        }
      },
      fail: (err) => {
        console.error("订阅失败:", err);
      }
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
      }
    });
  },

  onShareAppMessage: function (options) {return {
      title: "注册管理员",
      path: '/subPackage-supplier/pages/jinriListWithLogin/jinriListWithLogin?nxDisId=' + this.data.nxDisId + '&gbDisId=' + this.data.gbDisId + '&commId=' + this.data.commId + '&disName=' + this.data.disName + '&supplierId=' + options.target.dataset.id + '&buyUserId=' + this.data.buyerInfo.nxJrdhUserId,
      imageUrl: '',
    }
  },

  toStarsPage() {
    this.setData({
      skipRefresh: true
    });

    wx.navigateTo({
      url: '../jrdhGoodsStars/jrdhGoodsStars?id=' + this.data.supplierId + '&from=supplier',
    })
  },

  toEditUserGb() {wx.setStorageSync("jrdhUserInfo", this.data.jrdhUserInfo);
    this.toggleMenu();

    this.setData({
      skipRefresh: true
    });wx.navigateTo({
      url: '../depUserEdit/depUserEdit',
    })
  },

  onRefresh() {
    this.setData({
      refresherTriggered: true
    });

    this._getSupplerBillsGb();

    setTimeout(() => {
      this.setData({
        refresherTriggered: false
      });
    }, 1000);
  },

  restoreSelectedSupplier() {
    const customerArr = this.data.customerArr;if (!customerArr || customerArr.length === 0) {return;
    }

    const showIndex = wx.getStorageSync('showIndex');
    const indexNum = parseInt(showIndex);if (!isNaN(indexNum) && indexNum >= 0 && indexNum < customerArr.length) {
      const supplier = customerArr[indexNum];if (supplier) {this.setSupplierData(supplier, indexNum);
      } else {this.setSupplierData(customerArr[0], 0);
      }
    } else {const firstSupplier = customerArr[0];if (firstSupplier) {
        this.setSupplierData(firstSupplier, 0);
      } else {}
    }},

  selectSupplierById(supplierId) {
    const customerArr = this.data.customerArr;if (!customerArr || customerArr.length === 0) {return false;
    }customerArr.forEach((item, index) => {});

    const targetIndex = customerArr.findIndex(item =>
      item && item.nxJrdhSupplierId === supplierId
    );if (targetIndex !== -1) {
      const selectedSupplier = customerArr[targetIndex];this.setSupplierData(selectedSupplier, targetIndex);return true;
    } else {this.restoreSelectedSupplier();return false;
    }
  },

  setSupplierData(supplier, index) {
    if (!supplier) {return;
    }

    if (!supplier.nxJrdhSupplierId) {return;
    }

    // 获取 distributor ID，优先使用 gbDistributerEntity，否则使用 nxJrdhsGbDistributerId
    var gbDisId = supplier.gbDistributerEntity ? supplier.gbDistributerEntity.gbDistributerId : supplier.nxJrdhsGbDistributerId;
    var gbDisInfo = supplier.gbDistributerEntity || {};this.setData({
      showIndex: index,
      supplierInfo: supplier,
      supplierId: supplier.nxJrdhSupplierId,
      gbDisInfo: gbDisInfo,
      gbDisId: gbDisId,
    });

    wx.setStorageSync('showIndex', index);
    wx.setStorageSync('gbDisInfo', gbDisInfo);
  },

  checkReturnSupplier() {
    const returnSupplierId = wx.getStorageSync('returnSupplierId');
    if (returnSupplierId) {
      wx.removeStorageSync('returnSupplierId');
      this.selectSupplierById(returnSupplierId);
    }
  },
})