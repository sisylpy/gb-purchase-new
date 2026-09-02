var goodsApi = require('../../../services/api.js');
/**
 * resGoods - 商品列表页面
 * 来源：老项目 subPackage-goods/pages/goods/resGoods/
 * 迁移适配：import → require, ES6 → ES5, 路径调整
 *
 * 接口见 subPackage-group/services/api.js（disGetDepGoodsCataGbLite、disGetDepGoodsGbPageLite）
 */

var load = require('../../../../lib/load.js');
var config = require('../../../../config/index.js');
var dateUtils = require('../../../../lib/dateUtil.js');





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

  },

  onUnload() {
    if (this._goodsScrollTimer) {
      clearTimeout(this._goodsScrollTimer);
      this._goodsScrollTimer = null;
    }
  },


  data: {
    goodsType: 99,
    statusBarHeight: "",
    windowHeight: "",
    windowWidth: "",
    url: "",
   
    showInd: false,
    showIndNx: false,
    item: {},
    depGoods: null,

    totalPages: 0,
    totalCount: 0,
    limit: 15,
    currentPage: 1,
    selectedSub: 0, // 选中的分类
    disGoodsCataArr: [],
    fatherArr: [],
    disGoodsArrAi: [],
    categoryPositionsDep: [],
    activeGrandFilter: '',
    isLoading: false,
    
    // 新增的部门商品相关状态
    showAllSubCatDep: false, // 是否展开二级分类
    activeSubCatIdDep: '', // 当前选中的二级分类ID
    subcatScrollIntoViewDep: '', // 二级分类横向滚动位置
    scrollIntoViewDep: '', // 商品列表滚动位置



  },

  onLoad: function (options) {
    this.setData({
      url: config.server,
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


    this._getInitDataDep();


  },


  _getInitDataDep() {
    load.showLoading("获取分类");
    var data = {
      disId: this.data.disId,
      goodsType: this.data.goodsType
    }
    goodsApi.disGetDepGoodsCataGbLite(data).then(function(res) {
      load.hideLoading();
      var cataArr = res.result && res.result.data ? (res.result.data.cataArr || []) : [];
      if (res.result.code === 0 && cataArr.length > 0 && cataArr[0].fatherGoodsEntities.length > 0) {
        var firstSubCat = cataArr[0].fatherGoodsEntities[0];
        this.buildCategoryMapsDep(cataArr);
        this.setData({
          disGoodsCataArr: cataArr,
          hasMoreGoods: true,
          currentPage: 1,
          selectedSub: 0,
          activeGrandFilter: '',
          activeSubCatIdDep: firstSubCat.gbDistributerFatherGoodsId,
          subcatScrollIntoViewDep: 'subcat-dep-' + firstSubCat.gbDistributerFatherGoodsId,
          fatherArr: cataArr[0].fatherGoodsEntities,
          disGoodsArrAi: [],
        }, function() {
          this._getInitDataPageDep(true);
        }.bind(this));
      } else {
        this.setData({
          disGoodsCataArr: [],
          disGoodsArrAi: []
        })
      }
    }.bind(this)).catch(function() {
      load.hideLoading();
      wx.showToast({ title: '分类加载失败', icon: 'none' });
    });
  },


// 全类别分页（跨分类补全）
_getInitDataPageDep(isRefresh, callback) {
  if (isRefresh === undefined) isRefresh = false;
  if (this.data.isLoading) return;
  var requestedPage = isRefresh ? 1 : this.data.currentPage;
  this.setData({
    isLoading: true
  });
  load.showLoading("加载商品…");

  var requestData = {
    limit: this.data.limit,
    page: requestedPage,
    disId: this.data.disId,
    goodsType: this.data.goodsType
  };
  if (this.data.activeGrandFilter) {
    requestData.grandId = this.data.activeGrandFilter;
  }

  goodsApi.disGetDepGoodsGbPageLite(requestData).then(function(res) {
    load.hideLoading();

    if (res.result.code !== 0) {
      this.setData({ isLoading: false });
      return wx.showToast({
        title: res.result.msg,
        icon: 'none'
      });
    }

    var list = res.result.page.list || [];
    var totalPages = res.result.page.totalPage || 1;
    var totalCount = res.result.page.totalCount || 0;
    var base = isRefresh ? 0 : this.data.disGoodsArrAi.length;
    var previousGrandId = null;
    if (!isRefresh && base > 0) {
      previousGrandId = this.data.disGoodsArrAi[base - 1].gbDgDfgGoodsGrandId;
    }
    var pageItems = this.processGoodsPageDep(list, previousGrandId, base);
    var dataPatch = {
      isLoading: false,
      totalPages: totalPages,
      totalCount: totalCount,
      currentPage: requestedPage,
      hasMoreGoods: requestedPage < totalPages
    };

    if (isRefresh) {
      dataPatch.disGoodsArrAi = pageItems;
    } else {
      for (var itemIndex = 0; itemIndex < pageItems.length; itemIndex++) {
        dataPatch['disGoodsArrAi[' + (base + itemIndex) + ']'] = pageItems[itemIndex];
      }
    }

    this.setData(dataPatch, function() {
      this.calculateCategoryPositionsDep();
      if (typeof callback === 'function') {
        setTimeout(callback, 50);
      }
    });
  }.bind(this)).catch(function() {
    load.hideLoading();
    this.setData({ isLoading: false });
    wx.showToast({ title: '商品加载失败', icon: 'none' });
  }.bind(this));
},


  /**
   * 
   */
  // 点击左侧分类
  leftMenuClickDep(e) {
    var idx = e.currentTarget.dataset.index;
    var firstSubCat = this.data.disGoodsCataArr[idx].fatherGoodsEntities[0];
    if (!firstSubCat) return;
    this.setData({
      selectedSub: idx,
      fatherArr: this.data.disGoodsCataArr[idx].fatherGoodsEntities,
      activeSubCatIdDep: firstSubCat.gbDistributerFatherGoodsId,
      subcatScrollIntoViewDep: 'subcat-dep-' + firstSubCat.gbDistributerFatherGoodsId,
    }, function() {
      // 检查当前已加载的商品中是否有该二级分类的商品
      var goodsArr = this.data.disGoodsArrAi;
      var hasGoods = false;
      for (var gi = 0; gi < goodsArr.length; gi++) {
        if (String(goodsArr[gi].gbDgDfgGoodsGrandId) === String(firstSubCat.gbDistributerFatherGoodsId)) {
          hasGoods = true;
          break;
        }
      }
      
      if (hasGoods) {
        this.setData({
          scrollIntoViewDep: 'cat-dep-' + firstSubCat.gbDistributerFatherGoodsId
        });
      } else {
        this.loadGoodsBySubCatIdDep(firstSubCat.gbDistributerFatherGoodsId);
      }
    }.bind(this));
  },


  // 滚动到底加载下一页（全类别模式）
  onReachBottomDep() {
    if (this.data.isLoading || this.data.currentPage >= this.data.totalPages) return;
    this.setData({
      currentPage: this.data.currentPage + 1
    }, function() {
      this._getInitDataPageDep(false);
    }.bind(this));
  },

  onSubCatTapDep(e) {
    var subCatId = e.currentTarget.dataset.id;
    this.setData({
      activeSubCatIdDep: subCatId,
      subcatScrollIntoViewDep: 'subcat-dep-' + subCatId,
      showAllSubCatDep: false,
    });

    var goodsArr = this.data.disGoodsArrAi;
    
    var hasGoods = false;
    for (var gi = 0; gi < goodsArr.length; gi++) {
      if (String(goodsArr[gi].gbDgDfgGoodsGrandId) === String(subCatId)) {
        hasGoods = true;
        break;
      }
    }
    
    if (hasGoods) {
      wx.createSelectorQuery()
        .select('#cat-dep-' + subCatId)
        .boundingClientRect(function(rect) {
          if (rect) {
            this.setData({
              scrollIntoViewDep: 'cat-dep-'+subCatId 
            });
          }
        }.bind(this))
        .exec();
    } else {
      this.loadGoodsBySubCatIdDep(subCatId);
    }
  },

  // 直接按二级分类查询，避免为了定位分类而递归下载中间所有分页。
  loadGoodsBySubCatIdDep(subCatId) {
    if (this.data.isLoading) return;
    this.setData({
      activeGrandFilter: subCatId,
      currentPage: 1,
      scrollIntoViewDep: '',
      disGoodsArrAi: []
    }, function() {
      this._getInitDataPageDep(true, function() {
        this.setData({ scrollIntoViewDep: 'cat-dep-' + subCatId });
      }.bind(this));
    }.bind(this));
  },

  onGoodsFatherImgError(e) {
    var d = (e && e.currentTarget && e.currentTarget.dataset) || {};
    console.warn('[resGoods][goodsImg] binderror', {
      errMsg: e.detail && e.detail.errMsg,
      errCode: e.detail && e.detail.errCode,
      rawPath: d.rawPath,
    });
  },

  // 只处理本次新增的一页，避免每次分页都复制和遍历全部已加载商品。
  processGoodsPageDep(list, previousGrandId, baseIndex) {
    var currentCategory = previousGrandId;
    var result = [];
    for (var li = 0; li < list.length; li++) {
      var item = list[li];
      var isFirstInCategory = String(item.gbDgDfgGoodsGrandId) !== String(currentCategory);
      currentCategory = item.gbDgDfgGoodsGrandId;
      result.push(Object.assign({}, item, {
        viewId: 'goods_' + (baseIndex + li),
        isFirstInCategory: isFirstInCategory
      }));
    }
    return result;
  },

  // 分类映射保存在逻辑层，不进入 setData，滚动时可以 O(1) 查找。
  buildCategoryMapsDep(cataArr) {
    this._grandToGreatId = {};
    this._greatIdToIndex = {};
    for (var greatIndex = 0; greatIndex < cataArr.length; greatIndex++) {
      var great = cataArr[greatIndex];
      this._greatIdToIndex[String(great.gbDistributerFatherGoodsId)] = greatIndex;
      var children = great.fatherGoodsEntities || [];
      for (var childIndex = 0; childIndex < children.length; childIndex++) {
        this._grandToGreatId[String(children[childIndex].gbDistributerFatherGoodsId)] = great.gbDistributerFatherGoodsId;
      }
    }
  },

  getGoodsByEventIndex(e) {
    var index = Number(e.currentTarget.dataset.index);
    if (isNaN(index) || !this.data.disGoodsArrAi[index]) {
      return null;
    }
    return this.data.disGoodsArrAi[index];
  },

  getCategoryNameDep(categoryId) {
    var cataArr = this.data.disGoodsCataArr || [];
    for (var greatIndex = 0; greatIndex < cataArr.length; greatIndex++) {
      var children = cataArr[greatIndex].fatherGoodsEntities || [];
      for (var childIndex = 0; childIndex < children.length; childIndex++) {
        if (String(children[childIndex].gbDistributerFatherGoodsId) === String(categoryId)) {
          return children[childIndex].gbDfgFatherGoodsName;
        }
      }
    }
    return '';
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
    var scrollTop = (e && e.detail && typeof e.detail.scrollTop === 'number') ? e.detail.scrollTop : 0;
    this._pendingGoodsScrollTop = scrollTop;
    if (this._goodsScrollTimer) return;
    this._goodsScrollTimer = setTimeout(function() {
      this._goodsScrollTimer = null;
      this.applyGoodsScrollDep(this._pendingGoodsScrollTop || 0);
    }.bind(this), 80);
  },

  applyGoodsScrollDep(scrollTop) {
    var positions = this.data.categoryPositionsDep || [];
    var activeId = '';

    for (var pi = positions.length - 1; pi >= 0; pi--) {
      if (scrollTop + 4 >= positions[pi].top) {
        activeId = positions[pi].id;
        break;
      }
    }

    if (!activeId && positions.length > 0) {
      activeId = positions[0].id;
    }

    if (!activeId) return;

    var dataPatch = {};
    if (String(activeId) !== String(this.data.activeSubCatIdDep)) {
      dataPatch.activeSubCatIdDep = activeId;
      dataPatch.subcatScrollIntoViewDep = 'subcat-dep-' + activeId;
    }

    var greatId = this._grandToGreatId ? this._grandToGreatId[String(activeId)] : null;
    var subIndex = greatId != null && this._greatIdToIndex
      ? this._greatIdToIndex[String(greatId)]
      : null;
    if (subIndex != null && subIndex !== this.data.selectedSub) {
      dataPatch.selectedSub = subIndex;
      dataPatch.fatherArr = this.data.disGoodsCataArr[subIndex].fatherGoodsEntities;
    }

    if (Object.keys(dataPatch).length > 0) {
      this.setData(dataPatch);
    }
  },

  // 缓存每个二级分类在 scroll-view 内容区内的绝对位置。
  calculateCategoryPositionsDep() {
    var that = this;
    var query = wx.createSelectorQuery();
    query.selectAll('.goods-category-title-dep').boundingClientRect();
    query.select('.goods-list-dep').boundingClientRect();
    query.select('.goods-list-dep').scrollOffset();
    query.exec(function(res) {
      var rects = res && res[0];
      var listRect = res && res[1];
      var scrollInfo = res && res[2];
      if (!rects || !listRect) {
        that.setData({
          categoryPositionsDep: []
        });
        return;
      }

      var currentScrollTop = scrollInfo && typeof scrollInfo.scrollTop === 'number'
        ? scrollInfo.scrollTop
        : 0;
      var positions = [];
      for (var ri = 0; ri < rects.length; ri++) {
        positions.push({
          id: rects[ri].id.replace('cat-dep-', ''),
          top: rects[ri].top - listRect.top + currentScrollTop
        });
      }
      positions.sort(function(a, b) {
        return a.top - b.top;
      });

      // 第一项就是内容起点，消除不同机型边框造成的 1px 左右误差。
      var baseTop = positions.length > 0 ? positions[0].top : 0;
      for (var pi = 0; pi < positions.length; pi++) {
        positions[pi].top = positions[pi].top - baseTop;
      }
      that.setData({
        categoryPositionsDep: positions
      });
    });
  },
  





  showDialogBtn: function (e) {
    var goods = this.getGoodsByEventIndex(e);
    if (!goods) return;
    this.setData({
      item: goods,
      showInd: true,
      showIndNx: false,
    })
  },

  showDialogBtnNx: function (e) {
    var goods = this.getGoodsByEventIndex(e);
    if (!goods) return;
    this.setData({
      item: goods,
      showIndNx: true,
      showInd: false,
    })
  },

  hideModal: function () {
    this.setData({
      showGoodsModal: false
    });
  },

  beginSearch(){
    wx.navigateTo({
      url: '../searchGoods/searchGoods',
    })
  },
  

  toOrderList(e) {
    var id = e.currentTarget.dataset.id;
    var goods = this.getGoodsByEventIndex(e);
    if (goods) wx.setStorageSync('disGoods', goods);
    wx.navigateTo({
      url: '/subPackage-goods/pages/goodsOrderList/goodsOrderList?disGoodsId=' + id +'&type=1',
    })
    //
  },

  toFenxi(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/subPackage-goods/pages/goodsFenxi/goodsFenxi?id=' + id,
    })
  },

  toGoods(e){
    var goods = this.getGoodsByEventIndex(e);
    if (goods) wx.setStorageSync('disGoods', goods);
    wx.navigateTo({
      url: '../disGoodsPage/disGoodsPage?disGoodsId=' + e.currentTarget.dataset.id + '&index=' + 
      e.currentTarget.dataset.index,
    })
  },



  toStock(e){
    var goods = this.getGoodsByEventIndex(e);
    if (goods) wx.setStorageSync('disGoods', goods);
    wx.navigateTo({
      url: '/subPackage-goods/pages/stockGoodsList/stockGoodsList?disGoodsId=' + e.currentTarget.dataset.id,
    })
  },


  toBack() {
    wx.navigateBack({
      delta: 1
    })
  },

  /**
   * 展开/收起商品详情数据
   * @param {Object} e 事件对象
   */
  showData(e) {
    var index = e.currentTarget.dataset.index;
    var currentSelected = this.data.disGoodsArrAi[index].isSelected;
    
    // 创建动画实例
    var animation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease-in-out',
    });

    if (currentSelected) {
      // 收起动画：从展开状态到收起状态
      animation.height(0).opacity(0).step();
    } else {
      // 展开动画：从收起状态到展开状态
      animation.height('auto').opacity(1).step();
    }

    // 更新数据
    var dataKey = 'disGoodsArrAi[' + index + '].isSelected';
    var animationKey = 'disGoodsArrAi[' + index + '].animation';
    var dataObj = {};
    dataObj[dataKey] = !currentSelected;
    dataObj[animationKey] = animation.export();
    
    this.setData(dataObj);

    // 如果是展开操作，延迟一下再设置高度为auto，确保动画效果
    if (!currentSelected) {
      var that = this;
      setTimeout(function () {
        var autoAnimation = wx.createAnimation({
          duration: 0,
        });
        autoAnimation.height('auto').step();
        var animObj = {};
        animObj[animationKey] = autoAnimation.export();
        that.setData(animObj);
      }, 300);
    }

    // 添加箭头旋转效果
    var arrowKey = 'disGoodsArrAi[' + index + '].arrowRotated';
    var arrowObj = {};
    arrowObj[arrowKey] = !currentSelected;
    this.setData(arrowObj);
  },


  openOperation(e) {
    this.setData({
      showOperationGoods: true,
    })
   
    this.chooseSezi();

  },

  chooseSezi: function (e) {
    // 用that取代this，防止不必要的情况发生
    var that = this;
    // 创建一个动画实例
    var animation = wx.createAnimation({
      // 动画持续时间
      duration: 100,
      // 定义动画效果，当前是匀速
      timingFunction: 'linear'
    })
    // 将该变量赋值给当前动画
    that.animation = animation
    // 先在y轴偏移，然后用step()完成一个动画
    animation.translateY(200).step()
    // 用setData改变当前动画
    that.setData({
      // 通过export()方法导出数据
      animationData: animation.export(),
      // 改变view里面的Wx：if
      chooseSize: true
    })
    // 设置setTimeout来改变y轴偏移量，实现有感觉的滑动
    setTimeout(function () {
      animation.translateY(0).step()
      that.setData({
        animationData: animation.export()
      })
    }, 20)
  },

  hideModal: function (e) {
    var that = this;
    var animation = wx.createAnimation({
      duration: 1000,
      timingFunction: 'linear'
    })
    that.animation = animation
    animation.translateY(200).step()
    that.setData({
      animationData: animation.export()

    })
    setTimeout(function () {
      animation.translateY(0).step()
      that.setData({
        animationData: animation.export(),
        chooseSize: false
      })
    }, 200)
  },

  hideMask() {
   
    this.hideModal();
    this.setData({
      showOperationGoods: false,
    })
  },

  getGoodsType(e) {
    var goodsType = e.currentTarget.dataset.type;
    this.setData({
      goodsType: goodsType,
      currentPage: 1,
      showOperationGoods: false
    })
    this._getInitDataDep();
    this.hideModal();
  },

})
