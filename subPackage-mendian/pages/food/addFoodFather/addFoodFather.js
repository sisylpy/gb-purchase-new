const app = getApp()
const globalData = app.globalData;
var load = require('../../../../lib/load.js');

import {
  saveGbFoodFather,
  updateGbFood
} from '../../../services/apiDistributerGbFood'
Page({
  /**
   * 页面的初始数据
   */
  data: {
    showNumber: false,
    depNumbers: "",
    addFinished: false,
    hasSubs: 0,
    resName:"",
    deps: [],
    fatherFood: null
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
      disId: options.disId,
      type: options.type
    })
    var fatherFoodValue = wx.getStorageSync('fatherFood');
    if(fatherFoodValue){
      this.setData({
        fatherFood: fatherFoodValue 
      })
    }

  },


  getRestrauntName(e){
    if(e.detail.value.length > 0){
      this.setData({
        resName:  e.detail.value,
      })  
      this._ifCanSave();
    }
  },



  /**
   * 检查可下一步状态
   */
   _ifCanSave(){
     //resName
     if(this.data.resName.length > 0){
       // hasSubs == 1 
       if(this.data.hasSubs == 1){
         if(this.data.deps.length > 0){
           //
           var num  = this.data.deps.length;
           for (var i = 0; i < num; i++) {
             var name =  this.data.deps[i].gbDepartmentName;
             if(name == null || name.length == 0){
               this.setData({
                addFinished: false
               })
               return;
             }else{
              this.setData({
                addFinished: true
               })
             } 
           }
         }else{
          this.setData({
            addFinished: false
          })
         }
       
       } else{
        this.setData({
          addFinished: true
        })
       }
     }else{
       this.setData({
         addFinished: false
       })
     }
    
   },

 
  toBack(){
    wx.removeStorageSync('fatherFood');
    wx.navigateBack({
      delta: 1,
    })
  },

  

  saveFoodFather(){
    if(this.data.type == 'add'){
      var  dep = {
        gbDfDistributerId: this.data.disId,
        gbDfFoodName: this.data.resName,  
        }
        load.showLoading("保存供货商类别")
        saveGbFoodFather(dep)
        .then(res =>{
          load.hideLoading()
          if(res.result.code == 0){
            wx.removeStorageSync('fatherFood');
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
    if(this.data.type == 'edit'){
      var dep = this.data.fatherFood;
      dep.gbDfFoodName = this.data.resName;
      load.showLoading("修改供货商类别")
      updateGbFood(dep)
      .then(res =>{
        load.hideLoading()
        if(res.result.code == 0){
          wx.removeStorageSync('fatherFood');
          wx.navigateBack({
            delta: 1,
          })
        }
      })
    }
  },


  








  
})