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
} = require('../../../../services/depOrder');
import pasteDepListCache from '../../../../lib/pasteDepListCache';

const { removeOrderFromPasteDepList, isSameOrder } = pasteDepListCache;

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

  

    var value = wx.getStorageSync('applyItem');
    if (value) {
      this.setData({
        disId: value.gbDoDistributerId,
        applyItem: value,
        depId: value.gbDoDepartmentId,
        searchString:value.gbDoGoodsName,
        depFatherId: value.gbDoDepartmentFatherId
      })
    }

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      from: options.from,
      orderPasteIndex: options.orderPasteIndex
    })

    
    this.clueOffsetSearch();
    this.getSearchString();
    

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



  // 
  applyGoodsDep(e) {
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
    var applyItem = this.data.applyItem;
    this.setData({
      placeHolder: this.data.searchString,
      index: e.currentTarget.dataset.index,
      itemDis: e.currentTarget.dataset.disgoods,
      nxGoods: e.currentTarget.dataset.nxgoods,
      depGoods: e.currentTarget.dataset.depgoods,
      canSave: true,

      applyStandardName: applyItem.gbDoStandard,
      itemDis: e.currentTarget.dataset.disgoods,
      searchString: this.data.placeHolder,
      applyNumber: applyItem.gbDoQuantity,
      applyRemark: applyItem.gbDoRemark,
    })
    
    if (e.currentTarget.dataset.disgoods == null) {
      this.setData({
        showNx: true,      
        applyStandardName: e.currentTarget.dataset.nxgoods.nxGoodsStandardname,
      })
    } else {
      

      if(e.currentTarget.dataset.disgoods.gbDgPullOff  == 1){
        wx.showToast({
          title: '停止订货',
          icon: 'none'
        })
    
      }else{
        this.setData({
          show: true,
          applyStandardName: e.currentTarget.dataset.disgoods.gbDgGoodsStandardname,
          
        })
      }
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
        this._delApplyItem();
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


  _clearPasteDepListCache() {
    return removeOrderFromPasteDepList({
      depId: this.data.depId,
      orderId: this.data.applyItem && this.data.applyItem.gbDepartmentOrdersId,
      applyItem: this.data.applyItem,
    });
  },

  _buildFormalOrder(original) {
    const savedOrder = this.data.orderItem;
    if (!savedOrder) {
      return Object.assign({}, original, { gbDoStatus: 0 });
    }
    return Object.assign({}, original, savedOrder, {
      gbDoStatus: savedOrder.gbDoStatus != null ? savedOrder.gbDoStatus : 0,
    });
  },

  _replaceMatchedOrder(orderArr) {
    const applyItem = this.data.applyItem;
    if (!applyItem) return orderArr || [];

    const arr = (orderArr || []).slice();
    const index = Number(this.data.orderPasteIndex);
    if (index >= 0 && index < arr.length && isSameOrder(arr[index], applyItem)) {
      arr[index] = this._buildFormalOrder(arr[index]);
      return arr;
    }

    const pos = arr.findIndex(o => isSameOrder(o, applyItem));
    if (pos >= 0) {
      arr[pos] = this._buildFormalOrder(arr[pos]);
    }
    return arr;
  },

  _syncPastePageAfterMatch() {
    const applyItem = this.data.applyItem;
    if (!applyItem) return;

    const pasteDepList = this._clearPasteDepListCache();
    const pages = getCurrentPages();
    const pastePage = pages.find(p => (p.route || '').indexOf('order/paste/paste') !== -1);

    const syncPage = (page, orderArr) => {
      const savedCount = orderArr.filter(item => item.gbDoStatus !== -2).length;
      const updates = {
        orderArr,
        pasteDepList,
        saveCount: savedCount > 0 ? savedCount : page.data.saveCount,
      };
      if (orderArr.length === 0) {
        updates.saveCount = null;
        updates.pasteDepIndex = -1;
      }
      page.setData(updates);
      if (typeof page._updateNewGoodsCount === 'function') {
        page._updateNewGoodsCount(orderArr);
      }
      if (typeof page._updateHasUnsavedOrders === 'function') {
        page._updateHasUnsavedOrders(orderArr);
      }
      if (orderArr.length > 0 && typeof page._saveToStorage === 'function') {
        page._saveToStorage(orderArr);
      }
    };

    if (pastePage) {
      syncPage(pastePage, this._replaceMatchedOrder(pastePage.data.orderArr));
      return;
    }

    if (this.data.from === 'paste') {
      const prevPage = pages[pages.length - 2];
      if (!prevPage) return;
      syncPage(prevPage, this._replaceMatchedOrder(prevPage.data.orderArr));
    }
  },

  _delApplyItem() {
    const id = this.data.applyItem.gbDepartmentOrdersId;

    deleteOrderGb(id).then(res => {
      if (res.result.code != 0) return;

      this._syncPastePageAfterMatch();

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
    
    wx.navigateTo({
      url: '../disAddGoods/disAddGoods?goodsName=' + this.data.placeHolder,
    })

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
    var str = this.data.searchString;
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
   
    if (this.data.searchString.length > 0) {
      this.setData({
        placeHolder: this.data.searchString,
       
      })
      var data = {
        disId: this.data.disId,
        searchStr: this.data.searchString,
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


  toAddGoods(e){
    this.setData({
      applyNumber: this.data.applyItem.gbDoQuantity,
      canSave: true,
      gbDoPrintStandard: this.data.applyItem.gbDoStandard,
    })
    wx.navigateTo({
      url: '../pasteAddGoods/pasteAddGoods?name=' + this.data.applyItem.gbDoGoodsName + 
      '&standard=' + this.data.applyItem.gbDoStandard + '&depFatherId=' + this.data.depFatherId
       + '&depId=' + this.data.depId ,
    })
  },

})


