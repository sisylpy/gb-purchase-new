const globalData = getApp().globalData;
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil');
var apiUrl = require('../../../../config/index');
var depOrder = require('../../../../services/depOrder');

const {
  updateOrderGbJj,
  deleteOrderGb,
  subDepGetApplyAiByTime,
  subDepGetApplyAiFather,
  depSearchTodayOrders,
  gbDisDeleteStandard: disDeleteStandard,
  depReceiveStock,
} = depOrder;

Page({
  data: {
    showPage: false,
    popupAnimation: {},

    avatarUrl: '/images/user.png',
    userName: '',
    nameError: '',
    isFormValid: false,

    resFatherId: -1,
    depRecord: false,

    showPopup: false,
    popupAnim: {},

    showDepSwitch: false,
    depSwitchAnim: null,

    // 新增：数据刷新控制
    lastRefreshTime: 0,
    refreshInterval: 30000, // 

    showSwitchMenu: false,
    showType: 'time',
    searchArr: null, // 初始化为null，这样页面打开时不会显示搜索蒙版
    searchValue: '',
    hasShownNewGoodsAlert: false, // 标记是否已经显示过新商品订单提示
  },


  onShow() {

    this.setData({
      windowWidth: wx.getWindowInfo().windowWidth * globalData.rpxR,
      windowHeight: wx.getWindowInfo().windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      todayDate: dateUtils.getArriveDateString(0),

    });
   // 检查是否需要立即刷新（从添加订单页面返回）
   const needImmediateRefresh = wx.getStorageSync('needRefreshOrderData');

   if (needImmediateRefresh) {
     wx.removeStorageSync('needRefreshOrderData'); // 清除标记

     if(this.data.showType == 'time'){
      this._initDataSub();
    }else if(this.data.showType =='category'){
      this._initDataSubByFather();
    }
     return;
   }

  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

    // 处理 showType 参数，如果没有传递则设置默认值
    if (options && options.showType) {
      this.setData({
        showType: options.showType
      });
    } else {
      // 设置默认显示类型，或者从缓存中获取
      this.setData({
        showType: 'time' // 默认显示时间模式
      });
    }

    var disInfo = wx.getStorageSync('disInfo');
    if(disInfo){
      this.setData({
        disInfo: disInfo,
        mendianStoreList: disInfo.mendianDepartmentList || [],
      })
    }
    var mendianInfo = wx.getStorageSync('mendianInfo');
    if(mendianInfo){
      this.setData({
        depList: mendianInfo.gbDepartmentEntityList
      })
    }

    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        disId: userInfo.gbDuDistributerId
      })


      var depInfo = wx.getStorageSync('orderDepInfo');
      if (depInfo) {
        this.setData({
          depInfo: depInfo,
          depFatherId: depInfo.gbDepartmentFatherId,
          depId: depInfo.gbDepartmentId
        })
      }
    }
    this._initDataSub();
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    const refreshTask = this.data.showType === 'time' 
      ? this._initDataSub() 
      : this._initDataSubByFather();
    
    refreshTask.finally(() => {
      wx.stopPullDownRefresh();
    });
  },



  onNavButtonTap() {
    wx.navigateTo({
      url: '/subPackage-mendian/pages/mendian/depUserEdit/depUserEdit',
    })
  },

  toStoreAnnounce: function () {
    // 保存当前部门信息，供公告牌页面读取
    wx.setStorageSync('orderDepInfo', this.data.depInfo);
    wx.navigateTo({
      url: '/subPackage-charts/pages/storeAnnouncement/storeAnnouncement?boardType=ORDER_STAFF_DAILY_BOARD',
    });
  },




  // 点击圆形按钮，弹窗动画展开
  onFabTap() {
    this.setData({
      showPopup: true
    }, () => {
      // 动画初始化为缩小
      const anim = wx.createAnimation({
        duration: 0,
        timingFunction: 'ease',
        transformOrigin: '100% 100%'
      });
      anim.scale(0.1).opacity(0.2).step();
      this.setData({
        popupAnim: anim.export()
      }, () => {
        // 再展开
        setTimeout(() => {
          const anim = wx.createAnimation({
            duration: 400,
            timingFunction: 'cubic-bezier(.21,1.02,.73,1)',
            transformOrigin: '100% 100%'
          });
          anim.scale(1).opacity(1).step();
          this.setData({
            popupAnim: anim.export()
          });
        }, 20);
      });
    });
  },

  // 遮罩层/弹窗任意处点击，收起
  onMaskTap() {
    const animation = wx.createAnimation({
      duration: 320,
      timingFunction: 'cubic-bezier(.21,1.02,.73,1)',
      transformOrigin: '90% 90%',
    });
    animation
      .scale(0.1)
      .opacity(0.2)
      .step();
    this.setData({
      popupAnim: animation.export()
    });
    setTimeout(() => {
      this.setData({
        showPopup: false
      });
    }, 320);
  },



  onReady() {
    const anim = wx.createAnimation({
      duration: 500,
      timingFunction: 'ease-in-out'
    });
    anim.scale(1.1).step({
      duration: 250
    }).scale(1).step({
      duration: 250
    });
    this.setData({
      fabMainAnimation: anim.export()
    });

  },


  toggleFab() {
    this.setData({
      showFab: true,
    })

  },

  // 如果弹窗点击 Message按钮，也可以收起
  onPopupTap() {
    // 这里可写 Message 业务逻辑
    this.onMaskTap();
  },



  /**
   * 邀请采购员
   * @param {*} options 
   */
  onShareAppMessage: function (options) {

    var path = "subPackage/pages/mendian/depUserRegister/depUserRegister?disId=" + this.data.disId + '&depFatherId=' + this.data.depFatherId + '&depId=' + this.data.depId + '&admin=12';
   

    return {
      title: "订货员注册", // 默认是小程序的名称(可以写slogan等)
      path: path,
      imageUrl: this.data.url + '/userImage/say.png',
    }
  },



  _initDataSub() {

    load.showLoading("获取数据中");
    return subDepGetApplyAiByTime(this.data.depInfo.gbDepartmentId)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {

          // 根据显示模式选择不同的序列号计算方法
          let applyArrWithGlobalIndex;
          if (this.data.showType === 'time') {
            // 时间模式：平铺结构，直接计算订单序列号
            applyArrWithGlobalIndex = this._calculateTimeModeOrderIndex(res.result.data.arr);
          } else {
            // 分类模式：嵌套结构，按分类计算订单序列号
            applyArrWithGlobalIndex = this._calculateGlobalOrderIndex(res.result.data.arr);
          }

          this.setData({
            applyArr: applyArrWithGlobalIndex,
          })

        } else {
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }
      })
      .catch(() => {
        load.hideLoading();
        wx.showToast({
          title: '网络异常，请重试',
          icon: 'none'
        });
      });
  },


  _initDataSubByFather() {

    load.showLoading("获取数据中");
    return subDepGetApplyAiFather(this.data.depInfo.gbDepartmentId)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          // 计算全局序号
          const applyArrWithGlobalIndex = this._calculateGlobalOrderIndex(res.result.data.arr);

          this.setData({
            applyArr: applyArrWithGlobalIndex,
          })
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }
        return res;
      })
      .catch((error) => {
        load.hideLoading();
        wx.showToast({
          title: '网络异常，请重试',
          icon: 'none'
        });
        throw error;
      });

  },


  // 计算单个部门订单的部门内序号
  _calculateGlobalOrderIndex(applyArr) {
    if (!applyArr || !Array.isArray(applyArr)) return applyArr;

    let depOrderIndex = 1;

    return applyArr.map(father => {
      // 兼容不同的数据结构
      const goodsEntities = father.gbDistributerGoodsEntities || father.nxDistributerGoodsEntities;
      if (goodsEntities && Array.isArray(goodsEntities)) {
        goodsEntities.forEach(goods => {
          if (goods.gbDepartmentOrdersEntities && Array.isArray(goods.gbDepartmentOrdersEntities)) {
            goods.gbDepartmentOrdersEntities.forEach(order => {
              order.globalOrderIndex = depOrderIndex++;
            });
          }
        });
      }
      return father;
    });
  },



  // 计算多部门订单的部门内序号（每个部门下所有订单合并编号）
  _calculateGlobalOrderIndexForDepArr(depArr) {
    if (!depArr || !Array.isArray(depArr)) return depArr;

    return depArr.map(dep => {
      let depOrderIndex = 1;

      if (dep.depOrders && Array.isArray(dep.depOrders)) {
        dep.depOrders = dep.depOrders.map(father => {
          // 兼容不同的数据结构
          const goodsEntities = father.gbDistributerGoodsEntities;
          if (goodsEntities && Array.isArray(goodsEntities)) {
            goodsEntities.forEach(goods => {
              if (goods.gbDepartmentOrdersEntities && Array.isArray(goods.gbDepartmentOrdersEntities)) {
                goods.gbDepartmentOrdersEntities.forEach(order => {
                  order.globalOrderIndex = depOrderIndex++;
                });
              }
            });
          }
          return father;
        });
      }
      return dep;
    });
  },

  // 计算时间模式下的订单序列号（平铺结构）
  _calculateTimeModeOrderIndex(applyArr) {
    if (!applyArr || !Array.isArray(applyArr)) return applyArr;

    let orderIndex = 1;

    return applyArr.map(order => {
      order.globalOrderIndex = orderIndex++;
      return order;
    });
  },

  delStandard(e) {
    this.setData({
      warnContent: e.detail.standardName,
      show: false,
      popupType: 'deleteSpec',
      showPopupWarn: true,
      disStandardId: e.detail.id,
    })
  },



  delApply() {

    this.setData({
      warnContent: this.data.itemDis.gbDgGoodsName + "  " + this.data.applyItem.gbDoQuantity + this.data.applyItem.gbDoStandard,

      show: false,
      popupType: 'deleteOrder',
      showPopupWarn: true,
      showOperationGoods: false,
      showOperationLinshi: false
    })

    this.hideModal();

  },


  confirmWarn() {
    if (this.data.popupType == 'deleteSpec') {
      this.deleteStandardApi()
    } else {
      this.deleteApplyApi()
    }
  },

  deleteStandardApi() {
    var that = this;
    disDeleteStandard(this.data.disStandardId).then(res => {
      if (res.result.code == 0) {
        this.setData({
          popupType: "",
          showPopupWarn: false,
          disStandardId: "",
        })

        that.setData({
          itemDis: res.result.data,
          item: res.result.data,
          editApply: true,
          show: true,

        })
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },

  deleteApplyApi() {

    this.setData({
      popupType: "",
      showPopupWarn: false,
    })

    load.showLoading("删除订单");
    deleteOrderGb(this.data.applyItem.gbDepartmentOrdersId).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        if (this.data.searchArr !== null && this.data.searchValue && this.data.searchValue.trim()) {
          // 如果正在搜索，重新搜索并保持搜索状态
          this.reSearch();
        } else {
          if (this.data.showType == 'time') {
            this._initDataSub();
          } else {
            this._initDataByFather();
          }
        }
        this.setData({
          applyItem: ""
        })
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },


  closeWarn() {
    this.setData({

      warnContent: "",
      show: false,
      popupType: '',
      showPopupWarn: false,
    })
  },



  // new
  toOrder(e) {
    if (this.data.disInfo.mendianDepartmentList.length > 1) {
      this.setData({
        showChoice: true,
        toType: "order"
      })
    } else {
      this.setData({
        showOperation: true,
      })
    }
  },



  hideOperation() {
    this.setData({
      showOperation: false
    })
  },


  toAddOrder(e) {
    var type = e.currentTarget.dataset.type;
    wx.setStorageSync('orderDepInfo', this.data.depInfo)
    if (type == 'paste') {
      wx.navigateTo({
        url: '../paste/paste?depFatherId=' + this.data.depFatherId +
          '&depId=' + this.data.depId + '&disId=' + this.data.disId,
      })

    } else if (type == 'ai') {
      wx.navigateTo({
        url: '../customerGoodsAi/customerGoodsAi?depId=' + this.data.depId + '&disId=' + this.data.disId,
      })
    } else if (type == 'books') {
      wx.navigateTo({
        url: '../resGoodsAi/resGoodsAi',
      })
    }
  },



  // /////
  chooseSezi: function (e) {
    // 用that取代this，防止不必要的情况发生
    var that = this;
    // 创建一个动画实例
    var animation = wx.createAnimation({
      // 动画持续时间
      duration: 100,
      // 定义动画效果，当前是匀速
      timingFunction: 'linear'
    })
    // 将该变量赋值给当前动画
    that.animation = animation
    // 先在y轴偏移，然后用step()完成一个动画
    animation.translateY(200).step()
    // 用setData改变当前动画
    that.setData({
      // 通过export()方法导出数据
      animationData: animation.export(),
      // 改变view里面的Wx：if
      chooseSize: true
    })
    // 设置setTimeout来改变y轴偏移量，实现有感觉的滑动
    setTimeout(function () {
      animation.translateY(0).step()
      that.setData({
        animationData: animation.export()
      })
    }, 20)
  },


  hideModal: function (e) {
    var that = this;
    var animation = wx.createAnimation({
      duration: 1000,
      timingFunction: 'linear'
    })
    that.animation = animation
    animation.translateY(200).step()
    that.setData({
      animationData: animation.export()
    })

    setTimeout(function () {
      animation.translateY(0).step()
      that.setData({
        animationData: animation.export(),
        chooseSize: false
      })
    }, 200)
  },



  delApplyPaste(e) {
    this.setData({
      applyItem: e.currentTarget.dataset.item
    })

    var that = this;

    load.showLoading("删除订单")
    deleteOrderGb(e.currentTarget.dataset.id).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {

        // 使用新的缓存管理方式，与 paste.js 保持一致
        try {
          // 尝试多个可能的缓存键，确保能找到正确的缓存
          let tempOrders = null;
          let cacheKey = null;
          
          // 首先尝试当前页面的 depId
          tempOrders = wx.getStorageSync(`tempOrders_${that.data.depId}`);
          if (tempOrders && tempOrders.length > 0) {
            cacheKey = `tempOrders_${that.data.depId}`;
          }
          
          // 如果没有找到，尝试 depFatherId
          if (!tempOrders || tempOrders.length === 0) {
            tempOrders = wx.getStorageSync(`tempOrders_${that.data.depFatherId}`);
            if (tempOrders && tempOrders.length > 0) {
              cacheKey = `tempOrders_${that.data.depFatherId}`;
            }
          }
          
          // 如果还是没有找到，尝试从 orderDepInfo 中获取
          if (!tempOrders || tempOrders.length === 0) {
            const orderDepInfo = wx.getStorageSync('orderDepInfo');
            if (orderDepInfo && orderDepInfo.gbDepartmentId) {
              tempOrders = wx.getStorageSync(`tempOrders_${orderDepInfo.gbDepartmentId}`);
              if (tempOrders && tempOrders.length > 0) {
                cacheKey = `tempOrders_${orderDepInfo.gbDepartmentId}`;
              }
            }
          }
          
          
          if (tempOrders && tempOrders.length > 0 && cacheKey) {
            // 从缓存中移除被删除的订单
            const updatedOrders = tempOrders.filter(item => 
              item.gbDepartmentOrdersId !== e.currentTarget.dataset.id
            );
            
            
            if (updatedOrders.length > 0) {
              // 检查是否还有临时订单（-2状态）
              let hasTempOrders = false;
              for (let i = 0; i < updatedOrders.length; i++) {
                if (updatedOrders[i].gbDoStatus === -2) {
                  hasTempOrders = true;
                  break;
                }
              }
              
              if (hasTempOrders) {
                // 还有临时订单，更新缓存
                wx.setStorageSync(cacheKey, updatedOrders);
              } else {
                // 没有临时订单了，清除缓存
                wx.removeStorageSync(cacheKey);
              }
            } else {
              // 缓存中没有订单了，清除缓存
              wx.removeStorageSync(cacheKey);
            }
          } else {
          }
        } catch (error) {
          console.error('更新临时订单缓存失败:', error);
        }


        this._initDataSub();
        this.setData({
          applyItem: "",
          showOperationLinshi: false
        })

      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })

  },



  changeStandard: function (e) {
    this.setData({
      applyStandardName: e.detail.applyStandardName,
      priceLevel: e.detail.level,
    })
    var levelTwoStandard = this.data.applyItem.gbDistributerGoodsEntity.gbDgWillPriceTwoStandard;
    if (this.data.applyStandardName == levelTwoStandard) {
      this.setData({
        printStandard: levelTwoStandard
      })
    } else {
      this.setData({
        printStandard: this.data.applyItem.gbDistributerGoodsEntity.gbDgGoodsStandardname
      })
    }
  },

  hideMaskGoods() {
    this.hideModal();
    this.setData({
      showOperationGoods: false,
    })
  },

  hideChoiceMask() {
    this.setData({
      showChoice: false,
    })
  },



  /**
   * 修改配送商品申请
   */
  toEditApply(e) {
    var goodsId = e.currentTarget.dataset.id;
    var name = e.currentTarget.dataset.name;
    this.setData({
      showOperationGoods: true,
      goodsId: goodsId,
      goodsName: name,
      disGoods: e.currentTarget.dataset.goods,
      applyItem: e.currentTarget.dataset.order,
      depId: e.currentTarget.dataset.depid,
      subName: e.currentTarget.dataset.subname,
    })

    if (this.data.applyItem.gbDoBuyStatus < 2) {
      var applyItem = this.data.applyItem;
      this.setData({
        show: true
      })

      this.setData({
        applyStandardName: applyItem.gbDoStandard,
        printStandard: applyItem.gbDoPrintStandard,
        itemDis: this.data.applyItem.gbDistributerGoodsEntity,
        item: this.data.applyItem.gbDepartmentDisGoodsEntity,
        editApply: true,
        applyNumber: applyItem.gbDoQuantity,
        applyRemark: applyItem.gbDoRemark,
        priceLevel: applyItem.gbDoCostPriceLevel
      })
    } else {
      wx.showToast({
        title: '请供货商修改订单状态',
        icon: 'none'
      })

    }
    this.hideModal();
    this.setData({
      showOperationGoods: false
    })
  },



  toEditApplyDis(e) {
    var applyItem = e.currentTarget.dataset.order;
    var itemStatus = applyItem.nxDoPurchaseStatus;
    applyItem.disgoods = e.currentTarget.dataset.disgoods;
    if (itemStatus > 2) {
      wx.showModal({
        title: "不能修改",
        content: "订单在配送中，如果有变化，请与采购员联系.",
        showCancel: false,
        confirmText: "知道了",
        success: function (res) {
          if (res.cancel) {
            //点击取消           
          } else if (res.confirm) {}
        }
      })
    } else {
      this.setData({
        applyItem: e.currentTarget.dataset.order,
        showCash: true,
        applyStandardName: applyItem.gbDoStandard,
        itemNxDis: e.currentTarget.dataset.item,
        itemDis: e.currentTarget.dataset.goods,
        editApply: true,
        applyNumber: applyItem.gbDoQuantity,
        applyRemark: applyItem.gbDoRemark,
        index: e.currentTarget.dataset.index,
        canSave: false,
        priceLevel: e.currentTarget.dataset.order.gbDoCostPriceLevel,
      })
      if (this.data.applyItem.gbDoSubtotal !== null) {
        this.setData({
          applySubtotal: applyItem.gbDoSubtotal + "元"
        })
      }



    }
  },



  confirm: function (e) {
    if (this.data.editApply) {
      this._updateDisOrder(e);
    }

    this.setData({
      show: false,
      editApply: false,
      applyItem: "",
      item: "",
      applyNumber: "",
      applyStandardName: "",
      printStandard: "",
    })
  },



  /**
   * 修改配送申请
   * @param {} e 
   */
  _updateDisOrder(e) {

    var dg = {
      id: this.data.applyItem.gbDepartmentOrdersId,
      weight: e.detail.applyNumber,
      standard: e.detail.applyStandardName,
      remark: e.detail.applyRemark,
      printStandard: this.data.printStandard,
      priceLevel: this.data.priceLevel
    };
    updateOrderGbJj(dg).then(res => {
      load.showLoading("修改订单")
      if (res.result.code == 0) {
        load.hideLoading();

        if (this.data.searchArr !== null && this.data.searchValue && this.data.searchValue.trim()) {
          // 如果正在搜索，重新搜索并保持搜索状态
          this.reSearch();
        } else {
          if (this.data.showType == 'time') {
            this._initDataSub();
          } else {
            this._initDataByFather();
          }
        }
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: "none"
        })
      }

    })
  },



  // /////



  openOperationLinshi(e) {
    this.setData({
      showOperationLinshi: true,
      applyItem: e.currentTarget.dataset.order,
    })
   
  },


  toPasteFromGoods1(e) {
    this.hideMaskLinshi();
    wx.navigateTo({
      url: '../paste/paste?depFatherId=' + this.data.depFatherId +
      '&depId=' + this.data.depId  + '&disId=' + this.data.disId,
    })

  },


  toPasteFromGoods(e) {
    wx.setStorageSync('applyItem', this.data.applyItem)
    this.hideMaskLinshi();
    wx.navigateTo({
      url: '../editDepApplyGoods/editDepApplyGoods'
    })

  },

  hideMaskLinshi(){
    this.setData({
      showOperationLinshi: false
    })

  },  


  /**
   * 选择工作范围
   */
  selectWorkScope(e) {
    const scope = e.currentTarget.dataset.scope;
    this.setData({
      workScope: scope,
      // 如果选择负责所有部门，清空部门选择
      selDepId: scope === 'all' ? '' : this.data.selDepId,
      selDepartmentName: scope === 'all' ? '' : this.data.selDepartmentName
    }, () => {
      this.checkFormValid();
    });
  },

  onSortByChange(e) {
    const {
      type
    } = e.detail;
    this.setData({
      showType: type,
      depArr: [],
      applyArr: []
    })
    if (type === 'time') {
      // TODO: 按时间排序逻辑
        this._initDataSub();

    } else if (type === 'category') {
      // TODO: 按类别排序逻辑
      this._initDataSubByFather();
    }
  },


  onSearchInput(e) {
    const value = e.detail.value;

    this.setData({
      searchValue: value
    });

    if (!value) {
      this.setData({
        searchArr: null // 改为null，这样搜索蒙版会消失
      });
      return;
    }

    // 实时搜索
    var data = {
      depFatherId: -1,
      depId: this.data.depInfo.gbDepartmentId,
      searchStr: value
    };

    depSearchTodayOrders(data).then(res => {
      if (res.result.code == 0) {
        this.setData({
          searchArr: res.result.data || [], // 确保返回空数组而不是null
        });
      } else {
        console.error('[chefOrder] 搜索失败:', res.result.msg);
        // 搜索失败时也显示空结果
        this.setData({
          searchArr: []
        });
      }
    }).catch(error => {
      console.error('[chefOrder] 搜索API异常:', error);
      // 搜索异常时也显示空结果
      this.setData({
        searchArr: []
      });
    });
  },


  reSearch() {
    var depId = this.data.depId;
    if (this.data.depHasSubs > 1) {
      depId = -1
    }
    // 实时搜索
    var data = {
      depFatherId: this.data.depFatherId,
      depId: depId,
      searchStr: this.data.searchValue
    };

    // 同时执行搜索和页面数据更新
    Promise.all([
      depSearchTodayOrders(data),
      this.updatePageData()
    ]).then(([searchRes, pageRes]) => {
      if (searchRes.result.code == 0) {
        this.setData({
          searchArr: searchRes.result.data || [], // 确保返回空数组而不是null
        });
      } else {
        console.error("搜索失败:", searchRes.result.msg);
        // 搜索失败时也显示空结果
        this.setData({
          searchArr: []
        });
      }
    }).catch(error => {
      console.error("搜索API异常:", error);
      // 搜索异常时也显示空结果
      this.setData({
        searchArr: []
      });
    });
  },

  // 更新页面数据的方法
  updatePageData() {
    return new Promise((resolve) => {
      if (this.data.showType == 'time') {
        this._initDataSub();
      } else if (this.data.showType == 'category') {
        this._initDataSubByFather();
      }
      resolve();
    });
  },

  onSearchCancel() {
    // 清空搜索结果，恢复原订单列表
    this.setData({
      searchArr: null, // 改为null，这样搜索蒙版会消失
      searchValue: ''
    });

  },


  receiveStock(e) {

    var id = e.currentTarget.dataset.item.gbDepartmentOrdersId;
    depReceiveStock(id).then(res => {
      if (res.result.code == 0) {
       
        if (this.data.searchArr !== null && this.data.searchValue && this.data.searchValue.trim()) {
          // 如果正在搜索，重新搜索并保持搜索状态
          this.reSearch();}else{
            if(this.data.showType == 'time'){
              this._initDataSub();
            }else{
              this._initDataSubByFather();
            }
          }
          
      }
    })
  },



  toSwitchDep() {
    this.setData({
      showDepSwitch: true,
      depSwitchAnim: 'popup-fade-in'
    });
  },

  hideDepSwitch() {
    this.setData({
      showDepSwitch: false
    });
  },

  onSelectDep(e) {
    const item = e.currentTarget.dataset.item;

    // 切换部门逻辑 - 先清理旧数据，再设置新数据
    this.setData({
      depInfo: item,
      depFatherId: item.gbDepartmentFatherId,
      depId: item.gbDepartmentId,
      depName: item.gbDepartmentName,
      showDepSwitch: false,
      // 清理旧数据
      applyArr: [],
      depArr: [],
      bill: -1
    });

    // 重新初始化数据
    
    if(this.data.showType == 'time'){
      this._initDataSub();
    }else if(this.data.showType =='category'){
      this._initDataSubByFather();
    }
  },



  /**
   * 检查并统计 gbDoStatus == -2 的订单数量
   * @returns {number} 新商品订单数量
   */
  _countNewGoodsOrders() {
    const { applyArr } = this.data;
    let count = 0;
    
    // 检查 applyArr 中的订单
    if (applyArr && Array.isArray(applyArr)) {
      for (let father of applyArr) {
        if (father.gbDistributerGoodsEntities && Array.isArray(father.gbDistributerGoodsEntities)) {
          for (let goods of father.gbDistributerGoodsEntities) {
            // 检查订单数组字段
            if (goods.gbDepartmentOrdersEntities && Array.isArray(goods.gbDepartmentOrdersEntities)) {
              for (let order of goods.gbDepartmentOrdersEntities) {
                if (order.gbDoStatus === -2) {
                  count++;
                }
              }
            }
          }
        } else {
          // 处理按时间显示的简单数据结构
          if (father.gbDoStatus === -2) {
            count++;
          }
        }
      }
    }
    
    return count;
  },

  /**
   * 滚动到第一个新商品订单
   */
  _scrollToFirstNewGoods() {
    // 使用 wx.createSelectorQuery 查找第一个新商品订单元素
    const query = wx.createSelectorQuery().in(this);
    
    // 查找第一个 gbDoStatus == -2 的订单元素
    query.select('.new-goods-order').boundingClientRect((rect) => {
      if (rect) {
        // 计算滚动位置，减去导航栏高度
        const scrollTop = rect.top - this.data.navBarHeight - 50; // 额外减去50rpx的间距
        
        // 滚动到目标位置
        wx.pageScrollTo({
          scrollTop: Math.max(0, scrollTop),
          duration: 500
        });
        
      } else {
      }
    }).exec();
  },

  /**
   * 显示新商品订单提示
   * @param {number} count 新商品订单数量
   */
  _showNewGoodsAlert(count) {
    wx.showModal({
      title: '提示',
      content: `您还有${count}个新商品订单需要先处理（匹配到商品库或添加为临时商品），否则采购员无法看到这些订单。`,
      confirmText: '确定离开',
      cancelText: '继续处理',
      success: (res) => {
        if (res.confirm) {
          // 用户确认离开，执行返回操作
          wx.navigateBack({delta: 1});
        } else {
          // 用户选择继续处理，滚动到第一个新商品订单
          setTimeout(() => {
            this._scrollToFirstNewGoods();
          }, 300); // 延迟300ms确保模态框完全关闭
        }
      }
    });
  },

  toBack() {
    // 检查新商品订单数量（gbDoStatus == -2）
    const newGoodsCount = this._countNewGoodsOrders();
    if (newGoodsCount == 1) {
      // 标记已经显示过提示，避免 onUnload 重复弹窗
      this.setData({
        hasShownNewGoodsAlert: true
      });
      this._showNewGoodsAlert(newGoodsCount);
    } else {
      wx.navigateBack({delta: 1});
    }
  },

  onHide(){
    // 检查是否有新商品订单（gbDoStatus == -2）
    const newGoodsCount = this._countNewGoodsOrders();
    if (newGoodsCount == 1 && !this.data.hasShownNewGoodsAlert) {
      // 使用 wx.showModal 提示用户
      wx.showModal({
        title: '提示',
        content: `您还有${newGoodsCount}个新商品订单需要先处理（匹配到商品库或添加为临时商品），否则采购员无法看到这些订单。`,
        confirmText: '知道了',
        showCancel: false,
        success: (res) => {
        }
      });
    }
  },

  onUnload(){
    // 检查是否有新商品订单（gbDoStatus == -2）
    const newGoodsCount = this._countNewGoodsOrders();
    if (newGoodsCount == 1 && !this.data.hasShownNewGoodsAlert) {
      // 延迟显示提示，确保在页面卸载前显示
      setTimeout(() => {
        wx.showModal({
          title: '提示',
          content: `您还有${newGoodsCount}个新商品订单需要先处理（匹配到商品库或添加为临时商品），否则采购员无法看到这些订单。`,
          confirmText: '知道了',
          showCancel: false,
          success: (res) => {
          }
        });
      }, 100);
    }
  },







})