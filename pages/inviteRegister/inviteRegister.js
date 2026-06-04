var load = require('../../lib/load.js');
var apiUrl = require('../../config/index.js');
const {
  gbRegisterWithFileInvite,
  gbLogin,
} = require('../../services/apiDistributerGbUser.js');

Page({


  /**
   * 页面的初始数据
   */
  data: {

    restaurantName: '',
    phone: '',
    address: '',
    avatarUrl: '' // 选

  },

  onShow() {

    // 推荐直接用新API
    let windowInfo = wx.getWindowInfo();
    let globalData = getApp().globalData;
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
    });
    var userInfo = wx.getStorageSync('userInfo');
   if(userInfo){
     wx.redirectTo({
       url: '../index/index',
     })
   }

  },

  onLoad: function (options) {
    this.setData({
      url: apiUrl.server,
      disId: options.disId,
      disName: options.disName,
    })
 
    this._userLogin();
    
  },


  //swiper one before
  _userLogin() {
    wx.login({
      success: (resLogin) => {
        gbLogin(resLogin.code)
          .then((res) => {
            if (res.result.code !== -1) {
              console.log(res.result.data)
             
              wx.setStorageSync('disInfo', res.result.data.disInfo);
              wx.setStorageSync('userInfo', res.result.data.depUserInfo);
            wx.redirectTo({
              url: '../index/index',
            })
              //跳转到首页
            } else {
              this._aaa();
            }
          })
      }
    })
  },

  _aaa(){
    wx.login({
      success: (res) => {
        console.log(res);
       this.setData({
         code: res.code
       })
      },

      fail: (res => {
        wx.showToast({
          title: '请重新操作',
          icon: 'none'
        })
      })
    })
  },

  onRestaurantNameInput(e) {
    this.setData({
      restaurantName: e.detail.value
    });
  },
  // 联系电话输入
  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value
    });
  },
  // 地址输入
  onAddressInput(e) {
    this.setData({
      address: e.detail.value
    });
  },

  // 如果要用微信手机号授权
  onGetPhoneNumber(e) {
    console.log('onGetPhoneNumber e:', e);
    if (e.detail.errMsg === "getPhoneNumber:ok") {
      // 解密获取真实手机号的逻辑
      // ...
    } else {
      wx.showToast({
        title: '您未授权获取手机号',
        icon: 'none'
      });
    }
  },

  
  // 提交注册
  onSubmit() {
    // 1. 简单验证
    if (!this.data.restaurantName) {
      wx.showToast({ title: '请输入餐厅名称', icon: 'none' });
      return;
    }
    if (!this.data.phone) {
      wx.showToast({ title: '请输入联系电话', icon: 'none' });
      return;
    }

    // 2. 调用后端接口
   
  },

  async onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
  
    // 1. 先进行表单简单验证
    if (!this.data.restaurantName) {
      wx.showToast({ title: '请输入餐厅名称', icon: 'none' });
      return;
    }
    if (!this.data.phone) {
      wx.showToast({ title: '请输入联系电话', icon: 'none' });
      return;
    }
    if (!avatarUrl) {
      wx.showToast({ title: '请选择头像', icon: 'none' });
      return;
    }
  
    // 2. 把头像赋值到 data，给前端做预览
    this.setData({ avatarUrl });
  
    // 3. 显示自定义loading（假设你有封装 load.showLoading）
    load.showLoading("注册小程序订货客户");
  
    try {
      // 4. 调用注册接口
      const res = await gbRegisterWithFileInvite(
        this.data.avatarUrl,
        this.data.restaurantName,
        this.data.code,       // 如果你有 code
        this.data.phone,
        this.data.address,
        this.data.disId,
      );
  
      load.hideLoading();
      console.log('注册返回:', res.result);
      const jsonObject = JSON.parse(res.result);
  
      if (jsonObject.code === 0) {
        wx.setStorageSync('disInfo', jsonObject.data.disInfo);
        wx.setStorageSync('userInfo', jsonObject.data.depUser);
        wx.setStorageSync('mendianInfo', jsonObject.data.disInfo.mendianDepartmentList[0]);

        // 跳转到首页或其他页面
        var mendianInfo = wx.getStorageSync('mendianInfo');
        wx.redirectTo({
          url: '../index/index?depId=' + (mendianInfo ? mendianInfo.gbDepartmentId : ''),
        });
  
      } else {
        load.hideLoading();
        wx.showToast({
          title: jsonObject.msg || '注册失败',
          icon: 'none'
        });
      }
  
    } catch (err) {
      load.hideLoading();
      console.error('注册异常', err);
      wx.showToast({
        title: '网络异常',
        icon: 'none'
      });
    }
  },
  

  toBack() {
    wx.navigateBack({delta: 1});
  },

})