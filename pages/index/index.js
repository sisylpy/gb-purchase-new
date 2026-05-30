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
    /** 集团用户已进入所选门店采购（用于展示「返回经营看板」） */
    isGroupPurchaseMode: false,
    /** 底部弹层：切换门店 */
    showGroupStoreSheet: false,
    groupStoreList: [],
    groupStoreListLoading: false,
    /** 当前门店部门实体（模板用 mendianInfo.name 与单店/子部门展示） */
    mendianInfo: null,
  },

  // ============================================
  // 三、生命周期
  // ============================================

  onLoad: function (options) {
    var week = dateUtils.getWhatDay(0);
    var date = dateUtils.getOnlyHao(0);

    this.setData({
      week: week,
      date: date,
      url: requestUtil.getServerUrl(),
    });


    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      var depInfo = wx.getStorageSync('mendianInfo');
      this.setData({
        depId: depInfo.gbDepartmentId,
        mendianInfo: depInfo,
      });
      if (userInfo.gbDuAdmin == 1) {
        wx.redirectTo({
          url: '../../subPackage-ai/pages/ai/chefOrderDep/chefOrderDep',
        });
      } 
      if ( userInfo.gbDuAdmin == 0) {
        wx.reLaunch({
          url: '/subPackage-group/pages/homePage/homePage',
        });
      
        return;
      }
    } else {
      this._userLogin();
    }

    this.calculateSlider(0);
  },

  onShow: function () {
    var windowInfo = wx.getWindowInfo();
    var globalData = app.globalData;
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
    });

    wx.removeStorageSync('selArr');

    if (this.data.depId && this.data.mendianInfo) {
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
         
         
        } else {
          load.hideLoading()
          this.setData({ purArr: [] });
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
                if ( admin == 0) {
                  wx.reLaunch({
                    url: '/subPackage-group/pages/homePage/homePage',
                  });
                
                  return;
                }
                if (admin == 1  || admin == 11 ) {
                  this.setData({
                    disInfo: res.result.data.disInfro,
                    userInfo: res.result.data.depUserInfo,
                    depId: res.result.data.depInfo.gbDepartmentId,
                    mendianInfo: res.result.data.depInfo,
                  });

                  this._getInitData();
                } else {
                  wx.setStorageSync('orderDepInfo', res.result.data.depInfo);
                  wx.redirectTo({
                    url: '/subPackage-mendian/pages/order/chefOrderDep/chefOrderDep',
                  });
                }
              } else {
                wx.redirectTo({
                  url: '/subPackage-supplier/pages/jinriListWithLogin/jinriListWithLogin',
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
      returnOrders: e.currentTarget.dataset.item.gbDistributerGoodsEntity.gbDepartmentOrdersEntities[0],
    });
  },

  /** 确认退货 */
  confirmReturn: function () {
    var item = this.data.returnItem;
    item.gbDpgPurUserId = this.data.userInfo.gbDepartmentUserId;
    var that = this;
    depOrderApi.puraserReturnPurGoods(item).then(function (res) {
      if (res.result.code == 0) {
        that._getInitData();
      }
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
            path: 'subPackage-supplier/pages/gbOrderBatch/gbOrderBatch?batchId=' + batchId + '&retName=' + retName + '&disId=' + that.data.disInfo.gbDistributerId + '&fromBuyer=1&depId=' + depId + '&buyUserId=' + userId,
            imageUrl: that.data.url + '/userImage/say.png',
          });
        } else {
          wx.showToast({ title: res.result.msg, icon: 'none' });
        }
      });
    });
  },

  // ============================================
  // 八、门店设置
  // ============================================

  showPopup: function () {
    var animation = wx.createAnimation({
      duration: 1300,
      timingFunction: 'ease-in-out',
    });
    animation.translateY(0).step();
    this.setData({ popupAnimation: animation.export() });
  },



  bindKeyInput: function (e) {
    this.setData({ 'disInfo.gbDistributerName': e.detail.value });
  },

  radioChange: function (e) {
    var value = parseInt(e.detail.value, 10);
    this.setData({
      hasSubs: value,
      selNumber: value === 2 ? 1 : 0,
      gbDepartmentEntities: value === 2 ? [{ gbDepartmentName: '' }] : [],
    });
  },

  handleDepartmentNumber: function (e) {
    var num = parseInt(e.detail.value, 10);
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

  getDepartmentName: function (e) {
    var index = e.currentTarget.dataset.index;
    var value = e.detail.value;
    var departments = this.data.gbDepartmentEntities;
    departments[index].gbDepartmentName = value;
    this.setData({ gbDepartmentEntities: departments });
  },

  toSave: function () {
    if (!this.data.disInfo.gbDistributerName) {
      wx.showToast({ title: '请输入门店名称', icon: 'none' });
      return;
    }
    if (this.data.hasSubs === 2 && this.data.selNumber > 0) {
      var incomplete = this.data.gbDepartmentEntities.some(function (item) {
        return !item.gbDepartmentName;
      });
      if (incomplete) {
        wx.showToast({ title: '请填写所有部门名称', icon: 'none' });
        return;
      }
    }

    var mendian = this.data.mendianInfo;
    mendian.gbDepartmentEntityList = this.data.gbDepartmentEntities;
    var that = this;
    depOrderApi.purUserSaveMendain(mendian).then(function (res) {
      if (res.result.code == 0) {
        var firstMendian = mendianRowWithDisplayName(
          res.result.data.mendianDepartmentList[0] || null
        );
        that.setData({
          disInfo: res.result.data,
          mendianInfo: firstMendian,
        });
        wx.setStorageSync('disInfo', res.result.data);
        // wx.setStorageSync('mendianInfo', firstMendian);
        that._getInitData();
        that.hidePopup();
      }
    });
  },

  // ============================================
  // 九、页面跳转
  // ============================================

  toStock: function () {
    wx.navigateTo({ url: '../../subPackage-charts/pages/stock/index/index' });
  },

  toFinishPurGoods: function (e) {
    var arr = this._getPurSelArr();
    console.log('[toFinishPurGoods] arr before storage:', JSON.stringify(arr));
    wx.setStorageSync('purArr', arr);

    wx.navigateTo({ url: '../../subPackage-mendian/pages/order/purGoods/purGoods' });
  },

  toOrderApp: function (e) {
    var arr = this._getPurSelArr();
    wx.setStorageSync('selArr', arr);
    wx.navigateTo({ url: '/subPackage-supplier/pages/supplier/supplierOrder/supplierOrder' });
  },

  toAiOrders: function () {
    wx.navigateTo({ url: '../../subPackage-mendian/pages/order/chefOrder/chefOrder' });
  },

  toEditHome: function () {
    wx.navigateTo({ url: '/subPackage-mendian/pages/management/homePage/homePage?disId=' + this.data.disId });
  },

  /** 集团用户：打开门店列表弹层 */
  onOpenGroupStoreSheet: function () {
    console.log('[index.groupStore] onOpenGroupStoreSheet 进入', {
      disId: this.data.disId,
      depId: this.data.depId,
      isGroupPurchaseMode: this.data.isGroupPurchaseMode,
    });
    if (!this.data.disId) {
      wx.showToast({ title: '缺少分销商信息', icon: 'none' });
      return;
    }
    var that = this;
    this.setData({
      showGroupStoreSheet: true,
      groupStoreListLoading: true,
      groupStoreList: [],
    });
    console.log('[index.groupStore] 请求 getDisDepartmentGbMendianJing disId=', this.data.disId);
    depOrderApi
      .getDisDepartmentGbMendianJing(this.data.disId)
      .then(function (res) {
        var list = [];
        if (res.result && res.result.code == 0) {
          list = res.result.data || [];
        } else if (res.result && res.result.msg) {
          wx.showToast({ title: res.result.msg, icon: 'none' });
        }
        console.log('[index.groupStore] 门店列表返回', {
          code: res.result && res.result.code,
          msg: res.result && res.result.msg,
          count: Array.isArray(list) ? list.length : 0,
        });
        that.setData({
          groupStoreList: list,
          groupStoreListLoading: false,
        });
      })
      .catch(function (err) {
        console.warn('[index.groupStore] getDisDepartmentGbMendianJing 失败', err);
        that.setData({ groupStoreList: [], groupStoreListLoading: false });
        wx.showToast({ title: '门店列表加载失败', icon: 'none' });
      });
  },

  onCloseGroupStoreSheet: function () {
    this.setData({ showGroupStoreSheet: false });
  },

  noopForSheet: function () {},

  /** 在弹层中选择门店并刷新当前 Tab 数据 */
  onSelectGroupStoreItem: function (e) {
    var deptId = e.currentTarget.dataset.deptid;
    var list = this.data.groupStoreList || [];
    var item = null;
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].gbDepartmentId) === String(deptId)) {
        item = list[i];
        break;
      }
    }
    if (!item) {
      console.warn('[index.groupStore] onSelectGroupStoreItem 未匹配行 deptId=', deptId);
      return;
    }
    console.log('[index.groupStore] 选中门店', {
      gbDepartmentId: item.gbDepartmentId,
      gbDepartmentName: item.gbDepartmentName || item.gbDepartmentPrintName,
    });
    purchaseContext.setGroupSelectedStoreDepartment(item);
    var itemNorm = mendianRowWithDisplayName(item);
    var that = this;
    this.setData(
      {
        depId: item.gbDepartmentId,
        mendianInfo: itemNorm,
        showGroupStoreSheet: false,
        isGroupPurchaseMode: true,
      },
      function () {
        console.log('[index.groupStore] setData 完成，刷新数据 tab1Index=', that.data.tab1Index);
        if (that.data.tab1Index == 0) {
          that._getInitData();
        } else {
          that._initBatchData();
        }
      }
    );
  },

  /** 集团代门店采购时返回经营看板，并清除所选门店缓存 */
  toGroupAiChatBoard: function () {
    this.setData({ showGroupStoreSheet: false });
    purchaseContext.clearGroupStorePurchaseContext();
    wx.reLaunch({
      url: '/subPackage-ai/pages/chat/groupAiChat/groupAiChat',
    });
  },

  toPay: function () {
    wx.navigateTo({ url: '../../subPackage/pages/account/payPage/payPage?type=0' });
  },

 
  toEditUser: function () {
    wx.navigateTo({ url: '../myDashboard/myDashboard' });
  },

  toResGoods: function () {
    console.log(("ddhdhhhdhe"))
    wx.navigateTo({ url: '../../subPackage-goods/pages/depGoodsIndex/depGoodsIndex' });
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


  

});
