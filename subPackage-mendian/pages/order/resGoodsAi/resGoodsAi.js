
var load = require('../../../../lib/load.js');
var apiUrl = require('../../../../config/index.js');
var dateUtils = require('../../../../lib/dateUtil');
var orderApi = require('../../../../services/depOrder.js');
var stockReduceKind = require('../../../../lib/stockReduceKind.js');

// ========================
// 本页面接口统一使用 services/depOrder.js
// ========================

// orderApi.gbGetNxGoodsCataGoods(data)           POST  nxgoods/gbGetNxGoodsCataGoods                         获取Nx分类商品
// orderApi.gbDepGetNxGoodsByGreatGrandId(data) POST  nxgoods/gbDepGetNxGoodsByGreatGrandId              根据大类获取nx商品


// orderApi.depGetDepGoodsGbPage(data)          POST  gbdepartmentdisgoods/depGetDepGoodsGbPage          分页获取部门商品
// orderApi.depGetDepGoodsCataGb(data)          POST  gbdepartmentdisgoods/depGetDepGoodsCataGb          获取部门商品分类

// orderApi.createDepartmentOrderForJj(data)                 POST  gbdepartmentorders/createDepartmentOrderForJj                  保存进价订单
// orderApi.createDepartmentOrderWithNewDepDisGoods(data) POST  gbdepartmentorders/createDepartmentOrderWithNewDepDisGoods   保存订单并更新部门商品
// orderApi.createDepartmentOrderFromNxGoodsImport(data)    POST  gbdistributergoods/createDepartmentOrderFromNxGoodsImport       保存订单并更新配送商品
// orderApi.updateOrderGbJj(data)               POST  gbdepartmentorders/updateOrderGbJj                  更新进价订单
// orderApi.deleteOrderGb(data)                 GET   gbdepartmentorders/deleteOrderGb/{id}               删除订单

// orderApi.gbDisSaveStandard(data)             POST  gbdistributerstandard/gbDisSaveStandard             保存配送标准
// orderApi.saveNxStandard(data)                POST  nxstandard/saveNxStandard                           保存nx标准
// orderApi.gbDisDeleteStandard(data)           GET   gbdistributerstandard/gbDisDeleteStandard/{id}      删除配送标准
// orderApi.changeStockStars(data)              POST  gbdepartmentgoodsstock/changeStockStars             修改库存星级
// orderApi.saveDepGoodsStockAdjust(kind, stock)  POST  gbdepartmentdisgoods/saveDepGoodsStockAdjust  部门库存统一调整（kind: produce|loss|return|waste|employee_meal）
// orderApi.reduceAttachmentSaveWithFile(...)   POST  gbdepartmentgoodsstockreduceattachment/reduceAttachmentSaveWithFile  损耗/退货附件（依赖返回 data.id）
// orderApi.deleteDepGoods(data)                GET   gbdepartmentdisgoods/deleteDepGoods/{id}             删除部门商品
// ========================

/** 配送侧 Nx 列表：商品图相对路径（wxml 里用 imgUrl.resolve(url, rel)，勿写成 resolve(url+rel)） */
function pickDisGoodsImageRel(item) {
  if (!item) return '';
  if (item.nxGoodsFile) return String(item.nxGoodsFile);
  var e = item.gbDistributerGoodsEntity;
  if (!e) return '';
  if (e.gbDgGoodsFile) return String(e.gbDgGoodsFile);
  if (e.gbDgGoodsFileImg) return String(e.gbDgGoodsFileImg);
  if (e.gbDgGoodsFileLarge) return String(e.gbDgGoodsFileLarge);
  return '';
}

/** 与 wxs/imgUrl.wxs 的 resolve 一致，供图片弹窗等 JS 场景 */
function encodePathJoin(base, rel) {
  var r = rel == null ? '' : String(rel).replace(/^\s+|\s+$/g, '');
  if (r === '' || r === 'goodsImage/logo.jpg' || r === '/goodsImage/logo.jpg') return '';
  if (/^https?:\/\//i.test(r)) return r;
  var b = String(base || '').replace(/\/+$/, '');
  if (b === '') return r;
  var p = r.replace(/^\/+/, '');
  var parts = p.split('/');
  var enc = [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] !== '') enc.push(encodeURIComponent(parts[i]));
  }
  return b + '/' + enc.join('/');
}

function logDisApiGoodsFirst10(tag, list) {
  if (!list || !list.length) {
    return;
  }
  const rows = list.slice(0, 10).map((g, idx) => ({
    idx,
    nxGoodsId: g.nxGoodsId,
    nxGoodsGrandId: g.nxGoodsGrandId,
    grandType: typeof g.nxGoodsGrandId,
    nxGoodsName: g.nxGoodsName,
  }));
  const grandSeq = list.slice(0, 10).map(g => g.nxGoodsGrandId);
}

/**
 * 右侧「全部配送」商品列表：滚动到子类锚点 cat-${id}，并打日志（便于排查 scroll-into-view 不生效）
 */
function logDisScrollStep(reason, payload) {
}



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
      leftTopHeight: globalData.navBarHeight * globalData.rpxR + 80 * globalData.rpxR
    });

    // 从搜索页 / AI 添加商品等返回后，与其它订单页一致：根据标记全量刷新部门商品（再合并 newOrderInfo）
    var needImmediateRefresh = wx.getStorageSync('needRefreshOrderData');
    if (needImmediateRefresh) {
      // wx.removeStorageSync('needRefreshOrderData');
      var that = this;
      if (this.data.depInfo && this.data.depInfo.gbDepartmentId) {
        this.setData({ currentPage: 1 }, function () {
          that._getInitDataDep(function () {
            that._checkAndUpdateOrderData();
          });
        });
      } else {
        this._checkAndUpdateOrderData();
      }
    } else {
      this._checkAndUpdateOrderData();
    }

    // 检查是否有库存更新需要同步
    this._checkAndUpdateGoodsData();

    // 检查是否需要清库存
    this._checkAndClearStock();

  },


  /**
   * 检查并更新订单数据
   * 如果页面保存了新订单，则根据gbDepartmentDisGoodsId更新对应商品的gbDepartmentOrdersEntity
   */

  _checkAndUpdateOrderData() {

    // 从本地存储获取新保存的订单信息
    const newOrderInfo = wx.getStorageSync('newOrderInfo');

    if (newOrderInfo && (newOrderInfo.gbDepartmentDisGoodsId || newOrderInfo.nxGoodsId)) {
      var gbDepartmentDisGoodsId = newOrderInfo.gbDepartmentDisGoodsId;
      var nxGoodsId = newOrderInfo.nxGoodsId;
      var gbDepartmentOrdersEntity = newOrderInfo.gbDepartmentOrdersEntity;
      var operationType = newOrderInfo.operationType;

      // 处理部门商品列表的订单更新
      if (gbDepartmentDisGoodsId) {
        const depGoodsArrAi = this.data.depGoodsArrAi;
        const targetIndex = depGoodsArrAi.findIndex(goods =>
          goods.gbDepartmentDisGoodsId === gbDepartmentDisGoodsId
        );

        if (targetIndex !== -1) {
          const updatePath = `depGoodsArrAi[${targetIndex}].gbDepartmentOrdersEntity`;
          this.setData({
            [updatePath]: gbDepartmentOrdersEntity
          });

          if (operationType === 'delete') {
          } else {
          }
        }
      }

      // 处理商品列表的订单更新
      if (nxGoodsId && nxGoodsId !== -1 && this.data.goodsList && this.data.goodsList.length > 0) {
        this._updateGoodsListOrder(nxGoodsId, gbDepartmentOrdersEntity, operationType);
      }

      // 清除本地存储的订单信息
      wx.removeStorageSync('newOrderInfo');
    }

  },

  /**
   * 检查并更新库存数据
   */
  _checkAndUpdateGoodsData() {

    // 从本地存储获取更新的商品信息
    const updatedGoodsInfo = wx.getStorageSync('updatedGoodsInfo');

    if (updatedGoodsInfo && updatedGoodsInfo.gbDepartmentDisGoodsId) {
      var gbDepartmentDisGoodsId = updatedGoodsInfo.gbDepartmentDisGoodsId;
      var updatedGoodsData = updatedGoodsInfo.updatedGoodsData;

      // 在depGoodsArrAi中查找对应的商品并更新
      const depGoodsArrAi = this.data.depGoodsArrAi;

      const targetIndex = depGoodsArrAi.findIndex(goods => {
        return goods.gbDepartmentDisGoodsId === gbDepartmentDisGoodsId;
      });


      if (targetIndex !== -1) {
        // 找到对应商品，清零库存
        const updatePath = `depGoodsArrAi[${targetIndex}].gbDepartmentGoodsStockEntities`;

        this.setData({
          [updatePath]: []
        });
      } else {
      }

      // 清除本地存储的库存更新信息
      wx.removeStorageSync('updatedGoodsInfo');
    } else {
    }
  },

  /**
   * 检查并清零库存
   */
  _checkAndClearStock() {

    const clearStockInfo = wx.getStorageSync('clearStockInfo');

    if (clearStockInfo && clearStockInfo.gbDepartmentDisGoodsId && clearStockInfo.needClearStock) {
      var gbDepartmentDisGoodsId = clearStockInfo.gbDepartmentDisGoodsId;

      // 在depGoodsArrAi中查找对应的商品
      const depGoodsArrAi = this.data.depGoodsArrAi;
      const targetIndex = depGoodsArrAi.findIndex(goods =>
        goods.gbDepartmentDisGoodsId === gbDepartmentDisGoodsId
      );


      if (targetIndex !== -1) {
        // 找到对应商品，清零库存
        const updatePath = `depGoodsArrAi[${targetIndex}].gbDepartmentGoodsStockEntities`;

        this.setData({
          [updatePath]: []
        });

      } else {
      }

      // 清除本地存储的清库存信息
      wx.removeStorageSync('clearStockInfo');
    } else {
    }
  },

  /**
   * 更新goodsList中对应商品的订单信息
   */
  _updateGoodsListOrder(nxGoodsId, gbDepartmentOrdersEntity, operationType = 'update') {

    const goodsList = this.data.goodsList;

    // 遍历goodsList中的所有商品
    for (let i = 0; i < goodsList.length; i++) {
      const goods = goodsList[i];

      if (goods.nxGoodsId === nxGoodsId) {
        // 找到对应商品，更新其gbDepartmentOrdersEntity
        const updatePath = `goodsList[${i}].gbDepartmentOrdersEntity`;

        this.setData({
          [updatePath]: gbDepartmentOrdersEntity
        });

        if (operationType === 'delete') {
        } else {
        }

        break;
      }
    }


  },




  data: {
    editApply: false,
    editOrderIndex: "",
    applyNumber: "",
    applyRemark: "",
    applyStandardName: "",
    applySubtotal: "",
    item: {},
    itemDis: null,
    nxGoods: null,
    depGoods: null,
    statusBarHeight: "",
    windowHeight: "",
    windowWidth: "",
    tab1Index: 0,
    itemIndex: 0,

    deleteShow: false,
    totalPages: 0,
    totalCount: 0,
    limit: 15,
    currentPage: 1,
    fatherArr: [],
    depGoodsArrAi: [],
    selectedSub: 0, // 选中的分类

    totalPageDis: 0,
    totalCountDis: 0,
    currentPageDis: 1,
    grandList: [],
    goodsList: [],
    leftGreatId: "",
    greatName: "",
    leftIndex: 0,

    isLoading: false,

    showAllSubCat: false,
    activeSubCatId: '', // 当前激活的分类ID
    scrollIntoView: '', // 滚动到指定分类
    categoryPositions: [], // 存储分类位置信息
    leftScrollTopNx: 0, // 左侧菜单 scroll-view 的 scrollTop

    // 新增的部门商品相关状态
    showAllSubCatDep: false, // 是否展开二级分类
    activeSubCatIdDep: '', // 当前选中的二级分类ID
    subcatScrollIntoViewDep: '', // 二级分类横向滚动位置
    scrollIntoViewDep: '', // 商品列表滚动位置

    // 图片弹窗相关状态
    showImageModal: false, // 是否显示图片弹窗
    currentImage: '', // 当前显示的图片URL
    currentGoods: null, // 当前显示图片的商品信息

  },

  onLoad: function (options) {
    this.setData({
      url: apiUrl.server,
      nowTime: dateUtils.getNowTime(),
    })
    var value = wx.getStorageSync('disInfo');
    if (value) {
      this.setData({
        disInfo: value,
        disId: value.gbDistributerId,
      })
    }
    var userValue = wx.getStorageSync('userInfo');
    if (userValue) {
      this.setData({
        userInfo: userValue
      })
    }

    var depValue = wx.getStorageSync('orderDepInfo');
    if (depValue) {
      this.setData({
        depInfo: depValue,
        depId: depValue.gbDepartmentId,
        disId: depValue.gbDepartmentDisId,
        tabs: [{
          id: 0,
          words: '"' + depValue.gbDepartmentName + '"' + "的商品"
        }, {
          id: 1,
          words: "商品手册"
        }],
      })
    }

    this._getInitDataDep();

  },

  hideModal: function () {
    this.setData({
      showGoodsModal: false
    });
  },

  // 显示图片弹窗
  showImageModal: function (e) {
    const goods = e.currentTarget.dataset.goods;
    var rel = '';
    if (goods.gbDisGoodsFile) {
      rel = goods.gbDisGoodsFile;
    } else if (goods._disGoodsImageRel) {
      rel = goods._disGoodsImageRel;
    } else if (goods.nxGoodsFile) {
      rel = goods.nxGoodsFile;
    } else {
      var ent = goods.gbDistributerGoodsEntity;
      if (ent) {
        rel = ent.gbDgGoodsFile || ent.gbDgGoodsFileImg || ent.gbDgGoodsFileLarge || '';
      }
    }
    var imageUrl = rel ? encodePathJoin(this.data.url, rel) : '/images/logo.png';

    this.setData({
      showImageModal: true,
      currentImage: imageUrl,
      currentGoods: goods
    });
  },

  // 隐藏图片弹窗
  hideImageModal: function () {
    this.setData({
      showImageModal: false,
      currentImage: '',
      currentGoods: null
    });
  },

  // 阻止事件冒泡
  stopPropagation: function () {
    // 阻止事件冒泡，防止点击内容区域时关闭弹窗
  },

  // 图片加载成功
  onImageLoad: function () {
  },

  // 图片加载失败
  onImageError: function () {
    wx.showToast({
      title: '图片加载失败',
      icon: 'none'
    });
  },


  toBusiness(e) {
    this.setData({
      goodsIndex: e.currentTarget.dataset.index,
    })
    var id = e.currentTarget.dataset.id;
    wx.setStorageSync('disGoods', e.currentTarget.dataset.goods);
    wx.navigateTo({
      url: '../stockGoodsBusiness/stockGoodsBusiness?depGoodsId=' + id + '&index=' + e.currentTarget.dataset.index,
    })
  },


  /**
   * 拉取部门商品分类并重载第一页列表（onLoad / 全量刷新）
   * @param {function=} onComplete 列表首屏写入完成后的回调（如 onShow 里再跑 _checkAndUpdateOrderData）
   */
  _getInitDataDep(onComplete) {
    load.showLoading("获取分类");
    var data = {
      disId: this.data.disId,
      depId: this.data.depInfo.gbDepartmentId
    }
    orderApi.depGetDepGoodsCataGb(data).then(res => {
      load.hideLoading();
      if (res.result.code === 0 && res.result.data.cataArr.length > 0) {
        const firstSubCat = res.result.data.cataArr[0].fatherGoodsEntities[0];
        this.setData({

          depGoodsCataArr: res.result.data.cataArr,
          sortDepGoodsArr: res.result.data.depGoodsArr,
          lastQueryEndIndex: 0,
          hasMoreGoods: true,
          activeSubCatIdDep: firstSubCat.gbDistributerFatherGoodsId,
          subcatScrollIntoViewDep: `subcat-dep-${firstSubCat.gbDistributerFatherGoodsId}`,
          fatherArr: res.result.data.cataArr[0].fatherGoodsEntities,
          depGoodsArrAi: [],
          currentPage: 1,
        }, () => {
          this._getInitDataPageDep(true, onComplete);
        });
      } else {
        this.setData({
          depGoodsArrAi: []
        }, () => {
          // 如果第一个swiper-item的depGoodsArrAi为空，则3秒后自动滑动到第二个swiper-item
          setTimeout(() => {
            this.setData({
              tab1Index: 1,
              itemIndex: 1
            });
          }, 1000);
        })
        if (typeof onComplete === 'function') {
          onComplete();
        }
      }
    });
  },

  // 全类别分页（跨分类补全）
  _getInitDataPageDep(isRefresh = false, callback) {
    if (this.data.isLoading) return;
    this.setData({
      isLoading: true
    });
    load.showLoading("加载商品…");

    orderApi.depGetDepGoodsGbPage({
      limit: this.data.limit,
      page: this.data.currentPage,
      depId: this.data.depInfo.gbDepartmentId
    }).then(res => {
      load.hideLoading();
      this.setData({
        isLoading: false
      });

      if (res.result.code !== 0) {
        return wx.showToast({
          title: res.result.msg,
          icon: 'none'
        });
      }

      // 1) 拿到这一页数据
      const list = res.result.page.list || [];
      const totalPages = res.result.page.totalPage || 1;
      const totalCount = res.result.page.totalCount || 0;

      // 2) 生成 viewId，让 id 唯一且连续
      const base = isRefresh ? 0 : this.data.depGoodsArrAi.length;
      list.forEach((item, idx) => {
        item.viewId = 'goods_' + (base + idx);
      });


      // 3) 合并数据
      const merged = this.data.depGoodsArrAi.concat(list);

      // 4) 合并后按 sortDepGoodsArr 顺序排序
      const idOrder = (this.data.sortDepGoodsArr || []).map(String);
      const sortedArr = merged.slice().sort((a, b) => {
        const idxA = idOrder.indexOf(String(a.gbDepartmentDisGoodsId));
        const idxB = idOrder.indexOf(String(b.gbDepartmentDisGoodsId));
        return (idxA === -1 ? 99999 : idxA) - (idxB === -1 ? 99999 : idxB);
      });

      // 5) 处理商品数据，添加 isFirstInCategory（对全量商品处理）
      const finalArr = this.processGoodsListDep(sortedArr);

      // 5) 写入并可回调滚动
      this.setData({
        depGoodsArrAi: finalArr,
        totalPages: totalPages,
        totalCount: totalCount,
        currentPage: this.data.currentPage,

      }, () => {
        this.calculateCategoryPositionsDep();
        
        // 如果数据加载完成后depGoodsArrAi仍然为空，则3秒后自动滑动到第二个swiper-item
        if (finalArr.length === 0 && this.data.tab1Index === 0) {
          setTimeout(() => {
            this.setData({
              tab1Index: 1,
              itemIndex: 1
            });
          }, 3000);
        }
        
        if (typeof callback === 'function') {
          setTimeout(callback, 50);
        }
      });
    });
  },


  /**
   * 
   */
  // 点击左侧分类
  leftMenuClickDep(e) {
    const idx = e.currentTarget.dataset.index;
    const firstSubCat = this.data.depGoodsCataArr[idx].fatherGoodsEntities[0];
    this.setData({
      selectedSub: idx,
      fatherArr: this.data.depGoodsCataArr[idx].fatherGoodsEntities,
      activeSubCatIdDep: firstSubCat.gbDistributerFatherGoodsId,
      subcatScrollIntoViewDep: `subcat-dep-${firstSubCat.gbDistributerFatherGoodsId}`,
    }, () => {
      // 检查当前已加载的商品中是否有该二级分类的商品
      const goodsArr = this.data.depGoodsArrAi;
      const hasGoods = goodsArr.some(
        item => String(item.gbDdgDisGoodsGrandId) === String(firstSubCat.gbDistributerFatherGoodsId)
      );

      if (hasGoods) {
        this.setData({
          scrollIntoViewDep: `cat-dep-${firstSubCat.gbDistributerFatherGoodsId}`
        });
      } else {
        // 直接调用loadGoodsBySubCatIdDep方法，请求特定分类的商品
        this.loadGoodsBySubCatIdDep(firstSubCat.gbDistributerFatherGoodsId, this.data.currentPage + 1, goodsArr);
      }
    });
  },


  // 滚动到底加载下一页（全类别模式）
  onReachBottomDep() {
    if (this.data.isLoading || this.data.currentPage >= this.data.totalPages) return;
    this.setData({
      currentPage: this.data.currentPage + 1
    }, () => {
      this._getInitDataPageDep(false);
    });
  },

  onSubCatTapDep(e) {
    const subCatId = e.currentTarget.dataset.id;
    this.setData({
      activeSubCatIdDep: subCatId,
      subcatScrollIntoViewDep: `subcat-dep-${subCatId}`,
      showAllSubCatDep: false,
    });

    // 修正：统计该二级分类商品数量
    const goodsArr = this.data.depGoodsArrAi;

    const hasGoods = goodsArr.some(
      item => String(item.gbDdgDisGoodsGrandId) === String(subCatId)
    );
    if (hasGoods) {
      wx.createSelectorQuery()
        .select(`#cat-dep-${subCatId}`)
        .boundingClientRect(rect => {
          if (rect) {
            this.setData({
              scrollIntoViewDep: 'cat-dep-' + subCatId
            });
          }
        })
        .exec();
    } else {
      // 递归请求接口，page 参数递增
      this.loadGoodsBySubCatIdDep(subCatId, this.data.currentPage + 1, goodsArr);
    }
  },

  // 加载指定二级分类的商品
  loadGoodsBySubCatIdDep(subCatId, page = 1, accumulatedGoods = []) {
    if (this.data.isLoading) return;

    this.setData({
      isLoading: true
    });
    load.showLoading("加载商品")
    orderApi.depGetDepGoodsGbPage({
      depId: this.data.depId,
      limit: this.data.limit,
      page: page,
    }).then(res => {
      this.setData({
        isLoading: false
      });
      load.hideLoading();
      if (res.result.code == 0) {
        // 1) 拿到这一页数据
        const list = res.result.page.list || [];
        const totalPages = res.result.page.totalPage || 1;
        const totalCount = res.result.page.totalCount || 0;

        // 2) 生成 viewId，让 id 唯一且连续
        const base = this.data.depGoodsArrAi.length;
        list.forEach((item, idx) => {
          item.viewId = 'goods_' + (base + idx);
        });
        for (var i = 0; i < list.length; i++) {
        }

        // 3) 合并数据
        const merged = this.data.depGoodsArrAi.concat(list);

        // 4) 合并后按 sortDepGoodsArr 顺序排序
        const idOrder = (this.data.sortDepGoodsArr || []).map(String);
        const sortedArr = merged.slice().sort((a, b) => {
          const idxA = idOrder.indexOf(String(a.gbDepartmentDisGoodsId));
          const idxB = idOrder.indexOf(String(b.gbDepartmentDisGoodsId));
          return (idxA === -1 ? 99999 : idxA) - (idxB === -1 ? 99999 : idxB);
        });

        // 5) 处理商品数据，添加 isFirstInCategory（对全量商品处理）
        const finalArr = this.processGoodsListDep(sortedArr);

        // 5) 写入并可回调滚动
        this.setData({
          depGoodsArrAi: finalArr,
          currentPage: page,
          totalPages: totalPages,
          totalCount: totalCount,
        }, () => {
          // 新增：数据加载后自动滚动到目标分类商品
          const goodsArr = this.data.depGoodsArrAi;
          const idx = goodsArr.findIndex(item => String(item.gbDdgDisGoodsGrandId) === String(subCatId));
         
          if (idx !== -1) {
            wx.createSelectorQuery()
              .select(`#cat-dep-${subCatId}`)
              .boundingClientRect(rect => {
                if (rect) {
                  this.setData({
                    scrollIntoViewDep: 'cat-dep-' + subCatId
                  }, () => {

                  });
                } else {
                  console.warn('[loadGoodsBySubCatIdDep] 未找到目标商品锚点', subCatId);
                }
              })
              .exec();
          } else {
            // 如果还有下一页，继续请求
            if (page < totalPages) {
              // 递归调用自身，请求下一页
              this.loadGoodsBySubCatIdDep(subCatId, page + 1, goodsArr);
            } else {
            }
          }
          this.calculateCategoryPositionsDep();
        });



      } else {
        wx.showToast({
          title: '商品加载失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      this.setData({
        isLoading: false
      });
      wx.showToast({
        title: '加载错误，请稍后再试',
        icon: 'none'
      });
    });
  },

  // 处理商品数据，添加分类信息
  processGoodsListDep(list) {
    const goodsMap = new Map();
    (list || []).forEach(function (item) {
      if (item && item.gbDepartmentDisGoodsId != null) {
        goodsMap.set(String(item.gbDepartmentDisGoodsId), item);
      }
    });
    const uniqueList = Array.from(goodsMap.values());

    let currentCategory = null;
    const result = uniqueList.map(item => {
      if (item.gbDdgDisGoodsGrandId !== currentCategory) {
        currentCategory = item.gbDdgDisGoodsGrandId;
        var obj = Object.assign({}, item, {
          isFirstInCategory: true,
          categoryName: this.getCategoryNameDep(item.gbDdgDisGoodsGrandId)
        });

        return obj;
      }
      var obj = Object.assign({}, item, {
        isFirstInCategory: false,
        categoryName: this.getCategoryNameDep(item.gbDdgDisGoodsGrandId)
      });

      return obj;
    });
    return result;
  },

  // 获取分类名称
  getCategoryNameDep(categoryId) {
    const category = this.data.fatherArr.find(item =>
      item.gbDistributerFatherGoodsId === categoryId
    );
    return category ? category.gbDfgFatherGoodsName : '';
  },

  // 切换二级分类展开/收起状态
  toggleSubCatDep() {
    this.setData({
      showAllSubCatDep: !this.data.showAllSubCatDep
    });
  },

  // 阻止遮罩层滚动
  stopScroll() {
    return false;
  },

  // 部门端商品滚动时联动二级分类高亮
  onGoodsScrollDep(e) {

    // 精准高亮二级分类，并联动一级分类
    const scrollTop = e && e.detail && typeof e.detail.scrollTop === 'number' ? e.detail.scrollTop : 0;
    const positions = this.data.categoryPositionsDep || [];


    let activeId = '';
    const threshold = 100;

    // 遍历所有分类位置，找到当前应该高亮的分类
    for (let i = positions.length - 1; i >= 0; i--) {
      const position = positions[i];

      if (scrollTop >= position.top) {
        activeId = position.id;
        break;
      }
    }

    // 边界兜底：如果没找到，默认第一个
    if (!activeId && positions.length > 0) {
      activeId = positions[0].id;
    }


    // 二级分类高亮
    if (activeId && activeId !== this.data.activeSubCatIdDep) {
      this.setData({
        activeSubCatIdDep: activeId,
        subcatScrollIntoViewDep: `subcat-dep-${activeId}`
      });
    } else {
    }

    // 联动一级分类高亮
    if (activeId && this.data.depGoodsCataArr) {

      // 从二级分类信息中获取一级分类ID，而不是从商品信息中获取
      let greatId = '';

      // 在 depGoodsCataArr 中查找包含当前二级分类的一级分类
      for (let i = 0; i < this.data.depGoodsCataArr.length; i++) {
        const category = this.data.depGoodsCataArr[i];
        const hasSubCategory = category.fatherGoodsEntities &&
          category.fatherGoodsEntities.some(sub => String(sub.gbDistributerFatherGoodsId) === String(activeId));

        if (hasSubCategory) {
          // 使用一级分类的索引作为ID，因为depGoodsCataArr是按顺序排列的
          greatId = i;
          break;
        }
      }

      if (greatId === '') {
        console.warn('[resGoodsAi/onGoodsScrollDep] 未找到二级分类对应的一级分类', { activeId });
      }

      // 直接使用索引，不需要再查找
      const subIndex = greatId;


      if (subIndex !== -1 && subIndex !== this.data.selectedSub) {
        this.setData({
          selectedSub: subIndex,
          fatherArr: this.data.depGoodsCataArr[subIndex].fatherGoodsEntities
        });
      } else {
      }
    } else {
    }

  },

  // 1. 新增：部门端商品分类锚点位置缓存
  calculateCategoryPositionsDep() {

    const query = wx.createSelectorQuery();
    query.selectAll('.goods-category-title-dep').boundingClientRect();
    query.select('.goods-list-dep').boundingClientRect();

    query.exec((res) => {

      if (res[0] && res[1]) {
        const categoryRects = res[0]; // 分类标题的矩形信息
        const listRect = res[1]; // 商品列表容器的矩形信息


        // 先计算所有原始 top
        let rawPositions = categoryRects.map((item, index) => {
          const id = item.id.replace('cat-dep-', '');
          const top = item.top - listRect.top;
          return {
            id,
            top
          };
        });

        // 取第一个的 top 作为基准
        const baseTop = rawPositions.length > 0 ? rawPositions[0].top : 0;

        // 重新计算所有 top，让第一个为 0
        let positions = rawPositions.map((item, idx) => {
          const normalizedTop = item.top - baseTop;
          return {
            id: item.id,
            top: normalizedTop
          };
        });

        // 按 top 从小到大排序
        positions.sort((a, b) => a.top - b.top);

        this.setData({
          categoryPositionsDep: positions
        });

        const goodsOrder = (this.data.depGoodsArrAi || []).map(g => g.gbDdgDisGoodsGrandId);

      } else {
        console.warn('未获取到有效的节点信息');
        console.warn('res[0] (分类标题):', res[0]);
        console.warn('res[1] (商品列表):', res[1]);
      }

    });
  },



  /**
   * tabItme点击
   */
  onTab1Click(event) {
    let index = event.currentTarget.dataset.index;
    this.setData({
      // sliderOffset: this.data.sliderOffsets[index],
      tab1Index: index,
      itemIndex: index,
    })
  },

  swiperChange(event) {
    this.setData({
      // sliderOffset: this.data.sliderOffsets[event.detail.current],
      tab1Index: event.detail.current,
      itemIndex: event.detail.current,
     

    })

    if (this.data.tab1Index == 0 && this.data.depGoodsArrAi.length == 0) {
      this._getInitDataDep();
    }
    if (this.data.tab1Index == 1 && this.data.goodsList.length == 0) {
      this.initDisData();

    }

  },

  /**
   * 配送申请，换订货规格
   * @param {*} e 
   */
  changeStandard: function (e) {
    var name = e.detail.applyStandardName;
    this.setData({
      applyStandardName: name,
      printStandard: name,
    })
  },


  // 
  applyGoodsDep(e) {
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
      canSave: true,

      applyStandardName: standard,
      applyRemark: e.currentTarget.dataset.depgoods.gbDdgOrderRemark,

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


  // 
  applyGoods(e) {

    var nx = e.currentTarget.dataset.nxgoods;

    this.setData({
      index: e.currentTarget.dataset.index,
      applySubtotal: "0.0元",
      canSave: false,
      itemDis: e.currentTarget.dataset.disgoods,
      nxGoods: e.currentTarget.dataset.nxgoods,
      depGoods: e.currentTarget.dataset.depgoods,

    })

    if (e.currentTarget.dataset.disgoods == null) {

      this.setData({
        showNx: true,
        applyStandardName: e.currentTarget.dataset.nxgoods.nxGoodsStandardname,
        printStandard: e.currentTarget.dataset.nxgoods.nxGoodsStandardname,
      })
    } else {
      if (e.currentTarget.dataset.disgoods.gbDgPullOff == 1) {
        wx.showToast({
          title: '停止订货',
          icon: 'none'
        })

      } else {
        this.setData({
          show: true,
          applyStandardName: e.currentTarget.dataset.disgoods.gbDgGoodsStandardname,
          printStandard: e.currentTarget.dataset.disgoods.gbDgGoodsStandardname,

        })
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
        showDep: true,
        applyStandardName: applyItem.gbDoStandard,
        editApply: true,
        applyNumber: applyItem.gbDoQuantity,
        applyRemark: applyItem.gbDoRemark,
        depGoods: e.currentTarget.dataset.depgoods,
      })

      if (e.currentTarget.dataset.depgoods !== null && e.currentTarget.dataset.depgoods.gbDepartmentGoodsStockEntities.length > 0) {

        this.setData({
          hasStock: true
        })
      } else {
        this.setData({
          hasStock: false
        })
      }


    }
  },

  toEditApply(e) {
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
        applyItem: e.currentTarget.dataset.order,
        show: true,
        applyStandardName: applyItem.gbDoStandard,
        itemDis: e.currentTarget.dataset.disgoods,
        nxGoods: e.currentTarget.dataset.nxgoods,
        editApply: true,
        applyNumber: applyItem.gbDoQuantity,
        applyRemark: applyItem.gbDoRemark,
        index: e.currentTarget.dataset.index,
      })

      if (this.data.applyItem.gbDoSubtotal !== null) {
        this.setData({
          applySubtotal: applyItem.gbDoSubtotal + "元"
        })
      }
    }
  },


  confirmDep(e) {
    if (this.data.editApply) {
      this._updateDisOrderDep(e);
    } else {

      this._saveOrderDep(e);

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
      nxGoods: null,
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

  _getDistributerStandardEntities: function () {
    var depGoods = this.data.depGoods;
    if (depGoods && depGoods.gbDistributerStandardEntities) {
      return depGoods.gbDistributerStandardEntities;
    }
    var itemDis = this.data.itemDis;
    if (itemDis && itemDis.gbDistributerStandardEntities) {
      return itemDis.gbDistributerStandardEntities;
    }
    return [];
  },

  _getBaseStandardName: function () {
    var depGoods = this.data.depGoods;
    if (depGoods) {
      return depGoods.gbDdgShowStandardName || depGoods.gbDgGoodsStandardname || "";
    }
    var itemDis = this.data.itemDis;
    if (itemDis) {
      return itemDis.gbDgGoodsStandardname || "";
    }
    var nx = this.data.nxGoods;
    if (nx) {
      return nx.nxGoodsStandardname || "";
    }
    return "";
  },

  _findDsStandardScale: function (applyStandardName) {
    var std = applyStandardName != null ? String(applyStandardName).trim() : "";
    if (!std) {
      return null;
    }
    var entities = this._getDistributerStandardEntities();
    for (var i = 0; i < entities.length; i++) {
      var row = entities[i];
      if (!row || String(row.gbDsStandardName).trim() !== std) {
        continue;
      }
      var scale = row.gbDsStandardScale;
      if (scale === null || scale === undefined || scale === "") {
        return null;
      }
      var n = Number(scale);
      if (isFinite(n) && n > 0) {
        return n;
      }
      return null;
    }
    return null;
  },

  /**
   * 订货规格系数：优先外包装 nxGoodsItemsPerCarton，其次 gbDistributerStandardEntities.gbDsStandardScale。
   */
  _resolveOrderStandardScale: function (applyStandardName) {
    var outerScale = this._gbDoDsStandardScaleForOuterPack(applyStandardName);
    if (outerScale !== -1 && outerScale > 0) {
      return outerScale;
    }
    var dsScale = this._findDsStandardScale(applyStandardName);
    if (dsScale != null && dsScale > 0) {
      return dsScale;
    }
    return -1;
  },

  _buildOrderScaleFields: function (applyStandardName, applyNumber) {
    var std = applyStandardName != null ? String(applyStandardName).trim() : "";
    var baseStd = String(this._getBaseStandardName()).trim();
    var scale = this._resolveOrderStandardScale(applyStandardName);
    var fields = {
      gbDoDsStandardScale: scale,
      gbDoScaleWeight: "",
      gbDoScalePrice: "",
    };
    if (scale !== -1 && scale > 0 && std && baseStd && std !== baseStd) {
      fields.gbDoScaleWeight = applyNumber != null && applyNumber !== "" ? String(applyNumber) : "";
    }
    return fields;
  },

  _applyOrderScaleFields: function (target, applyStandardName, applyNumber) {
    var scaleFields = this._buildOrderScaleFields(applyStandardName, applyNumber);
    target.gbDoDsStandardScale = scaleFields.gbDoDsStandardScale;
    target.gbDoScaleWeight = scaleFields.gbDoScaleWeight;
    target.gbDoScalePrice = scaleFields.gbDoScalePrice;
    return target;
  },
  

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
      gbGoodsId = this.data.nxGoods.nxGoodsId;
      gbGoodsFatherId = this.data.nxGoods.nxGoodsFatherId;
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
      stockIsZero: e.detail.stockIsZero,

    };
    this._applyOrderScaleFields(dg, e.detail.applyStandardName, e.detail.applyNumber);
    if (this.data.itemDis == null) {
      load.showLoading("保存订单");
      orderApi.createDepartmentOrderFromNxGoodsImport(dg).then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          load.hideLoading();
          wx.setStorageSync('needRefreshOrderData', true);
          var newGoods = res.result.data.gbDistributerGoodsEntity;
          var data = "goodsList[" + this.data.index + "].gbDepartmentOrdersEntity";
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
        orderApi.createDepartmentOrderWithNewDepDisGoods(dg).then(res => {
          load.hideLoading();
          if (res.result.code == 0) {
            wx.setStorageSync('needRefreshOrderData', true);

            var data = "goodsList[" + this.data.index + "].gbDepartmentOrdersEntity";
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
        orderApi.createDepartmentOrderForJj(dg).then(res => {
          load.hideLoading();
          if (res.result.code == 0) {
            load.hideLoading();
            wx.setStorageSync('needRefreshOrderData', true);
            if (this.data.tab1Index == 0) {
              var data = "depGoodsArrAi[" + this.data.index + "].gbDepartmentOrdersEntity";
              this.setData({
                [data]: res.result.data,
              })
              if(e.detail.stockIsZero){
                var dataStock = "depGoodsArrAi[" + this.data.index + "].gbDepartmentGoodsStockEntities";
                this.setData({
                  [dataStock]: [],
                })
              }

            } else {
              var data = "goodsList[" + this.data.index + "].gbDepartmentOrdersEntity";
              this.setData({
                [data]: res.result.data
              })

              //查找 depGoodsArrAi 的那个gbDdgDisGoodsId = res.result.data.gbDoDisGoodsId
              //更新 depGoodsArrAi 的gbDepartmentOrdersEntity 等于res.result.data
              const depGoodsArrAi = this.data.depGoodsArrAi;
              const targetIndex = depGoodsArrAi.findIndex(goods =>
                goods.gbDdgDisGoodsId === res.result.data.gbDoDisGoodsId
              );

              if (targetIndex !== -1) {
                const updatePath = `depGoodsArrAi[${targetIndex}].gbDepartmentOrdersEntity`;
                this.setData({
                  [updatePath]: res.result.data
                });
              } else {
              }
            }

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
  _updateDisOrderDep(e) {
    var that = this;
    var dg = {
      id: that.data.applyItem.gbDepartmentOrdersId,
      weight: e.detail.applyNumber,
      standard: e.detail.applyStandardName,
      remark: e.detail.applyRemark,
    };
    this._applyOrderScaleFields(dg, e.detail.applyStandardName, e.detail.applyNumber);
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
      stockIsZero: e.detail.stockIsZero,
      gbDoPrintStandard: this.data.printStandard,

    };
    this._applyOrderScaleFields(dg, e.detail.applyStandardName, e.detail.applyNumber);
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

  /**
   * 修改配送申请
   * @param {} e 
   */
  _updateDisOrder(e) {
    var that = this;
    var dg = {
      id: that.data.applyItem.gbDepartmentOrdersId,
      weight: e.detail.applyNumber,
      standard: e.detail.applyStandardName,
      remark: e.detail.applyRemark,
    };
    this._applyOrderScaleFields(dg, e.detail.applyStandardName, e.detail.applyNumber);
    load.showLoading("修改订单");
    orderApi.updateOrderGbJj(dg).then(res => {
      wx.setStorageSync('needRefreshOrderData', true);
      load.hideLoading();
      if (res.result.code == 0) {
        load.hideLoading();
        
        wx.setStorageSync('needRefreshOrderData', true);

       //根据一下的disGoodsId更新depGoodsArrAi 的订单
        var orderDisGoodsId = res.result.data.gbDoDisGoodsId;
        // depGoodsArrAi的 item.gbDdgDisGoodsId
        
        // 查找并更新 depGoodsArrAi 中对应商品的订单信息
        const depGoodsArrAi = this.data.depGoodsArrAi;
        const targetIndex = depGoodsArrAi.findIndex(goods =>
          goods.gbDdgDisGoodsId === orderDisGoodsId
        );

        if (targetIndex !== -1) {
          const updatePath = `depGoodsArrAi[${targetIndex}].gbDepartmentOrdersEntity`;
          this.setData({
            [updatePath]: res.result.data
          });
        } else {
        }

        var data = "goodsList[" + this.data.index + "].gbDepartmentOrdersEntity";
        this.setData({
          [data]: res.result.data
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


  //获取dis数据
  initDisData() {
    load.showLoading("获取商品")
    var that = this;
   
    orderApi.gbGetNxGoodsCataGoods().then(res => {
      if (res.result.code == 0) {
        load.hideLoading();
        const firstCata = res.result.data.cataArr[0];
        var newId = firstCata.nxGoodsEntityList[0].nxGoodsId;
        const greatLabel = firstCata.nxDfgGoodsName || firstCata.nxGoodsName || '';
        this.setData({
          grandList: res.result.data.cataArr,
          sortDepGoodsArrDis: res.result.data.nxGoodsIdsSort,
          fatherArrDis: firstCata.nxGoodsEntityList,
          leftGreatId: firstCata.nxGoodsId,
          selectedSubCategoryId: firstCata.nxGoodsEntityList[0].nxGoodsId,
          greatName: greatLabel,
          fatherSonsIndex: 0,
          activeSubCatId: String(newId),
        })
        that._getFatherGoodsDis();


      }
    })
  },


  _getFatherGoodsDis() {
    const data = {
      depId: this.data.depId,
      greatGrandId: this.data.leftGreatId,
      limit: this.data.limit,
      page: this.data.currentPageDis,
      disId: this.data.disId,
    };

    orderApi.gbDepGetNxGoodsByGreatGrandId(data).then(res => {
      if (res.result.code == 0) {
        const rawList = res.result.page.list || [];
    
        const orderedList = this.sortGoodsListDisForDisplay(rawList);
        const processedList = this.processGoodsListDis(orderedList);

        var subCatId = this.data.activeSubCatId;
        const anchor = `cat-${subCatId}`;
        logDisScrollStep('_getFatherGoodsDis 即将写入列表并滚动', {
          page: this.data.currentPageDis,
          activeSubCatId: subCatId,
          anchor,
          listLen: processedList.length,
          anchorsFirst: processedList
            .filter((g) => g.isFirstInCategory)
            .slice(0, 15)
            .map((g) => ({ grand: g.nxGoodsGrandId, a: `cat-${g.nxGoodsGrandId}` })),
        });

        this.setData({
          goodsList: processedList,
          currentPageDis: this.data.currentPageDis,
          totalPageDis: res.result.page.totalPage,
          totalCountDis: res.result.page.totalCount,

          subcatScrollIntoView: `subcat-${subCatId}`,
          scrollIntoView: '', // 由回调里 _scrollDisGoodsToAnchor 统一处理，避免与查询竞态
        }, () => {
          this._disSubCatScrollLockUntil = Math.max(this._disSubCatScrollLockUntil || 0, Date.now() + 500);
          this.calculateCategoryPositionsDis();
          this._scrollDisGoodsToAnchor(anchor, subCatId, '_getFatherGoodsDis');
        });
      }
    });
  },


  changeGreatGrandDis(e) {
    const categoryId = e.currentTarget.dataset.id;
    this.setData({
      leftGreatId: categoryId,
      leftIndex: e.currentTarget.dataset.index,
      goodsList: [],
      currentPageDis: 1,
      totalPageDis: 0,
      isLoading: false,
      greatName: e.currentTarget.dataset.name,
      fatherArrDis: this.data.grandList[e.currentTarget.dataset.index].nxGoodsEntityList,
      selectedSubCategoryId: this.data.grandList[e.currentTarget.dataset.index].nxGoodsEntityList[0].nxGoodsId,
      activeSubCatId: String(this.data.grandList[e.currentTarget.dataset.index].nxGoodsEntityList[0].nxGoodsId),

    }, () => {
      // 用 this.createSelectorQuery() 保证作用域
      const query = this.createSelectorQuery();
      query.select(`#left-cat-${categoryId}`).boundingClientRect();
      query.select('#leftScroll').boundingClientRect(); // ← 改这里
      query.select('#leftScroll').scrollOffset(); // ← 和这里
      query.exec(res => {
        var itemRect = res[0];
        var scrollRect = res[1];
        var scrollOffset = res[2];
        const itemTop = itemRect.top;
        const itemH = itemRect.height;
        const listTop = scrollRect.top;
        const listH = scrollRect.height;
        const scrollTop0 = scrollOffset.scrollTop;

        const targetScrollTop = scrollTop0 + itemTop - listTop - (listH / 2) + (itemH / 2);
        this.setData({
          leftScrollTopNx: targetScrollTop
        });
      });
    });

    this._getFatherGoodsDis();
  },

  onScrollToLowerDis: function () {
    // 防止重复请求
    if (this.data.isLoading || this.data.goodsList.length >= this.data.totalCountDis) return;

    this.setData({
      isLoading: true
    });

    var currentPageDis = this.data.currentPageDis;
    var totalPageDis = this.data.totalPageDis;
    var disId = this.data.disId;
    var leftGreatId = this.data.leftGreatId;
    var depId = this.data.depId;
    var limit = this.data.limit;

    // 确保非搜索模式，并且当前页数未超过总页数
    if (currentPageDis <= totalPageDis) {
      // 先设置下一页页码
      const nextPage = currentPageDis + 1;
      this.setData({
        currentPageDis: nextPage
      });

      const data = {
        limit: limit,
        page: nextPage,
        depId: depId,
        greatGrandId: leftGreatId,
        disId: disId,
      };

      orderApi.gbDepGetNxGoodsByGreatGrandId(data)
        .then((res) => {
          if (res.result.code == 0) {
            const newItems = res.result.page.list || [];
            logDisApiGoodsFirst10(`onScrollToLowerDis page=${nextPage}`, newItems);

            const idOrder = (this.data.sortDepGoodsArrDis || []).map(String);

            const mergedSorted = this.sortGoodsListDisForDisplay(this.data.goodsList.concat(newItems));
            const updatedGoodsList = this.processGoodsListDis(mergedSorted);

            const activeSubKeep = this.data.activeSubCatId;

            // 更新商品列表和分页信息
            this.setData({
              goodsList: updatedGoodsList,
              totalPageDis: res.result.page.totalPage,
              totalCountDis: res.result.page.totalCount,
              isLoading: false,
            }, () => {
              // 追加页后列表重排，首屏可能仍是上一子类，短暂不要让 onGoodsScrollDis 改回顶部标签
              if (activeSubKeep != null && activeSubKeep !== '') {
                this._disSubCatScrollLockUntil = Math.max(this._disSubCatScrollLockUntil || 0, Date.now() + 500);
              }
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

    } else {
      this.setData({
        isLoading: false
      });
    }
  },


  onGoodsScrollDis(e) {
    // 程序化 scroll-into-view 后仍会触发 scroll，此时首屏可能短暂落在上一分类，避免把顶部标签抢改回去
    if (Date.now() < (this._disSubCatScrollLockUntil || 0)) {
      return;
    }
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
          const rawGrand = firstVisibleItem.nxGoodsGrandId;
          const activeId = rawGrand == null || rawGrand === '' ? '' : String(rawGrand);
          const cur = this.data.activeSubCatId == null || this.data.activeSubCatId === '' ? '' : String(this.data.activeSubCatId);
          if (activeId && activeId !== cur) {
            this.setData({
              activeSubCatId: activeId,
              subcatScrollIntoView: `subcat-${activeId}`
            });
          }
        }
      }
    });
  },


  toggleSubCatDis() {
    this.setData({
      showAllSubCat: !this.data.showAllSubCat
    });
  },

  /**
   * 滚动右侧 goods-list 到子分类锚点。带日志；若 DOM 未就绪会延时重试（关闭展开层后常见）。
   * @param {string} anchor 如 cat-123
   * @param {*} subCatId 子类 id（仅用于日志）
   * @param {string} from 调用来源
   */
  _scrollDisGoodsToAnchor(anchor, subCatId, from) {
    const delays = [0, 50, 200];
    const tryAt = (idx) => {
      const delay = delays[idx];
      const run = () => {
        this.setData({ scrollIntoView: '' }, () => {
          this.createSelectorQuery()
            .select(`#${anchor}`)
            .boundingClientRect((rect) => {
              const hit = rect != null;
              logDisScrollStep(`${from} #${anchor} delay=${delay}ms`, {
                subCatId,
                subCatStr: String(subCatId),
                hit,
                rect: rect
                  ? { id: rect.id, top: rect.top, left: rect.left, width: rect.width, height: rect.height }
                  : null,
                scrollIntoView_before: this.data.scrollIntoView,
              });
              if (hit) {
                this._disSubCatScrollLockUntil = Date.now() + 550;
                this.setData({ scrollIntoView: anchor }, () => {
                  logDisScrollStep(`${from} set scrollIntoView OK`, {
                    scrollIntoView: this.data.scrollIntoView,
                  });
                });
              } else if (idx < delays.length - 1) {
                logDisScrollStep(`${from} 锚点未就绪，${delays[idx + 1]}ms 再试`, { anchor, tryIndex: idx + 1 });
                tryAt(idx + 1);
              } else {
                console.warn('[resGoodsAi/dis-scroll] 重试用尽仍无锚点', {
                  from,
                  anchor,
                  subCatId,
                  goodsLen: this.data.goodsList.length,
                  anchorsExpected: this.data.goodsList
                    .filter((g) => g.isFirstInCategory)
                    .map((g) => ({ nxGoodsGrandId: g.nxGoodsGrandId, anchor: `cat-${g.nxGoodsGrandId}` })),
                });
              }
            })
            .exec();
        });
      };
      if (delay === 0) {
        run();
      } else {
        setTimeout(run, delay);
      }
    };
    tryAt(0);
  },


  // Dis点击标签事件
  onSubCatTapDis(e) {
    this._disSubCatScrollLockUntil = Date.now() + 600;
    const subCatId = e.currentTarget.dataset.id;
    const anchor = `cat-${subCatId}`;

    const fatherIds = (this.data.fatherArrDis || []).map((f) => String(f.nxGoodsId));
    const grandsInGoods = [...new Set(this.data.goodsList.map((g) => String(g.nxGoodsGrandId)))];
    const anchorsFirst = this.data.goodsList
      .filter((g) => g.isFirstInCategory)
      .map((g) => ({
        nxGoodsGrandId: g.nxGoodsGrandId,
        t: typeof g.nxGoodsGrandId,
        anchor: `cat-${g.nxGoodsGrandId}`,
      }));

    logDisScrollStep('onSubCatTapDis 点击', {
      dataset: e.currentTarget.dataset,
      subCatId,
      typeofSubCatId: typeof subCatId,
      leftGreatId: this.data.leftGreatId,
      currentPageDis: this.data.currentPageDis,
      totalPageDis: this.data.totalPageDis,
      showAllSubCat: this.data.showAllSubCat,
      goodsLen: this.data.goodsList.length,
      fatherArrDisLen: fatherIds.length,
      fatherIdsHead: fatherIds.slice(0, 12),
      grandsInGoodsHead: grandsInGoods.slice(0, 20),
      anchorsFirstInCategory: anchorsFirst,
      targetAnchor: anchor,
    });

    const hasGoods = this.data.goodsList.some((item) => String(item.nxGoodsGrandId) === String(subCatId));
    const matchIndices = [];
    this.data.goodsList.forEach((item, i) => {
      if (String(item.nxGoodsGrandId) === String(subCatId)) matchIndices.push(i);
    });
    logDisScrollStep('onSubCatTapDis hasGoods', {
      hasGoods,
      matchCount: matchIndices.length,
      firstIndex: matchIndices[0],
      lastIndex: matchIndices.length ? matchIndices[matchIndices.length - 1] : -1,
    });

    this.setData(
      {
        showAllSubCat: false,
        activeSubCatId: String(subCatId),
        subcatScrollIntoView: `subcat-${subCatId}`,
      },
      () => {
        logDisScrollStep('onSubCatTapDis setData(关展开) 回调', {
          showAllSubCat: this.data.showAllSubCat,
          activeSubCatId: this.data.activeSubCatId,
        });
        if (hasGoods) {
          this._scrollDisGoodsToAnchor(anchor, subCatId, 'onSubCatTapDis');
        }
      }
    );

    if (!hasGoods) {
      logDisScrollStep('onSubCatTapDis 列表无该子类，走后加载', { subCatId });
      this.startLoadingGoodsForSubCat(subCatId);
    }
  },

  async startLoadingGoodsForSubCat(subCatId) {
    if (this.data.isLoading) {
      logDisScrollStep('startLoadingGoodsForSubCat 跳过 isLoading', { subCatId });
      return;
    }

    if (this.data.currentPageDis >= this.data.totalPageDis) {
      logDisScrollStep('startLoadingGoodsForSubCat 已到最后一页', {
        subCatId,
        currentPageDis: this.data.currentPageDis,
        totalPageDis: this.data.totalPageDis,
      });
      wx.showToast({
        title: '没有更多商品了',
        icon: 'none'
      });
      return;
    }

    this.setData({
      isLoading: true
    });

    // 显示loading提示
    wx.showLoading({
      title: '正在加载商品...',
      mask: true
    });

    try {
      // 修复：传入现有的goodsList数据，而不是空数组
      await this.loadGoodsBySubCatIdDis(subCatId, this.data.currentPageDis + 1, this.data.goodsList);
    } catch (error) {
      console.error(`<<< 分类 ${subCatId} 商品加载失败:`, error);
    } finally {
      this.setData({
        isLoading: false
      });
      // 隐藏loading提示
      wx.hideLoading();
    }
  },

  async loadGoodsBySubCatIdDis(subCatId, page, loadedGoods) {
    var limit = this.data.limit;
    var depId = this.data.depId;
    var leftGreatId = this.data.leftGreatId;
    var disId = this.data.disId;
    const data = {
      limit: limit,
      page: page,
      depId: depId,
      greatGrandId: leftGreatId,
      disId: disId,
    };

    try {

      const res = await orderApi.gbDepGetNxGoodsByGreatGrandId(data);
      if (res.result.code === 0) {
        const newItems = res.result.page.list || [];
        const merged = loadedGoods.concat(newItems);
        const sortedArr = this.sortGoodsListDisForDisplay(merged);
        const hasGoodsInNewItems = newItems.some(item => String(item.nxGoodsGrandId) === String(subCatId));
        if (hasGoodsInNewItems) {
          const processedGoods = this.processGoodsListDis(sortedArr);
          const anchor = `cat-${subCatId}`;
          logDisScrollStep('loadGoodsBySubCatIdDis 找到本页含目标子类', {
            subCatId,
            page,
            newItemsLen: newItems.length,
            mergedLen: sortedArr.length,
            processedLen: processedGoods.length,
            anchorsFirst: processedGoods
              .filter((g) => g.isFirstInCategory)
              .map((g) => ({ grand: g.nxGoodsGrandId, a: `cat-${g.nxGoodsGrandId}` })),
            targetAnchor: anchor,
          });

          this.setData({
            goodsList: processedGoods,
            currentPageDis: page,
            totalPageDis: res.result.page.totalPage,
            totalCountDis: res.result.page.totalCount,
            isLoading: false, // 找到目标商品后关闭loading
          });

          setTimeout(() => {
            this._disSubCatScrollLockUntil = Math.max(this._disSubCatScrollLockUntil || 0, Date.now() + 500);
            this._scrollDisGoodsToAnchor(anchor, subCatId, 'loadGoodsBySubCatIdDis');
          }, 100);

        } else if (page <= this.data.totalPageDis) {
          // 继续递归加载，保持loading状态
          await this.loadGoodsBySubCatIdDis(subCatId, page + 1, sortedArr);
        } else {
          const processedGoods = this.processGoodsListDis(sortedArr);

          this.setData({
            goodsList: processedGoods,
            currentPageDis: page,
            totalPageDis: res.result.page.totalPage,
            totalCountDis: res.result.page.totalCount,
            isLoading: false, // 加载完所有页面后关闭loading
          });

          // 提示用户未找到目标分类商品
          wx.showToast({
            title: '未找到该分类商品',
            icon: 'none'
          });
        }
      } else {
        console.error(`>>> 第 ${page} 页商品获取失败:`, res.result.msg);
        this.setData({
          isLoading: false // 请求失败时也要关闭loading
        });
        wx.showToast({
          title: '获取商品失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error(`>>> 请求第 ${page} 页商品时发生异常:`, error);
      this.setData({
        isLoading: false // 异常时也要关闭loading
      });
      throw error;
    }
  },

  // 按顶部子类标签顺序聚合，再在同类内按部门常用顺序(depGoodsArr)排列，避免接口按 dep 顺序交错 nxGoodsGrandId 导致滚动高亮乱跳
  sortGoodsListDisForDisplay(list) {
    const father = this.data.fatherArrDis || [];
    const grandRank = {};
    father.forEach((f, idx) => {
      grandRank[String(f.nxGoodsId)] = idx;
    });
    const sortOrder = (this.data.sortDepGoodsArrDis || []).map(String);
    const depIdx = (nid) => {
      const i = sortOrder.indexOf(String(nid));
      return i === -1 ? 999999 : i;
    };
    return list.slice().sort((a, b) => {
      const ra = grandRank[String(a.nxGoodsGrandId)];
      const rb = grandRank[String(b.nxGoodsGrandId)];
      const raN = ra === undefined ? 9999 : ra;
      const rbN = rb === undefined ? 9999 : rb;
      if (raN !== rbN) return raN - rbN;
      return depIdx(a.nxGoodsId) - depIdx(b.nxGoodsId);
    });
  },

  // 处理商品数据，添加分类信息
  processGoodsListDis(list) {
    // 去重处理：确保每个商品ID只出现一次
    const goodsMap = new Map();
    list.forEach(item => {
      goodsMap.set(String(item.nxGoodsId), item);
    });
    const uniqueList = Array.from(goodsMap.values());


    let currentCategory = null;
    const result = uniqueList.map(item => {
      const grandKey = item.nxGoodsGrandId == null || item.nxGoodsGrandId === '' ? item.nxGoodsGrandId : String(item.nxGoodsGrandId);
      // var imgPatch = { _disGoodsImageRel: pickDisGoodsImageRel(item) };
      if (grandKey !== currentCategory) {
        currentCategory = grandKey;
        return Object.assign({}, item, {
          isFirstInCategory: true,
          categoryName: this.getCategoryNameDis(item.nxGoodsGrandId)
        });
      }
      return Object.assign({}, item, {
        isFirstInCategory: false,
        categoryName: this.getCategoryNameDis(item.nxGoodsGrandId)
      });
    });

   
    return result;
  },

  // 计算分类位置（锚点在首行 .product-item.dis-cat-anchor 上，与 scroll-into-view 一致）
  calculateCategoryPositionsDis() {
    const query = this.createSelectorQuery();
    query.selectAll('.dis-cat-anchor').boundingClientRect();
    query.select('.goods-list').boundingClientRect();

    query.exec((res) => {
      if (res[0] && res[1] && res[0].length) {
        const listRect = res[1];
        const positions = res[0]
          .map((item) => {
            const sid = item.id || '';
            const id = sid.indexOf('cat-') === 0 ? sid.replace('cat-', '') : '';
            return id ? { id, top: item.top - listRect.top } : null;
          })
          .filter(Boolean);

        this.setData({
          categoryPositions: positions
        });
      }
    });
  },

  // 获取分类名称（全部配送 tab：须用 fatherArrDis，与顶部子类标签一致）
  getCategoryNameDis(categoryId) {
    const cid = categoryId == null || categoryId === '' ? '' : String(categoryId);
    if (!cid) return '';
    const list = this.data.fatherArrDis || [];
    const category = list.find((item) => String(item.nxGoodsId) === cid);
    if (!category) return '';
    return category.nxGoodsName || category.nxDfgFatherGoodsName || '';
  },


  changeGreatGrand(e) {
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
        fatherArr: this.data.grandList[e.currentTarget.dataset.index].gbGoodsEntityList,
        selectedSubCategoryId: this.data.grandList[e.currentTarget.dataset.index].gbGoodsEntityList[0].gbGoodsId,
      });
      this._getFatherGoods();

    }

  },


  _getFatherGoods() {

    var data = {
      depId: this.data.depId,
      greatGrandId: this.data.leftGreatId,
      limit: this.data.limit,
      page: this.data.currentPage,
      disId: this.data.disId
    }
    orderApi.gbDepGetNxGoodsByGreatGrandId(data).then(res => {
      if (res.result.code == 0) {

        this.setData({
          goodsList: res.result.page.list,
          selectedSubCategoryId: this.data.grandList[this.data.leftIndex].gbGoodsEntityList[0].gbGoodsId,
          currentPage: this.data.currentPage + 1,
          totalPage: res.result.page.totalPage,
          totalCount: res.result.page.totalCount,
        })
      }
    })
  },


  onScrollToLower: function () {
    // 防止重复请求
    if (this.data.isLoading || this.data.goodsList.length >= this.data.totalCount) return;

    this.setData({
      isLoading: true
    });

    var currentPage = this.data.currentPage;
    var totalPage = this.data.totalPage;
    var leftGreatId = this.data.leftGreatId;
    var depId = this.data.depId;
    var limit = this.data.limit;
    var disId = this.data.disId;

    // 确保当前页数未超过总页数
    if (currentPage <= totalPage) {
      const data = {
        limit: limit,
        page: currentPage,
        depId: depId,
        greatGrandId: leftGreatId,
        disId: disId,
      };

      orderApi.gbDepGetNxGoodsByGreatGrandId(data)
        .then((res) => {
          if (res.result.code == 0) {
            const newItems = res.result.page.list || [];
            var updatedGoodsList = this.data.goodsList.concat(newItems);

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


  delDepGoods(e) {

    var depGoods = e.currentTarget.dataset.item;
    if (depGoods.gbDepartmentGoodsStockEntities.length == 0 && depGoods.gbDepartmentOrdersEntity == null) {
      this.setData({
        depGoods: depGoods,
        editOrderIndex: e.currentTarget.dataset.index,
        warnContent: depGoods.gbDdgDepGoodsName,
        showDep: false,
        show: false,
        popupType: 'deleteGoods',
        showPopupWarn: true,
      })

    } else {

      wx.showModal({
        title: '有未完成数据',
        content: '有未完成订单或库存，请把该商品库存清零后，再进行删除。',
        showCancel: false,
        confirmText: '好的',
        complete: (res) => {
          if (res.confirm) {

          }
        }
      })
    }


  },


  confirmWarn() {
    if (this.data.popupType == 'deleteStandard') {
      this.deleteStandardApi()
    } else {
      if (this.data.popupType == 'deleteOrder') {

        this.deleteApplyApi()
      } else if (this.data.popupType == 'deleteGoods') {
        this._delteDepGoods();
      }

    }
  },


  _delteDepGoods() {

    var id = this.data.depGoods.gbDepartmentDisGoodsId;
    orderApi.deleteDepGoods(id).then(res => {
      if (res.result.code == 0) {
        var arr = this.data.depGoodsArrAi;
        arr.splice(this.data.editOrderIndex, 1);
        this.setData({
          depGoodsArrAi: arr
        })
      }
    })

  },

  delStandard(e) {
    this.setData({
      warnContent: e.detail.standardName,
      show: false,
      popupType: 'deleteStandard',
      showPopupWarn: true,
      disStandardId: e.detail.id,
    })

  },


  deleteApplyApi() {

    this.setData({
      popupType: "",
      showPopupWarn: false,
      delGoodsId: this.data.applyItem.gbDoDisGoodsId,

    })

    var that = this;
    load.showLoading("删除订单");
    orderApi.deleteOrderGb(this.data.applyItem.gbDepartmentOrdersId).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {

        wx.setStorageSync('needRefreshOrderData', true);

        if (that.data.tab1Index == 0) {

          var data = "depGoodsArrAi[" + this.data.index + "].gbDepartmentOrdersEntity";
          this.setData({
            [data]: null
          })

        }
        if (that.data.tab1Index == 1) {

          var data1 = "goodsList[" + this.data.index + "].gbDepartmentOrdersEntity";
          this.setData({
            [data1]: null
          })

          //这里也把depGoodsArrAi 的同步一下
          // 查找 depGoodsArrAi 中对应的商品并清空其订单信息
          const depGoodsArrAi = this.data.depGoodsArrAi;
          const targetIndex = depGoodsArrAi.findIndex(goods =>
            goods.gbDdgDisGoodsId === this.data.delGoodsId
          );

          if (targetIndex !== -1) {
            const updatePath = `depGoodsArrAi[${targetIndex}].gbDepartmentOrdersEntity`;
            this.setData({
              [updatePath]: null
            });
          } else {
          }

        }
        that.cancle()

      }
    })
  },

  deleteStandardApi(e) {

      
    orderApi.gbDisDeleteStandard(this.data.disStandardId).then(res => {
      if (res.result.code == 0) {
        var standards = "depGoods.gbDistributerStandardEntities"
        this.setData({
          [standards]: res.result.data.gbDistributerStandardEntities,
        })
          var dataGoods = "depGoodsArrAi[" + this.data.index + "].gbDistributerStandardEntities";
          this.setData({
            [dataGoods]: res.result.data.gbDistributerStandardEntities,
          })

        this.setData({
          popupType: "",
          showPopupWarn: false,
          disStandardId: "",
          itemDis: "",
          item: "",
          editApply: false,
          show: false,
        })

      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },

  confirmStandardNx(e) {
    var data = {
      gbSGoodsId: this.data.nxGoods.nxGoodsId,
      gbStandardName: e.detail.newStandardName,
    }
    orderApi.saveNxStandard(data).
    then(res => {
      if (res.result.code == 0) {
        var standardArr = this.data.nxGoods.gbGoodsStandardEntities;
        standardArr.push(res.result.data);
        var standards = "nxGoods.gbGoodsStandardEntities";
        var data = "goodsList[" + this.data.index + "].gbGoodsStandardEntities"
        this.setData({
          [standards]: standardArr,
          [data]: standardArr,
          applyStandardName: res.result.data.gbStandardName,

        })
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },

  confirmStandard(e) {
    var data = {
      gbDsDisGoodsId: this.data.depGoods.gbDdgDisGoodsId,
      gbDsStandardName: e.detail.newStandardName,
    }
    orderApi.gbDisSaveStandard(data).
    then(res => {
      if (res.result.code == 0) {
        var standardArr = this.data.depGoods.gbDistributerStandardEntities || [];
        standardArr.push(res.result.data);
        var standards = "depGoods.gbDistributerStandardEntities"
        this.setData({
          [standards]: standardArr,
          applyStandardName: res.result.data.gbDsStandardName,
        })
          var dataGoods = "depGoodsArrAi[" + this.data.index + "].gbDistributerStandardEntities";
          this.setData({
            [dataGoods]: standardArr,
          })
       
      } else {
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

  delApply() {
    this.setData({
      warnContent: this.data.itemDis.gbDgGoodsName + "  " + this.data.applyItem.gbDoQuantity + this.data.applyItem.gbDoStandard,
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

  closeWarn() {
    this.setData({
      applyItem: "",
      warnContent: "",
      show: false,
      popupType: '',
      showPopupWarn: false,
    })
  },

  toSearchGoods() {

    wx.navigateTo({
      url: '../resGoodsSearch/resGoodsSearch',
    })
  },


  deleteNo() {
    this.setData({
      applyItem: "",
      deleteShow: false,
    })
  },

  cancle() {
    this.setData({
      show: false,
      applyItem: "",
      applyStandardName: "",
      editApply: false,
      applyNumber: "",
      applyRemark: "",
      applySubtotal: "",
      itemDis: null,
      item: null,
      nxGoods: null,
      hasStock: false,

    })
  },


  hideMask() {
    this.setData({
      showOperation: false,
    })
  },


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
      resWeight: '0',
      reason: '',
      src: '',
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



  toBack() {
    wx.navigateBack({
      delta: 1
    })
  },





})
