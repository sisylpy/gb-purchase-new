/**
 * 首页 - 采购/订货主页面
 *
 * 方法分区索引：
 *   一、依赖 & API 清单
 *   二、页面初始数据
 *   三、生命周期（onLoad, onShow）
 *   四、数据加载（_getInitData, _initBatchData)
 *   五、登录认证（_userLogin,)
 *   六、商品选择（selectItem, selectOrders, deleteOrderGoods, _getPurSelArr）
 *   七、订货批次（cancelGbBatchItem, receiveGbBatchItem, changeAutoGoods, onShareAppMessage 等）
 *   八、门店设置（showPopup, hidePopup, bindKeyInput, radioChange 等）
 *   九、页面跳转（toStock, toFinishPurGoods, toOrderApp, toAiOrders 等）
 *   十、UI 交互（swiperChange, onTab1Click, calculateSlider, chooseSezi 等）
 */

// ============================================
// 一、依赖 & API 清单
// ============================================

var app = getApp();
var config = require('../../config/index');
var dateUtils = require('../../lib/dateUtil');
var load = require('../../lib/load');
var requestUtil = require('../../lib/request');
var depOrderApi = require('../../services/depOrder');
var pagesApi = require('../services/pages');
var purchaseContext = require('../../lib/purchaseContext');
var batchBuyerInput = require('../../lib/batchBuyerInput');


// --- 本页面用到的所有 API 接口 ---
// depOrderApi.getStorePurchaseGoodsGbWithTabCount(disId)    获取采购商品列表（含Tab统计数量）
// depOrderApi.getDisDepartmentGbMendianJing(disId)      集团下门店列表（首页切换门店）
// depOrderApi.storeGetBuyingGoodsGb(depId)              获取订货批次列表
// depOrderApi.saveDisPurGoodsBatchGb(data)            保存订货批次（分享转发时触发）
// depOrderApi.purUserSaveMendain(data)                  保存门店设置
// depOrderApi.deleteDisPurBatchGbItem(id)               删除订货批次中的商品
// depOrderApi.receiveGbBatchItem(id)                    确认收货（单品）
// depOrderApi.receiveGbBatch(id)                        确认收货（整批）
// depOrderApi.puraserReturnPurGoods(data)               退货操作
// depOrderApi.addAutoOrderGoods(data)                   切换自动订货
// depOrderApi.cancleTuihuoByPurGoodsId(id)              取消退货
// pagesApi.gbLoginIndex(code)                           微信登录


Page({

  // ============================================
  // 二、页面初始数据
  // ============================================

  data: {
    tab1Index: 0,
    itemIndex: 0,            // 当前选中的 Tab 索引
    sliderWidth: 0,          // 滑块宽度
    sliderLeft: 0,           // 滑块偏移量

    purArr: [],
    selectedArr: [],
    showGoods: false,
    userInfo: null,  
    tabs: [{
        name: "未采购",
        amount: ""
      },
      {
        name: "订货",
        amount: ""
      }
    ],
    goodsSupplierId: null,
   
    mendianInfo: null,

    // 部门设置弹窗
    showPage: false,
    popupAnimation: {},
    hasSubs: 2,
    selNumber: 1,
    gbDepartmentEntities: [],
    _checkedDepartment: false,  // 首次部门检查标记，只检查一次
  },

  // ============================================
  // 三、生命周期
  // ============================================

  onLoad: function (options) {
    var week = dateUtils.getWhatDay(0);
    var date = dateUtils.getOnlyHao(0);
    var windowInfo = wx.getWindowInfo();
    var globalData = app.globalData;
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      week: week,
      date: date,
      url: requestUtil.getServerUrl(),
    });

    
    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      var admin = userInfo.gbDuAdmin;
      if (admin ==  12) {
        var orderDepInfo = wx.getStorageSync('orderDepInfo') || wx.getStorageSync('mendianInfo');
        if (orderDepInfo) {
          wx.setStorageSync('orderDepInfo', orderDepInfo);
        }
        wx.redirectTo({
          url: '/subPackage-mendian/pages/order/chefOrderDep/chefOrderDep',
        });
      } else {
        var depInfo = wx.getStorageSync('mendianInfo');
        this.setData({
          userInfo: userInfo,
          mendianInfo: depInfo,
        });
      }
    } else {
      this._userLogin();
    }

    this.calculateSlider(0);
  },

  onShow: function () {
   
    var disInfo  = wx.getStorageSync('disInfo');
    var mendianInfo  = wx.getStorageSync('mendianInfo');
    var newDepId = mendianInfo ? mendianInfo.gbDepartmentId : null;
    var depChanged = this.data.depId && newDepId && this.data.depId !== newDepId;

    if(mendianInfo){
      this.setData({
        mendianInfo: mendianInfo,
        depId: newDepId,
      })
    }

    if(disInfo){
      this.setData({
        disInfo: disInfo
      })
    }
    
    wx.removeStorageSync('selArr');

    if (this.data.depId && this.data.mendianInfo) {
      if (depChanged) {
        this.setData({ purArr: [], batchArr: [], selectedArr: [] });
      }
      if (this.data.tab1Index == 0) {
        this._getInitData();
      } else {
        this._initBatchData();
      }
    }
  },

  /** 获取采购商品列表（Tab1 - 未采购） */
  _getInitData: function () {
    load.showLoading("获取订单");

    depOrderApi.getStorePurchaseGoodsGbWithTabCount(this.data.depId)
      .then(function (res) {
        load.hideLoading();
        if (res.result.code == 0) {
          console.log("ddadddaaaaddddaaaxxx",res.result.data);
          var newOrderCount = "tabs[0].amount";
          var wxOrderCountData = "tabs[1].amount";
         
          this.setData({
            purArr: res.result.data.arr,
            selectedArr: [],
            [newOrderCount]: res.result.data.orderAmount,
            [wxOrderCountData]: res.result.data.wxAmount,
            disInfo: res.result.data.disInfo,
          })
          wx.setStorageSync('disInfo', res.result.data.disInfo);
          // this._checkIfShowPage();
        } else {
          load.hideLoading()
          this.setData({ purArr: [] });r
          wx.showToast({ title: res.result.msg, icon: 'none' });
          this.setData({ purArr: [] });
        }
      }.bind(this));
  },

  /** 获取订货批次列表（Tab2 - 普通） */
  _initBatchData: function () {
    load.showLoading("获取订货");
    depOrderApi.storeGetBuyingGoodsGb(this.data.depId)
      .then(function (res) {
        load.hideLoading();
        if (res.result.code == 0) {
          wx.stopPullDownRefresh();
          this.setData({ orderRefreshing: false });
          var newOrderCount = "tabs[0].amount";
          var wxOrderCountData = "tabs[1].amount";
          var batchPatch = {
            batchArr: res.result.data.arr,
            [newOrderCount]: res.result.data.orderAmount,
            [wxOrderCountData]: res.result.data.wxAmount,
          };
         
          this.setData(batchPatch);
        } else {
          this.setData({ purArr: [], batchSize: 0, finishSize: 0, selectedArr: [] });
          wx.showToast({ title: res.result.msg, icon: 'none' });
          this.setData({ purArr: [] });
        }
      }.bind(this));
  },

  /** Purchase 页面下拉刷新 */
  onPurchaseRefresh: function () {
    this.setData({ purchaseRefreshing: true });
    load.showLoading("获取订单");
    depOrderApi.getStorePurchaseGoodsGbWithTabCount(this.data.depId)
      .then(function (res) {
        load.hideLoading();
        if (res.result.code == 0) {
          wx.stopPullDownRefresh();
          this.setData({ purchaseRefreshing: false });
          var newOrderCount = "tabs[0].amount";
          var wxOrderCountData = "tabs[1].amount";
          var di3 = res.result.data.disInfo;
          var refreshPatch = {
            purArr: res.result.data.arr,
            selectedArr: [],
            [newOrderCount]: res.result.data.orderAmount,
            [wxOrderCountData]: res.result.data.wxAmount,
            disInfo: di3,
          };
         
          wx.setStorageSync('disInfo', di3);
        } else {
          this.setData({ purArr: [] });
          wx.showToast({ title: res.result.msg, icon: 'none' });
          this.setData({ purArr: [] });
        }
      }.bind(this));
  },

  /** Order 页面下拉刷新 */
  onOrderRefresh: function () {
    this.setData({ orderRefreshing: true });
    this._initBatchData();
  },

  // ============================================
  // 五、登录认证
  // ============================================


  /** 微信登录 */
  _userLogin: function () {
    wx.login({
      success: function (resLogin) {
        pagesApi.gbLoginIndex(resLogin.code)
          .then(function (res) {
            console.log("login====", res.result);
            if (res.result.code !== -1) {
              if (res.result.data !== "noBuyer") {
                wx.setStorageSync('disInfo', res.result.data.disInfo);
                wx.setStorageSync('userInfo', res.result.data.depUserInfo);

                wx.setStorageSync('mendianInfo', res.result.data.depInfo);
                var admin = res.result.data.depUserInfo.gbDuAdmin;
               
                if ( admin == 0 || admin == 11 ) {
                  this.setData({
                    disInfo: res.result.data.disInfro,
                    userInfo: res.result.data.depUserInfo,
                    depId: res.result.data.depInfo.gbDepartmentId,
                    mendianInfo: res.result.data.depInfo,
                  });
                  // this._checkIfShowPage();

                  this._getInitData();
                } else {
                  wx.setStorageSync('disInfo', res.result.data.disInfo);
                  wx.setStorageSync('userInfo', res.result.data.depUserInfo);
                  wx.setStorageSync('mendianInfo', res.result.data.depInfo);
                  wx.setStorageSync('orderDepInfo', res.result.data.orderDepInfo);
                  wx.redirectTo({
                    url: '/subPackage-mendian/pages/order/chefOrderDep/chefOrderDep',
                  });
                }
              } else {
                wx.redirectTo({
                  url: '/subPackage-jrdh/pages/jinriListWithLogin/jinriListWithLogin',
                });
              }
            } else {
              wx.redirectTo({
                url: '../tro/tro',
              });
            }
          }.bind(this));
      }.bind(this)
    });
  },

  // ============================================
  // 六、商品选择
  // ============================================

  /** 选中/取消选中商品 */
  selectItem: function (e) {
    var index = e.currentTarget.dataset.index;
    var id = e.currentTarget.dataset.id;
    var item = this.data.purArr[index];
    var itemSelected = this.data.purArr[index].isSelected;
    var selectedData = "purArr[" + index + "].isSelected";
    var selectedArrTemp = this.data.selectedArr;

    if (itemSelected) {
      selectedArrTemp.splice(selectedArrTemp.findIndex(function (item) { return item.id === id; }), 1);
      this.setData({
        [selectedData]: false,
        selectedArr: selectedArrTemp,
      });
      var purItemDeselect = this.data.purArr[index];
      var orderArr = purItemDeselect.gbDepartmentOrdersEntities || (purItemDeselect.gbDistributerGoodsEntity && purItemDeselect.gbDistributerGoodsEntity.gbDepartmentOrdersEntities) || [];
      for (var i = 0; i < orderArr.length; i++) {
        var orderDataKey = purItemDeselect.gbDepartmentOrdersEntities
          ? "purArr[" + index + "].gbDepartmentOrdersEntities[" + i + "].isNotice"
          : "purArr[" + index + "].gbDistributerGoodsEntity.gbDepartmentOrdersEntities[" + i + "].isNotice";
        this.setData({ [orderDataKey]: false });
      }
    } else {
      var selItem = { item: item, goodsIndex: index, id: id };
      selectedArrTemp.push(selItem);
      this.setData({
        [selectedData]: true,
        selectedArr: selectedArrTemp,
      });
      var purItem = this.data.purArr[index];
      var arr = purItem.gbDepartmentOrdersEntities || (purItem.gbDistributerGoodsEntity && purItem.gbDistributerGoodsEntity.gbDepartmentOrdersEntities) || [];
      for (var i = 0; i < arr.length; i++) {
        var orderKey = purItem.gbDepartmentOrdersEntities
          ? "purArr[" + index + "].gbDepartmentOrdersEntities[" + i + "].isNotice"
          : "purArr[" + index + "].gbDistributerGoodsEntity.gbDepartmentOrdersEntities[" + i + "].isNotice";
        this.setData({ [orderKey]: true });
      }
    }
  },

  /** 选中/取消子订单 */
  selectOrders: function (e) {
    var index = e.currentTarget.dataset.index;
    var orderIndex = e.currentTarget.dataset.orderindex;
    var purItem = this.data.purArr[index];
    var arr = purItem.gbDepartmentOrdersEntities || (purItem.gbDistributerGoodsEntity && purItem.gbDistributerGoodsEntity.gbDepartmentOrdersEntities) || [];
    var orderChoiced = arr[orderIndex] ? arr[orderIndex].isNotice : false;
    var orderChoicedData = purItem.gbDepartmentOrdersEntities
      ? "purArr[" + index + "].gbDepartmentOrdersEntities[" + orderIndex + "].isNotice"
      : "purArr[" + index + "].gbDistributerGoodsEntity.gbDepartmentOrdersEntities[" + orderIndex + "].isNotice";

    if (orderChoiced) {
      this.setData({ [orderChoicedData]: false });
      var noChoiceAmount = 0;
      for (var i = 0; i < arr.length; i++) {
        if (!arr[i].isNotice) {
          noChoiceAmount = Number(noChoiceAmount) + Number(1);
        }
      }
      if (noChoiceAmount == arr.length) {
        var goodsSelectedData = "purArr[" + index + "].isSelected";
        var selArr = this.data.selectedArr;
        var newSelArr = selArr.filter(function (item) { return item.goodsIndex !== index; });
        this.setData({
          [goodsSelectedData]: false,
          selectedArr: newSelArr,
        });
      }
    } else {
      this.setData({ [orderChoicedData]: true });
      var id = this.data.purArr[index].gbDistributerPurchaseGoodsId;
      var selectedArrTemp = this.data.selectedArr;
      var item = this.data.purArr[index];

      if (selectedArrTemp.length > 0) {
        for (var i = 0; i < selectedArrTemp.length; i++) {
          if (selectedArrTemp[i].id == id) {
            selectedArrTemp.splice(i, 1);
          }
        }
        var selItem = { item: item, goodsIndex: index, id: id };
        selectedArrTemp.push(selItem);
        var selectedData = "purArr[" + index + "].isSelected";
        this.setData({
          [selectedData]: true,
          selectedArr: selectedArrTemp,
        });
      } else {
        var temp = [];
        var selItem = { item: item, goodsIndex: index, id: id };
        temp.push(selItem);
        var selectedData = "purArr[" + index + "].isSelected";
        this.setData({
          [selectedData]: true,
          selectedArr: temp,
        });
      }
    }
  },

  /** 删除已选商品 */
  deleteOrderGoods: function (e) {
    var selArr = this.data.selectedArr;
    var index = e.currentTarget.dataset.index;
    var selItem = this.data.selectedArr[index];
    var selgoodsIndex = selItem.goodsIndex;
    var purData = "purArr[" + selgoodsIndex + "].isSelected";
    selArr.splice(index, 1);
    var orderArr = this.data.purArr[selgoodsIndex].gbDepartmentOrdersEntities;
    if (orderArr.length > 0) {
      for (var i = 0; i < orderArr.length; i++) {
        var oderData = "purArr[" + selgoodsIndex + "].gbDepartmentOrdersEntities[" + i + "].isNotice";
        this.setData({ [oderData]: false });
      }
    }
    this.setData({
      [purData]: false,
      selectedArr: selArr,
    });
    if (selArr.length == 0) {
      this.setData({ showOperation: false });
    }
  },

  /** 获取已选商品数组 */
  _getPurSelArr: function () {
    var arr = this.data.selectedArr;
    console.log('[_getPurSelArr] selectedArr:', JSON.stringify(arr));
    var temp = [];
    if (arr.length > 0) {
      for (var i = 0; i < arr.length; i++) {
        arr[i].item.purchaseDepartmentEntity = null;
        arr[i].item.purchaseDepartmentUser = null;
        arr[i].item.wasteDepartmentEntities = null;
        temp.push(arr[i].item);
      }
    }
    console.log('[_getPurSelArr] final arr:', JSON.stringify(temp));
    return temp;
  },

  // ============================================
  // 七、订货批次操作
  // ============================================

  /** 取消订货商品 */
  cancelGbBatchItem: function () {
    this.setData({ showOperation: false });
    if (this.data.editPurGoods.gbDpgOrdersWeightAmount > 0) {
      wx.showModal({
        title: '供货商已出库',
        content: '如果要取消订货，请供货商先设置商品为"重新拣货称重"',
        showCancel: false,
        confirmText: "好的",
      });
    } else {
      var id = this.data.editPurGoods.gbDistributerPurchaseGoodsId;
      var that = this;
      depOrderApi.deleteDisPurBatchGbItem(id)
        .then(function (res) {
          if (res.result.code == 0) {
            that._initBatchData();
          } else {
            wx.showToast({ title: res.result.msg, icon: 'none' });
          }
        });
    }
  },

  /** 确认收货（单品） */
  receiveGbBatchItem: function () {
    this.setData({ showOperation: false });
    if (this.data.editBatch.gbDpbStatus < 2) {
      wx.showModal({
        title: '出库',
        content: '如果要取消订货，请供货商先设置商品为"重新拣货称重"',
        showCancel: false,
        confirmText: "好的",
      });
    } else {
      var id = this.data.editPurGoods.gbDistributerPurchaseGoodsId;
      var that = this;
      depOrderApi.receiveGbBatchItem(id)
        .then(function (res) {
          if (res.result.code == 0) {
            that._initBatchData();
          } else {
            wx.showToast({ title: res.result.msg, icon: 'none' });
          }
        });
    }
  },

  /** 取消农鲜数据项 */
  cancelGbNxDataItem: function (e) {
    var that = this;
    depOrderApi.deleteDisPurAndNxDataItem(e.currentTarget.dataset.id)
      .then(function (res) {
        if (res.result.code == 0) {
          that._getAppOrder();
        } else {
          wx.showToast({ title: res.result.msg, icon: 'none' });
          that._getAppOrder();
        }
      });
  },

  /** 切换自动订货 */
  changeAutoGoods: function (e) {
    var goodsId = this.data.editPurGoods.gbDpgDisGoodsId;
    var supplierId = this.data.editBatch.gbDpbSupplierId;
    var currentGsId = this.data.editPurGoods.gbDgGbSupplierId;
    // 接口/列表里常见 number 与 string 混用，用 != 判断“是否为同一供货商”；!== 会把 1 与 "1" 当成不同
    var isEnablingAuto = supplierId != currentGsId;
    var changeSupplierId = isEnablingAuto ? supplierId : -1;
    var that = this;

    this.setData({ showTip: true, showOperation: false });
    load.showLoading(isEnablingAuto ? "开启自动订货中..." : "取消自动订货中...");

    depOrderApi.addAutoOrderGoods({
      supplierId: changeSupplierId,
      goodsId: goodsId,
    }).then(function (res) {
      load.hideLoading();
      if (res.result.code === 0) {
        wx.showToast({
          title: isEnablingAuto ? '已开启自动订货' : '已关闭自动订货',
          icon: 'success',
          duration: 2000,
        });
        var data = "batchArr[" + that.data.bIndex + "].gbDPGEntities[" + that.data.gIndex + "].gbDgGbSupplierId";
        var newGbDgGbSupplierId = isEnablingAuto ? supplierId : -1;
        that.setData({ [data]: newGbDgGbSupplierId });
      } else {
        wx.showToast({ title: res.result.msg || '操作失败', icon: 'none' });
        that.setData({ showTip: false });
      }
    });
  },

  /** 显示商品操作面板 */
  toEditPurGoods: function (e) {
    this.setData({
      bIndex: e.currentTarget.dataset.bindex,
      gIndex: e.currentTarget.dataset.gindex,
      gDepArr: e.currentTarget.dataset.item.gbDepartmentOrdersEntities,
      goodsSupplierId: e.currentTarget.dataset.item.gbDpgPurchaseNxSupplierId,
      selSupplerId: e.currentTarget.dataset.item.gbDpgPurchaseNxSupplierId,
      showOperation: true,
      editPurGoods: e.currentTarget.dataset.item,
      editBatch: e.currentTarget.dataset.batch,
    });
  },

  /** 显示收货确认 */
  showFinish: function (e) {
    this.setData({
      showReceiveWarn: true,
      editBatch: e.currentTarget.dataset.item,
    });
  },

  /** 隐藏收货确认 */
  hideReceive: function () {
    this.setData({
      showReceiveWarn: false,
      editBatch: "",
    });
  },

  /** 整批收货 */
  toReceiveBatch: function () {
    this.setData({ showReceiveWarn: false });
    var id = this.data.editBatch.gbDistributerPurchaseBatchId;
    var that = this;
    load.showLoading("收货中");
    depOrderApi.receiveGbBatch(id).then(function (res) {
      load.hideLoading();
      if (res.result.code == 0) {
        that._initBatchData();
      } else {
        wx.showToast({ title: res.result.msg, icon: 'none' });
      }
    });
  },

  /** 取消退货 */
  delTuihuo: function (e) {
    var id = e.currentTarget.dataset.id;
    var that = this;
    wx.showModal({
      title: '确认取消退货',
      content: '您确定要取消退货吗？',
      showCancel: true,
      confirmText: '确认',
      cancelText: '取消',
      success: function (res) {
        if (res.confirm) {
          depOrderApi.cancleTuihuoByPurGoodsId(id).then(function (res) {
            if (res.result.code == 0) {
              that._initBatchData();
            }
          });
        }
      },
    });
  },

  /** 显示退货弹窗 */
  showReturnType: function (e) {
    this.setData({
      showReturn: true,
      returnItem: e.currentTarget.dataset.item,
      returnOrders: e.currentTarget.dataset.item.gbDepartmentOrdersEntities[0],
    });
  },

  /** 确认退货 */
  confirmReturn: function () {
    var item = this.data.returnItem;
    if (!item || !item.gbDistributerPurchaseGoodsId) {
      wx.showToast({ title: '退货数据无效', icon: 'none' });
      return;
    }
    var that = this;
    depOrderApi.puraserReturnPurGoods({
      gbDistributerPurchaseGoodsId: item.gbDistributerPurchaseGoodsId,
      gbDpgPurUserId: this.data.userInfo.gbDepartmentUserId,
    }).then(function (res) {
      if (res.result.code == 0) {
        that.setData({ showReturn: false });
        that._getInitData();
      } else {
        wx.showToast({ title: res.result.msg || '操作失败', icon: 'none' });
      }
    }).catch(function () {
      wx.showToast({ title: '请求失败', icon: 'none' });
    });
  },

  /** 分享转发 */
  onShareAppMessage: function (e) {
    var that = this;
    return new Promise(function (resolve, reject) {
      var arr = that._getPurSelArr();
      var batch = {
        gbDpbPurUserId: that.data.userInfo.gbDepartmentUserId,
        gbDpbDistributerId: that.data.disInfo.gbDistributerId,
        gbDpbPurDepartmentId: that.data.depId,
        gbDpbUserAdminType: 1,
        gbDPGEntities: arr,
        gbDpbBuyUserOpenId: that.data.userInfo.gbDuWxOpenId,
      };

      load.showLoading("保存订货");
      depOrderApi.saveDisPurGoodsBatchGb(batch).then(function (res) {
        load.hideLoading();
        if (res.result.code == 0) {
          var batchId = res.result.data.gbDistributerPurchaseBatchId;
          var retName = that.data.disInfo.gbDistributerName;
          var userId = that.data.userInfo.gbDepartmentUserId;
          var depId = that.data.depId;
          that.setData({
            isTishi: true,
            selectedArr: [],
            batchId: batchId,
            retName: retName,
          });
          resolve({
            title: "订货商品",
            path: 'subPackage-jrdh/pages/gbOrderBatch/gbOrderBatch?batchId=' + batchId + '&retName=' + retName + '&disId=' + that.data.disInfo.gbDistributerId + '&fromBuyer=1&depId=' + depId + '&buyUserId=' + userId,
            imageUrl: that.data.url + '/userImage/say.png',
          });
        } else {
          wx.showToast({ title: res.result.msg, icon: 'none' });
        }
      });
    });
  },

  /** 批次操作菜单 */
  onBatchMenuTap: function (e) {
    var batch = e.currentTarget.dataset.batch;
    var bIndex = e.currentTarget.dataset.bindex;
    this.setData({
      currentBatch: batch,
      currentBIndex: bIndex,
    });
    var that = this;
    var itemList;
    if (batchBuyerInput.needsBuyerUnlockBatch(batch)) {
      itemList = ['修改这个批次'];
    } else if (batchBuyerInput.isSupplierInvolved(batch) && Number(batch.gbDpbStatus) >= 2) {
      wx.showToast({ title: '供货商已提交，无法修改', icon: 'none' });
      return;
    } else if (Number(batch.gbDpbStatus) >= 3) {
      wx.showToast({ title: '该批次已收货，无法修改', icon: 'none' });
      return;
    } else {
      itemList = ['删除全部订货', '录入采购单'];
    }
    wx.showActionSheet({
      itemList: itemList,
      success: function (res) {
        if (batchBuyerInput.needsBuyerUnlockBatch(that.data.currentBatch)) {
          if (res.tapIndex === 0) {
            that.unlockBuyerProxyBatch();
          }
          return;
        }
        if (res.tapIndex === 0) {
          that.deleteGbBatch();
        } else if (res.tapIndex === 1) {
          that.toGbOrderInput();
        }
      },
    });
  },

  /** 采购员代录入已提交：解锁批次回到未提交（status 2 → 0） */
  unlockBuyerProxyBatch: function () {
    var that = this;
    var batch = this.data.currentBatch;
    if (!batch || !batchBuyerInput.needsBuyerUnlockBatch(batch)) {
      return;
    }
    wx.showModal({
      title: '修改这个批次',
      content: '解锁后可重新录入单价/数量，或删除本批次。',
      confirmText: '解锁',
      cancelText: '取消',
      success: function (res) {
        if (!res.confirm) {
          return;
        }
        load.showLoading('解锁中');
        depOrderApi.supplierEditBatchGb(batch.gbDistributerPurchaseBatchId)
          .then(function (res) {
            load.hideLoading();
            if (res.result.code == 0) {
              wx.showToast({ title: '已解锁，可继续修改', icon: 'success' });
              that._initBatchData();
            } else {
              wx.showToast({ title: res.result.msg || '解锁失败', icon: 'none' });
            }
          });
      },
    });
  },

  /** 删除整个订货批次 */
  deleteGbBatch: function () {
    var that = this;
    var batch = this.data.currentBatch;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除整个订单批次吗？删除后不可恢复。',
      showCancel: true,
      confirmText: '确认删除',
      cancelText: '取消',
      confirmColor: '#e64340',
      success: function (res) {
        if (res.confirm) {
          load.showLoading('删除中');
          depOrderApi.deleteDisPurBatchGb(batch.gbDistributerPurchaseBatchId)
            .then(function (res) {
              load.hideLoading();
              if (res.result.code == 0) {
                wx.showToast({ title: '已删除', icon: 'success' });
                that._initBatchData();
              } else {
                wx.showToast({ title: res.result.msg || '删除失败', icon: 'none' });
              }
            });
        }
      },
    });
  },

  /** 跳转录入单价/数量页面（采购员代供货商录入） */
  toGbOrderInput: function () {
    var batch = this.data.currentBatch;
    if (!batch) {
      return;
    }
    if (!batchBuyerInput.canBuyerProxyEditBatch(batch)) {
      wx.showToast({
        title: batchBuyerInput.needsBuyerUnlockBatch(batch)
          ? '请先点「修改这个批次」解锁'
          : (batch.gbDpbStatus >= 3 ? '该批次已收货，无法修改' : '供货商已提交，无法代录'),
        icon: 'none',
      });
      return;
    }
    var retName = this.data.disInfo ? this.data.disInfo.gbDistributerName : '';
    var disId = this.data.disInfo ? this.data.disInfo.gbDistributerId : '';
    var depId = this.data.depId || (this.data.mendianInfo ? this.data.mendianInfo.gbDepartmentId : '');
    var buyUserId = this.data.userInfo ? this.data.userInfo.gbDepartmentUserId : '';
    wx.setStorageSync('gbOrderBatchBuyerInput', 1);
    wx.navigateTo({
      url: '/subPackage-jrdh/pages/gbOrderBatch/gbOrderBatch?batchId=' + batch.gbDistributerPurchaseBatchId
        + '&retName=' + encodeURIComponent(retName)
        + '&disId=' + disId
        + '&depId=' + depId
        + '&buyUserId=' + buyUserId
        + '&fromBuyer=1'
        + '&buyerInput=1',
    });
  },

  /** 拍摄平台电子收据，OCR 匹配本批次订货并写入，再进入录入页 */
  onReceiptOcrTap: function (e) {
    var batch = e.currentTarget.dataset.batch;
    var bIndex = e.currentTarget.dataset.bindex;
    if (!batch) {
      return;
    }
    this.setData({
      currentBatch: batch,
      currentBIndex: bIndex,
    });
    console.log('[ReceiptOcr] tap batchId=', batch.gbDistributerPurchaseBatchId,
      'status=', batch.gbDpbStatus, 'goodsCount=', (batch.gbDPGEntities || []).length);
    if (!batchBuyerInput.canBuyerProxyEditBatch(batch)) {
      wx.showToast({
        title: batchBuyerInput.needsBuyerUnlockBatch(batch)
          ? '请先点「修改这个批次」解锁'
          : '当前批次不可识别',
        icon: 'none',
      });
      return;
    }
    var that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      success: function (res) {
        var file = res.tempFiles && res.tempFiles[0];
        if (!file || !file.tempFilePath) {
          console.warn('[ReceiptOcr] chooseMedia no file');
          return;
        }
        console.log('[ReceiptOcr] image selected path=', file.tempFilePath, 'size=', file.size,
          'wxSize=', file.width, 'x', file.height);
        var batchRef = batch;
        wx.getImageInfo({
          src: file.tempFilePath,
          success: function (imgInfo) {
            var imgW = imgInfo.width || file.width || 0;
            var imgH = imgInfo.height || file.height || 0;
            var photoOrientation = imgW >= imgH ? 'landscape' : 'portrait';
            console.log('[ReceiptOcr] imageInfo', imgW, 'x', imgH, 'photoOrientation=', photoOrientation);
            that._uploadReceiptOcrImage(batchRef, file.tempFilePath, {
              photoOrientation: photoOrientation,
              imageWidth: imgW,
              imageHeight: imgH,
            });
          },
          fail: function () {
            var imgW = file.width || 0;
            var imgH = file.height || 0;
            var photoOrientation = imgW >= imgH ? 'landscape' : 'portrait';
            console.warn('[ReceiptOcr] getImageInfo fail, fallback wxSize', imgW, 'x', imgH);
            that._uploadReceiptOcrImage(batchRef, file.tempFilePath, {
              photoOrientation: photoOrientation,
              imageWidth: imgW,
              imageHeight: imgH,
            });
          },
        });
      },
      fail: function (err) {
        console.warn('[ReceiptOcr] chooseMedia cancel/fail', err);
      },
    });
  },

  /** 读取图片并上传 OCR 识别 */
  _uploadReceiptOcrImage: function (batch, filePath, meta) {
    var that = this;
    var fs = wx.getFileSystemManager();
    var readStart = Date.now();
    fs.readFile({
      filePath: filePath,
      encoding: 'base64',
      success: function (readRes) {
        var base64Len = readRes.data ? readRes.data.length : 0;
        console.log('[ReceiptOcr] readFile ok base64Len=', base64Len, 'readMs=', Date.now() - readStart,
          'orientation=', meta.photoOrientation);
        var apiStart = Date.now();
        depOrderApi.matchPurchaseBatchReceipt({
          batchId: batch.gbDistributerPurchaseBatchId,
          imageBase64: readRes.data,
          photoOrientation: meta.photoOrientation,
          imageWidth: meta.imageWidth,
          imageHeight: meta.imageHeight,
        }).then(function (apiRes) {
          console.log('[ReceiptOcr] api response ms=', Date.now() - apiStart, 'result=', apiRes.result);
          if (apiRes.result.code == 0) {
            var data = apiRes.result.data || {};
            var matched = data.matchedCount != null ? data.matchedCount : 0;
            var skipped = data.skippedCount != null ? data.skippedCount : 0;
            console.log('[ReceiptOcr] success matched=', matched, 'skipped=', skipped,
              'matchSource=', data.matchSource);
            wx.showToast({
              title: '已匹配' + matched + '条，' + skipped + '条待录入',
              icon: 'none',
              duration: 2500,
            });
            that.toGbOrderInput();
          } else {
            console.warn('[ReceiptOcr] api error code=', apiRes.result.code, 'msg=', apiRes.result.msg);
            wx.showToast({
              title: apiRes.result.msg || '识别失败',
              icon: 'none',
            });
          }
        }).catch(function (err) {
          console.error('[ReceiptOcr] api fail ms=', Date.now() - apiStart, err);
          wx.showToast({ title: '识别失败，请重试', icon: 'none' });
        });
      },
      fail: function (err) {
        console.error('[ReceiptOcr] readFile fail', err);
        wx.showToast({ title: '读取图片失败', icon: 'none' });
      },
    });
  },


  // ============================================
  // 九、页面跳转
  // ============================================

  toFinishPurGoods: function (e) {
    var arr = this._getPurSelArr();
    console.log('[toFinishPurGoods] arr before storage:', JSON.stringify(arr));
    wx.setStorageSync('purArr', arr);

    wx.navigateTo({ url: '../../subPackage-mendian/pages/order/purGoods/purGoods' });
  },

  toOrderApp: function (e) {
    var arr = this._getPurSelArr();
    wx.setStorageSync('selArr', arr);
    wx.navigateTo({ url: '/subPackage-mendian/pages/supplier/supplierOrder/supplierOrder' });
  },

  toAiOrders: function () {
    wx.navigateTo({ url: '../../subPackage-mendian/pages/order/chefOrder/chefOrder' });
  },

  toEditHome: function () {
    wx.navigateTo({ url: '/subPackage-mendian/pages/management/homePage/homePage?disId=' + this.data.disId });
  },

  toWork(){
    wx.navigateTo({
      url: '/subPackage-charts/pages/workRecord/workRecord',
    })
  },

  toStoreAnnounce(){
    wx.navigateTo({
      url: '/subPackage-charts/pages/storeAnnouncement/storeAnnouncement?boardType=MANAGER_DAILY_BOARD',
    })
  },



  noopForSheet: function () {},



  toPay: function () {
    wx.navigateTo({ url: '/subPackage-group/pages/account/payPage/payPage?type=0' });
  },

 
  onNavTap: function () {
    wx.navigateTo({
      url: '/subPackage-charts/pages/aiChat/aiChat?advisorId=1',
    })
  },

  // ============================================
  // 十、UI 交互
  // ============================================

  swiperChange: function (event) {
    this.setData({
      tab1Index: event.detail.current,
      itemIndex: event.detail.current,
      selectedArr: [],
    });
    if (this.data.tab1Index == 0) {
      this._getInitData();
    }
    if (this.data.tab1Index == 1) {
      this._initBatchData();
    }
    this.calculateSlider(event.detail.current);
  },

  onTab1Click: function (event) {
    var index = event.currentTarget.dataset.index;
    this.setData({
      tab1Index: index,
      itemIndex: index,
    });
  },

  calculateSlider: function (index) {
    var query = wx.createSelectorQuery();
    query.select('#tab-' + index).boundingClientRect();
    var that = this;
    query.exec(function (res) {
      var tabRect = res[0];
      that.setData({
        sliderWidth: tabRect.width,
        sliderLeft: tabRect.left,
      });
    });
  },

  chooseSezi: function (e) {
    var that = this;
    var animation = wx.createAnimation({
      duration: 100,
      timingFunction: 'linear',
    });
    that.animation = animation;
    animation.translateY(200).step();
    that.setData({
      animationData: animation.export(),
      chooseSize: true,
    });
    setTimeout(function () {
      animation.translateY(0).step();
      that.setData({ animationData: animation.export() });
    }, 100);
  },

  hideModal: function (e) {
    var that = this;
    var animation = wx.createAnimation({
      duration: 2000,
      timingFunction: 'linear',
    });
    that.animation = animation;
    animation.translateY(200).step();
    that.setData({ animationData: animation.export() });
    setTimeout(function () {
      animation.translateY(0).step();
      that.setData({
        animationData: animation.export(),
        chooseSize: false,
      });
    }, 4000);
  },

  hideMask: function () {
    this.setData({ showOperation: false });
    this.hideModal();
  },

  hide: function () {
    this.setData({ showChoice: false });
  },

  showCar: function () {
    this.setData({ showGoods: true });
  },

  closeGoods: function () {
    this.setData({ showGoods: false });
  },

  // ============================================
  // 十一、门店部门设置
  // ============================================

  /** 准备弹窗初始数据 */
  _preparePopupData: function () {
    var disInfo = this.data.disInfo || wx.getStorageSync('disInfo') || {};
    var mendianInfo = this.data.mendianInfo || wx.getStorageSync('mendianInfo') || {};
    var hasSubs = mendianInfo.gbDepartmentSubAmount > 0 ? 2 : 1;
    var selNumber = mendianInfo.gbDepartmentSubAmount || 1;
    var gbDepartmentEntities = (mendianInfo.gbDepartmentEntityList && mendianInfo.gbDepartmentEntityList.length > 0)
      ? mendianInfo.gbDepartmentEntityList.map(function (item) { return { gbDepartmentName: item.gbDepartmentName || '' }; })
      : [{ gbDepartmentName: disInfo.gbDistributerName || '' }];

    this.setData({
      hasSubs: hasSubs,
      selNumber: selNumber,
      gbDepartmentEntities: gbDepartmentEntities,
      disInfo: disInfo,
    });
  },

  _checkIfShowPage() {
    // 只检查一次，避免每次数据加载重复判断
    if (this.data._checkedDepartment) return;
    this.data._checkedDepartment = true;

    if (this.data.disInfo.mendianDepartmentList[0].gbDepartmentEntityList.length == 0) {
      this.setData({
        showPage: true,
        mendianInfo:this.data.disInfo.mendianDepartmentList[0],
        gbDepartmentEntities: [{
          gbDepartmentName: this.data.disInfo.gbDistributerName
        }],
      })

      this.showPopup();

    }
  },

  showPopup() {
    var animation = wx.createAnimation({
      duration: 1300,
      timingFunction: 'ease-in-out',
    });
    animation.translateY(0).step();
    this.setData({
      popupAnimation: animation.export(),
    });
  },

  // 隐藏弹出层
  hidePopup() {
    this.setData({
      showPage: false
    });
  },

  // 绑定门店名称输入
  bindKeyInput(e) {
    this.setData({
      'mendianInfo.gbDepartmentName': e.detail.value,
    });
  },

  // 处理部门数量输入
  handleDepartmentNumber(e) {
    const num = parseInt(e.detail.value, 10);
    if (num > 0) {
      var departments = Array(num).fill('').map(function () {
        return { gbDepartmentName: '' };
      });
      this.setData({
        selNumber: num,
        gbDepartmentEntities: departments,
      });
    }
  },

  // 更新部门名称
  getDepartmentName(e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    const departments = this.data.gbDepartmentEntities;
    departments[index].gbDepartmentName = value;
    this.setData({
      gbDepartmentEntities: departments,
    });
  },


  // 保存设置
  toSave() {
    if (!this.data.disInfo.gbDistributerName) {
      wx.showToast({
        title: '请输入门店名称',
        icon: 'none'
      });
      return;
    }
    if (this.data.hasSubs === 2 && this.data.selNumber > 0) {
      const incomplete = this.data.gbDepartmentEntities.some(
        (item) => !item.gbDepartmentName
      );
      if (incomplete) {
        wx.showToast({
          title: '请填写所有部门名称',
          icon: 'none'
        });
        return;
      }
    }

    var mendian = this.data.mendianInfo;
    mendian.gbDepartmentEntityList = this.data.gbDepartmentEntities;
    console.log(mendian);
    depOrderApi.purUserSaveMendain(mendian).then(res => {
      if (res.result.code == 0) {
        this.setData({
          disInfo: res.result.data,
        })
        wx.setStorageSync('disInfo', res.result.data);
        wx.setStorageSync('mendianInfo', res.result.data.mendianDepartmentList[0]);
        this._getInitData();
        this.hidePopup();
      }
    })
  },


  

});
