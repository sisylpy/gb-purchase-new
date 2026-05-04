var globalData = getApp().globalData;
var load = require('../../../../lib/load.js');
var purGoodsApi = require('../../../services/purGoodsApi.js');

/** 用户选中的待采订单：兼容接口返回 true / 1 */
function isNoticeSelected(order) {
  return order.isNotice === true || order.isNotice === 1 || order.isNotice === '1';
}

/** 设为 false 可关闭录入弹层相关 console */
var DEBUG_PUR_INPUT_ORDER = true;

function logPurInput(msg, payload) {
  if (!DEBUG_PUR_INPUT_ORDER) {
    return;
  }
  if (payload !== undefined) {
    console.log('[purGoods inputOrder]', msg, payload);
  } else {
    console.log('[purGoods inputOrder]', msg);
  }
}

Page({
  data: {
    orderListCount: -1,
    focusIndex: -1,
    foucusPrice: false,
    foucusWeight: false,
    /** 外包装：走 inputOrder 大包装单价 + gbDoScaleWeight 录入 */
    scaleInput: false,
    show: false,
    item: null,
    fullItem: null,
    disInfo: null,
    canSave: false,
    maskHeight: 0,
    scrollViewTop: 0,
    windowWidth: 0,
    windowHeight: 0,
  },

  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: purGoodsApi.server,
    });

    var disInfo = wx.getStorageSync('disInfo');
    if (disInfo) {
      var depPatch = {
        disInfo: disInfo,
        disId: disInfo.gbDistributerId,
      };
      var depIdVal =
        disInfo.mendianDepartmentList && disInfo.mendianDepartmentList.length > 0
          ? disInfo.mendianDepartmentList[0].gbDepartmentId
          : disInfo.gbDepartmentId;
      if (depIdVal !== undefined && depIdVal !== null && depIdVal !== '') {
        depPatch.depId = depIdVal;
      }
      this.setData(depPatch);
    }

    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        userId: userInfo.gbDepartmentUserId,
      });
    }

    var purArr = wx.getStorageSync('purArr');
    console.log('[purGoods onLoad] purArr from storage:', purArr);
    if (purArr) {
      this.setData({
        purArr: purArr
      });
      console.log('[purGoods onLoad] purArr length:', purArr.length);

      // 创建显示用的数据，只显示被选中的订单
      var displayPurArr = purArr.map(function (item) {
        var displayItem = JSON.parse(JSON.stringify(item));
        // 新系统中 gbDepartmentOrdersEntities 在顶层，尝试两种路径
        var ordersPath = displayItem.gbDepartmentOrdersEntities;
        if (!ordersPath && displayItem.gbDistributerGoodsEntity) {
          ordersPath = displayItem.gbDistributerGoodsEntity.gbDepartmentOrdersEntities;
        }
        if (ordersPath) {
          var filteredOrders = ordersPath.filter(isNoticeSelected);
          displayItem.gbDepartmentOrdersEntities = filteredOrders;
          if (displayItem.gbDistributerGoodsEntity) {
            displayItem.gbDistributerGoodsEntity.gbDepartmentOrdersEntities = filteredOrders;
          }
        }
        return displayItem;
      });

      displayPurArr = displayPurArr.filter(function (item) {
        var ordersPath = item.gbDepartmentOrdersEntities;
        if (!ordersPath && item.gbDistributerGoodsEntity) {
          ordersPath = item.gbDistributerGoodsEntity.gbDepartmentOrdersEntities;
        }
        return ordersPath && ordersPath.length > 0;
      });

      this.setData({
        displayPurArr: displayPurArr
      });
      console.log('[purGoods onLoad] displayPurArr length:', displayPurArr.length);
      console.log('[purGoods onLoad] displayPurArr:', displayPurArr);
    }
  },

  /**
   * 弹层打开后短时保留 foucusWeight/foucusPrice 用于首帧自动聚焦，随后关掉，
   * 避免 quantity 的 focus 一直为 true 与单价输入抢焦点。
   */
  _scheduleResetInputOrderFocus: function () {
    var that = this;
    if (this._inputOrderFocusTimer) {
      clearTimeout(this._inputOrderFocusTimer);
    }
    this._inputOrderFocusTimer = setTimeout(function () {
      that._inputOrderFocusTimer = null;
      if (!that.data.show) {
        return;
      }
      that.setData({
        foucusWeight: false,
        foucusPrice: false,
      });
    }, 400);
  },

  showInputOrder: function (e) {
    var item = e.currentTarget.dataset.item;
    logPurInput('tap dataset.item', {
      gbDistributerPurchaseGoodsId: item && item.gbDistributerPurchaseGoodsId,
      hasTopOrders: !!(item && item.gbDepartmentOrdersEntities && item.gbDepartmentOrdersEntities.length),
      hasNestedOrders: !!(
        item &&
        item.gbDistributerGoodsEntity &&
        item.gbDistributerGoodsEntity.gbDepartmentOrdersEntities &&
        item.gbDistributerGoodsEntity.gbDepartmentOrdersEntities.length
      ),
    });

    // 从原始数据中找到对应的完整商品数据
    var originalItem = null;
    if (this.data.purArr) {
      originalItem = this.data.purArr.find(function (original) {
        return original.gbDistributerPurchaseGoodsId === item.gbDistributerPurchaseGoodsId;
      });
    }

    var fullItem = originalItem || item;

    // 创建显示用的数据，过滤掉未选择的订单
    var displayItem = JSON.parse(JSON.stringify(fullItem));
    var ordersPath = displayItem.gbDepartmentOrdersEntities;
    if (!ordersPath && displayItem.gbDistributerGoodsEntity) {
      ordersPath = displayItem.gbDistributerGoodsEntity.gbDepartmentOrdersEntities;
    }
    logPurInput('ordersPath 原始条数', ordersPath ? ordersPath.length : 0);
    if (ordersPath && ordersPath.length) {
      logPurInput(
        '前两条 isNotice 样例',
        ordersPath.slice(0, 2).map(function (o) {
          return { gbDepartmentOrdersId: o.gbDepartmentOrdersId, isNotice: o.isNotice };
        })
      );
    }
    if (ordersPath) {
      var filteredOrders = ordersPath.filter(isNoticeSelected);
      logPurInput('filter(isNotice) 后条数', filteredOrders.length);
      filteredOrders.forEach(function (order) {
        order.hasChoice = !!isNoticeSelected(order);
      });
      displayItem.gbDepartmentOrdersEntities = filteredOrders;
      if (displayItem.gbDistributerGoodsEntity) {
        displayItem.gbDistributerGoodsEntity.gbDepartmentOrdersEntities = filteredOrders;
      }
    }

    var orderArr = displayItem.gbDepartmentOrdersEntities || (displayItem.gbDistributerGoodsEntity && displayItem.gbDistributerGoodsEntity.gbDepartmentOrdersEntities) || [];
    var orderListCount = orderArr.length;
    logPurInput('orderArr 用于弹层/询价', { length: orderArr.length, orderListCount: orderListCount });
    var goodsStandard = displayItem.gbDistributerGoodsEntity ? displayItem.gbDistributerGoodsEntity.gbDgGoodsStandardname : "";

    function rowIsOuterPack(row) {
      var scale = row.gbDoDsStandardScale;
      var scaleNum = Number(scale);
      return scale != null && scale !== "" && String(scale) !== "-1" && !isNaN(scaleNum) && scaleNum > 0 && row.gbDoStandard && row.gbDoStandard !== goodsStandard;
    }

    var needScalePack = orderArr.length > 0 && orderArr.every(rowIsOuterPack);
    var scalePackMeta = null;
    if (needScalePack) {
      var r0 = orderArr[0];
      scalePackMeta = {
        scale: Number(r0.gbDoDsStandardScale),
        standard: r0.gbDoStandard,
      };
    }
    logPurInput('分支', { needScalePack: needScalePack, goodsStandard: goodsStandard, scalePackMeta: scalePackMeta });

    var data = {
      purUserId: this.data.userId,
      disGoodsId: fullItem.gbDpgDisGoodsId,
    };

    var that = this;
    purGoodsApi.purUserGetPurGoodsInfo(data).then(function (res) {
      logPurInput('purUserGetPurGoodsInfo 返回', { code: res.result && res.result.code, data: res.result && res.result.data });
      if (res.result.code == 0) {
        var basePriceStr = res.result.data;
        var basePrice = Number(basePriceStr);

        if (needScalePack && scalePackMeta) {
          var sn = scalePackMeta.scale;
          displayItem.gbDpgBuyScale = String(sn);
          displayItem.gbDpgStandard = scalePackMeta.standard;
          displayItem.gbDpgBuyPrice = basePriceStr;
          displayItem.gbDpgBuyScalePrice = isNaN(basePrice) ? "" : (basePrice * sn).toFixed(2);

          var arrList = [];
          var buySubtotal = 0;
          var scaleQtyTotal = 0;
          for (var i = 0; i < orderArr.length; i++) {
            var order = orderArr[i];
            order.gbDoPrice = basePriceStr;
            order.gbDoScalePrice = displayItem.gbDpgBuyScalePrice;
            order.gbDoScaleWeight = String(order.gbDoQuantity);
            order.gbDoWeight = String(Number(order.gbDoQuantity) * sn);
            var subOne = (Number(order.gbDoScaleWeight) * Number(order.gbDoScalePrice)).toFixed(1);
            order.gbDoSubtotal = subOne;
            arrList.push(order);
            buySubtotal = Number(buySubtotal) + Number(subOne);
            scaleQtyTotal = Number(scaleQtyTotal) + Number(order.gbDoScaleWeight);
          }
          displayItem.gbDepartmentOrdersEntities = arrList;
          if (displayItem.gbDistributerGoodsEntity) {
            displayItem.gbDistributerGoodsEntity.gbDepartmentOrdersEntities = arrList;
          }
          displayItem.gbDpgBuyScaleQuantity = String(scaleQtyTotal);
          displayItem.gbDpgBuySubtotal = buySubtotal.toFixed(1);
          displayItem.gbDpgBuyQuantity = String(Number(scaleQtyTotal) * sn);

          logPurInput('setData(大包装)', { orderListCount: arrList.length, gbDepartmentOrdersEntitiesLen: displayItem.gbDepartmentOrdersEntities && displayItem.gbDepartmentOrdersEntities.length });
          that.setData({
            item: displayItem,
            fullItem: fullItem,
            orderListCount: arrList.length,
            show: true,
            scaleInput: true,
            foucusWeight: true,
            foucusPrice: false,
            canSave: true,
            windowHeight: that.data.windowHeight,
          });
          that._scheduleResetInputOrderFocus();
        } else {
          displayItem.gbDpgBuyScale = 0;
          displayItem.gbDpgBuyScalePrice = "";
          displayItem.gbDpgBuyScaleQuantity = "";

          displayItem.gbDpgBuyPrice = basePriceStr;
          var hasPriceCount = 0;
          var buySubtotal = 0;
          if (orderArr.length > 0) {
            var arrList2 = [];
            var dpgStd = displayItem.gbDpgStandard;
            for (var j = 0; j < orderArr.length; j++) {
              var row = orderArr[j];
              var scale = row.gbDoDsStandardScale;
              var scaleNum = Number(scale);
              var isOuterPack = rowIsOuterPack(row);
              /* 订单单位可与商品基准单位不同（如 箱 vs 桶）；scale 为 -1 时 isOuterPack 为 false。
                 若订货单位与自采单行 gbDpgStandard 一致（如均为「箱」），仍应录入该行。 */
              var matchBaseUnit = row.gbDoStandard == goodsStandard;
              var matchPurchaseUnit =
                dpgStd != null &&
                dpgStd !== '' &&
                String(row.gbDoStandard) === String(dpgStd);
              if (matchBaseUnit || isOuterPack || matchPurchaseUnit) {
                var ord = row;
                ord.gbDoPrice = basePriceStr;
                ord.gbDoWeight = ord.gbDoQuantity;
                var subtotal = isOuterPack
                  ? (Number(ord.gbDoQuantity) * Number(basePriceStr) * scaleNum).toFixed(1)
                  : (Number(ord.gbDoQuantity) * Number(basePriceStr)).toFixed(1);
                ord.gbDoSubtotal = subtotal;
                arrList2.push(ord);
                hasPriceCount += 1;
                buySubtotal = Number(buySubtotal) + Number(subtotal);
              }
            }
            displayItem.gbDepartmentOrdersEntities = arrList2;
            if (displayItem.gbDistributerGoodsEntity) {
              displayItem.gbDistributerGoodsEntity.gbDepartmentOrdersEntities = arrList2;
            }
            logPurInput('普通订货 过滤结果', {
              orderArrLen: orderArr.length,
              arrList2Len: arrList2.length,
              hasPriceCount: hasPriceCount,
              hint:
                orderArr.length > 0 && arrList2.length === 0
                  ? '订单行未满足基准单位/外包装/与 gbDpgStandard 一致，已全部被跳过，弹层将 0 条'
                  : '',
            });
          }
          displayItem.gbDpgBuySubtotal = buySubtotal;
          var cnt2 = (displayItem.gbDepartmentOrdersEntities && displayItem.gbDepartmentOrdersEntities.length) || 0;
          logPurInput('setData(普通)', { orderListCount: cnt2, cnt2: cnt2 });
          that.setData({
            item: displayItem,
            fullItem: fullItem,
            orderListCount: cnt2,
            show: true,
            scaleInput: false,
            foucusWeight: true,
            foucusPrice: false,
            windowHeight: that.data.windowHeight,
          });
          var finalOrders = displayItem.gbDepartmentOrdersEntities || (displayItem.gbDistributerGoodsEntity && displayItem.gbDistributerGoodsEntity.gbDepartmentOrdersEntities) || [];
          if (hasPriceCount == finalOrders.length) {
            that.setData({ canSave: true });
          } else {
            that.setData({ canSave: false });
          }
          that._scheduleResetInputOrderFocus();
        }
      } else {
        if (needScalePack && scalePackMeta) {
          displayItem.gbDpgBuyScale = String(scalePackMeta.scale);
          displayItem.gbDpgStandard = scalePackMeta.standard;
          displayItem.gbDpgBuyScalePrice = "";
          displayItem.gbDpgBuyPrice = "";
        } else {
          displayItem.gbDpgBuyScale = 0;
          displayItem.gbDpgBuyScalePrice = "";
          displayItem.gbDpgBuyScaleQuantity = "";
        }
        logPurInput('询价失败或非0，仍打开弹层', { orderListCount: orderListCount, code: res.result && res.result.code });
        that.setData({
          item: displayItem,
          fullItem: fullItem,
          orderListCount: orderListCount,
          show: true,
          scaleInput: !!(needScalePack && scalePackMeta),
          foucusWeight: !(needScalePack && scalePackMeta),
          foucusPrice: !!(needScalePack && scalePackMeta),
          canSave: false,
          windowHeight: that.data.windowHeight,
        });
        that._scheduleResetInputOrderFocus();
      }
    }).catch(function (err) {
      logPurInput('purUserGetPurGoodsInfo 请求异常', err);
    });
  },

  confirm: function (e) {
    var item = e.detail.item;
    var orderSnap = item.gbDepartmentOrdersEntities || (item.gbDistributerGoodsEntity && item.gbDistributerGoodsEntity.gbDepartmentOrdersEntities) || [];
    console.log('[purGoods inputOrder confirm] 自采单价 gbDpgBuyPrice:', item.gbDpgBuyPrice, '| gbDpgBuySubtotal:', item.gbDpgBuySubtotal, '| gbDpgBuyQuantity:', item.gbDpgBuyQuantity);
    console.log('[purGoods inputOrder confirm] 订单明细 (gbDoWeight 基准数量; gbDoScaleWeight/gbDoScalePrice 大包装件数/单价):', orderSnap.map(function (o) {
      return {
        gbDepartmentOrdersId: o.gbDepartmentOrdersId,
        hasChoice: o.hasChoice,
        gbDoWeight: o.gbDoWeight,
        gbDoPrice: o.gbDoPrice,
        gbDoSubtotal: o.gbDoSubtotal,
        gbDoQuantity: o.gbDoQuantity,
        gbDoStandard: o.gbDoStandard,
        gbDoScaleWeight: o.gbDoScaleWeight,
        gbDoScalePrice: o.gbDoScalePrice,
      };
    }));

    var fullItem = this.data.fullItem || e.detail.item;

    var fullOrders = fullItem.gbDepartmentOrdersEntities || (fullItem.gbDistributerGoodsEntity && fullItem.gbDistributerGoodsEntity.gbDepartmentOrdersEntities) || [];
    var displayOrders = item.gbDepartmentOrdersEntities || (item.gbDistributerGoodsEntity && item.gbDistributerGoodsEntity.gbDepartmentOrdersEntities) || [];

    if (fullOrders.length > 0) {
      fullItem.gbDpgBuyPrice = item.gbDpgBuyPrice;
      fullItem.gbDpgBuySubtotal = item.gbDpgBuySubtotal;
      fullItem.gbDpgBuyQuantity = item.gbDpgBuyQuantity;
      if (item.gbDpgBuyScale != null && String(item.gbDpgBuyScale) !== "" && Number(item.gbDpgBuyScale) > 0) {
        fullItem.gbDpgBuyScale = item.gbDpgBuyScale;
        fullItem.gbDpgBuyScalePrice = item.gbDpgBuyScalePrice;
        fullItem.gbDpgBuyScaleQuantity = item.gbDpgBuyScaleQuantity;
        fullItem.gbDpgStandard = item.gbDpgStandard;
      }

      fullOrders.forEach(function (order) {
        order.hasChoice = order.isNotice;
      });

      for (var i = 0; i < fullOrders.length; i++) {
        for (var j = 0; j < displayOrders.length; j++) {
          if (fullOrders[i].gbDepartmentOrdersId === displayOrders[j].gbDepartmentOrdersId) {
            fullOrders[i].gbDoPrice = displayOrders[j].gbDoPrice;
            fullOrders[i].gbDoWeight = displayOrders[j].gbDoWeight;
            fullOrders[i].gbDoSubtotal = displayOrders[j].gbDoSubtotal;
            // 订单大包装：gbDoScaleWeight 大包装件数，gbDoScalePrice 大包装单价（元/件外包装）
            var sw = displayOrders[j].gbDoScaleWeight;
            var sp = displayOrders[j].gbDoScalePrice;
            fullOrders[i].gbDoScaleWeight = sw != null && sw !== undefined ? String(sw) : "";
            fullOrders[i].gbDoScalePrice = sp != null && sp !== undefined ? String(sp) : "";
            break;
          }
        }
      }
    }

    fullItem.gbDpgPurUserId = this.data.userInfo.gbDepartmentUserId;
    fullItem.gbDpgPurchaseDepartmentId = this.data.userInfo.gbDuDepartmentId;

    var that = this;
    load.showLoading("保存数据");
    purGoodsApi.finishPurGoodsToStock(fullItem).then(function (res) {
      load.hideLoading();
      if (res.result.code == 0) {
        that.setData({ show: false, scaleInput: false });
        that._updateArr();
      }
    });
  },

  _updateArr: function () {
    var arr = this.data.purArr;
    var item = this.data.item;
    if (arr.length > 0) {
      arr = arr.filter(function (obj) {
        return obj.gbDistributerPurchaseGoodsId !== item.gbDistributerPurchaseGoodsId;
      });
      this.setData({ purArr: arr });

      var displayArr = this.data.displayPurArr;
      if (displayArr.length > 0) {
        displayArr = displayArr.filter(function (obj) {
          return obj.gbDistributerPurchaseGoodsId !== item.gbDistributerPurchaseGoodsId;
        });
        this.setData({ displayPurArr: displayArr });
      }
    }
  },

  cancle: function () {
    console.log('[purGoods inputOrder cancle] 取消录入');
    if (this._inputOrderFocusTimer) {
      clearTimeout(this._inputOrderFocusTimer);
      this._inputOrderFocusTimer = null;
    }
    this.setData({
      show: false,
      item: null,
      orderListCount: -1,
      scaleInput: false,
      foucusWeight: false,
      foucusPrice: false,
    });
  },

  /** inputOrder 非 confirm 关闭（组件 finish） */
  markGbPurGoodsFinish: function (e) {
    console.log('[purGoods inputOrder finish] 弹层关闭', e && e.detail);
  },

  toBack: function () {
    wx.navigateBack({
      delta: 1
    });
  },

  onUnload: function () {
    wx.removeStorageSync('purArr');
  }
});
