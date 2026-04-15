const globalData = getApp().globalData;

import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');


// import {
//   updateGroupNameGb,
//   deleteDepartment,
//   deleteDepUser,
//   getDepInfoGb
// } from '../../../../lib/apiDistributer'


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
    updateGroupNameGb(this.data.depInfo).then(res => {
      if(res.result.code == 0){
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
        this._getDepInfo();
      }
    })

  },


  _getDepInfo() {
    load.showLoading("获取部门数据");
    getDepInfoGb(this.data.depId).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        this.setData({
          depInfo: res.result.data,
        })
        wx.setStorageSync(res.result.data);
      }
    })
  },

  confirmWarn() {
    console.log("de");
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
            title: res.result.msg,
            content: "请先删除门店商品、订单、用户等数据",
            showCancel: false,
            confirmText: "知道了",
            success: function (res) {
              if (res.cancel) {
                //点击取消
                console.log("您点击了取消")

              } else if (res.confirm) {
                that.cancle();
              }
            }
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