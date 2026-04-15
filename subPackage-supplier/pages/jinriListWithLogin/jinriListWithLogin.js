var load = require('../../../lib/load.js');
const globalData = getApp().globalData;
import apiUrl from '../../../config.js'

import {
  indexJrdhUserLoginJj,
  sellerDistributerPurchaseBatchsGb,
} from '../../../services/depOrder'

Page({

  onShow() {
    console.log('=== onShow 触发 ===');
    console.log('skipRefresh 状态:', this.data.skipRefresh);

    let windowInfo = wx.getWindowInfo();
    let globalData = getApp().globalData;
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      countWindowWidth: windowInfo.windowWidth,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
    });

    if (this.data.skipRefresh) {
      console.log('✅ 跳过刷新，重置标记');
      this.setData({
        skipRefresh: false
      });
      return;
    }

    console.log('🔄 执行刷新，调用 _userLogin');
    this._userLogin();
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
    });

    console.log('sideMenuWidth:', this.data.sideMenuWidth);

    this.mainAnimation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease-out',
    });
    this.menuAnimation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease-out',
    });
  },

  toggleMenu: function () {
    console.log("toggleMenutoggleMenu")
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
    var index = e.currentTarget.dataset.index;
    console.log("=======", this.data.showIndex, "index", index);

    if (this.data.showIndex !== index) {
      var customerArr = this.data.customerArr;
      console.log("index--------supplierSelGb", index);
      this.setSupplierData(customerArr[index], index);
      this._getSupplerBillsGb();
    }
  },

  _getSupplerBillsGb() {
    var data = {
      disId: this.data.gbDisId,
      supplierId: this.data.supplierId,
    }
    console.log(data);
    load.showLoading("获取数据")
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

  toSupplierDetail(e) {
    console.log("=== toSupplierDetail 跳转 ===", e);

    this.setData({
      skipRefresh: true
    });
    console.log('✅ 设置 skipRefresh = true');

    wx.navigateTo({
      url: '../settlePageGb/settlePageGb?type=' + e.currentTarget.dataset.type + '&supplierId=' +
      this.data.supplierId + '&gbDisId=' + this.data.gbDisId + '&month=' + e.currentTarget.dataset.month,
    })
  },

  supplierOpenBatchDetailGb(e) {
    console.log('=== supplierOpenBatchDetailGb 跳转 ===', e);

    var batch = e.currentTarget.dataset.item;
    var batchId = batch.gbDistributerPurchaseBatchId;
    var retName = this.data.gbDisInfo.gbDistributerName;
    var disId = this.data.gbDisId;
    var buyUserId = batch.gbDpbBuyUserId;
    var depId = batch.gbDpbPurDepartmentId;

    this.setData({
      skipRefresh: true
    });
    console.log('✅ 设置 skipRefresh = true');

    if (batch.gbDpbPurchaseType == 9) {
      wx.navigateTo({
        url: '../gbOrderBatchReturn/gbOrderBatchReturn?batchId=' + batchId + '&retName=' + retName + '&disId=' + disId + '&fromBuyer=0' + '&buyUserId=' + buyUserId + '&depId=' + depId + '&supplierId=' + this.data.supplierId + '&from=supplier'
      })
    } else {
      wx.navigateTo({
        url: '../gbReceiveBatch/gbReceiveBatch?batchId=' + batchId + '&retName=' + retName + '&disId=' + disId + '&buyUserId=' + buyUserId + '&depId=' + depId + '&from=supplier'
      })
    }
  },

  _userLogin() {
    console.log('🔄 _userLogin 开始执行');
    load.showLoading("获取数据中");
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

            const returnSupplierId = wx.getStorageSync('returnSupplierId');
            console.log('=== 供货商选择逻辑 ===');
            console.log('returnSupplierId:', returnSupplierId);
            console.log('customerArr长度:', res.result.data.arr.length);
            console.log('customerArr内容:', res.result.data.arr);

            if (returnSupplierId) {
              wx.removeStorageSync('returnSupplierId');
              console.log('尝试选择返回的供货商ID:', returnSupplierId);
              this.selectSupplierById(returnSupplierId);
            } else {
              console.log('使用默认逻辑选择供货商');
            
              this.restoreSelectedSupplier();
            }
            console.log('========================');

            this._getSupplerBillsGb();
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
        ] === 'accept') {
          console.log("用户同意订阅AAA");
          this.showSucessModal();
        } else {
          console.log("用户拒绝订阅");
          this.showGuideModal();
        }
      },
      fail: (err) => {
        console.error("订阅失败:", err);
      }
    });
  },

  showSucessModal() {
    console.log("sucecee")

    wx.showModal({
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

  onShareAppMessage: function (options) {
    console.log('nxDisId=' + this.data.nxDisId + '&gbDisId=' + this.data.gbDisId + '&commId=' + this.data.commId + '&disName=' + this.data.disName + '&supplierId=' + options.target.dataset.id + '&buyUserId=' + this.data.buyerInfo.nxJrdhUserId);
    return {
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

  toEditUserGb() {
    console.log('=== toEditUserGb 跳转 ===');
    wx.setStorageSync("jrdhUserInfo", this.data.jrdhUserInfo);
    this.toggleMenu();

    this.setData({
      skipRefresh: true
    });
    console.log('✅ 设置 skipRefresh = true');

    wx.navigateTo({
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
    const customerArr = this.data.customerArr;

    console.log('=== restoreSelectedSupplier 开始 ===');
    console.log('customerArr长度:', customerArr ? customerArr.length : 'customerArr为空');
    console.log('customerArr内容:', customerArr);

    if (!customerArr || customerArr.length === 0) {
      console.log('供货商列表为空，无法恢复选中状态');
      console.log('=== restoreSelectedSupplier 结束（无数据）===');
      return;
    }

    const showIndex = wx.getStorageSync('showIndex');
    const indexNum = parseInt(showIndex);
    console.log('存储的showIndex:', showIndex, '转换后:', indexNum);

    if (!isNaN(indexNum) && indexNum >= 0 && indexNum < customerArr.length) {
      const supplier = customerArr[indexNum];
      console.log('存储索引对应的供货商:', supplier);
      if (supplier) {
        console.log('使用存储的索引选择供货商');
        this.setSupplierData(supplier, indexNum);
      } else {
        console.log('存储的索引对应的供货商为空，使用第一个供货商');
        this.setSupplierData(customerArr[0], 0);
      }
    } else {
      console.log('showIndex无效或超出范围，使用第一个供货商');
      const firstSupplier = customerArr[0];
      console.log('使用第一个供货商:', firstSupplier);
      if (firstSupplier) {
        this.setSupplierData(firstSupplier, 0);
      } else {
        console.log('第一个供货商为空');
      }
    }
    console.log('=== restoreSelectedSupplier 结束 ===');
  },

  selectSupplierById(supplierId) {
    const customerArr = this.data.customerArr;

    console.log('=== selectSupplierById 开始 ===');
    console.log('要查找的供货商ID:', supplierId);
    console.log('customerArr长度:', customerArr ? customerArr.length : 'customerArr为空');
    console.log('customerArr内容:', customerArr);

    if (!customerArr || customerArr.length === 0) {
      console.log('供货商列表为空，无法选择供货商');
      return false;
    }

    console.log('所有供货商ID列表:');
    customerArr.forEach((item, index) => {
      console.log(`[${index}] nxJrdhSupplierId:`, item ? item.nxJrdhSupplierId : 'null');
    });

    const targetIndex = customerArr.findIndex(item =>
      item && item.nxJrdhSupplierId === supplierId
    );

    console.log('找到的索引:', targetIndex);

    if (targetIndex !== -1) {
      const selectedSupplier = customerArr[targetIndex];
      console.log('选中的供货商:', selectedSupplier);
      this.setSupplierData(selectedSupplier, targetIndex);
      console.log('已选择供货商:', selectedSupplier.gbDistributerEntity.gbDistributerName);
      console.log('=== selectSupplierById 成功结束 ===');
      return true;
    } else {
      console.log('未找到匹配的供货商ID:', supplierId);
      console.log('使用默认逻辑选择供货商');
      this.restoreSelectedSupplier();
      console.log('=== selectSupplierById 失败结束 ===');
      return false;
    }
  },

  setSupplierData(supplier, index) {
    if (!supplier) {
      console.log('setSupplierData: supplier 参数为空');
      return;
    }

    if (!supplier.nxJrdhSupplierId) {
      console.log('setSupplierData: supplier.nxJrdhSupplierId 为空');
      return;
    }

    // 获取 distributor ID，优先使用 gbDistributerEntity，否则使用 nxJrdhsGbDistributerId
    var gbDisId = supplier.gbDistributerEntity ? supplier.gbDistributerEntity.gbDistributerId : supplier.nxJrdhsGbDistributerId;
    var gbDisInfo = supplier.gbDistributerEntity || {};

    console.log('setSupplierData: gbDisId =', gbDisId);

    this.setData({
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