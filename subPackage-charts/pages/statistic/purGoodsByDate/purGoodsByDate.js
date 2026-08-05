var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
var apiUrl = require('../../../../config/index');
var api = require('../../../services/api.js');


Page({


  onShow() {
    // 计算页面高度
    let windowInfo = wx.getWindowInfo();
    let globalData = getApp().globalData;
    
    const totalHeight = windowInfo.windowHeight * globalData.rpxR;
    const navBarHeight = globalData.navBarHeight * globalData.rpxR;
    const topAreaHeight = 100; // 200rpx为顶部区域、搜索区域、筛选区域和间距的预估高度
    const scrollViewHeight = totalHeight - navBarHeight - topAreaHeight;
    
    // 初始化滚动状态
    this.setData({
      isScrolled: false,
      scrollTop: 0,
      tab1Index: 0,
      itemIndex: 0,
      scrollViewHeight: scrollViewHeight
    });

    if (this.data.update) {
      this._getPurUserStatistics();
      this._getGoodsList();
    }

  },

  onHide() {
    // 页面隐藏时保存滚动状态到本地存储
  },

  /**
   * 页面的初始数据
   */
  data: {

    type: "goods",
    totalPage: 0,
    totalCount: 0,
    limit: 10,
    currentPage: 1,
    update: false,
    hanzi: '',
    // 滚动状态管理
    isScrolled: false,
    scrollTop: 0,
    scrollThreshold: 200, // 滚动阈值，超过200rpx时触发收缩
    // 标签页状态
    tab1Index: 0, // 当前选中的标签页索引
    itemIndex: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      greatId: options.id,
      disId: options.disId,
      value: options.value,
      purTotal: options.purTotal,
      startDate: options.startDate,
      stopDate: options.stopDate,
      hanzi: options.hanzi,
      dateType: options.dateType,
      name: options.name,
      supplierId: -1,
      purUserId: -1,

    })
    this._getPurUserStatistics();
    this._getGoodsList();
  },



  // 获取采购员统计信息
  _getPurUserStatistics() {
    var data = {
      supplierId: this.data.supplierId, // 添加 supplierId = -1
      purUserId: this.data.purUserId,
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      disId: this.data.disId,
      greatId: this.data.greatId

    };

    // 调用新的统计接口
    api.getGbPurGoodsStatisticsSeachDate(data)
      .then(res => {
        if (res.result.code == 0) {
          console.log('统计接口返回数据:', res.result.data);
          this.setData({
            value: res.result.data.allDouble,
            dinghuo: res.result.data.dinghuo,
            dinghuoCount: res.result.data.dinghuoCount,
            zicai: res.result.data.zicai,
            zicaiCount: res.result.data.zicaiCount,
            stockTotal: res.result.data.stockTotal,
            stockCount: res.result.data.stockCount,
            supplierList: res.result.data.supplierArr,
            purUserArr: res.result.data.depUserArr,
          });

        } else {
          this.setData({
            arr: []
          })
          load.hideLoading();
          wx.showToast({
            title: res.result.msg || '获取统计信息失败',
            icon: 'none'
          });
        }
      })

  },

  // 获取商品列表
  _getGoodsList() {
    // 设置加载状态
    this.setData({
      isLoading: true
    });

    var data = {
      supplierId: this.data.supplierId,
      purUserId: this.data.purUserId,
      disId: this.data.disId,
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      page: this.data.currentPage,
      limit: this.data.limit,
      greatId: this.data.greatId,
    };

    load.showLoading("获取数据中");
    api.getGbPurGoodsListSearchDate(data)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {

          const result = res.result.data;
          console.log(("result====",result));

          // 如果是第一页，直接替换数据；否则追加数据
          if (this.data.currentPage === 1) {
            // 为每个采购记录添加展开状态，并为每个商品添加独立的显示状态
            const goodsList = (result.goodsList || []).map(goods => ({
              ...goods,
              showPurchaseList: false, // 每个商品独立的采购批次显示状态
              wastePurGoodsEntities: goods.wastePurGoodsEntities.map(pur => ({
                ...pur,
                expanded: false
              }))
            }));

            this.setData({
              arr: goodsList,
              totalCount: result.totalCount || 0,
              totalPage: result.totalPages || 0
            });
          } else {
            // 为新增的采购记录添加展开状态，并为每个商品添加独立的显示状态
            const newGoodsList = (result.goodsList || []).map(goods => ({
              ...goods,
              showPurchaseList: false, // 每个商品独立的采购批次显示状态
              wastePurGoodsEntities: goods.wastePurGoodsEntities.map(pur => ({
                ...pur,
                expanded: false
              }))
            }));

            this.setData({
              arr: [...this.data.arr, ...newGoodsList],
              totalCount: result.totalCount || 0,
              totalPage: result.totalPages || 0
            });
          }

          // 设置加载状态为false
          this.setData({
            isLoading: false
          });
        } else {
          wx.showToast({
            title: res.result.msg || '获取商品列表失败',
            icon: 'none'
          });

          // 请求失败时也要设置加载状态为false
          this.setData({
            isLoading: false
          });
        }
      })

  },

  // 上拉加载更多
  onReachBottom() {
    // 防止重复请求
    if (this.data.isLoading || this.data.arr.length >= this.data.totalCount) return;

    // 检查是否还有更多页
    if (this.data.currentPage <= this.data.totalPage) { // 改为 <=
      this.setData({
        currentPage: this.data.currentPage + 1
      });
      this._getGoodsList();
    } else {
      // 已经到最后一页，显示提示
      wx.showToast({
        title: '已加载全部数据',
        icon: 'none'
      });
    }
  },







  toDetail(e) {
    const type = e.currentTarget.dataset.type;
    console.log("hanzi",this.data.hanzi);
    
      wx.navigateTo({
        url: '../purchaseDeatil/purchaseDeatil?startDate=' + this.data.startDate + '&stopDate=' + 
        this.data.stopDate + '&hanzi=' + this.data.hanzi + '&greatId=' + this.data.greatId + '&type='
        + type + '&disId=' + this.data.disId,
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
      url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType + '&hanzi=' + this.data.hanzi, 
    })
  },



  showDetail(e) {
    const goodsIndex = e.currentTarget.dataset.goodsIndex;
    const purIndex = e.currentTarget.dataset.purIndex;

    // 创建新的数组，避免直接修改原数据
    const newArr = [...this.data.arr];

    // 切换指定采购记录的展开状态
    newArr[goodsIndex].wastePurGoodsEntities[purIndex].expanded = !newArr[goodsIndex].wastePurGoodsEntities[purIndex].expanded;

    // 更新数据
    this.setData({
      arr: newArr
    });
  },

  // 控制采购批次列表的显示/隐藏
  showList(e) {
    const goodsIndex = e.currentTarget.dataset.index;
    
    // 创建新的数组，避免直接修改原数据
    const newArr = [...this.data.arr];
    
    // 切换指定商品的采购批次显示状态
    newArr[goodsIndex].showPurchaseList = !newArr[goodsIndex].showPurchaseList;
    
    // 更新数据
    this.setData({
      arr: newArr
    });
  },

  // 滚动时检测并关闭超出屏幕的展开内容
  checkAndCloseOverflowOnScroll() {
    console.log('=== checkAndCloseOverflowOnScroll 开始执行 ===');
    
    // 检查所有展开的商品
    const newArr = [...this.data.arr];
    const expandedGoods = newArr.filter((goods, index) => goods.showPurchaseList);
    
    console.log('当前数据数组长度:', newArr.length);
    console.log('展开的商品数量:', expandedGoods.length);
    console.log('展开的商品索引:', expandedGoods.map((goods, index) => {
      const actualIndex = newArr.findIndex(item => item === goods);
      return actualIndex;
    }));
    
    if (expandedGoods.length === 0) {
      console.log('没有展开的商品，直接返回');
      return;
    }
    
    expandedGoods.forEach((goods, goodsIndex) => {
      const actualIndex = newArr.findIndex(item => item === goods);
      console.log(`处理商品 ${actualIndex}，showPurchaseList:`, goods.showPurchaseList);
      
      if (goods.showPurchaseList) {
        // 使用setTimeout确保DOM已更新
        setTimeout(() => {
          console.log(`开始查询商品 ${actualIndex} 的位置信息`);
          
          const query = wx.createSelectorQuery();
          query.select(`#goods-container-${actualIndex}`).boundingClientRect();
          query.selectViewport().scrollOffset();
          
          query.exec((res) => {
            console.log(`商品 ${actualIndex} 查询结果:`, res);
            
            if (res[0] && res[1]) {
              const containerRect = res[0];
              const scrollInfo = res[1];
              
              // 计算容器是否在可视区域内
              const containerTop = containerRect.top;
              const containerBottom = containerRect.bottom;
              const viewportHeight = wx.getWindowInfo().windowHeight;
              
              console.log(`商品 ${actualIndex} 位置信息:`);
              console.log('- containerTop:', containerTop);
              console.log('- containerBottom:', containerBottom);
              console.log('- viewportHeight:', viewportHeight);
              console.log('- scrollTop:', scrollInfo.scrollTop);
              
              // 修复判断逻辑：如果容器顶部超出屏幕上方或底部超出屏幕下方，则关闭
              const isTopOut = containerTop < 0;  // 顶部超出屏幕上方
              const isBottomOut = containerBottom > viewportHeight;  // 底部超出屏幕下方
              
              console.log(`商品 ${actualIndex} 超出判断:`);
              console.log('- isTopOut:', isTopOut);
              console.log('- isBottomOut:', isBottomOut);
              
              if (isTopOut || isBottomOut) {
                console.log(`滚动检测：商品 ${actualIndex} 超出屏幕，自动关闭`);
                
                const newArr = [...this.data.arr];
                newArr[actualIndex].showPurchaseList = false;
                
                this.setData({
                  arr: newArr
                });
                
                console.log(`商品 ${actualIndex} 已关闭展开状态`);
              } else {
                console.log(`商品 ${actualIndex} 仍在可视区域内，保持展开状态`);
              }
            } else {
              console.log(`商品 ${actualIndex} 查询失败，res[0]:`, res[0], 'res[1]:', res[1]);
            }
          });
        }, 100);
      } else {
        console.log(`商品 ${actualIndex} 未展开，跳过处理`);
      }
    });
    
    console.log('=== checkAndCloseOverflowOnScroll 执行完毕 ===');
  },


  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },


  toFilter() {
    wx.setStorageSync('supplierList', this.data.supplierList);
    wx.navigateTo({
      url: '../../sel/filterData/filterData',
    })
  },

  // 滚动监听事件
  onScroll(event) {
    const scrollTop = event.detail.scrollTop;
    const threshold = this.data.scrollThreshold;
    const isScrolled = scrollTop > threshold;
    
    console.log('=== 滚动事件触发 ===');
    console.log('scrollTop:', scrollTop);
    console.log('threshold:', threshold);
    console.log('isScrolled:', isScrolled);
    console.log('当前 isScrolled 状态:', this.data.isScrolled);
    
    // 清除之前的防抖定时器
    if (this.scrollDebounceTimer) {
      console.log('清除之前的防抖定时器');
      clearTimeout(this.scrollDebounceTimer);
    }
    
    // 设置防抖延迟，避免频繁处理
    this.scrollDebounceTimer = setTimeout(() => {
      console.log('防抖定时器执行，更新状态并调用检测方法');
      
      // 只有当状态改变时才更新setData，避免频繁setData
      if (isScrolled !== this.data.isScrolled) {
        console.log('滚动状态发生变化，更新状态');
        this.setData({
          isScrolled: isScrolled,
          scrollTop: scrollTop
        });
      } else {
        console.log('滚动状态未变化，只更新scrollTop');
        this.setData({
          scrollTop: scrollTop
        });
      }

      // 每次滚动都检测并关闭超出屏幕的展开内容
      this.checkAndCloseOverflowOnScroll();
    }, 50); // 50ms防抖延迟
  },

  // 标签页点击事件
  onTab1Click(event) {
    const type = event.currentTarget.dataset.type;
    console.log('=== 按钮点击事件 ===');
    console.log('点击类型:', type);
    console.log('事件目标:', event.currentTarget);

    // 根据按钮类型执行相应操作
    if (type !== '2') {
      this.toDetail({ currentTarget: { dataset: { type: type } } });

      // 自采按钮
    // } else if (type === '1') {
    //   // 订货按钮
    } else {
      // 库存按钮
      this.toStockPage();
    }
  },


  
  toStockPage(e) {
      
    wx.navigateTo({
      url: '../stockPurGoods/stockPurGoods?startDate=' + this.data.startDate + '&stopDate=' + 
      this.data.stopDate + '&dateType=' + this.data.dateType + '&searchDepIds=-1&disId=' + this.data.disId + '&hanzi=' + this.data.hanzi  + '&id=' + this.data.greatId + '&name=' + this.data.name

    })
  },

  onUnload() {

    // 清除缓存
    wx.removeStorageSync('selectedSupplier');
    wx.removeStorageSync('selectedPurUser');
    wx.removeStorageSync('purGoodsByDate_scrollState');
  }

})
