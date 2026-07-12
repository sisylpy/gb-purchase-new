var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
var dateUtils = require('../../../../lib/dateUtil.js')
var apiUrl = require('../../../../config/index');
var api = require('../../../services/api.js');


Page({


  onShow() {
    

    if (this.data.update) {
      // 检查是否有新的日期设置（从日期设置页面返回）
      var myDate = wx.getStorageSync('myDate');
      if (myDate) {
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
    
      // 重新请求接口
      this._getGoodsList();
    }

  },

  /**
   * 页面的初始数据
   */
  data: {

    type: "goods",
    fenxiType: "costEcharts",
    totalPage: 0,
    totalCount: 0,
    limit: 10,
    currentPage: 1,
    update: false,
    hanzi: '',
   
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
      fatherName: options.fatherName,
      disId: options.disId,
      value: options.value,
      startDate: options.startDate,
      stopDate: options.stopDate,
      hanzi: options.hanzi,
      dateType:  options.dateType,
      name: options.name,
      supplierId: -1,
      purUserId: -1,

    })
    this._getGoodsList();
  },



  // 规范化商品列表：默认折叠采购批次与库存详情
  _normalizeGoodsList(goodsList) {
    return (goodsList || []).map(function (goods) {
      return Object.assign({}, goods, {
        showPurchaseList: false,
        wastePurGoodsEntities: (goods.wastePurGoodsEntities || []).map(function (pur) {
          return Object.assign({}, pur, { expanded: false });
        }),
      });
    });
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
    api.getGbStockPurGoods(data)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {

          const result = res.result.data;
          console.log(("result====",result));

          // 如果是第一页，直接替换数据；否则追加数据
          if (this.data.currentPage === 1) {
            this.setData({
              arr: this._normalizeGoodsList(result.goodsList),
              restSubtotal: result.restSubtotal,
              totalCount: result.totalCount || 0,
              totalPage: result.totalPages || 0
            });
          } else {
            this.setData({
              arr: this.data.arr.concat(this._normalizeGoodsList(result.goodsList)),
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



  init_top_echarts: function (goods) {
    var id = goods.gbDistributerGoodsId;
    var that = this;
    that.echartsComponnet = that.selectComponent('#mychartTop' + id);

    that.echartsComponnet.init((canvas, width, height) => {
      // 初始化图表
      const Chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: globalData.rpxR


      });
      Chart.setOption(this.getOption(goods));
      // 注意这里一定要返回 chart 实例，否则会影响事件处理等
      return Chart;
    });

  },


  getOption(goods) {
    // 获取采购员和供货商数据
    var purUserData = goods.purEveryDay ? goods.purEveryDay.purUserValueList : [];
    var supplierData = goods.purEveryDay ? goods.purEveryDay.spplierValueList : [];

    // 获取日期列表（优先从商品级别获取，然后从采购员或供货商数据获取）
    var dateList = goods.purEveryDay ? goods.purEveryDay.dateList : [];

    // 如果商品级别的 dateList 为空，尝试从采购员数据获取
    if ((!dateList || !Array.isArray(dateList) || dateList.length === 0) && purUserData && purUserData.length > 0) {
      dateList = purUserData[0].dateList || [];
    }

    // 如果还是为空，尝试从供货商数据获取
    if ((!dateList || !Array.isArray(dateList) || dateList.length === 0) && supplierData && supplierData.length > 0) {
      dateList = supplierData[0].dateList || [];
    }

    // 如果仍然为空，使用默认的日期列表
    if (!dateList || !Array.isArray(dateList) || dateList.length === 0) {
      dateList = ["01", "02", "03", "04", "05", "06", "07", "08", "09"];
    }

    // 生成系列数据
    var series = [];

    // 检查是否有任何数据
    var hasAnyData = false;

    // 添加总额系列
    if (goods.purEveryDay && goods.purEveryDay.subtotalValueList) {
      var subtotalValueList = goods.purEveryDay.subtotalValueList;
      var totalValues = this._getTotalValues(subtotalValueList, dateList);

      // 检查是否有有效数据
      var hasValidData = totalValues.some(val => val !== null && val > 0);
      if (hasValidData) {
        hasAnyData = true;
      }

      series.push({
        type: 'bar',
        name: '总额',
        data: this._buildSeriesData(totalValues, dateList),
        barWidth: '60%', // ★ 柱状图宽度
        itemStyle: { // ★ 普通柱子用浅蓝色
          color: '#4A90E2',
          shadowBlur: 0,
          shadowColor: 'transparent'
        },
        z: 3,
        markPoint: this._getTotalMarkPoint(goods, dateList)
      });
    }

    // 如果没有有效数据，显示空状态
    if (!hasAnyData) {
      return {
        title: {
          text: '暂无数据',
          left: 'center',
          top: 'center',
          textStyle: {
            color: '#999',
            fontSize: 16
          }
        }
      };
    }

    // 指定图表的配置项和数据
    var option = {
      color: ['#187e6e', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'], // 设置多种颜色
      grid: {
        left: 10,
        right: 10,
        bottom: 56, // ★ 从 35 提高到 56，避免 01 的低值挤在最底边
        top: 48, // ★ 稍微多留一点，避免标签被裁剪
        containLabel: true,
        show: false
      },
      xAxis: {
        type: 'category',
        data: dateList,
        boundaryGap: true, // ★ 首尾留白，01 不会贴到 y 轴
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        axisLabel: {
          color: '#666'
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        position: 'right',
        splitLine: {
          show: false
        }
      },
      series: series
    };
    return option;
  },

  // 获取总额数据
  _getTotalValues(subtotalValueList, dateList) {
    var temp = [];

    // 检查 dateList 是否存在
    if (!dateList || !Array.isArray(dateList)) {
      return temp;
    }

    // 根据 dateList 中的每个日期，查找对应的总额数据
    for (var i = 0; i < dateList.length; i++) {
      var currentDate = dateList[i];
      var found = false;

      // 在 subtotalValueList 中查找匹配的日期
      for (var j = 0; j < subtotalValueList.length; j++) {
        var dataItem = subtotalValueList[j];
        var dataDate = dataItem.date;

        // 提取完整日期的日期部分进行匹配
        var dataDay = dataDate;
        if (dataDate && dataDate.includes('-')) {
          dataDay = dataDate.split('-')[2]; // 从 "2025-09-01" 提取 "01"
        }

        if (dataDay === currentDate) {
          var value = parseFloat(dataItem.value);
          if (value > 0) {
            temp.push(value);
          } else {
            temp.push(null);
          }
          found = true;
          break;
        }
      }

      // 如果没有找到对应日期的数据，设置为 null
      if (!found) {
        temp.push(null);
      }
    }
    return temp;
  },

  // 构建系列数据，为指定日期的数据点添加高亮样式
  _buildSeriesData(values, dateList) {
    const searchDay = (this.data.searchDate || '').split('-')[2]; // "04"
    return values.map((v, idx) => {
      if (v == null) return null; // 保持断点
      if (dateList[idx] === searchDay) {
        return {
          value: v,
          itemStyle: {
            color: '#007aff', // ★ 选中日期用蓝色
            borderColor: '#fff',
            borderWidth: 2
          }
        };
      }
      return v; // 其他点保持数值即可
    });
  },

  // 获取总额标记点
  _getTotalMarkPoint(goods, dateList) {
    if (!this.data.searchDate || !goods.purEveryDay || !goods.purEveryDay.subtotalValueList) {
      return {
        data: []
      };
    }

    var subtotalValueList = goods.purEveryDay.subtotalValueList;
    var searchDate = this.data.searchDate; // 完整日期 "2025-09-04"

    // 查找指定日期的数据
    var targetValue = null;
    var targetIndex = -1;

    // 从 searchDate 中提取日期部分
    var searchDay = searchDate;
    if (searchDate && searchDate.includes('-')) {
      searchDay = searchDate.split('-')[2]; // 从 "2025-09-04" 提取 "04"
    }

    for (var i = 0; i < subtotalValueList.length; i++) {
      var dataItem = subtotalValueList[i];
      var dataDate = dataItem.date;
      var dataDay = dataDate;
      if (dataDate && dataDate.includes('-')) {
        dataDay = dataDate.split('-')[2];
      }

      if (dataDay === searchDay && parseFloat(dataItem.value) > 0) {
        targetValue = parseFloat(dataItem.value);
        // 在 dateList 中找到对应的索引
        targetIndex = dateList.findIndex(date => date === searchDay);
        break;
      }
    }

    if (targetIndex !== -1 && targetValue !== null) {
      return {
        data: [{
          name: '指定日期',
          coord: [searchDay, targetValue], // ★ 用类目值而不是索引
          symbol: 'circle',
          symbolSize: 14, // ★ 稍微大一点
          symbolKeepAspect: true,
          itemStyle: {
            color: '#007aff', // ★ 选中日期用蓝色
            borderColor: '#fff',
            borderWidth: 3
          },
          label: {
            show: true,
            position: 'top',
            formatter: '¥' + targetValue.toFixed(2),
            color: '#007aff', // ★ 选中日期用蓝色
            fontSize: 12,
            fontWeight: 'bold',
            offset: [0, -16]
          },
          z: 10 // ★ 提高渲染顺序，但保持在同层
        }]
      };
    }

    return {
      data: []
    };
  },


  toDetail(e) {
    const type = e.currentTarget.dataset.type;
    
    if (type === '0') {
      // 自采 
      wx.navigateTo({
        url: '../purchaseDeatil/purchaseDeatil?startDate=' + this.data.startDate + '&stopDate=' + 
        this.data.stopDate + '&type=0&hanzi=' + this.data.hanzi + '&greatId=' + this.data.greatId,
      })
    } else if (type === '1') {
      // 订货 - 跳转到订货详情页面
      wx.navigateTo({
        url: '../purchaseDeatil/purchaseDeatil?startDate=' + this.data.startDate + '&stopDate=' + 
        this.data.stopDate + '&type=1&hanzi=' + this.data.hanzi  + '&greatId=' + this.data.greatId,
      })
    }
  },





  toDatePage() {
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



  // 

  toFenxi(e) {
    var id = e.currentTarget.dataset.id;
    var purId = e.currentTarget.dataset.purid;

    wx.setStorageSync('disGoods', e.currentTarget.dataset.goods);
    wx.navigateTo({
      url: '/subPackage-goods/pages/goods/goodsFenxiPurchase/goodsFenxiPurchase?disGoodsId=' + id, 

    })
  },

  showDetail(e) {
    var goodsIndex = e.currentTarget.dataset.goodsIndex;
    var purIndex = e.currentTarget.dataset.purIndex;
    var newArr = this.data.arr.slice();
    newArr[goodsIndex].wastePurGoodsEntities[purIndex].expanded =
      !newArr[goodsIndex].wastePurGoodsEntities[purIndex].expanded;
    this.setData({ arr: newArr });
  },

  showList(e) {
    var goodsIndex = e.currentTarget.dataset.index;
    var newArr = this.data.arr.slice();
    newArr[goodsIndex].showPurchaseList = !newArr[goodsIndex].showPurchaseList;
    this.setData({ arr: newArr });
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





  onUnload() {

    // 清除缓存
    wx.removeStorageSync('selectedSupplier');
    wx.removeStorageSync('selectedPurUser');
    wx.removeStorageSync('purGoodsByDate_scrollState');
  }

})