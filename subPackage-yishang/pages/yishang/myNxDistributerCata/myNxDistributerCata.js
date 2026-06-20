
const globalData = getApp().globalData;
var load = require('../../../../lib/load.js');

import {
  getNxDistributerFatherGoodsPeisong,
 
} from '../../../../lib/apiDistributerGb'




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
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      nxDisId: options.nxDisId,
      nxDistributerName: options.name,
      toDepId: options.toDepId,
      customerArr: [],
      gbDisId: options.gbDisId
    })
    
     
   
    this._initData();
  },




_initData(){
    load.showLoading("获取配送商品")
    var data = {
      nxDisId: this.data.nxDisId,
      depId: this.data.toDepId
    }
    getNxDistributerFatherGoodsPeisong(data).then(res => {
      console.log(res.result.data)
      if (res.result.code == 0) {
        load.hideLoading();
        this.setData({
          fatherArr: res.result.data

        })

     
      }else{
        load.hideLoading();  
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
        this.setData({
          applyArr: []
        })
      }
    })
  },
 

  

  toMyNxGoods(e) {
    wx.navigateTo({
      url: '../toDepartmentGoodsList/toDepartmentGoodsList?id=' + e.currentTarget.dataset.id +
        '&name=' + e.currentTarget.dataset.name + '&toDepId=' + this.data.toDepId 
        +'&goodsType=-1'  + '&nxDisId=' + this.data.nxDisId,
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
          tempArr.push(itemWidth * i);
        }
        // tab 样式初始化
        windowWidth = res.windowWidth;
        that.setData({
          sliderOffsets: tempArr,
          sliderOffset: 0,
          sliderLeft: 0,
          windowWidth: globalData.windowWidth * globalData.rpxR,
          windowHeight: globalData.windowHeight * globalData.rpxR,
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
      showOperation: false
    })
  },

  /**
   * swiper-item 的位置发生改变
   */
  swiperTran(event) {
    let dx = event.detail.dx;
    let index = event.currentTarget.dataset.index;
    if (dx > 0) { //----->
      if (index < this.data.tabs.length - 1) { //最后一页不能---->
        let ratio = dx / windowWidth; /*滑动比例*/
        let newOffset = ratio * itemWidth + this.data.sliderOffsets[index];
        this.setData({
          sliderOffset: newOffset,
        })
      }
    } else { //<-----------
      if (index > 0) { //最后一页不能<----
        let ratio = dx / windowWidth; /*滑动比例*/
        let newOffset = ratio * itemWidth + this.data.sliderOffsets[index];
        this.setData({
          sliderOffset: newOffset,
        })
      }
    }
  },

  /**
   * 动画结束时会触发 animationfinish 事件
   */
  animationfinish(event) {
    this.setData({
      sliderOffset: this.data.sliderOffsets[event.detail.current],
      tab1Index: event.detail.current,
      itemIndex: event.detail.current,
    })
      if (this.data.tab1Index == 0) {
        this._initData();
      }
      if (this.data.tab1Index == 1) {
        this._disGetDeliveryBills();
      }
      if (this.data.tab1Index == 2) {
        this._disGetDepartmentBill(0);
      }
      if (this.data.tab1Index == 3) {
        this._disGetDepartmentBill(1);
      }
      if (this.data.tab1Index == 4) {
        this._getNxGoodsData();
      }
  },

  
  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  },

  

















})