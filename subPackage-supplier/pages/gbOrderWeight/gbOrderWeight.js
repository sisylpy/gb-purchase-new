var load = require('../../../lib/load.js');
const globalData = getApp().globalData;
import apiUrl from '../../../config/index.js'

import {
  gbOrderOutWeight,
  supplierGetUnWeightOutPurGoods,
} from '../../../services/depOrder'


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
          this.setData({
            purArr: res.result.data,
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
    shareObj.path = '/subPackage-supplier/pages/gbOrderWeight/gbOrderWeight?batchId=' + this.data.batchId + '&retName=' + this.data.retName;
    return shareObj;
  },

  __checkNumber(e) {
    console.log("checkckckkckck")
    var patrn = /^(-)?\d+(\.\d+)?$/;
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
    console.log("=== _singleInput === value:", value);
    
    var purItem = this.data.purArr[this.data.focusIndex];
    var orderItem = purItem.gbDepartmentOrdersEntities[this.data.orderIndex];
    
    var oldValue = orderItem.gbDoWeight;
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
        oldValue = this.data.purArr[this.data.focusIndex].gbDepartmentOrdersEntities[this.data.orderIndex].gbDoWeight;
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
        oldValue = this.data.purArr[this.data.focusIndex].gbDepartmentOrdersEntities[this.data.orderIndex].gbDoWeight;
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

  _getTotalQuantity() {
    console.log("=== _getTotalQuantity ===");
    var arr = this.data.purArr[this.data.focusIndex].gbDepartmentOrdersEntities;
    var temp = 0;
    for (var i = 0; i < arr.length; i++) {
      var weightValue = this.data.purArr[this.data.focusIndex].gbDepartmentOrdersEntities[i].gbDoWeight;
      console.log("第" + i + "个订单 weightValue:", weightValue, "类型:", typeof weightValue);
      if (weightValue != null && weightValue !== '' && !isNaN(Number(weightValue))) {
        temp = temp + Number(weightValue);
      }
    }
    temp = temp.toFixed(1);
    console.log("teimpp" + temp)
    this.setData({
      ["purArr[" + this.data.focusIndex + "].gbDpgBuyQuantity"]: temp,
      ["item.gbDpgBuyQuantity"]: temp
    })

    var price = this.data.purArr[this.data.focusIndex].gbDpgBuyPrice;
    console.log("gbDpgBuyPrice:", price);
    if (price != null && price > 0) {
      console.log("subttototopricepriceprice" + price)
      var weight = this.data.purArr[this.data.focusIndex].gbDpgBuyQuantity;
      var subtotal = Number(price) * Number(weight);
      console.log("subttototo" + subtotal)

      this.setData({
        ["purArr[" + this.data.focusIndex + "].gbDpgBuySubtotal"]: subtotal.toFixed(1),
        ["item.gbDpgBuySubtotal"]: subtotal.toFixed(1)
      })
      var orderWeight = this.data.purArr[this.data.focusIndex].gbDepartmentOrdersEntities[this.data.orderIndex].gbDoWeight;
      var orderPrice = this.data.purArr[this.data.focusIndex].gbDepartmentOrdersEntities[this.data.orderIndex].gbDoPrice;
      console.log("orderWeight:", orderWeight, "orderPrice:", orderPrice);
      if (orderPrice != null && orderWeight != null && !isNaN(Number(orderWeight)) && !isNaN(Number(orderPrice))) {
        var sub = Number(orderWeight) * Number(orderPrice)
        this.setData({
          ["purArr[" + this.data.focusIndex + "].gbDepartmentOrdersEntities[" + this.data.orderIndex + "].gbDoSubtotal"]: sub.toFixed(1),
          ["item.gbDepartmentOrdersEntities[" + this.data.orderIndex + "].gbDoSubtotal"]: sub.toFixed(1),
        })
      }
    }
    this._getOrderSubTotal();
  },

  _getOrderSubTotal() {
    var priceValue = this.data.purArr[this.data.focusIndex].gbDpgBuyPrice;
    var weightValue = this.data.purArr[this.data.focusIndex].gbDpgBuyQuantity;
    console.log("_getOrderSubTotal priceValue:", priceValue, "weightValue:", weightValue);
    if (priceValue != null && weightValue != null && !isNaN(Number(weightValue)) && !isNaN(Number(priceValue)) && priceValue > 0) {
      var subtotalValue = (Number(weightValue) * Number(priceValue)).toFixed(1);
      if (!isNaN(subtotalValue)) {
        this.setData({
          ["purArr[" + this.data.focusIndex + "].gbDpgBuySubtotal"]: subtotalValue,
        })
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
    var scaleWeight = this.data.purArr[this.data.focusIndex].gbDepartmentOrdersEntities[this.data.orderIndex].gbDoScaleWeight;
    var scale = this.data.purArr[this.data.focusIndex].gbDepartmentOrdersEntities[this.data.orderIndex].gbDoDsStandardScale;
    console.log(scaleWeight);
    var doWeight = (Number(scaleWeight) * Number(scale)).toFixed(1);
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

    var scalePrice = this.data.purArr[this.data.focusIndex].gbDpgBuyScalePrice;
    console.log("scalrpririir000000000" + scalePrice)
    if (scalePrice) {
      var orderWeight = this.data.purArr[this.data.focusIndex].gbDepartmentOrdersEntities[this.data.orderIndex].gbDoScaleWeight;
      var orderSubtotal = (Number(scalePrice) * Number(orderWeight)).toFixed(1);
      console.log("orderSubtotal" + orderSubtotal)
      this.setData({
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

  inputGoods(e) {
    var orders = e.currentTarget.dataset.orders;
    if (orders.gbDoDsStandardScale !== null && orders.gbDoDsStandardScale > 0 && orders.gbDoDsStandardScale !== '-1') {
      this.setData({
        scaleInput: true,
      })
    }
    this.setData({
      item: e.currentTarget.dataset.item,
      orders: e.currentTarget.dataset.orders,
      focusIndex: e.currentTarget.dataset.index,
      orderIndex: e.currentTarget.dataset.orderindex,
      lastInput: false,
    })
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
    gbOrderOutWeight({
      orderId: currentOrder.gbDepartmentOrdersId,
      weight: currentOrder.gbDoWeight
    }, { useUrlParams: true })
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