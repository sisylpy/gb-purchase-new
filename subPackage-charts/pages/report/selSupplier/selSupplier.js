
var load = require('../../../../lib/load.js');
var config = require('../../../../config/index.js');
var chartsApi = require('../../../services/api.js');
var getDepUsersByFatherIdGb = require('../../../../services/mendian').getDepUsersByFatherIdGb;

Page({


  onShow: function () {

    // 推荐直接用新API
    let windowInfo = wx.getWindowInfo();
    let globalData = getApp().globalData;
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
    });

  },
  /**
   * 页面的初始数据
   */
  data: {
    searchSubDeps: [],
    supplierArr: [],
    userArr: [],
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    var disInfo = wx.getStorageSync('disInfo');
    var disUserInfo = wx.getStorageSync('userInfo');
    var depId = '';
    if (disInfo) {
      if (
        disInfo.purDepartmentList &&
        disInfo.purDepartmentList.length > 0
      ) {
        depId = disInfo.purDepartmentList[0].gbDepartmentId;
      } else {
        var mendianInfo = wx.getStorageSync('mendianInfo');
        if (mendianInfo) {
          depId = mendianInfo.gbDepartmentId;
        }
      }
    }

    this.setData(
      {
        startDate: options.startDate,
        stopDate: options.stopDate,
        url: config.server,
        disInfo: disInfo || null,
        disId: disInfo ? disInfo.gbDistributerId : '',
        depId: depId,
        userInfo: disUserInfo || {},
      },
      () => {
        this._initData();
        this._initDataP();
      }
    );
  },

  _initDataP() {
    const userInfo = this.data.userInfo;
    if (!userInfo || !userInfo.gbDuDepartmentId) {
      return;
    }
    var data = {
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      depId: userInfo.gbDuDepartmentId,
    };
    getDepUsersByFatherIdGb(data).then(res => {
      if (res.result.code == 0) {
        const userArr = (res.result.data || []).map(user => ({
          ...user,
          isSelected: false,
        }));
        this.setData({ userArr });
      } else {
        wx.showToast({
          title: res.result.msg || '获取采购员失败',
          icon: 'none',
        });
      }
    }).catch(function (err) {
      console.error('getDepUsersByFatherIdGb', err);
      wx.showToast({ title: '获取采购员失败', icon: 'none' });
    });
  },

  _initData() {
    if (!this.data.depId) {
      return;
    }
    var data = {
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      depId: this.data.depId,
    };
    load.showLoading('获取数据中');
    chartsApi.depGetSupplier(data).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        const supplierArr = (res.result.data || []).map(supplier => ({
          ...supplier,
          isSelected: false,
        }));
        this.setData({ supplierArr });
      } else {
        wx.showToast({
          title: res.result.msg || '获取供货商失败',
          icon: 'none',
        });
      }
    }).catch(function (err) {
      load.hideLoading();
      console.error('depGetSupplier', err);
      wx.showToast({ title: '获取供货商失败', icon: 'none' });
    });
  },


  // 选择供货商方法
  selectSupplier(e) {
    console.log('selectSupplier 被调用了');
    const index = e.currentTarget.dataset.index;
    console.log('点击的索引:', index);
    const supplierArr = this.data.supplierArr;
    const userArr = this.data.userArr || [];
    
    console.log('点击前的状态:', supplierArr[index].isSelected);
    
    // 先取消所有供货商的选中状态
    supplierArr.forEach(supplier => {
      supplier.isSelected = false;
    });
    
    // 取消所有采购员的选中状态
    userArr.forEach(user => {
      user.isSelected = false;
    });
    
    // 选中当前点击的供货商
    supplierArr[index].isSelected = true;
    
    console.log('选择供货商:', supplierArr[index].nxJrdhsSupplierName, 'isSelected:', supplierArr[index].isSelected);
    
    this.setData({
      supplierArr: supplierArr,
      userArr: userArr,
      type: "purSupplier"
    });
  },

  selectPurchaser(e) {
    console.log('selectPurchaser 被调用了');
    const index = e.currentTarget.dataset.index;
    console.log('点击的索引:', index);
    const userArr = this.data.userArr;
    const supplierArr = this.data.supplierArr || [];
    
    console.log('点击前的状态:', userArr[index].isSelected);
    
    // 先取消所有采购员的选中状态
    userArr.forEach(user => {
      user.isSelected = false;
    });
    
    // 取消所有供货商的选中状态
    supplierArr.forEach(supplier => {
      supplier.isSelected = false;
    });
    
    // 选中当前点击的采购员
    userArr[index].isSelected = true;
    
    console.log('选择采购员:', userArr[index].gbDuWxNickName, 'isSelected:', userArr[index].isSelected);
    
    this.setData({
      userArr: userArr,
      supplierArr: supplierArr,
      type: "purDepUser"
    });
  },
  
  toSave(e){  
   
    var ids = "";
    if(this.data.type == 'purDepUser'){
      const userArr = this.data.userArr;
      const selectedUser = userArr.filter(user => user.isSelected);
      if(selectedUser.length > 0){
        ids = selectedUser[0].gbDepartmentUserId;
      } else {
        wx.showToast({
          title: '请选择一个采购员',
          icon: 'none'
        });
        return;
      }
    }else{
      const supplierArr = this.data.supplierArr;
      const selectedSuppliers = supplierArr.filter(supplier => supplier.isSelected);
      if(selectedSuppliers.length > 0){
        ids = selectedSuppliers[0].nxJrdhSupplierId;
      } else {
        wx.showToast({
          title: '请选择一个供货商',
          icon: 'none'
        });
        return;
      }
    }
    
    var data ={
     gbRepDisUserId: this.data.userInfo.gbDepartmentUserId,
      gbRepIds: ids,
      gbRepType: this.data.type,
      gbRepStartDate: this.data.startDate,
      gbRepStopDate: this.data.stopDate
    }

    chartsApi.saveReportCost(data).then(res =>{
      if(res.result.code == 0){
       var pages = getCurrentPages();
       var prevPage = pages[pages.length - 2]; //上一个页面
       //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
       prevPage.setData({
         update: true
       })
         wx.navigateBack({
           delta: 1,
         })
       
      } 
    })
  },



  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },

})