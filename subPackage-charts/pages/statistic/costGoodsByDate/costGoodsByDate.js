var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
var dateUtils = require('../../../../lib/dateUtil.js')
var apiUrl = require('../../../../config/index');
var api = require('../../../services/api.js');

var COST_TAB_DEFS = [
  { index: 0, type: 'sales', title: '售出成本', row: 'top', icon: '/images/money.png', iconClass: 'sales-icon', totalField: 'salesTotal', countField: 'produceCount' },
  { index: 1, type: 'loss', title: '损耗成本', row: 'top', icon: '/images/warn.png', iconClass: 'loss-icon', totalField: 'lossTotal', countField: 'lossCount' },
  { index: 2, type: 'waste', title: '废弃成本', row: 'top', icon: '/images/delete.png', iconClass: 'waste-icon', totalField: 'wasteTotal', countField: 'wasteCount' },
  { index: 3, type: 'return', title: '退货成本', row: 'bottom', icon: '/images/warn.png', iconClass: 'return-icon', totalField: 'returnTotal', countField: 'returnCount' },
  { index: 4, type: 'employeeMeal', title: '员工餐成本', row: 'bottom', icon: '/images/qiandaizi.png', iconClass: 'employee-meal-icon', totalField: 'employeeMealTotal', countField: 'employeeMealCount' },
];

var TYPE_TO_TAB_INDEX = {
  sales: 0,
  loss: 1,
  waste: 2,
  return: 3,
  employeeMeal: 4,
};

Page({

  onShow() {

    // 推荐直接用新API
    let windowInfo = wx.getWindowInfo();
    let globalData = getApp().globalData;

    // 详细计算过程
    const totalHeight = windowInfo.windowHeight * globalData.rpxR;
    const navBarHeight = globalData.navBarHeight * globalData.rpxR;
    const topAreaHeight = 100;
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
    update: false,
    tab1Index: 0,
    type: 'sales',
    scrollViewHeight: 600,
    costTabCards: [],
    totalPage: 0,
    totalCount: 0,
    limit: 10,
    currentPage: 1,
    isLoading: false,
    expandedRows: {},
    employeeMealTotal: 0,
    employeeMealCount: 0,
    returnTotal: 0,
    returnCount: 0,
    produceArr: [],
    salesTotal: 0,
    lossTotal: 0,
    wasteTotal: 0,
    produceCount: 0,
    lossCount: 0,
    wasteCount: 0,
  },

  /**
   * 生命周期函数--监听页面加载disId=2&startDate=2025-09-01&stopDate=2025-09-01&dateType=month&fenxiType=costEcharts&searchDepId=-1&value=9999.5&allCostTotal=9999.5&id=-1&type=sales&hanzi=星期一
   */
  _decodeQueryParam(value) {
    if (value === undefined || value === null || value === '') {
      return '';
    }
    try {
      return decodeURIComponent(String(value));
    } catch (e) {
      return String(value);
    }
  },

  /** 顶部支出总额：售出 + 损耗 + 废弃 + 员工餐，不含退货 */
  _calcHeaderExpenseTotal(stats) {
    var sales = parseFloat(stats.salesTotal) || 0;
    var loss = parseFloat(stats.lossTotal) || 0;
    var waste = parseFloat(stats.wasteTotal) || 0;
    var employeeMeal = parseFloat(stats.employeeMealTotal) || 0;
    return Math.round((sales + loss + waste + employeeMeal) * 100) / 100;
  },

  onLoad: function (options) {
    var type = options.type || 'sales';
    var tabIndex = TYPE_TO_TAB_INDEX[type];
    if (tabIndex === undefined) {
      tabIndex = 0;
      type = 'sales';
    }

    this.setData({
      name: this._decodeQueryParam(options.name),
      disId: options.disId,
      greatId: options.id,
      startDate: options.startDate,
      stopDate: options.stopDate,
      hanzi: this._decodeQueryParam(options.hanzi),
      dateType: options.dateType,
      allCostTotal: options.allCostTotal,
      value: options.value,
      type: type,
      tab1Index: tabIndex,
      fenxiType: options.fenxiType,
      searchDepId: options.searchDepId,
      url: apiUrl.server,
    });

    this._syncCostTabCards();
    this._getGoodsCostStatistics();
  },

  _syncCostTabCards() {
    var cards = COST_TAB_DEFS.map(function (def) {
      return {
        index: def.index,
        type: def.type,
        title: def.title,
        row: def.row,
        icon: def.icon,
        iconClass: def.iconClass,
        total: this.data[def.totalField] || 0,
        count: this.data[def.countField] || 0,
      };
    }.bind(this));
    this.setData({ costTabCards: cards });
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
            value: this._calcHeaderExpenseTotal(res.result.data),
            salesTotal: res.result.data.salesTotal,
            lossTotal: res.result.data.lossTotal,
            wasteTotal: res.result.data.wasteTotal,
            returnTotal: res.result.data.returnTotal || 0,
            employeeMealTotal: res.result.data.employeeMealTotal || 0,
            produceCount: res.result.data.produceCount,
            lossCount: res.result.data.lossCount,
            wasteCount: res.result.data.wasteCount,
            returnCount: res.result.data.returnCount || 0,
            employeeMealCount: res.result.data.employeeMealCount || 0,
          });

          this._syncCostTabCards();
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
    var index = parseInt(event.currentTarget.dataset.index, 10);
    var type = event.currentTarget.dataset.type;
    if (index === this.data.tab1Index && type === this.data.type) {
      return;
    }
    this._switchTab(index, type);
  },

  _switchTab(index, type) {
    this.setData({
      tab1Index: index,
      type: type,
      currentPage: 1,
      totalPage: 0,
      totalCount: 0,
      isLoading: false,
      produceArr: [],
      expandedRows: {},
    });
    this._getInitData();
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
    var index = parseInt(event.detail.index, 10);
    var type = event.detail.type;
    this._switchTab(index, type);
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
