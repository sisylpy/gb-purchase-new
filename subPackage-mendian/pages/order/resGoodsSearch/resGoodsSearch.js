var load = require('../../../../lib/load.js');
var config = require('../../../../config/index.js');
var dateUtils = require('../../../../lib/dateUtil');
var depOrder = require('../../../../services/depOrder');

// ========================
// 本页面使用的所有接口方法（来自 depOrder）
// ========================
// depOrder.queryDepDisGoodsByQuickSearchGb(data)  POST  gbdistributerdisgoods/queryDepDisGoodsByQuickSearchGb  快速搜索商品
// depOrder.gbDisSaveStandard(data)                POST  gbdistributerstandard/gbDisSaveStandard               保存配送标准
// depOrder.saveNxStandard(data)                   POST  nxstandard/saveNxStandard                             保存牛享标准
// depOrder.gbDisDeleteStandard(data)              GET   gbdistributerstandard/gbDisDeleteStandard/{id}         删除配送标准
// depOrder.createDepartmentOrderForJj(data)                    POST  gbdepartmentorders/saveOrdersGbJj                     保存进价订单
// depOrder.createDepartmentOrderWithNewDepDisGoods(data)    POST  gbdepartmentorders/createDepartmentOrderWithNewDepDisGoods       保存订单并更新部门商品
// depOrder.createDepartmentOrderFromNxGoodsImport(data)       POST  gbdistributergoods/createDepartmentOrderFromNxGoodsImport          保存订单并更新配送商品
// depOrder.updateOrderGbJj(data)                  POST  gbdepartmentorders/updateOrderGbJj                     更新进价订单
// depOrder.deleteOrderGb(data)                    GET   gbdepartmentorders/deleteOrderGb/{id}                   删除订单
// depOrder.saveDepProduceGoodsStock(data)         POST  gbdepartmentgoodsstock/saveDepProduceGoodsStock         保存生产库存
// depOrder.saveDepLossGoodsStock(data)            POST  gbdepartmentgoodsstock/saveDepLossGoodsStock            保存损耗库存
// depOrder.reduceAttachmentSaveWithFile(...)      POST  gbdepartmentgoodsstockreduceattachment/reduceAttachmentSaveWithFile  上损耗附件
// depOrder.saveDepReturnGoodsStock(data)          POST  gbdepartmentgoodsstock/saveDepReturnGoodsStock          保存退货库存
// depOrder.saveDepWasteGoodsStock(data)           POST  gbdepartmentgoodsstock/saveDepWasteGoodsStock           保存报废库存
// depOrder.deleteDepGoods(data)                   GET   gbdepartmentdisgoods/deleteDepGoods/{id}                  删除部门商品
// ========================


var windowWidth = 0;
var itemWidth = 0;
var heightArr = [0];

Page({

  // ========================
  // 页面数据
  // ========================

  data: {
    showIndNx: false,
    showInd: false,
    deleteShow: false,
    showPopupWarn: false,
    popupType: '',
    warnContent: '',
    disStandardId: '',
    tab1IndexSearch: 0,
    itemIndexSearch: 0,
    sliderOffsetSearch: 0,
    sliderOffsetsSearch: [],
    sliderLeftSearch: 0,
    tabsSearch: [{
      id: 0,
      amount: 0,
      words: "我的商品"
    }, {
      id: 1,
      amount: 0,
      words: "商品目录"
    }],
    isSearching: true,
    searchResult: false,
    placeHolder: "输入商品名称或拼音字母、首字母",

    itemDis: "",
    depGoods: null,
    orderCount: 0,
    editApply: false,
    hasStock: false,
    applyNumber: "",
    applyRemark: "",
    applyStandardName: "",
    applySubtotal: "",
    windowWidth: "",
    windowHeight: "",
    url: "",
    nowTime: "",
    resultTime: "",
    showType: false,
    item: {},
    nxGoods: {},
  },

  // ========================
  // 生命周期
  // ========================

  onLoad: function (options) {
    var globalData = getApp().globalData;
    this.setData({
      url: config.server,
      sliderLeftSearch: globalData.windowWidth / 8,
    });

    var userValue = wx.getStorageSync('userInfo');
    if (userValue) {
      this.setData({ userInfo: userValue });
    }

    var value = wx.getStorageSync('disInfo');
    if (value) {
      this.setData({
        disInfo: value,
        disId: value.gbDistributerId,
      });
    }

    var depValue = wx.getStorageSync('orderDepInfo');
    if (depValue) {
      this.setData({
        depInfo: depValue,
        depId: depValue.gbDepartmentId,
        disId: depValue.gbDepartmentDisId,
        depFatherId: depValue.gbDepartmentFatherId
      });
    }

    this._initTabLayout();
  },

  onShow: function () {
    var windowInfo = wx.getWindowInfo();
    var globalData = getApp().globalData;
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      nowTime: dateUtils.getArriveDate(0),
    });
  },

  onUnload: function () {
    if (this.data.orderCount > 0) {
      var pages = getCurrentPages();
      var prevPage = pages[pages.length - 2];
      if (prevPage) {
        prevPage.setData({ update: true });
      }
    }
  },

  // ========================
  // Tab 切换
  // ========================

  /** 初始化 Tab 样式布局 */
  _initTabLayout() {
    var that = this;
    wx.getSystemInfo({
      success: function (res) {
        itemWidth = Math.ceil(res.windowWidth / that.data.tabsSearch.length);
        var tempArr = [];
        for (var i in that.data.tabsSearch) {
          tempArr.push(itemWidth * i);
        }
        windowWidth = res.windowWidth;
        that.setData({
          sliderOffsetsSearch: tempArr,
          sliderOffsetSearch: tempArr[that.data.tab1IndexSearch],
        });
      }
    });
  },

  /** 点击 Tab 切换 */
  onTab1ClickSearch: function (event) {
    var index = event.currentTarget.dataset.index;
    this.setData({
      sliderOffsetSearch: this.data.sliderOffsetsSearch[index],
      tab1IndexSearch: index,
      itemIndexSearch: index,
      showOperation: false
    });
    this._initTabLayout();
  },

  /** Swiper 滑动切换 Tab */
  swiperChangeSearch: function (event) {
    this.setData({
      sliderOffsetSearch: this.data.sliderOffsetsSearch[event.detail.current],
      tab1IndexSearch: event.detail.current,
      itemIndexSearch: event.detail.current,
    });
  },

  // ========================
  // 搜索
  // ========================

  /** 搜索输入时实时更新 */
  getString: function (e) {
    var string = e.detail.value;
    string = string.replace(/\s*/g, "");
    this.setData({
      searchString: string.length > 0 ? string : ""
    });
  },

  /** 删除搜索内容末尾字符 */
  delSearch: function () {
    var str = this.data.searchString;
    if (str.length > 0) {
      this.setData({ searchString: str.slice(0, -1) });
      this._doSearch();
    }
  },

  /** 确认搜索（点击搜索按钮/回车） */
  getSearchString: function () {
    if (this.data.searchString.length > 0) {
      this.setData({ placeHolder: this.data.searchString });
      this._doSearch();
    } else {
      this._clearSearch();
    }
  },

  /** 搜索后保持关键词刷新结果（保存/删除订单后调用） */
  getSearchStringPlaceHolder: function () {
    if (this.data.placeHolder.length > 0) {
      var that = this;
      var data = {
        disId: this.data.disId,
        searchStr: this.data.placeHolder,
        depId: this.data.depId
      };
      load.showLoading("搜索商品中...");
      depOrder.queryDepDisGoodsByQuickSearchGb(data).then(function (res) {
        load.hideLoading();
        if (res.result.code == 0) {
          var depTabCount = "tabsSearch[0].amount";
          var disTabCount = "tabsSearch[1].amount";
          var depGoodsLength = res.result.data.dep.length;

          var setData = {
            disSearchArr: res.result.data.dis,
            depGoodsArrAi: res.result.data.dep,
            searchResult: true,
            isSearching: true,
          };
          setData[depTabCount] = res.result.data.dep.length;
          setData[disTabCount] = res.result.data.dis.length;

          if (depGoodsLength == 0) {
            setData.tab1IndexSearch = 1;
            setData.itemIndexSearch = 1;
          } else {
            setData.tab1IndexSearch = 0;
            setData.itemIndexSearch = 0;
          }
          that.setData(setData);
        } else {
          wx.showToast({ title: res.result.msg, icon: "none" });
        }
      });
    } else {
      this._clearSearch();
    }
  },

  /** 执行搜索请求 */
  _doSearch: function () {
    var that = this;
    var data = {
      disId: this.data.disId,
      searchStr: this.data.searchString,
      depId: this.data.depId
    };
    load.showLoading("搜索商品中...");
    depOrder.queryDepDisGoodsByQuickSearchGb(data).then(function (res) {
      load.hideLoading();
      if (res.result.code == 0) {
        var depTabCount = "tabsSearch[0].amount";
        var disTabCount = "tabsSearch[1].amount";
        var depGoodsLength = res.result.data.dep.length;

        var setData = {
          disSearchArr: res.result.data.dis,
          depGoodsArrAi: res.result.data.dep,
          searchResult: true,
        };
        setData[depTabCount] = res.result.data.dep.length;
        setData[disTabCount] = res.result.data.dis.length;

        if (depGoodsLength == 0) {
          setData.tab1IndexSearch = 1;
          setData.itemIndexSearch = 1;
        } else {
          setData.tab1IndexSearch = 0;
          setData.itemIndexSearch = 0;
        }
        that.setData(setData);
      } else {
        wx.showToast({ title: res.result.msg, icon: "none" });
      }
    });
  },

  /** 清空搜索结果 */
  _clearSearch: function () {
    load.hideLoading();
    var depTabCount = "tabsSearch[0].amount";
    var disTabCount = "tabsSearch[1].amount";
    var setData = {};
    setData[depTabCount] = "0";
    setData[disTabCount] = "0";
    setData.disSearchArr = [];
    setData.depGoodsArrAi = [];
    setData.searchResult = false;
    setData.searchString = "";
    this.setData(setData);
  },

  // ========================
  // 订货操作 - 我的商品（depGoodsArrAi）
  // ========================

  /** 点击订货按钮（我的商品 tab） */
  applyGoodsDep: function (e) {
    var depGoods = e.currentTarget.dataset.depgoods;
    this.setData({
      index: e.currentTarget.dataset.index,
      itemDis: e.currentTarget.dataset.disgoods,
      depGoods: e.currentTarget.dataset.depgoods,
      show: true,
      applyStandardName: depGoods.gbDdgOrderStandard,
      applyRemark: depGoods.gbDdgOrderRemark,
      canSave: true,
      placeHolder: this.data.searchString,
      hasStock: depGoods.gbDepartmentGoodsStockEntities.length > 0,
    });
  },

  /** 点击编辑订单（我的商品 tab） */
  toEditApplyDep: function (e) {
    var applyItem = e.currentTarget.dataset.order;
    if (applyItem.gbDoBuyStatus > 1) {
      wx.showModal({
        title: "不能修改",
        content: "订单在配送中，如果有变化，请与采购员联系.",
        showCancel: false,
        confirmText: "知道了"
      });
      return;
    }
    var setDataObj = {
      index: e.currentTarget.dataset.index,
      applyItem: e.currentTarget.dataset.order,
      show: true,
      applyStandardName: applyItem.gbDoStandard,
      itemDis: e.currentTarget.dataset.disgoods,
      editApply: true,
      searchString: this.data.placeHolder,
      applyNumber: applyItem.gbDoQuantity,
      applyRemark: applyItem.gbDoRemark,
      depgoods: e.currentTarget.dataset.depgoods,
      gbDepartmentDisGoodsId: e.currentTarget.dataset.depgoodsid,
    };
    if (e.currentTarget.dataset.gbDepartmentDisGoodsId) {
      setDataObj.gbDepartmentDisGoodsId = e.currentTarget.dataset.gbDepartmentDisGoodsId;
    }
    this.setData(setDataObj);
  },

  // ========================
  // 订货操作 - 商品目录（disSearchArr）
  // ========================

  /** 点击订货按钮（商品目录 tab） */
  applyGoods: function (e) {
    this.setData({
      placeHolder: this.data.searchString,
      index: e.currentTarget.dataset.index,
      applySubtotal: "0.0元",
      itemDis: e.currentTarget.dataset.disgoods,
      nxGoods: e.currentTarget.dataset.nxgoods,
      depGoods: e.currentTarget.dataset.depgoods,
    });

    if (e.currentTarget.dataset.disgoods == null) {
      this.setData({
        showNx: true,
        applyStandardName: e.currentTarget.dataset.nxgoods.nxGoodsStandardname,
      });
    } else {
      if (e.currentTarget.dataset.disgoods.gbDgPullOff == 1) {
        wx.showToast({ title: '停止订货', icon: 'none' });
      } else {
        this.setData({
          show: true,
          applyStandardName: e.currentTarget.dataset.disgoods.gbDgGoodsStandardname,
        });
      }
    }
  },

  /** 点击编辑订单（商品目录 tab） */
  toEditApply: function (e) {
    var applyItem = e.currentTarget.dataset.order;
    if (applyItem.gbDoBuyStatus > 1) {
      wx.showModal({
        title: "不能修改",
        content: "订单在配送中，如果有变化，请与采购员联系.",
        showCancel: false,
        confirmText: "知道了"
      });
      return;
    }
    this.setData({
      placeHolder: this.data.searchString,
      applyItem: e.currentTarget.dataset.order,
      show: true,
      applyStandardName: applyItem.gbDoStandard,
      itemDis: e.currentTarget.dataset.disgoods,
      editApply: true,
      applyNumber: applyItem.gbDoQuantity,
      applyRemark: applyItem.gbDoRemark,
      index: e.currentTarget.dataset.index,
    });
    if (this.data.applyItem.gbDoSubtotal !== null) {
      this.setData({ applySubtotal: applyItem.gbDoSubtotal + "元" });
    }
  },

  // ========================
  // 保存 & 修改订单
  // ========================

  /** 确认订单（新增或编辑） */
  confirm: function (e) {
    if (this.data.editApply) {
      this._updateDisOrder(e);
    } else {
      this._saveOrder(e);
    }
    var ordercount = this.data.orderCount;
    this.setData({
      show: false,
      editApply: false,
      applyItem: "",
      itemDis: "",
      applyNumber: "",
      applyStandardName: "",
      orderCount: ordercount + 1
    });
  },

  /** 取消订单编辑弹窗 */
  cancle: function () {
    this.setData({
      show: false,
      showNx: false,
      applyStandardName: "",
      item: null,
      editApply: false,
      applyNumber: "",
      applyRemark: "",
      applySubtotal: "",
      itemDis: null,
    });
  },

  /** 保存新订单 */
  _saveOrder: function (e) {
    var that = this;
    var arriveDate = dateUtils.getArriveDate(0);
    var arriveOnlyDate = dateUtils.getArriveOnlyDate(0);
    var weekYear = dateUtils.getArriveWeeksYear(0);
    var week = dateUtils.getArriveWhatDay(0);
    var depDisGoodsId = -1;
    var gbDisGoodsId = -1;
    var gbDisGoodsFatherId = -1;
    var nxGoodsId = "";
    var nxGoodsFatherId = "";
    var nxDisId = -1;
    var nxDisGoodsId = -1;
    var price = null;
    var weight = null;
    var subtotal = null;
    var goodsType = "";
    var toDepId = "";
    var printStandard = "";
    var goodsName = "";

    if (this.data.itemDis !== null) {
      gbDisGoodsId = this.data.itemDis.gbDistributerGoodsId;
      gbDisGoodsFatherId = this.data.itemDis.gbDgDfgGoodsFatherId;
      nxGoodsId = this.data.itemDis.gbDgNxGoodsId;
      nxGoodsFatherId = this.data.itemDis.gbDgNxFatherId;
      nxDisId = this.data.itemDis.gbDgNxDistributerId;
      nxDisGoodsId = this.data.itemDis.gbDgNxDistributerGoodsId;
      goodsType = this.data.itemDis.gbDgGoodsType;
      toDepId = this.data.itemDis.gbDgGbDepartmentId;
      goodsName = this.data.itemDis.gbDgGoodsName;
      if (e.detail.applyStandardName == this.data.itemDis.nxGoodsStandardname) {
        weight = e.detail.applyNumber;
      }
    } else {
      nxGoodsId = this.data.nxGoods.nxGoodsId;
      nxGoodsFatherId = this.data.nxGoods.nxGoodsFatherId;
      goodsType = 2;
      toDepId = this.data.disInfo.purDepartmentList[0].gbDepartmentId;
      printStandard = this.data.nxGoods.nxGoodsStandardname;
      goodsName = this.data.nxGoods.nxGoodsName;
    }

    var userId = "";
    if (this.data.userInfo !== null) {
      userId = this.data.userInfo.gbDepartmentUserId;
    }

    if (this.data.depGoods !== null) {
      depDisGoodsId = this.data.depGoods.gbDepartmentDisGoodsId;
      printStandard = this.data.depGoods.gbDdgPrintStandard;
    }

    var dg = {
      gbDoOrderUserId: userId,
      gbDoDepDisGoodsId: depDisGoodsId,
      gbDoDisGoodsId: gbDisGoodsId,
      gbDoDisGoodsFatherId: gbDisGoodsFatherId,
      gbDoDepartmentId: this.data.depId,
      gbDoToDepartmentId: toDepId,
      gbDoDistributerId: this.data.disId,
      gbDoDepartmentFatherId: this.data.depFatherId,
      gbDoQuantity: e.detail.applyNumber,
      gbDoPrice: price,
      gbDoWeight: weight,
      gbDoSubtotal: subtotal,
      gbDoStandard: e.detail.applyStandardName,
      gbDoRemark: e.detail.applyRemark,
      gbDoIsAgent: 2,
      gbDoArriveDate: arriveDate,
      gbDoArriveWeeksYear: weekYear,
      gbDoArriveOnlyDate: arriveOnlyDate,
      gbDoArriveWhatDay: week,
      gbDoNxGoodsId: nxGoodsId,
      gbDoNxGoodsFatherId: nxGoodsFatherId,
      gbDoNxDistributerGoodsId: nxDisGoodsId,
      gbDoNxDistributerId: nxDisId,
      gbDoGoodsType: goodsType,
      gbDoOrderType: goodsType,
      gbDoDsStandardScale: -1,
      stockIsZero: e.detail.stockIsZero,
      gbDoPrintStandard: printStandard,
      gbDoGoodsName: goodsName,
    };

    if (this.data.itemDis == null) {
      // 牛享商品订货
      this._saveOrderToBackend(dg, 'createDepartmentOrderFromNxGoodsImport');
    } else if (this.data.depGoods == null) {
      // 配送商品订货（新部门商品）
      this._saveOrderToBackend(dg, 'createDepartmentOrderWithNewDepDisGoods');
    } else {
      // 部门商品直接订货
      this._saveOrderToBackend(dg, 'createDepartmentOrderForJj');
    }

    wx.setStorageSync('needRefreshOrderData', true);
  },

  /** 保存订单到后端（统一处理保存后的缓存刷新） */
  _saveOrderToBackend: function (dg, methodName) {
    var that = this;
    load.showLoading("保存订单");
    depOrder[methodName](dg).then(function (res) {
      load.hideLoading();
      if (res.result.code == 0) {
        that.setData({ showNx: false, searchString: "" });
        that.getSearchStringPlaceHolder();

        var nxGoodsId = -1;
        if (res.result.data.gbDoNxGoodsId !== null) {
          nxGoodsId = res.result.data.gbDoNxGoodsId;
        }

        // 缓存新订单信息，用于返回 resGoodsAi 页面时更新数据
        var newOrderInfo = {
          gbDepartmentDisGoodsId: res.result.data.gbDoDepDisGoodsId,
          nxGoodsId: nxGoodsId,
          gbDepartmentOrdersEntity: res.result.data
        };
        wx.setStorageSync('newOrderInfo', newOrderInfo);
        wx.setStorageSync('needRefreshOrderData', true);

        // 如果清库存，缓存清库存信息
        if (dg.stockIsZero) {
          var clearStockInfo = {
            gbDepartmentDisGoodsId: res.result.data.gbDoDepDisGoodsId,
            needClearStock: true
          };
          wx.setStorageSync('clearStockInfo', clearStockInfo);

          // 如果是已有部门商品（depGoods 非空），直接清零内存中的库存
          if (that.data.depGoods != null) {
            var dataStock = "depGoodsArrAi[" + that.data.index + "].gbDepartmentGoodsStockEntities";
            that.setData({ [dataStock]: [] });
          }
        }
      } else {
        wx.showToast({ title: '订单保存失败', icon: 'none' });
      }
    });
  },

  /** 修改订单 */
  _updateDisOrder: function (e) {
    var that = this;
    var dg = {
      id: this.data.applyItem.gbDepartmentOrdersId,
      weight: e.detail.applyNumber,
      standard: e.detail.applyStandardName,
      remark: e.detail.applyRemark,
    };

    depOrder.updateOrderGbJj(dg).then(function (res) {
      load.showLoading("修改订单");
      if (res.result.code == 0) {
        load.hideLoading();
        that.setData({
          isSearching: true,
          canSave: false,
          searchResult: false,
        });
        that.getSearchStringPlaceHolder();

        // 缓存修改订单信息
        var updatedOrderInfo = {
          gbDepartmentDisGoodsId: that.data.gbDepartmentDisGoodsId || null,
          gbDepartmentOrdersEntity: res.result.data || that.data.applyItem,
          operationType: 'update'
        };
        wx.setStorageSync('newOrderInfo', updatedOrderInfo);
        wx.setStorageSync('needRefreshOrderData', true);
      } else {
        load.hideLoading();
        wx.showToast({ title: res.result.msg, icon: "none" });
      }
    });
  },

  // ========================
  // 删除订单
  // ========================

  /** 弹出删除确认弹窗 */
  delApply: function () {
    this.setData({
      deleteShow: true,
      showOperation: true,
      show: false,
      placeHolder: this.data.searchString,
    });
  },

  /** 确认删除订单 */
  deleteYes: function () {
    this.setData({ deleteShow: false });
    var that = this;
    depOrder.deleteOrderGb(this.data.applyItem.gbDepartmentOrdersId).then(function (res) {
      if (res.result.code == 0) {
        that.setData({
          searchString: "",
          applyNumber: "",
          applyStandardName: "",
          applyItem: "",
          editApply: false,
          isSearching: true,
        });

        if (that.data.itemIndexSearch == 0) {
          var data = "depGoodsArrAi[" + that.data.index + "].gbDepartmentOrdersEntity";
          that.setData({ [data]: null });
          // 缓存订单删除信息
          var updatedOrderInfo = {
            gbDepartmentDisGoodsId: that.data.depGoodsArrAi[that.data.index].gbDepartmentDisGoodsId,
            gbDepartmentOrdersEntity: null,
            operationType: 'delete'
          };
          wx.setStorageSync('newOrderInfo', updatedOrderInfo);
          wx.setStorageSync('needRefreshOrderData', true);
        }
        if (that.data.itemIndexSearch == 1) {
          var data1 = "goodsList[" + that.data.index + "].gbDepartmentOrdersEntity";
          that.setData({ [data1]: null });
          var updatedOrderInfo = {
            nxGoodsId: that.data.goodsList[that.data.index].nxGoodsId,
            gbDepartmentOrdersEntity: null,
            operationType: 'delete'
          };
          wx.setStorageSync('newOrderInfo', updatedOrderInfo);
          wx.setStorageSync('needRefreshOrderData', true);
        }
      }
    });
  },

  /** 取消删除 */
  deleteNo: function () {
    this.setData({ applyItem: "", deleteShow: false });
  },

  /** 确认警告弹窗操作（删除订单或删除标准规格） */
  confirmWarn: function () {
    if (this.data.popupType == 'deleteSpec') {
      this.deleteStandardApi();
    } else {
      this.deleteApplyApi();
    }
  },

  /** 删除订单（从警告弹窗触发） */
  deleteApplyApi: function () {
    this.setData({ popupType: "", showPopupWarn: false });
    var that = this;
    depOrder.deleteOrderGb(this.data.applyItem.gbDepartmentOrdersId).then(function (res) {
      if (res.result.code == 0) {
        if (that.data.tab1IndexSearch == 0) {
          var data = "depGoodsArrAi[" + that.data.index + "].gbDepartmentOrdersEntity";
          that.setData({ [data]: null });
        }
        if (that.data.tab1IndexSearch == 1) {
          var data1 = "goodsList[" + that.data.index + "].gbDepartmentOrdersEntity";
          that.setData({ [data1]: null });
        }
        that._cancle();
      }
    });
  },

  // ========================
  // 标准规格
  // ========================

  /** 保存新的配送标准规格 */
  confirmStandard: function (e) {
    var data = {
      gbDsDisGoodsId: this.data.itemDis.gbDistributerGoodsId,
      gbDsStandardName: e.detail.newStandardName,
    };
    depOrder.gbDisSaveStandard(data).then(function (res) {
      if (res.result.code == 0) {
        var standardArr = this.data.itemDis.gbDistributerStandardEntities;
        standardArr.push(res.result.data);
        var standards = "itemDis.gbDistributerStandardEntities";
        this.setData({
          [standards]: standardArr,
          applyStandardName: res.result.data.gbDsStandardName,
        });
      } else {
        wx.showToast({ title: res.result.msg, icon: 'none' });
      }
    }.bind(this));
  },

  /** 保存新的牛享标准规格 */
  confirmStandardNx: function (e) {
    var data = {
      nxSGoodsId: this.data.nxGoods.nxGoodsId,
      nxStandardName: e.detail.newStandardName,
    };
    depOrder.saveNxStandard(data).then(function (res) {
      if (res.result.code == 0) {
        var standardArr = this.data.nxGoods.nxGoodsStandardEntities;
        standardArr.push(res.result.data);
        var standards = "nxGoods.nxGoodsStandardEntities";
        this.setData({
          [standards]: standardArr,
          applyStandardName: res.result.data.nxStandardName,
        });
      } else {
        wx.showToast({ title: res.result.msg, icon: 'none' });
      }
    }.bind(this));
  },

  /** 删除标准规格（弹出确认弹窗） */
  delStandard: function (e) {
    this.setData({
      warnContent: e.detail.standardName,
      popupType: 'deleteSpec',
      showPopupWarn: true,
      disStandardId: e.detail.id,
    });
  },

  /** 调用接口删除标准规格 */
  deleteStandardApi: function () {
    var that = this;
    depOrder.gbDisDeleteStandard(this.data.disStandardId).then(function (res) {
      if (res.result.code == 0) {
        var standards = "itemDis.gbDistributerStandardEntities";
        that.setData({ [standards]: res.result.data.gbDistributerStandardEntities });
        that.setData({ popupType: "", showPopupWarn: false, disStandardId: "" });
      } else {
        wx.showToast({ title: res.result.msg, icon: 'none' });
      }
    });
  },

  /** 切换订单规格 */
  changeStandard: function (e) {
    this.setData({ applyStandardName: e.detail.applyStandardName });
  },

  /** 关闭警告弹窗 */
  closeWarn: function () {
    this.setData({
      warnContent: "",
      popupType: '',
      showPopupWarn: false,
    });
  },

  // ========================
  // 库存操作
  // ========================

  /** 显示库存详情弹窗 */
  showStock: function (e) {
    var item = e.currentTarget.dataset.item;
    item.gbDistributerGoodsEntity = e.currentTarget.dataset.goods.gbDistributerGoodsEntity;
    var goodsIndex = e.currentTarget.dataset.goodsindex;
    var stockIndex = e.currentTarget.dataset.stockindex;

    if (item.gbDgsWasteFullTime !== null && item.gbDgsWasteFullTime !== '') {
      var endTime = item.gbDgsWasteFullTime.replace(/-/g, '/');
      var startTime = this.data.nowTime.replace(/-/g, '/');
      var thisResult = Math.floor((Date.parse(new Date(endTime)) - Date.parse(new Date(startTime))) / 1000 / 60 / 60);

      if (thisResult < 0) {
        item.gbDgsMyWasteWeight = item.gbDgsRestWeight;
        item.gbDgsMyProduceWeight = "0";
        this.setData({ canWaste: true, canSure: true, showType: 4 });
      } else {
        item.gbDgsMyProduceWeight = item.gbDgsRestWeight;
        this.setData({ canWaste: false, resultTime: thisResult, canSure: true, showType: 1 });
      }
    } else {
      item.gbDgsMyProduceWeight = item.gbDgsRestWeight;
      this.setData({ canWaste: false, canSure: true, showType: 1 });
    }

    this.setData({
      showStock: true,
      item: item,
      consultItem: JSON.parse(JSON.stringify(item)),
      depGoods: e.currentTarget.dataset.goods,
      goodsIndex: goodsIndex,
      stockIndex: stockIndex,
    });
  },

  /** 确认库存操作 */
  confirmStock: function (e) {
    var item = e.detail.item;
    var showType = e.detail.showType;
    if (this.data.transfer !== '1') {
      item.gbDgsReduceWeightUserId = this.data.userInfo.gbDepartmentUserId;
    }

    if (showType == 1) {
      this._handleProduceStock(item);
    } else if (showType == 2) {
      this._handleLossStock(item, e);
    } else if (showType == 3) {
      this._handleReturnStock(item, e);
    } else if (showType == 4) {
      this._handleWasteStock(item);
    }
  },

  /** 保存生产库存 */
  _handleProduceStock: function (item) {
    var that = this;
    load.showLoading("保存数据中");
    depOrder.saveDepProduceGoodsStock(item).then(function (res) {
      load.hideLoading();
      if (res.result.code == 0) {
        var data = "depGoodsArrAi[" + that.data.goodsIndex + "]";
        that.setData({ [data]: res.result.data });
        that._cacheGoodsUpdate(res.result.data);
      }
    });
  },

  /** 保存损耗库存 */
  _handleLossStock: function (item, e) {
    var that = this;
    load.showLoading("保存数据中");
    that.setData({ src: e.detail.src, reason: e.detail.reason });
    depOrder.saveDepLossGoodsStock(item).then(function (res) {
      load.hideLoading();
      if (res.result.code == 0) {
        var data = "depGoodsArrAi[" + that.data.goodsIndex + "]";
        that.setData({ [data]: res.result.data.disGoods });
        that._cacheGoodsUpdate(res.result.data.disGoods);
        that._uploadAttachmentIfNeeded(res.result.data.id);
      }
    });
  },

  /** 保存退货库存 */
  _handleReturnStock: function (item, e) {
    var that = this;
    that.setData({ src: e.detail.src, reason: e.detail.reason });
    item.gbDgsReturnUserId = this.data.userInfo.gbDepartmentUserId;
    load.showLoading("保存数据中");
    depOrder.saveDepReturnGoodsStock(item).then(function (res) {
      load.hideLoading();
      if (res.result.code == 0) {
        var data = "depGoodsArrAi[" + that.data.goodsIndex + "]";
        that.setData({ [data]: res.result.data.disGoods });
        that._cacheGoodsUpdate(res.result.data.disGoods);
        that._uploadAttachmentIfNeeded(res.result.data.id);
      } else {
        wx.showToast({ title: res.result.msg, icon: 'none' });
      }
    });
  },

  /** 保存报废库存 */
  _handleWasteStock: function (item) {
    var that = this;
    load.showLoading("保存数据中");
    depOrder.saveDepWasteGoodsStock(item).then(function (res) {
      load.hideLoading();
      if (res.result.code == 0) {
        var data = "depGoodsArrAi[" + that.data.goodsIndex + "]";
        that.setData({ [data]: res.result.data });
        that._cacheGoodsUpdate(res.result.data);
      }
    });
  },

  /** 上传附件（损耗/退货后如有图片） */
  _uploadAttachmentIfNeeded: function (stockId) {
    var that = this;
    var src = that.data.src;
    if (src && src.length > 0) {
      var reason = that.data.reason;
      depOrder.reduceAttachmentSaveWithFile(src, reason, stockId).then(function (res) {
        // 上传完成
      });
    }
  },

  /** 缓存商品数据更新（供返回 resGoodsAi 页面时刷新） */
  _cacheGoodsUpdate: function (goodsData) {
    var updatedGoodsInfo = {
      gbDepartmentDisGoodsId: goodsData.gbDepartmentDisGoodsId,
      updatedGoodsData: goodsData
    };
    wx.setStorageSync('updatedGoodsInfo', updatedGoodsInfo);
    wx.setStorageSync('needRefreshGoodsData', true);
  },

  /** 内部取消订单编辑 */
  _cancle: function () {
    this.setData({
      show: false,
      applyStandardName: "",
      itemDis: "",
      editApply: false,
      applyNumber: "",
      applyRemark: "",
      applySubtotal: ""
    });
  },

  // ========================
  // 图片 & 弹窗
  // ========================

  /** 显示商品图片弹窗 */
  showImageModal: function (e) {
    var goods = e.currentTarget.dataset.goods;
    var imageUrl = '';
    if (goods.gbDisGoodsFile) {
      imageUrl = this.data.url + goods.gbDisGoodsFile;
    } else if (goods.nxGoodsFile) {
      imageUrl = this.data.url + goods.nxGoodsFile;
    } else {
      imageUrl = '/images/logo.jpg';
    }
    this.setData({
      showImageModal: true,
      currentImage: imageUrl,
      currentGoods: goods
    });
  },

  /** 隐藏图片弹窗 */
  hideImageModal: function () {
    this.setData({ showImageModal: false, currentImage: '', currentGoods: null });
  },

  /** 显示商品详情弹窗（配送商品） */
  showDialogBtn: function (e) {
    this.setData({
      item: e.currentTarget.dataset.item,
      showInd: true,
      showIndNx: false,
      windowHeight: this.data.windowHeight,
      windowWidth: this.data.windowWidth
    });
  },

  /** 显示商品详情弹窗（牛享商品） */
  showDialogBtnNx: function (e) {
    this.setData({
      item: e.currentTarget.dataset.item,
      showIndNx: true,
      showInd: false,
      windowHeight: this.data.windowHeight,
      windowWidth: this.data.windowWidth
    });
  },

  /** 阻止事件冒泡 */
  stopPropagation: function () {},

  /** 隐藏操作面板 */
  hideMask: function () {
    this.setData({ showOperation: false });
  },

  /** 隐藏模态对话框 */
  hideModal: function () {
    this.setData({ showModal: false });
  },

  /** 弹窗取消 */
  onCancel: function () {
    this.hideModal();
  },

  /** 弹窗确认 */
  onConfirm: function () {
    this.hideModal();
  },

  /** 关闭警告弹窗（组件回调） */
  onClosePopup: function () {
    this.closeWarn();
  },

  // ========================
  // 页面跳转
  // ========================

  /** 跳转到添加新商品页面 */
  toAddGoods: function () {
    wx.navigateTo({
      url: '../disAddGoods/disAddGoods?goodsName=' + this.data.placeHolder,
    });
  },

  /** 跳转到商品业务详情页面 */
  toBusiness: function (e) {
    this.setData({ goodsIndex: e.currentTarget.dataset.index });
    var id = e.currentTarget.dataset.id;
    wx.setStorageSync('disGoods', e.currentTarget.dataset.goods);
    wx.navigateTo({
      url: '../stockGoodsBusiness/stockGoodsBusiness?depGoodsId=' + id + '&index=' + e.currentTarget.dataset.index,
    });
  },

  /** 返回上一页 */
  toBack: function () {
    wx.navigateBack({ delta: 1 });
  },

})
