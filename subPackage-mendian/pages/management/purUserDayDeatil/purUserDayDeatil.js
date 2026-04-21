var globalData = getApp().globalData;
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil');
var apiUrl = require('../../../../config/index.js');
var apiDistributer = require('../../../../services/apiDistributer');

Page({

  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      date: options.date,
      value: options.value,
      purUserId: options.purUserId
    });

    var purUserItem = wx.getStorageSync('purUserItem');
    if (purUserItem) {
      this.setData({
        purUserItem: purUserItem
      });
    }
    this._initData();
  },

  _initData: function () {
    var _this = this;
    var data = {
      purUserId: this.data.purUserId,
      startDate: this.data.date,
      stopDate: this.data.date,
    };

    load.showLoading("获取数据中");
    apiDistributer.getPurchaseUserGoods(data)
      .then(function (res) {
        if (res.result.code == 0) {
          load.hideLoading();
          _this.setData({
            arr: res.result.data,
          });
        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg || '获取数据失败',
            icon: 'none'
          });
        }
      })
      .catch(function (error) {
        load.hideLoading();
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      });
  },

  showDetail: function (e) {
    const goodsIndex = e.currentTarget.dataset.goodsIndex;
    const purIndex = e.currentTarget.dataset.purIndex;

    const newArr = [...this.data.arr];
    newArr[goodsIndex].wastePurGoodsEntities[purIndex].expanded = !newArr[goodsIndex].wastePurGoodsEntities[purIndex].expanded;

    this.setData({
      arr: newArr
    });
  },

  showList: function (e) {
    const goodsIndex = e.currentTarget.dataset.index;
    const newArr = [...this.data.arr];
    newArr[goodsIndex].showPurchaseList = !newArr[goodsIndex].showPurchaseList;
    this.setData({
      arr: newArr
    });
  },

  checkAndCloseOverflowOnScroll: function () {
    const newArr = [...this.data.arr];
    const expandedGoods = newArr.filter(function (goods, index) {
      return goods.showPurchaseList;
    });

    if (expandedGoods.length === 0) {
      return;
    }

    var _this = this;
    expandedGoods.forEach(function (goods, goodsIndex) {
      const actualIndex = newArr.findIndex(function (item) {
        return item === goods;
      });

      if (goods.showPurchaseList) {
        setTimeout(function () {
          var query = wx.createSelectorQuery();
          query.select('#goods-container-' + actualIndex).boundingClientRect();
          query.selectViewport().scrollOffset();

          query.exec(function (res) {
            if (res[0] && res[1]) {
              var containerRect = res[0];
              var viewportHeight = wx.getWindowInfo().windowHeight;

              var isTopOut = containerRect.top < 0;
              var isBottomOut = containerRect.bottom > viewportHeight;

              if (isTopOut || isBottomOut) {
                var newArr = [..._this.data.arr];
                newArr[actualIndex].showPurchaseList = false;
                _this.setData({
                  arr: newArr
                });
              }
            }
          });
        }, 100);
      }
    });
  },

  toBack: function () {
    wx.navigateBack({
      delta: 1,
    });
  },

  toFilter: function () {
    wx.setStorageSync('supplierList', this.data.supplierList);
    wx.navigateTo({
      url: '../../sel/filterData/filterData',
    });
  },

  onScroll: function (event) {
    var scrollTop = event.detail.scrollTop;
    var isScrolled = scrollTop > 50;

    if (isScrolled !== this.data.isScrolled) {
      if (this.scrollDebounceTimer) {
        clearTimeout(this.scrollDebounceTimer);
      }

      var _this = this;
      this.scrollDebounceTimer = setTimeout(function () {
        _this.setData({
          isScrolled: isScrolled,
          scrollTop: scrollTop
        });
        _this.checkAndCloseOverflowOnScroll();
      }, 50);
    }
  },

  onTab1Click: function (event) {
    const type = event.currentTarget.dataset.type;
    if (type === '0') {
      this.toDetail({ currentTarget: { dataset: { type: '0' } } });
    } else if (type === '1') {
      this.toDetail({ currentTarget: { dataset: { type: '1' } } });
    } else if (type === '2') {
      this.toStockPage();
    }
  },

  toCost: function (e) {
    var item = e.currentTarget.dataset.item;
    var stockId = e.currentTarget.dataset.id;
    wx.setStorageSync('disGoods', item);
    wx.navigateTo({
      url: '/subPackage-goods/pages/goods/stockGoodsList/stockGoodsList?disGoodsId=' + item.gbDistributerGoodsId + '&stockId=' + stockId,
    });
  },

});
