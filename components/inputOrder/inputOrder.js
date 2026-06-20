var priceUtil = require("../../lib/purchasePriceUtil.js");

Component({
  properties: {
    show: { type: Boolean, value: true },
    item: { type: Object, value: null },
    orderListCount: { type: Number, value: -1 },
    maskHeight: { type: Number, value: "" },
    windowHeight: { type: Number, value: "" },
    windowWidth: { type: Number, value: "" },
    scaleInput: { type: Boolean, value: false },
    scrollViewTop: { type: Number, value: "" },
    foucusWeight: { type: Boolean, value: false },
    foucusPrice: { type: Boolean, value: false },
    canSave: { type: Boolean, value: false },
    disInfo: { type: Object, value: "" },
  },

  data: {
    showReason: false,
    isClosing: false,
    priceUnitSuffix: "",
    subDepAmount: 0,
  },

  observers: {
    item: function (item) {
      this._refreshPriceUnitSuffix(item);
    },
  },

  lifetimes: {
    attached: function () {
      this._refreshPriceUnitSuffix(this.properties.item);
      var mendianInfo = wx.getStorageSync("mendianInfo");
      if (mendianInfo) {
        this.setData({ subDepAmount: mendianInfo.gbDepartmentSubAmount });
      }
    },
  },

  methods: {
    _getOrders: function () {
      var item = this.data.item;
      if (!item) {
        return [];
      }
      var top = item.gbDepartmentOrdersEntities;
      var nested =
        item.gbDistributerGoodsEntity &&
        item.gbDistributerGoodsEntity.gbDepartmentOrdersEntities;
      if (top && top.length > 0) {
        return top;
      }
      if (nested && nested.length > 0) {
        return nested;
      }
      return top || nested || [];
    },

    _getOrderKey: function (index, field) {
      var item = this.data.item;
      var top = item.gbDepartmentOrdersEntities;
      var nested =
        item.gbDistributerGoodsEntity &&
        item.gbDistributerGoodsEntity.gbDepartmentOrdersEntities;
      var useTop = top && top.length > 0;
      var prefix = useTop
        ? "item.gbDepartmentOrdersEntities[" + index + "]"
        : "item.gbDistributerGoodsEntity.gbDepartmentOrdersEntities[" + index + "]";
      return prefix + "." + field;
    },

    _isScalePackMode: function () {
      var scale = this.data.item && this.data.item.gbDpgBuyScale;
      return scale != null && scale !== "" && Number(scale) > 0;
    },

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

    /** 行小计：基准单价 × 数量；外包装订货再 × 换算系数 */
    _lineSubtotal: function (price, weightStr, order) {
      var p = Number(price);
      var w = Number(weightStr);
      if (isNaN(p) || isNaN(w) || p <= 0 || w <= 0) {
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

    _syncOrderPrices: function () {
      var doPrice = priceUtil.normalizePurchasePrice(this.data.item.gbDpgBuyPrice);
      var scalePrice = priceUtil.normalizePurchasePrice(this.data.item.gbDpgBuyScalePrice);
      var arr = this._getOrders();
      var patch = {};
      for (var i = 0; i < arr.length; i++) {
        patch[this._getOrderKey(i, "gbDoPrice")] = doPrice;
        patch[this._getOrderKey(i, "gbDoScalePrice")] = scalePrice;
      }
      if (Object.keys(patch).length > 0) {
        this.setData(patch);
      }
    },

    _recalcAllSubtotals: function () {
      if (this._isScalePackMode()) {
        this._recalcScaleSubtotals();
        return;
      }
      var price = Number(this.data.item.gbDpgBuyPrice);
      if (isNaN(price) || price <= 0) {
        this._clearAllSubtotals();
        return;
      }
      var arr = this._getOrders();
      var patch = {};
      for (var i = 0; i < arr.length; i++) {
        if (!arr[i].isNotice) {
          continue;
        }
        var weight = arr[i].gbDoWeight;
        patch[this._getOrderKey(i, "gbDoPrice")] = String(price);
        if (weight != null && weight !== "" && !isNaN(Number(weight))) {
          patch[this._getOrderKey(i, "gbDoSubtotal")] = this._lineSubtotal(
            price,
            String(weight),
            arr[i]
          );
        }
      }
      var that = this;
      if (Object.keys(patch).length > 0) {
        this.setData(patch, function () {
          that._recalcBuyTotal();
        });
      } else {
        this._recalcBuyTotal();
      }
    },

    _recalcScaleSubtotals: function () {
      var scalePrice = Number(this.data.item.gbDpgBuyScalePrice);
      var arr = this._getOrders();
      var patch = {};
      var scaleQtyTotal = 0;
      var baseQtyTotal = 0;
      var buyTotal = 0;

      for (var i = 0; i < arr.length; i++) {
        var sw = arr[i].gbDoScaleWeight;
        var bw = arr[i].gbDoWeight;
        scaleQtyTotal += Number(sw) || 0;
        baseQtyTotal += Number(bw) || 0;
        if (!isNaN(scalePrice) && scalePrice > 0 && sw != null && sw !== "") {
          var sub = (Number(sw) * scalePrice).toFixed(1);
          patch[this._getOrderKey(i, "gbDoSubtotal")] = sub;
          buyTotal += Number(sub);
        }
      }

      patch["item.gbDpgBuyScaleQuantity"] = scaleQtyTotal || "";
      patch["item.gbDpgBuyQuantity"] = baseQtyTotal || "";
      patch["item.gbDpgBuySubtotal"] =
        !isNaN(scalePrice) && scalePrice > 0 && scaleQtyTotal > 0
          ? buyTotal.toFixed(1)
          : "";
      patch["canSave"] =
        patch["item.gbDpgBuySubtotal"] !== "" && Number(patch["item.gbDpgBuySubtotal"]) > 0;

      this.setData(patch);
      this._syncOrderPrices();
    },

    _recalcBuyTotal: function () {
      var arr = this._getOrders();
      var total = 0;
      var weightTotal = 0;
      var hasSub = false;

      for (var i = 0; i < arr.length; i++) {
        if (!arr[i].isNotice) {
          continue;
        }
        var sub = arr[i].gbDoSubtotal;
        var wei = arr[i].gbDoWeight;
        if (sub !== null && sub !== "" && !isNaN(Number(sub))) {
          hasSub = true;
          weightTotal += Number(wei) || 0;
          total += Number(sub);
        }
      }

      this.setData({
        "item.gbDpgBuySubtotal": hasSub ? total.toFixed(1) : "",
        "item.gbDpgBuyQuantity": hasSub ? Number(weightTotal).toFixed(1) : "",
        canSave: hasSub && total > 0,
      });
    },

    _clearAllSubtotals: function () {
      var arr = this._getOrders();
      var patch = {
        "item.gbDpgBuySubtotal": "",
        canSave: false,
      };
      for (var i = 0; i < arr.length; i++) {
        patch[this._getOrderKey(i, "gbDoPrice")] = "";
        patch[this._getOrderKey(i, "gbDoSubtotal")] = "";
      }
      this.setData(patch);
    },

    closeWithAnimation: function () {
      this.setData({ isClosing: true });
      var that = this;
      setTimeout(function () {
        that.setData({
          show: false,
          showReason: false,
          scaleInput: false,
          isClosing: false,
        });
      }, 300);
    },

    clickMask: function () {
      this.closeWithAnimation();
    },

    cancle: function () {
      this.setData({ isClosing: true });
      var that = this;
      setTimeout(function () {
        that.setData({
          show: false,
          editApply: false,
          item: null,
          showReason: false,
          scaleInput: false,
          isClosing: false,
        });
        that.triggerEvent("cancle");
      }, 300);
    },

    finish: function () {
      this.setData({ isClosing: true });
      var that = this;
      setTimeout(function () {
        that.setData({
          show: false,
          editApply: false,
          item: null,
          showReason: false,
          scaleInput: false,
          isClosing: false,
        });
        that.triggerEvent("finish");
      }, 300);
    },

    confirm: function () {
      if (!this._validateBeforeConfirm()) {
        return;
      }
      this.triggerEvent("confirm", { item: this.data.item });
      this.setData({ isClosing: true });
      var that = this;
      setTimeout(function () {
        that.setData({
          show: false,
          showReason: false,
          scaleInput: false,
          isClosing: false,
        });
      }, 300);
    },

    _validateBeforeConfirm: function () {
      var scalePack = this._isScalePackMode();
      if (scalePack) {
        if (!priceUtil.hasValidPurchasePrice(this.data.item.gbDpgBuyScalePrice)) {
          wx.showToast({ title: "请填写大包装单价", icon: "none" });
          return false;
        }
      } else if (!priceUtil.hasValidPurchasePrice(this.data.item.gbDpgBuyPrice)) {
        wx.showToast({ title: "请填写单价", icon: "none" });
        return false;
      }

      if (!this._checkPriceAndReason()) {
        wx.showToast({ title: "请输入价格异常原因", icon: "none" });
        this.setData({ showReason: true });
        return false;
      }

      var orderArr = this._getOrders();
      var useScaleQty = this.data.scaleInput || scalePack;
      for (var j = 0; j < orderArr.length; j++) {
        if (!orderArr[j].hasChoice) {
          continue;
        }
        if (useScaleQty) {
          var sw = orderArr[j].gbDoScaleWeight;
          if (sw == null || sw === "" || String(sw).length === 0) {
            wx.showToast({ title: "订单数量不能为空", icon: "none" });
            return false;
          }
        } else {
          var orderWeight = orderArr[j].gbDoWeight;
          if (orderWeight == null || String(orderWeight).length === 0) {
            wx.showToast({ title: "订单重量不能为空", icon: "none" });
            return false;
          }
        }
      }
      return true;
    },

    getPurchasePrice: function (e) {
      var value = priceUtil.sanitizeDigitInput(e.detail.value, 1);
      if (value.length === 0) {
        this.setData({ "item.gbDpgBuyPrice": "" });
        this._clearAllSubtotals();
        return;
      }
      this.setData({ "item.gbDpgBuyPrice": value }, this._recalcAllSubtotals.bind(this));
    },

    getPurchasePriceScale: function (e) {
      var value = priceUtil.sanitizeDigitInput(e.detail.value, 1);
      if (value.length === 0) {
        this.setData({
          "item.gbDpgBuyScalePrice": "",
          "item.gbDpgBuyPrice": "",
        });
        this._clearAllSubtotals();
        return;
      }

      var scale = Number(this.data.item.gbDpgBuyScale);
      var basePrice =
        !scale || isNaN(scale) ? "" : (Number(value) / scale).toFixed(2);

      this.setData(
        {
          "item.gbDpgBuyScalePrice": value,
          "item.gbDpgBuyPrice": basePrice,
        },
        this._recalcScaleSubtotals.bind(this)
      );
    },

    getOrderWeight: function (e) {
      var index = e.currentTarget.dataset.index;
      var price = Number(this.data.item.gbDpgBuyPrice);
      var orderRow = this._getOrders()[index];
      var value = priceUtil.sanitizeDigitInput(e.detail.value, 1);

      var orderWeightData = this._getOrderKey(index, "gbDoWeight");
      var orderPriceData = this._getOrderKey(index, "gbDoPrice");
      var subData = this._getOrderKey(index, "gbDoSubtotal");

      if (value.length === 0) {
        var clearPatch = {};
        clearPatch[orderWeightData] = "";
        clearPatch[subData] = "";
        this.setData(clearPatch, this._recalcBuyTotal.bind(this));
        return;
      }

      var sub =
        isNaN(price) || price <= 0
          ? ""
          : this._lineSubtotal(price, value, orderRow);
      var patch = {};
      patch[orderWeightData] = value;
      patch[orderPriceData] = isNaN(price) || price <= 0 ? "" : String(price);
      patch[subData] = sub;
      this.setData(patch, this._recalcBuyTotal.bind(this));
    },

    getScaleWeight: function (e) {
      var value = priceUtil.sanitizeDigitInput(e.detail.value, 1);
      var orderIndex = e.currentTarget.dataset.index;
      var orders = this._getOrders();
      var scale = orders[orderIndex] ? Number(orders[orderIndex].gbDoDsStandardScale) : 0;
      var baseWeight =
        value.length === 0 || isNaN(scale) || scale <= 0
          ? ""
          : String(Number(value) * scale);

      var patch = {};
      patch[this._getOrderKey(orderIndex, "gbDoScaleWeight")] = value;
      patch[this._getOrderKey(orderIndex, "gbDoWeight")] = baseWeight;
      this.setData(patch, this._recalcScaleSubtotals.bind(this));
    },

    _checkPrice: function () {
      var item = this.data.item;
      if (
        !item ||
        !item.gbDistributerGoodsEntity ||
        item.gbDistributerGoodsEntity.gbDgControlPrice != 1
      ) {
        return;
      }
      var price = Number(item.gbDpgBuyPrice);
      if (isNaN(price) || price <= 0) {
        this.setData({ showReason: false });
        return;
      }
      var entity = item.gbDistributerGoodsEntity;
      var outOfRange =
        price < Number(entity.gbDgGoodsLowestPrice) ||
        price > Number(entity.gbDgGoodsHighestPrice);
      this.setData({ showReason: outOfRange });
    },

    getPurchasePriceReason: function (e) {
      var text = e.detail.value;
      if (text.length > 0 && text.length < 20) {
        this.setData({ "item.gbDpgBuyPriceReason": text });
      } else if (text.length >= 20) {
        wx.showToast({ title: "内容在20个汉字", icon: "none" });
      }
    },

    _checkPriceAndReason: function () {
      var item = this.data.item;
      if (
        !item ||
        !item.gbDistributerGoodsEntity ||
        item.gbDistributerGoodsEntity.gbDgControlPrice != 1
      ) {
        return true;
      }
      var price = Number(item.gbDpgBuyPrice);
      if (isNaN(price) || price <= 0) {
        return true;
      }
      var entity = item.gbDistributerGoodsEntity;
      var outOfRange =
        price < Number(entity.gbDgGoodsLowestPrice) ||
        price > Number(entity.gbDgGoodsHighestPrice);
      if (!outOfRange) {
        return true;
      }
      var reason = item.gbDpgBuyPriceReason;
      return reason != null && String(reason).length > 0;
    },
  },
});
