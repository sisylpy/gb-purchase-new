const globalData = getApp().globalData;
var app = getApp()
var load = require('../../../../lib/load.js');

import apiUrl from '../../../../config/index.js'

import {
  disGetPayListDetail
} from '../../../../services/apiDistributerPay'


let itemWidth = 0;
let windowWidth = 0;
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
    totalPage: 0,
    totalCount: 0,
    limit: 10,
    currentPage: 1,
    sliderOffset: 0,
    sliderOffsets: [],
    sliderLeft: 0,
    tabs: [
      
      {
        name: "订货",
      },{
        name: "语音",
      },{
        name: "商品",
      },
    ],
    currentTab: 0,
      selIndex: 0,
    

    

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

    var disInfoValue = wx.getStorageSync('disInfo');
    if (disInfoValue) {
      this.setData({
        disInfo: disInfoValue,
        disId: disInfoValue.gbDistributerId,
        
      })
    }

  
    this.setData({
      rpxR: globalData.rpxR,
      url: apiUrl.server,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
    
    })

    // this._initData();
    // this.clueOffset();
  
  },


  _initData(){
   
   load.showLoading("获取数据中");
   var data = {
    limit: this.data.limit,
    page: this.data.currentPage,
    disId: this.data.disId,
    type: this.data.currentTab,
   }
   disGetPayListDetail(data).then(res =>{
      load.hideLoading();
      if(res.result.code ==0){
        this.setData({
          payDetailArr: res.result.page.list,
          currentPage: this.data.currentPage + 1,
          totalPage: res.result.page.totalPage,
          totalCount: res.result.page.totalCount, 
          isLoading: false,
        })
      
      }
    })
  },


  /**
   * 计算偏移量
   */
  clueOffset() {
  
    itemWidth = Math.ceil(this.data.windowWidth / this.data.tabs.length);
    let tempArr = [];
    for (let i in this.data.tabs) {
      tempArr.push(itemWidth * i);
    }
    // tab 样式初始化
    this.setData({
      sliderOffsets: tempArr,
      sliderLeft: (this.data.windowWidth / 8),
    });

  },

  /**
   * tabItme点击
   */
  onTab1Click(event) {

    this.setData({
      currentTab: event.currentTarget.dataset.current,
      selIndex: 0,
      totalPage: 0,
       totalCount: 0,
      currentPage: 1,
    })

    // this._initData();
    // this.clueOffset();
   
  },

  bindChange: function (e) {
   this.setData({
     currentTab: e.detail.current,
     selIndex: 0,
     totalPage: 0,
      totalCount: 0,
     currentPage: 1,
   })

   this._initData()
 
},


  onScrollToLower: function () {
    var that  = this;
    // 防止重复请求
    if (this.data.isLoading || this.data.payDetailArr.length >= this.data.totalCount) return;

    this.setData({
      isLoading: true
    });

    const {
      currentPage,
      totalPage,
      disId,
      currentTab,
      limit
    } = this.data;

    // 确保非搜索模式，并且当前页数未超过总页数
    if ( currentPage <= totalPage) {
      const data = {
        limit: limit,
        page: currentPage,
        disId: disId,
        type: currentTab,
      };
      load.showLoading("获取数据中");
      disGetPayListDetail(data)
        .then((res) => {
          load.hideLoading();
          if (res.result.code == 0) {
            const newItems = res.result.page.list || [];
            const updatedGoodsList = [...this.data.payDetailArr, ...newItems];

            // 更新当前页和商品列表
            this.setData({
              payDetailArr: updatedGoodsList,
              currentPage: currentPage + 1,
              totalPage: res.result.page.totalPage,
              totalCount: res.result.page.totalCount,
              isLoading: false,
            });
           

            // 如果已达到 totalCount，停止加载
            if (updatedGoodsList.length >= this.data.totalCount) {
              this.setData({
                isLoading: false
              });
            }
            
          } else {
            wx.showToast({
              title: '获取商品失败',
              icon: 'none'
            });
            this.setData({
              isLoading: false
            });
          }
        })
        .catch((err) => {
          wx.showToast({
            title: '加载错误，请稍后再试',
            icon: 'none'
          });
          this.setData({
            isLoading: false
          });
        });
    } else {
      this.setData({
        isLoading: false
      });
    }
  },




  toBack(){
    wx.navigateBack({
      delta: 1
    })
  },


})