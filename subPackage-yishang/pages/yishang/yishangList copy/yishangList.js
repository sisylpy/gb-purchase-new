var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
var app = getApp()
var dateUtils = require('../../../../utils/dateUtil');
import apiUrl from '../../../../config'

import {
 peisongGetYishangCata,
} from '../../../../lib/apiDistributerGb.js'

Page({

  
   onShow(){
    if(this.data.update){
      this._initData();
    }
   },

   onLoad(options){
     
      this.setData({
        windowWidth: globalData.windowWidth * globalData.rpxR,
        windowHeight: globalData.windowHeight * globalData.rpxR,
        navBarHeight: globalData.navBarHeight * globalData.rpxR,
        url: apiUrl.server,
        depId: options.depId,       
       
    
      })
      // 
  
     this._initData();
    },
  
  // ./show


    _initData(){
      peisongGetYishangCata(this.data.depId)
      .then(res =>{
        if(res.result.code == 0){
          this.setData({
            typeArr: res.result.data,
          })
        }
      })
    },

    addBusiness(e){
      wx.navigateTo({
        url: '../nxDistributerPage/nxDistributerPage?disId=' + e.currentTarget.dataset.id + '&depId=' + this.data.depId,
      })
      
    },

    toNxdistributer(e){
      var id = e.currentTarget.dataset.id;
      var name = e.currentTarget.dataset.name;;
      wx.navigateTo({
        url: '../nxDistributerGoods/nxDistributerGoods?nxDisId=' + id +
          '&name=' + name + '&toDepId=' + this.data.depId,
      })
    },


    toBack(){
      wx.navigateBack({
        delta: 1,
      })
    }



  

  


})