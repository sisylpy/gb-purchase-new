var globalData = getApp().globalData;
var load = require('../../../../lib/load.js');
var purGoodsApi = require('../../../../services/purGoodsApi.js');
var priceUtil = require('../../../../lib/purchasePriceUtil.js');
var orderGoodsScale = require('../../../../lib/orderGoodsScale.js');

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
  } else {
  }
}

function parseHistoryPrices(raw) {
  if (raw != null && typeof raw === "object") {
    return {
      base: priceUtil.normalizePurchasePrice(raw.buyPrice),
      scale: priceUtil.normalizePurchasePrice(raw.buyScalePrice),
    };
  }
  return {
    base: priceUtil.normalizePurchasePrice(raw),
    scale: "",
  };
}

Page({
  data: {
    orderListCount: -1,
    focusIndex: -1,
    foucusPrice: false,
    foucusWeight: false,
    /** 外包装：走 inputOrder 大包装单价 + gbDoScaleWeight 录入 */
    scaleInput: false,
    cartonInput: false,
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
      this.setData({
        disInfo: disInfo,
        disId: disInfo.gbDistributerId,
      });
    }
    var mendianInfo = wx.getStorageSync('mendianInfo');
    if (mendianInfo && mendianInfo.gbDepartmentId) {
      this.setData({
        depId: mendianInfo.gbDepartmentId,
        subDepAmount: mendianInfo.gbDepartmentSubAmount,
      });
    }

    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        userId: userInfo.gbDepartmentUserId,
      });
    }

    var purArr = wx.getStorageSync('purArr');
    if (purArr) {
      this.setData({
        purArr: purArr
      });

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
    }
  },

  /**
   * 弹层打开后短时保留 foucusWeight/foucusPrice 用于首帧自动聚焦，随后关掉。
   * 注意：不能在此处将 foucusWeight/foucusPrice 置为 false，
   * 否则正在输入的 input 会丢失焦点导致键盘关闭。
   * 微信小程序的 focus 属性在首次渲染 focus=true 后，input 获得焦点，
   * 之后 focus 变为 false 不会使 input 失焦（仅在未获得焦点时生效）。
   */

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
    var needScalePack = orderGoodsScale.isScalePurGoods(displayItem);
    logPurInput('分支', { needScalePack: needScalePack, goodsStandard: goodsStandard });

    var data = {
      disGoodsId: fullItem.gbDpgDisGoodsId,
      purDepId: this.data.depId,
    };

    var that = this;
    purGoodsApi.purUserGetPurGoodsInfo(data).then(function (res) {
      logPurInput('purUserGetPurGoodsInfo 返回', { code: res.result && res.result.code, data: res.result && res.result.data });
      var prices = parseHistoryPrices(res.result.data);
      var basePriceStr = prices.base;
      var scalePriceFromHistory = prices.scale;
      var hasHistoryPrice =
        priceUtil.hasValidPurchasePrice(basePriceStr) ||
        priceUtil.hasValidPurchasePrice(scalePriceFromHistory);
      logPurInput('purUserGetPurGoodsInfo 解析单价', {
        raw: res.result.data,
        basePriceStr: basePriceStr,
        scalePriceFromHistory: scalePriceFromHistory,
        hasHistoryPrice: hasHistoryPrice,
      });

      if (res.result.code == 0) {
        if (needScalePack) {
          var factor = orderGoodsScale.setupScalePackFields(displayItem, orderArr);
          var cartonInput = orderGoodsScale.isCartonOrderInput(displayItem, orderArr);
          var scalePriceStr = "";
          if (cartonInput) {
            if (priceUtil.hasValidPurchasePrice(scalePriceFromHistory)) {
              scalePriceStr = scalePriceFromHistory;
            } else if (priceUtil.hasValidPurchasePrice(basePriceStr) && factor > 0) {
              scalePriceStr = orderGoodsScale.formatScalePriceFromBasePrice(basePriceStr, factor);
            }
            displayItem.gbDpgBuyScalePrice = scalePriceStr;
            displayItem.gbDpgBuyPrice = priceUtil.hasValidPurchasePrice(basePriceStr) ? basePriceStr : "";
          } else {
            displayItem.gbDpgBuyScalePrice = "";
            displayItem.gbDpgBuyPrice = priceUtil.hasValidPurchasePrice(basePriceStr) ? basePriceStr : "";
          }

          var arrList = [];
          var buySubtotal = 0;
          var scaleQtyTotal = 0;
          var baseQtyTotal = 0;
          for (var i = 0; i < orderArr.length; i++) {
            var order = orderArr[i];
            if (cartonInput && priceUtil.hasValidPurchasePrice(scalePriceStr)) {
              orderGoodsScale.applyScalePriceToOrderFields(order, displayItem, scalePriceStr);
            } else if (!cartonInput && priceUtil.hasValidPurchasePrice(basePriceStr)) {
              order.gbDoPrice = basePriceStr;
              order.gbDoSubtotal = "";
            } else {
              order.gbDoSubtotal = "";
            }
            arrList.push(order);
            if (orderGoodsScale.isPositive(order.gbDoSubtotal)) {
              buySubtotal = Number(buySubtotal) + Number(order.gbDoSubtotal);
            }
            scaleQtyTotal = Number(scaleQtyTotal) + (Number(order.gbDoScaleWeight) || 0);
            baseQtyTotal = Number(baseQtyTotal) + (Number(order.gbDoWeight) || 0);
          }
          displayItem.gbDepartmentOrdersEntities = arrList;
          if (displayItem.gbDistributerGoodsEntity) {
            displayItem.gbDistributerGoodsEntity.gbDepartmentOrdersEntities = arrList;
          }
          displayItem.gbDpgBuyScaleQuantity = scaleQtyTotal ? String(scaleQtyTotal) : "";
          displayItem.gbDpgBuyQuantity = baseQtyTotal
            ? String(baseQtyTotal)
            : (scaleQtyTotal && factor > 0 ? String(Number(scaleQtyTotal) * factor) : "");
          displayItem.gbDpgBuySubtotal = buySubtotal > 0 ? buySubtotal.toFixed(1) : "";

          that.setData({
            item: displayItem,
            fullItem: fullItem,
            orderListCount: arrList.length,
            show: true,
            scaleInput: false,
            cartonInput: cartonInput,
            foucusWeight: hasHistoryPrice,
            foucusPrice: !hasHistoryPrice,
            canSave: buySubtotal > 0,
            windowHeight: that.data.windowHeight,
          });
        } else {
          displayItem.gbDpgBuyScale = 0;
          displayItem.gbDpgBuyScalePrice = "";
          displayItem.gbDpgBuyScaleQuantity = "";
          displayItem.gbDpgBuyPrice = basePriceStr;

          var buySubtotal = 0;
          var readyCount = 0;
          if (orderArr.length > 0) {
            var arrList2 = [];
            var dpgStd = displayItem.gbDpgStandard;
            for (var j = 0; j < orderArr.length; j++) {
              var row = orderArr[j];
              var isScaleOrder = orderGoodsScale.hasOrderStandardScale(row);
              var matchBaseUnit = row.gbDoStandard == goodsStandard;
              var matchPurchaseUnit =
                dpgStd != null &&
                dpgStd !== "" &&
                String(row.gbDoStandard) === String(dpgStd);
              if (matchBaseUnit || isScaleOrder || matchPurchaseUnit) {
                var ord = row;
                if (hasHistoryPrice && isScaleOrder) {
                  var orderScalePrice = orderGoodsScale.formatScalePriceFromBasePrice(
                    basePriceStr,
                    row.gbDoDsStandardScale
                  );
                  orderGoodsScale.applyScalePriceToOrderFields(ord, displayItem, orderScalePrice);
                  buySubtotal = Number(buySubtotal) + Number(ord.gbDoSubtotal || 0);
                  readyCount += 1;
                } else if (hasHistoryPrice) {
                  ord.gbDoPrice = basePriceStr;
                  ord.gbDoWeight = ord.gbDoQuantity;
                  ord.gbDoSubtotal = (Number(ord.gbDoQuantity) * Number(basePriceStr)).toFixed(1);
                  buySubtotal = Number(buySubtotal) + Number(ord.gbDoSubtotal);
                  readyCount += 1;
                } else {
                  ord.gbDoSubtotal = "";
                }
                arrList2.push(ord);
              }
            }
            displayItem.gbDepartmentOrdersEntities = arrList2;
            if (displayItem.gbDistributerGoodsEntity) {
              displayItem.gbDistributerGoodsEntity.gbDepartmentOrdersEntities = arrList2;
            }
          }
          displayItem.gbDpgBuySubtotal = hasHistoryPrice ? buySubtotal : "";
          var cnt2 =
            (displayItem.gbDepartmentOrdersEntities &&
              displayItem.gbDepartmentOrdersEntities.length) ||
            0;
          that.setData({
            item: displayItem,
            fullItem: fullItem,
            orderListCount: cnt2,
            show: true,
            scaleInput: false,
            cartonInput: false,
            foucusWeight: hasHistoryPrice,
            foucusPrice: !hasHistoryPrice,
            canSave: hasHistoryPrice && readyCount > 0,
            windowHeight: that.data.windowHeight,
          });
        }
      } else {
        if (needScalePack) {
          orderGoodsScale.setupScalePackFields(displayItem, orderArr);
        } else {
          displayItem.gbDpgBuyScale = 0;
          displayItem.gbDpgBuyScaleQuantity = "";
        }
        displayItem.gbDpgBuyPrice = "";
        displayItem.gbDpgBuyScalePrice = "";
        displayItem.gbDpgBuySubtotal = "";
        that.setData({
          item: displayItem,
          fullItem: fullItem,
          orderListCount: orderListCount,
          show: true,
          scaleInput: false,
          cartonInput: false,
          foucusWeight: false,
          foucusPrice: true,
          canSave: false,
          windowHeight: that.data.windowHeight,
        });
      }
    }).catch(function (err) {
      logPurInput('purUserGetPurGoodsInfo 请求异常', err);
    });
  },

  confirm: function (e) {
    var item = e.detail.item;

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
    this.setData({
      show: false,
      item: null,
      orderListCount: -1,
      scaleInput: false,
      cartonInput: false,
      foucusWeight: false,
      foucusPrice: false,
    });
  },

  /** inputOrder 非 confirm 关闭（组件 finish） */
  markGbPurGoodsFinish: function (e) {
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
