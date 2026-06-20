const globalData = getApp().globalData;
var app = getApp()
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil');

import apiUrl from '../../../../config.js'

import {

  peisongDepGetNxDistributer,
  peisongDepDeleteNxDistributer,
  addAppGoodsWithOrder
} from '../../../../lib/apiDistributerGb.js'


Page({


  onLoad() {

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      // navBarHeight: 160,
      url: apiUrl.server,
    })

    var value = wx.getStorageSync('disInfo');
    if (value) {
      this.setData({
        disInfo: value,
        disId: value.gbDistributerId,
        appSupplierDepId: value.appSupplierDepartment.gbDepartmentId
      })

      this._initData();
    }

  },

  /**
   * 获取客户订单
   */
  _initData() {
    load.showLoading("获取今日订单");
    peisongDepGetNxDistributer(this.data.appSupplierDepId).then(res => {
      load.hideLoading();
      console.log(res.result.data)
      console.log("herree")
      if (res.result.code == 0) {
        this.setData({
          nxDisArr: res.result.data,

        })

      } else {
        wx.showToast({
          title: res.result.msg,
          duration: 1000,
        })
      }
    })
  },

  toMyNxDistributer(e) {
    console.log("toMyNxDistributer")
    var id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '../myNxDistributerBill/myNxDistributerBill?nxDisId=' + id +
        '&gbDisId=' + this.data.disId + '&fromId=' + e.currentTarget.dataset.fromdep,
    })
  },

  toMarket() {

    wx.navigateTo({
      url: '../yishangList/yishangList?depId=' + this.data.appSupplierDepId,
    })
  },


  toInvite() {
    wx.navigateTo({
      url: '../../../../pages/inviteAndOrder/inviteAndOrder',
    })
  },


  applyAppGoods(e) {
    var ids = wx.getStorageSync('purArrIds');
    if (ids) {
      var data = {
        ids: ids,
        nxDisId: e.currentTarget.dataset.id,
      }
      load.showLoading("设置订货商品")
      addAppGoodsWithOrder(data).then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          var pages = getCurrentPages();

          var prevPage = pages[pages.length - 2]; //上一个页面
          //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
          prevPage.setData({
            update: true,
          })
          wx.navigateBack({
            delta: 1
          });
        }
      })

    }
  },


  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },






})