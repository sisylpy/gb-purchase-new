

const globalData = getApp().globalData;

import apiUrl from '../../../../config/index.js'
var load = require('../../../../lib/load.js');

const {
  gbPurchaserRegitsteWithFile,
  gbLogin,
} = require('../../../services/apiDistributerGbUser.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    subDepArr: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {



    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      nickName: "",
      depFatherId: options.depFatherId,
      disId: options.disId,
      depId: options.depId,
      admin: 1,
      avatarUrl: "/images/user.png",
      canRegister: false,
    
    })

      this._aaa();
      // this._userLogin();

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

//swiper one before
_userLogin() {
  wx.login({
    success: (resLogin) => {
      gbLogin(resLogin.code)
        .then((res) => {
          if (res.result.code !== -1) {
            wx.setStorageSync('disInfo', res.result.data.disInfo);
            wx.setStorageSync('userInfo', res.result.data.depUserInfo);
            wx.redirectTo({
              url: '/subPackage-ai/pages/ai/chefOrder/chefOrder',
            })
            //跳转到首页
          } else {
            this._aaa();
          }
        })
    }
  })
},

onuserNameInput(e) {
  this.setData({
    userName: e.detail.value
  });
},




// 实时获取输入内容（可选）
onNicknameInput(e) {
  const value = e.detail.value;
  this.setData({
    nickName: value
  });
  console.log('实时昵称:', value);
  this._checkRegister();
},


onChooseAvatar(e) {
  const {
    avatarUrl
  } = e.detail
  this.setData({
    avatarUrl,
  })
  this._checkRegister();
},

_checkRegister() {
  if (this.data.avatarUrl !== '/images/user.png' && this.data.nickName.length > 0) {
    this.setData({
      canRegister: true,
    })
  } else {
    this.setData({
      canRegister: false,
    })
  }
},

save(e) {
  wx.getUserProfile({
    desc: '用于完善会员资料', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
    success: resUser => {
      wx.login({
        success: (res) => {
          this.setData({
            code: res.code
          })
          var avatarUrl = this.data.avatarUrl;
          var userName = this.data.nickName;
          var gbDisId = this.data.disId;
          var code = this.data.code;
          var depFatherId = this.data.depFatherId;
          var depId = this.data.depId;
          var gbDisId = this.data.disId;
          var admin = this.data.admin;
          load.showLoading("保存修改内容")
          console.log(userName + gbDisId + code + "adin==" + admin)
          gbPurchaserRegitsteWithFile(avatarUrl, userName, code, admin, gbDisId, depFatherId, depId).then((res) => {
            console.log(res);
            load.hideLoading();
            const jsonObject = JSON.parse(res.result);
            if (jsonObject.code === 0) {

              wx.setStorageSync('disInfo', jsonObject.data.disInfo);
              wx.setStorageSync('userInfo', jsonObject.data.depUser);

              wx.redirectTo({
                url: '/subPackage-mendian/pages/order/chefOrderDep/chefOrderDep',
              });

            }

          })


        }
      })
    }
  })

},






})