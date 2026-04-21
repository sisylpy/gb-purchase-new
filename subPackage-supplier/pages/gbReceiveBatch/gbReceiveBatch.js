var load = require('../../../lib/load.js');
const globalData = getApp().globalData;
import apiUrl from '../../../config/index.js'

import {
  indexJrdhUserLoginJj,
  sellUserReadDisBatchGb,
  supplierDeleteDisPurBatchGbItem,
  supplierInitWeightPurItem,
  supplierEditBatchGb,
  sellerFinishPurchaseGoodsBatchGb,
  getDisPurchaseGoodsBatchGb,
} from '../../../services/depOrder'

import dateUtil from '../../../utils/dateUtil';

Page({

  onShow() {
    let globalData = getApp().globalData;
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      numWidth: (globalData.windowWidth / 4) * globalData.rpxR - 40,
      numContainerWidth: (globalData.windowWidth / 4) * globalData.rpxR - 20,
      numHeight: (globalData.windowWidth / 4) * globalData.rpxR - 40,
      numContainerHeight: (globalData.windowWidth / 4) * globalData.rpxR - 20,
      btnWidth: (globalData.windowWidth / 8) * globalData.rpxR - 20,
      btnWidthContainer: (globalData.windowWidth / 8) * globalData.rpxR,
      bigBtnWidth: (globalData.windowWidth / 6) * globalData.rpxR - 20,
      bigBtnWidthContainer: (globalData.windowWidth / 6) * globalData.rpxR,
    });

    if(this.data.jrdhUserInfo !== null){
      this._getInitData();
    }
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
    canSave: false,
    nickName: "",
    batch: {
      gbDPGEntities: []
    },
    from: ""
  },

  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      numWidth: (globalData.windowWidth / 4) * globalData.rpxR - 40,
      numContainerWidth: (globalData.windowWidth / 4) * globalData.rpxR - 20,
      numHeight: (globalData.windowWidth / 4) * globalData.rpxR - 40,
      numContainerHeight: (globalData.windowWidth / 4) * globalData.rpxR - 20,
      btnWidth: (globalData.windowWidth / 8) * globalData.rpxR - 20,
      btnWidthContainer: (globalData.windowWidth / 8) * globalData.rpxR,
      bigBtnWidth: (globalData.windowWidth / 6) * globalData.rpxR - 20,
      bigBtnWidthContainer: (globalData.windowWidth / 6) * globalData.rpxR,
      url: apiUrl.server,
      todayDate: dateUtil.getWhichOnlyDate(0),
      orderTime: dateUtil.getOnlyTime(0),
      avatarUrl: "/images/user.png",
      canRegister: false,
      batchId: options.batchId,
      retName: options.retName,
      from: options.from
    })

    var jrdhUserInfo = wx.getStorageSync('jrdhUserInfo');
    if(jrdhUserInfo){
      this.setData({
        jrdhUserInfo: jrdhUserInfo
      })
    }else{
      this._userLogin();
    }
  },

  _getInitData() {
    load.showLoading("获取订货商品")
    getDisPurchaseGoodsBatchGb(this.data.batchId)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          this.setData({
            batch: res.result.data,
            batchStatus: res.result.data.gbDpbStatus,
            disId: res.result.data.gbDpbDistributerId,
          })

          if(this.data.batchStatus == -1){
            this._shareUserRead();
          }

          var waitWeightCount = 0;
          for (var i = 0; i < this.data.batch.gbDPGEntities.length; i++) {
            if (this.data.batch.gbDPGEntities[i].gbDpgStatus < 2) {
              waitWeightCount++;
            }
          }

          for (var i = 0; i < this.data.batch.gbDPGEntities.length; i++) {
            var item = this.data.batch.gbDPGEntities[i];
            item.gbDpgIsCheck = false;

            if (item.gbDpgStatus == 2) {
              if (item.gbDistributerGoodsEntity.gbDepartmentOrdersEntities && item.gbDistributerGoodsEntity.gbDepartmentOrdersEntities.length > 0) {
                for (var j = 0; j < item.gbDistributerGoodsEntity.gbDepartmentOrdersEntities.length; j++) {
                  var order = item.gbDistributerGoodsEntity.gbDepartmentOrdersEntities[j];
                  if (order.gbDoBuyStatus == 3) {
                    item.gbDpgIsCheck = true;
                    break;
                  }
                }
              }
            }
          }
          this.setData({
            waitWeightCount: waitWeightCount,
            batch: this.data.batch,
          })

        } else {
          this.setData({
            billCancle: true,
          })

          wx.showToast({
            title: '订货已取消，3秒后跳转...',
            icon: 'none',
            duration: 3000
          });

          setTimeout(() => {
            wx.redirectTo({
              url: '../jinriListWithLogin/jinriListWithLogin',
            })
          }, 3000);
        }
      })
  },

  _userLogin() {
    load.showLoading("登录中");
    wx.login({
      success: (res) => {
        indexJrdhUserLoginJj(res.code)
          .then((res) => {
            load.hideLoading();
            this.setData({
              jrdhUserInfo: res.result.data.userInfo,
              sellerId: res.result.data.userInfo.nxJrdhUserId,
            })
            wx.setStorageSync('jrdhUserInfo', res.result.data.userInfo);
            this._getInitData();
          })
      }
    })
  },

  _shareUserRead() {
    var that = this;
    var batch = that.data.batch;
    batch.gbDpbSellUserId = that.data.jrdhUserInfo.nxJrdhUserId;
    batch.gbDpbSellUserOpenId = that.data.jrdhUserInfo.nxJrdhWxOpenId;
    sellUserReadDisBatchGb(batch)
      .then(res => {
        if (res.result.code == 0) {
          this.setData({
            isTishi: false,
            batch: res.result.data,
            batchStatus: res.result.data.gbDpbStatus,
          })
        }
      })
  },

  showOperation(e){
    var index = e.currentTarget.dataset.index;
    var item = this.data.batch.gbDPGEntities[index];
    this.setData({
      showOperation: true,
      editPurGoods: item,
      index: index,
    })
  },

  hideMask(){
    this.setData({
      showOperation: false,
      editPurGoods: "",
      index: "",
    })
  },

  canclePurGoods(e){
    var item = this.data.editPurGoods;
    this.setData({
      showOperation: false,
      popupType: 'deletePurGoods',
      showPopupWarn: true,
      warnContent: item.gbDistributerGoodsEntity.gbDgGoodsName,
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
    if(status < 2){
      this.setData({
        showOperation: false
      })
      wx.showToast({
        title: '此商品还没有出库',
        icon: 'none'
      })
    }else{
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
            })
          }
        })
    }
  },

  closeWarn(){
    this.setData({
      editPurGoods: "",
      index: "",
      showPopupWarn: false,
      warnContent: "",
    })
  },

  onShareAppMessage(e) {
    var shareObj = {
      imageUrl: '',
    }
    shareObj.title = "请称重这些订单"
    shareObj.path = '/subPackage-supplier/pages/gbOrderWeight/gbOrderWeight?batchId=' + this.data.batchId + '&retName=' + this.data.retName;
    return shareObj;
  },

  toBack(){
    wx.setStorageSync('returnSupplierId', this.data.batch.gbDpbSupplierId);

    if(this.data.from == 'supplier'){
      var pages = getCurrentPages();
      if(pages.length > 1){
        var prevPage = pages[pages.length - 2];
        prevPage.setData({
          supplierId: this.data.batch.gbDpbSupplierId,
        })
      }
      wx.navigateBack({delta : 1})
    }else if(this.data.from == 'notification'){
      wx.redirectTo({
        url: '../jinriListWithLogin/jinriListWithLogin',
      })
    } else{
      wx.redirectTo({
        url: '../../../../pages/index/index',
      })
    }
  },

  showPrice() {
    this.setData({
      toPrice: true
    })
    wx.navigateTo({
      url: '../gbOrderInput/gbOrderInput?batchId=' + this.data.batchId + '&retName=' + this.data.retName,
    })
  },

  toEditOrders() {
    load.showLoading("修改订货");
    supplierEditBatchGb(this.data.batch.gbDistributerPurchaseBatchId)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          this._getInitData();
        }else{
          wx.showToast({
            title: res.result.msg,
            icon :'none'
          })
        }
      })
  },

  toEditOrdersNo() {
    wx.showToast({
      title: '请采购员解锁',
      icon: 'none'
    })
  },

  toWeight(){
    wx.navigateTo({
      url: '../gbOrderWeight/gbOrderWeight?batchId=' + this.data.batchId,
    })
  },

  showShareTishi() {
    if (this.data.waitWeightCount > 0) {
      wx.showModal({
        title: "有" + this.data.waitWeightCount + "个未完成订单",
        content: "请输入数据",
        showCancel: false,
        confirmText: "知道了",
      })
      return;
    }

    var uncheckedCount = 0;
    for (var i = 0; i < this.data.batch.gbDPGEntities.length; i++) {
      var item = this.data.batch.gbDPGEntities[i];
      if (!item.gbDpgIsCheck) {
        uncheckedCount++;
      }
    }

    if (uncheckedCount > 0) {
      wx.showModal({
        title: "单价没有录完",
        content: "还有" + uncheckedCount + "个商品单价未录入完成",
        showCancel: false,
        confirmText: "知道了",
      })
      return;
    }

    var that = this;
    that.setData({
      isTishi: true,
    })
  },

  radioChange(e) {
    var payType = parseInt(e.detail.value);
    this.setData({
      ["batch.gbDpbPayType"]: payType
    });
  },

  cancelCostBatch(){
    this.setData({
      isTishi: false
    })
  },

  sendSucess() {
    if(this.data.batch.gbDpbPayType == null){
      wx.showToast({
        title: '请选择支付方式',
        icon: 'none'
      })
    }else{
      load.showLoading("保存订单");
      sellerFinishPurchaseGoodsBatchGb(this.data.batch)
        .then(res => {
          load.hideLoading();
          if (res.result.code == 0) {
            if(this.data.from == 'supplier'){
              var pages = getCurrentPages();
              var prevPage1 = pages[pages.length - 2];
              prevPage1.setData({
                skipRefresh: false,
              })
              wx.navigateBack({
                delta: 1,
              })
            }else{
              wx.redirectTo({
                url: '../jinriListWithLogin/jinriListWithLogin',
              })
            }

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

  requestSubscribeMessage() {
    wx.requestSubscribeMessage({
      tmplIds: [
        'CgludlqVZc_vmFaZUgVFC-iprkydrtOfF_GcODltpTc',
        'wCtYVih8kAdCHjfaYL1qwOtQnmQEKAGO_EgRmlB6cOE',
        '_KhWtCVg3fIBH-tHqSV0hUk5m_vuKmxw1CGn0PEv6D0'
      ],
      success(res) {
        console.log("订阅消息成功", res);
      },
      fail(res) {
        console.log('订阅消息失败', res);
      }
    })
  },
})
