var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;

import {
  getToDepartmentGoodsList
} from '../../../../lib/apiDepOrder.js'


Page({

  onShow(){
    if(this.data.update){
      this._getInitData();
    }
  },

  /**
   * 页面的初始数据
   */
  data: {
    limit: 10,
    totalPage: 0,
    totalCount: 0,
    currentPage: 1,
    update: false    
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      id: options.id,
      toDepId: options.toDepId,
      fatherName: options.name,
      goodsType: options.goodsType,
      nxDisId: options.nxDisId
    })
   this._getInitData();

  },

  _getInitData(){
    var data = {
      fatherId: this.data.id,
      toDepId: this.data.toDepId,
      page: this.data.currentPage,
      limit: this.data.limit,
      goodsType: this.data.goodsType,
      nxDisId: this.data.nxDisId,
    }
    getToDepartmentGoodsList(data)
    .then(res =>{
      if(res.result.code == 0){
        console.log(res.result.page)
          this.setData({
            totalPage: res.result.page.totalPage,
            totalCount: res.result.page.totalCount,
            goodsList: res.result.page.list,
          })      
      }
    })

  },

  onReachBottom(){
    let {
      currentPage,
      totalPage,
      isLoading
    } = this.data


    if (currentPage >= totalPage || isLoading) {
      console.log("coming??")
      return
    }
    this.setData({
      isLoading: true
    })

    var data = {
     
      fatherId: this.data.id,
      toDepId: this.data.toDepId,
      page: this.data.currentPage + 1,
      limit: this.data.limit,
      goodsType: this.data.goodsType
    }
    getToDepartmentGoodsList(data)
    .then(res =>{
      if(res.result.code == 0){
        console.log(res.result.page)
         
        var goodsList = res.result.page.list;
         if(goodsList.length > 0){
          var currentPage = this.data.currentPage; // 获取当前页码
          currentPage += 1; // 加载当前页面的下一页数据
          var now = this.data.goodsList;
          var newdata = now.concat(goodsList)
          this.setData({
            goodsList: newdata,
            currentPage,
            isLoading: false,
            totalPage: res.result.page.totalPage,
            totalCount: res.result.page.totalCount,
          })

         }
         

          //创建节点选择器
          // var that = this;
          // var query = wx.createSelectorQuery();
          // //选择id
          // query.select('#mjltest').boundingClientRect()
          // query.exec(function (res) {
          //   that.setData({
          //     maskHeight: res[0].height * globalData.rpxR
          //   })
          // })


      }
    })
  },
  

  toPeisong(e){
    console.log("fadfsaf")
    console.log(e.currentTarget.dataset.item)
    wx.setStorageSync('disGoods', e.currentTarget.dataset.item);
        wx.navigateTo({
      url: '../peisongOrder/peisongOrder?gbDisId=' + this.data.gbDisId 
         +'&goodsId=' + e.currentTarget.dataset.id,
    })   

  },



  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  },

})