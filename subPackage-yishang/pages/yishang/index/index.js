const globalData = getApp().globalData;
var load = require('../../../../lib/load.js');

import apiUrl from '../../../../config.js'

import {

  peisongDepGetNxDistributer,
} from '../../../../lib/apiDistributerGb.js'


Page({

  data:{
    showOperation: false
  },

  onLoad() {

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
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

  selNxDis(e){
    this.setData({
      nxDis: e.currentTarget.dataset.nxdis,
      showOperation: true
    })
    this.chooseSezi();
  },
  


hideMask() {
 
  this.setData({
    showOperation: false,
  })
},

chooseSezi: function (e) {
  // 用that取代this，防止不必要的情况发生
  var that = this;
  // 创建一个动画实例
  var animation = wx.createAnimation({
    // 动画持续时间
    duration: 100,
    // 定义动画效果，当前是匀速
    timingFunction: 'linear'
  })
  // 将该变量赋值给当前动画
  that.animation = animation
  // 先在y轴偏移，然后用step()完成一个动画
  animation.translateY(200).step()
  // 用setData改变当前动画
  that.setData({
    // 通过export()方法导出数据
    animationData: animation.export(),
    // 改变view里面的Wx：if
    chooseSize: true
  })
  // 设置setTimeout来改变y轴偏移量，实现有感觉的滑动
  setTimeout(function () {
    animation.translateY(0).step()
    that.setData({
      animationData: animation.export()
    })
  }, 20)
},

hideModal: function (e) {
  var that = this;
  var animation = wx.createAnimation({
    duration: 1000,
    timingFunction: 'linear'
  })
  that.animation = animation
  animation.translateY(200).step()
  that.setData({
    animationData: animation.export()

  })
  setTimeout(function () {
    animation.translateY(0).step()
    that.setData({
      animationData: animation.export(),
      chooseSize: false
    })
  }, 200)
},



  toMyNxDistributer() {

    this.hideMask();

    console.log("toMyNxDistributer")
    wx.setStorageSync('nxDisItem', this.data.nxDis);
     wx.navigateTo({
       url: '../myNxDistributerBill/myNxDistributerBill?nxDisId=' + this.data.nxDis.nxDistributerId +  '&gbDisId=' + this.data.disId ,
     })
  },



  toMarket() {

    wx.navigateTo({
      url: '../yishangList/yishangList?depId=' + this.data.appSupplierDepId,
    })
  },

  toIbooks() {
    wx.navigateTo({
      url: '../../../../pages/ibook/index/index'
    })
  },


  // delteNx(e) {
  //   var id = e.currentTarget.dataset.id;
  //   var depId = this.data.disInfo.appSupplierDepartment.gbDepartmentId;
  //   var data = {
  //     nxDisId: id,
  //     depId: depId
  //   }

  //   peisongDepDeleteNxDistributer(data).then(res => {
  //     if (res.result.code == 0) {
  //       this._initData()
  //     }
  //   })
  // },



  toInvite(){
    wx.navigateTo({
      url: '../../../../pages/inviteAndOrder/inviteAndOrder',
    })
  },


  toSupplierFenxi(){
    this.hideMask();
    wx.navigateTo({
      url: '../nxGoodsFenxi/nxGoodsFenxi?nxDisId=' + this.data.nxDis.nxDistributerId,
    })
  },

  toSupplierStars(){
    this.hideMask();
  
    wx.navigateTo({
      url: '../../supplier/jrdhGoodsStars/jrdhGoodsStars?supplierId=-1&nxDisId=' + this.data.disId +'&from=navigate',
    })
  },

  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },

 

 onUnload(){
   wx.removeStorageSync('nxDisItem');
   
 }


})