const globalData = getApp().globalData;
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil');
import * as echarts from '../../../../../subPackage-charts/ec-canvas/echarts';

import apiUrl from '../../../../config.js';
let windowWidth = 0;
let itemWidth = 0;

var monthlyData = [];
var listValue = "";

// import {
//   disGetJrdhBills,
// } from '../../../../lib/apiDepOrder.js'

Page({


  onShow() {
    
    console.log("Athisdadfdddfafais", this.data.isFirstLoadCost);
    if(this.data.isFirstLoadCost){
      console.log("isfifiifiifiifiififiififiiffiif")
      var disInfo = wx.getStorageSync('disInfo');
      console.log(disInfo);
      if(disInfo){
        this.setData({
          disInfo: disInfo,
          disId: disInfo.gbDistributerId
        })
      }
      // var chukuArr = [];
      // var ids = "";
      // var kufang = disInfo.stockDepartmentList;
      // var chuku = disInfo.kitchenDepartmentList;
      // if(kufang.length > 0){
      //   for(var i = 0 ; i < kufang.length; i++){
      //     ids = kufang[i].gbDepartmentId + "," + ids ;
      //     chukuArr.push(kufang[i]);
      //   }
      //   wx.setStorageSync('selStockDepList', disInfo.stockDepartmentList)
      // }
      // if(chuku.length > 0){
      //   for(var i = 0 ; i < chuku.length; i++){
      //     ids = chuku[i].gbDepartmentId + "," + ids ;
      //     chukuArr.push(chuku[i]);
      //   }
      //   wx.setStorageSync('selKitchenDepList', disInfo.kitchenDepartmentList)
      // }
      // this.setData({
      //   searchDepIds: ids,
      // })
      
      this._initCostCataData();
    }else{
      this._getSearchDepIds();
      if(this.data.update){
        this._initCostCataData();
      }
    }
  
     
  
    
  },


  data: {
    
    ec: {
      lazyLoad: true // 延迟加载
    },
    isFirstLoadCost: true,
    itemIndexDep: 0,
    tab1IndexDep: 0,
    searchDepId: -1,
    searchDepIds: -1,
    searchDepList: [],
    leftWidthDep: 0,
    update:false,
    dateType: 'month',
      startDate: dateUtils.getFirstDateInMonth(),
      stopDate: dateUtils.getArriveDate(0),

  },

  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      
    });

  },



  _getSearchDepIds() {
    console.log("_getSearchDepIds_getSearchDepIds");
    var allArr = [];
    var searchDeps = wx.getStorageSync('selMendianDepList');
    if (searchDeps) {
      allArr = allArr.concat(searchDeps);
    }
    var searchStockDeps = wx.getStorageSync('selStockDepList');
    console.log("stockckkckckkcckkckckckkckckckckckckckckkc")
    if (searchStockDeps) {
      allArr = allArr.concat(searchStockDeps);
      console.log("sellarrrrrrrrr", allArr);
    }

    var selDepKitchenList = wx.getStorageSync('selKitchenDepList');
    if (selDepKitchenList) {
      allArr = allArr.concat(selDepKitchenList);
    }

    if (allArr.length > 0) {
      console.log("thisdldeldpdpdplisthisdldeldpdpdplis", allArr);
      var ids = "";
      for (var j = 0; j < allArr.length; j++) {
        var id = allArr[j].gbDepartmentId;
        ids = id + "," + ids;
      }
      let trimmedStr = ids.slice(0, -1);
      let arr = trimmedStr.split(",");
      // 颠倒数组顺序
      arr.reverse();
      let reversedStr = arr.join(",");

      var oldSearchDepIds = this.data.searchDepIds;
      if (oldSearchDepIds == reversedStr) {
        this.setData({
          update: false
        })
      } else {
        this.setData({
          update: true,
          tab1IndexDep: 0,
          itemIndexDep: 0,
          leftWidthDep: 0,
          searchDepId: -1,
        })
      }
      this.setData({
        searchDepList: allArr,
        searchDepIds: reversedStr,
      })
    } else {
      var oldSearchDepIds = this.data.searchDepIds;
      if(oldSearchDepIds !== -1){
        this.setData({
          update: true,
          searchDepId: -1
        })
      }else{
        this.setData({
          update: false
        })
      }
      this.setData({
        searchDepList: [],
        searchDepIds: -1,
        searchDepId: -1
      })
     
    }

  },


  onTab1ClickDep(event) {
    console.log("costcosotsto", event)
    let index = event.currentTarget.dataset.index;
    this.setData({
      tab1IndexDep: index,
      itemIndexDep: index,
    })
    if (index > 0) {
      this.setData({
        searchDepId: event.currentTarget.dataset.item.gbDepartmentId,
      })
    }else{
      this.setData({
        searchDepId: -1
      })
    }
    const depId = event.currentTarget.dataset.id === "-1" ? "dep_fixed" : `dep_${event.currentTarget.dataset.id}`;
    console.log("idididiidididii", depId);
    this.scrollToCenter(depId);
    this._initCostCataData();
  },

  scrollToCenter(depId) {
    setTimeout(() => {
      const query = wx.createSelectorQuery();

      // 查询点击的元素和 scroll-view 容器的尺寸
      query.select(`#${depId}`).boundingClientRect();
      query.select('.nav_dep').boundingClientRect();
      query.select('.nav_dep').scrollOffset();
      query.exec((res) => {
        console.log("zahuishsisshisisisiisi", res)
        if (res[0] && res[1] && res[2]) {
          const item = res[0]; // 目标元素
          const container = res[1]; // scroll-view 容器
          const scrollOffset = res[2].scrollLeft; // 当前的 scrollLeft 值

          // 计算目标 scrollLeft，确保目标元素居中
          let scrollLeft = item.left + scrollOffset - (container.width / 2) + (item.width / 2);

          // 确保 scrollLeft 不超过最大值或小于 0
          const maxScrollLeft = container.scrollWidth - container.width;
          if (scrollLeft > maxScrollLeft) {
            scrollLeft = maxScrollLeft;
          }
          if (scrollLeft < 0) {
            scrollLeft = 0;
          }

          // 设置 scrollLeft
          this.setData({
            leftWidthDep: scrollLeft
          });
          console.log("diidnsxbegbuemsrlllll", this.data.tab1IndexDep, "lefc", this.data.leftWidthDep)
        } else {
          console.error(`元素不存在或未渲染: #${depId}`);
        }
      });
    }, 100); // 延时 100ms 执行查询，确保渲染完成
  },


  animationfinishDep(event) {
    console.log("amddddep")
    this.setData({
      // sliderOffset: this.data.sliderOffsets[event.detail.current],
      tab1IndexDep: event.detail.current,
      itemIndexDep: event.detail.current,
     
    })

    console.log("thisdkadiifiaidftiememinss=====", this.data.itemIndexDep)
    if (event.detail.current > 0) {
      this.setData({
        searchDepId: this.data.searchDepList[event.detail.current - 1].gbDepartmentId,
      })
    }else{
      this.setData({
        searchDepId: -1
      })
    }

    var depId = "";
    if(this.data.tab1IndexDep == 0){
    depId = "dep_fixed";
    }else{
      depId = "dep_" + this.data.searchDepId;
    }

    console.log("idididiidididii", depId);
    this.scrollToCenter(depId);

    this._initCostCataData();

  },



    _initCostCataData() {
      var that = this;
      var data = {
        startDate: this.data.startDate,
        stopDate: this.data.stopDate,
        disId: this.data.disId,
        searchDepIds: this.data.searchDepIds,
        searchDepId: this.data.searchDepId,
      }
      console.log("daadsididiididiididi", data);
      load.showLoading("获取数据")
      disGetJrdhBills(data).then(res => {
        console.log(res.result.data);
        if (res.result.data.code == 0) {
          load.hideLoading();
        
          this.setData({
            outArr: res.result.data.arr,
            total: res.result.data.total,
            resultDepList: res.result.data.depArr,
          })
          if (res.result.data.total !== "0.0") {
            that.init_echarts_total()
          }

        } else {
          console.log("-1--1--1-1--1--1-1--1-1--1-1-1")
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
          this.setData({
            outArr: [],
            total: res.result.data.total,
            resultDepList: res.result.data.depArr,
          })
        }
      })
    },


    //初始化图表
    init_echarts_total: function () {
      this.echartsComponnet = this.selectComponent('#mychartJrdh');
      this.echartsComponnet.init((canvas, width, height) => {
        // 初始化图表
        const Chart = echarts.init(canvas, null, {
          width: width,
          height: height,
          devicePixelRatio: globalData.rpxR
        });
        Chart.setOption(this.getOptionTotal());
        // 注意这里一定要返回 chart 实例，否则会影响事件处理等
        return Chart;
      });
    },


    _getAllData(arr) {
      var temp = [];
      for (var j = 0; j < arr.length; j++) {
        var value = arr[j].fatherStockTotalString;
        var percent = arr[j].fatherStockTotalPercent;
        var name = arr[j].gbDfgFatherGoodsName
        var kucun = {
          value: value,
          name: name + '\n' +
            +value + "元 " + percent + "%",
        };
        temp.push(kucun);
      }

      this.setData({
        temp: temp
      })
      return temp;
    },

    getOptionTotal() {
      var option = {
        legend: {
          type: 'scroll',
          show: true,
          orient: 'vertical',
          right: 'right',
          top: '10%',
          textStyle: {
            fontWeight: 500,
            fontSize: 14 //文字的字体大小
          },
        },
        series: [{
          type: 'pie',
          radius: ['40%', '70%'],
          color: this._getAllDataColor(this.data.outArr),
          top: '10%',
          right: '50%',
          clickable: false,
          avoidLabelOverlap: true,
          data: this._getAllData(this.data.outArr),

          label: {
            show: false,
            position: 'outline',
            alignTo: 'labelLine',
            bleedMargin: '10%'
          },
          // emphasis: {
          //   itemStyle: {
          //     shadowBlur: 10,
          //     shadowOffsetX: 0,
          //     shadowColor: 'rgba(0, 0, 0, 0.5)'
          //   }
          // },
        }]
      };
      return option;

    },

    _getAllDataColor(arr) {
      var temp = [];
      for (var j = 0; j < arr.length; j++) {
        var value = arr[j].gbDfgFatherGoodsColor;
        temp.push(value);
      }
      return temp;
    },

    
    toDatePage() {
      this.setData({
        update: true,
      })
      wx.navigateTo({
        url: '../../sel/date/date?startDate=' + this.data.startDate +
          '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType,
      })
    },


    toFilter() {
      this.setData({
        isFirstLoadCost: false
      })
      wx.navigateTo({
        url: '../../../../pages/sel/filterStockDepartment/filterStockDepartment',
      })
    },


     toGoods(e){
      this.setData({
        isFirstLoadCost: false
      })
       wx.navigateTo({
         url: '../jrdhGoodsList/jrdhGoodsList?fatherId=' + e.currentTarget.dataset.id
         +'&startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + 
         '&searchDepIds=' + this.data.searchDepIds + '&searchDepName=' + this.data.searchDepName
         +'&total=' + e.currentTarget.dataset.total + '&fatherName=' + e.currentTarget.dataset.name,
       })
     },

     toBack(){
      wx.navigateBack({delta: 1})
     },

     onUnload(){
      wx.removeStorageSync('selStockDepList');
      wx.removeStorageSync('selKitchenDepList');
    },



})