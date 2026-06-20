var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
var dateUtils = require('../../../../lib/dateUtil.js')
var apiUrl = require('../../../../config/index');
var api = require('../../../services/api.js');


Page({

  onShow() {

    // 推荐直接用新API
    let windowInfo = wx.getWindowInfo();
    let globalData = getApp().globalData;

    // 详细计算过程
    const totalHeight = windowInfo.windowHeight * globalData.rpxR;
    const navBarHeight = globalData.navBarHeight * globalData.rpxR;
    const topAreaHeight = 200; // 200rpx为顶部区域、搜索区域、筛选区域和间距的预估高度
    const scrollViewHeight = totalHeight - navBarHeight - topAreaHeight;

    // 滚动状态下的高度计算（隐藏日期选择行后）
    const scrollViewHeightCollapsed = totalHeight - navBarHeight - 0; // 滚动时顶部区域为0


    // 获取状态栏高度和胶囊按钮信息
    const statusBarHeight = windowInfo.statusBarHeight || 44;
    const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
    const capsuleHeight = menuButtonInfo.height || 32;
    const capsuleTop = menuButtonInfo.top || statusBarHeight + 4;

    wx.setStorageSync('statusBarHeight', statusBarHeight);
    wx.setStorageSync('menuButtonInfo', menuButtonInfo);

    // 从本地存储恢复滚动状态，避免从其他页面返回时丢失
    const savedScrollState = wx.getStorageSync('costGoodsByDate_scrollState') || {};
    const currentIsScrolled = savedScrollState.isScrolled || false;
    const currentScrollTop = savedScrollState.scrollTop || 0;

    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      scrollViewHeight: scrollViewHeight,
      scrollViewHeightCollapsed: scrollViewHeightCollapsed,
      statusBarHeight: statusBarHeight,
      menuButtonInfo: menuButtonInfo,
      capsuleHeight: capsuleHeight,
      capsuleTop: capsuleTop,
      // 滚动状态管理
      isScrolled: currentIsScrolled,
      scrollTop: currentScrollTop,
      scrollThreshold: 200, // 滚动阈值，超过200rpx时触发收缩
    });


    if (this.data.update) {
    
    
      // 重新请求接口
      this._getGoodsCostStatistics();
    }


  },

  onHide() {
    // 页面隐藏时保存滚动状态到本地存储
    wx.setStorageSync('costGoodsByDate_scrollState', {
      isScrolled: this.data.isScrolled,
      scrollTop: this.data.scrollTop
    });
  },

  /**
   * 页面的初始数据
   */
  data: {
    update: false, // 默认值
    tabs: ["1", "2", "3"],
    tab1Index: 0,
    itemIndex: 0,
    scrollViewHeight: 600, // 默认滚动视图高度
    
    // 分页相关字段
    totalPage: 0,
    totalCount: 0,
    limit: 10,
    currentPage: 1,
    isLoading: false,
  
    // 展开状态控制
    expandedRows: {}, // 控制展开状态的对象
    employeeMealTotal: 0,
    employeeMealCount: 0,
  },

  /**
   * 生命周期函数--监听页面加载disId=2&startDate=2025-09-01&stopDate=2025-09-01&dateType=month&fenxiType=costEcharts&searchDepId=-1&value=9999.5&allCostTotal=9999.5&id=-1&type=sales&hanzi=星期一
   */
  onLoad: function (options) {
    this.setData({
      name: options.name,
      disId: options.disId,
      greatId: options.id,
      startDate: options.startDate,
      stopDate: options.stopDate,
      hanzi: options.hanzi,
      dateType: options.dateType,
      allCostTotal: options.allCostTotal,
      value: options.value,
      type: options.type,
      fenxiType: options.fenxiType,
      searchDepId: options.searchDepId,
      url: apiUrl.server,
    })


    if (this.data.type == 'sales') {
      this.setData({
        tab1Index: 0,
        itemIndex: 0,
      })
    }
    if (this.data.type == 'loss') {
      this.setData({
        tab1Index: 1,
        itemIndex: 1,
      })
    }
    if (this.data.type == 'waste') {
      this.setData({
        tab1Index: 2,
        itemIndex: 2,
      })
    }
    if (this.data.type == 'employeeMeal') {
      this.setData({
        tab1Index: 3,
        itemIndex: 3,
      })
    }
   

    this._getGoodsCostStatistics();

  },


  // 获取采购员统计信息
  _getGoodsCostStatistics() {
    var data = {
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      searchDepId: this.data.searchDepId,
      startDate: this.data.startDate,
      disId: this.data.disId,
      greatId: this.data.greatId,

    };

    // 调用新的统计接口
    api.getGbGoodsCostStatistics(data)
      .then(res => {
        if (res.result.code == 0) {

          this.setData({

            value: res.result.data.allTotal,

            salesTotal: res.result.data.salesTotal,
            lossTotal: res.result.data.lossTotal,
            wasteTotal: res.result.data.wasteTotal,
            employeeMealTotal: res.result.data.employeeMealTotal || 0,
            produceCount: res.result.data.produceCount,
            lossCount: res.result.data.lossCount,
            wasteCount: res.result.data.wasteCount,
            employeeMealCount: res.result.data.employeeMealCount || 0,

          });


          this._getInitData();


        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg || '获取统计信息失败',
            icon: 'none'
          });
        }
      })

  },


  //
  _getInitData() {

    // 设置加载状态
    this.setData({
      isLoading: true
    });

    var data = {
      type: this.data.type,
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      disId: this.data.disId,
      searchDepId: this.data.searchDepId,
      page: this.data.currentPage,
      limit: this.data.limit,
      greatId: this.data.greatId,
    }
    load.showLoading("获取数据中");
    api.getGoodsCostBySearchDate(data)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          const result = res.result.data;


          // 如果是第一页，直接替换数据；否则追加数据
          if (this.data.currentPage === 1) {
            // 为每个商品添加独立的显示状态
            const goodsList = (result.arr || []).map(goods => ({
              ...goods,
              showCostList: false // 每个商品独立的成本详情显示状态
            }));

            this.setData({
              produceArr: goodsList,
              totalCount: result.totalCount || 0,
              totalPage: result.totalPages || 0,
            });
          } else {
            // 为新增的商品添加独立的显示状态
            const newGoodsList = (result.arr || []).map(goods => ({
              ...goods,
              showCostList: false // 每个商品独立的成本详情显示状态
            }));

            this.setData({
              produceArr: [...this.data.produceArr, ...newGoodsList],
              totalCount: result.totalCount || 0,
              totalPage: result.totalPages || 0,
            });
          }


          // 设置加载状态为false
          this.setData({
            isLoading: false
          });

        } else {
          this.setData({
            produceArr: [],
            oneTotal: 0,
            salesTotal: 0,
            lossTotal: 0,
            wasteTotal: 0,
            employeeMealTotal: 0,
            isLoading: false
          })

          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })

        }


      })
  },

  /**
   * tabItme点击
   */
  onTab1Click(event) {
    let index = event.currentTarget.dataset.index;

    this.setData({
      tab1Index: index,
      itemIndex: index,
      type: event.currentTarget.dataset.type,
      // 重置分页相关状态
      currentPage: 1,
      totalPage: 0,
      totalCount: 0,
      isLoading: false,
      // 重置商品数据
      produceArr: [],
      // 重置当前标签页的初始化状态
    }, () => {
    });

    this._getInitData();


    // 延迟检查 swiper-item 位置
    setTimeout(() => {
      this.checkSwiperItemPosition();
    }, 500);
  },

  /**
   * swiper切换完成事件 - 统一处理标签页切换逻辑
   */
  animationfinish(event) {
    const currentIndex = event.detail.current;
    const typeMap = ['sales', 'loss', 'waste', 'employeeMeal'];
    const currentType = typeMap[currentIndex];


    // 一次性更新所有状态
    this.setData({
      tab1Index: currentIndex,
      itemIndex: currentIndex,
      type: currentType,
      currentPage: 1, // 重置分页
      // 重置当前标签页的初始化状态
    }, () => {
      this._getInitData();


      // 延迟检查 swiper-item 位置
      setTimeout(() => {
        this.checkSwiperItemPosition();
      }, 500);
    });
  },

  // 滚动监听事件
  onScroll(event) {
    const scrollTop = event.detail.scrollTop;
    const threshold = this.data.scrollThreshold;
    const isScrolled = scrollTop > threshold;


    // 清除之前的防抖定时器
    if (this.scrollDebounceTimer) {
      clearTimeout(this.scrollDebounceTimer);
    }

    // 设置防抖延迟，避免频繁处理
    this.scrollDebounceTimer = setTimeout(() => {
      
      // 只有当状态改变时才更新setData，避免频繁setData
      if (isScrolled !== this.data.isScrolled) {
        this.setData({
          isScrolled: isScrolled,
          scrollTop: scrollTop
        });
      } else {
        this.setData({
          scrollTop: scrollTop
        });
      }


      // 每次滚动都检测并关闭超出屏幕的展开内容
      this.checkAndCloseOverflowOnScroll();
    }, 50); // 50ms防抖延迟
  },

  // 导航栏按钮点击事件
  onNavTabClick(event) {
    const {
      index,
      type
    } = event.detail;

    // 调用原有的标签页点击方法
    this.onTab1Click({
      currentTarget: {
        dataset: {
          index: index,
          type: type
        }
      }
    });
  },

  // 检查 swiper-item 位置信息
  checkSwiperItemPosition() {

    // 查询 swiper 容器
    const swiperQuery = wx.createSelectorQuery().in(this);
    swiperQuery.select('.swiper-box').boundingClientRect();

    // 查询所有 swiper-item
    const swiperItemQuery = wx.createSelectorQuery().in(this);
    swiperItemQuery.selectAll('swiper-item').boundingClientRect();

    // 查询当前激活的 swiper-item
    const currentSwiperItemQuery = wx.createSelectorQuery().in(this);
    currentSwiperItemQuery.select(`swiper-item:nth-child(${this.data.tab1Index + 1})`).boundingClientRect();

    // 查询第二个 swiper-item 的具体位置
    const secondSwiperItemQuery = wx.createSelectorQuery().in(this);
    secondSwiperItemQuery.select('swiper-item:nth-child(2)').boundingClientRect();

    // 执行查询
    swiperQuery.exec((swiperRes) => {
    });

    swiperItemQuery.exec((itemsRes) => {
      itemsRes.forEach((item, index) => {
      });
    });

    currentSwiperItemQuery.exec((currentRes) => {
    });

    secondSwiperItemQuery.exec((secondRes) => {
      if (secondRes[0]) {
      }
    });

  },


  toStatistics(e) {
    var item = e.currentTarget.dataset.item;
    this.setData({
      item: e.currentTarget.dataset.item,
      goodsId: item.gbDistributerGoodsId,
      goodsName: item.gbDgGoodsName,
      standard: item.gbDgGoodsStandardname,
    })

    wx.setStorageSync('disGoods', item)

    var type = e.currentTarget.dataset.type;
    wx.navigateTo({
      url: '/subPackage-charts/pages/cost/goodsFenxiCost/goodsFenxiCost?disGoodsId=' + this.data.goodsId + '&startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType + '&searchType=' + type + '&fenxiType=costEcharts&searchDepId=-1',
    })
  },


  toFilterType() {
    wx.navigateTo({
      url: '../../sel/filterDataType/filterDataType?searchType=mendian',
    })
  },


  toDatePageSearch() {
    this.setData({
      update: true,
      totalPage: 0,
    totalCount: 0,
    limit: 10,
    currentPage: 1,
    })
    wx.navigateTo({
      url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate +
        '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType,
    })
  },

  toBack() {

    wx.navigateBack({
      delta: 1,
    })

  },

  // 带页码参数的数据获取方法
  _getInitDataWithPage(page) {
    // 设置加载状态
    this.setData({
      isLoading: true
    });

    var data = {
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      type: this.data.type,
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      disId: this.data.disId,
      searchDepId: this.data.searchDepId,
      page: page,
      limit: this.data.limit,
      greatId: this.data.greatId,
    }
    api.getGoodsCostBySearchDate(data)
      .then(res => {
        if (res.result.code == 0) {
          const result = res.result.data;


          // 如果是第一页，直接替换数据；否则追加数据
          if (page === 1) {
            this.setData({
              produceArr: result.arr || [],
              totalCount: result.totalCount || 0,
              totalPage: result.totalPages || 0,
            })
          } else {
            this.setData({
              produceArr: [...this.data.produceArr, ...(result.arr || [])],
              totalCount: result.totalCount || 0,
              totalPage: result.totalPages || 0,
            });
          }


          // 设置加载状态为false
          this.setData({
            isLoading: false
          });

        } else {
          this.setData({
            produceArr: [],
            oneTotal: 0,
            salesTotal: 0,
            lossTotal: 0,
            wasteTotal: 0,
            employeeMealTotal: 0,
            isLoading: false
          })

          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })

        }


      })
  },


  // 上拉加载更多 (支持scroll-view的bindscrolltolower事件)
  onReachBottom(e) {

    // 防止重复请求
    const shouldBlock = this.data.isLoading || this.data.produceArr.length >= this.data.totalCount;

    if (shouldBlock) {
      return;
    }

    // 检查是否还有更多页
    const canLoadMore = this.data.currentPage < this.data.totalPage;

    if (canLoadMore) {
      const nextPage = this.data.currentPage + 1;
      // 直接使用nextPage作为参数，不依赖this.data.currentPage
      this._getInitDataWithPage(nextPage);
      this.setData({
        currentPage: nextPage
      });
    } else {
      // 已经到最后一页，显示提示
      wx.showToast({
        title: '已加载全部数据',
        icon: 'none'
      });
    }
  },

  // 展开/收起详情信息
  showOne(e) {
    const {
      itemIndex: goodsIndex,
      dayIndex: depIndex,
      index: reduceIndex
    } = e.currentTarget.dataset;
    
    const currentKey = `${goodsIndex}_${depIndex}_${reduceIndex}`;
    

    // 切换展开状态
    const newExpandedRows = { ...this.data.expandedRows };
    newExpandedRows[currentKey] = !newExpandedRows[currentKey];

    this.setData({
      expandedRows: newExpandedRows
    });
    
  },

  // 控制成本详情列表的显示/隐藏
  showList(e) {
    const goodsIndex = e.currentTarget.dataset.index;
    
    // 检查索引是否有效
    if (goodsIndex === undefined || goodsIndex < 0 || goodsIndex >= this.data.produceArr.length) {
      console.error('无效的商品索引:', goodsIndex);
      return;
    }
    
    // 创建新的数组，避免直接修改原数据
    const newProduceArr = [...this.data.produceArr];
    
    // 确保商品对象有 showCostList 属性
    if (!newProduceArr[goodsIndex].hasOwnProperty('showCostList')) {
      newProduceArr[goodsIndex].showCostList = false;
    }
    
    // 切换指定商品的成本详情显示状态
    newProduceArr[goodsIndex].showCostList = !newProduceArr[goodsIndex].showCostList;
    
    // 更新数据
    this.setData({
      produceArr: newProduceArr
    });
  },

  // 滚动时检测并关闭超出屏幕的展开内容
  checkAndCloseOverflowOnScroll() {
    
    // 检查所有展开的商品
    const newProduceArr = [...this.data.produceArr];
    const expandedGoods = newProduceArr.filter((goods, index) => goods.showCostList);
    
    
    if (expandedGoods.length === 0) {
      return;
    }
    
    expandedGoods.forEach((goods, goodsIndex) => {
      const actualIndex = newProduceArr.findIndex(item => item === goods);
      
      if (goods.showCostList) {
        // 使用setTimeout确保DOM已更新
        setTimeout(() => {
          
          const query = wx.createSelectorQuery();
          query.select(`#goods-container-${actualIndex}`).boundingClientRect();
          query.selectViewport().scrollOffset();
          
          query.exec((res) => {
            
            if (res[0] && res[1]) {
              const containerRect = res[0];
              const scrollInfo = res[1];
              
              // 计算容器是否在可视区域内
              const containerTop = containerRect.top;
              const containerBottom = containerRect.bottom;
              const viewportHeight = wx.getWindowInfo().windowHeight;
              
              
              // 修复判断逻辑：如果容器顶部超出屏幕上方或底部超出屏幕下方，则关闭
              const isTopOut = containerTop < 0;  // 顶部超出屏幕上方
              const isBottomOut = containerBottom > viewportHeight;  // 底部超出屏幕下方
              
              
              if (isTopOut || isBottomOut) {
                
                const newArr = [...this.data.produceArr];
                newArr[actualIndex].showCostList = false;
                
                this.setData({
                  produceArr: newArr
                });
                
              } else {
              }
            } else {
            }
          });
        }, 100);
      } else {
      }
    });
    
  },


  toFenxi(e) {
    var item = e.currentTarget.dataset.item;
    var purId = e.currentTarget.dataset.purgoods.gbDistributerPurchaseGoodsId;
    var purchaseDate = e.currentTarget.dataset.purgoods.gbDpgPurchaseDate;
    wx.setStorageSync('disGoods', item);
    wx.navigateTo({
      url: '/subPackage-goods/pages/goods/goodsFenxiPurchase/goodsFenxiPurchase?disGoodsId=' + item.gbDistributerGoodsId  + '&purGoodsId=' + purId + '&purchaseDate=' + purchaseDate
      , 

    })

  },

  toCost(e) {
    var item = e.currentTarget.dataset.item;
    wx.setStorageSync('disGoods', e.currentTarget.dataset.item);

    wx.navigateTo({
      url: '/subPackage-goods/pages/goods/stockGoodsList/stockGoodsList?disGoodsId=' + item.gbDistributerGoodsId,
    })

  },


  onUnload() {
    // 清理滚动防抖定时器
    if (this.scrollDebounceTimer) {
      clearTimeout(this.scrollDebounceTimer);
    }

    // 清除缓存
    wx.removeStorageSync('selectedSupplier');
    wx.removeStorageSync('selectedPurUser');
    wx.removeStorageSync('costGoodsByDate_scrollState');
  }


})