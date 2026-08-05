var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
var dateUtils = require('../../../../lib/dateUtil');
import * as echarts from '../../../../ec-canvas/echarts';

import apiUrl from '../../../../config/index.js'
import apiDistributer from '../../../../services/apiDistributer.js'


Page({

  data: {
    selectedPurIndex: -1, // 选中的采购批次索引
    showDateModal: false, // 控制日期不匹配弹窗的显示
  },

  onShow() {
   

    if (this.data.update) {
      // 检查是否有新的日期设置（从日期设置页面返回）
      var myDate = wx.getStorageSync('myDate');
      if (myDate) {
        var dateRange = dateUtils.getDateRange(myDate.name);
        // 只有当获取到有效的日期范围时才更新
        if (dateRange.startDate && dateRange.stopDate) {
          this.setData({
            startDate: dateRange.startDate,
            stopDate: dateRange.stopDate,
            dateType: myDate.dateType,
            hanzi: myDate.hanzi,
            update: false
          })
        }
      }
     
      // 重新请求接口
      this._getGoodsList();
    }

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
      disGoodsId: options.disGoodsId,
      targetPurGoodsId: options.purGoodsId, // 接收目标采购批次ID
      purchaseDate: options.purchaseDate, // 接收采购日期参数
    })

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
    }else{
      this.setData({
        dateType: 'month',
        startDate: dateUtils.getFirstDateInMonth(),
        stopDate: dateUtils.getArriveDate(0),
        hanzi:  "本月",
      })
    }

    var disGoods = wx.getStorageSync('disGoods');
    if(disGoods){
          this.setData({
        disGoods: disGoods
      })
      }

    this._getGoodsList();
  },

  // 检查采购日期是否在查询周期内
  _checkPurchaseDateInRange() {
    const { purchaseDate, startDate, stopDate } = this.data;
    
    // 如果没有传入采购日期，不需要检查
    if (!purchaseDate) {
      return true;
    }
    
    // 将日期字符串转换为Date对象进行比较
    const purchaseDateObj = new Date(purchaseDate);
    const startDateObj = new Date(startDate);
    const stopDateObj = new Date(stopDate);
    
    // 检查采购日期是否在查询周期内
    const isInRange = purchaseDateObj >= startDateObj && purchaseDateObj <= stopDateObj;
    
    console.log('📅 日期范围检查:', {
      purchaseDate,
      startDate,
      stopDate,
      isInRange
    });
    
    return isInRange;
  },

  // 获取商品列表
  _getGoodsList() {
    // 设置加载状态
    this.setData({
      isLoading: true
    });

    var data = { 
      disGoodsId: this.data.disGoodsId,
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
    };

    load.showLoading("获取数据中");
    apiDistributer.getGbPurGoodsDetailList(data)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          this.setData({
            arr:  res.result.data.arr,
            itemList: res.result.data.itemList
          })
          
          if(res.result.data.arr.length > 0){
 // 延迟初始化图表，确保DOM渲染完成
setTimeout(() => {
 this.initPurPricelChart();
}, 100);
          }
         
          
          // 如果有目标采购批次ID，自动滚动到对应位置并展开
          if (this.data.targetPurGoodsId) {
            this._scrollToTargetPurchase();
          }
          
          // 检查采购日期是否在查询周期内
          if (!this._checkPurchaseDateInRange()) {
            this.setData({
              showDateModal: true
            });
          }
       
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

  // 初始化采购金额图表
  initPurPricelChart() {
    if (!this.data.itemList || this.data.itemList.length === 0) {
      return;
    }
    
    const that = this;
    this.echartsComponnet = this.selectComponent('#dailyChart');
    
    if (!this.echartsComponnet) {
      console.log('图表组件未找到');
      return;
    }

    this.echartsComponnet.init((canvas, width, height) => {
      // 初始化图表
      const Chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: globalData.rpxR
      });
      Chart.setOption(this.getPurSubtotalOption());
      // 注意这里一定要返回 chart 实例，否则会影响事件处理等
      return Chart;
    });
  },

  // 获取采购金额图表配置
  getPurSubtotalOption() {
    const itemList = this.data.itemList;
    
    if (!itemList || itemList.length === 0) {
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

    // 提取日期和金额数据
    const dateList = [];
    const valueList = [];
    
    itemList.forEach(item => {
      if (item.date && item.purUnitPrice !== undefined && item.purUnitPrice !== null) {
        // 提取日期部分，如从 "2025-01-15" 提取 "15"
        const day = item.date.split('-')[2];
        dateList.push(day);
        valueList.push(parseFloat(item.purUnitPrice) || 0);
      }
    });

    return {
      color: ['#4A90E2'],
      grid: {
        left: 20,
        right: 20,
        bottom: 20,
        top: 40,
        containLabel: true,
        show: false
      },
      xAxis: {
        type: 'category',
        data: dateList,
        boundaryGap: true,
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
        },
        axisLabel: {
          formatter: function(value) {
            return '¥' + value.toFixed(0);
          }
        }
      },
      series: [{
        type: 'line',
        name: '采购金额',
        data: valueList,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: function (value, params) {
          const v = typeof params.data === 'number' ? params.data : parseFloat(params.data);
          return v > 0 ? 10 : 0;
        },
        lineStyle: {
          width: 2,
          color: '#4A90E2'
        },
        itemStyle: {
          color: '#4A90E2'
        },
        label: {
          show: true,
          position: 'top',
          formatter: function(params) {
            const v = params.value;
            if (typeof v === 'number' && v > 0) {
              return '¥' + v.toFixed(0);
            }
            return '';
          },
          color: '#666',
          fontSize: 10
        },
        z: 3
      }]
    };
  },

  // 自动滚动到目标采购批次并展开
  _scrollToTargetPurchase() {
    const targetPurGoodsId = this.data.targetPurGoodsId;
    if (!targetPurGoodsId) return;
    
    console.log('🎯 开始滚动到目标采购批次:', targetPurGoodsId);
    
    // 延迟执行，确保DOM渲染完成
    setTimeout(() => {
      // 查找目标采购批次在数组中的索引
      const arr = this.data.arr;
      let targetIndex = -1;
      
      for (let i = 0; i < arr.length; i++) {
        if (arr[i].gbDistributerPurchaseGoodsId == targetPurGoodsId) {
          targetIndex = i;
          break;
        }
      }
      
      if (targetIndex === -1) {
        console.log('❌ 未找到目标采购批次:', targetPurGoodsId);
        return;
      }
      
      console.log('✅ 找到目标采购批次，索引:', targetIndex);
      
      // 设置选中状态并展开该采购批次
      const newArr = [...this.data.arr];
      newArr[targetIndex].expanded = true; // 自动展开
      
      this.setData({
        arr: newArr,
        selectedPurIndex: targetIndex // 设置选中状态
      });
      
      // 使用选择器查询目标元素的位置
      const query = wx.createSelectorQuery();
      query.select(`#pur-item-${targetIndex}`).boundingClientRect();
      query.exec((res) => {
        if (res[0]) {
          const rect = res[0];
          // 修复滚动计算：使用 rect.top 减去导航栏高度和偏移量
          const scrollTop = Math.max(0, rect.top - this.data.navBarHeight - 20); // 20px 的偏移量
          
          console.log('📏 滚动参数:', {
            rect: rect,
            scrollTop: scrollTop,
            navBarHeight: this.data.navBarHeight
          });
          
          wx.pageScrollTo({
            scrollTop: scrollTop,
            duration: 500
          });
          
          console.log('🎯 滚动完成');
        } else {
          console.log('❌ 未找到目标元素');
        }
      });
    }, 300);
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




  toDatePage() {
    this.setData({
      update: true,
    })
    wx.navigateTo({
      url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType + '&hanzi=' + this.data.hanzi, 
    })
  },

  // 关闭日期不匹配弹窗
  closeDateModal() {
    this.setData({
      showDateModal: false
    });
  },

  // 去设置查询日期
  goToDateSetting() {
    this.setData({
      showDateModal: false
    });
    this.toDatePage();
  },

  // 阻止事件冒泡
  stopPropagation(event) {
    // 阻止点击弹窗内容区域时关闭弹窗
  },



  showDetail(e) {
    const purIndex = e.currentTarget.dataset.purIndex;

    // 创建新的数组，避免直接修改原数据
    const newArr = [...this.data.arr];

    // 切换指定采购记录的展开状态
    newArr[purIndex].expanded = !newArr[purIndex].expanded;

    // 更新数据
    this.setData({
      arr: newArr
    });
  },


  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },

  onUnload() {

    // 清除缓存
    wx.removeStorageSync('disGoods');
  }

})
