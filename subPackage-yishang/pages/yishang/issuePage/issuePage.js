

var load = require('../../../../lib/load.js');

const globalData = getApp().globalData;
var app = getApp()

import {
 
  getAccountApplysGb,
  updateOrderReturn,
  updateBillOrders,
} from '../../../../lib/apiDepOrder'


Page({


  onShow(){

    this._getDepartmentBillApplys();
  },
  /**
   * 页面的初始数据
   */
  data: {
  
    hide: false,
    scrollTop: 0,
    scrollViewTop: 0,

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

  

    //login页面存储的信息
    var value = wx.getStorageSync('disInfo');
    if (value) {
      this.setData({
        disId: value.gbDistributerId,

      })
    }
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      billId: options.billId,
      depName: options.depName,
      depFatherId: options.depFatherId,
      depHasSubs: options.depHasSubs
    })

    var nxDisInfo = wx.getStorageSync('nxDisItem');
    if(nxDisInfo){
      this.setData({
        nxDisInfo: nxDisInfo
      })
    }

  },

  _getDepartmentBillApplys(){
    var data = {
      billId: this.data.billId,
      depFatherId: this.data.depFatherId
    }
    getAccountApplysGb(data).then(res =>{
      console.log(res)
      if(res.result.code == 0){
          this.setData({
            applyArr: res.result.data.arr,
            bill: res.result.data.bill,
            toDepName: res.result.data.toDepName,
            issueUser: res.result.data.issueUser,
            returnCount: res.result.data.returnNumber,
            depHasSubs:res.result.data.depHasSubs
          
          }) 
               
      
      }

    })
  },



  //  //////////////
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
   
  },


  /**
   * 打开操作面板
   * @param {}} e 
   */
  openOperation(e) {
    this.setData({
      showOperation: true,
      item: e.currentTarget.dataset.item,
      itemDis: e.currentTarget.dataset.item.nxDistributerGoodsEntity,
      index: e.currentTarget.dataset.index,
     
    })
    this.chooseSezi();

  },

  /**
   * 关闭操作面板
   */
  hideMask() {
    this.setData({
      showOperation: false,
    })
    this.hideModal();

  },


  editBill(e){
    console.log(e);
    this.setData({
      showOperation: false,
      show: true,
      applyNumber: this.data.item.nxDoWeight,
      applyPrice: this.data.item.nxDoPrice,
      applySubtotal: this.data.item.nxDoSubtotal
      
    })
   


  },

  addReturn(e){
    if(this.data.item.nxDoReturnStatus == null || this.data.item.nxDoReturnStatus == 0){
      this.setData({
        showOperation: false,
        showReturn: true, 
       
      })
      if( this.data.item.nxDoReturnStatus == 0){
        this.setData({
          applyNumber: this.data.item.nxDoReturnWeight
        })

      }
     
    }else{
      wx.showToast({
        title: '不能重复退货',
        icon: 'none'
      })

    }
   
  },

  /**
   * 修改配送申请
   * @param {} e 
   */
  confirm(e) {
    var total = "";

    if(this.data.depHasSubs == 1){
      var index = this.data.index;
      var orderItemWeight = "applyArr[" + index + "].nxDoWeight";
      var orderItemPrice = "applyArr[" + index + "].nxDoPrice";
      var orderItemSubtotal = "applyArr[" + index + "].nxDoSubtotal";
      this.setData({    
        [orderItemWeight]: e.detail.applyNumber,
        [orderItemPrice]: e.detail.applyPrice,
        [orderItemSubtotal]: e.detail.applySubtotal,
      })
      var arr  = this.data.applyArr;
      for(var i = 0; i < arr.length; i++){
        var sub = arr[i].nxDoSubtotal;
        console.log(i + "==" + sub);
        total = Number(total) + Number(sub);
      }
      this.setData({
        billSubtotal: total.toFixed(1),
        ["bill.nxDbTotal"]: total.toFixed(1)
      })
    }else{
      var depIndex = this.data.depIndex;
      var index = this.data.index;
      var orderItemWeight = "applyArr[" + depIndex + "].depOrders[" + index + "].nxDoWeight";
      var orderItemPrice = "applyArr[" + depIndex + "].depOrders[" + index + "].nxDoPrice";
      var orderItemSubtotal = "applyArr[" + depIndex + "].depOrders[" + index + "].nxDoSubtotal";
      this.setData({
        [orderItemWeight]: e.detail.applyNumber,
        [orderItemPrice]: e.detail.applyPrice,
        [orderItemSubtotal]: e.detail.applySubtotal,
      })
      var depArr = this.data.applyArr;
      for(var i = 0; i < depArr.length; i++){
        var orderArr =  depArr[i].depOrders;
        for(var j = 0;  j < orderArr.length; j ++){
           var sub = orderArr[j].nxDoSubtotal;
           total = Number(total) + Number(sub);
        }
    }

      this.setData({
        billSubtotal: total.toFixed(1),
        ["bill.nxDbTotal"]: total.toFixed(1)
      })
    }

    var data = {
      billId: this.data.billId,
      orderId: this.data.item.nxDepartmentOrdersId,
      billSubtotal: this.data.billSubtotal,
      orderPrice: e.detail.applyPrice,
      orderWeight: e.detail.applyNumber,
      orderSubtotal: e.detail.applySubtotal,
    };

    console.log(data);

    updateBillOrders(data).then(res => {
      load.showLoading("修改订单")
        if (res.result.code == 0) {
          load.hideLoading();
          this._getAccountBillApplys();

        }else{
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }
      
    })
  },

  

  toReturnPage(){
    console.log(this.data.billId)
    wx.navigateTo({
      url: '../returnPage/returnPage?billId=' + this.data.billId
      + '&depName=' + this.data.depName + '&depFatherId=' + this.data.depFatherId 
      +'&disId=' + this.data.disId,  
    })
  },

  
  /**
   * 修改配送申请
   * @param {} e 
   */
  confirmReturn(e) {
  
    var dg = {
      nxDepartmentOrdersId: this.data.item.nxDepartmentOrdersId,
      nxDoReturnWeight: e.detail.applyNumber,
      nxDoReturnSubtotal: (Number(e.detail.applyNumber) * Number(this.data.item.nxDoPrice)).toFixed(1),
      nxDoReturnStatus: 0,
      
    };
    
    var dg = {
      id: this.data.item.nxDepartmentOrdersId,
      weight: e.detail.applyNumber,
      subtotal:(Number(e.detail.applyNumber) * Number(this.data.item.nxDoPrice)).toFixed(1),
      
    };

    updateOrderReturn(dg).then(res => {
      load.showLoading("添加退货商品")
        if (res.result.code == 0) {
          load.hideLoading();
          this._getAccountBillApplys();
          
        }else{
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }
      
    })
  },


  saveReturnBill(){

  },
 toBack(){
   console.log("backk")
  wx.navigateBack({
    delta: 1,
  })
 },

})