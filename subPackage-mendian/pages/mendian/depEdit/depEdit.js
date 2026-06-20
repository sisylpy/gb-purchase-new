const globalData = getApp().globalData;

import apiUrl from '../../../../config/index.js'
import { updateGroupNameGb, deleteDepartment } from '../../../../services/mendian.js'
import { deleteDepUser } from '../../../../services/apiDistributer.js'
var load = require('../../../../lib/load.js')

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

    })

    var depInfoValue = wx.getStorageSync('depItem');
    this.setData({
      depInfo: depInfoValue,
      depFatherId: depInfoValue.gbDepartmentId,
      depId: depInfoValue.gbDepartmentId,
    })

   
   
  },


bindKeyInput(e){
  if(e.detail.value.length > 0){
    var data  = "depInfo.gbDepartmentName";
    var dataAttr = "depInfo.gbDepartmentPrintName";
    this.setData({
      [data]: e.detail.value,
      [dataAttr]: e.detail.value
    }) 
  }

},

  toSave(){
    updateGroupNameGb(this.data.depInfo).then(res => {
      if(res.result.code == 0){
        wx.setStorageSync('disInfo', res.result.data.disInfo);
        wx.setStorageSync('mendianInfo', res.result.data.mendianInfo);
        wx.navigateBack({delta : 1});
      }
    })
  },



  deleteItem(e) {
    this.setData({
      warnContent: this.data.depInfo.gbDepartmentName,
      popupType: 'deleteSpec',
      showPopupWarn: true,
    })
  },

  delUser(e) {
    var id = e.currentTarget.dataset.id;
    load.showLoading("删除用户");
    deleteDepUser(id).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        wx.showToast({ title: '删除成功', icon: 'none' });
        wx.navigateBack({ delta: 1 });
      }
    })
  },

  confirmWarn() {
    deleteDepartment(this.data.depInfo.gbDepartmentId)
      .then(res => {
        if (res.result.code == 0) {
          wx.showToast({
            title: '删除成功',
            icon: 'none'
          })
          wx.setStorageSync('disInfo', res.result.data)
          wx.navigateBack({delta: 1});
        } else {
          var that = this;
          wx.showModal({
            title: '提示',
            content: res.result.msg || "请先删除门店商品、订单、用户等数据",
            showCancel: false,
            confirmText: "知道了",
          })
        }

      })

  },

  closeWarn(){
    this.setData({
      showPopupWarn: false
    })
  },

  toBack() {
    wx.navigateBack({
      delta: 1
    });
  },





})