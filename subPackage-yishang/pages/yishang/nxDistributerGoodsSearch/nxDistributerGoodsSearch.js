var load = require('../../../../lib/load.js');

const globalData = getApp().globalData;
var config = require('../../../../config/index.js');
var dateUtils = require('../../../../utils/dateUtil');
let windowWidth = 0;
let itemWidth = 0;
let heightArr = [0];

import {
  saveOrdersGbJjAndSaveGoodsSx,
  saveOrdersGbJjAndSaveDepGoodsSx,
  saveGbOrderJjSx,
  updateOrderGbJjSx,
  deleteOrderGb,
  queryDepDisGoodsByQuickSearchJj,
} from '../../../lib/apiDepOrder.js';

import {
  disSaveStandard
} from '../../../lib/apiDistributer.js';

Page({
  data: {

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


  },


  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: config.server,
      
    })

    var disInfo = wx.getStorageSync('disInfo') || {};
    var mendianInfo = wx.getStorageSync('mendianInfo') || {};
    var toDepId = null;
    var supplierDep = disInfo.appSupplierDepartment;

    if (supplierDep && supplierDep.gbDepartmentId) {
      toDepId = supplierDep.gbDepartmentId;
    } else if (mendianInfo.gbDepartmentId) {
      toDepId = mendianInfo.gbDepartmentId;
    } else if (mendianInfo.gbDepartmentEntityList && mendianInfo.gbDepartmentEntityList.length > 0) {
      toDepId = mendianInfo.gbDepartmentEntityList[0].gbDepartmentId;
    }

    if (disInfo.gbDistributerId || toDepId) {
      this.setData({
        disInfo: disInfo.gbDistributerId ? disInfo : null,
        disId: disInfo.gbDistributerId || null,
        toDepId: toDepId,
      });
    }

    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
        userInfo: value,
      })
    } else {
      this.setData({
        userInfo: null,
      })
    }

    var depValue = wx.getStorageSync('depInfo');
    if (depValue) {
      this.setData({
        depInfo: depValue,
        depId: depValue.gbDepartmentId,
      })
      if (this.data.depInfo.nxDepartmentFatherId == 0) {
        this.setData({
          depFatherId: this.data.depInfo.gbDepartmentId,
        })
      } 
      else {
        this.setData({
          depFatherId: this.data.depInfo.gbDepartmentFatherId,
         
        })

      }
    }
   
  

  },

  showDialogBtn: function (e) {

    console.log("showDialogBtnshowDialogBtn",e)
    this.setData({
      item: e.currentTarget.dataset.nxgoods,
      showInd: true,
      windowHeight: this.data.windowHeight,
      windowWidth: this.data.windowWidth

    })

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


  /**
   * 配送申请，换订货规格
   * @param {*} e 
   */
  changeStandard: function (e) {
    this.setData({
      applyStandardName: e.detail.applyStandardName
    })
  },


  toEditApply(e) {
    console.log("contoEditApplytoEditApply")
    var applyItem = e.currentTarget.dataset.order;
    var itemStatus = applyItem.nxDoPurchaseStatus;
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
        placeHolder: this.data.searchString,
        applyItem: e.currentTarget.dataset.order,
        show: true,
        applyStandardName: applyItem.nxDoStandard,
        itemDis: e.currentTarget.dataset.disgoods,
        editApply: true,
        applyNumber: applyItem.nxDoQuantity,
        applyRemark: applyItem.nxDoRemark,
        index: e.currentTarget.dataset.index,

      })

      if (this.data.applyItem.nxDoSubtotal !== null) {
        console.log("eidididiiidid");
        this.setData({
          applySubtotal: applyItem.nxDoSubtotal + "元"
        })

      }

    }
  },


  // 保存订货订单
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
    })
    console.log("this.daordocudnnd", this.data.orderCount)
  },

  showTishi() {
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
  },


  // 
  applyGoodsDep(e) {
    var depGoods = e.currentTarget.dataset.depgoods;
    this.setData({
      index: e.currentTarget.dataset.index,
      itemDis: e.currentTarget.dataset.disgoods,
      depGoods: e.currentTarget.dataset.depgoods,
      show: true,
      applyStandardName: depGoods.nxDdgOrderStandard,
      // applyNumber: depGoods.nxDdgOrderQuantity,
      applyRemark: depGoods.nxDdgOrderRemark,
      canSave: true,
      placeHolder: this.data.searchString,
    })

  },

  applyGoods(e) {
    var item = e.currentTarget.dataset.item;
    console.log("applyGoods--3eeeee", e);
    if (e.currentTarget.dataset.disgoods !== null) {
      this.setData({
        depGoods: e.currentTarget.dataset.depgoods,
      })
    }
    console.log(e);
    this.setData({
      // fatherIndex: e.currentTarget.dataset.fatherindex,
      // grandIndex: e.currentTarget.dataset.grandindex,
      index: e.currentTarget.dataset.index,
      item: e.currentTarget.dataset.item,
      itemDis: e.currentTarget.dataset.disgoods,
      show: true,
      applyStandardName: item.nxDgGoodsStandardname,
      applySubtotal: "0.0元",
      canSave: false,
      placeHolder: this.data.searchString,
    })

  },



  toEditApply(e) {
    console.log("contoEditApplytoEditApply")
    var applyItem = e.currentTarget.dataset.order;
    console.log("arritme", e)
    var itemStatus = applyItem.nxDoPurchaseStatus;
    applyItem.disgoods = e.currentTarget.dataset.disgoods;
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
        applyItem: e.currentTarget.dataset.order,
        show: true,
        applyStandardName: applyItem.nxDoStandard,
        item: e.currentTarget.dataset.item,
        itemDis: e.currentTarget.dataset.disgoods,
        editApply: true,
        applyNumber: applyItem.nxDoQuantity,
        applyRemark: applyItem.nxDoRemark,
        index: e.currentTarget.dataset.index,
        canSave: true,
      })
     console.log("cansaveee", this.data.canSave)
      if (this.data.applyItem.nxDoSubtotal !== null) {
        console.log("eidididiiidid");
        this.setData({
          applySubtotal: applyItem.nxDoSubtotal + "元"
        })

      }

    }
  },


  // 保存订货订单
  confirm: function (e) {
    if (this.data.editApply) {
      this._updateDisOrder(e);
    } else {
      this._saveOrder(e);
    }

    this.setData({
      show: false,
      editApply: false,
      applyItem: "",
      item: "",
      applyNumber: "",
      applyStandardName: "",
    })
  },

  showTishi() {
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
  },



  _saveOrder: function (e) {
    console.log("eee==", e);
    var arriveDate = dateUtils.getArriveDate(0);
    var arriveOnlyDate = dateUtils.getArriveOnlyDate(0);
    var weekYear = dateUtils.getArriveWeeksYear(0);
    var week = dateUtils.getArriveWhatDay(0);
    var nxGoodsId = this.data.item.nxDgNxGoodsId;
    var nxGoodsFatherId = this.data.item.nxDgNxFatherId;
    var nxDisId = this.data.disInfo.nxDistributerEntity.nxDistributerId;
    var nxDisGoodsId = this.data.item.nxDistributerGoodsId;
    var price = this.data.item.nxDgWillPrice;;
    
   
    var weight = e.detail.applyNumber;
    var depDisGoodsId = -1;
    var gbDisGoodsId = -1;
    var gbDisGoodsFatherId = -1;
    var subtotal = null;
    var goodsType = "";
    var toDepId = "";

    if (e.detail.applyStandardName == this.data.item.nxDgGoodsStandardname) {
      subtotal = (Number(weight) * Number(this.data.item.nxDgWillPrice)).toFixed(1);
    }

    if (this.data.itemDis !== null) {
      gbDisGoodsId = this.data.itemDis.gbDistributerGoodsId;
      gbDisGoodsFatherId = this.data.itemDis.gbDgDfgGoodsFatherId;
      nxGoodsFatherId = this.data.itemDis.gbDgNxFatherId;
      toDepId = this.data.itemDis.gbDgGbDepartmentId;
      goodsType = this.data.itemDis.gbDgGoodsType;
     
    } else {
      goodsType = 2;
      toDepId = this.data.toDepId;
    }

    var userId = "";
    if (this.data.userInfo !== null) {
      userId = this.data.userInfo.gbDepartmentUserId;
    }

    if (this.data.depGoods !== null) {
      depDisGoodsId = this.data.depGoods.gbDepartmentDisGoodsId;
    }

    var dg = {
      gbDoOrderUserId: userId,
      gbDoDepDisGoodsId: depDisGoodsId, //
      gbDoDisGoodsId: gbDisGoodsId, //
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
      gbDoIsAgent: 0,
      gbDoArriveDate: arriveDate,
      gbDoArriveWeeksYear: weekYear,
      gbDoArriveOnlyDate: arriveOnlyDate,
      gbDoArriveWhatDay: week,
      gbDoNxGoodsId: nxGoodsId,
      gbDoNxGoodsFatherId: nxGoodsFatherId,
      gbDoNxDistributerGoodsId: nxDisGoodsId,
      gbDoNxDistributerId: nxDisId,
      gbDoGoodsType: goodsType,
      gbDoOrderType: 5,
      gbDoDsStandardScale: -1,
      stockIsZero: e.detail.stockIsZero,

    };
    console.log(dg);
    if (this.data.itemDis == null) {
      load.showLoading("保存订单");
      saveOrdersGbJjAndSaveGoodsSx(dg).then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          var newGoods = res.result.data.gbDistributerGoodsEntity;
          var data = "disSearchArr[" + this.data.index + "].nxDepartmentOrdersEntity";
          var dataDis = "disSearchArr[" + this.data.index + "].gbDistributerGoodsEntity";
          this.setData({
            [data]: res.result.data,
            [dataDis]: newGoods,
            isSearching: true,

          })
         

        } else {
          wx.showToast({
            title: '订单保存失败',
            icon: 'none'
          })
        }
      })
    } else {
      if (this.data.depGoods == null) {
        load.showLoading("保存订单");
        saveOrdersGbJjAndSaveDepGoodsSx(dg).then(res => {
          if (res.result.code == 0) {
           load.hideLoading();
            var data = "disSearchArr[" + this.data.index + "].nxDepartmentOrdersEntity";
            this.setData({
              [data]: res.result.data,
              isSearching: true,
            })
          
          } else {
            wx.showToast({
              title: '订单保存失败',
              icon: 'none'
            })
          }
        })
      } else {
        load.showLoading("保存订单");
        saveGbOrderJjSx(dg).then(res => {
          load.hideLoading();
          if (res.result.code == 0) {
        
            var data = "disSearchArr[" + this.data.index + "].nxDepartmentOrdersEntity";
            this.setData({
              [data]: res.result.data,
              isSearching: true,
            })
            
          } else {
            wx.showToast({
              title: '订单保存失败',
              icon: 'none'
            })
          }
        })
      }

    }

  },

  /**
   * 修改配送申请
   * @param {} e 
   */
  _updateDisOrder(e) {
    var that = this;
    var dg = {
      id: that.data.applyItem.nxDepartmentOrdersId,
      weight: e.detail.applyNumber,
      standard: e.detail.applyStandardName,
      remark: e.detail.applyRemark,
    };

    updateOrderGbJjSx(dg).then(res => {
      load.showLoading("修改订单")
      if (res.result.code == 0) {
        load.hideLoading();
      
          var data = "disSearchArr[" + this.data.index + "].nxDepartmentOrdersEntity";
          this.setData({
            [data]: res.result.data
          })
        
       
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
   * 删除订货
   */
  
    delApply() {
     
      console.log("dellapapally")
      this.setData({
        warnContent: this.data.itemDis.gbDgGoodsName + "  " + this.data.applyItem.nxDoQuantity + this.data.applyItem.nxDoStandard,
        deleteShow: true,
        show: false,
        popupType: 'deleteOrder',
        showPopupWarn: true,
        placeHolder: this.data.searchString,
      })
      this.setData({
        showOperationGoods: false,
        showOperationLinshi: false
      })
      // this.hideModal();
    
  
  },


  closeWarn() {
    this.setData({
      applyItem: "",
      warnContent: "",
      show: false,
      popupType: '',
      showPopupWarn: false,
    })
  },



  confirmWarn() {
    if (this.data.popupType == 'deleteSpec') {
      this.deleteStandardApi()
    } else {
      this.deleteApplyApi()
    }
  },

  deleteApplyApi() {

    this.setData({
      popupType: "",
      showPopupWarn: false,
    })

    var that = this;
    deleteOrderGb(this.data.applyItem.nxDoGbDepartmentOrderId).then(res => {
      if (res.result.code == 0) {
        var data1 = "disSearchArr[" + this.data.index + "].nxDepartmentOrdersEntity";
        this.setData({
          [data1]: null,
          editApply: false,
          deleteShow: false
        })

      }
    })
  },



  toAddGoods() {
    this.setData({
      placeHolder: this.data.searchString
    })
    wx.navigateTo({
      url: '../disAddGoods/disAddGoods?goodsName=' + this.data.placeHolder,
    })

  },


  confirmStandard(e) {
    console.log(e);
    console.log("confirmStandardconfirmStandardconfirmStandard")
    var data = {
      nxDsDisGoodsId: this.data.item.nxDistributerGoodsId,
      nxDsStandardName: e.detail.newStandardName,
    }
    disSaveStandard(data).
    then(res => {
      if (res.result.code == 0) {
        var standardArr = this.data.item.nxDistributerStandardEntities;
        standardArr.push(res.result.data);
        var standards = "item.nxDistributerStandardEntities"
        this.setData({
          [standards]: standardArr,
          applyStandardName: res.result.data.nxDsStandardName,
        })
      }else{
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },

  /**
   * 删除订货
   */




  delSearch() {
    var str = this.data.searchString;
    if (str.length > 0) {
      this.setData({
        searchString: str.slice(0, -1),

      })
      this.getSearchString()
    }

  },


  searchApplyDisGoods(e) {
    var pullOff = e.currentTarget.dataset.pulloff;
    if (pullOff == 1) {
      wx.showToast({
        title: '暂时不能订货',
        icon: 'none'
      })
    } else {
      this.setData({
        show: true,
        index: e.currentTarget.dataset.index,
        itemDis: e.currentTarget.dataset.item,
        applyStandardName: e.currentTarget.dataset.item.nxDgGoodsStandardname,
      })
      if (this.data.tab1IndexSearch == 0) {
        this.setData({
          depGoods: e.currentTarget.dataset.depgoods,
        })
      } else {
        this.setData({
          depGoods: e.currentTarget.dataset.item.departmentDisGoodsEntity,
        })
      }
    }
  },


  getString(e){
    console.log("searchindindidnid");
   
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
        disId: this.data.disInfo.nxDistributerEntity.nxDistributerId,
        searchStr: this.data.searchString,
        depId: this.data.depInfo.gbDepartmentId,
        gbDisId: this.data.disId
      }
      load.showLoading("搜索商品中...")
      queryDepDisGoodsByQuickSearchJj(data).then(res => {
        if (res.result.code == 0) {
          console.log(res.result.data);
          load.hideLoading();
          this.setData({
            disSearchArr: res.result.data.dis,
            searchResult: true,
            searchString: ""
          })
        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })

        }
      })
    } else {
      console.log("thisd.ata.dfasslenene===0")
      load.hideLoading();
      var resCom = "tabsSearch[1].amount";
      var res = "tabsSearch[0].amount";
      that.setData({
        disSearchArr: [],
        depSearchArr: [],
        [resCom]: "0",
        [res]: "0",
        searchResult: false,
        searchString: ""
      })
    }
  },



  /**
   * 修改配送商品申请
   */
  editApply() {
    var applyItem = this.data.applyItem;
    this.setData({
      show: true,
      applyStandardName: applyItem.nxDoStandard,
      itemDis: this.data.applyItem.nxDistributerGoodsEntity,
      editApply: true,
      applyNumber: applyItem.nxDoQuantity,
      applyRemark: applyItem.nxDoRemark,

    })
    if (applyItem.nxDoSubtotal !== null) {
      console.log("eidididiiidid");
      this.setData({
        applySubtotal: applyItem.nxDoSubtotal + "元"
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

  // no use


  getSearchStringPlaceHolder() {

    var that = this;
    console.log("hpalslhdolddller");
    console.log(that.data.placeHolder.length);
    if (that.data.placeHolder.length > 0 ) {

      var data = {
        disId: this.data.disInfo.nxDistributerEntity.nxDistributerId,
        searchStr: this.data.placeHolder,
        depId: this.data.depInfo.gbDepartmentId,
        gbDisId: this.data.disId
      }
      load.showLoading("搜索商品中...")
      queryDepDisGoodsByQuickSearchJj(data).then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          this.setData({
            disSearchArr: res.result.data.dis,
            searchResult: true,
          })
       
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



  hideMask() {
    this.setData({
      showOperation: false,
    })
  },


  toBack() {
    wx.navigateBack({
      delta: 1
    })
  },

  onUnload(){
    if(this.data.orderCount > 0){
      var pages = getCurrentPages();
      var prevPage = pages[pages.length - 2]; //上一个页面
      //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
      prevPage.setData({
        update: true
      })
    }
  }

})
