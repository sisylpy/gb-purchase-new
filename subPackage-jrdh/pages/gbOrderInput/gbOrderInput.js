var load = require('../../../lib/load.js');
var dateUtil = require('../../../lib/dateUtil.js');
var {
  getDisPurchaseGoodsBatchGb,
  sellerUpdatePurGoods,
} = require('../../../services/depOrder.js');
const orderGoodsScale = require('../../utils/orderGoodsScale.js');

Page({

  onShow: function () {
    var windowInfo = wx.getWindowInfo();
    var globalData = getApp().globalData;
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      numWidth: (windowInfo.windowWidth / 4) * globalData.rpxR - 40,
      numContainerWidth: (windowInfo.windowWidth / 4) * globalData.rpxR - 20,
      btnWidth: (windowInfo.windowWidth / 8) * globalData.rpxR - 20,
      btnWidthContainer: (windowInfo.windowWidth / 8) * globalData.rpxR,
      bigBtnWidth: (windowInfo.windowWidth / 6) * globalData.rpxR - 20,
      bigBtnWidthContainer: (windowInfo.windowWidth / 6) * globalData.rpxR,
    });
  },

  data: {
    isTishi: false,
    lastInput: true,
    focusGoodsIndex: -1,
  },

  onLoad: function (options) {
    var globalData = getApp().globalData;
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      batchId: options.batchId,
      retName: options.retName,
      numWidth: (globalData.windowWidth / 4) * globalData.rpxR - 40,
      numContainerWidth: (globalData.windowWidth / 4) * globalData.rpxR - 20,
      btnWidth: (globalData.windowWidth / 8) * globalData.rpxR - 20,
      btnWidthContainer: (globalData.windowWidth / 8) * globalData.rpxR,
      bigBtnWidth: (globalData.windowWidth / 6) * globalData.rpxR - 20,
      bigBtnWidthContainer: (globalData.windowWidth / 6) * globalData.rpxR,
      todayDate: dateUtil.getWhichOnlyDate(0),
    })
    this._getInitData();
  },

  _getInitData() {
    var that = this;
    load.showLoading("获取订货商品")
    getDisPurchaseGoodsBatchGb(this.data.batchId)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {this.setData({
            batchStatus: res.result.data.gbDpbStatus,
          })
          var arr = res.result.data.gbDPGEntities;
          for (var k = 0; k < arr.length; k++) {
            var orders = arr[k].gbDepartmentOrdersEntities || [];
            orderGoodsScale.setupScalePackFields(arr[k], orders);
            orderGoodsScale.syncPurGoodsQtyFromOrders(arr[k]);
            if (orderGoodsScale.isScalePurGoods(arr[k])) {
              orderGoodsScale.syncPurGoodsScaleTotals(arr[k]);
            }
            that._logCartonDebug(arr[k], orders, k);
          }
          var total = 0;
          for (var i = 0; i < arr.length; i++) {
            for (var j = 0; j < arr[i].gbDepartmentOrdersEntities.length; j++) {
              var sub = arr[i].gbDepartmentOrdersEntities[j].gbDoSubtotal;
              if (sub != null && !isNaN(Number(sub))) {
                total = (Number(sub) + Number(total)).toFixed(1);
              }
            }
          }
          var newBatch = res.result.data;
          newBatch.gbDpbSubtotal = total;
          that.setData({
            payTotal: total,
            batch: newBatch,
            goodsCount: res.result.data.gbDPGEntities.length
          })
        } else {
          wx.showToast({
            title: '没有订货',
            icon: 'none'
          })
          this.setData({
            batchStatus: -1
          })
        }
      })
  },

  _logPriceDebug(tag, payload) {
    console.log('[gbOrderInput 单价] ' + tag, payload || '');
  },

  _logCartonDebug(item, orders, index) {
    var g = item && item.gbDistributerGoodsEntity;
    var orderUnits = [];
    for (var i = 0; i < orders.length; i++) {
      orderUnits.push({
        gbDoStandard: orders[i].gbDoStandard,
        gbDoQuantity: orders[i].gbDoQuantity,
        gbDoDsStandardScale: orders[i].gbDoDsStandardScale,
        isNotice: orders[i].isNotice,
      });
    }
    this._logPriceDebug('箱规判断[' + (index + 1) + ']', {
      name: item.gbDistributerGoodsName,
      gbDpgStandard: item.gbDpgStandard,
      gbDpgBuyScale: item.gbDpgBuyScale,
      gbDgCartonUnit: g && g.gbDgCartonUnit,
      gbDgItemsPerCarton: g && g.gbDgItemsPerCarton,
      gbDgGoodsStandardname: g && g.gbDgGoodsStandardname,
      resolveCartonUnit: orderGoodsScale.resolveCartonUnit(item),
      useCartonPrice: orderGoodsScale.isCartonOrderInput(item),
      orders: orderUnits,
    });
  },

  _logPurGoodsSnapshot(purGoods, label) {
    if (!purGoods) {
      this._logPriceDebug(label, { purGoods: null });
      return;
    }
    var orderLogs = [];
    var orders = purGoods.gbDepartmentOrdersEntities || [];
    for (var i = 0; i < orders.length; i++) {
      var o = orders[i];
      orderLogs.push({
        orderId: o.gbDepartmentOrdersId,
        gbDoDsStandardScale: o.gbDoDsStandardScale,
        gbDoStandard: o.gbDoStandard,
        gbDoQuantity: o.gbDoQuantity,
        gbDoScalePrice: o.gbDoScalePrice,
        gbDoPrice: o.gbDoPrice,
        gbDoScaleWeight: o.gbDoScaleWeight,
        gbDoWeight: o.gbDoWeight,
        gbDoSubtotal: o.gbDoSubtotal,
        gbDoBuyStatus: o.gbDoBuyStatus,
      });
    }
    this._logPriceDebug(label, {
      purGoodsId: purGoods.gbDistributerPurchaseGoodsId,
      goodsName: purGoods.gbDistributerGoodsName,
      isScalePurGoods: orderGoodsScale.isScalePurGoods(purGoods),
      gbDpgStandard: purGoods.gbDpgStandard,
      gbDpgBuyScale: purGoods.gbDpgBuyScale,
      gbDpgBuyScalePrice: purGoods.gbDpgBuyScalePrice,
      gbDpgBuyPrice: purGoods.gbDpgBuyPrice,
      gbDpgBuyScaleQuantity: purGoods.gbDpgBuyScaleQuantity,
      gbDpgBuyQuantity: purGoods.gbDpgBuyQuantity,
      gbDpgBuySubtotal: purGoods.gbDpgBuySubtotal,
      scaleFactor: this._getPurGoodsScaleFactor(purGoods),
      orders: orderLogs,
    });
  },

  try(data) {
    var value = wx.getStorageSync("num");
    var obj = "";
    for (var i = 0; i < value.length; i++) {
      var id = value[i].id;
      if (data == id) {
        obj = value[i];
      }
    }
    if (obj) {
      var innerAudioContext = wx.createInnerAudioContext();
      innerAudioContext.autoplay = true;
      innerAudioContext.src = obj.filePath;
      innerAudioContext.play();
    }
  },

  inputValue(e) {
    var item = this.data.batch.gbDPGEntities[this.data.focusGoodsIndex];
    var useCarton = orderGoodsScale.isCartonOrderInput(item);
    this._logPriceDebug('inputValue', {
      key: e.currentTarget.dataset.value,
      focusGoodsIndex: this.data.focusGoodsIndex,
      useCartonPrice: useCarton,
      route: useCarton ? '_inputBuyScalePrice' : '_inputBuyPrice',
    });
    if (useCarton) {
      this._inputBuyScalePrice(e);
    } else {
      this._inputBuyPrice(e);
    }
  },

  _getPurGoodsScaleFactor(item) {
    var orders = item.gbDepartmentOrdersEntities || [];
    for (var i = 0; i < orders.length; i++) {
      var factor = orderGoodsScale.resolveScaleFactor(item, orders[i]);
      if (factor > 0) {
        return factor;
      }
    }
    return 0;
  },

  _applyScalePriceToOrders(scalePrice) {
    var focusIndex = this.data.focusGoodsIndex;
    var item = this.data.batch.gbDPGEntities[focusIndex];
    var orderArr = item.gbDepartmentOrdersEntities || [];
    var patch = {};

    this._logPriceDebug('_applyScalePriceToOrders 开始', {
      focusIndex: focusIndex,
      scalePrice: scalePrice,
      orderCount: orderArr.length,
    });

    for (var i = 0; i < orderArr.length; i++) {
      var orderBefore = orderArr[i];
      var applied = orderGoodsScale.applyScalePriceToOrder(orderArr[i], item, scalePrice);
      this._logPriceDebug('订单换算[' + (i + 1) + ']', {
        orderId: orderBefore.gbDepartmentOrdersId,
        scalePriceInput: scalePrice,
        before: {
          gbDoDsStandardScale: orderBefore.gbDoDsStandardScale,
          gbDoScaleWeight: orderBefore.gbDoScaleWeight,
          gbDoWeight: orderBefore.gbDoWeight,
          gbDoQuantity: orderBefore.gbDoQuantity,
          gbDoScalePrice: orderBefore.gbDoScalePrice,
          gbDoPrice: orderBefore.gbDoPrice,
        },
        applied: applied,
        weightsResolved: orderGoodsScale.resolveOrderScaleWeights(orderBefore),
      });
      if (!applied) {
        continue;
      }
      var prefix = "batch.gbDPGEntities[" + focusIndex + "].gbDepartmentOrdersEntities[" + i + "].";
      var purPrefix = "purGoods.gbDepartmentOrdersEntities[" + i + "].";
      patch[prefix + "gbDoScalePrice"] = applied.gbDoScalePrice;
      patch[purPrefix + "gbDoScalePrice"] = applied.gbDoScalePrice;
      patch[prefix + "gbDoPrice"] = applied.gbDoPrice;
      patch[purPrefix + "gbDoPrice"] = applied.gbDoPrice;
      if (applied.gbDoScaleWeight) {
        patch[prefix + "gbDoScaleWeight"] = applied.gbDoScaleWeight;
        patch[purPrefix + "gbDoScaleWeight"] = applied.gbDoScaleWeight;
      }
      if (applied.gbDoWeight) {
        patch[prefix + "gbDoWeight"] = applied.gbDoWeight;
        patch[purPrefix + "gbDoWeight"] = applied.gbDoWeight;
      }
      if (applied.gbDoSubtotal) {
        patch[prefix + "gbDoSubtotal"] = applied.gbDoSubtotal;
        patch[purPrefix + "gbDoSubtotal"] = applied.gbDoSubtotal;
      }
    }
    if (Object.keys(patch).length) {
      this.setData(patch);
      this._logPriceDebug('_applyScalePriceToOrders setData', patch);
    } else {
      this._logPriceDebug('_applyScalePriceToOrders 无 patch', { scalePrice: scalePrice });
    }
    this._getScaleSubTotal();
  },

  _inputBuyPrice(e) {var value = e.currentTarget.dataset.value;
    var oldValue = this.data.batch.gbDPGEntities[this.data.focusGoodsIndex].gbDpgBuyPrice;

    if (value <= 9 && value >= 0) {
      var newValue = 0;
      if (oldValue != null && oldValue !== '' && oldValue !== "0.0") {
        newValue = String(oldValue) + String(value);
      } else {
        newValue = value
      }

      this.setData({
        ["batch.gbDPGEntities[" + this.data.focusGoodsIndex + "].gbDpgBuyPrice"]: newValue,
        ["purGoods.gbDpgBuyPrice"]: newValue
      })
      this.try(value);
      this._changeBuyPriceToDoPrice(newValue);
    } else {if (value == ".") {
        var newValue = 0;
        if (oldValue != null && oldValue !== '' && String(oldValue).indexOf(".") != -1) {
          this.try("tishi");
        } else {
          if (oldValue != null && oldValue !== '' && Number(oldValue) > 0) {
            newValue = String(oldValue) + ".";
            this.try("dian")
            this._changeBuyPriceToDoPrice(newValue);
          } else {
            newValue = "0."
            this.try("lingdian")
            this._changeBuyPriceToDoPrice();
          }
          this.setData({
            ["batch.gbDPGEntities[" + this.data.focusGoodsIndex + "].gbDpgBuyPrice"]: newValue,
            ["purGoods.gbDpgBuyPrice"]: newValue
          })
        }
      }
      if (value == "del") {
        newValue = "";
        if (oldValue != null && oldValue !== '') {
          newValue = String(oldValue).substr(0, String(oldValue).length - 1);
        }
        this.setData({
          ["batch.gbDPGEntities[" + this.data.focusGoodsIndex + "].gbDpgBuyPrice"]: newValue,
          ["purGoods.gbDpgBuyPrice"]: newValue
        })
        this.try("delete")
        this._changeBuyPriceToDoPrice(newValue);
      }

      if (value == "close") {
        this.setData({
          focusGoodsIndex: -1,
          lastInput: true
        })
        this.try("close");
        this._getInitData();
      }

      if (value == "next") {
        this._savePurGoods();

        var goodsIndex = this.data.focusGoodsIndex;
        if (goodsIndex !== this.data.batch.gbDPGEntities.length - 1) {
          this.setData({
            focusGoodsIndex: goodsIndex + 1,
            purGoods: this.data.batch.gbDPGEntities[goodsIndex + 1]
          })
        } else {
          var purGoods = this.data.batch.gbDPGEntities[this.data.batch.gbDPGEntities.length - 1];
          this.setData({
            focusGoodsIndex: -1,
            lastInput: true,
            purGoods: purGoods
          })
        }
        this.try("next");
      }
    }
  },

  _inputBuyScalePrice(e) {
    var value = e.currentTarget.dataset.value;
    var oldValue = this.data.batch.gbDPGEntities[this.data.focusGoodsIndex].gbDpgBuyScalePrice;

    if (value <= 9 && value >= 0) {
      var newValue = 0;
      if (oldValue != null && oldValue !== '' && oldValue !== "0.0") {
        newValue = String(oldValue) + String(value);
      } else {
        newValue = value
      }
      var factor = this._getPurGoodsScaleFactor(this.data.batch.gbDPGEntities[this.data.focusGoodsIndex]);
      var buyPrice = factor > 0 ? (Number(newValue) / factor).toFixed(2) : newValue;
      this.setData({
        ["batch.gbDPGEntities[" + this.data.focusGoodsIndex + "].gbDpgBuyScalePrice"]: newValue,
        ["purGoods.gbDpgBuyScalePrice"]: newValue,
        ["batch.gbDPGEntities[" + this.data.focusGoodsIndex + "].gbDpgBuyPrice"]: buyPrice,
        ["purGoods.gbDpgBuyPrice"]: buyPrice,
      })
      this.try(value);
      this._logPriceDebug('_inputBuyScalePrice 数字', {
        newScalePrice: newValue,
        buyPrice: buyPrice,
        factor: factor,
      });
      this._applyScalePriceToOrders(newValue);
    } else {
      if (value == ".") {
        var newValue = 0;
        if (oldValue != null && oldValue !== '' && String(oldValue).indexOf(".") != -1) {
          this.try("tishi");
        } else {
          if (oldValue != null && oldValue !== '' && Number(oldValue) > 0) {
            newValue = String(oldValue) + ".";
            this.try("dian")
            this._applyScalePriceToOrders(newValue);
          } else {
            newValue = "0."
            this.try("lingdian")
            this._applyScalePriceToOrders(newValue);
          }
          var factor = this._getPurGoodsScaleFactor(this.data.batch.gbDPGEntities[this.data.focusGoodsIndex]);
          var buyPrice = factor > 0 ? (Number(newValue) / factor).toFixed(2) : newValue;
          this.setData({
            ["batch.gbDPGEntities[" + this.data.focusGoodsIndex + "].gbDpgBuyScalePrice"]: newValue,
            ["purGoods.gbDpgBuyScalePrice"]: newValue,
            ["batch.gbDPGEntities[" + this.data.focusGoodsIndex + "].gbDpgBuyPrice"]: buyPrice,
            ["purGoods.gbDpgBuyPrice"]: buyPrice,
          })
        }
      }
      if (value == "del") {
        newValue = "";
        if (oldValue != null && oldValue !== '') {
          newValue = String(oldValue).substr(0, String(oldValue).length - 1);
        }
        var factorDel = this._getPurGoodsScaleFactor(this.data.batch.gbDPGEntities[this.data.focusGoodsIndex]);
        var buyPriceDel = factorDel > 0 && newValue !== '' ? (Number(newValue) / factorDel).toFixed(2) : newValue;
        this.setData({
          ["batch.gbDPGEntities[" + this.data.focusGoodsIndex + "].gbDpgBuyScalePrice"]: newValue,
          ["purGoods.gbDpgBuyScalePrice"]: newValue,
          ["batch.gbDPGEntities[" + this.data.focusGoodsIndex + "].gbDpgBuyPrice"]: buyPriceDel,
          ["purGoods.gbDpgBuyPrice"]: buyPriceDel,
        })
        this.try("delete")
        this._applyScalePriceToOrders(newValue);
      }

      if (value == "close") {
        this.setData({
          focusGoodsIndex: -1,
          lastInput: true
        })
        this.try("close");
        this._getInitData();
      }

      if (value == "next") {
        this._savePurGoods();

        var goodsIndex = this.data.focusGoodsIndex;
        if (goodsIndex !== this.data.batch.gbDPGEntities.length - 1) {
          this.setData({
            focusGoodsIndex: goodsIndex + 1,
            purGoods: this.data.batch.gbDPGEntities[goodsIndex + 1]
          })
        } else {
          var purGoods = this.data.batch.gbDPGEntities[this.data.batch.gbDPGEntities.length - 1];
          this.setData({
            focusGoodsIndex: -1,
            lastInput: true,
            purGoods: purGoods
          })
        }
        this.try("next");
      }
    }
  },

  _syncPurGoodsOrdersInMemory(purGoods) {
    if (!purGoods || !orderGoodsScale.isCartonOrderInput(purGoods)) {
      this._logPriceDebug('_syncPurGoodsOrdersInMemory 跳过', {
        hasPurGoods: !!purGoods,
        useCartonPrice: purGoods ? orderGoodsScale.isCartonOrderInput(purGoods) : false,
      });
      return purGoods;
    }
    var scalePrice = purGoods.gbDpgBuyScalePrice;
    if (!scalePrice || scalePrice === '' || scalePrice === '0.0') {
      this._logPriceDebug('_syncPurGoodsOrdersInMemory 无箱价', { scalePrice: scalePrice });
      return purGoods;
    }
    var orders = purGoods.gbDepartmentOrdersEntities || [];
    for (var i = 0; i < orders.length; i++) {
      var applied = orderGoodsScale.applyScalePriceToOrder(orders[i], purGoods, scalePrice);
      this._logPriceDebug('_syncPurGoodsOrdersInMemory 订单[' + (i + 1) + ']', {
        orderId: orders[i].gbDepartmentOrdersId,
        scalePrice: scalePrice,
        applied: applied,
      });
      if (applied) {
        orders[i].gbDoScalePrice = applied.gbDoScalePrice;
        orders[i].gbDoPrice = applied.gbDoPrice;
        orders[i].gbDoScaleWeight = applied.gbDoScaleWeight;
        orders[i].gbDoWeight = applied.gbDoWeight;
        orders[i].gbDoSubtotal = applied.gbDoSubtotal;
      }
    }
    return purGoods;
  },

  _changeBuyPriceToDoPrice(data) {
    var orderArr = this.data.batch.gbDPGEntities[this.data.focusGoodsIndex].gbDepartmentOrdersEntities;
    for (var i = 0; i < orderArr.length; i++) {
      var weight = orderArr[i].gbDoWeight;if (weight != null && weight > 0) {
        var subtotal = Number(weight) * Number(data);
        this.setData({
          ["batch.gbDPGEntities[" + this.data.focusGoodsIndex + "].gbDepartmentOrdersEntities[" + i + "].gbDoSubtotal"]: subtotal.toFixed(1),
          ["purGoods.gbDepartmentOrdersEntities[" + i + "].gbDoSubtotal"]: subtotal.toFixed(1),
        })
      }
      this.setData({
        ["batch.gbDPGEntities[" + this.data.focusGoodsIndex + "].gbDepartmentOrdersEntities[" + i + "].gbDoPrice"]: data,
        ["purGoods.gbDepartmentOrdersEntities[" + i + "].gbDoPrice"]: data,
      })
      this._getSubTotal();
    }
  },

  _getSubTotal() {
    var item = this.data.batch.gbDPGEntities[this.data.focusGoodsIndex];
    if (!item) {
      return;
    }
    orderGoodsScale.syncPurGoodsQtyFromOrders(item);
    var orders = item.gbDepartmentOrdersEntities || [];
    var price = item.gbDpgBuyPrice;
    var subtotal = 0;
    var hasLineSub = false;
    for (var i = 0; i < orders.length; i++) {
      var lineSub = orders[i].gbDoSubtotal;
      var lineWeight = orders[i].gbDoWeight;
      var linePrice = orders[i].gbDoPrice || price;
      if (lineSub != null && lineSub !== '' && lineSub !== '0.0' && !isNaN(Number(lineSub)) && Number(lineSub) > 0) {
        subtotal += Number(lineSub);
        hasLineSub = true;
      } else if (lineWeight != null && linePrice != null
          && !isNaN(Number(lineWeight)) && !isNaN(Number(linePrice))
          && Number(lineWeight) > 0 && Number(linePrice) > 0) {
        subtotal += Number(lineWeight) * Number(linePrice);
        hasLineSub = true;
      }
    }
    if (!hasLineSub && price != null && item.gbDpgBuyQuantity != null
        && !isNaN(Number(price)) && !isNaN(Number(item.gbDpgBuyQuantity))) {
      subtotal = Number(price) * Number(item.gbDpgBuyQuantity);
    }
    var itemSubtotalData = "batch.gbDPGEntities[" + this.data.focusGoodsIndex + "].gbDpgBuySubtotal";
    var qtyData = "batch.gbDPGEntities[" + this.data.focusGoodsIndex + "].gbDpgBuyQuantity";
    this.setData({
      [itemSubtotalData]: subtotal.toFixed(1),
      [qtyData]: item.gbDpgBuyQuantity,
      ["purGoods.gbDpgBuySubtotal"]: subtotal.toFixed(1),
      ["purGoods.gbDpgBuyQuantity"]: item.gbDpgBuyQuantity,
    })

    var goodArr = this.data.batch.gbDPGEntities;
    var subTemp = 0;
    for (var i = 0; i < goodArr.length; i++) {
      var subTot = this.data.batch.gbDPGEntities[i].gbDpgBuySubtotal;
      if (subTot != null && subTot !== "null" && !isNaN(Number(subTot))) {
        subTemp = Number(subTemp) + Number(subTot);
      }
    }

    var subData = "batch.gbDpbSubtotal";
    this.setData({
      [subData]: subTemp.toFixed(1),
      payTotal: subTemp.toFixed(1)
    })
  },

  _getScaleSubTotal() {
    var focusIndex = this.data.focusGoodsIndex;
    var item = this.data.batch.gbDPGEntities[focusIndex];
    var purGoods = this.data.purGoods;
    orderGoodsScale.syncPurGoodsScaleTotals(item);
    if (purGoods && purGoods.gbDistributerPurchaseGoodsId === item.gbDistributerPurchaseGoodsId) {
      orderGoodsScale.syncPurGoodsScaleTotals(purGoods);
    }
    var subtotal = item.gbDpgBuySubtotal || '0.0';
    var scaleQty = item.gbDpgBuyScaleQuantity;
    var patch = {};
    patch['batch.gbDPGEntities[' + focusIndex + '].gbDpgBuySubtotal'] = subtotal;
    patch['batch.gbDPGEntities[' + focusIndex + '].gbDpgBuyScaleQuantity'] = scaleQty;
    if (purGoods) {
      patch['purGoods.gbDpgBuySubtotal'] = subtotal;
      patch['purGoods.gbDpgBuyScaleQuantity'] = scaleQty;
    }
    this.setData(patch);

    var goodArr = this.data.batch.gbDPGEntities;
    var subTemp = 0;
    for (var i = 0; i < goodArr.length; i++) {
      var subTot = goodArr[i].gbDpgBuySubtotal;
      if (subTot != null && subTot !== 'null' && !isNaN(Number(subTot))) {
        subTemp = Number(subTemp) + Number(subTot);
      }
    }
    this.setData({
      'batch.gbDpbSubtotal': subTemp.toFixed(1),
      payTotal: subTemp.toFixed(1),
    });
  },

  changeFocusIndex(e) {
    if (this.data.focusGoodsIndex !== -1) {
      this._savePurGoods();
    }

    var index = e.currentTarget.dataset.index;
    this.setData({
      focusGoodsIndex: index,
      lastInput: false,
      purGoods: this.data.batch.gbDPGEntities[index],
    })
    this._logPurGoodsSnapshot(this.data.batch.gbDPGEntities[index], 'changeFocusIndex 选中商品');
  },

  toBack() {
    wx.setStorageSync('batch', this.data.batch)
    var pages = getCurrentPages();
    var prevPage = pages[pages.length - 2];
    prevPage.setData({
      batch: this.data.batch
    })
    wx.navigateBack({
      delta: 1,
    })
  },

  showShareTishi() {var batch = this.data.batch;
    var orderAmount = 0;
    var finishAmount = 0;
    var unFinishAmount = 0;
    for (var i = 0; i < batch.gbDPGEntities.length; i++) {
      var ordersArr = batch.gbDPGEntities[i].gbDepartmentOrdersEntities;
      for (var j = 0; j < ordersArr.length; j++) {
        orderAmount = Number(orderAmount) + Number(1);
        var orderWeight = batch.gbDPGEntities[i].gbDepartmentOrdersEntities[j].gbDoWeight;
        var orderSubtotal = batch.gbDPGEntities[i].gbDepartmentOrdersEntities[j].gbDoSubtotal;if (orderWeight > 0 && orderWeight !== null && orderSubtotal > 0 && orderSubtotal !== null) {
          finishAmount = Number(finishAmount) + Number(1);
        }
      }
    }

    unFinishAmount = Number(orderAmount) - Number(finishAmount);
    if (orderAmount == finishAmount) {
      var that = this;
      that.setData({
        isTishi: true,
      })
    } else {
      wx.showModal({
        title: "有" + unFinishAmount + "个未完成订单",
        content: "请输入数据或请采购员取消未完成订单",
        showCancel: false,
        confirmText: "知道了",
      })
    }
  },

  _savePurGoods() {
    var purGoods = this.data.purGoods;
    this._logPurGoodsSnapshot(purGoods, '_savePurGoods 保存前(原始)');
    if (purGoods) {
      orderGoodsScale.syncPurGoodsQtyFromOrders(purGoods);
      this._syncPurGoodsOrdersInMemory(purGoods);
      if (orderGoodsScale.isCartonOrderInput(purGoods) && purGoods.gbDpgBuyScalePrice) {
        this._applyScalePriceToOrders(purGoods.gbDpgBuyScalePrice);
        orderGoodsScale.syncPurGoodsScaleTotals(purGoods);
        var batchItem = this.data.batch.gbDPGEntities[this.data.focusGoodsIndex];
        if (batchItem && batchItem.gbDistributerPurchaseGoodsId === purGoods.gbDistributerPurchaseGoodsId) {
          orderGoodsScale.syncPurGoodsScaleTotals(batchItem);
        }
      }
    }
    this._logPurGoodsSnapshot(purGoods, '_savePurGoods 提交接口');
    load.showLoading("保存数据中");
    sellerUpdatePurGoods(purGoods)
      .then(res => {
        load.hideLoading();
        this._logPriceDebug('_savePurGoods 接口返回', {
          code: res.result.code,
          msg: res.result.msg,
        });
        if (res.result.code == 0) {this._getInitData()
        }
      })
      .catch(err => {
        load.hideLoading();
        this._logPriceDebug('_savePurGoods 接口失败', err);
      })
  },

  closeMask() {
    wx.navigateBack({
      delta: 1,
    })
  },
})
