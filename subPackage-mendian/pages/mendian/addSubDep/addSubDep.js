const globalData = getApp().globalData;

import apiUrl from '../../../../config/index.js'
import { saveSubDepartment } from '../../../services/mendian.js'

Page({


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      depInfo: {
        gbDepartmentType: 1,
        gbDepartmentSubAmount: 0,
        gbDepartmentIsGroupDep: 0,
        gbDepartmentFatherId: options.depFatherId,
        gbDepartmentName: "",
        gbDepartmentLevel: 1,
      }
    })
    
  },


bindKeyInput(e){
  console.log(e);
  if(e.detail.value.length > 0){
    console.log("valelellelelele", e.detail.value);
    var data  = "depInfo.gbDepartmentName";
    var dataAttr = "depInfo.gbDepartmentPrintName";
    this.setData({
      [data]: e.detail.value,
      [dataAttr]: e.detail.value
    }) 
  }

},

  toSave(){
  
    saveSubDepartment(this.data.depInfo).then(res => {
      if(res.result.code == 0){
    
        wx.navigateBack({delta : 1});
      }
    })
  },


  toBack() {
    wx.navigateBack({
      delta: 1
    });
  },





})