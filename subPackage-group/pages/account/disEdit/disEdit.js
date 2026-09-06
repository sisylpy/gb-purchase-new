

const globalData = getApp().globalData;
var load = require('../../../../lib/load.js');

import {
  getDisInfo,
  updateDisContent
} from '../../../../services/apiDistributerGbUser'

Page({


  onShow(){


    // 推荐直接用新API
    let windowInfo = wx.getWindowInfo();
    let globalData = getApp().globalData;
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
    });

    getDisInfo(this.data.disInfo.gbDistributerId).then(res =>{
      if(res.result.code == 0){
        this.setData({
          disInfo: res.result.data,
        })
      }
    })
  },
  

  /**
   * 页面的初始数据
   */
  data: {
    editNow: false,
    showName: false,
    showPhone: false,
    showRecordSeconds: false, // 录音时长编辑弹窗显示状态
    recordSecondsInput: '', // 录音时长输入值
    showStockCycle: false, // 库存显示周期选择弹窗显示状态
    selectedStockCycle: 0, // 选中的库存周期
  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    
    var disInfo = wx.getStorageSync('disInfo');
    if (disInfo) {
       this.setData({
        disInfo: disInfo
       })
      }
      var userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
         this.setData({
          userInfo: userInfo
         })
        }
  },



  //选择图片
  choiceImgUser: function (e) {
    var _this = this;

    wx.chooseImage({
      count: 1, // 最多可以选择的图片张数，默认9
      sizeType: ['original', 'compressed'], // original 原图，compressed 压缩图，默认二者都有
      sourceType: ['album', 'camera'], // album 从相册选图，camera 使用相机，默认二者都有
      success: function (res) {
        _this.setData({
          src: res.tempFilePaths,
        })
        var filePathList = _this.data.src;
        var userName = _this.data.userInfo.gbDuWxNickName;
        var userId = _this.data.userInfo.gbDepartmentUserId;
        load.showLoading("保存修改内容")
        jjPurchaserUserUpdateWithFile(filePathList, userName, userId).then(res => {
          const jsonObject = JSON.parse(res.result);
          load.hideLoading();
          if (jsonObject.code === 0) {
            _this.setData({
              userInfo: jsonObject.data,
            })
            let pages = getCurrentPages();
          let prevPage = pages[pages.length - 2];
          prevPage.setData({
            userInfo: jsonObject.data
          })
            wx.setStorageSync('userInfo', jsonObject.data)
            
          }else{
            wx.showToast({
              title: '修改失败',
              icon: 'none'
            })
          }   
        })
        // _this._checkSave();
      },
      fail: function () {
        // fail
      },
      complete: function () {
        // complete
      }
    })

  },

  

  //选择图片
  choiceImg: function (e) {
    var _this = this;
    wx.chooseImage({
      count: 1, // 最多可以选择的图片张数，默认9
      sizeType: ['compressed'], // original 原图，compressed 压缩图，默认二者都有
      sourceType: ['album', 'camera'], // album 从相册选图，camera 使用相机，默认二者都有
      success: function (res) {
        _this.setData({
          src: res.tempFilePaths,
        })
        var userId = _this.data.disInfo.gbDistributerId;
      updateGbDistributerWithFile(_this.data.src, userId).then(res => {
        const jsonObject = JSON.parse(res.result);
          if (jsonObject.code === 0) {
            _this.setData({
              disInfo: jsonObject.data,
            })

          }
        })
      
        
      },
      fail: function () {
        // fail
      },
      complete: function () {
        // complete
      }
    })

  },

  toFood(){
    wx.navigateTo({
      url: '../food/index/index',
    })

  },

  showDisName(){
    this.setData({
      showName: true,
    })
  },

getName(e){
  var data = "disInfo.gbDistributerName";
  this.setData({
    [data]: e.detail.value
  })
},


  showDisPhone(){

    this.setData({
      showPhone: true,
      editNow: true
    })

  },  

  // 显示录音时长编辑弹窗
  showRecordSeconds(){
    this.setData({
      showRecordSeconds: true,
      recordSecondsInput: this.data.disInfo.gbDistributerRecordSeconds || '',
      editNow: true
    })
  },

  // 显示库存显示周期选择弹窗
  showStockCycle(){
    this.setData({
      showStockCycle: true,
      selectedStockCycle: this.data.disInfo.gbDistributerStockCycle || 0,
      editNow: true
    })
  },

  // 获取录音时长输入值
  getRecordSeconds(e){
    var data = "recordSecondsInput";
    this.setData({
      [data]: e.detail.value
    })
  },

  // 更新录音时长
  updateRecordSeconds(){
    const newRecordSeconds = parseInt(this.data.recordSecondsInput);
    
    if (!newRecordSeconds || newRecordSeconds <= 0) {
      wx.showToast({
        title: '请输入有效的录音时长',
        icon: 'none'
      });
      return;
    }

    // 更新本地数据
    var data = "disInfo.gbDistributerRecordSeconds";
    this.setData({
      [data]: newRecordSeconds,
      showRecordSeconds: false,
      editNow: false
    });

    // 调用API更新服务器数据
    var user = this.data.disInfo;
    updateDisContent(user).then(res => {
      if(res.result.code == 0){
        wx.showToast({
          title: '录音时长更新成功',
          icon: 'success'
        });
        
        // 更新本地存储
        wx.setStorageSync('disInfo', this.data.disInfo);
        
        // 更新上一页数据
        let pages = getCurrentPages();
        if (pages.length > 1) {
          let prevPage = pages[pages.length - 2];
          prevPage.setData({
            disInfo: this.data.disInfo
          });
        }
      } else {
        wx.showToast({
          title: '更新失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      });
    });
  },

  // 选择库存显示周期
  selectStockCycle(e){
    const cycle = parseInt(e.currentTarget.dataset.cycle);
    this.setData({
      selectedStockCycle: cycle
    });
  },

  // 隐藏库存周期选择弹窗
  hideStockCycleModal(){
    this.setData({
      showStockCycle: false,
      editNow: false
    });
  },

  // 更新库存显示周期
  updateStockCycle(){
    const newCycle = this.data.selectedStockCycle;
    
    // 更新本地数据
    var data = "disInfo.gbDistributerStockCycle";
    this.setData({
      [data]: newCycle,
      showStockCycle: false,
      editNow: false
    });

    // 调用API更新服务器数据
    var user = this.data.disInfo;
    updateDisContent(user).then(res => {
      if(res.result.code == 0){
        wx.showToast({
          title: '库存显示周期更新成功',
          icon: 'success'
        });
        
        // 更新本地存储
        wx.setStorageSync('disInfo', this.data.disInfo);
        
        // 更新上一页数据
        let pages = getCurrentPages();
        if (pages.length > 1) {
          let prevPage = pages[pages.length - 2];
          prevPage.setData({
            disInfo: this.data.disInfo
          });
        }
      } else {
        wx.showToast({
          title: '更新失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      });
    });
  },

  getPhone(e){
    var data = "disInfo.gbDistributerPhone";
    this.setData({
      [data]: e.detail.value,
    })
  },

  finish(){
    this.setData({
      editNow: false
    })
  },
  stopPropagation(){
   this.setData({
    editNow: true,
   })
  },

  updateInfo(){
    this.setData({
      editPhone: false,
      editName: false,
      editNow: false
    })
    var user = this.data.disInfo;
    updateDisContent(user).then(res =>{
      if(res.result.code == 0){
        this.setData({
          showOperation: false,
          editNow: false
        })
      }
    })
  },


  requestSubscribeMessage() {
    wx.requestSubscribeMessage({
      tmplIds: [
        'wCtYVih8kAdCHjfaYL1qwOtQnmQEKAGO_EgRmlB6cOE',
        'TE6HIkd7LRQ08zdnQXowRjZu8OBK0eGEd368p2NtTeA'
      ],
      success: (res) => {
        if (res[
        'wCtYVih8kAdCHjfaYL1qwOtQnmQEKAGO_EgRmlB6cOE',
          'TE6HIkd7LRQ08zdnQXowRjZu8OBK0eGEd368p2NtTeA'
        ] === 'accept') {
          this.showSucessModal();
        } else {
          // 可选：提示用户去设置页重新开启
          this.showGuideModal();
        }
      },
      fail: (err) => {
        console.error("订阅失败:", err);
      }
    });
  },

  showSucessModal(){
    
    wx.showModal({
      title: '完成订阅提示',
      content: '您已订阅成功，无需重复订阅',
      confirmText: '好的',
      showCancel: false,
      success: (res) => {
        if (res.confirm) {
          // wx.navigateTo({ url: '/pages/settings/index' });
          // wx.openSetting(); // 打开微信设置页

        }
      },
      fail: (err) => {
        console.error("订阅失败:", err);
      }
    });
  },
  showGuideModal() {
    wx.showModal({
      title: '订阅提示',
      content: '开启通知后，您将及时收到订单状态提醒。您可以在“个人中心-消息设置”中重新开启。',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          // wx.navigateTo({ url: '/pages/settings/index' });
          wx.openSetting(); // 打开微信设置页

        }
      }
    });
  },



hideMask(){
  if(!this.data.editNow){

    this.setData({
      showName:false,
      showPhone: false,
      showRecordSeconds: false,
      showStockCycle: false
    })
  }
},


toPayPage(){
  wx.navigateTo({
    url: '../payPage/payPage?type=0',
  })
},

toGuanli(){

  wx.navigateToMiniProgram({
    appId: "wxd18ed10d341c957b",
    path: '/pages/inviteAdmin/inviteAdmin?disId=' + this.data.disInfo.gbDistributerId,
    envVersion: 'release', //release develop trial
    success(res) {
      // that.setData({
      //   toOpenMini: false
      // })
    }
  })
},

toPayList(){
  wx.navigateTo({
    url: '../payList/payList',
  })
},

toGroupGoods(){
  wx.navigateTo({
    url: '/subPackage-group/pages/goods/resGoods/resGoods',
  })
},


toFood(){
  wx.navigateTo({
    url: '/subPackage-group/pages/food/index/index',
  })
},


toReportStock(){
  wx.navigateTo({
    url: '/subPackage-charts/pages/report/reportPage/reportPage',
  })
},



toBack(){
  wx.navigateBack({
    delta :1
  })
}






})
