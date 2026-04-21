var load = require('../../../lib/load.js');
const globalData = getApp().globalData;
import apiUrl from '../../../config/index'

import {
  jrdhSellerRegisterWithFileGbJj,
  whichJrdhUserLoginGbJj,
  sellUserReadDisBatchGb,
  sellerFinishPurchaseGoodsBatchGb,
  supplierEditBatchGb,
  supplierDeleteDisPurBatchGbItem,
  supplierInitWeightPurItem,
  getDisPurchaseGoodsBatchGb,
} from '../../../services/depOrder'

import dateUtil from '../../../lib/dateUtil';

Page({

  onShow() {

    // 推荐直接用新API
    let windowInfo = wx.getWindowInfo();
    let globalData = getApp().globalData;
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      numWidth: (globalData.windowWidth / 4) * globalData.rpxR - 40,
      numContainerWidth: (globalData.windowWidth / 4) * globalData.rpxR - 20,
      numHeight: (globalData.windowWidth / 4) * globalData.rpxR - 40,
      numContainerHeight: (globalData.windowWidth / 4) * globalData.rpxR - 20,
      btnWidth: (globalData.windowWidth / 8) * globalData.rpxR - 20,
      btnWidthContainer: (globalData.windowWidth / 8) * globalData.rpxR,
      bigBtnWidth: (globalData.windowWidth / 6) * globalData.rpxR - 20,
      bigBtnWidthContainer: (globalData.windowWidth / 6) * globalData.rpxR,
    });

    console.log("🔄 页面显示，准备刷新数据...");
    console.log("userInfo:", this.data.userInfo);
    console.log("isSellRegiste:", this.data.isSellRegiste);

    if (this.data.jrdhUserInfo !== null) {
      console.log("aaaaa")
      // 用户已登录，隐藏注册弹窗并刷新数据
      this.setData({
        isSellRegiste: false
      });
      this._getInitData();
    } else {
      console.log("_userLogin_userLogin")
      this._userLogin();
    }

  },

  data: {
    bottomHeight: 240,
    formHeight: 480,
    isTishi: false,
    isTishiSave: false,
    lastInput: true,
    focusIndex: -1,
    isSellRegiste: false,
    toPrice: false,
    saveBatch: false,
    retName: "",
    batchId: null,
    sendSuccess: false,
    helpWeight: "0",
    scaleInput: false,
    buyUser: false,
    canSave: false,
    nickName: "",
    jrdhUserInfo: null,
  },

  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      numWidth: (globalData.windowWidth / 4) * globalData.rpxR - 40,
      numContainerWidth: (globalData.windowWidth / 4) * globalData.rpxR - 20,
      numHeight: (globalData.windowWidth / 4) * globalData.rpxR - 40,
      numContainerHeight: (globalData.windowWidth / 4) * globalData.rpxR - 20,
      btnWidth: (globalData.windowWidth / 8) * globalData.rpxR - 20,
      btnWidthContainer: (globalData.windowWidth / 8) * globalData.rpxR,
      bigBtnWidth: (globalData.windowWidth / 6) * globalData.rpxR - 20,
      bigBtnWidthContainer: (globalData.windowWidth / 6) * globalData.rpxR,
      url: apiUrl.server,
      todayDate: dateUtil.getWhichOnlyDate(0),
      orderTime: dateUtil.getOnlyTime(0),
      avatarUrl: "/images/user.png",
      canRegister: false,
      batchId: options.batchId,
      retName: options.retName,
      disId: options.disId,
      buyUserId: options.buyUserId,
      fromBuyer: options.fromBuyer,
      depId: options.depId,
    })

   

  },

  _getInitData() {
    load.showLoading("获取订货商品")
    var that = this;
    getDisPurchaseGoodsBatchGb(this.data.batchId)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {

          this.setData({
            batch: res.result.data,
            batchStatus: res.result.data.gbDpbStatus,
            disId: res.result.data.gbDpbDistributerId,
          })

          if (this.data.batchStatus == -1 && !this.data.buyUser) {
            this._shareUserRead();
          }
          //计算等待出库的商品个数 waitWeightCount 计算batch.gbDPGEntities 的 gbDpgStatus == 1 
          var waitWeightCount = 0;
          for (var i = 0; i < this.data.batch.gbDPGEntities.length; i++) {
            if (this.data.batch.gbDPGEntities[i].gbDpgStatus < 2) {
              waitWeightCount++;
            }
          }

          console.log("📊 重新计算 waitWeightCount:", waitWeightCount);
          console.log("📊 商品状态详情:");
          for (var i = 0; i < this.data.batch.gbDPGEntities.length; i++) {
            var item = this.data.batch.gbDPGEntities[i];
            console.log(`  商品${i}: gbDpgStatus=${item.gbDpgStatus}, gbDpgIsCheck=${item.gbDpgIsCheck}`);
          }

          for (var i = 0; i < this.data.batch.gbDPGEntities.length; i++) {
            var item = this.data.batch.gbDPGEntities[i];

            // 初始化为false
            item.gbDpgIsCheck = false;

            if (item.gbDpgStatus == 2) {

              if (item.gbDepartmentOrdersEntities && item.gbDepartmentOrdersEntities.length > 0) {
                for (var j = 0; j < item.gbDepartmentOrdersEntities.length; j++) {
                  var order = item.gbDepartmentOrdersEntities[j];
                  if (order.gbDoBuyStatus == 3) {
                    console.log(`  订单${j}状态为3，设置gbDpgIsCheck=true`);
                    item.gbDpgIsCheck = true;
                    break; // 找到一个状态为3的订单就够了
                  }
                }
              } else {
                console.log(`商品${i}没有订单数据`);
              }
            } else {

            }

            console.log(`商品${i}最终gbDpgIsCheck=${item.gbDpgIsCheck}`);
          }
          this.setData({
            waitWeightCount: waitWeightCount,
            batch: this.data.batch,
          })

        } else {
          this.setData({
            billCancle: true,
          })

          // 订货取消后等待3秒再跳转
          wx.showToast({
            title: '，3秒后跳转...',
            icon: 'none',
            duration: 3000
          });
        
          setTimeout(() => {
            console.log("athhthta", that.data.buyUser)
            if(that.data.buyUser){
              wx.redirectTo({
                url: '../../../../pages/index/index',
              })
            }else{
              wx.redirectTo({
                url: '../jinriListWithLogin/jinriListWithLogin',
              })
            }
          

          }, 3000);
        }
      })
  },


  _userLogin() {
    //jrdh用户登陆，默认是供货商卖方
    var that = this;
    wx.login({
      success: (res) => {

        var data = {
          gbDisId: this.data.disId,
          code: res.code,
          batchId: this.data.batchId,
          gbDepId: this.data.depId,
          buyUserId: this.data.buyUserId,
        }
        whichJrdhUserLoginGbJj(data)
          .then((res) => {
            console.log("logingingingi", res.result)
            if (res.result.code == 0) {
              that.setData({
                disInfo: res.result.data.disInfo,
              })

              if (res.result.data.code !== -1) {
                that.setData({
                  buyUser: res.result.data.buyUser,
                  supplierInfo: res.result.data.supplierInfo,
                  userInfo: res.result.data.userInfo, // 设置userInfo，防止重复登录
                  isSellRegiste: false // 确保登录成功后不显示注册弹窗
                })
                if (!res.result.data.buyUser) {
                  that.setData({
                    jrdhUserInfo: res.result.data.userInfo,
                    supplierInfo: res.result.data.supplierInfo,
                  })
                  wx.setStorageSync('jrdhUserInfo', res.result.data.userInfo);
                  wx.setStorageSync('supplierInfo', res.result.data.supplierInfo);

                }
                that._getInitData();
              } else {
                //采购员登陆失败
                that.setData({
                  isSellRegiste: true
                })
              }
            
            }
          })
      }
    })
  },


  _shareUserRead() {
    var that = this;
    var batch = that.data.batch;
    batch.gbDpbSellUserId = that.data.jrdhUserInfo.nxJrdhUserId;
    batch.gbDpbBuyUserId = that.data.buyUserId;
    batch.gbDpbSellUserOpenId = that.data.jrdhUserInfo.nxJrdhWxOpenId;
    batch.gbDpbSupplierId = that.data.supplierInfo.nxJrdhSupplierId;
    sellUserReadDisBatchGb(batch)
      .then(res => {
        if (res.result.code == 0) {
          this.setData({
            isTishi: false,
            batch: res.result.data,
            batchStatus: res.result.data.gbDpbStatus,
          })

        }
      })
  },

  getSupplierBatch(e) {

    wx.redirectTo({
      url: '../supplierBills/supplierBills?sellUserId=' + this.data.batch.gbDpbSellUserId + '&disId=' + this.data.disId,
    })

  },

  onShareAppMessage(e) {
    if (e.target.dataset.type == 'outOrder') {
      return {
        title: '转发订货',
        path: '/subPackage-supplier/pages/gbOrderBatch/gbOrderBatch?batchId=' + this.data.batchId +
          '&retName=' + this.data.retName + '&disId=' + this.data.disId + '&fromBuyer=0',
        envVersion: 'release', //release develop trial
        imageUrl: '',
      }
    }
    if (e.target.dataset.type == 'inOrder') {
      var shareObj = {
        imageUrl: '',
      }
      shareObj.title = "请称重这些订单"
      shareObj.path = '/subPackage-supplier/pages/gbOrderBatch/gbOrderBatch?batchId=' + this.data.batchId + '&retName=' + this.data.retName + '&helpWeight=1';
      return shareObj;
    }
  },



  sellerCheckUnPay() {
    //本页面的this.data.batch.gbDpbSupplierId 供货商 Id，去寻找返回页面customerArr 的 item.nxJrdhSupplierId,
    console.log('=== gbOrderBatch toBack 开始 ===');
    console.log('this.data.batch:', this.data.batch);
    console.log('this.data.batch.gbDpbSupplierId:', this.data.batch.gbDpbSupplierId);

    // 存储供货商ID，用于返回时自动选择
    wx.setStorageSync('returnSupplierId', this.data.batch.gbDpbSupplierId);
    console.log('已存储 returnSupplierId:', this.data.batch.gbDpbSupplierId);


    wx.redirectTo({
      url: '../jinriListWithLogin/jinriListWithLogin',
    })
    console.log('=== gbOrderBatch toBack 结束 ===');
  },


  showPrice() {
    this.setData({
      toPrice: true
    })
    wx.navigateTo({
      url: '../gbOrderInput/gbOrderInput?batchId=' + this.data.batchId + '&retName=' + this.data.retName,
    })
  },


  toEditOrders() {
    load.showLoading();
    supplierEditBatchGb(this.data.batch.gbDistributerPurchaseBatchId)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          this.setData({
            bill: res.result.data,
            batchStatus: res.result.data.gbDpbStatus,
          })
        }
      })
  },

  toEditOrdersNo() {
    wx.showToast({
      title: '请采购员解锁',
      icon: 'none'
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
              var that = this;
              var src = [];
              src.push(this.data.avatarUrl)
              var filePathList = src;
              var userName = this.data.nickName;
              var gbDisId = this.data.disId;
              var code = this.data.code;
              var admin = 4;
              var buyUserId = this.data.buyUserId;
              load.showLoading("保存修改内容")
              console.log(filePathList, userName, code, admin, gbDisId, buyUserId, this.data.depId);
              console.log("------------")
              jrdhSellerRegisterWithFileGbJj(filePathList, userName, code, admin, gbDisId, buyUserId, this.data.depId).then((res) => {
                console.log(res);
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




  // 

  showOperation(e) {
    var index = e.currentTarget.dataset.index;
    var item = this.data.batch.gbDPGEntities[index];
    this.setData({
      showOperation: true,
      editPurGoods: item,
      index: index,

    })
  },

  hideMask() {
    this.setData({
      showOperation: false,
      editPurGoods: "",
      index: "",
    })
  },


  canclePurGoods(e) {
    var item = this.data.editPurGoods;
    this.setData({
      showOperation: false,
      popupType: 'deletePurGoods',
      showPopupWarn: true,
      warnContent: item.gbDgGoodsName,
    })
  },


  confirmWarn() {
    var id = this.data.editPurGoods.gbDistributerPurchaseGoodsId;
    supplierDeleteDisPurBatchGbItem(id)
      .then(res => {
        if (res.result.code == 0) {
          this._getInitData()
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })

        }
      })
  },


  againWeight() {
    var status = this.data.editPurGoods.gbDpgStatus;
    if (status < 2) {
      this.setData({
        showOperation: false
      })
      wx.showToast({
        title: '此商品还没有出库',
        icon: 'none'
      })
    } else {
      load.showLoading("重新出库称重此商品");
      var id = this.data.editPurGoods.gbDistributerPurchaseGoodsId;
      supplierInitWeightPurItem(id)
        .then(res => {
          load.hideLoading();
          if (res.result.code == 0) {
            this.setData({
              showOperation: false
            })
            this._getInitData()
          } else {
            wx.showToast({
              title: res.result.msg,
              icon: 'none'
            });

          }
        })
    }

  },

  closeWarn() {
    this.setData({
      editPurGoods: "",
      index: "",
      showPopupWarn: false,
      warnContent: "",

    })

  },


  onShareAppMessage(e) {
    var shareObj = {
      imageUrl: '',
    }
    shareObj.title = "请称重这些订单"
    shareObj.path = '/subPackage-supplier/pages/gbOrderWeight/gbOrderWeight?batchId=' + this.data.batchId + '&retName=' + this.data.retName;
    return shareObj;
  },

  toBack() {
   
    // 存储供货商ID，用于返回时自动选择
    wx.setStorageSync('returnSupplierId', this.data.batch.gbDpbSupplierId);

    //就在上一个页面customerArr中选择供货商后，设置
    var pages = getCurrentPages();
    var prevPage = pages[pages.length - 2];
    prevPage.setData({
      supplierId: this.data.batch.gbDpbSupplierId,
    })

    console.log('使用 redirectTo 返回');
    wx.redirectTo({
      url: '../jinriListWithLogin/jinriListWithLogin',
    })
    console.log('=== gbOrderBatch toBack 结束 ===');
  },


  showPrice() {
    this.setData({
      toPrice: true
    })
    wx.navigateTo({
      url: '../gbOrderInput/gbOrderInput?batchId=' + this.data.batchId + '&retName=' + this.data.retName,
    })
  },



  toEditOrders() {
    load.showLoading("修改订货");
    supplierEditBatchGb(this.data.batch.gbDistributerPurchaseBatchId)
      .then(res => {

        load.hideLoading();
        if (res.result.code == 0) {
          this._getInitData();
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
      })
  },

  toEditOrdersNo() {
    wx.showToast({
      title: '请采购员解锁',
      icon: 'none'
    })
  },



  toWeight() {
    wx.navigateTo({
      url: '../gbOrderWeight/gbOrderWeight?batchId=' + this.data.batchId,
    })
  },


  showShareTishi() {
    console.log('检查完成订货条件...');

    // 重新计算等待出库的商品个数，确保数据准确
    var waitWeightCount = 0;
    for (var i = 0; i < this.data.batch.gbDPGEntities.length; i++) {
      if (this.data.batch.gbDPGEntities[i].gbDpgStatus < 2) {
        waitWeightCount++;
      }
    }

    // 更新数据
    this.setData({
      waitWeightCount: waitWeightCount
    });

    // 检查是否有未完成订单
    if (waitWeightCount > 0) {
      wx.showModal({
        title: "有" + waitWeightCount + "个未完成订单",
        content: "请输入数据或请采购员取消未完成订单",
        showCancel: false,
        confirmText: "知道了",
      })
      return;
    }

    // 检查是否有商品单价没有录完
    var uncheckedCount = 0;
    for (var i = 0; i < this.data.batch.gbDPGEntities.length; i++) {
      var item = this.data.batch.gbDPGEntities[i];
      if (!item.gbDpgIsCheck) {
        uncheckedCount++;
      }
    }

    console.log('未录完单价的商品数量:', uncheckedCount);

    if (uncheckedCount > 0) {
      wx.showModal({
        title: "单价没有录完",
        content: "还有" + uncheckedCount + "个商品单价未录入完成",
        showCancel: false,
        confirmText: "知道了",
      })
      return;
    }

    // 所有条件都满足，显示完成订货弹窗
    var that = this;
    that.setData({
      isTishi: true,
    })
  },

  // 处理支付方式选择
  radioChange(e) {
    var payType = parseInt(e.detail.value);
    this.setData({
      ["batch.gbDpbPayType"]: payType
    });
  },

  cancelCostBatch() {
    this.setData({
      isTishi: false
    })
  },



  sendSucess() {
    if (this.data.batch.gbDpbPayType == null) {
      wx.showToast({
        title: '请选择支付方式',
        icon: 'none'
      })
    } else {
      load.showLoading("保存订单");
      sellerFinishPurchaseGoodsBatchGb(this.data.batch)
        .then(res => {
          load.hideLoading();
          if (res.result.code == 0) {
            // 先跳转页面，再处理订阅消息
            wx.redirectTo({
              url: '../jinriListWithLogin/jinriListWithLogin',
            })

            // 延迟处理订阅消息，避免阻塞页面跳转
            setTimeout(() => {
              this.requestSubscribeMessage();
            }, 500);

          } else {
            wx.showToast({
              title: res.result.msg,
              icon: 'none'
            })
          }
        })
    }

  },

  // 独立的订阅消息处理方法
  requestSubscribeMessage() {
    wx.requestSubscribeMessage({
      tmplIds: [
        'CgludlqVZc_vmFaZUgVFC-iprkydrtOfF_GcODltpTc',
        'wCtYVih8kAdCHjfaYL1qwOtQnmQEKAGO_EgRmlB6cOE',
        '_KhWtCVg3fIBH-tHqSV0hUk5m_vuKmxw1CGn0PEv6D0'
      ],
      success(res) {
        console.log("订阅消息成功", res);
      },
      fail(res) {
        console.log('订阅消息失败', res);
        // 订阅失败不影响业务流程，只记录日志
      }
    })
  },

  toIndex() {
    wx.redirectTo({
      url: '../../../../pages/index/index',
    })
  },


})
