const app = getApp()
const globalData = app.globalData;
var load = require('../../../../lib/load.js');


import {
  saveGbFoodGoods,
  deleteGbFoodGoods,
  updateGbFoodGoods,
  queryDisGoodsByQuickSearchGb
} from '../../../services/apiDistributerGbFood'


Page({
  /**
   * 页面的初始数据
   */
  data: {
    canSave: false,
    pageTitle: '添加原料',
    pageType: 'add',
    modalType: 'add',
    amount: '',
    goodsName: '',
    standardName: '',
  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      pageTitle: options.type === 'edit' ? '修改原料' : '添加原料',
      pageType: options.type === 'edit' ? 'edit' : 'add',
    })

    var foodItem = wx.getStorageSync('Food');
    this.setData({
      foodItem: foodItem,
      foodId: foodItem.gbDistributerFoodId,
      dataUrl: foodItem.gbDistributerFoodImg
    })
    if (options.type == 'edit') {
      this.setData({
        rawArr: foodItem.gbdisFoodGoodsEntities
      })
    } else {
      this.setData({
        rawArr: [],
      })
    }


    var value = wx.getStorageSync('disInfo');
    if (value) {
      this.setData({
        disInfo: value,
        disId: value.gbDistributerId,
      })
    }
  },
  deleteGoods(e) {
    var idx = e.currentTarget.dataset.index;
    var row = this.data.rawArr[idx];
    var id = row.gbDistributerFoodGoodsId;
    if (!id) {
      var rawArr = this.data.rawArr.slice();
      rawArr.splice(idx, 1);
      this.setData({ rawArr: rawArr });
      return;
    }
   load.showLoading("删除原料")
    deleteGbFoodGoods(id).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        var rawArr = this.data.rawArr;
        rawArr.splice(rawArr.findIndex(item => item.gbDistributerFoodGoodsId === id), 1);
        this.setData({
          rawArr: rawArr
        })
      }
    })
  },

  editGoods(e) {
    this.setData({
      editGoods: e.currentTarget.dataset.item,
      modalType: 'edit',
      showFood: true,
      isSearching: false,
      strArr: [],
    })
  },

  toAddGoods(e) {
    this.setData({
      modalType: 'add',
      showFood: true,
      isSearching: false,
      strArr: [],
      goodsName: "",
      amount: "",
      standardName: "",
    })
  },

  cancle() {
    this.setData({
      showFood: false
    })
  },
  getApplyNumber(e) {
    if(this.data.modalType == 'edit'){
      var editGoodsData = "editGoods.gbDfgGoodsAmount";
      this.setData({
        [editGoodsData]: e.detail.value
      })
    }else{
      this.setData({
        amount: e.detail.value
      })
    }
  
  },


  // goods//////////
  getSearchString(e) {
    console.log(e.detail.value)
    this.setData({
      isSearching: true,
    })

    if (e.detail.value.length > 0) {
      var string = e.detail.value;
      string  = string.replace(/\s*/g,"");
      var data = {
        disId: this.data.disId,
        searchStr: string,
        depId: this.data.depFatherId
      }
     load.showLoading("查询原料")
      queryDisGoodsByQuickSearchGb(data).then(res => {
        console.log(res)
        load.hideLoading();
        if (res.result.code == 0) {
          if (res.result.data.length > 0) {
            this.setData({
              strArr: res.result.data,
            })
          } else {
            this.setData({
              strArr: [],
            })
          }
        }
      })
    } else {
      this.setData({
        searchArr: [],
        isSearching: false,
      })
    }
  },

  checkGoods(e) {
    var goodsName = e.detail.value;
    if (this.data.modalType === 'edit' && this.data.editGoods && goodsName !== this.data.editGoods.gbDfgGoodsName) {
      // 名称变更时由搜索流程处理
    }
    this.setData({
      isSearching: false
    })
  },

  stopMove() {},

  showSaveHint() {
    wx.showToast({
      title: '请先添加至少一条原料',
      icon: 'none'
    })
  },

  /**
   * 显示操作面板，选择被操作商品
   * @param {}} e 
   */
  applyGoods(e) {
    if(this.data.modalType == 'edit'){
     var disGoodsId =  e.currentTarget.dataset.item.gbDistributerGoodsId;
     var  goodsName =  e.currentTarget.dataset.item.gbDgGoodsName;
    var  standardName =  e.currentTarget.dataset.item.gbDgGoodsStandardname;
    var editDisGoodsIdData = "editGoods.gbDfgDisGoodsId";
    var editdgGoodsNameData = "editGoods.gbDfoodgGoodsName";
    var editdgStandardData = "editGoods.gbDfoodgGoodsStandardname";
    var disGoodsData = "editGoods.distributerGoodsEntity";
    var editAmountData = "editGoods.gbDfgGoodsAmount";

      this.setData({
        [disGoodsData] : e.currentTarget.dataset.item,
        [editDisGoodsIdData]: disGoodsId,
        [editdgGoodsNameData]: goodsName,
        [editdgStandardData]: standardName,
        [editAmountData]: "",
        isSearching: false,
        searchArr: []
      })
    }else{
      this.setData({
        disGoodsId: e.currentTarget.dataset.item.gbDistributerGoodsId,
        goodsName: e.currentTarget.dataset.item.gbDgGoodsName,
        standardName: e.currentTarget.dataset.item.gbDgGoodsStandardname,
        isSearching: false,
        searchArr: []
  
      })
    }
   
  },
  tishi(){
    wx.showToast({
      title: "内容不完整",
      icon: 'none'
    })
  },
  confirm(e) {
    if(this.data.modalType == 'edit'){
      var goodsName = this.data.editGoods.gbDfgGoodsName;
      var amount = this.data.editGoods.gbDfgGoodsAmount;
      if(goodsName.length > 0 && Number(amount) > 0){
        this.setData({
          canSave: true
        })
        load.showLoading("修改原料")
        updateGbFoodGoods(this.data.editGoods)
        .then(res =>{
          load.hideLoading();
          if(res.result.code == 0){
            this.setData({
              rawArr: res.result.data,
              showFood: false,
              editGoods: "",
            })
          }
        })
      }else{
        wx.showToast({
          title: "内容不完整",
          icon: 'none'
        })
      }
     

    }else{
      var item = {
        gbDfgDisId: this.data.disId,
        gbDfgGoodsName: this.data.goodsName,
        gbDfgFoodId: this.data.foodId,
        gbDfgDisGoodsId: this.data.disGoodsId,
        gbDfgGoodsAmount: this.data.amount,
        gbDfgGoodsStandardname: this.data.standardName,
      }
      var arr = this.data.rawArr;
      arr.push(item);
      this.setData({
        showFood: false,
        goodsName: "",
        disGoodsId: "",
        standardName: "",
        amount: "",
        rawArr: arr
  
      })
    }
   
    // }

  },


  addFoodGoods() {
    var data = this.data.rawArr;
    load.showLoading("保存原料");
    saveGbFoodGoods(data).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        wx.navigateBack({
          delta: 1,
        })
      }
    })
  },

  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  }

















})