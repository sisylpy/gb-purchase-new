const globalData = getApp().globalData;
var load = require('../../lib/load.js');
var apiUrl = require('../../config/index.js');
const {
  gbPurchaserRegitsteWithFile,
  gbLogin,
} = require('../../services/apiDistributerGbUser.js');

Page({

  onShow: function () {

    // 推荐直接用新API
    let windowInfo = wx.getWindowInfo();
    let globalData = getApp().globalData;
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
    });


  },

  
  data: {
    nickName: '',

  },



  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      disId: options.disId,
      depName: options.depName,
      depFatherId: options.depFatherId,
      depId: options.depId,
      admin: 11,
      avatarUrl: "/images/user.png",
      canRegister: false,
    })
    this._userLogin();
    this._aaa()
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

  _aaa() {
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
              var avatarUrl = this.data.avatarUrl;
              var userName = this.data.nickName;
              var gbDisId = this.data.disId;
              var code = this.data.code;
              var depFatherId = this.data.depFatherId;
              var depId = this.data.depId;
              var gbDisId = this.data.disId;
              var admin = this.data.admin;
              load.showLoading("保存修改内容")
              console.log("avatarUrl=", avatarUrl, userName, code, admin, "gbDisId=", gbDisId, "depFatherId=", depFatherId, "depId=", depId)
              gbPurchaserRegitsteWithFile(avatarUrl, userName, code, admin, gbDisId, depFatherId, depId).then((res) => {
                console.log(res);
                const jsonObject = JSON.parse(res.result);
                if (jsonObject.code === 0) {

                  wx.setStorageSync('disInfo', jsonObject.data.disInfo);
                  wx.setStorageSync('userInfo', jsonObject.data.depUser);

                  wx.redirectTo({
                    url: '../index/index',
                  });

                }

              })


            }
          })
        }
      })
    }
  },

  // async onChooseAvatar(e) {
  //   // e.detail.avatarUrl 就是用户选的头像
  //   const { avatarUrl } = e.detail;

  //   // 1. 先进行表单简单验证
  //   if (!this.data.userName) {
  //     wx.showToast({ title: '请输入用户名称', icon: 'none' });
  //     return;
  //   }
  //   if (!this.data.phone) {
  //     wx.showToast({ title: '请输入联系电话', icon: 'none' });
  //     return;
  //   }

  //   // 2. 把头像赋值到 data，给前端做预览
  //   this.setData({ avatarUrl });


  //   // 2. 把头像赋值到 data，给前端做预览
  //   this.setData({ avatarUrl });

  //   // 3. 显示自定义loading（假设你有封装 load.showLoading）
  //   load.showLoading("注册小程序订货客户");

  //   console.log(
  //     this.data.avatarUrl,
  //       this.data.userName,
  //       this.data.code,       // 如果你有 code
  //       this.data.phone,
  //       this.data.depId,
  //       this.data.disId,
  //       this.data.depFatherId,
  //   )
  //   try {
  //     // 4. 调用注册接口
  //     const res = await gbPurchaserRegitsteWithFile(
  //       this.data.avatarUrl,
  //       this.data.userName,
  //       this.data.code,       // 如果你有 code
  //       this.data.phone,
  //       this.data.depId,
  //       this.data.disId,
  //       this.data.depFatherId,
  //     );

  //     load.hideLoading();
  //     console.log('注册返回:', res.result);
  //     const jsonObject = JSON.parse(res.result);
  //     if (jsonObject.code === 0) {

  //       wx.setStorageSync('disInfo', jsonObject.data.disInfo);
  //       wx.setStorageSync('userInfo', jsonObject.data.depUser);

  //       // 跳转到首页 or 其他页面
  //       wx.redirectTo({
  //         url: '../index/index?depId=' + jsonObject.data.disInfo.mendianDepartmentList[0].gbDepartmentId,
  //       });
  //     } else {
  //       load.hideLoading();
  //       wx.showToast({
  //         title: jsonObject.msg || '注册失败',
  //         icon: 'none'
  //       });
  //     }

  //   } catch (err) {
  //     load.hideLoading();
  //     console.error('注册异常', err);
  //     wx.showToast({
  //       title: '网络异常',
  //       icon: 'none'
  //     });
  //   }
  // },


});
