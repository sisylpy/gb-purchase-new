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
      value: null,
    },
    /** 父页传入的订单条数；>=0 时优先用于展示，避免 wxs 对 item 解析为 0 条 */
    orderListCount: {
      type: Number,
      value: -1,
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
    /** 单价后缀：外包装订货时为 gbDoStandard（如箱），否则为商品基准规格名 */
    priceUnitSuffix: "",
  },

  observers: {
    item: function (item) {
      this._refreshPriceUnitSuffix(item);
    },
  },

  lifetimes: {
    attached: function () {
      this._refreshPriceUnitSuffix(this.properties.item);
    },
  },

  /**
   * 组件的方法列表
   */
  methods: {

    /** 订货单位为外包装（有系数且 gbDoStandard 与商品基准规格不同） */
    _isOrderOuterPack: function (order, entity) {
      if (!order || !entity) {
        return false;
      }
      var scale = order.gbDoDsStandardScale;
      if (scale === null || scale === undefined || scale === "" || scale === "-1") {
        return false;
      }
      var n = Number(scale);
      if (isNaN(n) || n <= 0) {
        return false;
      }
      var ordStd = order.gbDoStandard;
      var baseStd = entity.gbDgGoodsStandardname;
      return !!(ordStd && baseStd && String(ordStd) !== String(baseStd));
    },

    /** 顶部「元/xxx」：录入单价与商品基准规格一致（外包装订货时小计仍按基准价×箱数×系数） */
    _refreshPriceUnitSuffix: function (item) {
      if (!item || typeof item !== "object" || !item.gbDistributerGoodsEntity) {
        if (this.data.priceUnitSuffix !== "") {
          this.setData({ priceUnitSuffix: "" });
        }
        return;
      }
      var suffix = item.gbDistributerGoodsEntity.gbDgGoodsStandardname || "";
      if (this.data.priceUnitSuffix !== suffix) {
        this.setData({ priceUnitSuffix: suffix });
      }
    },

    /**
     * 行小计：单价为基准规格价时，普通订货 = 单价×数量；外包装（件数×系数）= 单价×外包装件数×gbDoDsStandardScale。
     * 例：16.5 元/基准 × 2 箱 × 每箱 2 基准 = 66。
     */
    _lineSubtotal: function (price, weightStr, order) {
      var p = Number(price);
      var w = Number(weightStr);
      if (isNaN(p) || isNaN(w)) {
        return "";
      }
      var entity = this.data.item.gbDistributerGoodsEntity;
      if (order && entity && this._isOrderOuterPack(order, entity)) {
        var scale = Number(order.gbDoDsStandardScale);
        if (!isNaN(scale) && scale > 0) {
          return (p * w * scale).toFixed(1);
        }
      }
      return (p * w).toFixed(1);
    },

    // 获取订单列表，双路径兼容；顶层为 [] 时仍用嵌套（与 orderEntities.wxs 一致）
    _getOrders: function () {
      var item = this.data.item;
      if (!item) {
        return [];
      }
      var top = item.gbDepartmentOrdersEntities;
      var nested =
        item.gbDistributerGoodsEntity && item.gbDistributerGoodsEntity.gbDepartmentOrdersEntities;
      if (top && top.length > 0) {
        return top;
      }
      if (nested && nested.length > 0) {
        return nested;
      }
      return top || nested || [];
    },

    // 获取 setData 的 key 路径（与 _getOrders / wxs 选用数据源一致）
    _getOrderKey: function (index, field) {
      var item = this.data.item;
      var top = item.gbDepartmentOrdersEntities;
      var nested =
        item.gbDistributerGoodsEntity && item.gbDistributerGoodsEntity.gbDepartmentOrdersEntities;
      var useTop = top && top.length > 0;
      var prefix = useTop
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
          item: null,
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
          item: null,
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
        var scalePack = this.data.item.gbDpgBuyScale != null && this.data.item.gbDpgBuyScale !== "" && Number(this.data.item.gbDpgBuyScale) > 0;
        if (scalePack) {
          var sp = this.data.item.gbDpgBuyScalePrice;
          if (sp == null || sp === "" || !(Number(sp) > 0)) {
            wx.showToast({
              title: '请填写大包装单价',
              icon: 'none'
            });
            return;
          }
        } else {
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
        }
        var orderArr = this._getOrders();
        var useScaleQty = this.data.scaleInput || scalePack;
        for (var j = 0; j < orderArr.length; j++) {
          var choice = orderArr[j].hasChoice;
          if (choice) {
            if (useScaleQty) {
              var sw = orderArr[j].gbDoScaleWeight;
              if (sw == null || sw === "" || String(sw).length === 0) {
                wx.showToast({
                  title: '订单数量不能为空',
                  icon: 'none'
                });
                return;
              }
            } else {
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

        var itemPriceData = "item.gbDpgBuyPrice";
        var scale = this.data.item.gbDpgBuyScale;
        var nScale = Number(scale);
        var raw = Number(this.data.item.gbDpgBuyScalePrice) / nScale;
        var buyPrice = (!nScale || isNaN(raw)) ? "" : raw.toFixed(2);
        this.setData({
          [itemPriceData]: buyPrice
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
      var orderRow = this._getOrders()[index];
      if (orderWeighValue.length > 0) {
        var sub = (isNaN(price) || price === 0) ? "" : this._lineSubtotal(price, orderWeighValue, orderRow);
        console.log('[inputOrder] getOrderWeight - weightKey:', orderWeightData, 'weightValue:', orderWeighValue, 'subKey:', subData, 'sub:', sub, 'outerPack:', orderRow && this._isOrderOuterPack(orderRow, this.data.item.gbDistributerGoodsEntity));
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
          var newSub = (isNaN(price) || price === 0) ? "" : this._lineSubtotal(price, String(newWeight), orderRow);
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
          var newSub2 = (isNaN(price) || price === 0) ? "" : this._lineSubtotal(price, String(newWeight2), orderRow);
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
          [itemData]: resonStr,
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
        var clearRow = {};
        clearRow[orderPriceData] = "";
        clearRow[subData] = "";
        this.setData(clearRow);
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
        var clearRow = {};
        clearRow[orderPriceData] = "";
        clearRow[subData] = "";
        clearRow[sellingSubData] = "";
        this.setData(clearRow);
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
            var sub = this._lineSubtotal(price, String(weight), arr[i]);
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

    /** 大包装件数录入：写订单 gbDoScaleWeight；折算基准量 gbDoWeight = 件数×gbDoDsStandardScale */
    getScaleWeight: function (e) {
      var value = e.detail.value;
      var orderIndex = e.currentTarget.dataset.index;
      var orders = this._getOrders();
      var scale = orders[orderIndex] ? orders[orderIndex].gbDoDsStandardScale : 0;
      var orderWeight = Number(scale) * Number(value);

      var itemData = this._getOrderKey(orderIndex, "gbDoScaleWeight");
      var itemOrderData = this._getOrderKey(orderIndex, "gbDoWeight");
      var patch = { orderIndex: orderIndex };
      patch[itemData] = value;
      patch[itemOrderData] = isNaN(orderWeight) ? "" : orderWeight;
      this.setData(patch);

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

    /** 行小计：gbDoScaleWeight × gbDoScalePrice（大包装件数 × 大包装单价） */
    _getOrderSubtotalScale: function () {
      var arr = this._getOrders();
      for (var i = 0; i < arr.length; i++) {
        var subData = this._getOrderKey(i, "gbDoSubtotal");
        var weight = arr[i].gbDoScaleWeight;
        var price = arr[i].gbDoScalePrice;
        var raw = Number(weight) * Number(price);
        var subtotal = isNaN(raw) ? "" : raw.toFixed(1);
        var patch = {};
        patch[subData] = subtotal;
        this.setData(patch);
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

    /** 把采购基准单价、大包装单价同步到每条订单的 gbDoPrice、gbDoScalePrice */
    _countOrderPrice: function () {
      var doPrice = this.data.item.gbDpgBuyPrice;
      var scalePrice = this.data.item.gbDpgBuyScalePrice;
      var doPriceVal = doPrice === undefined || doPrice === null ? "" : doPrice;
      var scalePriceVal = scalePrice === undefined || scalePrice === null ? "" : scalePrice;
      var arr = this._getOrders();
      for (var i = 0; i < arr.length; i++) {
        var priceData = this._getOrderKey(i, "gbDoPrice");
        var scalePriceData = this._getOrderKey(i, "gbDoScalePrice");
        var patch = {};
        patch[priceData] = doPriceVal;
        patch[scalePriceData] = scalePriceVal;
        this.setData(patch);
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
