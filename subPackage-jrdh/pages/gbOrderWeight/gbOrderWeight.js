var load = require('../../../lib/load.js');
const globalData = getApp().globalData;
import apiUrl from '../../../config/index.js'

import {
  gbOrderOutWeight,
  supplierGetUnWeightOutPurGoods,
} from '../../../services/depOrder'

const orderGoodsScale = require('../../utils/orderGoodsScale.js');

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
  },

  data: {
    bottomHeight: 240,
    formHeight: 480,
    lastInput: true,
    focusIndex: -1,
    orderIndex: -1,
    toPrice: false,
    retName: "",
    scaleInput: false,
    showConfirmModal: false,
    pasteContent: '',
    item: null,
    orders: null
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
      batchId: options.batchId,
      retName: options.retName || '',
    })
    this._getInitData();
  },

  _getInitData() {
    load.showLoading("获取订货商品")
    supplierGetUnWeightOutPurGoods(this.data.batchId)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          var arr = res.result.data || [];
          for (var k = 0; k < arr.length; k++) {
            orderGoodsScale.setupScalePackFields(arr[k], arr[k].gbDepartmentOrdersEntities || []);
            orderGoodsScale.clearStaleOrderWeights(arr[k]);
          }
          this.setData({
            purArr: arr,
          })
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
      })
  },

  onShareAppMessage(e) {
    var shareObj = {
      imageUrl: '',
    }
    shareObj.title = "请称重这些订单"
    shareObj.path = '/subPackage-jrdh/pages/gbOrderWeight/gbOrderWeight?batchId=' + this.data.batchId + '&retName=' + this.data.retName;
    return shareObj;
  },

  __checkNumber(e) {var patrn = /^(-)?\d+(\.\d+)?$/;
    if (patrn.exec(e.detail.value) == null) {
      return false
    } else {
      return true
    }
  },

  inputValue(e) {
    if (this.data.scaleInput) {
      this._multipleInput(e);
    } else {
      this._singleInput(e);
    }
  },

  _singleInput(e) {
    var value = e.currentTarget.dataset.value;
    var purItem = this.data.purArr[this.data.focusIndex];
    var orderItem = purItem.gbDepartmentOrdersEntities[this.data.orderIndex];
    var oldValue = this._readOrderWeightForInput(purItem, this.data.orderIndex);
    if (value <= 9 && value >= 0) {
      var newValue = 0;
      if (oldValue != null && oldValue !== '' && oldValue !== '0.0') {
        newValue = String(oldValue) + String(value);
      } else {
        newValue = value
      }
      this.setData({
        ["purArr[" + this.data.focusIndex + "].gbDepartmentOrdersEntities[" + this.data.orderIndex + "].gbDoWeight"]: newValue,
        ["item.gbDepartmentOrdersEntities[" + this.data.orderIndex + "].gbDoWeight"]: newValue,
        ["orders.gbDoWeight"]: newValue
      })
      this._getTotalQuantity();
    } else {
      if (value == ".") {
        oldValue = this._readOrderWeightForInput(purItem, this.data.orderIndex);
        var newValue = 0;
        if (oldValue != null && oldValue !== '' && String(oldValue).indexOf(".") != -1) {
          // 已有小数点，不处理
        } else {
          if (oldValue != null && oldValue !== '' && Number(oldValue) > 0) {
            newValue = String(oldValue) + ".";
            this._getTotalQuantity();
          } else {
            newValue = "0."
          }
          this.setData({
            ["purArr[" + this.data.focusIndex + "].gbDepartmentOrdersEntities[" + this.data.orderIndex + "].gbDoWeight"]: newValue,
            ["item.gbDepartmentOrdersEntities[" + this.data.orderIndex + "].gbDoWeight"]: newValue,
            ["orders.gbDoWeight"]: newValue
          })
          this._getTotalQuantity();
        }
      }
      if (value == "del") {
        oldValue = this._readOrderWeightForInput(purItem, this.data.orderIndex);
        var newValue = "";
        if (oldValue != null && oldValue !== '') {
          newValue = String(oldValue).substr(0, String(oldValue).length - 1);
        }
        this.setData({
          ["purArr[" + this.data.focusIndex + "].gbDepartmentOrdersEntities[" + this.data.orderIndex + "].gbDoWeight"]: newValue,
          ["item.gbDepartmentOrdersEntities[" + this.data.orderIndex + "].gbDoWeight"]: newValue,
          ["orders.gbDoWeight"]: newValue
        })
        this._getTotalQuantity();
      }
      if (value == "close") {
        this.setData({
          focusIndex: -1,
          lastInput: true
        })
      }
      if (value == "finish") {
        this.setData({
          focusIndex: -1,
          lastInput: true
        })
        this._savePurGoods();
      }
      if (value == "next") {
        var focusIndex = this.data.focusIndex;
        if (focusIndex !== this.data.purArr.length - 1) {
          this.setData({
            focusIndex: focusIndex + 1,
          })
        } else {
          this.setData({
            focusIndex: -1,
            lastInput: true
          })
        }
      }
    }
  },

  _getTotalQuantity() {var arr = this.data.purArr[this.data.focusIndex].gbDepartmentOrdersEntities;
    var temp = 0;
    for (var i = 0; i < arr.length; i++) {
      var weightValue = this.data.purArr[this.data.focusIndex].gbDepartmentOrdersEntities[i].gbDoWeight;if (weightValue != null && weightValue !== '' && !isNaN(Number(weightValue))) {
        temp = temp + Number(weightValue);
      }
    }
    temp = temp.toFixed(1);this.setData({
      ["purArr[" + this.data.focusIndex + "].gbDpgBuyQuantity"]: temp,
      ["item.gbDpgBuyQuantity"]: temp
    })

    var purItem = this.data.purArr[this.data.focusIndex];
    if (orderGoodsScale.isScalePurGoods(purItem)) {
      orderGoodsScale.syncPurGoodsScaleTotals(purItem);
      this.setData({
        ["purArr[" + this.data.focusIndex + "].gbDpgBuyScaleQuantity"]: purItem.gbDpgBuyScaleQuantity,
        ["item.gbDpgBuyScaleQuantity"]: purItem.gbDpgBuyScaleQuantity,
        ["purArr[" + this.data.focusIndex + "].gbDpgBuySubtotal"]: purItem.gbDpgBuySubtotal,
        ["item.gbDpgBuySubtotal"]: purItem.gbDpgBuySubtotal,
      });
    } else {
      var price = purItem.gbDpgBuyPrice;
      if (price != null && price > 0) {
        var subtotal = Number(price) * Number(temp);
        this.setData({
          ["purArr[" + this.data.focusIndex + "].gbDpgBuySubtotal"]: subtotal.toFixed(1),
          ["item.gbDpgBuySubtotal"]: subtotal.toFixed(1)
        });
      }
      var orderWeight = purItem.gbDepartmentOrdersEntities[this.data.orderIndex].gbDoWeight;
      var orderPrice = purItem.gbDepartmentOrdersEntities[this.data.orderIndex].gbDoPrice;
      if (orderPrice != null && orderWeight != null && !isNaN(Number(orderWeight)) && !isNaN(Number(orderPrice))) {
        var sub = Number(orderWeight) * Number(orderPrice);
        this.setData({
          ["purArr[" + this.data.focusIndex + "].gbDepartmentOrdersEntities[" + this.data.orderIndex + "].gbDoSubtotal"]: sub.toFixed(1),
          ["item.gbDepartmentOrdersEntities[" + this.data.orderIndex + "].gbDoSubtotal"]: sub.toFixed(1),
        });
      }
    }
    this._getOrderSubTotal();
  },

  _getOrderSubTotal() {
    var purItem = this.data.purArr[this.data.focusIndex];
    if (orderGoodsScale.isScalePurGoods(purItem)) {
      orderGoodsScale.syncPurGoodsScaleTotals(purItem);
      if (purItem.gbDpgBuySubtotal) {
        this.setData({
          ["purArr[" + this.data.focusIndex + "].gbDpgBuySubtotal"]: purItem.gbDpgBuySubtotal,
          ["purArr[" + this.data.focusIndex + "].gbDpgBuyScaleQuantity"]: purItem.gbDpgBuyScaleQuantity,
        });
      }
      return;
    }
    var priceValue = purItem.gbDpgBuyPrice;
    var weightValue = purItem.gbDpgBuyQuantity;
    if (priceValue != null && weightValue != null && !isNaN(Number(weightValue)) && !isNaN(Number(priceValue)) && priceValue > 0) {
      var subtotalValue = (Number(weightValue) * Number(priceValue)).toFixed(1);
      if (!isNaN(subtotalValue)) {
        this.setData({
          ["purArr[" + this.data.focusIndex + "].gbDpgBuySubtotal"]: subtotalValue,
        });
      }
    }
  },

  _multipleInput(e) {
    var value = e.currentTarget.dataset.value;
    var oldValue = this.data.purArr[this.data.focusIndex].gbDepartmentOrdersEntities[this.data.orderIndex].gbDoScaleWeight;
    if (value <= 9 && value >= 0) {
      oldValue = this.data.purArr[this.data.focusIndex].gbDepartmentOrdersEntities[this.data.orderIndex].gbDoScaleWeight;
      var newValue = 0;
      if (oldValue !== null && oldValue !== "0.0") {
        newValue = oldValue + value;
      } else {
        newValue = value
      }
      this.setData({
        ["purArr[" + this.data.focusIndex + "].gbDepartmentOrdersEntities[" + this.data.orderIndex + "].gbDoScaleWeight"]: newValue,
        ["item.gbDepartmentOrdersEntities[" + this.data.orderIndex + "].gbDoScaleWeight"]: newValue,
        ["orders.gbDoScaleWeight"]: newValue
      })
      this._getDoWeightScale();
    } else {
      if (value == ".") {
        oldValue = this.data.purArr[this.data.focusIndex].gbDepartmentOrdersEntities[this.data.orderIndex].gbDoScaleWeight;
        var newValue = 0;
        if (oldValue.indexOf(".") != -1) {} else {
          if (oldValue > 0) {
            newValue = oldValue + value;
            this._getDoWeightScale();
          } else {
            newValue = "0."
          }
          this.setData({
            ["purArr[" + this.data.focusIndex + "].gbDepartmentOrdersEntities[" + this.data.orderIndex + "].gbDoScaleWeight"]: newValue,
            ["item.gbDepartmentOrdersEntities[" + this.data.orderIndex + "].gbDoScaleWeight"]: newValue,
            ["orders.gbDoScaleWeight"]: newValue
          })
          this._getDoWeightScale();
        }
      }
      if (value == "del") {
        newValue = oldValue.substr(0, oldValue.length - 1);
        this.setData({
          ["purArr[" + this.data.focusIndex + "].gbDepartmentOrdersEntities[" + this.data.orderIndex + "].gbDoScaleWeight"]: newValue,
          ["item.gbDepartmentOrdersEntities[" + this.data.orderIndex + "].gbDoScaleWeight"]: newValue,
          ["orders.gbDoScaleWeight"]: newValue
        })
        this._getDoWeightScale();
      }

      if (value == "close") {
        this._getInitData()
        this.setData({
          ["item"]: "",
          ["orders"]: "",
          scaleInput: false,
        })
        this.setData({
          focusIndex: -1,
          lastInput: true
        })
      }
      if (value == "finish") {
        this.setData({
          focusIndex: -1,
          lastInput: true
        })
        this._savePurGoods();
      }
      if (value == "next") {
        var focusIndex = this.data.focusIndex;
        if (focusIndex !== this.data.purArr.length - 1) {
          this.setData({
            focusIndex: focusIndex + 1,
          })
        } else {
          this.setData({
            focusIndex: -1,
            lastInput: true
          })
        }
      }
    }
  },

  _getDoWeightScale() {
    var purItem = this.data.purArr[this.data.focusIndex];
    var order = purItem.gbDepartmentOrdersEntities[this.data.orderIndex];
    var scaleWeight = order.gbDoScaleWeight;
    var doWeight = orderGoodsScale.syncOrderWeightFromScale(order, scaleWeight, purItem);
    if (doWeight === null) {
      return;
    }
    this.setData({
      ["purArr[" + this.data.focusIndex + "].gbDepartmentOrdersEntities[" + this.data.orderIndex + "].gbDoWeight"]: doWeight,
      ["item.gbDepartmentOrdersEntities[" + this.data.orderIndex + "].gbDoWeight"]: doWeight,
      ["orders.gbDoWeight"]: doWeight
    })

    this._getSclaeOrderTotal();
    this._getTotalScale()
  },

  _getSclaeOrderTotal() {
    var arr = this.data.purArr[this.data.focusIndex].gbDepartmentOrdersEntities;
    var temp = "";
    for (var i = 0; i < arr.length; i++) {
      var weightValue = this.data.purArr[this.data.focusIndex].gbDepartmentOrdersEntities[i].gbDoWeight;

      if (weightValue) {
        temp = Number(temp) + Number(weightValue);
      }
    }
    temp = Number(temp).toFixed(1);
    this.setData({
      ["purArr[" + this.data.focusIndex + "].gbDpgBuyQuantity"]: temp,
      ["item.gbDpgBuyQuantity"]: temp
    })

    var scalePrice = this.data.purArr[this.data.focusIndex].gbDpgBuyScalePrice;if (scalePrice) {
      var orderWeight = this.data.purArr[this.data.focusIndex].gbDepartmentOrdersEntities[this.data.orderIndex].gbDoScaleWeight;
      var orderSubtotal = (Number(scalePrice) * Number(orderWeight)).toFixed(1);this.setData({
        ["purArr[" + this.data.focusIndex + "].gbDepartmentOrdersEntities[" + this.data.orderIndex + "].gbDoSubtotal"]: orderSubtotal,
        ["item.gbDepartmentOrdersEntities[" + this.data.orderIndex + "].gbDoSubtotal"]: orderSubtotal,
        ["orders.gbDoSubtotal"]: orderSubtotal
      })
    }
  },

  _getTotalScale() {
    var arr = this.data.purArr[this.data.focusIndex].gbDepartmentOrdersEntities;
    var temp = "";
    for (var i = 0; i < arr.length; i++) {
      var weightValue = this.data.purArr[this.data.focusIndex].gbDepartmentOrdersEntities[i].gbDoScaleWeight;
      if (weightValue) {
        temp = Number(temp) + Number(weightValue);
      }
    }
    this.setData({
      ["purArr[" + this.data.focusIndex + "].gbDpgBuyScaleQuantity"]: temp,
      ["item.gbDpgBuyScaleQuantity"]: temp
    })

    var price = this.data.purArr[this.data.focusIndex].gbDpgBuyScalePrice;
    if (price) {
      var weight = this.data.purArr[this.data.focusIndex].gbDpgBuyScaleQuantity;
      var subtotal = Number(price) * Number(weight);
      this.setData({
        ["purArr[" + this.data.focusIndex + "].gbDpgBuySubtotal"]: subtotal.toFixed(1),
        ["item.gbDpgBuySubtotal"]: subtotal.toFixed(1)
      })
    }
  },

  _logWeightInput(tag, orders, item, extra) {
    var g = item && item.gbDistributerGoodsEntity ? item.gbDistributerGoodsEntity : {};
    var pageOrders = this.data.orders || {};
    console.log('[gbOrderWeight 称重]', tag, {
      goodsName: g.gbDgGoodsName,
      gbDoStandard: orders ? orders.gbDoStandard : '',
      gbDoQuantity: orders ? orders.gbDoQuantity : '',
      purArrGbDoWeight: orders ? orders.gbDoWeight : '',
      purArrGbDoScaleWeight: orders ? orders.gbDoScaleWeight : '',
      pageDataOrdersWeight: pageOrders.gbDoWeight,
      pageDataOrdersScaleWeight: pageOrders.gbDoScaleWeight,
      gbDoDsStandardScale: orders ? orders.gbDoDsStandardScale : '',
      gbDgGoodsStandardname: g.gbDgGoodsStandardname,
      gbDgCartonUnit: g.gbDgCartonUnit,
      gbDpgBuyScale: item ? item.gbDpgBuyScale : '',
      gbDpgStandard: item ? item.gbDpgStandard : '',
      resolveCartonUnit: item ? orderGoodsScale.resolveCartonUnit(item) : '',
      canDefaultOutWeight: orders && item ? orderGoodsScale.canDefaultOutWeightFromOrder(orders, item) : false,
      isStaleQtyAsWeight: orders && item ? orderGoodsScale.isStaleOrderQtyAsWeight(orders, item) : false,
      extra: extra || '',
    });
  },

  _readOrderWeightForInput(purItem, orderIndex) {
    if (!purItem || orderIndex < 0) {
      return '';
    }
    var orders = purItem.gbDepartmentOrdersEntities[orderIndex];
    if (!orders) {
      return '';
    }
    if (orderGoodsScale.isStaleOrderQtyAsWeight(orders, purItem)) {
      return '';
    }
    var w = orders.gbDoWeight;
    if (w == null || w === '' || w === '0.0' || w === '0') {
      return '';
    }
    return String(w);
  },

  inputGoods(e) {
    var focusIndex = Number(e.currentTarget.dataset.index);
    var orderIndex = Number(e.currentTarget.dataset.orderindex);
    var purArr = this.data.purArr;
    if (!purArr || !purArr[focusIndex]) {
      return;
    }
    var item = purArr[focusIndex];
    var orders = item.gbDepartmentOrdersEntities[orderIndex];
    this._logWeightInput('点击-原始', orders, item, {
      focusIndex: focusIndex,
      orderIndex: orderIndex,
    });
    var orderPath = 'purArr[' + focusIndex + '].gbDepartmentOrdersEntities[' + orderIndex + ']';
    var canDefault = orderGoodsScale.canDefaultOutWeightFromOrder(orders, item);
    var hadStaleWeight = orderGoodsScale.isStaleOrderQtyAsWeight(orders, item);
    if (hadStaleWeight) {
      orders.gbDoWeight = '';
      orders.gbDoScaleWeight = '';
    }
    var inputMode = this._resolveWeightInputMode(orders, item);
    var scaleInput = inputMode === 'carton';
    var defaultWeight = this._buildDefaultOutWeight(orders, item, inputMode);
    var displayWeight = '';
    var displayScaleWeight = '';
    if (defaultWeight) {
      if (defaultWeight.gbDoScaleWeight != null) {
        orders.gbDoScaleWeight = defaultWeight.gbDoScaleWeight;
        displayScaleWeight = defaultWeight.gbDoScaleWeight;
      }
      if (defaultWeight.gbDoWeight != null) {
        orders.gbDoWeight = defaultWeight.gbDoWeight;
        displayWeight = defaultWeight.gbDoWeight;
      }
    } else if (orderGoodsScale.isPositive(orders.gbDoWeight) && !hadStaleWeight) {
      displayWeight = String(orders.gbDoWeight);
      if (orderGoodsScale.isPositive(orders.gbDoScaleWeight)) {
        displayScaleWeight = String(orders.gbDoScaleWeight);
      }
    }

    var ordersForPage = Object.assign({}, orders, {
      gbDoWeight: scaleInput ? (displayWeight || '') : (displayWeight || ''),
      gbDoScaleWeight: displayScaleWeight || '',
    });

    var updates = {
      item: item,
      orders: ordersForPage,
      focusIndex: focusIndex,
      orderIndex: orderIndex,
      lastInput: false,
      scaleInput: scaleInput,
      [orderPath + '.gbDoWeight']: orders.gbDoWeight || '',
      [orderPath + '.gbDoScaleWeight']: orders.gbDoScaleWeight || '',
      'orders.gbDoWeight': scaleInput ? '' : (displayWeight || ''),
      'orders.gbDoScaleWeight': scaleInput ? (displayScaleWeight || '') : '',
    };

    this._logWeightInput('点击-处理', orders, item, {
      canDefault: canDefault,
      hadStaleWeight: hadStaleWeight,
      inputMode: inputMode,
      scaleInput: scaleInput,
      defaultWeight: defaultWeight,
      displayWeight: displayWeight,
      displayScaleWeight: displayScaleWeight,
    });

    var that = this;
    this.setData(updates, function () {
      if (!defaultWeight) {
        return;
      }
      if (scaleInput) {
        that._getDoWeightScale();
      } else {
        that._getTotalQuantity();
      }
    });
  },

  /** 按订货单位判断：小包装 base / 大包装 carton / 其它 null（规格不一致不可默认带出） */
  _resolveWeightInputMode(orders, item) {
    if (!orders || !item || !orderGoodsScale.canDefaultOutWeightFromOrder(orders, item)) {
      return null;
    }
    var goods = item.gbDistributerGoodsEntity;
    if (!goods || orders.gbDoStandard == null) {
      return null;
    }
    var orderStd = String(orders.gbDoStandard).trim();
    var baseUnit = goods.gbDgGoodsStandardname;
    if (baseUnit && orderStd === String(baseUnit).trim()) {
      return 'base';
    }
    var cartonUnit = orderGoodsScale.resolveCartonUnit(item);
    if (cartonUnit && orderStd === String(cartonUnit).trim()) {
      return 'carton';
    }
    return null;
  },

  _isEmptyOutWeight(value) {
    if (value == null || value === '' || value === '0.0' || value === '0') {
      return true;
    }
    return !orderGoodsScale.isPositive(value);
  },

  /** 订货规格与商品小包装/大包装一致时，默认带出订货数量 */
  _buildDefaultOutWeight(orders, item, inputMode) {
    if (!orders || !item || !inputMode) {
      return null;
    }
    var qty = orders.gbDoQuantity;
    if (!orderGoodsScale.isPositive(qty)) {
      return null;
    }

    if (inputMode === 'carton') {
      if (!this._isEmptyOutWeight(orders.gbDoScaleWeight)) {
        return null;
      }
      var scaleWeightStr = String(qty);
      var doWeight = orderGoodsScale.syncOrderWeightFromScale(orders, scaleWeightStr, item);
      var scaleResult = { gbDoScaleWeight: scaleWeightStr };
      if (doWeight) {
        scaleResult.gbDoWeight = doWeight;
      }
      return scaleResult;
    }

    if (inputMode === 'base') {
      if (!this._isEmptyOutWeight(orders.gbDoWeight)) {
        return null;
      }
      return { gbDoWeight: String(qty) };
    }
    return null;
  },

  showPrice() {
    this.setData({
      toPrice: true
    })
    wx.navigateTo({
      url: '../gbOrderInput/gbOrderInput?batchId=' + this.data.batchId + '&retName=' + this.data.retName,
    })
  },

  _savePurGoods() {
    load.showLoading("保存数据中");
    var currentOrder = this.data.orders;
    var purItem = this.data.purArr[this.data.focusIndex];
    var payload = {
      orderId: currentOrder.gbDepartmentOrdersId,
    };
    // 小包装录入只传 weight，由后端换算 gbDoScaleWeight；传 scaleWeight 会被后端优先采用并反算 gbDoWeight
    if (this.data.scaleInput) {
      if ((!currentOrder.gbDoScaleWeight || currentOrder.gbDoScaleWeight === '0.0')
          && currentOrder.gbDoWeight) {
        var factor = orderGoodsScale.resolveScaleFactor(purItem, currentOrder);
        if (factor > 0) {
          currentOrder.gbDoScaleWeight = (Number(currentOrder.gbDoWeight) / factor).toFixed(1);
          this.setData({ orders: currentOrder });
        }
      }
      payload.scaleWeight = currentOrder.gbDoScaleWeight;
      if (currentOrder.gbDoWeight) {
        payload.weight = currentOrder.gbDoWeight;
      }
    } else {
      payload.weight = currentOrder.gbDoWeight;
    }
    gbOrderOutWeight(payload, { useUrlParams: true })
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          this.setData({
            focusIndex: -1,
            lastInput: true,
            ["item"]: "",
            ["orders"]: "",
            scaleInput: false,
          })
          this._getInitData();
        }
      })
  },

  toBack() {
    wx.navigateBack({ delta: 1 })
  },

  pasteOrder() {
    const orderText = this._formatOrderContent();
    wx.setClipboardData({
      data: orderText,
      success: () => {
        this.setData({
          pasteContent: orderText,
          showConfirmModal: true
        });
      },
      fail: (err) => {
        wx.showToast({
          title: '复制失败',
          icon: 'none'
        });
      }
    });
  },

  _formatOrderContent() {
    const purArr = this.data.purArr;
    if (!purArr || purArr.length === 0) {
      return '';
    }

    let orderLines = [];
    let globalIndex = 1;

    purArr.forEach((item, index) => {
      const goodsName = item.gbDistributerGoodsEntity?.gbDgGoodsName || '';
      const goodsDetail = item.gbDistributerGoodsEntity?.gbDgGoodsDetail || '';
      const remark = (goodsDetail && goodsDetail !== 'null' && goodsDetail.length > 0) ? goodsDetail : '';
      const standardName = item.gbDistributerGoodsEntity?.gbDgGoodsStandardname || '';

      if (item.gbDepartmentOrdersEntities &&
        item.gbDepartmentOrdersEntities.length > 0) {

        item.gbDepartmentOrdersEntities.forEach((order) => {
          const quantity = order.gbDoQuantity || '';
          const standard = order.gbDoStandard || '';
          const quantityText = quantity + standard;

          let orderStandard = '';
          let hasBrackets = false;

          if (order.gbDoDsStandardScale &&
            order.gbDoDsStandardScale !== null &&
            order.gbDoDsStandardScale > 0 &&
            order.gbDoDsStandardScale !== '-1') {
            orderStandard = `${order.gbDoDsStandardScale}${standardName}/${standard}`;
            hasBrackets = true;
          } else {
            orderStandard = standardName || standard;
            hasBrackets = false;
          }

          let line = `${globalIndex}. ${goodsName}`;
          if (orderStandard) {
            if (hasBrackets) {
              line += `(${orderStandard})`;
            } else {
              line += `(${orderStandard})`;
            }
          }
          line += ` ${quantityText}`;
          if (remark) {
            line += ` ${remark}`;
          }

          orderLines.push(line);
          globalIndex++;
        });
      }
    });

    return orderLines.join('\n');
  },

  closeConfirmModal() {
    this.setData({
      showConfirmModal: false
    });
  },

  stopPropagation() {
    // 阻止事件冒泡
  },

  confirmUpdatePasteContent() {
    this.closeConfirmModal();
  },
})