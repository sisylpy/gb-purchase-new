var load = require('../../../lib/load.js');
const globalData = getApp().globalData;
var config = require('../../../config/index.js');
var goodsApi = require('../../services/api.js');

let itemWidth = 0;
const viewBarHeight = 70;

Page({
  onShow(){
    if(this.data.update){
      this._searchGoods();
    }
  },

  data: {
    disArr: [],
    strArr:[],
    nxArr: [],
  },

  onLoad(options) {
    var barHeight = 90;
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      viewBarHeight: barHeight * globalData.rpxR,
      url: config.server,
    })
   
    var value = wx.getStorageSync('disInfo');
    if (value) {
      this.setData({
        disId: value.gbDistributerId,
        disInfo: value
      })
     
    } 
 
  },



  isInputing(e) {
    if (e.detail.value.length == 0) {
      this.setData({
        nxArr: [],
        strArr: [],
      })
    }
  },

  beginSearch() {
    this.setData({
      isSearching: true,
    })

  },

  stopSearch() {
    this.setData({
      isSearching: false,
      searchStr: "",
      strArr: [],
      nxArr: [],
    })
  },

  getSearchString(e) {
    if (e.detail.value.length > 0) {
      this.setData({
        searchStr: e.detail.value
      })
      this._searchGoods();

    } else {
      this.setData({
        strArr: [],
        nxArr: [],
      })
    }

  },

  _searchGoods() {
    var data = {
      disId: this.data.disId,
      searchStr: this.data.searchStr
    }
    load.showLoading("商品搜索中")
    goodsApi.queryDisGoodsByQuickSearchGb(data).then(res => {
      load.hideLoading();
      console.log(res.result.data);
      if (res.result.code == 0) {
        this.setData({
          disArr: res.result.data,
        })

      }
    })

  },

  toDetail(e) {
  
    wx.navigateTo({
      url: '../disGoodsPage/disGoodsPage?disGoodsId=' + e.currentTarget.dataset.id + '&goodsName=' + e.currentTarget.dataset.name + '&color=' + e.currentTarget.dataset.color  +'&from=search',
    })

  },



  toBusiness(e) {
    var id = e.currentTarget.dataset.id;
    wx.setStorageSync('disGoods', e.currentTarget.dataset.goods);
    wx.navigateTo({
      url: '../goodsOrderList/goodsOrderList?disGoodsId=' + id +'&type=1',
    })
    // 
  },
  toFenxi(e) {
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '../goodsFenxi/goodsFenxi?id=' + id,
    })
  },

  toGoods(e){
    wx.setStorageSync('disGoods', e.currentTarget.dataset.goods);
    console.log("goods",e)
    wx.navigateTo({
      url: '../disGoodsPage/disGoodsPage?disGoodsId=' + e.currentTarget.dataset.id,
    })
  },



  toOrderList(e) {
    var id = e.currentTarget.dataset.id;
    wx.setStorageSync('disGoods', e.currentTarget.dataset.goods);
    wx.navigateTo({
      url: '../goodsOrderList/goodsOrderList?disGoodsId=' + id +'&type=1',
    })
    // 
  },
  
  toStock(e){
    wx.setStorageSync('disGoods', e.currentTarget.dataset.item);
   wx.navigateTo({
     url: '../stockGoodsList/stockGoodsList?disGoodsId=' + e.currentTarget.dataset.id,
   })

 },

  toBack() {
   wx.navigateBack({delta: 1});
  }
});
