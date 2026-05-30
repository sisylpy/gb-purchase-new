

var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
var purchaseContext = require('../../../../lib/purchaseContext');
import apiUrl from '../../../../config/index.js'
import {
  getDepUsersByFatherIdGb,
  getSubDepartmentsGb,
  updateGroupNameGb,
  deleteDepartment,
} from '../../../services/mendian.js'

Page({


  data: {
    scrollViewTop: 0,
    isSelectFile: false,
    showPage: false, // 控制弹出层和蒙版显示
    popupAnimation: {}, // 弹出层动画

  },

  onShow() {
   
      this._initData();

      this._initDataUser();
   
  },


  onLoad() {

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
    })
    var depInfo = wx.getStorageSync('mendianInfo');
    if(depInfo){
      this.setData({
        depInfo: depInfo,
        depId: depInfo.gbDepartmentId,
      })
    }

    
  },

  _initDataUser(){
    var ui = this.data.userInfo;
    if (!ui) {
      return;
    }
    var pur = this.data.purDepInfo;
    var depIdForApi =
      pur && pur.gbDepartmentId ? pur.gbDepartmentId : ui.gbDuDepartmentId;
    getDepUsersByFatherIdGb(depIdForApi).then(res =>{
      if(res.result.code == 0){
        this.setData({
          userArr: res.result.data,
        })
      }
    })
  },

  
  _initData() {
    
    load.showLoading("获取门店")
    getSubDepartmentsGb(this.data.depId).then(res => {
      if (res.result.code == 0) {
        load.hideLoading();
        this.setData({
          depArr: res.result.data,
          // depInfo: res.result.data[0],
          toAdd: false,
        }) //创建节点选择器
       
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },

  
  editDepartment(e){
    var depInfoItem = e.currentTarget.dataset.item;
    wx.setStorageSync('depItem', depInfoItem);
    wx.navigateTo({
      url: '../depEdit/depEdit?depId=' + depInfoItem.gbDepartmentId,
    })
  },


  addSub(e){ 
   
    wx.navigateTo({
      url: '../addSubDep/addSubDep?depFatherId=' + this.data.depId,
    })
  },


  toEditMendian(e){
    var depInfoItem = e.currentTarget.dataset.item;
    console.log(e);
    wx.setStorageSync('depItem', depInfoItem);
    wx.navigateTo({
      url: '../mendianEdit/mendianEdit?depId=' + depInfoItem.gbDepartmentId,
    })
  },

  
  /**
   * 邀请采购员
   * @param {*} options 
   */
  onShareAppMessage: function (options) {

    console.log(options)
    var depIndex = options.target.dataset.index;
   
    console.log("子部门索引:", depIndex);
  
    var depFatherId = this.data.depArr[0].gbDepartmentId; // 父部门ID
    var depId = this.data.depArr[0].gbDepartmentEntityList[depIndex].gbDepartmentId; // 子部门ID
    
    console.log("父部门ID:", depFatherId, "子部门ID:", depId);
    
    var path = "/subPackage-mendian/pages/mendian/depUserRegister/depUserRegister?disId=" + this.data.disId + '&depFatherId=' + depFatherId + '&depId=' + depId + '&admin=1';
   
    console.log("分享路径:", path)

    return {
      title: "订货员注册", // 默认是小程序的名称(可以写slogan等)
      path: path,
      imageUrl: this.data.url + '/userImage/say.png',
    }
  },


  
  toPasteInviteUrl(e) {
    this.setData({
      depInfo: e.currentTarget.dataset.item,
    })
    var depFatherId = encodeURIComponent(this.data.depInfo.gbDepartmentId); // 编码参数
    var depId = encodeURIComponent(this.data.depInfo.gbDepartmentEntityList[0].gbDepartmentId); // 编码参数
    var userName = encodeURIComponent(this.data.userInfo.gbDuWxNickName); // 编码参数
    var url = "";
    
    if (this.data.depArr.length == 1 && this.data.depArr[0].gbDepartmentSubAmount == 1) {
        // 编码 query 参数
        url = `weixin://dl/business/?appid=wx1ea78d3f33234284&path=pages/groupUserRegister/groupUserRegister&query=${encodeURIComponent(`disId=${this.data.disId}&depFatherId=${depFatherId}&depId=${depId}`)}&env_version=release`;
    } else {
        url = `weixin://dl/business/?appid=wx1ea78d3f33234284&path=pages/depUserRegister/depUserRegister&query=${encodeURIComponent(`disId=${this.data.disId}&depFatherId=${depFatherId}`)}&env_version=release`;
    }

    wx.setClipboardData({
        data: url,
        success() {  
          wx.showToast({
            title: '请发送给后厨人员',
            icon: 'success',
            duration: 2000
          });
        },
        fail() {
            wx.showToast({
                title: '复制失败，请重试',
                icon: 'error',
                duration: 2000
            });
        }
    });
},




  /**
   * 删除用户
   */
  delUser(e) {
    load.showLoading("删除用户")
    deleteDepUser(e.currentTarget.dataset.id).then(res => {
      if (res.result.code !== -1) {
        load.hideLoading();
        this._initData();
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
        })
      }
    })
  },


 
  editUser(){
   
    wx.navigateTo({
      url: '../../management/disUserEdit/disUserEdit',
    })
  },



  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },


  /**
   * 
   * @param {*} e 
   */
  onPageScroll: function (e) { // 页面滚动监听
    console.log(e)
    this.setData({
      scrollViewTop: e.scrollTop * globalData.rpxR,
    })

  },

  // **** edit ****
  showChoice(e) {
    this.setData({
      showOperation: true,
      showChoice: true,
      editItem: e.currentTarget.dataset.item
    })
  },

  showEdit(e) {
    console.log(e);
    this.setData({
      showOperation: false,
      showOperationEdit: true,
      showChoice: false,
    })
  },


  updateName() {
    load.showLoading("保存修改名称")
    updateGroupNameGb(this.data.editItem).then(res => {
      if (res.result.code == 0) {
        load.hideLoading();
        wx.setStorageSync('disInfo', res.result.data)
        this.setData({
          showOperationEdit: false,
          editShow: false,
          editItem: ""
        })
        this._initData()
      }
    })
  },

  editGoodsName(e) {
    if (e.detail.value.length > 0) {
      var itemData = "editItem.gbDepartmentName";
      var itemAttrData = "editItem.gbDepartmentAttrName";
      this.setData({
        [itemData]: e.detail.value,
        [itemAttrData]: e.detail.value,
      })
    }
  },

  cancle() {
    this.setData({
      showOperation: false,
      showChoice: false,
    })
  },

  cancleEdit() {
    this.setData({
      showOperationEdit: false,
      editItem: "",
    })
  },


  
  deleteItem() {
    console.log("de");
    deleteDepartment(this.data.editItem.gbDepartmentId)
      .then(res => {
        if (res.result.code == 0) {
          wx.showToast({
            title: '删除成功',
            icon: 'none'
          })
          wx.setStorageSync('disInfo', res.result.data)
          this._initData();
          this.cancle();

        } else {
          var that = this;
          wx.showModal({
            title: res.result.msg,
            content: "请先删除门店商品、订单、用户等数据",
            showCancel: false,
            confirmText: "知道了",
            success: function (res) {
              if (res.cancel) {
                //点击取消
                console.log("您点击了取消")

              } else if (res.confirm) {
                that.cancle();
              }
            }
          })
        }

      })

  },

  setSubDeps(e){
     console.log(e.currentTarget.dataset.count);
    if(e.currentTarget.dataset.count > 0){
      var depInfoItem = e.currentTarget.dataset.item;
      console.log(e);
      wx.setStorageSync('depItem', depInfoItem);
      wx.showModal({
        title: '订货端用户冲突',
        content: '请先删除老的门店用户，设置完成部门后，请他们再按照部门重新注册',
        confirmText: "好的",
        complete: (res) => {
          
          if (res.confirm) {
            wx.navigateTo({
              url: '../mendianEdit/mendianEdit',
            })
          }
        }
      })
    }else{
      this.setData({
        showPage: true,
        mendianInfo: e.currentTarget.dataset.item,
      });
      this.showPopup();
    }
  
 },

  showPopup() {
    const animation = wx.createAnimation({
      duration: 1300,
      timingFunction: 'ease-in-out',
    });
    animation.translateY(0).step();
    this.setData({
      popupAnimation: animation.export(),
    });
  },

  hidePopup() {
    const animation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease-in-out',
    });
    animation.translateY('100%').step();
    this.setData({
      popupAnimation: animation.export(),
    });
    setTimeout(() => {
      this.setData({
        showPage: false
      });
    }, 300);
  },

  // 绑定门店名称输入
  // bindKeyInput(e) {
  //   this.setData({
  //     'mendianInfo.gbDistributerName': e.detail.value,
  //   });
  // },

  // 选择部门类型
  radioChange(e) {
    const value = parseInt(e.detail.value, 10);
    this.setData({
      hasSubs: value,
      selNumber: value === 2 ? 1 : 0, // 如果是多个部门，初始化部门数量为 1
      gbDepartmentEntities: value === 2 ? [{
        gbDepartmentName: ''
      }] : [],
    });
  },

  // 处理部门数量输入
  handleDepartmentNumber(e) {
    const num = parseInt(e.detail.value, 10);
    if (num > 0) {
      const departments = Array(num)
        .fill('')
        .map(() => ({
          gbDepartmentName: ''
        }));
      this.setData({
        selNumber: num,
        gbDepartmentEntities: departments,
      });
    }
  },

  // 更新部门名称
  getDepartmentName(e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    const departments = this.data.gbDepartmentEntities;
    departments[index].gbDepartmentName = value;
    this.setData({
      gbDepartmentEntities: departments,
    });
  },

  // 保存设置
  toSave() {
   
    if (this.data.hasSubs === 2 && this.data.selNumber > 0) {
      const incomplete = this.data.gbDepartmentEntities.some(
        (item) => !item.gbDepartmentName
      );
      if (incomplete) {
        wx.showToast({
          title: '请填写所有部门名称',
          icon: 'none'
        });
        return;
      }
    }

    var mendian = this.data.mendianInfo;
    mendian.gbDepartmentEntityList = this.data.gbDepartmentEntities;
    console.log(mendian);
    changeSingleMendian(mendian).then(res => {
      if (res.result.code == 0) {
        this.setData({
          disInfo: res.result.data,
          mendianList: res.result.data.mendianDepartmentList,
        })
        var pages = getCurrentPages();
        var prevPage = pages[pages.length - 2]; //上一个页面
        prevPage.setData({
          update: true,
          disInfo: res.result.data,
        })
        wx.setStorageSync('disInfo', res.result.data);
        this._initData();
        this.hidePopup();
      }else{
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },

  // 隐藏弹出层
  hidePopup() {
    this.setData({
      showPage: false
    });
  },

  onUnload(){
    wx.removeStorageSync('depItem');
    
  }








})