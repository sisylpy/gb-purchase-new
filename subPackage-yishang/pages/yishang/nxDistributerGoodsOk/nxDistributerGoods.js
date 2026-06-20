var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
import apiUrl from '../../../../config'
var dateUtils = require('../../../../utils/dateUtil');

let scrollDdirection = 0; // 用来计算滚动的方向
let heightArrDis = [0];

import {
  saveOrdersGbJjAndSaveGoodsSx,
  saveOrdersGbJjAndSaveDepGoodsSx,
  saveGbOrderJjSx,
  updateOrderGbJjSx,
  deleteOrderGb,
} from '../../../../lib/apiDepOrder.js'


import {
  nxDepGetDisCataGoodsGb,
  nxDepGetDisFatherGoodsGb,
  nxDepGetDisFatherGoodsByGrandIdGb,

} from '../../../../lib/apiDistributerGb'

import {
  disSaveStandard
}from '../../../../lib/apiDistributer'

Page({

  onShow() {

      // 推荐直接用新API
      let windowInfo = wx.getWindowInfo();
      let globalData = getApp().globalData;
      this.setData({
        windowWidth: windowInfo.windowWidth * globalData.rpxR,
        windowHeight: windowInfo.windowHeight * globalData.rpxR,
        navBarHeight: globalData.navBarHeight * globalData.rpxR,
        statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      });
  
  

   
      if(this.data.leftGreatId !== ""  && this.data.update){
        this._getFatherGoods();
      }
     
    
  },


  data: {
    applyNumber: "",
    applyRemark: "",
    applyStandardName: "",
    applySubtotal: "",
    item: {},
    maskHeight: "",
    navBarHeight: "",
    windowHeight: "",
    windowWidth: "",
    deleteShow: false,
    chooseSize: false,
    depGoods: null,
    itemDis: null,
    item: null,


    grandList: [],
    fatherArr: [],
    leftGreatId: "",
    greatName: "",

    totalPage: 0,
    totalCount: 0,
    limit: 15,
    currentPage: 1,
    isLoading: false,
    leftIndex: 0,
    rightId: 'right0',
    // leftView: 0,
    searchFather: false,

    selectedSub: 0, // 选中的分类
    scrollHeight: 0, // 滚动视图的高度
    scrollTopLeft: 0,
    //
    showGoodsModal: false,
    showInd: false,
    item: "",
    depGoods: null,
    update: false,
    editApply: false,
    goodsList: [],
    index: "",
    showAllSubCat: false,
    activeSubCatId: '', // 当前激活的分类ID
    scrollIntoView: '', // 滚动到指定分类
    categoryPositions: [], // 存储分类位置信息
  },



  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

    this.setData({
      url: apiUrl.server,
    })


    var disInfo = wx.getStorageSync('disInfo');
    if (disInfo) {
      this.setData({
        disInfo: disInfo,
        disId: disInfo.gbDistributerId,
        toDepId: disInfo.appSupplierDepartment.gbDepartmentId,
      })
    }
    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo
      })
    }

    var depValue = wx.getStorageSync('depInfo');
    if (depValue) {
      this.setData({
        depInfo: depValue,
        depId: depValue.gbDepartmentId,
        disId: depValue.gbDepartmentDisId
      })
      if (this.data.depInfo.gbDepartmentFatherId == 0) {
        this.setData({
          depFatherId: this.data.depInfo.gbDepartmentId,
        })
      } else {
        this.setData({
          depFatherId: this.data.depInfo.gbDepartmentFatherId,
         
        })

      }
    }


    this.initDisData();
  },

  showDialogBtn: function (e) {
    console.log("showbdidia", e.currentTarget.dataset.nxgoods);
    this.setData({
      item: e.currentTarget.dataset.nxgoods,
      showInd: true,
      windowHeight: this.data.windowHeight,
      windowWidth: this.data.windowWidth

    })

  },

  hideModal: function () {
    this.setData({
      showModal: false
    });

  },

  // /////



  /**
   * 获取右边每个分类的头部偏移量，并缓存
   */
  lisenerScroll() {
    // 检查是否已经计算过偏移量，如果计算过则跳过
    if (this.data.depGoodsArr.every(item => item.offsetTop !== undefined)) {
      return; // 如果偏移量已经计算过，直接返回
    }

    let query = wx.createSelectorQuery();
    // 批量查询
    this.data.depGoodsArr.forEach((_, i) => {
      query.select(`#position${i}`).boundingClientRect();
    });
    query.exec(res => {
      // 将偏移量缓存到每个商品项中
      this.data.depGoodsArr.forEach((item, index) => {
        item.offsetTop = res[index].top;
      });

      // 更新数据
      this.setData({
        depGoodsArr: this.data.depGoodsArr,
        scrollInfo: res // 保存计算后的偏移量
      });
    });
  },

  
  // 节流函数，控制滚动事件的触发频率
  throttle(func, wait) {
    let timeout;
    return function (...args) {
      if (!timeout) {
        timeout = setTimeout(() => {
          func.apply(this, args);
          timeout = null;
        }, wait);
      }
    };
  },


  // 

  initDisData() {
    load.showLoading("获取商品")
    var that = this;
    var data = {
      nxDisId: this.data.disInfo.nxDistributerEntity.nxDistributerId,
      gbDisId: this.data.disId,
      gbDepFatherId: this.data.depFatherId
    }
    nxDepGetDisCataGoodsGb(data).then(res => {
      if (res.result.code == 0) {
        console.log(res.result.data);
        load.hideLoading();
        var newId = res.result.data[0].fatherGoodsEntities[0].nxDistributerFatherGoodsId;
        this.setData({
          grandList: res.result.data,
          fatherArr: res.result.data[0].fatherGoodsEntities,
          leftGreatId: res.result.data[0].nxDistributerFatherGoodsId,
          selectedSubCategoryId: res.result.data[0].fatherGoodsEntities[0].nxDistributerFatherGoodsId,
          activeSubCatId: newId,
          greatName: res.result.data[0].nxDfgFatherGoodsName,
          fatherSonsIndex: 0,
        
        })
        that._getFatherGoods();
      }
    })
  },

  

// 点击标签事件
onSubCatTap(e) {
  const subCatId = e.currentTarget.dataset.id;
  const hasGoods = this.data.goodsList.some(item => String(item.nxDgDfgGoodsGrandId) === String(subCatId));
  this.setData({
    showAllSubCat: false,
    activeSubCatId: String(subCatId),
    subcatScrollIntoView: `subcat-${subCatId}`
  });
  if (hasGoods) {
    // 已有商品，直接滚动
    this.setData({
      scrollIntoView: `cat-${subCatId}`
    });
  } else {
   
      this.loadGoodsBySubCatId(subCatId, this.data.currentPage, this.data.goodsList);

  }
},


loadGoodsBySubCatId(subCatId, page = 1, accumulatedGoods = []) {
  console.log('[拉取二级分类商品] subCatId:', subCatId, 'page:', page);
  nxDepGetDisFatherGoodsGb({
    gbDisId: this.data.disId,
    gbDepId: this.data.depId,
    fatherId: this.data.leftGreatId,
    limit: this.data.limit,
    page: page
  }).then(res => {
    console.log('[拉取二级分类商品] 接口返回:', res);
    if (res.result.code == 0) {
      const newGoods = res.result.page.list || [];
      const allGoods = accumulatedGoods.concat(newGoods);
      // 累计目标父类商品
      const targetGoods = allGoods.filter(item => String(item.nxDgDfgGoodsGrandId) === String(subCatId));
      const hasEnough = targetGoods.length >= this.data.limit;
      console.log('[拉取二级分类商品] 当前累计目标商品数:', targetGoods.length, 'limit:', this.data.limit, 'hasEnough:', hasEnough);

      if (hasEnough) {
        // 拉够一页，渲染并滚动
        const processed = this.processGoodsList(allGoods);
        this.setData({
          goodsList: processed,
          currentPage: page + 1,
          totalPage: res.result.page.totalPage,
          totalCount: res.result.page.totalCount,
          scrollIntoView: `cat-${subCatId}`
        });
        setTimeout(() => this.calculateCategoryPositions(), 100);
      } else if (page < res.result.page.totalPage) {
        // 没拉够且还有下一页，递归拉取
        this.loadGoodsBySubCatId(subCatId, page + 1, allGoods);
      } else {
        // 全部拉完也没拉够
        this.setData({
          goodsList: this.processGoodsList(allGoods),
          currentPage: page + 1,
          totalPage: res.result.page.totalPage,
          totalCount: res.result.page.totalCount
        });
        wx.showToast({ title: '该分类下商品不足一页', icon: 'none' });
      }
    } else {
      wx.showToast({ title: '商品加载失败', icon: 'none' });
    }
  });
},


onGoodsScroll(e) {
  // 节流略
  const query = wx.createSelectorQuery();
  query.selectAll('.product-item').boundingClientRect();
  query.select('.goods-list').boundingClientRect();
  query.exec((res) => {
    if (res[0] && res[1]) {
      const productRects = res[0];
      const listRect = res[1];
      // 找到第一个可见商品
      let minDiff = Infinity;
      let firstVisibleIndex = 0;
      for (let i = 0; i < productRects.length; i++) {
        const diff = productRects[i].top - listRect.top;
        if (diff >= 0 && diff < minDiff) {
          minDiff = diff;
          firstVisibleIndex = i;
        }
      }
      const firstVisibleItem = this.data.goodsList[firstVisibleIndex];
      if (firstVisibleItem) {
        const activeId = firstVisibleItem.nxDgDfgGoodsGrandId;
        if (activeId && activeId !== this.data.activeSubCatId) {
          this.setData({
             activeSubCatId: activeId,
            subcatScrollIntoView: `subcat-${activeId}`
          });
        }
      }
    }
  });
},




  toggleSubCat() {
    this.setData({
      showAllSubCat: !this.data.showAllSubCat
    });
  },

  changeGreatGrand(e) {
    console.log(e);
    const categoryId = e.currentTarget.dataset.id;
    if (categoryId !== this.data.leftGreatId) {
      this.setData({
        leftGreatId: categoryId,
        leftIndex: e.currentTarget.dataset.index,
        goodsList: [],
        currentPage: 1,
        totalPage: 1,
        isLoading: false,
        greatName: e.currentTarget.dataset.name,
        fatherArr: this.data.grandList[e.currentTarget.dataset.index].fatherGoodsEntities,
        selectedSubCategoryId: this.data.grandList[e.currentTarget.dataset.index].fatherGoodsEntities[0].nxDistributerFatherGoodsId,
        searchFather: false,
        searchId: "",
      });
      this._getFatherGoods();
    }

  },


  _getFatherGoods() {
    const data = {
      gbDisId: this.data.disId,
      gbDepId: this.data.depId,
      fatherId: this.data.leftGreatId,
      limit: this.data.limit,
      page: this.data.currentPage,
    };
    
    nxDepGetDisFatherGoodsGb(data).then(res => {
      if (res.result.code == 0) {
        const processedList = this.processGoodsList(res.result.page.list);
        var subCatId = this.data.activeSubCatId;
        this.setData({
          goodsList: processedList,
          currentPage: this.data.currentPage + 1,
          totalPage: res.result.page.totalPage,
          totalCount: res.result.page.totalCount,

          subcatScrollIntoView: `subcat-${subCatId}`,
          scrollIntoView: `cat-${subCatId}` // 右侧商品区锚点
        }, () => {
          // 数据更新后计算分类位置
          this.calculateCategoryPositions();
        });
      }
    });
  },


  calculateSubCategoryHeights() {
    const query = wx.createSelectorQuery();
    query.selectAll('.product-item').boundingClientRect();
    query.exec((res) => {
      if (res && res[0]) {
        const heights = [];
        let accumulatedHeight = 0;
        res[0].forEach((item) => {
          accumulatedHeight += item.height;
          heights.push(accumulatedHeight);
        });
        this.setData({
          subCategoryHeights: heights,
        });
      }
    });
  },



  onScrollToLower: function () {
    // 防止重复请求
    if (this.data.isLoading || this.data.goodsList.length >= this.data.totalCount) return;

    this.setData({
      isLoading: true
    });

    const {
      currentPage,
      totalPage,
      searchFather,
      leftGreatId,
      depFatherId,
      limit
    } = this.data;

    // 确保非搜索模式，并且当前页数未超过总页数
    if (!searchFather && currentPage <= totalPage) {
      const data = {
        limit: limit,
        page: currentPage,
        fatherId: leftGreatId,
        gbDisId: this.data.disId,
        gbDepId: this.data.depId,
      };

      nxDepGetDisFatherGoodsGb(data)
        .then((res) => {
          if (res.result.code == 0) {
            const newItems = res.result.page.list || [];
            const updatedGoodsList = [...this.data.goodsList, ...newItems];

            // 更新当前页和商品列表
            this.setData({
              goodsList: updatedGoodsList,
              currentPage: currentPage + 1,
              totalPage: res.result.page.totalPage,
              totalCount: res.result.page.totalCount,
              isLoading: false,
            });

            // 如果已达到 totalCount，停止加载
            if (updatedGoodsList.length >= this.data.totalCount) {
              this.setData({
                isLoading: false
              });
            }

          } else {
            wx.showToast({
              title: '获取商品失败',
              icon: 'none'
            });
            this.setData({
              isLoading: false
            });
          }
        })
        .catch(() => {
          wx.showToast({
            title: '加载错误，请稍后再试',
            icon: 'none'
          });
          this.setData({
            isLoading: false
          });
        });
    } else {
      this.setData({
        isLoading: false
      });
    }
  },




  // 


  /**
   * 配送申请，换订货规格
   * @param {*} e 
   */
  changeStandard: function (e) {
    this.setData({
      applyStandardName: e.detail.applyStandardName,
      canSave: true,
    })
  },

  // 
  applyGoods(e) {
    var item = e.currentTarget.dataset.item;
    if (e.currentTarget.dataset.disgoods !== null) {
      this.setData({
        depGoods: e.currentTarget.dataset.depgoods,
      })
    }
    this.setData({
      // fatherIndex: e.currentTarget.dataset.fatherindex,
      // grandIndex: e.currentTarget.dataset.grandindex,
      index: e.currentTarget.dataset.index,
      item: e.currentTarget.dataset.item,
      itemDis: e.currentTarget.dataset.disgoods,
      show: true,
      applyStandardName: e.currentTarget.dataset.standard,
      level: e.currentTarget.dataset.level,
      applySubtotal: "0.0元",
      canSave: false,
    })
  },

  toEditApply(e) {
    console.log("contoEditApplytoEditApply")
    var applyItem = e.currentTarget.dataset.order;
    console.log("arritme", e)
    var itemStatus = applyItem.nxDoPurchaseStatus;
    applyItem.disgoods = e.currentTarget.dataset.disgoods;
    if (itemStatus > 2) {
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
        canSave: false,
      })
     console.log("cansaveee", this.data.canSave)
      if (this.data.applyItem.nxDoSubtotal !== null) {
        console.log("eidididiiidid");
        this.setData({
          applySubtotal: applyItem.nxDoSubtotal + "元"
        })
      }
      var levelPrice = this.data.item.nxDgWillPriceTwo;
      if(levelPrice !== null && levelPrice !== '0.1'){
        var doStandard = applyItem.nxDoStandard;
        var levelTwoStandard = this.data.item.nxDgWillPriceTwoStandard;
        console.log("dostandmd", doStandard , "levtowsttandd", levelTwoStandard)
        if(doStandard == levelTwoStandard){
          this.setData({
            level: 2
          })
        }else{
          this.setData({
            level : 1
          })
        }
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
    var price = "";
   
    var weight = e.detail.applyNumber;
    var depDisGoodsId = -1;
    var gbDisGoodsId = -1;
    var gbDisGoodsFatherId = -1;
    var subtotal = "0.1";
    var goodsType = "";
    var toDepId = "";
    var printStandard = "";

    if(this.data.level == "1"){
      printStandard = this.data.item.nxDgGoodsStandardname;
    }else{
      printStandard = this.data.item.nxDgWillPriceTwoStandard;
    }

    if (e.detail.applyStandardName == this.data.item.nxDgGoodsStandardname) {
      subtotal = (Number(weight) * Number(this.data.item.nxDgWillPrice)).toFixed(1);
      price = this.data.item.nxDgWillPrice;
    }else {
      if(this.data.item.nxDgWillPriceTwo !== null && this.data.item.nxDgWillPriceTwo > 0 && e.detail.applyStandardName == this.data.item.nxDgWillPriceTwoStandard){
        subtotal = (Number(weight) * Number(this.data.item.nxDgWillPriceTwo)).toFixed(1);
        price = this.data.item.nxDgWillPriceTwo;
      }
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
      gbDoPrintStandard: printStandard,

    };
    console.log(dg);
    if (this.data.itemDis == null) {
      load.showLoading("保存订单");
      saveOrdersGbJjAndSaveGoodsSx(dg).then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
        
          var newGoods = res.result.data.gbDistributerGoodsEntity;
          var data = "goodsList[" + this.data.index + "].nxDepartmentOrdersEntity";
          var dataDis = "goodsList[" + this.data.index + "].gbDistributerGoodsEntity";
          this.setData({
            [data]: res.result.data,
            [dataDis]: newGoods,
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
          load.hideLoading();
          if (res.result.code == 0) {
           
            var data = "goodsList[" + this.data.index + "].nxDepartmentOrdersEntity";
            this.setData({
              [data]: res.result.data
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
          
            var data = "goodsList[" + this.data.index + "].nxDepartmentOrdersEntity";
            this.setData({
              [data]: res.result.data
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
      
          var data = "goodsList[" + this.data.index + "].nxDepartmentOrdersEntity";
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

    deleteOrderGb(this.data.applyItem.nxDoGbDepartmentOrderId).then(res => {
      if (res.result.code == 0) {
        var data1 = "goodsList[" + this.data.index + "].nxDepartmentOrdersEntity";
        this.setData({
          [data1]: null,
          editApply: false,
        })

      }
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
          applySubtotal: "无"

        })
      }else{
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },


  toSearchGoodsJJ(){
    
    wx.navigateTo({
      url: '../nxDistributerGoodsSearch/nxDistributerGoodsSearch',
    })

  },  






  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },

  // 处理商品数据，添加分类信息
  processGoodsList(list) {
    // 先按分类ID排序
    list.sort((a, b) => a.nxDgDfgGoodsGrandId - b.nxDgDfgGoodsGrandId);
    let currentCategory = null;
    return list.map(item => {
      if (item.nxDgDfgGoodsGrandId !== currentCategory) {
        currentCategory = item.nxDgDfgGoodsGrandId;
        return {
          ...item,
          isFirstInCategory: true,
          categoryName: this.getCategoryName(item.nxDgDfgGoodsGrandId)
        };
      }
      return {
        ...item,
        isFirstInCategory: false,
        categoryName: this.getCategoryName(item.nxDgDfgGoodsGrandId)
      };
    });
  },


  // 计算分类位置
  calculateCategoryPositions() {
    const query = wx.createSelectorQuery();
    query.selectAll('.goods-category-title').boundingClientRect();
    query.select('.goods-list').boundingClientRect();
    
    query.exec((res) => {
      if (res[0] && res[1]) {
        const listRect = res[1];
        const positions = res[0].map(item => ({
          id: item.id.replace('cat-', ''),
          top: item.top - listRect.top
        }));
        
        this.setData({ categoryPositions: positions });
      }
    });
  },

  // 获取分类名称
  getCategoryName(categoryId) {
    const category = this.data.fatherArr.find(item => 
      item.nxDistributerFatherGoodsId === categoryId
    );
    return category ? category.nxDfgFatherGoodsName : '';
  },
})
