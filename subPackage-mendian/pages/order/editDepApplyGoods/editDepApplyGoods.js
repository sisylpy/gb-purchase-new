var app = getApp();

const globalData = getApp().globalData;
import apiUrl from '../../../../config/index'
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil');

const {
  queryDepDisGoodsByQuickSearchGb,
  createDepartmentOrderForJj,
  createDepartmentOrderWithNewDepDisGoods,
  createDepartmentOrderFromNxGoodsImport,
  deleteOrderGb,
  gbDisSaveStandard,
  gbDisDeleteStandard,
  saveNxStandard,
} = require('../../../../services/depOrder');
import pasteDepListCache from '../../../../lib/pasteDepListCache';
var autoOrderDelete = require('../../../../utils/autoOrderDelete.js');

const { isSameOrder } = pasteDepListCache;

const SAVE_ORDER_API = {
  createDepartmentOrderForJj,
  createDepartmentOrderWithNewDepDisGoods,
  createDepartmentOrderFromNxGoodsImport,
};


let itemWidth = 0;

let windowWidth = 0;

Page({
  data:{
    deleteShow: false,
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
    searchString: '',
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
    applyNumber: "",
    url: "",
    nowTime: "",
    resultTime: "",
    showType: false,
    item: {},
    itemDis: "",
    nxGoods: {},
    showPopupWarn: false,
    popupType: '',
    warnContent: '',
    disStandardId: '',
  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

    var disInfo = wx.getStorageSync('disInfo');
    if(disInfo){
      this.setData({
        disInfo: disInfo
      })
    }

    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({ userInfo });
    }

  

    if (options.from === 'paste') {
      wx.setStorageSync('editDepApplyFrom', 'paste');
    }
    var value = wx.getStorageSync('applyItem');
    var initialSearch = value && value.gbDoGoodsName ? String(value.gbDoGoodsName) : '';

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      from: options.from || wx.getStorageSync('editDepApplyFrom') || '',
      orderPasteIndex: options.orderPasteIndex,
      disId: value ? value.gbDoDistributerId : undefined,
      applyItem: value || null,
      depId: value ? value.gbDoDepartmentId : undefined,
      depFatherId: value ? value.gbDoDepartmentFatherId : undefined,
      searchString: initialSearch,
      placeHolder: initialSearch || this.data.placeHolder,
      applyNumber: value && value.gbDoQuantity != null && value.gbDoQuantity !== ''
        ? String(value.gbDoQuantity)
        : '',
      applyRemark: value && value.gbDoRemark ? value.gbDoRemark : '',
    }, () => {
      this.clueOffsetSearch();
      this.getSearchString();
    });

  },


  

  /**
   * 隐藏模态对话框
   */

  hideModal: function () {
    this.setData({
      showModal: false
    });

  },

  /**
   * 对话框取消按钮点击事件
   */

  onCancel: function () {
    this.hideModal();
  },

  /**
   * 对话框确认按钮点击事件
   */

  onConfirm: function () {
    this.hideModal();

  },



  // !!!!!!!!!!!!!!!!!!!search--------------------------------------
  /**
   * 计算偏移量
   */
  clueOffsetSearch() {
    var that = this;

    wx.getSystemInfo({
      success: function (res) {
        itemWidth = Math.ceil(res.windowWidth / that.data.tabsSearch.length);
        let tempArr = [];
        for (let i in that.data.tabsSearch) {
          tempArr.push(itemWidth * i);
        }
        // tab 样式初始化
        windowWidth = res.windowWidth;
        that.setData({
          sliderOffsetsSearch: tempArr,
          sliderOffsetSearch: tempArr[that.data.tab1IndexSearch],
          sliderLeftSearch: globalData.windowWidth / 8 ,
         
        });
      }
    });
  },

  /**
   * tabItme点击
   */
  onTab1ClickSearch(event) {
    let index = event.currentTarget.dataset.index;
    this.setData({
      sliderOffsetSearch: this.data.sliderOffsetsSearch[index],
      tab1IndexSearch: index,
      itemIndexSearch: index,
      showOperation: false
    })
    this.clueOffsetSearch();
  },

  swiperChangeSearch(event) {
    this.setData({
      sliderOffsetSearch: this.data.sliderOffsetsSearch[event.detail.current],
      tab1IndexSearch: event.detail.current,
      itemIndexSearch: event.detail.current,
    })
   
  },

  /**
   * 配送申请，换订货规格
   * @param {*} e 
   */
  changeStandard: function (e) {
    this.setData({
      applyStandardName: e.detail.applyStandardName
    })
  },

  _getOrderApplyDefaults() {
    const applyItem = this.data.applyItem || {};
    const quantity = applyItem.gbDoQuantity;
    return {
      applyNumber: quantity != null && quantity !== '' ? String(quantity) : '',
      applyRemark: applyItem.gbDoRemark || '',
      applyStandardName: applyItem.gbDoStandard || '',
    };
  },

  _isPasteTempApplyItem(applyItem) {
    const item = applyItem || this.data.applyItem;
    return !!(item && item.gbDepartmentOrdersId && Number(item.gbDoStatus) === -2);
  },

  confirmStandard: function (e) {
    var goodsId;
    if (this.data.depGoods) {
      goodsId = this.data.depGoods.gbDdgDisGoodsId;
    } else if (this.data.itemDis) {
      goodsId = this.data.itemDis.gbDistributerGoodsId;
    }

    if (!goodsId) {
      wx.showToast({ title: '商品信息缺失，无法保存规格', icon: 'none' });
      return;
    }

    var data = {
      gbDsDisGoodsId: goodsId,
      gbDsStandardName: e.detail.newStandardName,
    };

    gbDisSaveStandard(data).then(function (res) {
      if (res.result.code == 0) {
        var standardArr = (this.data.itemDis && this.data.itemDis.gbDistributerStandardEntities || []).slice();
        standardArr.push(res.result.data);
        this.setData({
          'itemDis.gbDistributerStandardEntities': standardArr,
          applyStandardName: res.result.data.gbDsStandardName,
        });
      } else {
        wx.showToast({ title: res.result.msg, icon: 'none' });
      }
    }.bind(this));
  },

  confirmStandardNx: function (e) {
    if (!this.data.nxGoods || !this.data.nxGoods.nxGoodsId) {
      wx.showToast({ title: '商品信息缺失，无法保存规格', icon: 'none' });
      return;
    }

    var data = {
      nxSGoodsId: this.data.nxGoods.nxGoodsId,
      nxStandardName: e.detail.newStandardName,
    };

    saveNxStandard(data).then(function (res) {
      if (res.result.code == 0) {
        var standardArr = (this.data.nxGoods.nxGoodsStandardEntities || []).slice();
        standardArr.push(res.result.data);
        this.setData({
          'nxGoods.nxGoodsStandardEntities': standardArr,
          applyStandardName: res.result.data.nxStandardName,
        });
      } else {
        wx.showToast({ title: res.result.msg, icon: 'none' });
      }
    }.bind(this));
  },

  delStandard: function (e) {
    this.setData({
      warnContent: e.detail.standardName,
      popupType: 'deleteSpec',
      showPopupWarn: true,
      disStandardId: e.detail.id,
    });
  },

  deleteStandardApi: function () {
    var that = this;
    gbDisDeleteStandard(this.data.disStandardId).then(function (res) {
      if (res.result.code == 0) {
        var standardArr = res.result.data.gbDistributerStandardEntities || [];
        that.setData({
          'itemDis.gbDistributerStandardEntities': standardArr,
          popupType: '',
          showPopupWarn: false,
          disStandardId: '',
        });
      } else {
        wx.showToast({ title: res.result.msg, icon: 'none' });
      }
    });
  },

  confirmWarn: function () {
    if (this.data.popupType === 'deleteSpec') {
      this.deleteStandardApi();
    }
  },

  onClosePopup: function () {
    this.setData({
      warnContent: '',
      popupType: '',
      showPopupWarn: false,
      disStandardId: '',
    });
  },



  // 
  applyGoodsDep(e) {
    var depGoods = e.currentTarget.dataset.depgoods;
    var disGoods = e.currentTarget.dataset.disgoods;
    var defaults = this._getOrderApplyDefaults();
    if (disGoods && !disGoods.gbDistributerStandardEntities) {
      disGoods.gbDistributerStandardEntities = [];
    }
    this.setData({
      index: e.currentTarget.dataset.index,
      itemDis: disGoods,
      depGoods: depGoods,
      show: true,
      applyStandardName: depGoods.gbDdgOrderStandard || defaults.applyStandardName,
      applyRemark: depGoods.gbDdgOrderRemark || defaults.applyRemark,
      applyNumber: defaults.applyNumber,
      canSave: !!defaults.applyNumber,
      placeHolder: this.data.searchString,
    })
    if (e.currentTarget.dataset.depgoods.gbDepartmentGoodsStockEntities.length > 0) {
      this.setData({
        hasStock: true
      })
    } else {
      this.setData({
        hasStock: false
      })
    }

  },

  applyGoods(e) {
    var defaults = this._getOrderApplyDefaults();
    var disGoods = e.currentTarget.dataset.disgoods;
    var nxGoods = e.currentTarget.dataset.nxgoods;
    if (disGoods && !disGoods.gbDistributerStandardEntities) {
      disGoods.gbDistributerStandardEntities = [];
    }
    if (nxGoods && !nxGoods.nxGoodsStandardEntities) {
      nxGoods.nxGoodsStandardEntities = [];
    }

    var basePatch = {
      placeHolder: this.data.searchString,
      index: e.currentTarget.dataset.index,
      itemDis: disGoods,
      nxGoods: nxGoods,
      depGoods: e.currentTarget.dataset.depgoods,
      applyNumber: defaults.applyNumber,
      applyRemark: defaults.applyRemark,
      searchString: this.data.placeHolder,
      canSave: !!defaults.applyNumber,
    };

    if (disGoods == null) {
      this.setData(Object.assign({}, basePatch, {
        showNx: true,
        applyStandardName: nxGoods.nxGoodsStandardname,
      }));
    } else if (disGoods.gbDgPullOff == 1) {
      wx.showToast({
        title: '停止订货',
        icon: 'none'
      });
      return;
    } else {
      this.setData(Object.assign({}, basePatch, {
        show: true,
        applyStandardName: disGoods.gbDgGoodsStandardname || defaults.applyStandardName,
      }));
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


  // 保存订货订单
  confirm: function (e) {
    this._saveOrder(e);

  },



  _gbDoDsStandardScaleForOuterPack(applyStandardName) {
    var nx = this.data.nxGoods;
    if (!nx || typeof nx !== 'object') {
      return -1;
    }
    var cartonUnit = nx.nxGoodsCartonUnit != null ? String(nx.nxGoodsCartonUnit).trim() : '';
    var std = applyStandardName != null ? String(applyStandardName).trim() : '';
    if (!cartonUnit || std !== cartonUnit) {
      return -1;
    }
    var ipc = nx.nxGoodsItemsPerCarton;
    if (ipc === undefined || ipc === null || ipc === '') {
      return -1;
    }
    var n = Number(ipc);
    if (!isFinite(n) || n <= 0) {
      return -1;
    }
    return n;
  },

  _saveOrder(e) {
    var arriveDate = dateUtils.getArriveDate(0);
    var arriveOnlyDate = dateUtils.getArriveOnlyDate(0);
    var weekYear = dateUtils.getArriveWeeksYear(0);
    var week = dateUtils.getArriveWhatDay(0);
    var depDisGoodsId = -1;
    var gbDisGoodsId = -1;
    var gbGoodsId = '';
    var gbGoodsFatherId = '';

    if (this.data.depGoods !== null) {
      gbDisGoodsId = this.data.depGoods.gbDdgDisGoodsId;
      depDisGoodsId = this.data.depGoods.gbDepartmentDisGoodsId;
    } else {
      if (this.data.itemDis !== null) {
        gbDisGoodsId = this.data.itemDis.gbDistributerGoodsId;
      }
      if (this.data.nxGoods !== null) {
        gbGoodsId = this.data.nxGoods.nxGoodsId;
        gbGoodsFatherId = this.data.nxGoods.nxGoodsFatherId;
      }
    }

    var orderUserId = (this.data.userInfo && this.data.userInfo.gbDepartmentUserId)
      || (this.data.applyItem && this.data.applyItem.gbDoOrderUserId);

    var dg = {
      gbDoOrderUserId: orderUserId,
      gbDoDepDisGoodsId: depDisGoodsId,
      gbDoDisGoodsId: gbDisGoodsId,
      gbDoDepartmentId: this.data.depId,
      gbDoDistributerId: this.data.disId,
      gbDoToDepartmentId: this.data.depFatherId,
      gbDoDepartmentFatherId: this.data.depFatherId,
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

    if (this._isPasteTempApplyItem()) {
      dg.gbDepartmentOrdersId = this.data.applyItem.gbDepartmentOrdersId;
    }

    if (this.data.itemDis == null) {
      this._saveOrderToBackend(dg, 'createDepartmentOrderFromNxGoodsImport');
    } else if (this.data.depGoods == null) {
      this._saveOrderToBackend(dg, 'createDepartmentOrderWithNewDepDisGoods');
    } else {
      this._saveOrderToBackend(dg, 'createDepartmentOrderForJj');
    }
  },

  _saveOrderToBackend(dg, methodName) {
    var saveFn = SAVE_ORDER_API[methodName];
    if (!saveFn) {
      wx.showToast({ title: '保存方式无效', icon: 'none' });
      return;
    }
    load.showLoading('保存订单');
    saveFn(dg).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        this.setData({ orderItem: res.result.data });
        wx.setStorageSync('needRefreshOrderData', true);
        if (this.data.from === 'paste' || this._isPasteTempApplyItem()) {
          this._finishPasteApplyItem(res.result.data);
        } else {
          this._delApplyItem();
        }
      } else {
        wx.showToast({
          title: (res.result && res.result.msg) || '订单保存失败',
          icon: 'none',
        });
      }
    }).catch(() => {
      load.hideLoading();
    });
  },


  _finishPasteApplyItem(savedOrder) {
    wx.removeStorageSync('editDepApplyFrom');
    this._syncPastePageAfterMatch(savedOrder);
    wx.navigateBack({ delta: 1 });
  },

  _mergeSavedOrderIntoList(orderArr, savedOrder) {
    const applyItem = this.data.applyItem;
    if (!applyItem) return orderArr || [];

    const next = (orderArr || []).slice();
    const matchedOrder = Object.assign({}, applyItem, savedOrder || {}, {
      gbDoStatus: savedOrder && savedOrder.gbDoStatus != null ? savedOrder.gbDoStatus : 0,
    });

    const index = Number(this.data.orderPasteIndex);
    if (index >= 0 && index < next.length && isSameOrder(next[index], applyItem)) {
      next[index] = matchedOrder;
      return next;
    }

    const foundIndex = next.findIndex(o => isSameOrder(o, applyItem));
    if (foundIndex >= 0) {
      next[foundIndex] = matchedOrder;
    }
    return next;
  },

  _syncPastePageAfterMatch(savedOrder) {
    const applyItem = this.data.applyItem;
    if (!applyItem) return;

    const pages = getCurrentPages();
    const pastePage = pages.find(p => (p.route || '').indexOf('order/paste/paste') !== -1);

    const syncPage = (page) => {
      const orderArr = this._mergeSavedOrderIntoList(page.data.orderArr, savedOrder);
      page.setData({ pasteDepList: page.data.pasteDepList });
      if (typeof page._afterOrderListChanged === 'function') {
        page._afterOrderListChanged(orderArr, page.data.orderSubmitted);
        return;
      }
      page.setData({ orderArr });
    };

    if (pastePage) {
      syncPage(pastePage);
      return;
    }

    if (this.data.from === 'paste') {
      const prevPage = pages[pages.length - 2];
      if (!prevPage) return;
      syncPage(prevPage);
    }
  },

  _delApplyItem() {
    const order = this.data.applyItem;
    autoOrderDelete.chooseDeleteMode(order).then(cancelAutoOrder => {
      this._deleteApplyItem(cancelAutoOrder);
    }).catch(err => {
      if (!err || !err.cancelled) {
        wx.showToast({ title: '请选择删除方式', icon: 'none' });
      }
    });
  },

  _deleteApplyItem(cancelAutoOrder) {
    const id = this.data.applyItem.gbDepartmentOrdersId;

    deleteOrderGb(id, cancelAutoOrder).then(res => {
      if (res.result.code != 0) return;

      wx.setStorageSync('needRefreshOrderData', true);
      wx.navigateBack({ delta: 1 });
    });
  },

  cancle() {
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
    })
  },



  toAddGoods() {
    const applyItem = this.data.applyItem || {};
    const goodsName = (this.data.searchString || applyItem.gbDoGoodsName || this.data.placeHolder || '').trim();
    if (!goodsName) {
      wx.showToast({ title: '请先输入商品名称', icon: 'none' });
      return;
    }

    let url = '../disAddGoods/disAddGoods?goodsName=' + goodsName;
    const standard = applyItem.gbDoStandard;
    if (standard) {
      url += '&standard=' + standard;
    }
    if (this.data.depId) {
      url += '&depId=' + this.data.depId;
    }
    if (this.data.depFatherId) {
      url += '&depFatherId=' + this.data.depFatherId;
    }

    wx.navigateTo({ url });
  },






  /**
   * 删除订货
   */
  delApply() {
    this.setData({
      deleteShow: true,
      showOperation: true,
      show: false,
      placeHolder: this.data.searchString,
    })
  },




  delSearch() {
    var str = this.data.searchString || '';
    if (str.length > 0) {
      this.setData({
        searchString: str.slice(0, -1),

      })
      this.getSearchString()
    }

  },


  getString(e){
   
      var string = e.detail.value;
      string = string.replace(/\s*/g, "");
      if(string.length > 0){
        this.setData({
          searchString: string
        })
      }else{
        this.setData({
          searchString: ""
        })
      }

  },

  getSearchString(e) {
    const searchString = (this.data.searchString || '').trim();

    if (searchString.length > 0) {
      this.setData({
        placeHolder: searchString,
       
      })
      var data = {
        disId: this.data.disId,
        searchStr: searchString,
        depId: this.data.depId
      }
      load.showLoading("搜索商品中...")
      queryDepDisGoodsByQuickSearchGb(data).then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
      
          var depTabCount = "tabsSearch[0].amount";
          var disTabCount = "tabsSearch[1].amount";
          var depGoodsLength = res.result.data.dep.length;

          this.setData({
            disSearchArr: res.result.data.dis,
            depSearchArr: res.result.data.dep,
            searchResult: true,
            [depTabCount]: res.result.data.dep.length,
            [disTabCount]: res.result.data.dis.length,
          })
         if(depGoodsLength == 0){
           this.setData({
             tab1IndexSearch: 1,
             itemIndexSearch: 1
           })
         }else{
          this.setData({
            tab1IndexSearch: 0,
            itemIndexSearch: 0
          })
         }
          
        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })

        }
      })
    } else {
      load.hideLoading();
      var resCom = "tabsSearch[1].amount";
      var res = "tabsSearch[0].amount";
      this.setData({
        disSearchArr: [],
        depSearchArr: [],
        [resCom]: "0",
        [res]: "0",
        searchResult: false,
        searchString: ""
      })
    }
  },




  _cancle() {
    this.setData({
      show: false,
      applyStandardName: "",
      itemDis: "",
      editApply: false,
      applyNumber: "",
      applyRemark: "",
      applySubtotal: ""
    })
  },


  getSearchStringPlaceHolder() {

    var that = this;
    if (that.data.placeHolder.length > 0 ) {

      var data = {
        disId: this.data.disId,
        searchStr: this.data.placeHolder,
        depId: this.data.depId
      }
      load.showLoading("搜索商品中...")
      queryDepDisGoodsByQuickSearchGb(data).then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          var depTabCount = "tabsSearch[0].amount";
          var disTabCount = "tabsSearch[1].amount";
          var depGoodsLength = res.result.data.dep.length;

          this.setData({
            disSearchArr: res.result.data.dis,
            depSearchArr: res.result.data.dep,
            searchResult: true,
            isSearching: true,
            [depTabCount]: res.result.data.dep.length,
            [disTabCount]: res.result.data.dis.length,
            searchString: "",
            placeHolder: this.data.searchString,
          })
         if(depGoodsLength == 0){
           this.setData({
             tab1IndexSearch: 1,
             itemIndexSearch: 1
           })
         }else{
          this.setData({
            tab1IndexSearch: 0,
            itemIndexSearch: 0
          })
         }
        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })

        }
      })
    } else {
      var resCom = "tabsSearch[1].amount";
      var res = "tabsSearch[0].amount";
      that.setData({
        [resCom]: 0,
        [res]: 0,
        depSearchArr: [],
        disSearchArr: [],
        searchResult: false,
        isSearching: true,

      })

    }
  },



  toBack() {
   
    wx.navigateBack({
      delta: 1,
    })
  },
  

   onUnload(){
    // wx.removeStorageSync('applyItem');
   },

})

