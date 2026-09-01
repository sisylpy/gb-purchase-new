var load = require('../../../../lib/load.js');
var config = require('../../../../config/index.js');
var dateUtils = require('../../../../lib/dateUtil');
var orderApi = require('../../../../services/depOrder.js');
var stockReduceKind = require('../../../../lib/stockReduceKind.js');
var franchiseApi = require('../../../../services/franchiseInspection.js');
var franchiseUtil = require('../../../../utils/franchiseInspection.js');
var autoOrderDelete = require('../../../../utils/autoOrderDelete.js');

// ========================
// 本页面使用的所有接口方法（来自 depOrder）
// ========================
// orderApi.queryDepDisGoodsByQuickSearchGb(data)  POST  gbdistributerdisgoods/queryDepDisGoodsByQuickSearchGb  快速搜索商品
// orderApi.gbDisSaveStandard(data)                POST  gbdistributerstandard/gbDisSaveStandard               保存配送标准
// orderApi.saveNxStandard(data)                   POST  nxstandard/saveNxStandard                             保存牛享标准
// orderApi.gbDisDeleteStandard(data)              GET   gbdistributerstandard/gbDisDeleteStandard/{id}         删除配送标准
// orderApi.createDepartmentOrderForJj(data)                    POST  gbdepartmentorders/saveOrdersGbJj                     保存进价订单
// orderApi.createDepartmentOrderWithNewDepDisGoods(data)    POST  gbdepartmentorders/createDepartmentOrderWithNewDepDisGoods       保存订单并更新部门商品
// orderApi.createDepartmentOrderFromNxGoodsImport(data)       POST  gbdistributergoods/createDepartmentOrderFromNxGoodsImport          保存订单并更新配送商品
// orderApi.updateOrderGbJj(data)                  POST  gbdepartmentorders/updateOrderGbJj                     更新进价订单
// orderApi.deleteOrderGb(data)                    GET   gbdepartmentorders/deleteOrderGb/{id}                   删除订单
// orderApi.saveDepProduceGoodsStock(data)         POST  gbdepartmentgoodsstock/saveDepProduceGoodsStock         保存生产库存
// orderApi.saveDepLossGoodsStock(data)            POST  gbdepartmentgoodsstock/saveDepLossGoodsStock            保存损耗库存
// orderApi.reduceAttachmentSaveWithFile(...)      POST  gbdepartmentgoodsstockreduceattachment/reduceAttachmentSaveWithFile  上损耗附件
// orderApi.saveDepReturnGoodsStock(data)          POST  gbdepartmentgoodsstock/saveDepReturnGoodsStock          保存退货库存
// orderApi.saveDepWasteGoodsStock(data)           POST  gbdepartmentgoodsstock/saveDepWasteGoodsStock           保存报废库存
// orderApi.deleteDepGoods(data)                   GET   gbdepartmentdisgoods/deleteDepGoods/{id}                  删除部门商品
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
    hasFranchiseHeadquarters: false,
    tabsSearch: [{
      id: 0,
      amount: 0,
      words: "我的商品"
    }, {
      id: 1,
      amount: 0,
      words: "商品目录"
    }],
    headquartersStandardGoods: [],
    headquartersStandardMapped: false,
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
    this._loadFranchiseIdentity();
  },

  _loadFranchiseIdentity: function () {
    franchiseApi.bootstrapIdentity().then(function (identity) {
      if (!franchiseUtil.hasFranchiseStoreIdentity(identity)) return;
      this.setData({
        hasFranchiseHeadquarters: true,
        tabsSearch: [{ id: 0, amount: 0, words: '我的商品' },
          { id: 1, amount: 0, words: '总部标准' },
          { id: 2, amount: 0, words: '商品目录' }]
      }, function () {
        this._initTabLayout();
        this._loadHeadquartersStandardGoods();
      }.bind(this));
    }.bind(this)).catch(function () {});
  },

  _catalogTabIndex: function () {
    return this.data.hasFranchiseHeadquarters ? 2 : 1;
  },

  _loadHeadquartersStandardGoods: function () {
    var departmentId = this.data.depId;
    if (!departmentId) return;
    orderApi.getHeadquartersStandardGoods(departmentId).then(function (res) {
      var result = res.result || {};
      if (result.code !== 0) return;
      var data = result.data || {};
      var items = data.items || [];
      var amountKey = 'tabsSearch[1].amount';
      this.setData({
        headquartersStandardGoods: items,
        headquartersStandardMapped: !!data.mappedToHeadquartersStandard,
        [amountKey]: items.length
      });
    }.bind(this)).catch(function () {});
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

  /** 阻止 touchmove 冒泡（用于 catchtouchmove）；勿写成无效方法名，否则会打断同一次触摸里的 tap */
  preventTouchMove: function () {},

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
          sliderLeftSearch: itemWidth / 4,
          sliderOffsetSearch: tempArr[that.data.tab1IndexSearch],
        });
      }
    });
  },

  /** 点击 Tab 切换 */
  onTab1ClickSearch: function (event) {
    var index = parseInt(event.currentTarget.dataset.index, 10);
    if (isNaN(index)) {
      return;
    }
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
      orderApi.queryDepDisGoodsByQuickSearchGb(data).then(function (res) {
        load.hideLoading();
        if (res.result.code == 0) {
          var depTabCount = "tabsSearch[0].amount";
          var catalogTabIndex = that._catalogTabIndex();
          var disTabCount = "tabsSearch[" + catalogTabIndex + "].amount";
          var depGoodsLength = res.result.data.dep.length;

          var setData = {
            disSearchArr: res.result.data.dis,
            depGoodsArrAi: res.result.data.dep,
            searchResult: true,
            isSearching: true,
          };
          setData[depTabCount] = res.result.data.dep.length;
          setData[disTabCount] = res.result.data.dis.length;

          var tabIdx = depGoodsLength == 0 ? catalogTabIndex : 0;
          setData.tab1IndexSearch = tabIdx;
          setData.itemIndexSearch = tabIdx;
          that.setData(setData, function () {
            that._initTabLayout();
          });
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
    orderApi.queryDepDisGoodsByQuickSearchGb(data).then(function (res) {
      load.hideLoading();
      if (res.result.code == 0) {
        var depTabCount = "tabsSearch[0].amount";
        var catalogTabIndex = that._catalogTabIndex();
        var disTabCount = "tabsSearch[" + catalogTabIndex + "].amount";
        var depGoodsLength = res.result.data.dep.length;

        var setData = {
          disSearchArr: res.result.data.dis,
          depGoodsArrAi: res.result.data.dep,
          searchResult: true,
        };
        setData[depTabCount] = res.result.data.dep.length;
        setData[disTabCount] = res.result.data.dis.length;

        var tabIdx = depGoodsLength == 0 ? catalogTabIndex : 0;
        setData.tab1IndexSearch = tabIdx;
        setData.itemIndexSearch = tabIdx;
        that.setData(setData, function () {
          that._initTabLayout();
        });
      } else {
        wx.showToast({ title: res.result.msg, icon: "none" });
      }
    });
  },

  /** 清空搜索结果 */
  _clearSearch: function () {
    load.hideLoading();
    var depTabCount = "tabsSearch[0].amount";
    var disTabCount = "tabsSearch[" + this._catalogTabIndex() + "].amount";
    var setData = {};
    setData[depTabCount] = "0";
    setData[disTabCount] = "0";
    setData.disSearchArr = [];
    setData.depGoodsArrAi = [];
    setData.searchResult = false;
    setData.searchString = "";
    this.setData(setData);
  },

  /**
   * 将 AI 添加商品成功返回的批发商商品 + 部门商品，合并为「我的商品」列表行（与搜索 dep 项结构对齐）
   */
  _buildDepGoodsRowFromAiAdd: function (gbEntity, depRow) {
    var entity = (depRow && depRow.gbDistributerGoodsEntity) ? depRow.gbDistributerGoodsEntity : (gbEntity || {});
    var d = depRow || {};
    var stocks = d.gbDepartmentGoodsStockEntities;
    if (!Array.isArray(stocks)) {
      stocks = [];
    }
    var name = d.gbDdgDepGoodsName || entity.gbDgGoodsName || '';
    var showStd = d.gbDdgShowStandardName || entity.gbDgGoodsStandardname || '';
    var file = d.gbDisGoodsFile || entity.gbDgGoodsFile || entity.gbDgGoodsFileImg || '';
    var disGoodsId = d.gbDdgDisGoodsId != null && d.gbDdgDisGoodsId !== ''
      ? d.gbDdgDisGoodsId
      : entity.gbDistributerGoodsId;
    return {
      gbDepartmentDisGoodsId: d.gbDepartmentDisGoodsId != null ? d.gbDepartmentDisGoodsId : entity.gbDepartmentDisGoodsId,
      gbDdgDisGoodsId: disGoodsId,
      gbDdgDisGoodsFatherId: d.gbDdgDisGoodsFatherId != null ? d.gbDdgDisGoodsFatherId : entity.gbDgNxFatherId,
      gbDdgDepGoodsName: name,
      gbDdgShowStandardName: showStd,
      gbDdgDepGoodsDetail: d.gbDdgDepGoodsDetail || entity.gbDgGoodsDetail || '',
      gbDdgOrderRemark: d.gbDdgOrderRemark || '',
      gbDdgOrderStandard: d.gbDdgOrderStandard,
      gbDisGoodsFile: file,
      gbDistributerGoodsEntity: entity,
      gbDepartmentGoodsStockEntities: stocks,
      gbDepartmentOrdersEntity: d.gbDepartmentOrdersEntity || null,
      gbDgControlFresh: d.gbDgControlFresh != null ? d.gbDgControlFresh : 0,
      gbDgFreshWasteHour: d.gbDgFreshWasteHour,
    };
  },

  /**
   * AI 添加商品页「完成」回调：回到本页后打开部门订货弹窗（走 createDepartmentOrderForJj 分支需 depGoods 非空）
   */
  applyAiAddedGoodsForOrder: function (gbDistributerGoods, gbDepartmentDisGoods) {
    var gb = gbDistributerGoods || null;
    var ddg = gbDepartmentDisGoods || null;
    if (ddg && gb) {
      var row = this._buildDepGoodsRowFromAiAdd(gb, ddg);
      var list = this.data.depGoodsArrAi && this.data.depGoodsArrAi.length ? this.data.depGoodsArrAi.slice() : [];
      list.unshift(row);
      var depTabCount = "tabsSearch[0].amount";
      var patch = {};
      patch[depTabCount] = list.length;
      patch.depGoodsArrAi = list;
      patch.searchResult = true;
      patch.tab1IndexSearch = 0;
      patch.itemIndexSearch = 0;
      var offs = this.data.sliderOffsetsSearch || [];
      patch.sliderOffsetSearch = offs.length ? offs[0] : 0;
      patch.index = 0;
      patch.depGoods = row;
      patch.showDep = true;
      patch.editApply = false;
      patch.applyNumber = "";
      var ent = row.gbDistributerGoodsEntity || {};
      patch.applyStandardName = row.gbDdgOrderStandard || ent.gbDgGoodsStandardname || "";
      patch.applyRemark = row.gbDdgOrderRemark || "";
      patch.canSave = true;
      patch.hasStock = row.gbDepartmentGoodsStockEntities.length > 0;
      patch.isSearching = false;
      this.setData(patch);
      return;
    }
    if (gb) {
      this.setData({
        item: gb,
        itemDis: gb,
        depGoods: null,
        show: true,
        isSearching: false,
        applyStandardName: gb.gbDgGoodsStandardname || "",
        addNewGoods: true,
      });
    }
  },

  // ========================
  // 订货操作 - 我的商品（depGoodsArrAi）
  // ========================

  /** 点击订货按钮（我的商品 tab） */
  applyGoodsDep: function (e) {
    var depGoods = e.currentTarget.dataset.depgoods;
    var standard = "";
    if (e.currentTarget.dataset.depgoods.gbDdgOrderStandard) {
      standard = e.currentTarget.dataset.depgoods.gbDdgOrderStandard
    } else {
      standard = e.currentTarget.dataset.depgoods.gbDgGoodsStandardname;
    }
    this.setData({
      index: e.currentTarget.dataset.index,
      depGoods: e.currentTarget.dataset.depgoods,
      showDep: true,
      applyStandardName: standard,
      applyRemark: depGoods.gbDdgOrderRemark,
      canSave: true,
      placeHolder: this.data.searchString,
      hasStock: depGoods.gbDepartmentGoodsStockEntities.length > 0,
    });
  },



  toEditApplyDep(e) {
    var applyItem = e.currentTarget.dataset.order;
    var itemStatus = applyItem.gbDoBuyStatus;
    if (itemStatus > 1) {
      wx.showModal({
        title: "不能修改",
        content: "订单在配送中，如果有变化，请与采购员联系.",
        showCancel: false,
        confirmText: "知道了",
        success: function (res) {
          if (res.cancel) {
            //点击取消           
          } else if (res.confirm) {}
        }
      })
    } else {
      this.setData({
        index: e.currentTarget.dataset.index,
        applyItem: e.currentTarget.dataset.order,
        show: true,
        applyStandardName: applyItem.gbDoStandard,
        editApply: true,
        applyNumber: applyItem.gbDoQuantity,
        applyRemark: applyItem.gbDoRemark,
        depGoods: e.currentTarget.dataset.depgoods,
      })
    }
  },

  confirmDep(e) {
    if (this.data.editApply) {
      this._updateDisOrderDep(e);
    } else {
      this._saveOrderDep(e);
    }
    var ordercount = this.data.orderCount;
    this.setData({
      showDep: false,
      editApply: false,
      applyItem: "",
      applyNumber: "",
      applyStandardName: "",
      applyRemark: "",
      orderCount: ordercount + 1,
      depGoods: null,
    });
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

    if (e.currentTarget.dataset.depgoods !== null && e.currentTarget.dataset.depgoods.gbDepartmentGoodsStockEntities.length > 0) {

      this.setData({
        hasStock: true
      })
    } else {
      this.setData({
        hasStock: false
      })
    }



  },

  /** 总部标准商品只负责推荐，保存仍复用原部门商品/批发商商品订货入口。 */
  applyHeadquartersStandardGoods: function (e) {
    var recommended = e.currentTarget.dataset.goods || {};
    var disGoods = {
      gbDistributerGoodsId: recommended.distributerGoodsId,
      gbDgGoodsName: recommended.goodsName,
      gbDgGoodsStandardname: recommended.standardName,
      gbDgGoodsStandardWeight: recommended.standardWeight,
      gbDgDfgGoodsFatherId: recommended.distributerGoodsFatherId,
      gbDgNxFatherImg: recommended.imagePath,
      gbDgPullOff: 0
    };
    if (recommended.departmentGoodsExists) {
      var depGoods = {
        gbDepartmentDisGoodsId: recommended.departmentDisGoodsId,
        gbDdgDisGoodsId: recommended.distributerGoodsId,
        gbDdgDisGoodsFatherId: recommended.distributerGoodsFatherId,
        gbDdgDepGoodsName: recommended.goodsName,
        gbDdgShowStandardName: recommended.standardName,
        gbDdgOrderStandard: recommended.standardName,
        gbDepartmentGoodsStockEntities: [],
        gbDistributerGoodsEntity: disGoods
      };
      this.setData({
        depGoods: depGoods,
        itemDis: disGoods,
        index: Number(e.currentTarget.dataset.index || 0),
        showDep: true,
        applyStandardName: recommended.standardName || '',
        applyRemark: '',
        canSave: true,
        hasStock: false
      });
      return;
    }
    this.setData({
      depGoods: null,
      itemDis: disGoods,
      nxGoods: null,
      index: Number(e.currentTarget.dataset.index || 0),
      show: true,
      applyStandardName: recommended.standardName || '',
      applyRemark: '',
      canSave: true,
      hasStock: false
    });
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
      nxGoods: e.currentTarget.dataset.nxgoods,
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
      nxGoods: null,
      orderCount: ordercount + 1
    });
  },

  /** 取消订单编辑弹窗 */
  cancle: function () {
    this.setData({
      show: false,
      showDep: false,
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

  /**
   * 修改配送申请
   * @param {} e 
   */
  _updateDisOrderDep(e) {
    var that = this;
    var dg = {
      id: that.data.applyItem.gbDepartmentOrdersId,
      weight: e.detail.applyNumber,
      standard: e.detail.applyStandardName,
      remark: e.detail.applyRemark,
      gbDoDsStandardScale: this._gbDoDsStandardScaleForOuterPack(e.detail.applyStandardName),
    };
    load.showLoading("修改订单");
    orderApi.updateOrderGbJj(dg).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        load.hideLoading();
        wx.setStorageSync('needRefreshOrderData', true);

        var data = "depGoodsArrAi[" + this.data.index + "].gbDepartmentOrdersEntity";
        this.setData({
          [data]: res.result.data,
        })


        this.cancle();
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: "none"
        })
      }
    })
  },

  /**
   * 选中外包装单位（nxGoodsCartonUnit）时，gbDoDsStandardScale 使用 nxGoodsItemsPerCarton（每件外包装含基准规格数量）；否则 -1。
   */
  _gbDoDsStandardScaleForOuterPack: function (applyStandardName) {
    var nx = this.data.nxGoods;
    if (!nx || typeof nx !== "object") {
      return -1;
    }
    var cartonUnit = nx.nxGoodsCartonUnit != null ? String(nx.nxGoodsCartonUnit).trim() : "";
    var std = applyStandardName != null ? String(applyStandardName).trim() : "";
    if (!cartonUnit || std !== cartonUnit) {
      return -1;
    }
    var ipc = nx.nxGoodsItemsPerCarton;
    if (ipc === undefined || ipc === null || ipc === "") {
      return -1;
    }
    var n = Number(ipc);
    if (!isFinite(n) || n <= 0) {
      return -1;
    }
    return n;
  },


  /** 保存新订单 */
  _saveOrder: function (e) {
    var arriveDate = dateUtils.getArriveDate(0);
    var arriveOnlyDate = dateUtils.getArriveOnlyDate(0);
    var weekYear = dateUtils.getArriveWeeksYear(0);
    var week = dateUtils.getArriveWhatDay(0);
    var depDisGoodsId = -1;
    var gbDisGoodsId = -1;
    var gbGoodsId = "";
    var gbGoodsFatherId = "";
   
    if (this.data.depGoods !== null) {
      gbDisGoodsId = this.data.depGoods.gbDdgDisGoodsId;
      // gbDisGoodsFatherId = this.data.depGoods.gbDdgDisGoodsFatherId;
      depDisGoodsId = this.data.depGoods.gbDepartmentDisGoodsId;

    } else {
      if (this.data.itemDis !== null) {
        gbDisGoodsId = this.data.itemDis.gbDistributerGoodsId;
      }
      if(this.data.nxGoods !== null){
        gbGoodsId = this.data.nxGoods.nxGoodsId;
        gbGoodsFatherId = this.data.nxGoods.nxGoodsFatherId;
      }
      
    }

    var dg = {
      gbDoOrderUserId: this.data.userInfo.gbDepartmentUserId,
      gbDoDepDisGoodsId: depDisGoodsId, //
      gbDoDisGoodsId: gbDisGoodsId, //
      gbDoDepartmentId: this.data.depId,
      gbDoDistributerId: this.data.disId,
      gbDoToDepartmentId: this.data.depInfo.gbDepartmentFatherId,
      gbDoDepartmentFatherId: this.data.depInfo.gbDepartmentFatherId,
      gbDoQuantity: e.detail.applyNumber,
      gbDoStandard: e.detail.applyStandardName,
      gbDoRemark: e.detail.applyRemark,
      gbDoIsAgent: 0,
      gbDoArriveDate: arriveDate,
      gbDoArriveWeeksYear: weekYear,
      gbDoArriveOnlyDate: arriveOnlyDate,
      gbDoArriveWhatDay: week,
      gbDoNxGoodsId: gbGoodsId,
      gbDoNxGoodsFatherId: gbGoodsFatherId,
      gbDoDsStandardScale: this._gbDoDsStandardScaleForOuterPack(e.detail.applyStandardName),
      stockIsZero: e.detail.stockIsZero,

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
    orderApi[methodName](dg).then(function (res) {
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
    orderApi.updateOrderGbJj(dg).then(function (res) {
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


  /**
   * 删除订货
   */
  delApplyDep() {
    this.setData({
      warnContent: this.data.depGoods.gbDdgDepGoodsName + "  " + this.data.applyItem.gbDoQuantity + this.data.applyItem.gbDoStandard,
      deleteShow: true,
      show: false,
      popupType: 'deleteOrder',
      showPopupWarn: true,
      showOperationGoods: false,
      showOperationLinshi: false
    })
    this.setData({
      showOperationGoods: false,
      showOperationLinshi: false
    })
    this.hideModal();
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
    var order = this.data.applyItem;
    autoOrderDelete.chooseDeleteMode(order).then(function (cancelAutoOrder) {
      this._deleteYes(cancelAutoOrder);
    }.bind(this)).catch(function (err) {
      if (!err || !err.cancelled) {
        wx.showToast({ title: '请选择删除方式', icon: 'none' });
      }
    });
  },

  _deleteYes: function (cancelAutoOrder) {
    var that = this;
    orderApi.deleteOrderGb(this.data.applyItem.gbDepartmentOrdersId, cancelAutoOrder).then(function (res) {
      if (res.result.code == 0) {
        that.getSearchStringPlaceHolder();
        that.setData({
          // searchString: "",
          applyNumber: "",
          applyStandardName: "",
          applyItem: "",
          editApply: false,
          isSearching: true,
        });

        // if (that.data.itemIndexSearch == 0) {
        //   var data = "depGoodsArrAi[" + that.data.index + "].gbDepartmentOrdersEntity";
        //   that.setData({ [data]: null });
        //   // 缓存订单删除信息
        //   var updatedOrderInfo = {
        //     gbDepartmentDisGoodsId: that.data.depGoodsArrAi[that.data.index].gbDepartmentDisGoodsId,
        //     gbDepartmentOrdersEntity: null,
        //     operationType: 'delete'
        //   };
        //   wx.setStorageSync('newOrderInfo', updatedOrderInfo);
        //   wx.setStorageSync('needRefreshOrderData', true);
        // }
        // if (that.data.itemIndexSearch == 1) {
        //   var data1 = "disSearchArr[" + that.data.index + "].gbDepartmentOrdersEntity";
        //   that.setData({ [data1]: null });
        //   var updatedOrderInfo = {
        //     nxGoodsId: that.data.disSearchArr[that.data.index].nxGoodsId,
        //     gbDepartmentOrdersEntity: null,
        //     operationType: 'delete'
        //   };
        //   wx.setStorageSync('newOrderInfo', updatedOrderInfo);
        //   wx.setStorageSync('needRefreshOrderData', true);
        // }
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
    var order = this.data.applyItem;
    autoOrderDelete.chooseDeleteMode(order).then(function (cancelAutoOrder) {
      this._deleteApplyApi(cancelAutoOrder);
    }.bind(this)).catch(function (err) {
      if (!err || !err.cancelled) {
        wx.showToast({ title: '请选择删除方式', icon: 'none' });
      }
    });
  },

  _deleteApplyApi: function (cancelAutoOrder) {
    var that = this;
    orderApi.deleteOrderGb(this.data.applyItem.gbDepartmentOrdersId, cancelAutoOrder).then(function (res) {
      if (res.result.code == 0) {
        that.getSearchStringPlaceHolder();
        that.setData({
          // searchString: "",
          applyNumber: "",
          applyStandardName: "",
          applyItem: "",
          editApply: false,
          isSearching: true,
        });

        // if (that.data.tab1IndexSearch == 0) {
        //   var data = "depGoodsArrAi[" + that.data.index + "].gbDepartmentOrdersEntity";
        //   that.setData({ [data]: null });
        // }
        // if (that.data.tab1IndexSearch == 1) {
        //   var data1 = "disSearchArr[" + that.data.index + "].gbDepartmentOrdersEntity";
        //   that.setData({ [data1]: null });
        // }
        // that._cancle();
      }
    });
  },

  // ========================
  // 标准规格
  // ========================

  /** 保存新的配送标准规格 */
  confirmStandard: function (e) {
    var goodsId;
    // myDismodalDep (我的商品) 组件触发时，使用 depGoods 的数据
    if (this.data.showDep) {
      goodsId = this.data.depGoods ? this.data.depGoods.gbDdgDisGoodsId : undefined;
    } else {
      // myDismodal (商品目录) 组件触发时，使用 itemDis 的数据
      goodsId = this.data.itemDis ? this.data.itemDis.gbDistributerGoodsId : undefined;
    }

    if (!goodsId) {
      wx.showToast({ title: '商品信息缺失，无法保存标准', icon: 'none' });
      return;
    }

    var data = {
      gbDsDisGoodsId: goodsId,
      gbDsStandardName: e.detail.newStandardName,
    };
    orderApi.gbDisSaveStandard(data).then(function (res) {
      if (res.result.code == 0) {
        if (this.data.showDep) {
          // 更新 depGoods 和 depGoodsArrAi[index] 的标准列表
          var standardArr = (this.data.depGoods.gbDistributerStandardEntities || []).slice();
          standardArr.push(res.result.data);
          var depIndexKey = "depGoodsArrAi[" + this.data.index + "].gbDistributerStandardEntities";
          this.setData({
            'depGoods.gbDistributerStandardEntities': standardArr,
            [depIndexKey]: standardArr,
            applyStandardName: res.result.data.gbDsStandardName,
          });
        } else {
          // 更新 itemDis 的标准列表
          var standardArr = this.data.itemDis.gbDistributerStandardEntities;
          standardArr.push(res.result.data);
          var standards = "itemDis.gbDistributerStandardEntities";
          this.setData({
            [standards]: standardArr,
            applyStandardName: res.result.data.gbDsStandardName,
          });
        }
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
    orderApi.saveNxStandard(data).then(function (res) {
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
    orderApi.gbDisDeleteStandard(this.data.disStandardId).then(function (res) {
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

  // 


  _saveOrderDep: function (e) {

    var arriveDate = dateUtils.getArriveDate(0);
    var arriveOnlyDate = dateUtils.getArriveOnlyDate(0);
    var weekYear = dateUtils.getArriveWeeksYear(0);
    var week = dateUtils.getArriveWhatDay(0);
    var depDisGoodsId = -1;
    var gbDisGoodsId = -1;
    var gbDisGoodsFatherId = -1;
    var gbGoodsId = "";
    var gbGoodsFatherId = "";
    var gbDisId = -1;
    var gbDisGoodsId = -1;
    var price = null;
    var weight = null;
    var subtotal = 0;
    var goodsType = "";


    if (this.data.depGoods !== null) {
      gbDisGoodsId = this.data.depGoods.gbDdgDisGoodsId;
      gbDisGoodsFatherId = this.data.depGoods.gbDdgDisGoodsFatherId;
      depDisGoodsId = this.data.depGoods.gbDepartmentDisGoodsId;

    }


    var dg = {
      gbDoOrderUserId: this.data.userInfo.gbDepartmentUserId,
      gbDoDepDisGoodsId: depDisGoodsId, //
      gbDoDisGoodsId: gbDisGoodsId, //
      gbDoDisGoodsFatherId: gbDisGoodsFatherId,
      gbDoDepartmentId: this.data.depId,
      gbDoToDepartmentId: this.data.depInfo.gbDepartmentFatherId,
      gbDoDistributerId: this.data.disId,
      gbDoDepartmentFatherId: this.data.depInfo.gbDepartmentFatherId,
      gbDoQuantity: e.detail.applyNumber,
      gbDoPrice: price,
      gbDoWeight: weight,
      gbDoSubtotal: subtotal,
      gbDoStandard: e.detail.applyStandardName,
      gbDoRemark: e.detail.applyRemark,
      gbDoIsAgent: 0,
      gbDoArriveDate: arriveDate,
      gbDoArriveWeeksYear: weekYear,
      gbDoArriveOnlyDate: arriveOnlyDate,
      gbDoArriveWhatDay: week,
      gbDoNxGoodsId: gbGoodsId,
      gbDoNxGoodsFatherId: gbGoodsFatherId,
      gbDoNxDistributerGoodsId: gbDisGoodsId,
      gbDoNxDistributerId: gbDisId,
      gbDoGoodsType: goodsType,
      gbDoOrderType: goodsType,
      gbDoDsStandardScale: this._gbDoDsStandardScaleForOuterPack(e.detail.applyStandardName),
      stockIsZero: e.detail.stockIsZero,

    };
    load.showLoading("保存订单");
    orderApi.createDepartmentOrderForJj(dg).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        load.hideLoading();

        wx.setStorageSync('needRefreshOrderData', true);

        var data = "depGoodsArrAi[" + this.data.index + "].gbDepartmentOrdersEntity";

        var dataGoods = "depGoodsArrAi[" + this.data.index + "].gbDistributerGoodsEntity";

        this.setData({
          [data]: res.result.data,
          [dataGoods]: res.result.data.gbDistributerGoodsEntity,
        })
        if(e.detail.stockIsZero){
          var dataStock = "depGoodsArrAi[" + this.data.index + "].gbDepartmentGoodsStockEntities";
          this.setData({
            [dataStock]: [],
          })
        }

      } else {
        wx.showToast({
          title: '订单保存失败',
          icon: 'none'
        })
      }
    })

  },

  // ========================
  // 库存操作
  // ========================

  /** 显示库存详情弹窗 */
  
  // stock business
  showStock(e) {
    var item = e.currentTarget.dataset.item;
    item.gbDistributerGoodsEntity = e.currentTarget.dataset.goods.gbDistributerGoodsEntity;
    var goodsIndex = e.currentTarget.dataset.goodsindex;
    var stockIndex = e.currentTarget.dataset.stockindex;
    if (item.gbDgsWasteFullTime != null && item.gbDgsWasteFullTime != '' && item.gbDgsWasteFullTime != undefined) {
      var endTime = item.gbDgsWasteFullTime;
      var startTime = this.data.nowTime;
      var endTimeFormat = endTime.replace(/-/g, '/') //所有的- 都替换成/
      var endTimeDown = Date.parse(new Date(endTimeFormat));
      var startTimeFormat = startTime.replace(/-/g, '/') //所有的- 都替换成/
      var startTimeDown = Date.parse(new Date(startTimeFormat));
      var thisResult = Number(endTimeDown) - Number(startTimeDown);
      thisResult = Math.floor(thisResult / 1000 / 60 / 60);

      if (thisResult < 0) { // 超过废弃时间
        var restWeight = item.gbDgsRestWeight;
        item.gbDgsMyWasteWeight = restWeight;
        item.gbDgsMyProduceWeight = "0";
        this.setData({
          canWaste: true,
          canSure: true,
          showType: 4,
        })
      } else {
        item.gbDgsMyProduceWeight = item.gbDgsRestWeight;
        this.setData({
          canWaste: false,
          resultTime: thisResult,
          canSure: true,
          showType: 1
        })
      }
    } else {
      item.gbDgsMyProduceWeight = item.gbDgsRestWeight;
      this.setData({

        canWaste: false,
        canSure: true,
        showType: 1
      })
    }

    this.setData({
      showStock: true,
      item: item,
      consultItem: JSON.parse(JSON.stringify(item)),
      depGoods: e.currentTarget.dataset.goods,
      goodsIndex: goodsIndex,
      stockIndex: stockIndex,

    })
  },

  confirmStock(e) {
    var item = e.detail.item;
    var showType = e.detail.showType;
    if (this.data.transfer !== '1') {
      item.gbDgsReduceWeightUserId = this.data.userInfo.gbDepartmentUserId;
    }

    var kind = stockReduceKind.kindFromShowType(showType);
    if (!kind) {
      return;
    }

    if (showType == 2 || showType == 3) {
      this.setData({
        src: e.detail.src,
        reason: e.detail.reason,
      });
    }
    if (showType == 3) {
      item.gbDgsReturnUserId = this.data.userInfo.gbDepartmentUserId;
    }

    var that = this;
    load.showLoading("保存数据中");
    orderApi.saveDepGoodsStockAdjust(kind, item).then(function (res) {
      load.hideLoading();
      if (res.result.code != 0) {
        wx.showToast({
          title: res.result.msg,
          icon: 'none',
        });
        return;
      }

      var payload = res.result.data || {};
      var disGoods = payload.disGoods != null ? payload.disGoods : payload;
      var dataKey = "depGoodsArrAi[" + that.data.goodsIndex + "]";
      that.setData({
        [dataKey]: disGoods,
      });

      if (showType == 2 || showType == 3) {
        var src = that.data.src;
        if (src && src.length > 0 && payload.id != null && payload.id !== "") {
          var reason = that.data.reason;
          orderApi.reduceAttachmentSaveWithFile(src, reason, payload.id).then(function (attachRes) {
            if (attachRes.result != '{"code":0}') {
              wx.showToast({
                title: (attachRes.result && attachRes.result.msg) || "附件上传失败",
                icon: "none",
              });
            }
          });
        }
      }
    });
  },


  /** 上传附件（损耗/退货后如有图片） */
  _uploadAttachmentIfNeeded: function (stockId) {
    var that = this;
    var src = that.data.src;
    if (src && src.length > 0) {
      var reason = that.data.reason;
      orderApi.reduceAttachmentSaveWithFile(src, reason, stockId).then(function (res) {
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
      imageUrl = '/images/logo.png';
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

  /** 跳转到 AI 添加商品页（预填搜索关键词为商品名称） */
  toAddGoods: function () {
    wx.navigateTo({
      url: '../disAddGoods/disAddGoods?goodsName=' + this.data.placeHolder,
    });
    
    // wx.navigateTo({
    //   url: '../aiAddGoods/aiAddGoods?goodsName=' + encodeURIComponent(name),
    // });
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
