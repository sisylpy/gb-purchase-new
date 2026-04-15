var globalData = getApp().globalData;
var load = require('../../../../lib/load.js');
// 接口清单：purUserGetPurGoodsInfo、finishPurGoodsToStock
var apiDistributer = require('../../../../services/apiDistributer');
var request = require('../../../../lib/request.js');

Page({
  data: {
    focusIndex: -1,
    foucusPrice: false,
    foucusWeight: false,
  },

  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: request.server,
    });

    var disInfo = wx.getStorageSync('disInfo');
    if (disInfo) {
      this.setData({
        disInfo: disInfo,
        disId: disInfo.gbDistributerId,
        depId: disInfo.purDepartmentList && disInfo.purDepartmentList.length > 0 ? disInfo.purDepartmentList[0].gbDepartmentId : disInfo.gbDepartmentId,
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
          var filteredOrders = ordersPath.filter(function (order) {
            return order.isNotice === true;
          });
          if (displayItem.gbDepartmentOrdersEntities) {
            displayItem.gbDepartmentOrdersEntities = filteredOrders;
          } else if (displayItem.gbDistributerGoodsEntity) {
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

  showInputOrder: function (e) {
    console.log(e);
    var item = e.currentTarget.dataset.item;

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
    if (ordersPath) {
      var filteredOrders = ordersPath.filter(function (order) {
        return order.isNotice === true;
      });
      filteredOrders.forEach(function (order) {
        order.hasChoice = order.isNotice;
      });
      if (displayItem.gbDepartmentOrdersEntities) {
        displayItem.gbDepartmentOrdersEntities = filteredOrders;
      } else if (displayItem.gbDistributerGoodsEntity) {
        displayItem.gbDistributerGoodsEntity.gbDepartmentOrdersEntities = filteredOrders;
      }
    }

    var data = {
      purUserId: this.data.userId,
      disGoodsId: fullItem.gbDpgDisGoodsId,
    };

    var that = this;
    apiDistributer.purUserGetPurGoodsInfo(data).then(function (res) {
      console.log("purUserGetPurGoodsInfo res", res.result.data);
      if (res.result.code == 0) {
        displayItem.gbDpgBuyPrice = res.result.data;
        var orderArr = displayItem.gbDepartmentOrdersEntities || (displayItem.gbDistributerGoodsEntity && displayItem.gbDistributerGoodsEntity.gbDepartmentOrdersEntities) || [];
        var goodsStandard = displayItem.gbDistributerGoodsEntity ? displayItem.gbDistributerGoodsEntity.gbDgGoodsStandardname : '';
        var hasPriceCount = 0;
        var buySubtotal = 0;
        if (orderArr.length > 0) {
          var arrList = [];
          for (var i = 0; i < orderArr.length; i++) {
            if (orderArr[i].gbDoStandard == goodsStandard) {
              var order = orderArr[i];
              order.gbDoPrice = res.result.data;
              order.gbDoWeight = order.gbDoQuantity;
              var subtotal = (Number(order.gbDoQuantity) * Number(res.result.data)).toFixed(1);
              order.gbDoSubtotal = subtotal;
              arrList.push(order);
              hasPriceCount += 1;
              buySubtotal = Number(buySubtotal) + Number(subtotal);
            }
          }
        }
        if (displayItem.gbDepartmentOrdersEntities) {
          displayItem.gbDepartmentOrdersEntities = arrList;
        } else if (displayItem.gbDistributerGoodsEntity) {
          displayItem.gbDistributerGoodsEntity.gbDepartmentOrdersEntities = arrList;
        }
        displayItem.gbDpgBuySubtotal = buySubtotal;
        that.setData({
          item: displayItem,
          fullItem: fullItem,
          show: true,
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
      } else {
        that.setData({
          item: displayItem,
          fullItem: fullItem,
          show: true,
          foucusWeight: false,
          foucusPrice: true,
          canSave: false,
          windowHeight: that.data.windowHeight,
        });
      }
    });
  },

  confirm: function (e) {
    var fullItem = this.data.fullItem || e.detail.item;
    var item = e.detail.item;

    var fullOrders = fullItem.gbDepartmentOrdersEntities || (fullItem.gbDistributerGoodsEntity && fullItem.gbDistributerGoodsEntity.gbDepartmentOrdersEntities) || [];
    var displayOrders = item.gbDepartmentOrdersEntities || (item.gbDistributerGoodsEntity && item.gbDistributerGoodsEntity.gbDepartmentOrdersEntities) || [];

    if (fullOrders.length > 0) {
      fullItem.gbDpgBuyPrice = item.gbDpgBuyPrice;
      fullItem.gbDpgBuySubtotal = item.gbDpgBuySubtotal;
      fullItem.gbDpgBuyQuantity = item.gbDpgBuyQuantity;

      fullOrders.forEach(function (order) {
        order.hasChoice = order.isNotice;
      });

      for (var i = 0; i < fullOrders.length; i++) {
        for (var j = 0; j < displayOrders.length; j++) {
          if (fullOrders[i].gbDepartmentOrdersId === displayOrders[j].gbDepartmentOrdersId) {
            fullOrders[i].gbDoPrice = displayOrders[j].gbDoPrice;
            fullOrders[i].gbDoWeight = displayOrders[j].gbDoWeight;
            fullOrders[i].gbDoSubtotal = displayOrders[j].gbDoSubtotal;
            break;
          }
        }
      }
    }

    fullItem.gbDpgPurUserId = this.data.userInfo.gbDepartmentUserId;
    fullItem.gbDpgPurchaseDepartmentId = this.data.userInfo.gbDuDepartmentId;

    var that = this;
    load.showLoading("保存数据");
    apiDistributer.finishPurGoodsToStock(fullItem).then(function (res) {
      load.hideLoading();
      if (res.result.code == 0) {
        that.setData({ show: false });
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
      item: ""
    });
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
