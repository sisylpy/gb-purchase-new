const globalData = getApp().globalData;
var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'

// import {
//   getSubDepartmentsGb,
// } from '../../../../lib/apiDepOrder'

// import {
//   gbPurchaserRegitsteWithFile,
//   depOrderUserSaveWithFileGb,
//   gbLogin,
// } from '../../../../lib/apiDistributer'

Page({

  /**
   * 页面的初始数据
   */
  data: {

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    console.log(options)
    // 遍历 options，找到包含 `?` 的键并提取 query
    let queryString = '';
    for (const key in options) {
      if (key.includes('?')) {
        queryString = key.split('?')[1]; // 提取 `?` 后的部分
        break;
      }
    }

    // 合并 queryString 和 options 的剩余字段
    const fullQuery = queryString + '&' + Object.entries(options)
      .filter(([key]) => !key.includes('?'))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    // 解析为对象
    const params = this.parseQuery(fullQuery);

    
    // 设置页面数据
    console.log('解析后的参数:', params);
    this.setData({
      disId: params.disId || '',
      depFatherId: params.depFatherId || '',
      depId: params.depId || '', // 添加 depId 参数
    });
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      showDepartment: false,
      nickName: "",
      depFatherId: options.depFatherId,
      disId: options.disId,
      depId: options.depId, // 添加 depId 参数
      admin: options.admin,
      avatarUrl: "/images/user.png",
      canRegister: false,
    })

    load.showLoading("获取子部门")
    getSubDepartmentsGb(this.data.depFatherId).then(res => {
      console.log("fdfa")
      if (res.result.code == 0) {
        load.hideLoading();
        
        // 根据传入的 depId 自动选择对应的部门
        let defaultDeptIndex = 0;
        let defaultDeptName = res.result.data[0].gbDepartmentName;
        let defaultDeptId = res.result.data[0].gbDepartmentId;
        
        console.log('当前 depId:', this.data.depId);
        console.log('子部门列表:', res.result.data);
        
        if (this.data.depId) {
          // 查找匹配的部门
          const targetDept = res.result.data.find(item => item.gbDepartmentId == this.data.depId);
          console.log('找到的目标部门:', targetDept);
          if (targetDept) {
            defaultDeptName = targetDept.gbDepartmentName;
            defaultDeptId = targetDept.gbDepartmentId;
            // 找到匹配部门的索引
            defaultDeptIndex = res.result.data.findIndex(item => item.gbDepartmentId == this.data.depId);
            console.log('自动选择部门:', defaultDeptName, 'ID:', defaultDeptId);
          }
        }
        
        this.setData({
          subDepArr: res.result.data,
          selDepartmentName: defaultDeptName,
          nxDuDepartmentId: defaultDeptId,
        })
      } else {
        wx.showToast({
          title: '获取部门失败',
        })
      }
    })

    this._aaa();
    // this._userLogin();
  },

  
  // 工具函数：解析查询字符串
  parseQuery: function (queryString) {
    const params = {};
    queryString.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      if (key) params[key] = decodeURIComponent(value || '');
    });
    return params;
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

  showDepartment() {
    this.setData({
      showDepartment: true,
    })

  },
  hideNumber() {
    this.setData({
      showDepartment: false,
    })
  },

  selDepartment(e) {
    var id = e.currentTarget.dataset.id;
    var name = e.currentTarget.dataset.name;
    this.setData({
      selDepartmentName: name,
      showDepartment: false,
      nxDuDepartmentId: id,
    })

  },






//swiper one before
_userLogin() {
  console.log("_userLogin")
  wx.login({
    success: (resLogin) => {
      gbLogin(resLogin.code)
        .then((res) => {
          if (res.result.code !== -1) {
          
            wx.redirectTo({
              url: '/subPackage-ai/pages/ai/chefOrderDep/chefOrderDep',
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

  if(!this.data.canRegister){
    if(this.data.avatarUrl == '/images/user.png'){
     wx.showToast({
       title: '请选择头像',
       icon: 'none'
     })
    }else if(this.data.nickname !== ""){
     wx.showToast({
       title: '请选择微信昵称',
       icon: 'none'
     })
    }
 
  }else{

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
          var depId = this.data.nxDuDepartmentId;
          var gbDisId = this.data.disId;
          var admin = this.data.admin;
          load.showLoading("保存修改内容")
          console.log(avatarUrl, userName, code, admin, gbDisId, depFatherId, depId)
          gbPurchaserRegitsteWithFile(avatarUrl, userName, code, admin, gbDisId, depFatherId, depId).then((res) => {
            load.hideLoading();
            console.log(res);
            const jsonObject = JSON.parse(res.result);
            if (jsonObject.code === 0) {

              wx.setStorageSync('disInfo', jsonObject.data.disInfo);
              wx.setStorageSync('userInfo', jsonObject.data.depUserInfo);
              wx.setStorageSync('orderDepInfo', jsonObject.data.depInfo);
              wx.redirectTo({
                url: '/subPackage-ai/pages/ai/chefOrderDep/chefOrderDep',
              });

            }else{
             wx.showToast({
               title: jsonObject.msg,
               icon: 'none'
             })
            }

          })


        }
      })
    }
  })
}

},









})