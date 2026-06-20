

var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
var purchaseContext = require('../../../../lib/purchaseContext');
var dateUtils = require('../../../../lib/dateUtil');
import apiUrl from '../../../../config/index.js'
import {
  getStoreDetailGb,
  updateGroupNameGb,
  deleteDepartment,
} from '../../../../services/mendian.js'
import { getDisInfo } from '../../../../services/apiDistributerGbUser.js'

Page({

  onShow() {
    this._initData();
  },


  onLoad() {

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server ,
    })
    var depInfo = wx.getStorageSync('mendianInfo');
    if(depInfo){
      this.setData({
        depInfo: depInfo,
        depId: depInfo.gbDepartmentId,
      })
    }

    var userInfo = wx.getStorageSync('userInfo');
    if(userInfo){
      this.setData({
        userInfo: userInfo,
        disId: userInfo.gbDuDistributerId,
      })
    }
  },

  
  _initData() {
    load.showLoading("获取门店")
    getStoreDetailGb(this.data.depId).then(res => {
      if (res.result.code == 0) {
        load.hideLoading();
        var detail = res.result.data;
        this.setData({
          depUsers: detail.users || [],
          subDepartments: detail.subDepartments || [],
          toAdd: false,
        })
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
    // 管理用户区域的分享：邀请管理员
    if (options.target && options.target.dataset.shareType === 'admin') {
      return {
        title: "注册京采账本小程序",
        path: '/pages/inviteAdmin/inviteAdmin?disId=' + this.data.disId
          + '&depFatherId=' + this.data.depId
          + '&depId=' + this.data.depId
          + '&depName=' + this.data.userInfo.gbDuWxNickName
          + '&admin=11',
        imageUrl: this.data.url + 'userImage/say.png',
      }
    }

    // 下单用户分享：门店级别邀请，只传 depFatherId（门店ID）
    if (options.target && options.target.dataset.shareType === 'orderUser') {
      var depFatherId = this.data.depId;
      var path = "/subPackage-mendian/pages/mendian/depUserRegister/depUserRegister?disId=" + this.data.disId + '&depFatherId=' + depFatherId + '&admin=12';
      return {
        title: "订货员注册",
        path: path,
        imageUrl: this.data.url + '/userImage/say.png',
      }
    }

    return {
      title: this.data.userInfo.gbDuWxNickName + "的订货小程序",
      path: '/pages/index/index?disId=' + this.data.disId,
      imageUrl: this.data.url + '/userImage/say.png',
    }
  },


  
  toPasteInviteUrl(e) {
    var depInfoItem = e.currentTarget.dataset.item;
    this.setData({
      depInfo: depInfoItem,
    })
    var depFatherId = encodeURIComponent(this.data.depId); // 当前门店（父部门）ID
    var depId = encodeURIComponent(depInfoItem.gbDepartmentId); // 子部门ID
    var userName = encodeURIComponent(this.data.userInfo ? this.data.userInfo.gbDuWxNickName : '');
    var url = "";
    
    if (this.data.subDepartments.length == 1) {
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
    this.setData({
      showUserMenu: false
    })
    wx.setStorageSync('purUserItem', this.data.purUserItem);
    wx.navigateTo({
      url: '../depUserEdit/depUserEdit',
    })
  },

  /** 打开用户操作菜单 */
  openUserMenu(e) {
    this.setData({
      showUserMenu: true,
      purUserItem: e.currentTarget.dataset.item,
    })
  },

  /** 关闭用户操作菜单 */
  hideUserMenu() {
    this.setData({
      showUserMenu: false,
    })
  },

  /** 采购员每日采购 */
  toPurUserDetail() {
    this.setData({
      showUserMenu: false
    })

    var item = this.data.purUserItem;
    var dateRange = dateUtils.getDateRange('thisMonth');
    wx.setStorageSync('purUserItem', item);
    wx.navigateTo({
      url: '../../management/purUserEveryDay/purUserEveryDay?purUserId=' + item.gbDepartmentUserId
        + '&startDate=' + dateRange.startDate + '&stopDate=' + dateRange.stopDate
        + '&dateType=thisMonth',
    })
  },

  /** 采购员分析 */
  toPurUserFenxi() {
    this.setData({
      showUserMenu: false
    })
    var item = this.data.purUserItem;
    wx.setStorageSync('purUserItem', item);
    var dateRange = dateUtils.getDateRange('thisMonth');
    wx.navigateTo({
      url: '/subPackage-supplier/pages/supplier/purUserFenxi/purUserFenxi?purUserId=' + item.gbDepartmentUserId
        + '&type=0&supplierId=-1&startDate=' + dateRange.startDate + '&stopDate=' + dateRange.stopDate
        + '&dateType=thisMonth',
    })
  },



  /* ========== 修改门店名称弹窗 ========== */
  showEditStoreName() {
    this.setData({
      showEditNameModal: true,
      editStoreName: this.data.depInfo.gbDepartmentName,
    })
  },

  onStoreNameInput(e) {
    this.setData({ editStoreName: e.detail.value })
  },

  hideEditNameModal() {
    this.setData({ showEditNameModal: false })
  },

  saveStoreName() {
    var name = (this.data.editStoreName || '').trim();
    if (!name) {
      wx.showToast({ title: '名称不能为空', icon: 'none' })
      return;
    }
    if (name === this.data.depInfo.gbDepartmentName) {
      this.hideEditNameModal();
      return;
    }
    load.showLoading('保存名称');
    updateGroupNameGb({
      gbDepartmentId: this.data.depInfo.gbDepartmentId,
      gbDepartmentName: name,
      gbDepartmentName: name,
    }).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        var depInfo = this.data.depInfo;
        depInfo.gbDepartmentName = name;
        this.setData({
          depInfo: depInfo,
          showEditNameModal: false,
        })
        wx.setStorageSync('mendianInfo', depInfo);
        // 同步更新上一个页面的 mendianInfo
        var pages = getCurrentPages();
        if (pages.length > 1) {
          var prevPage = pages[pages.length - 2];
          if (prevPage.setData) {
            prevPage.setData({ mendianInfo: depInfo });
          }
        }
        // 重新获取 DisInfo 并更新缓存
        getDisInfo(this.data.disId).then(disRes => {
          if (disRes.result.code == 0) {
            wx.setStorageSync('disInfo', disRes.result.data);
          }
        })
        wx.showToast({ title: '修改成功', icon: 'none' });
      } else {
        wx.showToast({ title: res.result.msg || '修改失败', icon: 'none' });
      }
    })
  },

  preventBubble() {},

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
      var itemAttrData = "editItem.gbDepartmentName";
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

              } else if (res.confirm) {
                that.cancle();
              }
            }
          })
        }

      })

  },

  setSubDeps(e){
    if(e.currentTarget.dataset.count > 0){
      var depInfoItem = e.currentTarget.dataset.item;
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