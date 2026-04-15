var apiDepOrder = require('../../../../services/depOrder');
/**
 * resGoods - 商品列表页面
 * 来源：老项目 subPackage-goods/pages/goods/resGoods/
 * 迁移适配：import → require, ES6 → ES5, 路径调整
 *
 * 接口清单：
 * - disGetDepGoodsCataGb: 获取部门商品分类
 * - disGetDepGoodsGbPage: 分页获取部门商品
 */

var load = require('../../../../lib/load.js');
var config = require('../../../../config/index.js');
var dateUtils = require('../../../../lib/dateUtil.js');

var globalData = getApp().globalData;




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


  data: {
    goodsType: 99,
    statusBarHeight: "",
    windowHeight: "",
    windowWidth: "",
   
    showInd: false,
    item: "",
    depGoods: null,

    totalPages: 0,
    totalCount: 0,
    limit: 15,
    currentPage: 1,
    selectedSub: 0, // 选中的分类
    
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
    apiDepOrder.disGetDepGoodsCataGb(data).then(function(res) {
      load.hideLoading();
      if (res.result.code === 0 && res.result.data.cataArr.length > 0) {
        var firstSubCat = res.result.data.cataArr[0].fatherGoodsEntities[0];
        this.setData({
          
          disGoodsCataArr: res.result.data.cataArr,
          sortDisGoodsArr: res.result.data.disGoodsArr,
          hasMoreGoods: true,
          activeSubCatIdDep: firstSubCat.gbDistributerFatherGoodsId,
          subcatScrollIntoViewDep: 'subcat-dep-' + firstSubCat.gbDistributerFatherGoodsId,
          fatherArr: res.result.data.cataArr[0].fatherGoodsEntities,
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
    }.bind(this));
  },


// 全类别分页（跨分类补全）
_getInitDataPageDep(isRefresh, callback) {
  if (isRefresh === undefined) isRefresh = false;
  if (this.data.isLoading) return;
  this.setData({
    isLoading: true
  });
  load.showLoading("加载商品…");

  apiDepOrder.disGetDepGoodsGbPage({
    limit: this.data.limit,
    page: this.data.currentPage,
    disId: this.data.disId,
    goodsType: this.data.goodsType
  }).then(function(res) {
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
    var list = res.result.page.list || [];
    var totalPages = res.result.page.totalPage || 1;
    var totalCount = res.result.page.totalCount || 0;

    // 2) 生成 viewId，让 id 唯一且连续
    var base = isRefresh ? 0 : this.data.disGoodsArrAi.length;
    for (var idx = 0; idx < list.length; idx++) {
      list[idx].viewId = 'goods_' + (base + idx);
    }


    // 3) 合并数据（ES5 concat）
    var merged = this.data.disGoodsArrAi.concat(list);

    // 4) 合并后按 sortDisGoodsArr 顺序排序
    var idOrder = [];
    if (this.data.sortDisGoodsArr) {
      for (var oi = 0; oi < this.data.sortDisGoodsArr.length; oi++) {
        idOrder.push(String(this.data.sortDisGoodsArr[oi]));
      }
    }
    
    var sortedArr = merged.slice().sort(function(a, b) {
      var idxA = idOrder.indexOf(String(a.gbDistributerGoodsId));
      var idxB = idOrder.indexOf(String(b.gbDistributerGoodsId));
      if (idxA === -1) idxA = 99999;
      if (idxB === -1) idxB = 99999;
      return idxA - idxB;
    });

    // 5) 处理商品数据，添加 isFirstInCategory（对全量商品处理）
    var finalArr = this.processGoodsListDep(sortedArr);

    // 5) 写入并可回调滚动
    this.setData({
      disGoodsArrAi: finalArr,
      totalPages: totalPages,
      totalCount: totalCount,
      currentPage: this.data.currentPage,

    }, function() {
      this.calculateCategoryPositionsDep();
      if (typeof callback === 'function') {
        setTimeout(callback, 50);
      }
    });
  }.bind(this));
},


  /**
   * 
   */
  // 点击左侧分类
  leftMenuClickDep(e) {
    var idx = e.currentTarget.dataset.index;
    var firstSubCat = this.data.disGoodsCataArr[idx].fatherGoodsEntities[0];
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
        console.log('[leftMenuClickDep] 商品足够，直接滚动');
        this.setData({
          scrollIntoViewDep: 'cat-dep-' + firstSubCat.gbDistributerFatherGoodsId
        }, function() {
          console.log('[leftMenuClickDep] 滚动位置已设置:', {
            scrollIntoViewDep: 'cat-dep-' + firstSubCat.gbDistributerFatherGoodsId
          });
        });
      } else {
        console.log('[leftMenuClickDep] 商品不足，继续请求接口');
        // 直接调用loadGoodsBySubCatIdDep方法，请求特定分类的商品
        this.loadGoodsBySubCatIdDep(firstSubCat.gbDistributerFatherGoodsId, this.data.currentPage + 1, goodsArr);
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

    // 修正：统计该二级分类商品数量
    var goodsArr = this.data.disGoodsArrAi;
    
    var hasGoods = false;
    for (var gi = 0; gi < goodsArr.length; gi++) {
      if (String(goodsArr[gi].gbDgDfgGoodsGrandId) === String(subCatId)) {
        hasGoods = true;
        break;
      }
    }
    
    if (hasGoods) {
      console.log('[onSubCatTapDep] 商品足够，直接滚动');
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
      console.log('[onSubCatTapDep] 商品不足，继续请求接口');
      // 递归请求接口，page 参数递增
      this.loadGoodsBySubCatIdDep(subCatId, this.data.currentPage + 1, goodsArr);
    }
  },

  // 加载指定二级分类的商品
  loadGoodsBySubCatIdDep(subCatId, page, accumulatedGoods) {
    if (page === undefined) page = 1;
    if (!accumulatedGoods) accumulatedGoods = [];
    if (this.data.isLoading) return;

    this.setData({
      isLoading: true
    });
    load.showLoading("加载商品");
    apiDepOrder.disGetDepGoodsGbPage({
      disId: this.data.disId,
      limit: this.data.limit,
      page: page,
      goodsType: this.data.goodsType
    }).then(function(res) {
      this.setData({
        isLoading: false
      });
      load.hideLoading();
      if (res.result.code == 0) {
        // 1) 拿到这一页数据
        var list = res.result.page.list || [];
        var totalPages = res.result.page.totalPage || 1;
        var totalCount = res.result.page.totalCount || 0;

        // 2) 生成 viewId，让 id 唯一且连续
        var base = this.data.disGoodsArrAi.length;
        for (var i = 0; i < list.length; i++) {
          list[i].viewId = 'goods_' + (base + i);
          console.log("第" + page + "页面请求的数据是:" + list[i].gbDdgDepGoodsName);
        }

        // 3) 合并数据
        var merged = this.data.disGoodsArrAi.concat(list);

        // 4) 合并后按 sortDisGoodsArr 顺序排序
        var idOrder = [];
        if (this.data.sortDisGoodsArr) {
          for (var si = 0; si < this.data.sortDisGoodsArr.length; si++) {
            idOrder.push(String(this.data.sortDisGoodsArr[si]));
          }
        }
        console.log('sortDisGoodsArr:', idOrder);
        
        var mergedIds = [];
        for (var mi = 0; mi < merged.length; mi++) {
          mergedIds.push(merged[mi].gbDistributerGoodsId);
        }
        console.log('merged ids:', mergedIds);
        
        var sortedArr = merged.slice().sort(function(a, b) {
          var idxA = idOrder.indexOf(String(a.gbDistributerGoodsId));
          var idxB = idOrder.indexOf(String(b.gbDistributerGoodsId));
          if (idxA === -1) idxA = 99999;
          if (idxB === -1) idxB = 99999;
          return idxA - idxB;
        });

        // 5) 处理商品数据，添加 isFirstInCategory（对全量商品处理）
        var finalArr = this.processGoodsListDep(sortedArr);

        // 5) 写入并可回调滚动
        this.setData({
          disGoodsArrAi: finalArr,
          currentPage: page,
          totalPages: totalPages,
          totalCount: totalCount,
        }, function() {
          // 新增：数据加载后自动滚动到目标分类商品
          var goodsArr = this.data.disGoodsArrAi;
          var idx = -1;
          for (var fi = 0; fi < goodsArr.length; fi++) {
            if (String(goodsArr[fi].gbDgDfgGoodsGrandId) === String(subCatId)) {
              idx = fi;
              break;
            }
            }
        
          if (idx !== -1) {
            console.log('[loadGoodsBySubCatIdDep] 自动滚动到目标商品', subCatId);
            wx.createSelectorQuery()
              .select('#cat-dep-' + subCatId)
              .boundingClientRect(function(rect) {    
                if (rect) {    
                  this.setData({
                    scrollIntoViewDep: 'cat-dep-'+subCatId 
                  }, function() {});
                } else {
                  console.warn('[loadGoodsBySubCatIdDep] 未找到目标商品锚点', subCatId);
                }
              }.bind(this))
              .exec();
          } else {
            console.log('[loadGoodsBySubCatIdDep] 商品数量不足，继续请求下一页', subCatId);
            // 如果还有下一页，继续请求
            if (page < totalPages) {
              // 递归调用自身，请求下一页
              this.loadGoodsBySubCatIdDep(subCatId, page + 1, goodsArr);
            } else {
              console.log('[loadGoodsBySubCatIdDep] 已加载所有页面，仍未找到目标分类商品', subCatId);
            }
          }
          this.calculateCategoryPositionsDep();
        }.bind(this));

      } else {
        wx.showToast({
          title: '商品加载失败',
          icon: 'none'
        });
      }
    }.bind(this)).catch(function(err) {
      this.setData({
        isLoading: false
      });
      wx.showToast({
        title: '加载错误，请稍后再试',
        icon: 'none'
      });
    }.bind(this));
  },

  // 处理商品数据，添加分类信息
  processGoodsListDep(list) {
   
    var currentCategory = null;
    var result = [];
    for (var li = 0; li < list.length; li++) {
      var item = list[li];
      // 为每个商品项添加默认的展开状态属性
      var baseItem = Object.assign({}, item, {
        isSelected: false, // 默认收起状态
        arrowRotated: false, // 默认箭头不旋转
        animation: null // 动画对象
      });

      if (item.gbDgDfgGoodsGrandId !== currentCategory) {
        currentCategory = item.gbDgDfgGoodsGrandId;
        var obj = Object.assign({}, baseItem, {
          isFirstInCategory: true,
          categoryName: this.getCategoryNameDep(item.gbDgDfgGoodsGrandId)
        });
        result.push(obj);
      } else {
        var obj2 = Object.assign({}, baseItem, {
          isFirstInCategory: false,
          categoryName: this.getCategoryNameDep(item.gbDgDfgGoodsGrandId)
        });
        result.push(obj2);
      }
    }
    return result;
  },

  // 获取分类名称
  getCategoryNameDep(categoryId) {
    var category = null;
    if (this.data.fatherArr) {
      for (var ci = 0; ci < this.data.fatherArr.length; ci++) {
        if (this.data.fatherArr[ci].gbDistributerFatherGoodsId === categoryId) {
          category = this.data.fatherArr[ci];
          break;
        }
      }
    }
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
    var scrollTop = (e && e.detail && typeof e.detail.scrollTop === 'number') ? e.detail.scrollTop : 0;
    var positions = this.data.categoryPositionsDep || [];
    console.log('[onGoodsScrollDep] 当前 scrollTop:', scrollTop, 'positions:', positions);
    var activeId = '';
    
    // 添加调试日志：检查每个分类位置
    for (var pi = positions.length - 1; pi >= 0; pi--) {
      console.log('[onGoodsScrollDep] 检查位置 ' + pi + ': id=' + positions[pi].id + ', top=' + positions[pi].top + ', scrollTop=' + scrollTop);
      if (scrollTop >= positions[pi].top) {
        activeId = positions[pi].id;
        console.log('[onGoodsScrollDep] 找到匹配的分类: ' + activeId + ', 位置: ' + positions[pi].top);
        break;
      }
    }
    
    // 边界兜底：如果没找到，默认第一个
    if (!activeId && positions.length > 0) {
      activeId = positions[0].id;
      console.log('[onGoodsScrollDep] 边界兜底，activeId 设为第一个:', activeId);
    }
    
    // 添加调试日志：显示 activeId 和当前状态
    console.log('[onGoodsScrollDep] 最终确定的 activeId: ' + activeId + ', 当前 activeSubCatIdDep: ' + this.data.activeSubCatIdDep);
    
    // 二级分类高亮
    if (activeId && activeId !== this.data.activeSubCatIdDep) {
      console.log('[onGoodsScrollDep] 需要更新二级分类高亮:', activeId);
      this.setData({
        activeSubCatIdDep: activeId,
        subcatScrollIntoViewDep: 'subcat-dep-' + activeId
      });
      console.log('[onGoodsScrollDep] 二级分类高亮更新完成');
    } else {
      console.log('[onGoodsScrollDep] 二级分类高亮无需更新, activeId:', activeId, 'activeSubCatIdDep:', this.data.activeSubCatIdDep);
    }
    
    // 联动一级分类高亮
    if (activeId && this.data.disGoodsCataArr) {
      // 找到当前二级分类对应的一级分类id
      var greatId = '';
      // disGoodsArrAi 里找第一个 grandId=activeId 的商品，取其 greatId
      var item = null;
      for (var gi = 0; gi < this.data.disGoodsArrAi.length; gi++) {
        if (String(this.data.disGoodsArrAi[gi].gbDgDfgGoodsGrandId) === String(activeId)) {
          item = this.data.disGoodsArrAi[gi];
          break;
        }
      }
      if (item) {
        greatId = item.gbDgDfgGoodsGreatId;
      }
      // 在 disGoodsCataArr 里找 greatId 的索引
      var subIndex = -1;
      for (var ci = 0; ci < this.data.disGoodsCataArr.length; ci++) {
        if (String(this.data.disGoodsCataArr[ci].gbDistributerFatherGoodsId) === String(greatId)) {
          subIndex = ci;
          break;
        }
      }
      console.log('[onGoodsScrollDep] 联动一级分类 greatId:', greatId, '一级分类索引:', subIndex, '当前 selectedSub:', this.data.selectedSub);
      if (subIndex !== -1 && subIndex !== this.data.selectedSub) {
          this.setData({
            selectedSub: subIndex,
            fatherArr: this.data.disGoodsCataArr[subIndex].fatherGoodsEntities
        });
        console.log('[onGoodsScrollDep] setData 联动一级分类 selectedSub', subIndex);
      } else {
        console.log('[onGoodsScrollDep] 未触发 setData 联动一级分类');
      }
    }
  },

  // 1. 新增：部门端商品分类锚点位置缓存
  calculateCategoryPositionsDep() {
    // console.log('[calculateCategoryPositionsDep] 方法开始执行');
    var that = this;
    wx.createSelectorQuery()
      .selectAll('.goods-category-title-dep')
      .boundingClientRect();
    wx.createSelectorQuery()
      .select('.goods-list-dep')
      .boundingClientRect();
    
    wx.createSelectorQuery()
      .selectAll('.goods-category-title-dep')
      .boundingClientRect(function(rects) {
        wx.createSelectorQuery()
          .select('.goods-list-dep')
          .boundingClientRect(function(listRect) {
            if (rects && listRect) {
              var rawPositions = [];
              for (var ri = 0; ri < rects.length; ri++) {
                rawPositions.push({
                  id: rects[ri].id.replace('cat-dep-', ''),
                  top: rects[ri].top - listRect.top
                });
              }
              // 取第一个的 top 作为基准
              var baseTop = rawPositions.length > 0 ? rawPositions[0].top : 0;
              // 重新计算所有 top，让第一个为 0
              var positions = [];
              for (var pidx = 0; pidx < rawPositions.length; pidx++) {
                positions.push({
                  id: rawPositions[pidx].id,
                  top: rawPositions[pidx].top - baseTop
                });
              }
              // 按 top 从小到大排序
              positions.sort(function(a, b) { return a.top - b.top; });
              // console.log('[calculateCategoryPositionsDep] 归一化后 positions:', positions);
              that.setData({
                categoryPositionsDep: positions
              });
              
              var goodsOrder = [];
              var arr = that.data.disGoodsArrAi || [];
              for (var goi = 0; goi < arr.length; goi++) {
                goodsOrder.push(arr[goi].gbDgDfgGoodsGrandId);
              }
              // console.log('[calculateCategoryPositionsDep] disGoodsArrAi 渲染顺序:', goodsOrder);
              // console.log('[calculateCategoryPositionsDep] 分类锚点位置(已排序):', positions);
            } else {
              // console.warn('[calculateCategoryPositionsDep] 未获取到有效的节点信息', res);
            }
          });
      });
  },
  





  showDialogBtn: function (e) {
    this.setData({
      item: e.currentTarget.dataset.item,
      showInd: true,
      showIndNx: false,
    })
  },

  showDialogBtnNx: function (e) {
    this.setData({
      item: e.currentTarget.dataset.item,
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
    wx.setStorageSync('disGoods', e.currentTarget.dataset.goods);
    wx.navigateTo({
      url: '../goodsOrderList/goodsOrderList?disGoodsId=' + id +'&type=1',
    })
    //
  },

  toFenxi(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '../goodsFenxi/goodsFenxi?id=' + id,
    })
  },

  toGoods(e){
    wx.setStorageSync('disGoods', e.currentTarget.dataset.goods);
    console.log("goods",e)
    wx.navigateTo({
      url: '../disGoodsPage/disGoodsPage?disGoodsId=' + e.currentTarget.dataset.id + '&index=' + 
      e.currentTarget.dataset.index,
    })
  },



  toStock(e){
     wx.setStorageSync('disGoods', e.currentTarget.dataset.item);
    wx.navigateTo({
      url: '/subPackage-charts/pages/stock/stockGoodsList/stockGoodsList?disGoodsId=' + e.currentTarget.dataset.id,
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