

var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
import apiUrl from '../../../../config/index.js'
var dateUtils = require('../../../../lib/dateUtil');


import {
  depGetSupplier,
  deleteGbDisSuppler,
  addGbSupplierBlack,
  updateJrdhSupplier
} from '../../../services/supplier.js'

Page({


  
  data: {
    supplierArr:[],
    showEditModal: false, // 显示编辑弹窗
    editSupplierName: '', // 编辑的供货商名称
    currentSupplierId: '', // 当前编辑的供货商ID
    originalSupplierName: '', // 原始供货商名称，用于比较
  },

  onShow(){

    if (this.data.update) {
      this._syncDatesFromMyDateStorage();
      this.setData({ update: false });
      this._initData();
    }
   
  },

  onLoad(options) {


    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      url: apiUrl.server,
    })

   

    var mendianInfo = wx.getStorageSync('mendianInfo');
    if(mendianInfo){
      this.setData({
        mendianInfo: mendianInfo,
        depId: mendianInfo.gbDepartmentId,
    })
  }
   this._syncDatesFromMyDateStorage();
    this._initData();

  },

  _syncDatesFromMyDateStorage() {
    var myDate = wx.getStorageSync('myDate');
    if (myDate) {
      var dateRange;
      if (myDate.name === 'custom') {
        dateRange = dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate);
      } else {
        dateRange = dateUtils.getDateRange(myDate.name);
      }
      this.setData({
        startDate: dateRange.startDate,
        stopDate: dateRange.stopDate,
        dateType: myDate.dateType,
        hanzi: myDate.hanzi || dateRange.name,
      });
    } else {
      this.setData({
        dateType: 'month',
        startDate: dateUtils.getFirstDateInMonth(),
        stopDate: dateUtils.getArriveDate(0),
        hanzi: "本月",
      });
    }
  },

_initData(){
  var data  = {
    startDate: this.data.startDate,
    stopDate: this.data.stopDate,
    depId: this.data.depId
  }
  load.showLoading("获取数据中");
  depGetSupplier(data).then(res => {
    load.showLoading("获取库房")
    if (res.result.code == 0) {
      load.hideLoading();
      this.setData({
        supplierArr: res.result.data,

      })
       
    } else {
      load.hideLoading();
      wx.showToast({
        title: res.result.msg,
        icon: 'none'
      })
    }
  })

},


openOperation(e) {   
  this.setData({
    showOperation: true,
    supplierItem: e.currentTarget.dataset.item,
  })
  this.chooseSezi();

},


hideMask() {
 
  this.setData({
    showOperation: false,
  })
  this.hideModal()
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


toSupplierDetail(e) {
  console.log("ee",e);
  wx.setStorageSync('supplierItem', e.currentTarget.dataset.item);
  wx.navigateTo({
    url: '../supplierBills/supplierBills?type=' + e.currentTarget.dataset.type + '&supplierId=' +
    e.currentTarget.dataset.item.nxJrdhSupplierId + '&value=' + e.currentTarget.dataset.value,
  })
},


toSupplierGoods(){
  console.log("aaa")
  this.hideMask();
  wx.setStorageSync('supplierItem', this.data.supplierItem);
  wx.navigateTo({
    url: '../resGoods/resGoods',
  })
},


toDeleteSupplier(){
  load.showLoading("删除订货商");
  deleteGbDisSuppler(this.data.supplierItem.nxJrdhSupplierId).then(res =>{
    if(res.result.code == 0){
      this.setData({
        showOperation: false,
        supplierItem: ""
      })    
      load.hideLoading();
      
      this._initData();
      
    }else{
      console.log('删除失败，准备弹出确认框');
      this.setData({
        showOperation: false,
      })
      load.hideLoading();
      
      console.log('调用 wx.showModal');
      wx.showModal({
        title: res.result.msg,
        content: "如果账单已付款，请供货商操作结账订单",
        showCancel: true,
        confirmText: "删除",
        cancelText: "知道了",
        success: (res) => {
          console.log('弹窗回调执行:', res);
          if (res.cancel) {
            console.log('用户点击了取消');
          } else if (res.confirm) {
            console.log('用户点击了确认');
            addGbSupplierBlack(this.data.supplierItem.nxJrdhSupplierId).then(res =>{
              if(res.result.code == 0){
                this.setData({
                  supplierItem: ""
                })
                this._initData();
              }
            })
          }
        },
        fail: (err) => {
          console.error('弹窗显示失败:', err);
        }
      })
      console.log('wx.showModal 调用完成');
    }
  })
},


toSupplierFenxi(e){
  this.setData({
    showOperation: false
  })
  wx.setStorageSync('supplierItem', this.data.supplierItem);
  wx.navigateTo({
    url: '../purUserFenxi/purUserFenxi?supplierId=' + this.data.supplierItem.nxJrdhSupplierId + '&type=1&purUserId=-1&startDate=' + this.data.startDate + '&stopDate='
    + this.data.stopDate + '&dateType=' + this.data.dateType,
  })
},



toSupplierStars(e){
  this.hideMask();
  wx.setStorageSync('supplierItem', e.currentTarget.dataset.item);

  wx.navigateTo({
    url: '../jrdhGoodsStars/jrdhGoodsStars?supplierId=' + e.currentTarget.dataset.item.nxJrdhSupplierId +'&goodsId=-1' + '&from=supplier',
  })
},


toEditSupplier(e){
  this.hideMask();
  // 显示编辑弹窗
  this.setData({
    showEditModal: true,
    editSupplierName: this.data.supplierItem.nxJrdhsSupplierName,
    currentSupplierId: this.data.supplierItem.nxJrdhSupplierId,
    originalSupplierName: this.data.supplierItem.nxJrdhsSupplierName
  });
  this.hideMask(); // 隐藏操作弹窗
},

// 隐藏编辑弹窗
hideEditModal() {
  this.setData({
    showEditModal: false,
    editSupplierName: '',
    currentSupplierId: '',
    originalSupplierName: ''
  });
},

// 阻止事件冒泡，防止点击弹窗内容时关闭弹窗
stopPropagation() {
  // 这个方法什么都不做，只是用来阻止事件冒泡
},

// 输入供货商名称
onEditSupplierNameInput: function(e) {
  this.setData({
    editSupplierName: e.detail.value
  });
},

// 确认修改供货商名称
confirmEditSupplier() {
  const supplierName = this.data.editSupplierName.trim();
  if (!supplierName) {
    wx.showToast({
      title: '请输入供货商名称',
      icon: 'none'
    });
    return;
  }

  load.showLoading("修改中");
  
  // 调用修改接口
  const updateData = {
    ...this.data.supplierItem,
    nxJrdhsSupplierName: supplierName
  };
  updateJrdhSupplier(updateData).then(res => {
    load.hideLoading();
    if (res.result.code == 0) {
      wx.showToast({
        title: '修改成功',
        icon: 'success'
      });
      
      // 隐藏弹窗
      this.hideEditModal();
      
      // 刷新数据
      this._initData();
    } else {
      wx.showToast({
        title: res.result.msg || '修改失败',
        icon: 'none'
      });
    }
  }).catch(err => {
    load.hideLoading();
    wx.showToast({
      title: '网络请求失败',
      icon: 'none'
    });
    console.error('修改供货商失败:', err);
  });
},  



toDatePageSearch() {
  this.setData({
    update: true,
  })
  wx.navigateTo({
    url: '../../sel/searchDate/searchDate?startDate=' + this.data.startDate +
      '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType,
  })
},


toBack() {
  wx.navigateBack({
    delta: 1,
  })
},


onUnload(){
  wx.removeStorageSync('supplierItem');
}

})