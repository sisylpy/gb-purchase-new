var load = require('../../../lib/load.js');
var dateUtil = require('../../../utils/dateUtil.js');
var {
  getDisPurchaseGoodsBatchGb,
  sellerUpdatePurGoods,
} = require('../../../services/depOrder.js');

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
        if (res.result.code == 0) {
          console.log(res.result.data)
          this.setData({
            batchStatus: res.result.data.gbDpbStatus,
          })
          var arr = res.result.data.gbDPGEntities;
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
    console.log(e);
    var purStandard = this.data.batch.gbDPGEntities[this.data.focusGoodsIndex].gbDpgStandard;
    var goodsStandard = this.data.batch.gbDPGEntities[this.data.focusGoodsIndex].gbDgGoodsStandardname;
    var buyScale = this.data.batch.gbDPGEntities[this.data.focusGoodsIndex].gbDpgBuyScale;
    console.log(purStandard + " standnnddkdkdk" + goodsStandard + "biuysclele==" + buyScale)
    if (purStandard !== goodsStandard && buyScale !== '-1') {
      this._inputBuyScalePrice(e);
    } else {
      this._inputBuyPrice(e)
    }
  },

  _inputBuyPrice(e) {
    console.log("inpubuytpriice")
    var value = e.currentTarget.dataset.value;
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
    } else {
      console.log("点击了非数字")
      if (value == ".") {
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
      var scale = this.data.batch.gbDPGEntities[this.data.focusGoodsIndex].gbDpgBuyScale;
      var buyPrice = (Number(newValue) / Number(scale)).toFixed(2);
      this.setData({
        ["batch.gbDPGEntities[" + this.data.focusGoodsIndex + "].gbDpgBuyScalePrice"]: newValue,
        ["purGoods.gbDpgBuyScalePrice"]: newValue,
        ["batch.gbDPGEntities[" + this.data.focusGoodsIndex + "].gbDpgBuyPrice"]: buyPrice,
        ["purGoods.gbDpgBuyPrice"]: buyPrice,
      })
      this.try(value);
      this._putBuyPriceAndDoPriceScale(newValue);
    } else {
      if (value == ".") {
        var newValue = 0;
        if (oldValue != null && oldValue !== '' && String(oldValue).indexOf(".") != -1) {
          this.try("tishi");
        } else {
          if (oldValue != null && oldValue !== '' && Number(oldValue) > 0) {
            newValue = String(oldValue) + ".";
            this.try("dian")
            this._putBuyPriceAndDoPriceScale(newValue);
          } else {
            newValue = "0."
            this.try("lingdian")
            this._putBuyPriceAndDoPriceScale();
          }
          var scale = this.data.batch.gbDPGEntities[this.data.focusGoodsIndex].gbDpgBuyScale;
          var buyPrice = (Number(newValue) / Number(scale)).toFixed(2);
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
        var scale = this.data.batch.gbDPGEntities[this.data.focusGoodsIndex].gbDpgBuyScale;
        var buyPrice = (Number(newValue) / Number(scale)).toFixed(2);
        this.setData({
          ["batch.gbDPGEntities[" + this.data.focusGoodsIndex + "].gbDpgBuyScalePrice"]: newValue,
          ["purGoods.gbDpgBuyScalePrice"]: newValue,
          ["batch.gbDPGEntities[" + this.data.focusGoodsIndex + "].gbDpgBuyPrice"]: buyPrice,
          ["purGoods.gbDpgBuyPrice"]: buyPrice,
        })
        this.try("delete")
        this._putBuyPriceAndDoPriceScale(newValue);
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

  _putBuyPriceAndDoPriceScale(data) {
    var orderArr = this.data.batch.gbDPGEntities[this.data.focusGoodsIndex].gbDepartmentOrdersEntities;

    for (var i = 0; i < orderArr.length; i++) {
      var scaleWeight = orderArr[i].gbDoScaleWeight;
      if (scaleWeight != null && scaleWeight !== "0.0" && scaleWeight > 0) {
        var scalePrice = this.data.batch.gbDPGEntities[this.data.focusGoodsIndex].gbDpgBuyScalePrice;
        var scale = this.data.batch.gbDPGEntities[this.data.focusGoodsIndex].gbDepartmentOrdersEntities[i].gbDoDsStandardScale;
        if (scalePrice != null && scale != null && scaleWeight != null) {
          var doSubtotal = (Number(scalePrice) * Number(scaleWeight)).toFixed(1)
          var doPrice = (Number(scalePrice) / Number(scale)).toFixed(1)
          console.log("_putBuyPriceAndDoPriceScale_putBuyPriceAndDoPriceScale");
          console.log(doSubtotal)
          this.setData({
            ["batch.gbDPGEntities[" + this.data.focusGoodsIndex + "].gbDepartmentOrdersEntities[" + i + "].gbDoScalePrice"]: data,
            ["batch.gbDPGEntities[" + this.data.focusGoodsIndex + "].gbDepartmentOrdersEntities[" + i + "].gbDoPrice"]: doPrice,
            ["batch.gbDPGEntities[" + this.data.focusGoodsIndex + "].gbDepartmentOrdersEntities[" + i + "].gbDoSubtotal"]: doSubtotal,
            ["purGoods.gbDepartmentOrdersEntities[" + i + "].gbDoScalePrice"]: data,
            ["purGoods.gbDepartmentOrdersEntities[" + i + "].gbDoPrice"]: doPrice,
            ["purGoods.gbDepartmentOrdersEntities[" + i + "].gbDoSubtotal"]: doSubtotal,
          })
        }
      }
      this._getScaleSubTotal();
    }
  },

  _changeBuyPriceToDoPrice(data) {
    var orderArr = this.data.batch.gbDPGEntities[this.data.focusGoodsIndex].gbDepartmentOrdersEntities;
    for (var i = 0; i < orderArr.length; i++) {
      var weight = orderArr[i].gbDoWeight;
      console.log(weight);
      if (weight != null && weight > 0) {
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
    var price = item.gbDpgBuyPrice;
    var quantity = item.gbDpgBuyQuantity;
    var subtotal = 0;
    if (price != null && quantity != null && !isNaN(Number(price)) && !isNaN(Number(quantity))) {
      subtotal = Number(price) * Number(quantity);
    }
    var itemSubtotalData = "batch.gbDPGEntities[" + this.data.focusGoodsIndex + "].gbDpgBuySubtotal";
    this.setData({
      [itemSubtotalData]: subtotal.toFixed(1),
      ["purGoods.gbDpgBuySubtotal"]: subtotal.toFixed(1)
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
    var item = this.data.batch.gbDPGEntities[this.data.focusGoodsIndex];
    var price = item.gbDpgBuyScalePrice;
    var quantity = item.gbDpgBuyScaleQuantity;
    var subtotal = 0;
    if (price != null && quantity != null && !isNaN(Number(price)) && !isNaN(Number(quantity))) {
      subtotal = Number(price) * Number(quantity);
    }
    var itemSubtotalData = "batch.gbDPGEntities[" + this.data.focusGoodsIndex + "].gbDpgBuySubtotal";

    this.setData({
      [itemSubtotalData]: subtotal.toFixed(1),
      ["purGoods.gbDpgBuySubtotal"]: subtotal.toFixed(1)
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

  showShareTishi() {
    console.log("showtishi")
    var batch = this.data.batch;
    var orderAmount = 0;
    var finishAmount = 0;
    var unFinishAmount = 0;
    for (var i = 0; i < batch.gbDPGEntities.length; i++) {
      var ordersArr = batch.gbDPGEntities[i].gbDepartmentOrdersEntities;
      for (var j = 0; j < ordersArr.length; j++) {
        orderAmount = Number(orderAmount) + Number(1);
        var orderWeight = batch.gbDPGEntities[i].gbDepartmentOrdersEntities[j].gbDoWeight;
        var orderSubtotal = batch.gbDPGEntities[i].gbDepartmentOrdersEntities[j].gbDoSubtotal;
        console.log(orderSubtotal);
        if (orderWeight > 0 && orderWeight !== null && orderSubtotal > 0 && orderSubtotal !== null) {
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
    load.showLoading("保存数据中");
    sellerUpdatePurGoods(this.data.purGoods)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          console.log(res.result.data)
          this._getInitData()
        }
      })
  },

  closeMask() {
    wx.navigateBack({
      delta: 1,
    })
  },
})
