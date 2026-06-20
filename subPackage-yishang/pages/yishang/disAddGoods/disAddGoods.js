
var app = getApp();

const globalData = getApp().globalData;
import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil');


import {
  saveGbDisGoodsLinshi,
  saveLinshiGoodsGb
} from '../../../../lib/apiDepOrder'


Page({


  onShow(){
  
  },

  /**
   * 页面的初始数据
   */
  data: {
   
    src: "",
    
  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    
     var disInfo = wx.getStorageSync('disInfo');
     if(disInfo){
       this.setData({
        disInfo: disInfo,
        disId: disInfo.gbDistributerId,
        toDepId: disInfo.purDepartmentList[0].gbDepartmentId,
       })
     }
     var depInfo = wx.getStorageSync('depInfo');
     if(depInfo){
       this.setData({
        depId: depInfo.gbDepartmentId,
       })
     }
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      url: apiUrl.server,
     
      goods: {
        gbDgGoodsSort: this.data.depId,
        gbDgGoodsSonsSort: this.data.depId,
        gbDgGbDepartmentId: this.data.toDepId,
        gbDgPullOff: 0,
        gbDgGoodsStatus: 0,
        gbDgDistributerId: this.data.disId,
        gbDgGoodsName: options.goodsName,
        gbDgGoodsStandardname: "",
        gbDgGoodsInventoryType: 1,
        gbDgNxGoodsFatherColor: "#20afb8",
        gbDgGoodsFile: 'goodsImage/logo.png',
        gbDistributerStandardEntities: [],
        gbDgGoodsDetail: "",
        gbDgGoodsType: 2,
      },
      fatherName:"临时添加",
      isGrade: 0,
    })
  },


  getDisGoodsContent(e) {
    var nameData = "goods.gbDgGoodsName";
    var standardData = "goods.gbDgGoodsStandardname";
    var standardWeightData = "goods.gbDgGoodsStandardWeight";
    var brandData = "goods.gbDgGoodsBrand";
    var placeData = "goods.gbDgGoodsPlace";
    var detailData = "goods.gbDgGoodsDetail";
    

    if (e.currentTarget.dataset.type == 0) {
      this.setData({
        name: e.detail.value,
        [nameData]: e.detail.value
      })
    }
    if (e.currentTarget.dataset.type == 1) {
      this.setData({
        standard: e.detail.value,
        [standardData]: e.detail.value
      })
    }
    if (e.currentTarget.dataset.type == 2) {
      this.setData({
        [standardWeightData]: e.detail.value
      })
    }
    if (e.currentTarget.dataset.type == 3) {
      this.setData({
        [brandData]: e.detail.value
      })
    } 
    if (e.currentTarget.dataset.type == 4) {
      this.setData({
        [placeData]: e.detail.value
      })
    }

    if (e.currentTarget.dataset.type == 5) {
      this.setData({
        [detailData]: e.detail.value
      })
    }

    this._ifCanSave();
   
   
  },

  _ifCanSave(){
    console.log("_ifCanSave")
    if(this.data.isGrade == 0){
      if (this.data.goods.gbDgGoodsName != null  && this.data.goods.gbDgGoodsName.length > 0  && this.data.standard != null && this.data.standard.length > 0  && this.data.fatherName != null ) {
        this.setData({
          canSave: true
        })
      }else{
        this.setData({
          canSave: false
        })
      }
    }
    if(this.data.isGrade == 1){
      console.log("changeRaidododo")
      if (this.data.name != null && this.data.standard != null  && this.data.fatherName != null  && this.data.goods.gbDgBuyingPriceOne > 0 
        && this.data.goods.gbDgBuyingPriceTwo > 0  && this.data.goods.gbDgBuyingPriceThree > 0 ) {
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

   //选择图片
   choiceImg: function (e) {
    var _this = this;
    wx.chooseImage({
      count: 1, // 最多可以选择的图片张数，默认9
      sizeType: ['original', 'compressed'], // original 原图，compressed 压缩图，默认二者都有
      sourceType: ['album', 'camera'], // album 从相册选图，camera 使用相机，默认二者都有
      success: function (res) {
        _this.setData({
          src: res.tempFilePaths,
          isSelectImg: true,
        })
      },
      fail: function () {

      },
      complete: function () {
      }
    })
  },

  delPic(){
    this.setData({
      src: ""
    })
  
  },

  saveDisGoods(){

    if(this.data.src.length > 0){
      this.saveDisGoodsWithFile();
    }else{
      this.saveDisGoodsName();
    }

  },

  saveDisGoodsWithFile() {
   
    if (this.data.canSave) {
        load.showLoading("保存商品")
      
        var filePathList = this.data.src;
        var userName = this.data.goods.gbDgGoodsName;
        var disId = this.data.disId;
        var standard = this.data.goods.gbDgGoodsStandardname;
        var detail = this.data.goods.gbDgGoodsDetail;
        var toDepId = this.data.toDepId;
        var depId = this.data.depId;
        console.log(filePathList, userName, standard, detail, disId)
        saveLinshiGoodsGb(filePathList, userName, standard, detail, disId,toDepId, depId).then(res => {
        load.hideLoading();
      
       var item = JSON.parse(res.result) ;
       var id = item.nxDistributerGoodsId;
   
        if (id > 0 ) {       
          var pages = getCurrentPages();
          var prevPage = pages[pages.length - 2];//上一个页面
      //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
      prevPage.setData({
        item: item,
        itemDis: item,
        show: true,
        isSearching: false,
        applyStandardName:  item.gbDgGoodsStandardname,
        addNewGoods: true
      })
  
          wx.navigateBack({
            delta: 1,
          })

        } else {
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }
      })
    } else {
      wx.showToast({
        title: '请填写必填项',
        icon: 'none'
      })
    }
  },

  saveDisGoodsName() {
   
    if (this.data.canSave) {
        load.showLoading("保存商品")
        console.log(this.data.goods)
        saveGbDisGoodsLinshi(this.data.goods).then(res => {
        load.hideLoading();
        if (res.result.code == 0) {  
        var goodsId = "goods.gbDistributerGoodsId";
        this.setData({
          [goodsId]: res.result.data,
        })
          var pages = getCurrentPages();
          var prevPage = pages[pages.length - 2];//上一个页面
      //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
      prevPage.setData({
        item: res.result.data,
        depGoods: res.result.data.gbDepartmentDisGoodsEntity,
        itemDis: res.result.data,
        isSearching: false,
        show: true,
        applyStandardName:  res.result.data.gbDgGoodsStandardname,
        addNewGoods: true
      })
  
          wx.navigateBack({
            delta: 1,
          })

        } else {
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }
      })
    } else {
      wx.showToast({
        title: '请填写必填项',
        icon: 'none'
      })
    }


  },


  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },




 




})