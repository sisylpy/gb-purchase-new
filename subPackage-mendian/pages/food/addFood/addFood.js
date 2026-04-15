const app = getApp()
const globalData = app.globalData;
var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'


import {
  saveGbFood,
  updateFoodWithFile,
  updateFood,
  queryDisGoodsByQuickSearchGb
} from '../../../services/apiDistributerGbFood'

Page({
  /**
   * 页面的初始数据
   */
  data: {
   
    canSave: false,
    imgChanged: false,
    isSelectImg: false,
    showFood: false,
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
      fatherId: options.fatherId,
      fatherName: options.fatherName,
      type: options.type,
      url: apiUrl.server ,
      foodName: "",
      price: "",
      method: "",
      rawArr: [],
      seasoningArr: [],
      packArr: [],
    
    })

    if(options.type == 'edit'){
      var foodItem = wx.getStorageSync('Food');
      this.setData({
           foodItem: foodItem,
           dataUrl: foodItem.gbDistributerFoodImg
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

  
  toAddGoods(e) {
    this.setData({
      showFood: true
    })
  },

  cancle() {
    this.setData({
      showFood: false
    })
  },

  getFoodName(e) {
    if(this.data.type == 'edit'){
      var nameData = "foodItem.gbDfFoodName"
      this.setData({
        [nameData]: e.detail.value
      })
    }else{
      this.setData({
        foodName: e.detail.value
      })
    }
    this._checkCanSave();

  },

  
    //选择图片
    choiceImg: function (e) {
      var _this = this;
      wx.chooseImage({
        count: 1, // 最多可以选择的图片张数，默认9
        sizeType: ['compressed'], // original 原图，compressed 压缩图，默认二者都有
        sourceType: ['album', 'camera'], // album 从相册选图，camera 使用相机，默认二者都有
        success: function (res) {
          if(_this.data.type == 'edit'){
            var itemData = "foodItem.gbDistributerFoodImg";
            _this.setData({
              [itemData]: res.tempFilePaths,
              src: res.tempFilePaths,
              isSelectImg: true,
              imgChanged: true,
    
            })
          }if(_this.data.type == 'add'){
            _this.setData({
              src: res.tempFilePaths,
              isSelectImg: true,
              imgChanged: true,
            })
          }
          _this._checkCanSave();
        },
        fail: function () {
          // fail
        },
        complete: function () {
          // complete
        }
      })
  
    },
  

  getPrice(e){
    if(this.data.type == 'edit'){
      var nameData = "foodItem.gbDfFoodPrice"
      this.setData({
        [nameData]: e.detail.value
      })
    }else{
      this.setData({
        price: e.detail.value
      })
    }
    this._checkCanSave();

  },

  getFoodMethod(e){
    if(this.data.type == 'edit'){
      var nameData = "foodItem.gbDfFoodMethod"
      this.setData({
        [nameData]: e.detail.value
      })
    }else{
      this.setData({
        method: e.detail.value
      })
    }
    this._checkCanSave();

  },

    _checkCanSave(){
      if(this.data.type == 'edit'){
        var name = this.data.foodItem.gbDfFoodName;
        var price = this.data.foodItem.gbDfFoodPrice;
        var isSelectImg = this.data.foodItem.gbDistributerFoodImg;
        if(name !== null  && name.length  > 0 && price !== null  && price.length  > 0&& isSelectImg.length > 0){
          this.setData({
            canSave: true
          })
        }else{
          this.setData({
            canSave: false
          })
        }
      }else{
        var name = this.data.foodName;
        var price = this.data.price;
        var isSelectImg = this.data.isSelectImg;
        if(name !== null  && name.length  > 0 && price !== null  && price.length  > 0&& isSelectImg){
          this.setData({
            canSave: true
          })
        }else{
          this.setData({
            canSave: false
          })
        }
      }
      
    },
  



    // goods//////////
  getSearchString(e) {
    console.log(e.detail.value)
    this.setData({
      isSearching: true,
    })

    if (e.detail.value.length > 0) {

      var data = {
        disId: this.data.disId,
        searchStr: e.detail.value,
        depId: this.data.depFatherId
      }

      queryDisGoodsByQuickSearchGb(data).then(res => {
        console.log(res)
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


  /**
   * 显示操作面板，选择被操作商品
   * @param {}} e 
   */
  applyGoods(e) {
    this.setData({
      disGoodsId: e.currentTarget.dataset.item.gbDistributerGoodsId,
      goodsName: e.currentTarget.dataset.item.gbDgGoodsName,
      standardName: e.currentTarget.dataset.item.gbDgGoodsStandardname,
      isSearching: false,
      searchArr: []

    })
  },

  confirm(e) {
    var item = {
      gbDfoodgGoodsName: this.data.goodsName,
      gbDfgDisGoodsId: this.data.disGoodsId,
      gbDfgGoodsAmount: this.data.amount,
      gbDfoodgGoodsStandardname: this.data.standardName,
    }
    var arr  = this.data.rawArr;
      arr.push(item);
    this.setData({
      showFood: false,
      goodsName: "",
      disGoodsId: "",
      standardName: "",
      rawArr: arr

    })
    // }

  },

  showTishi(e){
    wx.showToast({
      title: '不能保存',
      icon: 'none'
    })
  },

  addFood() {
    if(this.data.type == 'edit'){
      var itemUrl = this.data.foodItem.gbDistributerFoodImg;
      var dataUrl = this.data.dataUrl;
      if(dataUrl !==  itemUrl){
        var id = this.data.foodItem.gbDistributerFoodId;
        var filePathList = this.data.foodItem.gbDistributerFoodImg;
        var foodName = this.data.foodItem.gbDfFoodName;
        var method = this.data.foodItem.gbDfFoodMethod;
        var price = this.data.foodItem.gbDfFoodPrice;
        console.log(price);
        console.log(foodName);
        console.log(method);
        if(method == null){
              method = ""
        }
        load.showLoading("修改商品")
        updateFoodWithFile(filePathList, id,foodName, price ,method ).then(res => {
          load.hideLoading();
          if(res.result == '{"code":0}'){
            let pages = getCurrentPages();
            let prevPage = pages[pages.length - 2];
            prevPage.setData({
              update: true
            }) 
            wx.navigateBack({
              delta: 1,
            })
          }else{
            wx.showToast({
              title: "名称重复了",
              icon: 'none'
            })
          }   
        })
      }else{
        load.showLoading("修改商品")
        updateFood(this.data.foodItem).then(res =>{
          load.hideLoading();
          if(res.result.code == 0){
            let pages = getCurrentPages();
          let prevPage = pages[pages.length - 2];
          prevPage.setData({
            update: true
          }) 
          wx.navigateBack({
            delta: 1,
          })
          }else{
            wx.showToast({
              title: res.result.msg,
              icon: 'none'
            })
          }
        })

      }
      
     

    }

    if(this.data.type == "add"){

      var filePathList = this.data.src;
      var foodName = this.data.foodName;
      var fatherId = this.data.fatherId;
      var disId = this.data.disId;
      var price = this.data.price;
      var method = this.data.method;
      saveGbFood(filePathList, foodName, fatherId, disId, price, method).then(res => {
        console.log(res)
        if (res.result == '{"code":0}') {
          wx.navigateBack({
            delta: 1,
          })
        }else{
          wx.showToast({
            title: "名称重复了",
            icon: 'none',
          })
        }
      })
    }
  },

  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  }

















})