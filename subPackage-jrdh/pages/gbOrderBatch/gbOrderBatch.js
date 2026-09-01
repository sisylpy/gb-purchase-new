var load = require('../../../lib/load.js');
const globalData = getApp().globalData;
import apiUrl from '../../../config/index'

import {
  jrdhSellerRegisterWithFileGbJj,
  whichJrdhUserLoginGbJj,
  sellUserReadDisBatchGb,
  sellerFinishPurchaseGoodsBatchGb,
  supplierEditBatchGb,
  supplierDeleteDisPurBatchGbItem,
  supplierInitWeightPurItem,
  getDisPurchaseGoodsBatchGb,
} from '../../../services/depOrder'

import dateUtil from '../../../lib/dateUtil';
const orderGoodsCheck = require('../../utils/orderGoodsCheck.js');
const orderGoodsScale = require('../../../lib/orderGoodsScale.js');
const batchBuyerInput = require('../../../lib/batchBuyerInput.js');
const { SUPPLIER_SUBSCRIBE_TMPL_IDS } = require('../../../lib/subscribeTemplates.js');

Page({

  onShow() {
    var globalData = getApp().globalData;
    this._updateLayoutMetrics(globalData);
    if (this._isBuyerInputActive()) {
      this.setData({ isSellRegiste: false, buyerInput: true, buyUser: true });
      this._getInitData();
      return;
    }
    if (this.data.jrdhUserInfo !== null) {
      this.setData({ isSellRegiste: false });
      this._getInitData();
    } else {
      this._userLogin();
    }
  },

  _isCompletedView() {
    var vm = this.data.viewMode;
    return vm === 'buyer_detail' || vm === 'seller_done';
  },

  _getSafeBottomRpx(globalData) {
    globalData = globalData || getApp().globalData;
    var windowInfo = wx.getWindowInfo();
    if (windowInfo.safeAreaInsets && windowInfo.safeAreaInsets.bottom) {
      return Math.ceil(windowInfo.safeAreaInsets.bottom * globalData.rpxR);
    }
    return 0;
  },

  _updateLayoutMetrics(globalData) {
    globalData = globalData || getApp().globalData;
    var windowWidth = globalData.windowWidth * globalData.rpxR;
    var windowHeight = globalData.windowHeight * globalData.rpxR;
    var statusBarHeight = globalData.statusBarHeight * globalData.rpxR;
    var safeBottomRpx = this._getSafeBottomRpx(globalData);
    var headerRpx = statusBarHeight + 70;
    var pageMarginRpx = 10;
    var bottomHeight = this.data.bottomHeight;
    var formHeight = this.data.formHeight;
    var completed = this._isCompletedView();
    var bodyHeightCompleted = windowHeight - headerRpx - safeBottomRpx - pageMarginRpx;
    var bodyHeight = windowHeight - bottomHeight - statusBarHeight - 40;
    this.setData({
      windowWidth: windowWidth,
      windowHeight: windowHeight,
      statusBarHeight: statusBarHeight,
      safeBottomRpx: safeBottomRpx,
      isCompletedView: completed,
      bodyHeight: bodyHeight,
      bodyHeightCompleted: bodyHeightCompleted,
      bodyHeightPending: windowHeight - bottomHeight,
      formBodyHeightPending: windowHeight - formHeight,
      scrollHeightPending: windowHeight - formHeight - statusBarHeight - 80,
      formBodyHeightDefault: windowHeight - formHeight - statusBarHeight,
      scrollHeightDefault: windowHeight - formHeight - statusBarHeight - 80,
      scrollHeightSeller: windowHeight - formHeight - statusBarHeight - 120,
      btnThirdWidth: (windowWidth - 40) / 3,
      numWidth: (globalData.windowWidth / 4) * globalData.rpxR - 40,
      numContainerWidth: (globalData.windowWidth / 4) * globalData.rpxR - 20,
      numHeight: (globalData.windowWidth / 4) * globalData.rpxR - 40,
      numContainerHeight: (globalData.windowWidth / 4) * globalData.rpxR - 20,
      btnWidth: (globalData.windowWidth / 8) * globalData.rpxR - 20,
      btnWidthContainer: (globalData.windowWidth / 8) * globalData.rpxR,
      bigBtnWidth: (globalData.windowWidth / 6) * globalData.rpxR - 20,
      bigBtnWidthContainer: (globalData.windowWidth / 6) * globalData.rpxR,
    });
  },

  _computeViewMode(buyUser, batchStatus, buyerInput) {
    var batch = this.data.batch;
    if (buyerInput) {
      if (batchStatus != null && Number(batchStatus) < 2) {
        return 'seller_edit';
      }
      if (batchStatus == 2 && batchBuyerInput.canBuyerProxyEditBatch(batch)) {
        return 'seller_edit';
      }
      if (batchStatus == 2) {
        return 'seller_confirm';
      }
      return 'buyer_detail';
    }
    if (buyUser) {
      if (batchStatus == -1 || batchStatus == 0) return 'buyer_pending';
      return 'buyer_detail';
    }
    if (batchStatus == 0 || batchStatus == 1) return 'seller_edit';
    if (batchStatus == 2) return 'seller_confirm';
    return 'seller_done';
  },

  _resolveViewMode(batchStatus) {
    var status = batchStatus !== undefined && batchStatus !== null
      ? batchStatus
      : this.data.batchStatus;
    var buyerInput = this._isBuyerInputActive();
    var buyUser = buyerInput ? true : this.data.buyUser;
    return this._computeViewMode(buyUser, status, buyerInput);
  },

  _isBuyerInputActive() {
    return !!(this._isBuyerInputMode || this.data.buyerInput);
  },

  _updateViewMode() {
    this.setData({
      viewMode: this._resolveViewMode(),
    }, function () {
      this._updateLayoutMetrics();
    }.bind(this));
  },

  data: {
    bottomHeight: 240,
    formHeight: 480,
    isTishi: false,
    isTishiSave: false,
    lastInput: true,
    focusIndex: -1,
    isSellRegiste: false,
    toPrice: false,
    saveBatch: false,
    retName: "",
    batchId: null,
    sendSuccess: false,
    helpWeight: "0",
    scaleInput: false,
    buyUser: false,
    buyerInput: false,
    canSave: false,
    nickName: "",
    jrdhUserInfo: null,
    viewMode: '',
    isCompletedView: false,
    buyerCanReEdit: false,
    nxBridgeReady: false,
    nxBridgeOpening: false,
    nxBridgeNxDisId: null,
    nxBridgeError: '',
    nxBridgeState: 'hidden',
    nxBridgeIntroVisible: false,
    nxBridgeFirstRelation: false,
    nxBridgeLinkedCount: 0,
    nxBridgeOrderCount: 0,
    isNxDistributerUser: false,
    supplierRelationReady: false,
    nxBusinessRelationId: null,
  },


  /** 明细行 gbDpgBuySubtotal 累计（与各商品「小计」展示条件一致：不为 null 且大于 0） */
  _buySubtotalSumFromBatch(batch) {
    var sum = 0;
    var list = batch && batch.gbDPGEntities ? batch.gbDPGEntities : [];
    for (var i = 0; i < list.length; i++) {
      var st = list[i].gbDpgBuySubtotal;
      if (st !== null && st !== undefined && Number(st) > 0) {
        sum += Number(st);
      }
    }
    return Math.round(sum * 100) / 100;
  },

  /** 单行小计：箱规优先 箱价×箱数，否则单价×数量，否则累加订单小计 */
  _lineBuySubtotal(item) {
    if (orderGoodsScale.isScalePurGoods(item)) {
      var scaleSub = orderGoodsScale.computeScalePurGoodsSubtotal(item);
      if (scaleSub) {
        return Number(scaleSub);
      }
    }
    var scalePrice = item.gbDpgBuyScalePrice;
    var scaleQty = item.gbDpgBuyScaleQuantity;
    if (scalePrice != null && scaleQty != null && Number(scaleQty) > 0 && !isNaN(Number(scalePrice))) {
      return Number(scalePrice) * Number(scaleQty);
    }
    var price = item.gbDpgBuyPrice;
    var qty = item.gbDpgBuyQuantity;
    if (price != null && qty != null && Number(qty) > 0 && !isNaN(Number(price))) {
      return Number(price) * Number(qty);
    }
    var orderSum = 0;
    var orders = item.gbDepartmentOrdersEntities || [];
    for (var j = 0; j < orders.length; j++) {
      var os = orders[j].gbDoSubtotal;
      if (os != null && !isNaN(Number(os)) && Number(os) > 0) {
        orderSum += Number(os);
      }
    }
    return orderSum;
  },

  _syncBatchSubtotal(batch) {
    if (!batch) return batch;
    var list = batch.gbDPGEntities || [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (orderGoodsScale.isScalePurGoods(item)) {
        orderGoodsScale.syncPurGoodsScaleTotals(item);
        continue;
      }
      var st = item.gbDpgBuySubtotal;
      if (st == null || st === '' || isNaN(Number(st)) || Number(st) <= 0) {
        var computed = this._lineBuySubtotal(item);
        if (computed > 0) {
          item.gbDpgBuySubtotal = (Math.round(computed * 10) / 10).toFixed(1);
        }
      }
    }
    var sum = this._buySubtotalSumFromBatch(batch);
    if (sum > 0) {
      batch.gbDpbSubtotal = sum;
    } else if (batch.gbDpbSubtotal == null || batch.gbDpbSubtotal === '') {
      batch.gbDpbSubtotal = 0;
    }
    return batch;
  },

  /** 调试：打印批次接口返回的出库/打勾相关字段 */
  _logBatchOutCheckDebug(batch, apiName) {
    if (!batch) {
      console.log('[gbOrderBatch 出库打勾] batch 为空, api=', apiName);
      return;
    }
    var goodsList = batch.gbDPGEntities || [];
    console.log('[gbOrderBatch 出库打勾] ===== 批次接口日志 =====');
    console.log('[gbOrderBatch 出库打勾] api=', apiName, 'batchId=', this.data.batchId);
    console.log('[gbOrderBatch 出库打勾] batchStatus(gbDpbStatus)=', batch.gbDpbStatus);
    console.log('[gbOrderBatch 出库打勾] batchSubtotal(gbDpbSubtotal)=', batch.gbDpbSubtotal);
    console.log('[gbOrderBatch 出库打勾] goodsCount=', goodsList.length);

    for (var i = 0; i < goodsList.length; i++) {
      var item = goodsList[i];
      var goodsName = item.gbDistributerGoodsEntity
        ? item.gbDistributerGoodsEntity.gbDgGoodsName
        : '';
      var hasScale = item.gbDpgBuyScale !== null && item.gbDpgBuyScale !== '-1' && Number(item.gbDpgBuyScale) > 0;
      var orderLogs = [];
      var orders = item.gbDepartmentOrdersEntities || [];
      for (var j = 0; j < orders.length; j++) {
        var o = orders[j];
        orderLogs.push({
          orderId: o.gbDepartmentOrdersId,
          gbDoBuyStatus: o.gbDoBuyStatus,
          gbDoStatus: o.gbDoStatus,
          gbDoPrice: o.gbDoPrice,
          gbDoScalePrice: o.gbDoScalePrice,
          gbDoWeight: o.gbDoWeight,
          gbDoScaleWeight: o.gbDoScaleWeight,
          gbDoDsStandardScale: o.gbDoDsStandardScale,
          gbDoSubtotal: o.gbDoSubtotal,
          gbDoStandard: o.gbDoStandard,
          gbDoQuantity: o.gbDoQuantity,
        });
      }
      console.log('[gbOrderBatch 出库打勾] 商品[' + (i + 1) + ']', {
        purGoodsId: item.gbDistributerPurchaseGoodsId,
        goodsName: goodsName,
        gbDpgStatus: item.gbDpgStatus,
        gbDpgQuantity: item.gbDpgQuantity,
        gbDpgStandard: item.gbDpgStandard,
        gbDpgIsCheck: item.gbDpgIsCheck,
        checkExplain: orderGoodsCheck.explainPurGoodsIsCheck(item),
        gbDpgBuyPrice: item.gbDpgBuyPrice,
        gbDpgBuyScalePrice: item.gbDpgBuyScalePrice,
        gbDpgBuyScale: item.gbDpgBuyScale,
        gbDpgBuyQuantity: item.gbDpgBuyQuantity,
        gbDpgBuyScaleQuantity: item.gbDpgBuyScaleQuantity,
        gbDpgBuySubtotal: item.gbDpgBuySubtotal,
        isScaleGoods: hasScale,
        orders: orderLogs,
      });
    }
    console.log('[gbOrderBatch 出库打勾] ===== 批次接口日志结束 =====');
  },

  onLoad: function (options) {
    this._updateLayoutMetrics(globalData);
    var buyerInputFromStorage = wx.getStorageSync('gbOrderBatchBuyerInput') == 1;
    if (buyerInputFromStorage) {
      wx.removeStorageSync('gbOrderBatchBuyerInput');
    }
    var buyerInput = options.buyerInput == '1' || options.buyerInput === 1 || buyerInputFromStorage;
    this._isBuyerInputMode = buyerInput;
    var userInfo = buyerInput ? wx.getStorageSync('userInfo') : null;
    var disInfo = wx.getStorageSync('disInfo');
    var retName = options.retName || '';
    try {
      retName = decodeURIComponent(retName);
    } catch (e) {}
    this.setData({
      url: apiUrl.server,
      todayDate: dateUtil.getWhichOnlyDate(0),
      orderTime: dateUtil.getOnlyTime(0),
      avatarUrl: "/images/user.png",
      canRegister: false,
      batchId: options.batchId,
      retName: retName,
      disId: options.disId || (disInfo ? disInfo.gbDistributerId : ''),
      buyUserId: options.buyUserId || (userInfo ? userInfo.gbDepartmentUserId : ''),
      fromBuyer: options.fromBuyer,
      depId: options.depId,
      buyerInput: buyerInput,
      buyUser: buyerInput,
      userInfo: userInfo || null,
    });
  },

  /** 接口返回后：补全箱规字段、同步大包装小计，便于列表展示历史单价 */
  _prepareBatchGoodsList(batch) {
    if (!batch) return batch;
    var goodsList = batch.gbDPGEntities || [];
    for (var i = 0; i < goodsList.length; i++) {
      var item = goodsList[i];
      var orders = item.gbDepartmentOrdersEntities || [];
      orderGoodsScale.setupScalePackFields(item, orders);
      orderGoodsScale.syncPurGoodsQtyFromOrders(item);
      if (orderGoodsScale.isScalePurGoods(item)) {
        orderGoodsScale.syncPurGoodsScaleTotals(item);
      }
    }
    return batch;
  },

  _getInitData() {
    load.showLoading("获取订货商品")
    var that = this;
    getDisPurchaseGoodsBatchGb(this.data.batchId)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {

          var batch = res.result.data;
          batch = this._prepareBatchGoodsList(batch);
          var batchStatus = batch.gbDpbStatus;
          var waitWeightCount = 0;
          var goodsList = batch.gbDPGEntities || [];

          this._syncBatchSubtotal(batch);

          for (var i = 0; i < goodsList.length; i++) {
            var item = goodsList[i];
            if (item.gbDpgStatus < 2) {
              waitWeightCount++;
            }
            item.gbDpgIsCheck = orderGoodsCheck.computePurGoodsIsCheck(item);
          }

          var finishedOutCount = 0;
          for (var k = 0; k < goodsList.length; k++) {
            if (goodsList[k].gbDpgIsCheck == 1) {
              finishedOutCount++;
            }
          }

          this._logBatchOutCheckDebug(batch, 'getDisPurchaseGoodsBatchGb');
          console.log('[gbOrderBatch 出库打勾] finishedOutCount=', finishedOutCount);
          var nextViewMode = this._resolveViewMode(batchStatus);
          var buyerCanReEdit = this._isBuyerInputActive()
            && batchBuyerInput.canBuyerProxyEditBatch(batch);
          this.setData({
            batch: batch,
            batchStatus: batchStatus,
            disId: batch.gbDpbDistributerId,
            waitWeightCount: waitWeightCount,
            viewMode: nextViewMode,
            buyerCanReEdit: buyerCanReEdit,
          }, function () {
            this._updateLayoutMetrics();
            if (!(batchStatus == -1 && !this.data.buyUser && !this._isBuyerInputActive())) {
              this._syncNxDistributerOrderState();
            }
          }.bind(this));

          if (batchStatus == -1 && !this.data.buyUser && !this._isBuyerInputActive()) {
            this._shareUserRead();
          }

        } else {
          this.setData({
            billCancle: true,
          })

          // 订货取消后等待3秒再跳转
          wx.showToast({
            title: '，3秒后跳转...',
            icon: 'none',
            duration: 3000
          });
        
          setTimeout(() => {if(that.data.buyUser){
              wx.redirectTo({
                url: '../../../../pages/index/index',
              })
            }else{
              wx.redirectTo({
                url: '../jinriListWithLogin/jinriListWithLogin',
              })
            }
          

          }, 3000);
        }
      })
  },


  _userLogin() {
    if (this._isBuyerInputActive()) {
      this.setData({ buyerInput: true, buyUser: true, isSellRegiste: false });
      this._getInitData();
      return;
    }
    //jrdh用户登陆，默认是供货商卖方
    var that = this;
    wx.login({
      success: (res) => {

        var data = {
          gbDisId: this.data.disId,
          code: res.code,
          batchId: this.data.batchId,
          gbDepId: this.data.depId,
          buyUserId: this.data.buyUserId,
        }
        whichJrdhUserLoginGbJj(data)
          .then((res) => {if (res.result.code == 0) {
              that.setData({
                disInfo: res.result.data.disInfo,
              })

              if (res.result.data.code !== -1) {
                that.setData({
                  buyUser: res.result.data.buyUser,
                  supplierInfo: res.result.data.supplierInfo,
                  userInfo: res.result.data.userInfo, // 设置userInfo，防止重复登录
                  isSellRegiste: false, // 确保登录成功后不显示注册弹窗
                  nxBridgeFirstRelation: !!res.result.data.supplierRelationCreated,
                  isNxDistributerUser: !!res.result.data.isNxDistributerUser,
                  supplierRelationReady: !!res.result.data.supplierRelationReady,
                  nxBusinessRelationId: Number(res.result.data.nxBusinessRelationId || 0),
                })
                if (!res.result.data.buyUser) {
                  that.setData({
                    jrdhUserInfo: res.result.data.userInfo,
                    supplierInfo: res.result.data.supplierInfo,
                  })
                  wx.setStorageSync('jrdhUserInfo', res.result.data.userInfo);
                  wx.setStorageSync('supplierInfo', res.result.data.supplierInfo);

                }
                that._getInitData();
              } else {
                //采购员登陆失败
                that.setData({
                  isSellRegiste: true
                })
              }
            } else {
              wx.showToast({
                title: res.result.msg || '登录失败，请稍后重试',
                icon: 'none'
              })
            }
          })
      }
    })
  },


  _shareUserRead() {
    var that = this;
    var batch = that.data.batch;
    batch.gbDpbSellUserId = that.data.jrdhUserInfo.nxJrdhUserId;
    batch.gbDpbBuyUserId = that.data.buyUserId;
    batch.gbDpbSellUserOpenId = that.data.jrdhUserInfo.nxJrdhWxOpenId;
    batch.gbDpbSupplierId = that.data.supplierInfo.nxJrdhSupplierId;
    sellUserReadDisBatchGb(batch)
      .then(res => {
        if (res.result.code == 0) {
          var batchStatus = res.result.data.gbDpbStatus;
          this.setData({
            isTishi: false,
            batch: res.result.data,
            batchStatus: batchStatus,
            viewMode: this._resolveViewMode(batchStatus),
          }, function () {
            this._updateLayoutMetrics();
            this._syncNxDistributerOrderState();
          }.bind(this));
        }
      })
  },

  /** 统计本批次订单是否已经真正生成配送订单，不能只看批次上的配送商编号。 */
  _getNxBridgeProgress(batch, nxDisId) {
    var goodsList = batch && batch.gbDPGEntities ? batch.gbDPGEntities : [];
    var orderCount = 0;
    var linkedCount = 0;
    var conflictCount = 0;
    for (var i = 0; i < goodsList.length; i++) {
      var orders = goodsList[i].gbDepartmentOrdersEntities || [];
      for (var j = 0; j < orders.length; j++) {
        var order = orders[j] || {};
        var orderNxDisId = Number(order.gbDoNxDistributerId || 0);
        var nxOrderId = Number(order.gbDoNxDepartmentOrderId || 0);
        orderCount++;
        if (orderNxDisId > 0 && orderNxDisId !== nxDisId) {
          conflictCount++;
        } else if (orderNxDisId === nxDisId && nxOrderId > 0) {
          linkedCount++;
        }
      }
    }
    var state = 'pending';
    if (conflictCount > 0) {
      state = 'conflict';
    } else if (orderCount > 0 && linkedCount === orderCount) {
      state = Number(batch.gbDpbStatus) >= 2 ? 'delivered' : 'transferred';
    } else if (linkedCount > 0) {
      state = 'partial';
    } else if (Number(batch && batch.gbDpbStatus) >= 2) {
      state = 'closed';
    }
    return {
      state: state,
      orderCount: orderCount,
      linkedCount: linkedCount,
    };
  },

  /** 已绑定配送关系时，在订单页持续提供转单入口；只有首次建立饭店关系才显示引导。 */
  _syncNxDistributerOrderState() {
    if (this.data.buyUser || this._isBuyerInputActive()) {
      this.setData({
        nxBridgeReady: false,
        nxBridgeState: 'hidden',
        nxBridgeIntroVisible: false,
      });
      return;
    }
    var userInfo = this.data.jrdhUserInfo;
    var supplierInfo = this.data.supplierInfo;
    var nxDisId = userInfo ? Number(userInfo.nxJrdhNxDistributerId || 0) : 0;
    var supplierNxDisId = supplierInfo ? Number(supplierInfo.nxJrdhsNxDistributerId || 0) : 0;
    var businessRelationId = Number(this.data.nxBusinessRelationId || 0);
    var hasNxIdentity = this.data.isNxDistributerUser || nxDisId > 0;
    var hasSupplierRelation = businessRelationId > 0
      || this.data.supplierRelationReady
      || (nxDisId > 0 && supplierNxDisId === nxDisId);
    if (!hasNxIdentity || !hasSupplierRelation) {
      this.setData({
        nxBridgeReady: false,
        nxBridgeState: 'hidden',
        nxBridgeIntroVisible: false,
      });
      return;
    }

    var progress = this._getNxBridgeProgress(this.data.batch, nxDisId);
    this.setData({
      nxBridgeReady: true,
      nxBridgeNxDisId: nxDisId,
      nxBridgeState: progress.state,
      nxBridgeLinkedCount: progress.linkedCount,
      nxBridgeOrderCount: progress.orderCount,
      nxBridgeIntroVisible: this.data.nxBridgeFirstRelation && progress.state === 'pending',
      nxBridgeError: '',
    });
  },

  /** 必须由用户点击触发；微信会阻止页面加载完成后的自动跨小程序跳转。 */
  openNxDistributerOrder() {
    if (!this.data.nxBridgeReady || this.data.nxBridgeOpening || this.data.nxBridgeState === 'conflict') {
      return;
    }
    var that = this;
    var nxDisId = Number(this.data.nxBridgeNxDisId || 0);
    var transferred = this.data.nxBridgeState === 'transferred'
      || this.data.nxBridgeState === 'delivered';
    var targetPath = transferred
      ? 'pages/order/index/index'
      : 'subPackage-supplier/pages/trans/fromOrderPageGb/fromOrderPageGb?batchId=' +
        this.data.batchId + '&nxDisId=' + nxDisId;
    this.setData({ nxBridgeOpening: true, nxBridgeError: '' });
    wx.navigateToMiniProgram({
      appId: 'wx87baf9dcf935518a',
      path: targetPath,
      extraData: transferred
        ? { openOrderHome: true }
        : {
            batchId: this.data.batchId,
            nxDisId: nxDisId,
          },
      // 当前跨库转单功能只进入配送小程序体验版，避免误用正式版旧代码。
      envVersion: 'trial',
      success: function () {
        that.setData({
          nxBridgeOpening: false,
          nxBridgeIntroVisible: false,
          nxBridgeFirstRelation: false,
        });
      },
      fail: function (error) {
        console.error('[精彩账本转配送] navigateToMiniProgram 失败:', error);
        that.setData({
          nxBridgeOpening: false,
          nxBridgeError: '打开精彩接单失败，请稍后重试。',
        });
      },
    });
  },

  dismissNxBridgeIntro() {
    this.setData({
      nxBridgeIntroVisible: false,
      nxBridgeFirstRelation: false,
    });
  },

  noop() {},

  getSupplierBatch(e) {

    wx.redirectTo({
      url: '/subPackage-mendian/pages/supplier/supplierBills/supplierBills?sellUserId=' + this.data.batch.gbDpbSellUserId + '&disId=' + this.data.disId,
    })

  },

  onShareAppMessage(e) {
    if (e.target.dataset.type == 'outOrder') {
      return {
        title: '转发订货',
        path: '/subPackage-jrdh/pages/gbOrderBatch/gbOrderBatch?batchId=' + this.data.batchId +
          '&retName=' + this.data.retName + '&disId=' + this.data.disId + '&fromBuyer=0',
        envVersion: 'release', //release develop trial
        imageUrl: '',
      }
    }
    if (e.target.dataset.type == 'inOrder') {
      var shareObj = {
        imageUrl: '',
      }
      shareObj.title = "请称重这些订单"
      shareObj.path = '/subPackage-jrdh/pages/gbOrderBatch/gbOrderBatch?batchId=' + this.data.batchId + '&retName=' + this.data.retName + '&helpWeight=1';
      return shareObj;
    }
  },



  sellerCheckUnPay() {
    //本页面的this.data.batch.gbDpbSupplierId 供货商 Id，去寻找返回页面customerArr 的 item.nxJrdhSupplierId,// 存储供货商ID，用于返回时自动选择
    wx.setStorageSync('returnSupplierId', this.data.batch.gbDpbSupplierId);wx.redirectTo({
      url: '../jinriListWithLogin/jinriListWithLogin',
    })},


  showPrice() {
    this.setData({
      toPrice: true
    })
    wx.navigateTo({
      url: '../gbOrderInput/gbOrderInput?batchId=' + this.data.batchId + '&retName=' + this.data.retName,
    })
  },


  toEditOrdersNo() {
    wx.showToast({
      title: '请采购员解锁',
      icon: 'none'
    })
  },

  getNickName(e) {
    this.setData({
      nickName: e.detail.value,
    })
    if (e.detail.value.length > 0) {
      this.setData({
        canSave: true,
      })
    } else {
      this.setData({
        canSave: false
      })
    }
  },


  tishi() {
    if (!this.data.canSave) {
      wx.showToast({
        title: '请输入用户名',
        icon: 'none'
      })
    } else {
      wx.getUserProfile({
        desc: '用于完善会员资料', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
        success: resUser => {
          wx.login({
            success: (res) => {
              this.setData({
                code: res.code
              })
            }
          })
        }
      })
    }

  },

  // 实时获取输入内容（可选）
  onNicknameInput(e) {
    const value = e.detail.value;
    this.setData({
      nickName: value
    });this._checkRegister();
  },


  onChooseAvatar(e) {
    const {
      avatarUrl
    } = e.detail
    this.setData({
      avatarUrl,
    })
    this._checkRegister();
  },

  _checkRegister() {
    if (this.data.avatarUrl !== '/images/user.png' && this.data.nickName.length > 0) {
      this.setData({
        canRegister: true,
      })
    } else {
      this.setData({
        canRegister: false,
      })
    }
  },

  save(e) {
    if (!this.data.canRegister) {
      if (this.data.avatarUrl == '/images/user.png') {
        wx.showToast({
          title: '请选择头像',
          icon: 'none'
        })
      } else if (this.data.nickname !== "") {
        wx.showToast({
          title: '请选择微信昵称',
          icon: 'none'
        })
      }

    } else {
      wx.getUserProfile({
        desc: '用于完善会员资料', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
        success: resUser => {
          wx.login({
            success: (res) => {
              this.setData({
                code: res.code
              })
              var that = this;
              var src = [];
              src.push(this.data.avatarUrl)
              var filePathList = src;
              var userName = this.data.nickName;
              var gbDisId = this.data.disId;
              var code = this.data.code;
              var admin = 4;
              var buyUserId = this.data.buyUserId;
              load.showLoading("保存修改内容");
              jrdhSellerRegisterWithFileGbJj(filePathList, userName, code, admin, gbDisId, buyUserId, this.data.depId).then((res) => {
                load.hideLoading();
                if (res.result == '{"code":0}') {
                  this.setData({
                    isSellRegiste: false,
                    canSave: false
                  })

                  that._userLogin();

                }

              })


            }
          })
        }
      })
    }


  },

  sellRegiste() {
    wx.getUserProfile({
      desc: '用于完善会员资料', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: resUser => {
        wx.login({
          success: (res) => {
            this.setData({
              code: res.code
            })
          }
        })
      }
    })
  },




  // 

  showOperation(e) {
    var index = e.detail ? e.detail.index : e.currentTarget.dataset.index;
    var item = this.data.batch.gbDPGEntities[index];
    this.setData({
      showOperation: true,
      editPurGoods: item,
      index: index,

    })
  },

  hideMask() {
    this.setData({
      showOperation: false,
      editPurGoods: "",
      index: "",
    })
  },


  canclePurGoods(e) {
    var item = this.data.editPurGoods;
    this.setData({
      showOperation: false,
      popupType: 'deletePurGoods',
      showPopupWarn: true,
      warnContent: item.gbDgGoodsName,
    })
  },


  confirmWarn() {
    var id = this.data.editPurGoods.gbDistributerPurchaseGoodsId;
    supplierDeleteDisPurBatchGbItem(id)
      .then(res => {
        if (res.result.code == 0) {
          this._getInitData()
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })

        }
      })
  },


  againWeight() {
    var status = this.data.editPurGoods.gbDpgStatus;
    if (status < 2) {
      this.setData({
        showOperation: false
      })
      wx.showToast({
        title: '此商品还没有出库',
        icon: 'none'
      })
    } else {
      load.showLoading("重新出库称重此商品");
      var id = this.data.editPurGoods.gbDistributerPurchaseGoodsId;
      supplierInitWeightPurItem(id)
        .then(res => {
          load.hideLoading();
          if (res.result.code == 0) {
            this.setData({
              showOperation: false
            })
            this._getInitData()
          } else {
            wx.showToast({
              title: res.result.msg,
              icon: 'none'
            });

          }
        })
    }

  },

  closeWarn() {
    this.setData({
      editPurGoods: "",
      index: "",
      showPopupWarn: false,
      warnContent: "",

    })

  },


  toBack() {
    wx.setStorageSync('returnSupplierId', this.data.batch.gbDpbSupplierId);

    var pages = getCurrentPages();
    var prevPage = pages[pages.length - 2];
    prevPage.setData({
      supplierId: this.data.batch.gbDpbSupplierId,
    });
    wx.redirectTo({
      url: '../jinriListWithLogin/jinriListWithLogin',
    });
  },


  toEditOrders() {
    load.showLoading("修改订货");
    supplierEditBatchGb(this.data.batch.gbDistributerPurchaseBatchId)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          this._getInitData();
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          });
        }
      });
  },

  toWeight() {
    wx.navigateTo({
      url: '../gbOrderWeight/gbOrderWeight?batchId=' + this.data.batchId,
    })
  },


  showShareTishi() {// 重新计算等待出库的商品个数，确保数据准确
    var waitWeightCount = 0;
    for (var i = 0; i < this.data.batch.gbDPGEntities.length; i++) {
      if (this.data.batch.gbDPGEntities[i].gbDpgStatus < 2) {
        waitWeightCount++;
      }
    }

    // 更新数据
    this.setData({
      waitWeightCount: waitWeightCount
    });

    // 检查是否有未完成订单
    if (waitWeightCount > 0) {
      wx.showModal({
        title: "有" + waitWeightCount + "个未完成订单",
        content: "请输入数据或请采购员取消未完成订单",
        showCancel: false,
        confirmText: "知道了",
      })
      return;
    }

    // 检查是否有商品单价没有录完
    var uncheckedCount = 0;
    for (var i = 0; i < this.data.batch.gbDPGEntities.length; i++) {
      var item = this.data.batch.gbDPGEntities[i];
      if (!item.gbDpgIsCheck) {
        uncheckedCount++;
      }
    }if (uncheckedCount > 0) {
      wx.showModal({
        title: "单价没有录完",
        content: "还有" + uncheckedCount + "个商品单价未录入完成",
        showCancel: false,
        confirmText: "知道了",
      })
      return;
    }

    // 所有条件都满足，显示完成订货弹窗
    var that = this;
    that.setData({
      isTishi: true,
    })
  },

  // 处理支付方式选择
  radioChange(e) {
    var payType = parseInt(e.detail.value);
    this.setData({
      ["batch.gbDpbPayType"]: payType
    });
  },

  cancelCostBatch() {
    this.setData({
      isTishi: false
    })
  },



  sendSucess() {
    if (this.data.batch.gbDpbPayType == null) {
      wx.showToast({
        title: '请选择支付方式',
        icon: 'none'
      })
    } else {
      load.showLoading("保存订单");
      var sum = this._buySubtotalSumFromBatch(this.data.batch);
      var batchPayload = Object.assign({}, this.data.batch, {
        gbDpbSubtotal: sum,
      });
      if (!this._isBuyerInputActive()) {
        var jrdh = this.data.jrdhUserInfo;
        if (jrdh) {
          if (jrdh.nxJrdhWxOpenId) {
            batchPayload.gbDpbSellUserOpenId = jrdh.nxJrdhWxOpenId;
          }
          if (jrdh.nxJrdhUserId) {
            batchPayload.gbDpbSellUserId = jrdh.nxJrdhUserId;
          }
        }
      }
      this.setData({ batch: batchPayload });
      sellerFinishPurchaseGoodsBatchGb(batchPayload)
        .then(res => {
          load.hideLoading();
          if (res.result.code == 0) {
            if (this._isBuyerInputActive()) {
              wx.redirectTo({
                url: '/pages/index/index',
              });
              return;
            }
            wx.redirectTo({
              url: '../jinriListWithLogin/jinriListWithLogin',
            })

            // 延迟处理订阅消息，避免阻塞页面跳转
            setTimeout(() => {
              this.requestSubscribeMessage();
            }, 500);

          } else {
            wx.showToast({
              title: res.result.msg,
              icon: 'none'
            })
          }
        })
    }

  },

  // 独立的订阅消息处理方法
  requestSubscribeMessage() {
    wx.requestSubscribeMessage({
      tmplIds: SUPPLIER_SUBSCRIBE_TMPL_IDS,
      success() {},
      fail() {},
    });
  },

  toIndex() {
    wx.redirectTo({
      url: '/pages/index/index',
    });
  },

  onBuyerBack() {
    this.toIndex();
  },

  onSellerBack() {
    if (this._isBuyerInputActive()) {
      wx.navigateBack();
      return;
    }
    this.sellerCheckUnPay();
  },

  toCancleBack() {
    this.setData({ billCancle: false });
    if (this.data.buyUser) {
      wx.redirectTo({ url: '/pages/index/index' });
    } else {
      wx.redirectTo({ url: '../jinriListWithLogin/jinriListWithLogin' });
    }
  },

})
