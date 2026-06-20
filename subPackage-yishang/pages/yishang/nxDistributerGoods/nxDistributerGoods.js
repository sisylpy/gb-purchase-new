var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
var config = require('../../../../config/index.js');
var dateUtils = require('../../../../utils/dateUtil');
var priceUtil = require('../../../../utils/priceUtil.js');
var platformCart = require('../../../../utils/platformCart.js');
var platformCartApi = require('../../../../services/platformCart.js');
var platformOrderApi = require('../../../../services/platformOrder.js');

let scrollDdirection = 0;
let heightArrDis = [0];

import {
  saveOrdersGbJjAndSaveGoodsSx,
  saveOrdersGbJjAndSaveDepGoodsSx,
  saveGbOrderJjSx,
  updateOrderGbJjSx,
  deleteOrderGb,
} from '../../../lib/apiDepOrder.js';

import {
  nxDepGetDisCataGoodsGb,
  nxDepGetDisFatherGoodsGb,
  nxDepGetDisFatherGoodsByGrandIdGb,
  gbDepGetDistibuterInfo,
} from '../../../lib/apiDistributerGb.js';

import {
  disSaveStandard
} from '../../../lib/apiDistributer.js';

Page({

  _resolveBuyerContext: function () {
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

    return {
      disInfo: disInfo,
      mendianInfo: mendianInfo,
      disId: disInfo.gbDistributerId || null,
      toDepId: toDepId
    };
  },

  _buildItemDisFromGoods: function (item) {
    if (!item) return null;
    if (item.gbDistributerGoodsEntity && item.gbDistributerGoodsEntity.gbDistributerGoodsId) {
      return item.gbDistributerGoodsEntity;
    }
    var gbId = item.gbDisGoodsId;
    if (gbId != null && gbId > 0) {
      return {
        gbDistributerGoodsId: gbId,
        gbDgDfgGoodsFatherId: item.gbDisGoodsFatherId,
        gbDgGoodsType: item.gbDisGoodsType,
        gbDgGbDepartmentId: item.gbDisGoodsToDepId,
        gbDgNxFatherId: item.nxDgNxFatherId,
        gbDgGoodsName: item.nxDgGoodsName,
      };
    }
    return null;
  },

  _syncDepartmentContext: function () {
    var mendianInfo = wx.getStorageSync('mendianInfo') || {};
    var userInfo = wx.getStorageSync('userInfo') || {};
    var orderDepInfo = wx.getStorageSync('orderDepInfo') || {};
    var ctx = this._resolveBuyerContext();
    var depId = this.data.depId;
    var depFatherId = this.data.depFatherId;

    if (orderDepInfo && orderDepInfo.gbDepartmentId) {
      depId = orderDepInfo.gbDepartmentId;
      depFatherId = orderDepInfo.gbDepartmentFatherId != null
        ? orderDepInfo.gbDepartmentFatherId
        : mendianInfo.gbDepartmentId;
    } else if (userInfo && userInfo.gbDuDepartmentId) {
      depId = userInfo.gbDuDepartmentId;
      depFatherId = userInfo.gbDuDepartmentFatherId != null
        ? userInfo.gbDuDepartmentFatherId
        : userInfo.gbDuDepartmentId;
    } else {
      var subDeps = mendianInfo.gbDepartmentEntityList || [];
      if (subDeps.length === 1) {
        depId = subDeps[0].gbDepartmentId;
      }
      if (!depId && mendianInfo.gbDepartmentId) {
        depId = mendianInfo.gbDepartmentId;
      }
      if (!depFatherId && mendianInfo.gbDepartmentId) {
        depFatherId = mendianInfo.gbDepartmentId;
      }
    }

    var patch = {
      mendianInfo: mendianInfo,
      depId: depId,
      depFatherId: depFatherId,
      toDepId: ctx.toDepId,
      userInfo: userInfo || this.data.userInfo,
    };
    if (ctx.disId) {
      patch.disInfo = ctx.disInfo;
      patch.disId = ctx.disId;
    }
    this.setData(patch);
    return patch;
  },

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
      this._recalcGoodsListHeight();
      this._syncDepartmentContext();
      this._syncTodaySupplierOrders();
  
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
    goodsListHeight: 0, // 新增内容区高度
    leftScrollTop: 0, // 左侧菜单 scroll-view 的 scrollTop
    disName: '',
    disLogo: '',
    disAddress: '',
    mainCategories: '',
    goodsCount: 0,
    supplierBarHeightRpx: 0,
    submitBarHeightRpx: 108,
    orderSummary: {
      count: 0,
      amountText: '0.00',
      hasPendingPrice: false,
      amountLabel: '预计 ¥0.00',
    },
    sessionOrderCount: 0,
  },

  _recalcGoodsListHeight: function () {
    const app = getApp();
    const rpxR = app.globalData.rpxR;
    const windowHeightRpx = app.globalData.windowHeight * rpxR;
    const navBarHeightRpx = app.globalData.navBarHeight * rpxR;
    const subcatBarHeightPx = 40;
    const subcatBarHeightRpx = subcatBarHeightPx * rpxR;
    const supplierBarHeightRpx = this.data.disName ? 132 : 0;
    const submitBarHeightRpx = this.data.submitBarHeightRpx || 108;
    let safeAreaBottomPx = 0;
    if (app.globalData.safeAreaBottom !== undefined) {
      safeAreaBottomPx = app.globalData.safeAreaBottom;
    } else {
      const systemInfo = wx.getSystemInfoSync();
      safeAreaBottomPx = systemInfo.screenHeight - systemInfo.safeArea.bottom;
      app.globalData.safeAreaBottom = safeAreaBottomPx;
    }
    const safeAreaBottomRpx = safeAreaBottomPx * rpxR;
    const goodsListHeight = windowHeightRpx - navBarHeightRpx - subcatBarHeightRpx
      - supplierBarHeightRpx - submitBarHeightRpx - safeAreaBottomRpx;
    this.setData({
      goodsListHeight,
      supplierBarHeightRpx,
      submitBarHeightRpx,
      navBarHeight: navBarHeightRpx,
      windowWidth: app.globalData.windowWidth * rpxR,
      windowHeight: windowHeightRpx,
      statusBarHeight: app.globalData.statusBarHeight * rpxR,
    });
  },

  _loadSupplierInfo: function () {
    var that = this;
    var nxDisId = this.data.nxDisId;
    var ctx = this._resolveBuyerContext();
    var toDepId = this.data.toDepId || ctx.toDepId;
    if (!nxDisId || !toDepId) return;
    if (this.data.disAddress && this.data.disLogo) return;
    gbDepGetDistibuterInfo({
      nxDisId: nxDisId,
      gbDepId: toDepId,
      gbDisId: this.data.disId || ctx.disId || null,
    }).then(function (res) {
      if (!res.result || res.result.code !== 0 || !res.result.data) return;
      var dis = res.result.data;
      var patch = {};
      if (!that.data.disName && dis.nxDistributerName) {
        patch.disName = dis.nxDistributerName;
        wx.setNavigationBarTitle({ title: dis.nxDistributerName });
      }
      if (!that.data.disAddress) {
        var addr = (dis.nxDistributerMarketName || '') + (dis.nxDistributerAddress || '');
        if (addr) patch.disAddress = addr;
      }
      if (!that.data.disLogo && dis.nxDistributerImg) {
        patch.disLogo = that.data.url + dis.nxDistributerImg;
      }
      if (Object.keys(patch).length === 0) return;
      that.setData(patch, function () {
        that._recalcGoodsListHeight();
      });
    }).catch(function () {});
  },



  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

    var goodsCount = options.goodsCount ? Number(options.goodsCount) : 0;
    this.setData({
      url: config.server,
      nxDisId: options.nxDisId ? Number(options.nxDisId) : null,
      disName: options.disName ? decodeURIComponent(options.disName) : '',
      disAddress: options.disAddress ? decodeURIComponent(options.disAddress) : '',
      disLogo: options.disLogo ? decodeURIComponent(options.disLogo) : '',
      mainCategories: options.mainCategories ? decodeURIComponent(options.mainCategories) : '',
      goodsCount: isNaN(goodsCount) ? 0 : goodsCount,
    });
    if (this.data.disName) {
      wx.setNavigationBarTitle({ title: this.data.disName });
    }

    this._recalcGoodsListHeight();

    this._syncDepartmentContext();
    this._loadSupplierInfo();
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
      nxDisId: this.data.nxDisId,
      gbDisId: this.data.disId,
      gbDepFatherId: this.data.toDepId
    }
    nxDepGetDisCataGoodsGb(data).then(res => {
      load.hideLoading();
      if (res.result.code == 0 && res.result.data && res.result.data.length > 0) {
        console.log(res.result.data);
        var firstGrand = res.result.data[0];
        var firstSub = firstGrand.fatherGoodsEntities && firstGrand.fatherGoodsEntities[0];
        if (!firstSub) {
          wx.showToast({ title: '暂无商品分类', icon: 'none' });
          return;
        }
        var newId = firstSub.nxDistributerFatherGoodsId;
        this.setData({
          grandList: res.result.data,
          fatherArr: firstGrand.fatherGoodsEntities,
          leftGreatId: firstGrand.nxDistributerFatherGoodsId,
          selectedSubCategoryId: newId,
          activeSubCatId: newId,
          greatName: firstGrand.nxDfgFatherGoodsName,
          fatherSonsIndex: 0,
        });
        that._getFatherGoods();
      } else {
        wx.showToast({ title: '暂无商品', icon: 'none' });
      }
    }).catch(function () {
      load.hideLoading();
    });
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
    gbDepId: this.data.toDepId,
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
        setTimeout(() => {
          this.calculateCategoryPositions();
          this._syncTodaySupplierOrders();
        }, 100);
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
    const index = e.currentTarget.dataset.index;
    const categoryId = e.currentTarget.dataset.id;
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
      activeSubCatId:  this.data.grandList[e.currentTarget.dataset.index].fatherGoodsEntities[0].nxDistributerFatherGoodsId,
   
    }, () => {
      // 用 this.createSelectorQuery() 保证作用域
      const query = this.createSelectorQuery();
      query.select(`#left-cat-${categoryId}`).boundingClientRect();
      query.select('#leftScroll').boundingClientRect();      // ← 改这里
      query.select('#leftScroll').scrollOffset();            // ← 和这里
      query.exec(res => {
        const [itemRect, scrollRect, scrollOffset] = res;
        const itemTop    = itemRect.top;
        const itemH      = itemRect.height;
        const listTop    = scrollRect.top;
        const listH      = scrollRect.height;
        const scrollTop0 = scrollOffset.scrollTop;
      
        const targetScrollTop = scrollTop0 + itemTop - listTop - (listH / 2) + (itemH / 2);
        this.setData({ leftScrollTop: targetScrollTop });
      });
    });
    this._getFatherGoods();
  },




  // changeGreatGrand(e) {
  //   console.log(e);
  //   const categoryId = e.currentTarget.dataset.id;
  //   const index = e.currentTarget.dataset.index;

  //   if (categoryId !== this.data.leftGreatId) {
  //     this.setData({
  //       leftGreatId: categoryId,
  //       leftIndex: e.currentTarget.dataset.index,
  //       goodsList: [],
  //       currentPage: 1,
  //       totalPage: 1,
  //       isLoading: false,
  //       greatName: e.currentTarget.dataset.name,
  //       fatherArr: this.data.grandList[e.currentTarget.dataset.index].fatherGoodsEntities,
  //       selectedSubCategoryId: this.data.grandList[e.currentTarget.dataset.index].fatherGoodsEntities[0].nxDistributerFatherGoodsId,
  //       activeSubCatId:  this.data.grandList[e.currentTarget.dataset.index].fatherGoodsEntities[0].nxDistributerFatherGoodsId,
  //       searchFather: false,
  //       searchId: "",
  //       leftScrollIntoView: `left-cat-${categoryId}`,

  //     });
  //     this._getFatherGoods();
  //   }

  // },


  _getFatherGoods() {
    const data = {
      gbDisId: this.data.disId,
      gbDepId: this.data.toDepId,
      fatherId: this.data.leftGreatId,
      limit: this.data.limit,
      page: this.data.currentPage,
    };

    nxDepGetDisFatherGoodsGb(data).then(res => {
      load.hideLoading();
      if (res.result && res.result.code == 0 && res.result.page) {
        var rawList = res.result.page.list || [];
        const processedList = this.processGoodsList(rawList);
        var subCatId = this.data.activeSubCatId;
        this.setData({
          goodsList: processedList,
          currentPage: this.data.currentPage + 1,
          totalPage: res.result.page.totalPage,
          totalCount: res.result.page.totalCount,
          subcatScrollIntoView: `subcat-${subCatId}`,
          scrollIntoView: `cat-${subCatId}`
        }, () => {
          this.calculateCategoryPositions();
          this._syncTodaySupplierOrders();
        });
      } else {
        wx.showToast({ title: '商品加载失败', icon: 'none' });
      }
    }).catch(function () {
      load.hideLoading();
      wx.showToast({ title: '商品加载失败', icon: 'none' });
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

    var that = this;
    this.setData({
      isLoading: true
    });

    const {
      currentPage,
      totalPage,
      leftGreatId,
      depFatherId,
      limit
    } = this.data;

    // 确保非搜索模式，并且当前页数未超过总页数
    if ( currentPage <= totalPage) {
      const data = {
        limit: limit,
        page: currentPage,
        fatherId: leftGreatId,
        gbDisId: this.data.disId,
        gbDepId: this.data.toDepId,
      };

      nxDepGetDisFatherGoodsGb(data)
        .then((res) => {
          if (res.result.code == 0) {
            const newItems = res.result.page.list || [];
            const newProcessed = newItems.map(function (item) {
              return that.processGoodsItem(item);
            });
            const updatedGoodsList = that.data.goodsList.concat(newProcessed);

            that.setData({
              goodsList: updatedGoodsList,
              currentPage: currentPage + 1,
              totalPage: res.result.page.totalPage,
              totalCount: res.result.page.totalCount,
              isLoading: false,
            }, function () {
              that._recalcOrderSummary();
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

  _syncTodaySupplierOrders: function () {
    if (!this.data.nxDisId) return;
    var nxDisId = this.data.nxDisId;
    var that = this;
    platformCartApi.listLines().then(function (body) {
      if (!platformCartApi.isOk(body) || !body.data) {
        that._recalcOrderSummary();
        return;
      }
      var orderMap = {};
      (body.data.lines || []).forEach(function (line) {
        if (line.nxDistributerId === nxDisId && line.nxOrderId) {
          var key = line.nxGoodsId + '|' + line.standard;
          orderMap[key] = that._mapSubmitLineToOrderEntity(line, {
            nxDgNxGoodsId: line.nxGoodsId,
            nxDgGoodsName: line.goodsName
          });
        }
      });
      var list = that.data.goodsList || [];
      if (!list.length) {
        that._recalcOrderSummary();
        return;
      }
      var patch = {};
      list.forEach(function (g, index) {
        var key1 = g.nxDgNxGoodsId + '|' + (g.nxDgGoodsStandardname || '');
        var key2 = g.nxDgNxGoodsId + '|' + (g.nxDgWillPriceTwoStandard || '');
        var order = orderMap[key1] || orderMap[key2] || null;
        patch['goodsList[' + index + '].nxDepartmentOrdersEntity'] = order;
      });
      that.setData(patch, function () {
        that._recalcOrderSummary();
      });
    }).catch(function () {
      that._recalcOrderSummary();
    });
  },

  _mapPlatformLineToOrderEntity: function (line) {
    return {
      nxDepartmentOrdersId: line.orderId,
      nxDoGbDepartmentOrderId: line.gbDepartmentOrderId,
      gbDepartmentOrderId: line.gbDepartmentOrderId,
      nxDoNxGoodsId: line.nxGoodsId,
      nxDoGoodsName: line.goodsName,
      nxDoQuantity: line.quantity,
      nxDoStandard: line.standard,
      nxDoRemark: line.remark || '',
      nxDoPurchaseStatus: 1
    };
  },

  _mapSubmitLineToOrderEntity: function (line, goods) {
    return {
      nxDepartmentOrdersId: line.nxOrderId,
      nxDoGbDepartmentOrderId: line.gbOrderId,
      gbDepartmentOrderId: line.gbOrderId,
      nxDoNxGoodsId: goods.nxDgNxGoodsId,
      nxDoGoodsName: line.goodsName || goods.nxDgGoodsName,
      nxDoQuantity: line.quantity,
      nxDoStandard: line.standard,
      nxDoSubtotal: line.lineSubtotal,
      nxDoPurchaseStatus: 1
    };
  },

  _handleSubmitBlocked: function (body) {
    var data = body.data || {};
    wx.setStorageSync('platformOutstandingBill', data);
    wx.showModal({
      title: '无法下单',
      content: body.message || body.msg || '您有待处理的采购单',
      confirmText: '去处理采购单',
      cancelText: '知道了',
      success: function (res) {
        if (res.confirm) {
          wx.navigateTo({ url: '/pages/billPending/billPending?from=block' });
        }
      }
    });
  },

  _showSubmitResult: function (data) {
    platformCart.refreshTabBadgeFromServer();
    wx.showToast({
      title: '已加入购物车',
      icon: 'success',
      duration: 1500
    });
  },

  _submitLineToSupplier: function (e, onDone) {
    var detail = e.detail || {};
    var goods = this.data.item;
    var index = this.data.index;
    if (!goods || !detail.applyNumber) {
      wx.showToast({ title: '请输入数量', icon: 'none' });
      return;
    }
    var ctx = platformCart.getBuyerContext();
    if (!ctx.gbDepartmentId || !ctx.gbDistributerId) {
      wx.showToast({ title: '请先登录并选择饭店', icon: 'none' });
      return;
    }

    var payload = platformCart.buildImmediateSubmitPayload({
      goods: goods,
      nxDistributerId: this.data.nxDisId,
      quantity: detail.applyNumber,
      standard: detail.applyStandardName,
      remark: detail.applyRemark || '',
      level: this.data.level || 1
    });

    var that = this;
    platformCartApi.submitBySupplier(payload).then(function (body) {
      if (body.code === 4001) {
        that._handleSubmitBlocked(body);
        return;
      }
      if (body.code !== 0) {
        wx.showToast({ title: body.msg || body.message || '下单失败', icon: 'none' });
        return;
      }
      var data = body.data || {};
      var line = (data.items && data.items[0]) || {};
      var orderEntity = that._mapSubmitLineToOrderEntity(line, goods);
      var patch = {};
      if (index !== '' && index >= 0) {
        patch['goodsList[' + index + '].nxDepartmentOrdersEntity'] = orderEntity;
      }
      that.setData(patch, function () {
        that._recalcOrderSummary();
        that._showSubmitResult(data);
        if (typeof onDone === 'function') {
          onDone();
        }
      });
    }).catch(function () {
      wx.showToast({ title: '下单失败', icon: 'none' });
    });
  },

  _onOrderSaved: function (index, orderData, extraPatch) {
    var patch = extraPatch || {};
    patch['goodsList[' + index + '].nxDepartmentOrdersEntity'] = orderData;
    patch.sessionOrderCount = (this.data.sessionOrderCount || 0) + 1;
    var that = this;
    this.setData(patch, function () {
      that._recalcOrderSummary();
    });
  },

  _recalcOrderSummary: function () {
    var list = this.data.goodsList || [];
    var count = 0;
    var total = 0;
    var hasPendingPrice = false;
    list.forEach(function (item) {
      var order = item.nxDepartmentOrdersEntity;
      if (!order) return;
      count += 1;
      var sub = Number(order.nxDoSubtotal);
      if (!isNaN(sub) && sub > 0.1) {
        total += sub;
      } else {
        hasPendingPrice = true;
      }
    });
    var amountLabel = hasPendingPrice && count > 0
      ? '价格待确认'
      : ('预计 ¥' + total.toFixed(2));
    this.setData({
      orderSummary: {
        count: count,
        amountText: total.toFixed(2),
        hasPendingPrice: hasPendingPrice,
        amountLabel: count > 0 ? amountLabel : '预计 ¥0.00',
      },
    });
  },

  onSubmitOrderBar: function () {
    wx.switchTab({ url: '/pages/orders/orders' });
  },

  onQuickMinus: function (e) {
    if (e && e.stopPropagation) e.stopPropagation();
    var index = e.currentTarget.dataset.index;
    this._adjustOrderQty(index, -1);
  },

  onQuickAdd: function (e) {
    if (e && e.stopPropagation) e.stopPropagation();
    var index = e.currentTarget.dataset.index;
    var goods = this.data.goodsList[index];
    if (!goods) return;
    if (goods.nxDepartmentOrdersEntity) {
      this._adjustOrderQty(index, 1);
      return;
    }
    this.applyGoods(e);
  },

  toEditOrderLine: function (e) {
    var order = e.currentTarget.dataset.order;
    var item = e.currentTarget.dataset.item;
    if (!order || !item) return;
    this.setData({
      applyItem: order,
      show: true,
      applyStandardName: order.nxDoStandard,
      item: item,
      itemDis: e.currentTarget.dataset.disgoods || this._buildItemDisFromGoods(item),
      depGoods: null,
      editApply: true,
      applyNumber: order.nxDoQuantity,
      applyRemark: order.nxDoRemark || '',
      index: e.currentTarget.dataset.index,
      level: e.currentTarget.dataset.level || 1,
      canSave: true,
      applySubtotal: order.nxDoSubtotal ? (order.nxDoSubtotal + '元') : '待确认价'
    });
  },

  _adjustOrderQty: function (index, delta) {
    var goods = this.data.goodsList[index];
    if (!goods) return;
    var order = goods.nxDepartmentOrdersEntity;
    if (!order) return;
    if (order.nxDoPurchaseStatus > 2) {
      this.showTishi();
      return;
    }
    var currentQty = Number(order.nxDoQuantity);
    if (isNaN(currentQty)) currentQty = 0;
    var newQty = currentQty + delta;
    if (newQty <= 0) {
      this.setData({
        applyItem: order,
        item: goods,
        itemDis: goods.gbDistributerGoodsEntity || null,
        index: index,
      });
      this.deleteApplyApi();
      return;
    }
    var that = this;
    load.showLoading('更新数量');
    updateOrderGbJjSx({
      id: order.nxDepartmentOrdersId,
      weight: String(newQty),
      standard: order.nxDoStandard,
      remark: order.nxDoRemark || '',
    }).then(function (res) {
      load.hideLoading();
      if (res.result.code == 0) {
        that.setData({
          ['goodsList[' + index + '].nxDepartmentOrdersEntity']: res.result.data,
        }, function () {
          that._recalcOrderSummary();
        });
      } else {
        wx.showToast({ title: res.result.msg || '更新失败', icon: 'none' });
      }
    }).catch(function () {
      load.hideLoading();
      wx.showToast({ title: '更新失败', icon: 'none' });
    });
  },

  cancle: function () {
    this.setData({
      show: false,
      editApply: false,
      applyItem: '',
      applyNumber: '',
      applyStandardName: '',
      applyRemark: '',
    });
  },

  applyGoods: function (e) {
    var ds = e.currentTarget.dataset;
    var item = ds.item;
    var itemDis = ds.disgoods || this._buildItemDisFromGoods(item);
    console.log('[京采店铺下单] applyGoods', {
      goodsName: item && item.nxDgGoodsName,
      nxDisGoodsId: item && item.nxDistributerGoodsId,
      gbDisGoodsId: item && item.gbDisGoodsId,
      itemDisId: itemDis && itemDis.gbDistributerGoodsId,
    });
    this.setData({
      index: ds.index,
      item: item,
      itemDis: itemDis,
      depGoods: ds.depgoods || null,
      show: true,
      applyStandardName: ds.standard,
      level: ds.level || 1,
      applySubtotal: "0.0元",
      canSave: false,
      editApply: false,
    });
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
        depGoods: e.currentTarget.dataset.depgoods || null,
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
    var that = this;
    if (this.data.editApply) {
      this._updateDisOrder(e);
      return;
    }
    this._submitLineToSupplier(e, function () {
      that.setData({
        show: false,
        editApply: false,
        applyItem: '',
        item: '',
        applyNumber: '',
        applyStandardName: '',
      });
    });
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
    this._syncDepartmentContext();
    console.log('[京采店铺下单] _saveOrder 开始', e.detail);
    var arriveDate = dateUtils.getArriveDate(0);
    var arriveOnlyDate = dateUtils.getArriveOnlyDate(0);
    var weekYear = dateUtils.getArriveWeeksYear(0);
    var week = dateUtils.getArriveWhatDay(0);
    var nxGoodsId = this.data.item.nxDgNxGoodsId;
    var nxGoodsFatherId = this.data.item.nxDgNxFatherId;
    var nxDisId = this.data.nxDisId;
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

    var itemDis = this.data.itemDis || this._buildItemDisFromGoods(this.data.item);

    if (itemDis !== null) {
      gbDisGoodsId = itemDis.gbDistributerGoodsId;
      gbDisGoodsFatherId = itemDis.gbDgDfgGoodsFatherId;
      nxGoodsFatherId = itemDis.gbDgNxFatherId;
      toDepId = itemDis.gbDgGbDepartmentId;
      goodsType = itemDis.gbDgGoodsType;
     
    } else {
      goodsType = 2;
      toDepId = this.data.toDepId;
    }

    var orderDepId = this.data.depId;
    if (!orderDepId && this.data.userInfo && this.data.userInfo.gbDuDepartmentId) {
      orderDepId = this.data.userInfo.gbDuDepartmentId;
    }
    if (!orderDepId) {
      orderDepId = this.data.depFatherId || this.data.toDepId;
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
      gbDoDepartmentId: orderDepId,
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
      gbDoCostPriceLevel: this.data.level,
    };
    console.log('[京采店铺下单] 请求体 dg', dg);
    console.log('[京采店铺下单] 路由判断', {
      hasItemDis: itemDis != null,
      itemDisId: itemDis ? itemDis.gbDistributerGoodsId : null,
      gbDisGoodsIdFlat: this.data.item && this.data.item.gbDisGoodsId,
      hasDepGoods: this.data.depGoods != null,
      depGoodsId: this.data.depGoods ? this.data.depGoods.gbDepartmentDisGoodsId : null,
      orderDepId: orderDepId,
      toDepId: toDepId,
      api: itemDis == null
        ? 'saveOrdersGbJjAndSaveGoodsSx'
        : (this.data.depGoods == null ? 'saveOrdersGbJjAndSaveDepGoodsSx' : 'saveGbOrderJjSx'),
    });
    if (itemDis == null) {
      console.log('[京采店铺下单] 无已有 GB 商品，走 saveOrdersGbJjAndSaveGoodsSx 自动建档');
      load.showLoading("保存订单");
      saveOrdersGbJjAndSaveGoodsSx(dg).then(res => {
        load.hideLoading();
        console.log('[京采店铺下单] saveOrdersGbJjAndSaveGoodsSx 返回', res.result);
        if (res.result.code == 0) {
          var newGoods = res.result.data.gbDistributerGoodsEntity;
          console.log('[京采店铺下单] 下单成功', res.result.data);
          this._onOrderSaved(this.data.index, res.result.data, {
            ['goodsList[' + this.data.index + '].gbDistributerGoodsEntity']: newGoods,
            ['goodsList[' + this.data.index + '].gbDisGoodsId']: newGoods && newGoods.gbDistributerGoodsId,
          });
        } else {
          console.error('[京采店铺下单] 下单失败', res.result);
          wx.showToast({
            title: res.result.msg || '订单保存失败',
            icon: 'none'
          })
        }
      }).catch(function (err) {
        load.hideLoading();
        console.error('[京采店铺下单] saveOrdersGbJjAndSaveGoodsSx 异常', err);
        wx.showToast({ title: '网络异常', icon: 'none' });
      })
      return;
    }
    if (this.data.depGoods == null) {
      load.showLoading("保存订单");
      console.log('[京采店铺下单] 调用 saveOrdersGbJjAndSaveDepGoodsSx');
      saveOrdersGbJjAndSaveDepGoodsSx(dg).then(res => {
        load.hideLoading();
        console.log('[京采店铺下单] saveOrdersGbJjAndSaveDepGoodsSx 返回', res.result);
        if (res.result.code == 0) {
          console.log('[京采店铺下单] 下单成功', {
            nxDepartmentOrdersId: res.result.data && res.result.data.nxDepartmentOrdersId,
            nxDoGbDepartmentOrderId: res.result.data && res.result.data.nxDoGbDepartmentOrderId,
            nxDoQuantity: res.result.data && res.result.data.nxDoQuantity,
            nxDoStandard: res.result.data && res.result.data.nxDoStandard,
          });
          this._onOrderSaved(this.data.index, res.result.data);
        } else {
          console.error('[京采店铺下单] 下单失败', res.result);
          wx.showToast({
            title: res.result.msg || '订单保存失败',
            icon: 'none'
          })
        }
      }).catch(function (err) {
        load.hideLoading();
        console.error('[京采店铺下单] saveOrdersGbJjAndSaveDepGoodsSx 异常', err);
        wx.showToast({ title: '网络异常', icon: 'none' });
      })
    } else {
      load.showLoading("保存订单");
      console.log('[京采店铺下单] 调用 saveGbOrderJjSx');
      saveGbOrderJjSx(dg).then(res => {
        load.hideLoading();
        console.log('[京采店铺下单] saveGbOrderJjSx 返回', res.result);
        if (res.result.code == 0) {
          console.log('[京采店铺下单] 下单成功', res.result.data);
          this._onOrderSaved(this.data.index, res.result.data);
        } else {
          console.error('[京采店铺下单] 下单失败', res.result);
          wx.showToast({
            title: res.result.msg || '订单保存失败',
            icon: 'none'
          })
        }
      }).catch(function (err) {
        load.hideLoading();
        console.error('[京采店铺下单] saveGbOrderJjSx 异常', err);
        wx.showToast({ title: '网络异常', icon: 'none' });
      })
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
        this.setData({
          ['goodsList[' + this.data.index + '].nxDepartmentOrdersEntity']: res.result.data,
          show: false,
          editApply: false,
          applyItem: '',
        }, function () {
          that._recalcOrderSummary();
        });
        wx.showToast({ title: '已保存', icon: 'success' });
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
      var order = this.data.applyItem;
      if (!order || !order.nxDepartmentOrdersId) {
        return;
      }
      this.setData({
        warnContent: (this.data.itemDis && this.data.itemDis.gbDgGoodsName ? this.data.itemDis.gbDgGoodsName : '') + "  " + (order.nxDoQuantity || '') + (order.nxDoStandard || ''),
        deleteShow: true,
        show: false,
        popupType: 'deleteOrder',
        showPopupWarn: true,
      })
      this.setData({
        showOperationGoods: false,
        showOperationLinshi: false
      })
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

    deleteOrderGb(this.data.applyItem.nxDoGbDepartmentOrderId || this.data.applyItem.gbDepartmentOrderId).then(res => {
      if (res.result.code == 0) {
        var that = this;
        this.setData({
          ['goodsList[' + this.data.index + '].nxDepartmentOrdersEntity']: null,
          editApply: false,
        }, function () {
          that._recalcOrderSummary();
        });
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

  processGoodsItem: function (item, meta) {
    var willPrice = item.nxDgWillPrice != null && item.nxDgWillPrice !== ''
      ? item.nxDgWillPrice
      : item.nxDgWillPriceOne;
    var priceOne = item.nxDgWillPriceOne != null && item.nxDgWillPriceOne !== ''
      ? item.nxDgWillPriceOne
      : willPrice;
    var priceTwo = item.nxDgWillPriceTwo;
    var processed = Object.assign({}, item, {
      nxDgWillPrice: willPrice,
      nxDgWillPriceOne: priceOne,
      priceValidOne: priceUtil.isValidDisplayPrice(priceOne),
      priceValidTwo: priceUtil.isValidDisplayPrice(priceTwo),
      gbDistributerGoodsEntity: this._buildItemDisFromGoods(item),
      isFirstInCategory: meta ? meta.isFirstInCategory : false,
      categoryName: meta ? meta.categoryName : this.getCategoryName(item.nxDgDfgGoodsGrandId),
    });
    return processed;
  },

  // 处理商品数据，添加分类信息
  processGoodsList(list) {
    if (!list || !list.length) return [];
    list.sort(function (a, b) {
      return a.nxDgDfgGoodsGrandId - b.nxDgDfgGoodsGrandId;
    });
    var currentCategory = null;
    var that = this;
    return list.map(function (item) {
      var isFirst = item.nxDgDfgGoodsGrandId !== currentCategory;
      if (isFirst) {
        currentCategory = item.nxDgDfgGoodsGrandId;
      }
      return that.processGoodsItem(item, {
        isFirstInCategory: isFirst,
        categoryName: that.getCategoryName(item.nxDgDfgGoodsGrandId),
      });
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
