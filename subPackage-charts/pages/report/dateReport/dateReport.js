var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
var chartsApi = require('../../../services/api.js');

let windowWidth = 0;
let itemWidth = 0;

Page({



  onShow: function () {

    // 推荐直接用新API
    let windowInfo = wx.getWindowInfo();
    let globalData = getApp().globalData;
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
    });


  },


  /**
   * 页面的初始数据
   */
  data: {
    tabs: [
      "日期",
      "星期",
      "月份",
      "自定义"
    ],


    sliderOffset: 0,
    sliderOffsets: [],
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      startDate: options.startDate,
      stopDate: options.stopDate,
      dateType: options.dateType,
      userId: options.userId,
      type: options.type,

    })
    var datetype = this.data.dateType;
    if (datetype != null) {

      if (datetype == 'day') {
        this.setData({
          tab1Index: 0,
          itemIndex: 0,
        })
      }
      if (datetype == 'week') {
        this.setData({
          tab1Index: 1,
          itemIndex: 1,
        })
      }
      if (datetype == 'month') {
        this.setData({
          tab1Index: 2,
          itemIndex: 2,
        })
      }
    } if (datetype == 'customer')  {
      this.setData({
        tab1Index: 3,
        itemIndex: 3,

      })
    }



    this._initData();
    this.clueOffset();

  },

  _initData() {
    chartsApi.getDate().then(res => {
      if (res.result.code == 0) {
        console.log(res.result.data)
        this.setData({
          dayMap: res.result.data.day,
          weekMap: res.result.data.week,
          monthArr: res.result.data.month,
        })
      }
    })
  },

  selectDay(e) {
     // 获取选择的日期类型和名称
     var dateType = e.currentTarget.dataset.type;
     var dateName = e.currentTarget.dataset.name || '';
     var hanzi = e.currentTarget.dataset.hanzi || '';
     
     var startDate, stopDate;
     
     // 如果是 lastThirtyDays，使用客户端计算
     if (dateName === 'lastThirtyDays') {
       var dateUtils = require('../../../../lib/dateUtil');
       var dateRange = dateUtils.getDateRange('lastThirtyDays');
       startDate = dateRange.startDate;
       stopDate = dateRange.stopDate;
       console.log('使用客户端计算的 lastThirtyDays:', startDate, '到', stopDate);
     } else {
       // 其他情况使用服务器数据
       startDate = e.currentTarget.dataset.startdate;
       stopDate = e.currentTarget.dataset.stopdate;
     }
    
   
    this.setData({
      dateType: e.currentTarget.dataset.type,
      startDate: e.currentTarget.dataset.startdate,
      stopDate: e.currentTarget.dataset.stopdate,
      hanzi: hanzi
    })
    if(this.data.type == 'cost' || this.data.type == 'business'){
      console.log("subDepCost")
      wx.redirectTo({
        url: '../subDepCost/subDepCost?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate
        + '&type=' + this.data.type,
      })
    }else if(this.data.type == 'purchase'){
      wx.redirectTo({
        url: '../selSupplier/selSupplier?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate,
      })
    }
  
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
          tempArr.push(itemWidth * i);
        }
        // tab 样式初始化
        var index = that.data.tab1Index;
        windowWidth = res.windowWidth;
        that.setData({
          sliderOffsets: tempArr,
          sliderOffset: tempArr[index],
          sliderLeft: 0,

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
      inventoryType: index + 1,
    })

  },


  /**
   * 动画结束时会触发 animationfinish 事件
   */
  animationfinish(event) {
    console.log("findiis")
    this.setData({
      sliderOffset: this.data.sliderOffsets[event.detail.current],
      tab1Index: event.detail.current,
      itemIndex: event.detail.current,
    })
  },


  bindChange(e) {
    this.setData({
      startDate: e.detail.value
    })
  },

  bindChangeStop(e) {
    this.setData({
      stopDate: e.detail.value
    })
  },


  selectSelfDate() {
    console.log("自定义日期选择:", this.data.startDate, "到", this.data.stopDate);
    
    // 验证日期范围
    if (!this.data.startDate || !this.data.stopDate) {
      wx.showToast({
        title: '请选择开始和结束日期',
        icon: 'none'
      });
      return;
    }
    
    // 验证开始日期不能晚于结束日期
    var startDate = new Date(this.data.startDate);
    var stopDate = new Date(this.data.stopDate);
    
    if (startDate > stopDate) {
      wx.showToast({
        title: '开始日期不能晚于结束日期',
        icon: 'none'
      });
      return;
    }
    
   
    
    var myDate = {
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      dateType: "customer",
      name: "custom",
      hanzi: "自定义",
    }
 
    wx.setStorageSync('myDate', myDate)
    let pages = getCurrentPages();
    let prevPage = pages[pages.length - 2];
    prevPage.setData({
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      dateType: "customer",
      update: true,
    })
    if(this.data.type == 'cost' || this.data.type == 'business'){
      console.log("subDepCost")
      wx.redirectTo({
        url: '../subDepCost/subDepCost?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate
        + '&type=' + this.data.type,
      })
    }else if(this.data.type == 'purchase'){
      wx.redirectTo({
        url: '../selSupplier/selSupplier?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate,
      })
    }
  },




  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },

})