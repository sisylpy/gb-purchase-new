const globalData = getApp().globalData;
var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'

// import {
//   getDisPurchaseGoodsBatchDetail
// } from '../../../../lib/apiDistributerGb'


Page({

  /**
   * 页面的初始数据
   */
  data: {


  },

  

  
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      url: apiUrl.server,
      batchId: options.batchId,
      value: options.value

    })

    var batchItem = wx.getStorageSync('batchItem');
    if(batchItem){
      this.setData({
        batchItem: batchItem
      })
    }

  
    this._getInitData()
  },

  
  _getInitData(){
    load.showLoading("获取进货商铺")
     
    getDisPurchaseGoodsBatchDetail(this.data.batchId)
    .then(res => {
      this.setData({
        arr: res.result.data,
      })
      load.hideLoading();
      console.log(res.result.data)
     
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
    // 检查所有展开的商品
    const newArr = [...this.data.arr];
    const expandedGoods = newArr.filter((goods, index) => goods.showPurchaseList);
    
    if (expandedGoods.length === 0) {
      return;
    }
    
    expandedGoods.forEach((goods, goodsIndex) => {
      const actualIndex = newArr.findIndex(item => item === goods);
      
      if (goods.showPurchaseList) {
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
                console.log(`滚动检测：商品 ${actualIndex} 超出屏幕，自动关闭`);
                
                const newArr = [...this.data.arr];
                newArr[actualIndex].showPurchaseList = false;
                
                this.setData({
                  arr: newArr
                });
              }
            }
          });
        }, 100);
      }
    });
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
    
    // 只有当状态改变时才更新，避免频繁setData
    if (isScrolled !== this.data.isScrolled) {
      // 清除之前的防抖定时器
      if (this.scrollDebounceTimer) {
        clearTimeout(this.scrollDebounceTimer);
      }
      
      // 设置防抖延迟，避免频繁切换
      this.scrollDebounceTimer = setTimeout(() => {
        this.setData({
          isScrolled: isScrolled,
          scrollTop: scrollTop
        });

        // 滚动时检测并关闭超出屏幕的展开内容
        this.checkAndCloseOverflowOnScroll();
      }, 50); // 50ms防抖延迟
    }
  },

  // 标签页点击事件
  onTab1Click(event) {
    const type = event.currentTarget.dataset.type;
    console.log('=== 按钮点击事件 ===');
    console.log('点击类型:', type);
    console.log('事件目标:', event.currentTarget);

    // 根据按钮类型执行相应操作
    if (type === '0') {
      // 自采按钮
      this.toDetail({ currentTarget: { dataset: { type: '0' } } });
    } else if (type === '1') {
      // 订货按钮
      this.toDetail({ currentTarget: { dataset: { type: '1' } } });
    } else if (type === '2') {
      // 库存按钮
      this.toStockPage();
    }
  },




  toCost(e) {
    var item  = e.currentTarget.dataset.item;
    var stockId = e.currentTarget.dataset.id;
    wx.setStorageSync('disGoods', e.currentTarget.dataset.item);
   
    wx.navigateTo({
      url: '/subPackage-goods/pages/goods/stockGoodsList/stockGoodsList?disGoodsId=' + item.gbDistributerGoodsId + '&stockId=' + stockId,
    })

  },
  
  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  },







})