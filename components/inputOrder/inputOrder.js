Component({
  /**
   * 组件的属性列表
   */
  properties: {
    show: {
      type: Boolean,
      value: true
    },
    item: {
      type: Object,
      value: ""
    },
    maskHeight: {
      type: Number,
      value: ""
    },
    windowHeight: {
      type: Number,
      value: ""
    },
    windowWidth: {
      type: Number,
      value: ""
    },
    scaleInput: {
      type: Boolean,
      value: false
    },
    scrollViewTop: {
      type: Number,
      value: ""
    },
    foucusWeight: {
      type: Boolean,
      value: false
    },
    foucusPrice: {
      type: Boolean,
      value: false
    },
    canSave: {
      type: Boolean,
      value: false
    },
    disInfo: {
      type: Object,
      value: ""
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    showReason: false,
    isClosing: false,
  },

  /**
   * 组件的方法列表
   */
  methods: {

    // 获取订单列表，双路径兼容新旧系统数据
    _getOrders: function () {
      var item = this.data.item;
      return item.gbDepartmentOrdersEntities || (item.gbDistributerGoodsEntity && item.gbDistributerGoodsEntity.gbDepartmentOrdersEntities) || [];
    },

    // 获取 setData 的 key 路径
    _getOrderKey: function (index, field) {
      var item = this.data.item;
      var prefix = item.gbDepartmentOrdersEntities
        ? "item.gbDepartmentOrdersEntities[" + index + "]"
        : "item.gbDistributerGoodsEntity.gbDepartmentOrdersEntities[" + index + "]";
      return prefix + "." + field;
    },

    closeWithAnimation: function () {
      this.setData({
        isClosing: true
      });
      var that = this;
      setTimeout(function () {
        that.setData({
          show: false,
          showReason: false,
          scaleInput: false,
          isClosing: false
        });
      }, 300);
    },

    clickMask: function () {
      this.closeWithAnimation();
    },

    cancle: function () {
      this.setData({
        isClosing: true
      });
      var that = this;
      setTimeout(function () {
        that.setData({
          show: false,
          editApply: false,
          item: "",
          showReason: false,
          scaleInput: false,
          isClosing: false
        });
        that.triggerEvent('cancle');
      }, 300);
    },

    finish: function (e) {
      this.setData({
        isClosing: true
      });
      var that = this;
      setTimeout(function () {
        that.setData({
          show: false,
          editApply: false,
          item: "",
          showReason: false,
          scaleInput: false,
          isClosing: false
        });
        that.triggerEvent('finish');
      }, 300);
    },

    confirm: function (e) {
      var aaa = this._checkPriceAndReason();
      console.log(aaa);
      if (aaa) {
        if (this.data.item.gbDpgBuyPrice == null || !this.data.item.gbDpgBuyPrice > 0) {
          var price = this.data.item.gbDpgBuyPrice;
          if (price && price.length == 0) {
            wx.showToast({
              title: '单价不能为空',
              icon: 'none'
            });
            return;
          }
        }
        var orderArr = this._getOrders();
        for (var j = 0; j < orderArr.length; j++) {
          var choice = orderArr[j].hasChoice;
          if (choice) {
            var orderWeight = orderArr[j].gbDoWeight;
            if (orderWeight == null || orderWeight.length == 0) {
              wx.showToast({
                title: '订单重量不能为空',
                icon: 'none'
              });
              return;
            }
          }
        }
        this.triggerEvent('confirm', {
          item: this.data.item
        });
        var that = this;
        this.setData({
          isClosing: true
        });
        setTimeout(function () {
          that.setData({
            show: false,
            showReason: false,
            scaleInput: false,
            isClosing: false
          });
        }, 300);
      } else {
        wx.showToast({
          title: '请输入价格异常原因',
          icon: 'none'
        });
        this.setData({
          showReason: true
        });
        return;
      }
    },

    getPurchasePrice: function (e) {
      console.log('[inputOrder] getPurchasePrice - 输入值:', e.detail.value);
      var itemData = "item.gbDpgBuyPrice";
      var numberStr = e.detail.value;
      if (e.detail.value.length > 0) {
        this.setData({
          [itemData]: numberStr
        });
        var y = String(numberStr).indexOf(".");
        var count = 0;
        if (y !== -1) {
          count = String(numberStr).length - y;
        }
        if (count > 3) {
          wx.showToast({
            title: '小数点只能保留一位',
          });
          this.setData({
            [itemData]: numberStr.substring(0, numberStr.length - 1),
          });
        }
        if (numberStr > 99999) {
          wx.showToast({
            title: '最大不能超过九万九千九百九十九',
            icon: "none"
          });
          this.setData({
            [itemData]: numberStr.substring(0, numberStr.length - 1),
          });
        }
        this._countOrderData();
      } else {
        this._emptyInputPrice();
      }
    },

    getPurchasePriceScale: function (e) {
      var itemData = "item.gbDpgBuyScalePrice";
      var numberStr = e.detail.value;
      if (e.detail.value.length > 0) {
        this.setData({
          itemData: numberStr
        });
        var y = String(numberStr).indexOf(".");
        var count = 0;
        if (y !== -1) {
          count = String(numberStr).length - y;
        }
        if (count > 3) {
          wx.showToast({
            title: '小数点只能保留一位',
          });
          this.setData({
            itemData: numberStr.substring(0, numberStr.length - 1),
          });
        }
        if (numberStr > 99999) {
          wx.showToast({
            title: '最大不能超过九万九千九百九十九',
            icon: "none"
          });
          this.setData({
            itemData: numberStr.substring(0, numberStr.length - 1),
          });
        }

        var itemPriceData = "item.gbDpgBuyPrice";
        var scale = this.data.item.gbDpgBuyScale;
        var buyPrice = (Number(this.data.item.gbDpgBuyScalePrice) / Number(scale)).toFixed(2);
        this.setData({
          itemPriceData: buyPrice
        });

        this._getBuySubtotalScale();
        this._getOrderSubtotalScale();
      } else {
        this._emptyInputPriceScale();
      }
    },

    getOrderWeight: function (e) {
      console.log('[inputOrder] getOrderWeight - 原始e.detail.value:', e.detail.value);
      var index = e.currentTarget.dataset.index;
      var price = Number(this.data.item.gbDpgBuyPrice);
      console.log('[inputOrder] getOrderWeight - price:', price, 'gbDpgBuyPrice:', this.data.item.gbDpgBuyPrice);
      var orderWeightData = this._getOrderKey(index, "gbDoWeight");
      var orderPriceData = this._getOrderKey(index, "gbDoPrice");
      var subData = this._getOrderKey(index, "gbDoSubtotal");
      var orderWeighValue = e.detail.value;
      if (orderWeighValue.length > 0) {
        var sub = (isNaN(price) || price === 0) ? '' : (Number(price) * Number(orderWeighValue)).toFixed(1);
        console.log('[inputOrder] getOrderWeight - weightKey:', orderWeightData, 'weightValue:', orderWeighValue, 'subKey:', subData, 'sub:', sub);
        this.setData({
          [orderWeightData]: orderWeighValue,
          [orderPriceData]: price,
          [subData]: sub
        });
        console.log('[inputOrder] getOrderWeight - setData后，arr[' + index + '].gbDoWeight:', this._getOrders()[index].gbDoWeight, 'gbDoSubtotal:', this._getOrders()[index].gbDoSubtotal);

        var y = String(orderWeighValue).indexOf(".");
        var count = 0;
        if (y !== -1) {
          count = String(orderWeighValue).length - y;
        }
        if (count > 3) {
          wx.showToast({
            title: '小数点只能保留一位',
          });
          var newWeight = Number(orderWeighValue.substring(0, orderWeighValue.length - 1));
          var newSub = (isNaN(price) || price === 0) ? '' : (Number(price) * newWeight).toFixed(1);
          this.setData({
            [orderWeightData]: newWeight,
            [orderPriceData]: price,
            [subData]: newSub
          });
        }
        if (e.detail.value > 99999) {
          wx.showToast({
            title: '最大不能超过九万九千九百九十九',
            icon: "none"
          });
          var newWeight2 = Number(orderWeighValue.substring(0, orderWeighValue.length - 1));
          var newSub2 = (isNaN(price) || price === 0) ? '' : (Number(price) * newWeight2).toFixed(1);
          this.setData({
            [orderWeightData]: newWeight2,
            [orderPriceData]: price,
            [subData]: newSub2
          });
        }
      } else {
        this.setData({
          [orderWeightData]: "",
          [subData]: ""
        });
      }
      this._getBuySubtotal();
    },

    _checkPrice: function () {
      if (this.data.item.gbDistributerGoodsEntity.gbDgControlPrice == 1 && this.data.item.gbDpgBuyPrice > 0) {
        if (Number(this.data.item.gbDpgBuyPrice) < Number(this.data.item.gbDistributerGoodsEntity.gbDgGoodsLowestPrice) || Number(this.data.item.gbDpgBuyPrice) > Number(this.data.item.gbDistributerGoodsEntity.gbDgGoodsHighestPrice)) {
          this.setData({
            showReason: true,
          });
        } else {
          this.setData({
            showReason: false,
          });
        }
      }
    },

    getPurchasePriceReason: function (e) {
      if (e.detail.value.length < 20 && e.detail.value.length > 0) {
        var itemData = "item.gbDpgBuyPriceReason";
        var resonStr = e.detail.value;
        this.setData({
          itemData: resonStr,
        });
      } else {
        wx.showToast({
          title: '内容在20个汉字',
          icon: 'none'
        });
      }
    },

    _emptyInputPrice: function () {
      var arr = this._getOrders();
      for (var i = 0; i < arr.length; i++) {
        var orderPriceData = this._getOrderKey(i, "gbDoPrice");
        var subData = this._getOrderKey(i, "gbDoSubtotal");
        this.setData({
          orderPriceData: "",
          subData: ""
        });
      }
      this.setData({
        "item.gbDpgBuySubtotal": "",
        "item.gbDpgBuyPrice": "",
        canSave: false
      });
    },

    _emptyInputPriceScale: function () {
      var arr = this._getOrders();
      for (var i = 0; i < arr.length; i++) {
        var orderPriceData = this._getOrderKey(i, "gbDoPrice");
        var subData = this._getOrderKey(i, "gbDoSubtotal");
        var sellingSubData = this._getOrderKey(i, "gbDoSellingSubtotal");
        this.setData({
          orderPriceData: "",
          subData: "",
          sellingSubData: ""
        });
      }
      this.setData({
        "item.gbDpgBuySubtotal": "",
        "item.gbDpgBuyPrice": "",
        "item.gbDpgBuyScalePrice": "",
      });
    },

    _countOrderData: function () {
      var price = Number(this.data.item.gbDpgBuyPrice);
      var arr = this._getOrders();
      console.log('[inputOrder] _countOrderData - price:', price, 'gbDpgBuyPrice:', this.data.item.gbDpgBuyPrice, 'orders长度:', arr.length);
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].isNotice) {
          var weight = arr[i].gbDoWeight;
          var orderPriceData = this._getOrderKey(i, "gbDoPrice");
          var subData = this._getOrderKey(i, "gbDoSubtotal");
          console.log('[inputOrder] _countOrderData - i:', i, 'weight:', weight, 'price:', price);
          // 只有 weight 有值时才计算小计
          if (weight != null && weight !== '' && !isNaN(Number(weight))) {
            var sub = (Number(price) * Number(weight)).toFixed(1);
            console.log('[inputOrder] _countOrderData - sub:', sub, 'key:', subData);
            this.setData({
              [orderPriceData]: price,
              [subData]: sub,
            });
          } else {
            // weight 为空，只设置单价
            this.setData({
              [orderPriceData]: price,
            });
          }
        }
      }
      this._getBuySubtotal();
    },

    _getBuySubtotal: function (e) {
      var arr = this._getOrders();
      var total = "";
      var weightTotal = "";
      console.log('[inputOrder] _getBuySubtotal - orders:', JSON.stringify(arr.map(function(o){ return {isNotice:o.isNotice,gbDoSubtotal:o.gbDoSubtotal,gbDoWeight:o.gbDoWeight}; })));
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].isNotice) {
          var sub = arr[i].gbDoSubtotal;
          var wei = arr[i].gbDoWeight;
          console.log('[inputOrder] _getBuySubtotal - i:', i, 'sub:', sub, 'wei:', wei, 'sub!==null:', sub !== null);
          if (sub !== null) {
            weightTotal = Number(weightTotal) + Number(wei);
            total = Number(total) + Number(sub);
            total = total.toFixed(1);
          }
        }
      }
      console.log('[inputOrder] _getBuySubtotal - 最终total:', total, 'weightTotal:', weightTotal);
      this.setData({
        "item.gbDpgBuySubtotal": total,
        "item.gbDpgBuyQuantity": Number(weightTotal).toFixed(1),
      });
      if (total > 0) {
        this.setData({
          canSave: true,
        });
      } else {
        this.setData({
          canSave: false,
        });
      }
    },

    getScaleWeight: function (e) {
      var value = e.detail.value;
      var orderIndex = e.currentTarget.dataset.index;
      var orders = this._getOrders();
      var scale = orders[orderIndex] ? orders[orderIndex].gbDoDsStandardScale : 0;
      var orderWeight = Number(scale) * Number(value);

      var itemData = this._getOrderKey(orderIndex, "gbDoScaleWeight");
      var itemOrderData = this._getOrderKey(orderIndex, "gbDoWeight");
      this.setData({
        orderIndex: orderIndex,
        itemData: value,
        itemOrderData: orderWeight
      });

      this._getTotalWeightScale();
      this._getOrderSubtotalScale();
    },

    _getTotalWeightScale: function () {
      var arr = this._getOrders();
      var scaleQuantityTotal = 0;
      var scaleOrderQuantityTotal = 0;
      for (var i = 0; i < arr.length; i++) {
        var scaleWeight = arr[i].gbDoScaleWeight;
        scaleQuantityTotal = Number(scaleQuantityTotal) + Number(scaleWeight);
        var scareOrderWeight = arr[i].gbDoWeight;
        scaleOrderQuantityTotal = Number(scaleOrderQuantityTotal) + Number(scareOrderWeight);
      }
      this.setData({
        "item.gbDpgBuyScaleQuantity": scaleQuantityTotal,
        "item.gbDpgBuyQuantity": scaleOrderQuantityTotal
      });
      this._getBuySubtotalScale();
    },

    _getOrderSubtotalScale: function () {
      var arr = this._getOrders();
      for (var i = 0; i < arr.length; i++) {
        var subData = this._getOrderKey(i, "gbDoSubtotal");
        var weight = arr[i].gbDoScaleWeight;
        var price = arr[i].gbDoScalePrice;
        var subtotal = (Number(weight) * Number(price)).toFixed(1);
        this.setData({
          subData: subtotal,
        });
      }
    },

    _getBuySubtotalScale: function () {
      var buyPrice = this.data.item.gbDpgBuyScalePrice;
      if (buyPrice !== null && buyPrice > 0) {
        var scaleWeight = this.data.item.gbDpgBuyScaleQuantity;
        var sub = Number(scaleWeight) * Number(buyPrice);
        this.setData({
          "item.gbDpgBuySubtotal": sub.toFixed(1)
        });
      }
      this._countOrderPrice();
    },

    _countOrderPrice: function () {
      var doPrice = this.data.item.gbDpgBuyPrice;
      var scalePrice = this.data.item.gbDpgBuyScalePrice;
      var arr = this._getOrders();
      for (var i = 0; i < arr.length; i++) {
        var priceData = this._getOrderKey(i, "gbDoPrice");
        var scalePriceData = this._getOrderKey(i, "gbDoScalePrice");
        this.setData({
          priceData: doPrice,
          scalePriceData: scalePrice
        });
      }
    },

    _checkPriceAndReason: function () {
      if (this.data.item.gbDistributerGoodsEntity.gbDgControlPrice == 1 && this.data.item.gbDpgBuyPrice > 0) {
        if (Number(this.data.item.gbDpgBuyPrice) < Number(this.data.item.gbDistributerGoodsEntity.gbDgGoodsLowestPrice) || Number(this.data.item.gbDpgBuyPrice) > Number(this.data.item.gbDistributerGoodsEntity.gbDgGoodsHighestPrice)) {
          this.setData({
            showReason: true,
          });
          if (this.data.item.gbDpgBuyPriceReason == null || this.data.item.gbDpgBuyPriceReason.length == 0) {
            return false;
          } else {
            return true;
          }
        } else {
          return true;
        }
      } else {
        return true;
      }
    }
  }
});
