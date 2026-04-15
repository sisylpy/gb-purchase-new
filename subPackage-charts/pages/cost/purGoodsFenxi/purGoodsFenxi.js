var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
var dateUtils = require('../../../../lib/dateUtil');
import * as echarts from '../../../ec-canvas/echarts';

import apiUrl from '../../../../config.js'
import apiDistributer from '../../../../services/apiDistributer.js'


Page({

  onShow(){
    if(this.data.update){
      this._getSupplierStatistics();
    }
  },

  data: {
    ecDaily: {
      lazyLoad: false // 每日进货总额图表不使用延迟加载
    },
    ecPurUser: {
      lazyLoad: false // 采购员图表不使用延迟加载
    },
    ecSupplier: {
      lazyLoad: false // 供货商图表不使用延迟加载
    },
    ecCategory: {
      lazyLoad: false // 商品大类图表不使用延迟加载
    },
    categoryChartData: [], // 商品大类图表数据
    showAllGoods: false, // 是否显示所有商品
    showAllSubtotalGoods: false, // 是否显示所有采购金额商品
  },

  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      supplierIds: -1,
      purUserIds: -1,
      disId: options.disId || wx.getStorageSync('userInfo').disId,
    })
    var myDate = wx.getStorageSync('myDate');
      if(myDate){
        console.log("reeee", myDate)
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

    this._getSupplierStatistics();
  },



  // 获取供货商统计信息
  _getSupplierStatistics() {
    var data = {
      purUserIds: this.data.purUserIds,
      supplierIds: this.data.supplierIds,
      disId: this.data.disId,
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      greatId: -1,
    };
    load.showLoading("获取数据中");
    apiDistributer.getGbPurGoodsStatisticsForDis(data)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          console.log("REs", res.result.data);
          this.setData({
            supplierItem: res.result.data,
            purTotal: res.result.data.purTotal,
            purUserData: res.result.data.purUserData,
            supplierData: res.result.data.supplierData,
            topTimesGoods: res.result.data.topTimesGoods,
            topSubtotalGoods: res.result.data.topSubtotalGoods,
            topSubtotalGoodsSubtotal: res.result.data.topSubtotalGoodsSubtotal,
            topSubtotalGoodsPercent: res.result.data.topSubtotalGoodsPercent,
            topGoodsPrice: res.result.data.topGoodsPrice,
            arr: res.result.data.arr,
          }, () => {
            this.init_purUser_chart();
            this.init_supplier_chart();
          });
        } else {
          this.setData({
            mapEveryDay: null
          })
          load.hideLoading();
          load.showToast(res.result.msg || '获取统计信息失败');
        }
      })
      .catch(err => {
        load.hideLoading();
        load.showToast('网络请求失败');
        console.error('统计信息接口失败:', err);
      });
  },


  // 初始化采购员采购总额图表
  init_purUser_chart: function () {
    var that = this;
    
    that.purUserEchartsComponent = that.selectComponent('#purUserChart');    
    if (!that.purUserEchartsComponent) {
      return;
    }
    
    that.purUserEchartsComponent.init((canvas, width, height) => {
      const Chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: globalData.rpxR
      });
      
      const option = that.getPurUserChartOption();
      Chart.setOption(option);
      
      return Chart;
    });
  },

  // 初始化供货商采购总额图表
  init_supplier_chart: function () {
    var that = this;
    
    that.supplierEchartsComponent = that.selectComponent('#supplierChart');    
    if (!that.supplierEchartsComponent) {
      return;
    }
    
    that.supplierEchartsComponent.init((canvas, width, height) => {
      const Chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: globalData.rpxR
      });
      
      const option = that.getSupplierChartOption();
      Chart.setOption(option);
      
      return Chart;
    });
  },


  // 获取采购员采购总额图表配置
  getPurUserChartOption() {
    const purUserData = this.data.purUserData || [];
    
    if (!purUserData || purUserData.length === 0) {
      return {
        title: { text: '暂无采购员数据', left: 'center', top: 'center' }
      };
    }
    
    // 提取采购员名称和采购总额
    const names = purUserData.map(item => item.name || item.purUserName || '未知采购员');
    const amounts = purUserData.map(item => parseFloat(item.totalAmount || item.purTotalAmount) || 0);
    
    return {
      tooltip: {
        show: false
      },
      grid: {
        left: '2%',
        right: '2%',
        bottom: '0',
        top: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: names,
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 12,
          rotate: 45,
          formatter: function(value, index) {
            const amount = amounts[index];
            return value + '\n' + amount + '元';
          },
          lineHeight: 16
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        name: '金额(元)',
        position: 'right',
        nameTextStyle: {
          color: '#666',
          fontSize: 12
        },
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 12
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#f0f0f0',
            type: 'dashed'
          }
        }
      },
      series: [
        {
          name: '采购总额',
          type: 'bar',
          data: amounts,
          itemStyle: {
            color: '#66bb6a',
            borderRadius: [4, 4, 0, 0]
          },
          emphasis: {
            itemStyle: {
              color: '#4caf50'
            }
          },
          barWidth: amounts.length === 1 ? '30%' : (amounts.length <= 3 ? '50%' : '60%')
        }
      ]
    };
  },

  // 获取供货商采购总额图表配置
  getSupplierChartOption() {
    const supplierData = this.data.supplierData || [];
    
    if (!supplierData || supplierData.length === 0) {
      return {
        title: { text: '暂无供货商数据', left: 'center', top: 'center' }
      };
    }
    
    // 获取供货商名称和采购总额
    const names = supplierData.map(item => item.name || item.supplierName || '未知供货商');
    const amounts = supplierData.map(item => parseFloat(item.totalAmount || item.supplierTotalAmount) || 0);
    
    return {
      tooltip: {
        show: false
      },
      grid: {
        left: '2%',
        right: '2%',
        bottom: '0',
        top: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: names,
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 12,
          rotate: 45,
          formatter: function(value, index) {
            const amount = amounts[index];
            return value + '\n' + amount + '元';
          },
          lineHeight: 16
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        name: '金额(元)',
        position: 'right',
        nameTextStyle: {
          color: '#666',
          fontSize: 12
        },
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 12
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#f0f0f0',
            type: 'dashed'
          }
        }
      },
      series: [
        {
          name: '采购总额',
          type: 'bar',
          data: amounts,
          itemStyle: {
            color: '#ffa726',
            borderRadius: [4, 4, 0, 0]
          },
          emphasis: {
            itemStyle: {
              color: '#ff9800'
            }
          },
          barWidth: amounts.length === 1 ? '30%' : (amounts.length <= 3 ? '50%' : '60%')

        }
      ]
    };
  },

  toDatePageSearch() {
    this.setData({
      update: true,
    })
    wx.navigateTo({
      url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType,
    })
  },

  showSearch() {
    this.setData({
      showSearch: true,
    })
  },

  searchData(e) {
    this.setData({
      showSearch: false,
      type: e.currentTarget.dataset.type,
      typeString: e.currentTarget.dataset.string,
      currentPage: 1,
      dailyChartDrawn: false
    });
    this._getInitData();
  },

  // 获取初始数据
  _getInitData() {
    this.setData({
      dailyChartDrawn: false
    });
    this._getSupplierStatistics();
  },


  toGoodsPage(e){

    var id = e.currentTarget.dataset.id;
    wx.setStorageSync('disGoods', e.currentTarget.dataset.goods);

    wx.navigateTo({
      url: '/subPackage-goods/pages/goods/goodsFenxiPurchase/goodsFenxiPurchase?disGoodsId=' + id ,
    })

  },

  // 切换商品列表展开/收起
  toggleGoodsList() {
    this.setData({
      showAllGoods: !this.data.showAllGoods
    });
  },

  // 切换采购金额商品列表展开/收起
  toggleSubtotalGoodsList() {
    this.setData({
      showAllSubtotalGoods: !this.data.showAllSubtotalGoods
    });
  },  



  toPurchaser(){
    wx.navigateTo({
      url: '/subPackage-mendian/pages/management/staff/staff',
    })
  },

  toSupplier(){
    wx.navigateTo({
      url: '/subPackage-supplier/pages/supplier/index/index',
    })
  },

  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },
  
})
