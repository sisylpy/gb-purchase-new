const globalData = getApp().globalData;
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil.js')
var apiUrl = require('../../../../config/index');
var api = require('../../../services/api.js');


Page({

  onShow(){
   
   if(this.data.update){
    var myDate = wx.getStorageSync('myDate');
    if(myDate){
      // 如果是自定义日期，传递具体的开始和结束日期
      var dateRange;
      if (myDate.name === 'custom' ) {
        dateRange = dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate);
      } else {
        dateRange = dateUtils.getDateRange(myDate.name);
      }
      
    
      this.setData({
        startDate: dateRange.startDate,
        stopDate: dateRange.stopDate,
        dateType: myDate.dateType,
        hanzi: myDate.hanzi || dateRange.name,
        update: false
      })

    }
    
    this._initData();
   }
    
   
   
  },

  /**
   * 页面的初始数据
   */
  data: {
   
    
    // 筛选相关数据
    supplierIds: -1,
    purUserIds: -1,
    selectedSupplierNames: '',
    selectedPurUserNames: '',
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

    var value = wx.getStorageSync('disInfo');
    if (value) {
      this.setData({
        disId: value.gbDistributerId,
        disInfo: value,
      })
    }

    // 处理type参数，如果为undefined则设置默认值
    let typeValue = options.type;
    if (typeValue === undefined || typeValue === 'undefined') {
      typeValue = '0'; // 默认为自采
    }

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      type: typeValue,
      greatId: options.greatId,
    })

    console.log("opttionsst", options.stopDate);
    if(options.startDate !== null){
      this.setData({
        startDate: options.stopDate,
        stopDate: options.stopDate,

      })
      console.log("opttionsst", options.stopDate);
    }else{
      var myDate = wx.getStorageSync('myDate');
      if(myDate){
        // 如果是自定义日期，传递具体的开始和结束日期
        var dateRange;
        if (myDate.name === 'custom' ) {
          dateRange = dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate);
        } else {
          dateRange = dateUtils.getDateRange(myDate.name);
        }
        
        this.setData({
          startDate: dateRange.startDate,
          stopDate: dateRange.stopDate,
          dateType: myDate.dateType,
          hanzi: myDate.hanzi || dateRange.name,
        })
      }else{
        this.setData({
          dateType: 'month',
          startDate: dateUtils.getFirstDateInMonth(),
          stopDate: dateUtils.getArriveDate(0),
          hanzi:  "本月",
        })
      }
  
    }
    
    
     this._initData();
   
  },
  


  /**
   * 检查并设置自定义参数
   */
  _checkCustomParams() {
    // 检查是否有自定义参数需要设置（用于测试或特定场景）
    const customParams = wx.getStorageSync('customPurchaseParams');
    if (customParams) {
      console.log('设置自定义参数:', customParams);
      this.setData({
        startDate: customParams.startDate || this.data.startDate,
        stopDate: customParams.stopDate || this.data.stopDate,
        disId: customParams.disId || this.data.disId,
        supplierIds: customParams.supplierIds !== undefined ? customParams.supplierIds : this.data.supplierIds,
        purUserIds: customParams.purUserIds !== undefined ? customParams.purUserIds : this.data.purUserIds,
        type: customParams.type || this.data.type,
        searchDate: customParams.searchDate || this.data.searchDate
      });
      
      // 清除临时参数，避免影响下次使用
      wx.removeStorageSync('customPurchaseParams');
    }
  },

  /**
   * 从缓存加载筛选数据
   */
  _loadFilterDataFromCache() {
    console.log("从缓存加载筛选数据")
    // 从缓存获取供货商信息
    var supplierItem = wx.getStorageSync('selectedSupplier');
    if (supplierItem) {
      this.setData({
        supplierIds: supplierItem.supplierId,
        selectedSupplierNames: supplierItem.supplierName,
        purUserIds: -1,
        selectedPurUserNames: ""
      });
    }
    
    // 从缓存获取采购员信息
    var purUserItem = wx.getStorageSync('selectedPurUser');
    if (purUserItem) {
      this.setData({
        purUserIds: purUserItem.purUserId,
        selectedPurUserNames: purUserItem.purUserName,
        supplierIds: -1,
        selectedSupplierNames: ""

      });
    }
   
  },


  _initData() {
  

    var data = {
      type: this.data.type,
      disId: this.data.disId,
      supplierIds: this.data.supplierIds,
      purUserIds: this.data.purUserIds,
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      greatId: this.data.greatId,
    }
    
    console.log('请求参数:', data);
    
    load.showLoading("获取数据中")
    api.disGetPurchaseDetailType(data)
      .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          console.log('API返回数据:', res.result.data);
          this.setData({
          
           
            total: res.result.data.total,
          })
          if(this.data.type == 1){
            // 为用户添加展开状态
            const purUserArr = (res.result.data.purUserArr || []).map(user => ({
              ...user,
              expanded: false, // 用户级别的展开状态
              arr: user.arr.map(goods => ({
                ...goods,
                isSelected: false, // 商品级别的采购列表展开状态
                wastePurGoodsEntities: goods.wastePurGoodsEntities.map(pur => ({
                  ...pur,
                  expanded: false // 采购记录详细信息的展开状态
                }))
              }))
            }));
            console.log('初始化purUserArr数据结构:', purUserArr);
            this.setData({
              purUserArr: purUserArr,
            })
          } if(this.data.type == 5){
            // 为供货商添加展开状态
            // const supplierArr = (res.result.data.supplierArr || []).map(supplier => ({
            //   ...supplier,
            //   expanded: false, // 供货商级别的展开状态
            //   arr: supplier.arr.map(goods => ({
            //     ...goods,
            //     isSelected: false, // 商品级别的采购列表展开状态
            //     wastePurGoodsEntities: goods.wastePurGoodsEntities.map(pur => ({
            //       ...pur,
            //       expanded: false // 采购记录详细信息的展开状态
            //     }))
            //   }))
            // }));
            console.log('初始化supplierArr数据结构:');
            this.setData({
              supplierArr: res.result.data.supplierArr,
            })
          }
         
        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg || '获取数据失败',
            icon: 'none'
          })
        }
      })
      .catch(error => {
        load.hideLoading();
        console.error('API调用失败:', error);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        })
      })
  },



  // 获取筛选名称
  getFilterNames() {
    try {
      // 优先从本地存储获取筛选名称
      const filterData = wx.getStorageSync('filterData');
      if (filterData) {
        console.log('获取到筛选数据:', filterData);
        
        if (filterData.searchType === 'supplier' && filterData.selectedNames) {
          this.setData({
            selectedSupplierNames: filterData.selectedNames
          });
          console.log('设置供货商名称:', filterData.selectedNames);
        } else if (filterData.searchType === 'purchaser' && filterData.selectedNames) {
          this.setData({
            selectedPurUserNames: filterData.selectedNames
          });
          console.log('设置采购员名称:', filterData.selectedNames);
        }
      }
      
      // 如果没有筛选数据，尝试从缓存获取名称
      if (!this.data.selectedSupplierNames && !this.data.selectedPurUserNames) {
        this.getNamesFromCache();
      }
    } catch (error) {
      console.error('获取筛选名称失败:', error);
    }
  },

  // 从缓存获取名称
  getNamesFromCache() {
    try {
      console.log('尝试从缓存获取名称...');
      
      // 尝试从供货商缓存获取名称
      if (this.data.supplierIds && this.data.supplierIds !== -1) {
        const supplierCache = wx.getStorageSync('supplierList');
        if (supplierCache) {
          // 确保 supplierIds 是数组
          const supplierIds = Array.isArray(this.data.supplierIds) ? this.data.supplierIds : [this.data.supplierIds];
          const supplierNames = [];
          
          supplierIds.forEach(id => {
            const supplier = supplierCache.find(item => String(item.nxJrdhSupplierId) === String(id));
            if (supplier) {
              supplierNames.push(supplier.nxJrdhsSupplierName);
            }
          });
          
          if (supplierNames.length > 0) {
            this.setData({
              selectedSupplierNames: supplierNames.join(', ')
            });
            console.log('从缓存获取到供货商名称:', supplierNames.join(', '));
          }
        }
      }
      
      // 尝试从采购员缓存获取名称
      if (this.data.purUserIds && this.data.purUserIds !== -1) {
        const purchaserCache = wx.getStorageSync('purchaserList');
        if (purchaserCache) {
          // 确保 purUserIds 是数组
          const purchaserIds = Array.isArray(this.data.purUserIds) ? this.data.purUserIds : [this.data.purUserIds];
          const purchaserNames = [];
          
          purchaserIds.forEach(id => {
            const purchaser = purchaserCache.find(item => String(item.gbDuUserId) === String(id));
            if (purchaser) {
              purchaserNames.push(purchaser.gbDuWxNickName || purchaser.gbDuUserName);
            }
          });
          
          if (purchaserNames.length > 0) {
            this.setData({
              selectedPurUserNames: purchaserNames.join(', ')
            });
            console.log('从缓存获取到采购员名称:', purchaserNames.join(', '));
          }
        }
      }
      
      // 如果缓存中都没有，尝试从其他可能的缓存获取
      if (!this.data.selectedSupplierNames && !this.data.selectedPurUserNames) {
        this.getNamesFromOtherCache();
      }
      
    } catch (error) {
      console.error('从缓存获取名称失败:', error);
    }
  },

  // 从其他可能的缓存获取名称
  getNamesFromOtherCache() {
    try {
      // 尝试从全局缓存获取
      // const globalCache = wx.getStorageSync('globalFilterCache');
      const globalCache = wx.getStorageSync('filterCache');
      if (globalCache) {
        if (globalCache.supplierNames && this.data.supplierIds !== -1) {
          this.setData({
            selectedSupplierNames: globalCache.supplierNames
          });
          console.log('从全局缓存获取到供货商名称:', globalCache.supplierNames);
        }
        
        if (globalCache.purchaserNames && this.data.purUserIds !== -1) {
          this.setData({
            selectedPurUserNames: globalCache.purchaserNames
          });
          console.log('从全局缓存获取到采购员名称:', globalCache.purchaserNames);
        }
      }
    } catch (error) {
      console.error('从其他缓存获取名称失败:', error);
    }
  },

  // 设置筛选名称到缓存
  setFilterNamesToCache() {
    try {
      const cacheData = {};
      
      if (this.data.selectedSupplierNames) {
        cacheData.supplierNames = this.data.selectedSupplierNames;
        cacheData.supplierIds = this.data.supplierIds;
      }
      
      if (this.data.selectedPurUserNames) {
        cacheData.purchaserNames = this.data.selectedPurUserNames;
        cacheData.purchaserIds = this.data.purUserIds;
      }
      
      // if (Object.keys(cacheData).length > 0) {
      //   wx.setStorageSync('globalFilterCache', cacheData);
      //   console.log('筛选名称已设置到全局缓存:', cacheData);
      // }
    } catch (error) {
      console.error('设置筛选名称到缓存失败:', error);
    }
  },

  // 删除供货商筛选
  delSupplierSearch() {
    // 清除筛选数据
    this.setData({
      supplierId: -1,
      selectedSupplierName: ''
    });
    
    // 删除 filterCache
    wx.removeStorageSync('filterData');
    
    // 重新加载数据
    this._initData();
  },

  // 删除采购员筛选
  delPurchaseUserSearch() {
    // 清除筛选数据
    this.setData({
      purUserIds: -1,
      selectedPurUserNames: ''
    });
    
    // 删除 filterCache
    wx.removeStorageSync('filterData');
    
    // 重新加载数据
    this._initData();
  },

  // 跳转到筛选页面
  toFilter() {
    var type = "";
    if(this.data.type == 1){
      type = "supplier";
    }else{
      type = "purchaser"
    }
    wx.setStorageSync('purUserList', this.data.purUserArr);
    // 传递当前选中的参数
    let url = '../../sel/filterDataType/filterDataType?searchType=' + type;
    if (type === 'purchaser' && this.data.purUserIds !== -1) {
      url += '&selectedIds=' + this.data.purUserIds;
    } else if (type === 'supplier' && this.data.supplierIds !== -1) {
      url += '&selectedIds=' + this.data.supplierIds;
    }
    
    wx.navigateTo({
      url: url,
    })
  },



  toFenxi(e) {
    var item = e.currentTarget.dataset.item;
    var purId = e.currentTarget.dataset.purid;
    var id = e.currentTarget.dataset.id;

    wx.setStorageSync('disGoods', item);
    wx.navigateTo({
      url: '/subPackage-goods/pages/goods/goodsFenxiPurchase/goodsFenxiPurchase?disGoodsId=' + id, 

    })
    
  },

  // 跳转到筛选页面 - 对应WXML中的toFilterType
  toFilterType() {
    this.toFilter();
  },

  // 显示商品对话框 - 对应WXML中的showDialogBtn
  showDialogBtn(e) {
    const item = e.currentTarget.dataset.item;
    console.log('显示商品详情:', item);
    
    // 这里可以显示商品详情的弹窗或跳转到商品详情页
    wx.showModal({
      title: '商品详情',
      content: `商品名称：${item.gbDgGoodsName}\n采购小计：${item.gbDgSellingPrice}元`,
      showCancel: false
    });
  },
  

  toggleUserDetail(e) {
    const userIndex = e.currentTarget.dataset.userIndex;
    
    console.log('=== toggleUserDetail 调试信息 ===');
    console.log('点击的用户索引:', userIndex);
    console.log('当前type:', this.data.type);

    // 根据type类型处理不同的数据数组
    let dataArray = [];
    let dataKey = '';
    
    if (this.data.type == 1) {
      dataArray = this.data.purUserArr;
      dataKey = 'purUserArr';
    } else if (this.data.type == 5) {
      dataArray = this.data.supplierArr;
      dataKey = 'supplierArr';
    }

    if (dataArray && dataArray.length > 0) {
      // 创建新的数组，避免直接修改原数据
      const newArr = [...dataArray];

      // 切换指定用户的展开状态
      if (newArr[userIndex]) {
        const currentExpanded = newArr[userIndex].expanded;
        console.log('当前用户展开状态:', currentExpanded);
        
        newArr[userIndex].expanded = !currentExpanded;
        
        console.log('切换后用户展开状态:', newArr[userIndex].expanded);
      }

      // 更新数据
      this.setData({
        [dataKey]: newArr
      });
      
      console.log('用户数据已更新');
    }
    
    console.log('=== toggleUserDetail 调试结束 ===');
  },

  showDetail(e) {
    const userIndex = e.currentTarget.dataset.userIndex;
    const goodsIndex = e.currentTarget.dataset.goodsIndex;
    const purIndex = e.currentTarget.dataset.purIndex;

    console.log('=== showDetail 调试信息 ===');
    console.log('点击的参数:', { userIndex, goodsIndex, purIndex });
    console.log('当前type:', this.data.type);

    // 根据type类型处理不同的数据数组
    let dataArray = [];
    let dataKey = '';
    
    if (this.data.type == 1) {
      dataArray = this.data.purUserArr;
      dataKey = 'purUserArr';
    } else if (this.data.type == 5) {
      dataArray = this.data.supplierArr;
      dataKey = 'supplierArr';
    }

    console.log('数据数组长度:', dataArray ? dataArray.length : 0);
    console.log('数据键名:', dataKey);

    if (dataArray && dataArray.length > 0) {
      // 创建新的数组，避免直接修改原数据
      const newArr = [...dataArray];

      console.log('用户/供货商数量:', newArr.length);
      console.log('目标用户索引:', userIndex);
      console.log('目标用户是否存在:', !!newArr[userIndex]);

      let found = false;
      
      if (userIndex !== undefined) {
        // 有用户索引的直接定位
        if (newArr[userIndex] && newArr[userIndex].arr && newArr[userIndex].arr[goodsIndex] && 
            newArr[userIndex].arr[goodsIndex].wastePurGoodsEntities && 
            newArr[userIndex].arr[goodsIndex].wastePurGoodsEntities[purIndex]) {
          
          const currentExpanded = newArr[userIndex].arr[goodsIndex].wastePurGoodsEntities[purIndex].expanded;
          console.log('当前展开状态:', currentExpanded);
          
          // 切换指定采购记录的展开状态
          newArr[userIndex].arr[goodsIndex].wastePurGoodsEntities[purIndex].expanded = !currentExpanded;
          
          console.log('切换后展开状态:', newArr[userIndex].arr[goodsIndex].wastePurGoodsEntities[purIndex].expanded);
          found = true;
        }
      } else {
        // 没有用户索引，需要遍历查找
        console.log('没有用户索引，开始遍历查找...');
        for (let ui = 0; ui < newArr.length && !found; ui++) {
          if (newArr[ui].expanded && newArr[ui].arr) {
            for (let gi = 0; gi < newArr[ui].arr.length && !found; gi++) {
              if (gi === goodsIndex && newArr[ui].arr[gi].wastePurGoodsEntities && 
                  newArr[ui].arr[gi].wastePurGoodsEntities[purIndex]) {
                
                const currentExpanded = newArr[ui].arr[gi].wastePurGoodsEntities[purIndex].expanded;
                console.log('当前展开状态:', currentExpanded);
                
                // 切换指定采购记录的展开状态
                newArr[ui].arr[gi].wastePurGoodsEntities[purIndex].expanded = !currentExpanded;
                
                console.log('切换后展开状态:', newArr[ui].arr[gi].wastePurGoodsEntities[purIndex].expanded);
                found = true;
              }
            }
          }
        }
      }
      
      if (!found) {
        console.log('未找到目标采购记录');
      }

      // 更新数据
      this.setData({
        [dataKey]: newArr
      });
      
      console.log('数据已更新');
    } else {
      console.log('数据数组为空');
    }
    
    console.log('=== showDetail 调试结束 ===');
  },




  // 控制采购批次列表的显示/隐藏
  showList(e) {
    const goodsIndex = e.currentTarget.dataset.index;
    console.log('=== showList 调试信息 ===');
    console.log('点击的商品索引:', goodsIndex);
    console.log('当前type:', this.data.type);
    
    // 根据type类型处理不同的数据数组
    let dataArray = [];
    let dataKey = '';
    
    if (this.data.type == 1) {
      dataArray = this.data.purUserArr;
      dataKey = 'purUserArr';
    } else if (this.data.type == 5) {
      dataArray = this.data.supplierArr;
      dataKey = 'supplierArr';
    }

    if (dataArray && dataArray.length > 0) {
      // 创建新的数组，避免直接修改原数据
      const newArr = [...dataArray];
      
      // 需要找到当前用户/供货商以及对应的商品
      // 由于商品是在用户/供货商级别展开的，我们需要遍历查找
      let found = false;
      for (let userIndex = 0; userIndex < newArr.length && !found; userIndex++) {
        if (newArr[userIndex].expanded && newArr[userIndex].arr) {
          // 在展开的用户/供货商中查找商品
          for (let index = 0; index < newArr[userIndex].arr.length && !found; index++) {
            if (index === goodsIndex) {
              // 切换指定商品的采购批次显示状态
              newArr[userIndex].arr[index].isSelected = !newArr[userIndex].arr[index].isSelected;
              found = true;
              console.log('找到了对应商品，切换状态:', newArr[userIndex].arr[index].isSelected);
            }
          }
        }
      }
      
      // 更新数据
      this.setData({
        [dataKey]: newArr
      });
      
      console.log('商品列表显示状态已更新');
    } else {
      console.log('数据数组为空');
    }
    
    console.log('=== showList 调试结束 ===');
  },

  // 滚动时检测并关闭超出屏幕的展开内容
  checkAndCloseOverflowOnScroll() {
    // 根据type类型处理不同的数据数组
    let dataArray = [];
    let dataKey = '';
    
    if (this.data.type == 1) {
      dataArray = this.data.purUserArr;
      dataKey = 'purUserArr';
    } else if (this.data.type == 5) {
      dataArray = this.data.supplierArr;
      dataKey = 'supplierArr';
    }

    if (!dataArray || dataArray.length === 0) {
      return;
    }

    // 检查所有展开的商品
    const newArr = [...dataArray];
    let foundExpandedGoods = false;
    
    for (let userIndex = 0; userIndex < newArr.length; userIndex++) {
      if (newArr[userIndex].expanded && newArr[userIndex].arr) {
        for (let goodsIndex = 0; goodsIndex < newArr[userIndex].arr.length; goodsIndex++) {
          if (newArr[userIndex].arr[goodsIndex].isSelected) {
            foundExpandedGoods = true;
            
            // 使用setTimeout确保DOM已更新
            setTimeout(() => {
              const query = wx.createSelectorQuery();
              query.select(`#goods-container-${goodsIndex}`).boundingClientRect();
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
                    console.log(`滚动检测：商品 ${goodsIndex} 超出屏幕，自动关闭`);
                    
                    const updatedArr = [...this.data[dataKey]];
                    updatedArr[userIndex].arr[goodsIndex].isSelected = false;
                    
                    this.setData({
                      [dataKey]: updatedArr
                    });
                  }
                }
              });
            }, 100);
          }
        }
      }
    }
    
    if (!foundExpandedGoods) {
      return;
    }
  },



  
  toDatePage() {

    console.log("datetytyt" , this.data.dateType)
    this.setData({
      update: true,
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

  // 滚动监听事件 - 用于检测并关闭超出屏幕的展开内容
  onScroll(event) {
    const scrollTop = event.detail.scrollTop;
    
    // 设置防抖，避免频繁调用
    if (this.scrollDebounceTimer) {
      clearTimeout(this.scrollDebounceTimer);
    }
    
    this.scrollDebounceTimer = setTimeout(() => {
      this.checkAndCloseOverflowOnScroll();
    }, 100);
  },

  // 页面卸载时清理定时器
  onUnload() {
    if (this.scrollDebounceTimer) {
      clearTimeout(this.scrollDebounceTimer);
    }
  },


//

})