var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil');
var apiUrl = require('../../../../config/index.js');
var apiDistributer = require('../../../../services/apiDistributer');
var getDepUsersByFatherIdGb = require('../../../../services/mendian').getDepUsersByFatherIdGb;

// ========================
// 本页面使用的接口方法（来自 apiDistributer）
// ========================
// getDepUsersByFatherIdGb(data) [services/mendian]  POST  gbdepartment/getDepUsersByFatherIdGb  获取群用户列表
// apiDistributer.deleteDepUser(id)              GET   gbdepartmentuser/deleteDepUser/{id}                 删除用户
// ========================

Page({

  /** 页面初始数据 */
  data: {
    showOperation: false,
    toOpenMini: false,
    isTishi: false,
    toSharePurchase: false,
    editUser: false,
    update: false
  },

  /** 监听页面显示 */
  onShow: function () {
    if (this.data.update) {
      this._initData();
    }
  },

  /** 监听页面加载 */
  onLoad: function (options) {
    var globalData = getApp().globalData;
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
    });
    var myDate = wx.getStorageSync('myDate');
    if(myDate){
      // 如果是自定义日期，传递具体的开始和结束日期
      var dateRange;
      if (myDate.name === 'custom' ) {
        dateRange = dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate);
      } else {
        dateRange = dateUtils.getDateRange(myDate.name);
      }
      
      this.setData({
        startDate: dateRange.startDate,
        stopDate: dateRange.stopDate,
        dateType: myDate.dateType,
        hanzi: myDate.hanzi || dateRange.name,
      })
    }else{
      this.setData({
        dateType: 'month',
        startDate: dateUtils.getFirstDateInMonth(),
        stopDate: dateUtils.getArriveDate(0),
        hanzi:  "本月",
      })
    }

    
    var userInfo = wx.getStorageSync('userInfo');
    if(userInfo){
      this.setData({
        userInfo: userInfo,
      })
    }

    var value = wx.getStorageSync('mendianInfo');
    if(value){
      this.setData({
        mendianInfo: value,
        depFatherId: value.gbDepartmentId,
      })
    }
    this._initData();
  },

  /** 加载用户列表数据 */
  _initData: function () {
    var _this = this;
    var data = {
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      depId: this.data.depFatherId
    };
    getDepUsersByFatherIdGb(data).then(function (res) {
      if (res.result.code == 0) {
        _this.setData({
          userArr: res.result.data,
        });
      }
    });
  },

  /** 打开分享管理员 */
  toShareAdmin: function () {
    this.setData({
      toSharePurchase: true
    });
  },

  /** 邀请采购员（分享） */
  onShareAppMessage: function (options) {
    return {
      title: "注册京采账本小程序",
      path: '/pages/inviteAdmin/inviteAdmin?disId=' + this.data.userInfo.gbDuDistributerId + '&depFatherId=' + this.data.depFatherId + '&depId=' + this.data.depFatherId + '&depName=' + this.data.userInfo.gbDuWxNickName + '&admin=11',
      imageUrl: this.data.url + 'userImage/say.png',
    };
  },

  /** 打开操作菜单 */
  openOperation: function (e) {
    this.setData({
      showOperation: true,
      selectUserId: e.currentTarget.dataset.id,
      purUserItem: e.currentTarget.dataset.item,
    });
  },

  /** 关闭蒙版 */
  hideMask: function () {
    this.setData({
      showOperation: false,
    });
  },

  /** 删除用户 */
  delUser: function () {
    var _this = this;
    load.showLoading("删除用户");
    apiDistributer.deleteDepUser(this.data.selectUserId).then(function (res) {
      if (res.result.code !== -1) {
        load.hideLoading();
        _this._initData();
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
        });
      }
    });
  },

  /** 编辑用户（跳转编辑页） */
  editUser: function () {
    this.setData({
      editUser: true
    });
   
    wx.navigateTo({
      url: '../../mendian/depUserEdit/depUserEdit',
    });
  },

  /** 打开分享采购员 */
  toSharePurchase: function () {
    this.setData({
      toSharePurchase: true
    });
  },

  /** 关闭各种蒙版 */
  closeMask: function () {
    this.setData({
      toOpenMini: false,
      isTishi: false,
      toSharePurchase: false
    });
  },

  /** 跳转采购员每日详情 */
  toPurUserDetail: function (e) {
    var item = e.currentTarget.dataset.item;
    var purUserId = item.gbDepartmentUserId;
    wx.setStorageSync('purUserItem', item);
    var url = '../purUserEveryDay/purUserEveryDay?purUserId=' + purUserId + '&startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType;
    wx.navigateTo({
      url: url,
    });
  },

  /** 跳转采购员分析 */
  toPurUserFenxi: function () {
    this.setData({
      showOperation: false,
    });
    wx.setStorageSync('purUserItem', this.data.purUserItem);
    wx.navigateTo({
      url: '/subPackage-mendian/pages/supplier/purUserFenxi/purUserFenxi?purUserId=' + this.data.purUserItem.gbDepartmentUserId
        + '&type=0&supplierId=-1&startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate
        + '&dateType=' + this.data.dateType,
    });
  },

  /** 跳转日期选择 */
  toDatePageSearch: function () {
    this.setData({
      update: true,
    });
    wx.navigateTo({
      url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate +
        '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType,
    });
  },

  /** 返回上一页 */
  toBack: function () {
    wx.navigateBack({
      delta: 1,
    });
  }

});
