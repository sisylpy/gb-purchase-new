const globalData = getApp().globalData;

var load = require('../../../../lib/load.js');
var chartsApi = require('../../../services/api.js');

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

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

    this.setData({
      startDate: options.startDate,
      stopDate: options.stopDate,
      type: options.type,
    })
   
    var disInfo = wx.getStorageSync('disInfo');
    if(disInfo){
      // 为每个部门添加默认选中状态
      const subDepArr = disInfo.mendianDepartmentList[0].gbDepartmentEntityList.map(dep => ({
        ...dep,
        isSelected: true
      }));
      
      this.setData({
        disInfo: disInfo,
        disId: disInfo.gbDistributerId,
        subDepArr: subDepArr,
      })
    }
    var disUserInfo = wx.getStorageSync('userInfo');
    if(disUserInfo){
      this.setData({
        userInfo: disUserInfo
      })
    }
    
  },

  // 选择部门方法
  selectDepartment(e) {
    const index = e.currentTarget.dataset.index;
    const subDepArr = this.data.subDepArr;
    
    // 切换选中状态
    subDepArr[index].isSelected = !subDepArr[index].isSelected;
    
    this.setData({
      subDepArr: subDepArr
    });
  },

  
  toSave(e){  
    //如果所有部门都选择了，ids = disId，type =“disStockNow”；
    //如果只选择了某几个部门，则 ids = 每个部门的 id 的拼接，type = 'depStockNow'
    const subDepArr = this.data.subDepArr;
    const selectedDeps = subDepArr.filter(dep => dep.isSelected);
    const totalDeps = subDepArr.length;
    
    var ids = "";
    var type = "";
    
    if (selectedDeps.length === totalDeps) {
      // 所有部门都选择了
      ids = this.data.disId;
      type = "disCost";
    } else if (selectedDeps.length > 0) {
      // 只选择了部分部门
      ids = selectedDeps.map(dep => dep.gbDepartmentId).join(',');
      type = "subDepCost";
    } else {
      // 没有选择任何部门
      wx.showToast({
        title: '请至少选择一个部门',
        icon: 'none'
      });
      return;
    }
   
    var data ={
     gbRepDisUserId: this.data.userInfo.gbDepartmentUserId,
      gbRepIds: ids,
      gbRepType: type,
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



  toSaveBusiness(e){
    console.log("savbusiness")
  //如果所有部门都选择了，ids = disId，type =“disStockNow”；
    //如果只选择了某几个部门，则 ids = 每个部门的 id 的拼接，type = 'depStockNow'
    const subDepArr = this.data.subDepArr;
    const selectedDeps = subDepArr.filter(dep => dep.isSelected);
    const totalDeps = subDepArr.length;
    
    var ids = "";
    var type = "";
    
    if (selectedDeps.length === totalDeps) {
      // 所有部门都选择了
      ids = this.data.disId;
      type = "disBusiness";
    } else if (selectedDeps.length > 0) {
      // 只选择了部分部门
      ids = selectedDeps.map(dep => dep.gbDepartmentId).join(',');
      type = "subDepBusiness";
    } else {
      // 没有选择任何部门
      wx.showToast({
        title: '请至少选择一个部门',
        icon: 'none'
      });
      return;
    }
   
    var data ={
     gbRepDisUserId: this.data.userInfo.gbDepartmentUserId,
      gbRepIds: ids,
      gbRepType: type,
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