
const globalData = getApp().globalData;

import apiUrl from '../../../../config/index.js'
import { getDepUsersByFatherIdGb } from '../../../services/mendian.js'
var load = require('../../../../lib/load.js');

let scrollDdirection = 0; // 用来计算滚动的方向
let windowWidth = 0;
let itemWidth = 0;

// import {
//   depGetDepFood,
//   depGetDepGoodsGb,
//   updateDepUserAdminGb,
//   deleteDepUser,
// } from '../../../../lib/apiDepOrder'


Page({

  /**
   * 页面的初始数据
   */
  data: {
    showChoice: false,
    sliderOffset: 0,
    sliderOffsets: [],
    sliderLeft: 0,
    tabs: ["门店商品",  "订货用户"],
    tab1Index: 0,
    itemIndex: 0,
    updateSettle: false,
    
    totalPage: 0,
    totalCount: 0,
    limit: 15,
    currentPage: 1,
    leftIndex: 0,
    isSearching: false,
    searchStr: "",
    rightIdDis: 'right0Dis',
    leftViewDis: 0,
    scrollLeftDis: 0,
    goodsType: "allGoods",
    controlString: -1,
    total: 0,
    depGoodsArr: [],


    selectedSub: 0, // 选中的分类
    scrollHeight: 0, // 滚动视图的高度
    toView: 'position0', // 滚动视图跳转的位置
    scrollTopLeft: 0,

    showGoodsModal: false,
    

  },

  onShow() {
  
    if(this.data.update){
      this._initData();
    }
    if(this.data.updateMyDate){
      var myDate = wx.getStorageSync('myDate');
      if(myDate){
        this.setData({
          startDate: myDate.startDate,
          stopDate: myDate.stopDate,
          dateType: myDate.dateType,
        })
      }
      this._initData();
    }
  

    
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {


   
      var depInfoValue = wx.getStorageSync('depItem');
      this.setData({
        depInfo: depInfoValue,
        depFatherId: depInfoValue.gbDepartmentId,
        depId: depInfoValue.gbDepartmentId,
      })
    

    var disInfo = wx.getStorageSync('disInfo');
    if(disInfo){
      this.setData({
        disInfo: disInfo,
      })
    }
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,     
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      url: apiUrl.server,
     
    })

    
    this._initData();
    this.clueOffset();

  },
  

  // /////
  _initData() {
    load.showLoading("获取常购商品");
    var that = this;
    depGetDepGoodsGb(this.data.depInfo.gbDepartmentId).then(res => {
      if (res.result.code == 0) {
        load.hideLoading();
        console.log("depgoods", res.result.data);
        if (res.result.data.arr.length > 0) {
          // 如果商品类目发生变化，需要重新计算偏移量
          let isCategoryChanged = !this.data.depGoodsArr.length || this.data.depGoodsArr[0].categoryId !== res.result.data[0].categoryId;
          if (isCategoryChanged) {
          
            this.setData({
              depGoodsArr: res.result.data.arr,
              scrollInfo: [] // 清空之前的滚动信息
            });
            // 重新计算偏移量
            that.lisenerScroll();
          } else {
            // 如果商品类目没有变化，直接更新数据
            this.setData({
              depGoodsArr: res.result.data.arr,
            });
          }
        } else {
          this.setData({
            depGoodsArr: []
          });
        }
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        });
      }
    });
  },

  /**
   * 获取右边每个分类的头部偏移量，并缓存
   */
  lisenerScroll() {
    // 检查是否已经计算过偏移量，如果计算过则跳过
    if (this.data.depGoodsArr.every(item => item.offsetTop !== undefined)) {
      return; // 如果偏移量已经计算过，直接返回
    }

    let query = wx.createSelectorQuery();
    // 批量查询
    this.data.depGoodsArr.forEach((_, i) => {
      query.select(`#position${i}`).boundingClientRect();
    });
    query.exec(res => {
      // 将偏移量缓存到每个商品项中
      this.data.depGoodsArr.forEach((item, index) => {
        item.offsetTop = res[index].top;
      });

      // 更新数据
      this.setData({
        depGoodsArr: this.data.depGoodsArr,
        scrollInfo: res // 保存计算后的偏移量
      });
    });
  },

  /**
   * 优化后的滚动事件处理，使用节流函数减少触发频率
   */
  scrollTo(e) {
    const scrollTop = e.detail.scrollTop; // 滚动的Y轴
    const {
      selectedSub,
      depGoodsArr
    } = this.data;
    let left_ = 0;

    // 节流：判断是否是上次滚动方向，减少频繁计算
    if (this.scrollDdirection === undefined) {
      this.scrollDdirection = scrollTop;
    }

    if (scrollTop > this.scrollDdirection) {
      // 向下滑动
      if (selectedSub < depGoodsArr.length - 1 && scrollTop >= depGoodsArr[selectedSub + 1].offsetTop) {
        if (selectedSub > 2) {
          left_ = (selectedSub - 2) * 50;
        }
        if (this.data.selectedSub !== selectedSub + 1) {
          this.setData({
            selectedSub: selectedSub + 1,
            scrollTopLeft: left_,
          });
        }
      }
    } else {
      // 向上滑动
      if (selectedSub > 0 && scrollTop < depGoodsArr[selectedSub - 1].offsetTop && scrollTop > 0) {
        if (selectedSub > 3) {
          left_ = (selectedSub - 4) * 50;
        }
        if (this.data.selectedSub !== selectedSub - 1) {
          this.setData({
            selectedSub: selectedSub - 1,
            scrollTopLeft: left_,
          });
        }
      }
    }

    // 更新 scrollDdirection
    this.scrollDdirection = scrollTop;
  },

  // 节流函数，控制滚动事件的触发频率
  throttle(func, wait) {
    let timeout;
    return function (...args) {
      if (!timeout) {
        timeout = setTimeout(() => {
          func.apply(this, args);
          timeout = null;
        }, wait);
      }
    };
  },




  leftMenuClick(e) {
    this.setData({
      selectedSub: e.currentTarget.dataset.index,
      positionId: 'position' + e.currentTarget.dataset.index,

    })
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

  
  _getDepFood(){
    var data = {
      depFatherId : this.data.depFatherId,
      depId: -1
    }
    depGetDepFood(data).then(res =>{
      if(res.result.code == 0){
        console.log(res);
        this.setData({
          foodArr: res.result.data,
        })
      }
    })
  },

  _getDepGoodsCata(){
    
    depGetDepGoodsCataGb(this.data.depFatherId).then(res =>{
      if (res.result.code == 0) {
        this.setData({
          fatherArr: res.result.data.arr,
          stockTotal: res.result.data.stockTotal,
        })
        this.init_echarts(); //初始化图表

        //创建节点选择器
        var that = this;
        var query = wx.createSelectorQuery();
        //选择id
        query.select('#jicaiGoods').boundingClientRect()
        query.exec(function (res) {
          that.setData({
            maskHeight: res[0].height * globalData.rpxR
          })
        })
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
        this.setData({
          depGoodsArr: []
        })
      }
    })
  },

  

  _getAllData() {
    var temp = [];
    var arr = this.data.fatherArr;
    for (var i = 0; i < arr.length; i++) {
    for (var j = 0; j < arr[i].fatherGoodsEntities.length; j++) {
      var value = arr[i].fatherGoodsEntities[j].fatherStockTotalString;
      var name = arr[i].fatherGoodsEntities[j].gbDfgFatherGoodsName
      var kucun = {
        value: value,
        name: name + " " + value + "元",
      };
      temp.push(kucun);
    }
    }
    this.setData({
      temp: temp
    })
    return temp;
  },





  //初始化图表
  init_echarts: function () {
    this.echartsComponnet = this.selectComponent('#mychart');
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


  getOptionTotal() {
    var option = {
      legend: {
        show: true,
        orient: 'vertical',
        right: 'right',
        // top: '5%',
      },
      series: [{
        type: 'pie',
        radius: ['50%', '70%'],
        top: '5%',
        right: '50%',
        clickable: false,
        avoidLabelOverlap: true,
        data: this._getAllData(this.data.totalArr),
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



  // // 1 swiper 
  // _getToDepartmentGoodsFather() {
  //   var data = {
  //     goodsType: this.data.goodsType,
  //     toDepId: this.data.depFatherId,
  //     disId: this.data.disId,
  //   }
  //   getToDepartmentFatherGoods(data)
  //     .then(res => {
  //       if (res.result.code == 0) {
  //         if (res.result.code == 0) {
  //           this.setData({
  //             fatherArr: res.result.data
  //           })
  //           //创建节点选择器
  //           var that = this;
  //           var query = wx.createSelectorQuery();
  //           //选择id
  //           query.select('#jicaiGoods').boundingClientRect()
  //           query.exec(function (res) {
  //             that.setData({
  //               maskHeight: res[0].height * globalData.rpxR
  //             })
  //           })
  //         } else {
  //           wx.showToast({
  //             title: res.result.msg,
  //             icon: 'none'
  //           })
  //           this.setData({
  //             depGoodsArr: []
  //           })
  //         }
  //       }
  //     })
  // },


  openOperation(e) {  
    this.setData({
      showOperation: true,
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

  toDepartmentGoods(e) {

    wx.navigateTo({
      url: '../mendianGoodsList/mendianGoodsList?id=' + e.currentTarget.dataset.id +
          '&depName=' + this.data.depInfo.gbDepartmentAttrName + '&depFatherId=' + this.data.depFatherId
          +'&goodsType=' + this.data.goodsType + '&nxDisId=-1',
    })

   
  },




  openDeliveryDetailNew(e){
    wx.navigateTo({
      url: '/subPackage-mendian/pages/data/issuePage/issuePage?billId=' + e.currentTarget.dataset.id
       +'&depFatherId=' + e.currentTarget.dataset.depid,
    })

  },




  /**
   * 计算偏移量
   */
  clueOffset() {
    var that = this;
    wx.getSystemInfo({
      success: function (res) {
        itemWidth = Math.ceil(res.windowWidth / that.data.tabs.length);
        let tempArr = [];
        for (let i in that.data.tabs) {
          console.log(i)
          tempArr.push(itemWidth * i);
        }
        // tab 样式初始化
        windowWidth = res.windowWidth;
        that.setData({
          sliderLeft: (res.windowWidth / that.data.tabs.length - 50) / 2,
          sliderOffsets: tempArr,
          sliderOffset: 0,
          sliderLeft: res.windowWidth / 6,
        });
      }
    });
  },

  /**
   * tabItme点击
   */
  onTab1Click(event) {
    let index = event.currentTarget.dataset.index;
    this.setData({
      sliderOffset: this.data.sliderOffsets[index],
      tab1Index: index,
      itemIndex: index,

    })
  },


  /**
   * 动画结束时会触发 animationfinish 事件
   */
  animationfinish(event) {
    this.setData({
      sliderOffset: this.data.sliderOffsets[event.detail.current],
      tab1Index: event.detail.current,
      goodsType: 'toDepartment',
    })

    if (this.data.tab1Index == 0) {
      this._initData();
    }
   
    if (this.data.tab1Index == 1) {
      this._getGroupUsers();

    }
    
  },

  _getGroupUsers() {
    load.showLoading("获取订货组用户")
    getDepUsersByFatherIdGb(this.data.depFatherId).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        this.setData({
          userArr: res.result.data,
        })
          //创建节点选择器
          var that = this;
          var query = wx.createSelectorQuery();
          //选择id
          query.select('#jicaiUser').boundingClientRect()
          query.exec(function (res) {
            that.setData({
              maskHeight: res[0].height * globalData.rpxR
            })
          })
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
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


  /**
   * 
   * @param {*} e 
   */
  onPageScroll: function (e) { // 页面滚动监听
    console.log(e)
    this.setData({
      scrollViewTop: e.scrollTop,
    })

  },


  openOperationUser(e) {
    this.setData({
      showOperationUser: true,
      delUserId: e.currentTarget.dataset.id,
    })
  },

  delUser(e) {
    deleteDepUser(this.data.delUserId)
      .then(res => {
        if (res.result.code == 0) {
          this.setData({
            delUserId: "",
            showOperationUser: false
          })
          this._getGroupUsers();
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
      })

  },

  hideUserMask() {
    this.setData({
      showOperationUser: false
    })
  },

  toBack() {
    wx.navigateBack({
      delta: 1,
    })
    wx.removeStorageSync('selDepList');;
    wx.removeStorageSync('depItem');

  },




/**
   * 关闭操作面板
   */
  hideMask() {

    this.setData({
      showOperation: false,
    })
    this.hideModal();
  },



  toOpenOrder(e) {
    console.log('depId=' + this.data.depFatherId + '&disId=' + this.data.disId + '&subAmount=' + this.data.depInfo.gbDepartmentSubAmount + '&depName=' + this.data.depInfo.gbDepartmentAttrName +'&disName=' + this.data.disInfo.gbDistributerName )
    wx.navigateToMiniProgram({
      appId: "wx1ea78d3f33234284",
      path: '/pages/inviteAndOrder/inviteAndOrder?depId=' + this.data.depFatherId + '&disId=' + this.data.disId + '&subAmount=' + this.data.depInfo.gbDepartmentSubAmount + '&depName=' + this.data.depInfo.gbDepartmentAttrName +'&disName=' + this.data.disInfo.gbDistributerName ,
      envVersion: 'release', //release develop trial
      success(res) {
        // that.setData({
        //   toOpenMini: false
        // })
      }
    })
  
  },


changeService(e){
  console.log(e);
  var index = e.currentTarget.dataset.index;
  var item  = this.data.userArr[index];
 var itemData = "userArr["+ index +"].gbDuCustomerService";
  if(item.gbDuCustomerService == 0){
    this.setData({
      [itemData]: 1
    })
  }else{
    this.setData({
      [itemData]: 0
    })
  }

  this._updateDepUserInfo(index);

},

_updateDepUserInfo(index){
  var item = this.data.userArr[index];
   console.log(item);
  updateDepUserAdminGb(item).then(res =>{
    if(res.result.code == 0){
      this._getGroupUsers()
    }
  })

},


delSearch(){
  this.setData({
    issueDepId: -1,
    nxDisId: -1,
    searchDepName : "",
   
  })
  this._initData();

},

toFilter() {
  wx.navigateTo({
    url: '../../sel/filterDeliveryDepartment/filterDeliveryDepartment?issueDepId='
     + this.data.issueDepId + '&nxDisId=' + this.data.nxDisId,
  })
},


searchBillGoods(){
  wx.navigateTo({
    url: '../billGoodsSearch/billGoodsSearch?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&depId=' + this.data.depId + '&disId=' ,
  })
},





})