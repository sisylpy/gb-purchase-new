
var load = require('../../../lib/load.js');
const globalData = getApp().globalData;
import apiUrl from '../../../config/index.js';
import {
  indexJrdhUserLoginJj,
  jrdhSellerRegisterWithFileGbJj
} from '../../../services/depOrder';




Page({
 
  
  onLoad: function (options) {
    let windowInfo = wx.getWindowInfo();
     let globalData = getApp().globalData;
     this.setData({
       windowWidth: windowInfo.windowWidth * globalData.rpxR,
       windowHeight: windowInfo.windowHeight * globalData.rpxR,
       navBarHeight: globalData.navBarHeight * globalData.rpxR,
       statusBarHeight: globalData.statusBarHeight * globalData.rpxR,

      url: apiUrl.server,
      disId: options.disId,
     });
     

    this._userLogin();
 
  },


  //swiper one before
  _userLogin() {
    wx.login({
      success: (resLogin) => {
        jrdhPurchaserUserLogin(resLogin.code)
          .then((res) => {
            if (res.result.code !== -1) {
              console.log(res.result.data)
              this.setData({
                userInfo: res.result.data,
                isSellRegiste: false
              })
             
              //跳转到首页
            } else {
               this.setData({
                isSellRegiste: true
               })
            }
          })
      }
    })
  },

  


  getNickName(e) {
    this.setData({
      nickName: e.detail.value,
    })
    if (e.detail.value.length > 0) {
      this.setData({
        canSave: true,
      })
    } else {
      this.setData({
        canSave: false
      })
    }
  },


  tishi() {
    if (!this.data.canSave) {
      wx.showToast({
        title: '请输入用户名',
        icon: 'none'
      })
    } else {
      wx.getUserProfile({
        desc: '用于完善会员资料', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
        success: resUser => {
          wx.login({
            success: (res) => {
              this.setData({
                code: res.code
              })
            }
          })
        }
      })
    }

  },

  // 实时获取输入内容（可选）
  onNicknameInput(e) {
    const value = e.detail.value;
    this.setData({
      nickName: value
    });this._checkRegister();
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
    if (!this.data.canRegister) {
      if (this.data.avatarUrl == '/images/user.png') {
        wx.showToast({
          title: '请选择头像',
          icon: 'none'
        })
      } else if (this.data.nickname !== "") {
        wx.showToast({
          title: '请选择微信昵称',
          icon: 'none'
        })
      }

    } else {
      wx.getUserProfile({
        desc: '用于完善会员资料', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
        success: resUser => {
          wx.login({
            success: (res) => {
              this.setData({
                code: res.code
              })
              var that = this;
              var src = [];
              src.push(this.data.avatarUrl)
              var filePathList = src;
              var userName = this.data.nickName;
              var gbDisId = this.data.disId;
              var code = this.data.code;
              var admin = 4;
              var buyUserId = this.data.buyUserId;
              load.showLoading("保存修改内容");
              jrdhSellerRegisterWithFileGbJj(filePathList, userName, code, admin, gbDisId, buyUserId, this.data.depId).then((res) => {
                load.hideLoading();
                if (res.result == '{"code":0}') {
                  this.setData({
                    isSellRegiste: false,
                    canSave: false
                  })

                  that._userLogin();

                }

              })


            }
          })
        }
      })
    }


  },

  sellRegiste() {
    wx.getUserProfile({
      desc: '用于完善会员资料', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: resUser => {
        wx.login({
          success: (res) => {
            this.setData({
              code: res.code
            })
          }
        })
      }
    })
  },




  
});
