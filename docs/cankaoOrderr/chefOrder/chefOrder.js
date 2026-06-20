const globalData = getApp().globalData;
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil');
import apiUrl from '../../../../config.js'

import {
  updateOrderGbJj,
  deleteOrderGb,
  depGetApplyAiByTime,
  depGetApplyAiFather,
  depReceiveStock,
  depSearchTodayOrders

} from '../../../../lib/apiDepOrder'

import {
  disSaveStandard,
  disDeleteStandard,
  gbDisSaveStandard,
  gbDisDeleteStandard,
} from '../../../../lib/apiDepOrder'


Page({

  data: {
  
    showPopup: false,
    popupAnim: {},
    showType: 'time',
    searchArr: null,  // 初始化为null，这样页面打开时不会显示搜索蒙版
    searchValue: '',
    hasShownNewGoodsAlert: false, // 标记是否已经显示过新商品订单提示
   
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
     console.log("检测到订单数据变更，立即刷新");
     wx.removeStorageSync('needRefreshOrderData'); // 清除标记

     if(this.data.showType == 'time'){
      this._initData();
    }else if(this.data.showType =='category'){
      this._initDataByFather();
    }
     return;
   }
   
   

  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        disId: userInfo.gbDuDistributerId
      })
    
    
        var mendianInfo = wx.getStorageSync('mendianInfo');
        if(mendianInfo){
          this.setData({
            mendianInfo: mendianInfo,
            depFatherId: mendianInfo.gbDepartmentId,
            depId: mendianInfo.gbDepartmentId,
            depHasSubs: mendianInfo.gbDepartmentSubAmount,
          })
          if(mendianInfo.gbDepartmentSubAmount  > 0){
            this.setData({
              depId: mendianInfo.gbDepartmentId,
            })
          }

        }
    } 
    
    this._initData();
  
  },

  // 点击圆形按钮，弹窗动画展开
  onFabTap() {
    this.setData({ showPopup: true }, () => {
      // 动画初始化为缩小
      const anim = wx.createAnimation({ duration: 0, timingFunction: 'ease', transformOrigin: '100% 100%' });
      anim.scale(0.1).opacity(0.2).step();
      this.setData({ popupAnim: anim.export() }, () => {
        // 再展开
        setTimeout(() => {
          const anim = wx.createAnimation({ duration: 400, timingFunction: 'cubic-bezier(.21,1.02,.73,1)', transformOrigin: '100% 100%' });
          anim.scale(1).opacity(1).step();
          this.setData({ popupAnim: anim.export() });
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
    this.setData({ popupAnim: animation.export() });
    setTimeout(() => {
      this.setData({ showPopup: false });
    }, 320);
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

    var path = "subPackage/pages/mendian/depUserRegister/depUserRegister?disId=" + this.data.disId + '&depFatherId=' + this.data.depFatherId + '&admin=1';
   
    console.log("分享路径:", path)

    return {
      title: "订货员注册", // 默认是小程序的名称(可以写slogan等)
      path: path,
      imageUrl: this.data.url + '/userImage/say.png',
    }


    // return {
    //   title: this.data.mendianInfo.gbDepartmentName + '订货单', // 默认是小程序的名称(可以写slogan等)
    //   path: '/pages/ai/customer/chefOrder/chefOrder?depFatherId=' + this.data.depFatherId + '&disId=' +
    //     this.data.disId,
    //   imageUrl: this.data.url + this.data.imgUrl,
    // }
  },

  _initData() {
    
    load.showLoading("获取数据中");
    depGetApplyAiByTime(this.data.depFatherId)
      .then(res => {
        load.hideLoading();
        console.log("_initData_initData", res.result.data);
        if (res.result.code == 0) {

          if (this.data.depHasSubs > 1) {
            // 计算全局序号
            const depArrWithGlobalIndex = this._calculateGlobalOrderIndexForDepArr(res.result.data.arr);
            this.setData({
              depArr: depArrWithGlobalIndex,
              bill: res.result.data.bill,
            })
          } else {
            this.setData({
              applyArr: res.result.data.arr[0].depOrders,
              bill: res.result.data.arr[0].bill,
            })
          }

        } else {
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }
      })
      
  },


  _initDataByFather() {

    load.showLoading("获取数据中");
    return depGetApplyAiFather(this.data.mendianInfo.gbDepartmentId)
      .then(res => {
        load.hideLoading();
        console.log("_initData_initData", res.result.data);
        if (res.result.code == 0) {
          console.log("this.data.depHasSubs" ,this.data.depHasSubs)
          if (this.data.depHasSubs > 1) {
            // 计算全局序号
            const depArrWithGlobalIndex = this._calculateGlobalOrderIndexForDepArr(res.result.data.arr);
            this.setData({
              depArr: depArrWithGlobalIndex,
            })
          } else {
            // 计算全局序号
            const applyArrWithGlobalIndex = this._calculateGlobalOrderIndex(res.result.data.arr);

            this.setData({
              applyArr: applyArrWithGlobalIndex,
            })
          }

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


  // 计算多部门订单的全局序号（所有部门订单连续编号）
  _calculateGlobalOrderIndexForDepArr(depArr) {
    if (!depArr || !Array.isArray(depArr)) return depArr;
    console.log('开始计算多部门订单全局序列号，部门总数:', depArr.length);

    let globalOrderIndex = 1;
    
    return depArr.map(dep => {
      console.log(`部门 ${dep.depName} 开始计算订单序列号`);

      if (dep.depOrders && Array.isArray(dep.depOrders)) {
        // 处理按类别显示的数据结构
        dep.depOrders = dep.depOrders.map(father => {
          if (father.gbDistributerGoodsEntities && Array.isArray(father.gbDistributerGoodsEntities)) {
            father.gbDistributerGoodsEntities.forEach(goods => {
              // 处理两种可能的订单数组字段
              const orderArrays = [
                goods.nxDepartmentOrdersEntities,
                goods.gbDepartmentOrdersEntities
              ];
              
              orderArrays.forEach(orderArray => {
                if (orderArray && Array.isArray(orderArray)) {
                  orderArray.forEach(order => {
                    // 为每个订单添加全局序号
                    order.globalOrderIndex = globalOrderIndex++;
                    console.log(`全局序号 ${order.globalOrderIndex-1}: ${order.gbDistributerGoodsEntity?.gbDgGoodsName || goods.gbDgGoodsName || '未知商品'} - 数量: ${order.gbDoQuantity}`);
                  });
                }
              });
            });
          } else {
            // 处理按时间显示的简单数据结构
            if (father.gbDistributerGoodsEntity) {
              father.globalOrderIndex = globalOrderIndex++;
              console.log(`全局序号 ${father.globalOrderIndex-1}: ${father.gbDistributerGoodsEntity?.gbDgGoodsName || '未知商品'} - 数量: ${father.gbDoQuantity}`);
            }
          }
          return father;
        });
      }
      return dep;
    });
  },

  // 计算单部门订单的全局序号
  _calculateGlobalOrderIndex(depArr) {
    if (!depArr || !Array.isArray(depArr) || depArr.length === 0) return [];
    
    const dep = depArr[0]; // 单部门情况下，取第一个部门
    if (!dep.depOrders || !Array.isArray(dep.depOrders)) return [];
    
    console.log('开始计算单部门订单全局序列号');
    
    let globalOrderIndex = 1;
    
    return dep.depOrders.map((father) => {
      // 处理按类别显示的数据结构
      if (father.gbDistributerGoodsEntities && Array.isArray(father.gbDistributerGoodsEntities)) {
        father.gbDistributerGoodsEntities.forEach(goods => {
          // 处理两种可能的订单数组字段
          const orderArrays = [
            goods.nxDepartmentOrdersEntities,
            goods.gbDepartmentOrdersEntities
          ];
          
          orderArrays.forEach(orderArray => {
            if (orderArray && Array.isArray(orderArray)) {
              orderArray.forEach(order => {
                // 为每个订单添加全局序号
                order.globalOrderIndex = globalOrderIndex++;
                console.log(`全局序号 ${order.globalOrderIndex-1}: ${order.gbDistributerGoodsEntity?.gbDgGoodsName || goods.gbDgGoodsName || '未知商品'} - 数量: ${order.gbDoQuantity}`);
              });
            }
          });
        });
      } else {
        // 处理按时间显示的简单数据结构
        if (father.gbDistributerGoodsEntity) {
          father.globalOrderIndex = globalOrderIndex++;
          console.log(`全局序号 ${father.globalOrderIndex-1}: ${father.gbDistributerGoodsEntity?.gbDgGoodsName || '未知商品'} - 数量: ${father.gbDoQuantity}`);
        }
      }
      return father;
    });
  },

  
  delStandard(e) {
    this.setData({
      warnContent: e.detail.standardName,
      popupType: 'deleteSpec',
      showPopupWarn: true,
      disStandardId: e.detail.id,
    })
  },




  openOperationLinshi(e) {
    console.log(e);
    this.setData({
      dep: e.currentTarget.dataset.dep,
      depId: e.currentTarget.dataset.depid,
      showOperationLinshi: true,
      applyItem: e.currentTarget.dataset.order,
      goodsName: e.currentTarget.dataset.name
    })
    this.chooseSezi();
  },



  delApply() {

    this.setData({
      warnContent: this.data.goodsName + "  " + this.data.applyItem.gbDoQuantity + this.data.applyItem.gbDoStandard,
   
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
    gbDisDeleteStandard(this.data.disStandardId).then(res => {
      if (res.result.code == 0) {
        console.log("delstttnanaa", res.result.data);
        var standards = "itemDis.gbDistributerStandardEntities"
        this.setData({
          [standards]: res.result.data.gbDistributerStandardEntities,
        })
        
        // 更新订单列表中的规格数据（使用与添加规格相同的方法）
        this._updateOrderListStandards(res.result.data.gbDistributerStandardEntities);

        // 只关闭警告弹窗，保持订单编辑弹窗打开
        this.setData({
          popupType: "",
          showPopupWarn: false,
          disStandardId: "",
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
          console.log('[chefOrder] 检测到搜索状态，重新搜索');
          // 如果正在搜索，重新搜索并保持搜索状态
          this.reSearch();
          if(this.data.showType == 'time'){
            this._initData();
          }else{
            this._initDataByFather();
          }
        }
          else{
            if(this.data.showType == 'time'){
              this._initData();
            }else{
              this._initDataByFather();
            }
          }
        this.setData({
          applyItem: "",
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

  selectDepartment(e) {
    console.log(e.currentTarget.dataset.item);
    var dep = e.currentTarget.dataset.item;
    var depFatherId = dep.gbDepartmentId;
    if (dep.gbDepartmentFatherId > 0) {
      depFatherId = dep.gbDepartmentFatherId;
    }
    var depId = dep.gbDepartmentId;
    this.setData({
      dep: dep,
      depFatherId: depFatherId,
      depId: depId,
      e,
    })
    wx.setStorageSync('orderDepInfo', dep)
    if (this.data.openType == 'paste') {
      wx.navigateTo({
        url: '../paste/paste?depFatherId=' + this.data.depFatherId +
          '&depId=' + this.data.depId + '&disId=' + this.data.disId,
      })
    } else if (this.data.openType == 'books') {
      wx.navigateTo({
        url: '../resGoodsAi/resGoodsAi',
      })
    } else if (this.data.openType == 'ai') {
      wx.navigateTo({
        url: '../customerGoodsAi/customerGoodsAi?depId=' + this.data.depId + '&disId=' + this.data.disId,
      })
    }
    
  },



  hideOperation() {
    this.setData({
      showOperation: false
    })
  },


  toAddOrder(e) {

    console.log(e.currentTarget.dataset.type)
    var type = e.currentTarget.dataset.type;
    if (this.data.depHasSubs > 1) {
      this.setData({
        showChoice: true,
        openType: type,
      })
    } else {
       wx.setStorageSync('orderDepInfo', this.data.mendianInfo);

      if (type == 'paste') {
        wx.navigateTo({
          url: '../paste/paste?depFatherId=' + this.data.depFatherId +
            '&depId=' + this.data.depId  + '&disId=' + this.data.disId,
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
    }
  },



  toRecord() {
    this.hideOperation();
    wx.navigateTo({
      url: '../paste/paste?depFatherId=' + this.data.depFatherId +
        '&depId=' + this.data.depId,
    })

  },

  toPasteFromGoods(e) {
    console.log("toPasteFromGoodstoPasteFromGoods");
    wx.setStorageSync('applyItem', this.data.applyItem)
    this.hideMaskLinshi();
    wx.navigateTo({
      url: '../editDepApplyGoods/editDepApplyGoods?from=chefOrder'
    })

  },

  hideMaskLinshi(){
    this.setData({
      showOperationLinshi: false
    })

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



  delApplyPaste() {
   

    load.showLoading("删除订单")
    deleteOrderGb(this.data.applyItem.gbDepartmentOrdersId).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {

        if (this.data.searchArr !== null && this.data.searchValue && this.data.searchValue.trim()) {
          console.log('[chefOrder] 检测到搜索状态，重新搜索');
          // 如果正在搜索，重新搜索并保持搜索状态
          this.reSearch();
          if(this.data.showType == 'time'){
            this._initData();
          }else{
            this._initDataByFather();
          }
        }
          else{
            if(this.data.showType == 'time'){
              this._initData();
            }else{
              this._initDataByFather();
            }
          }
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
    console.log("thisdaprinfir", this.data.printStandard)
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
    var setDataObj = {
      showOperationGoods: true,
      goodsId: goodsId,
      goodsName: name,
      disGoods: e.currentTarget.dataset.goods,
      applyItem: e.currentTarget.dataset.order,
      depId: e.currentTarget.dataset.depid,
      subName: e.currentTarget.dataset.subname,
    };
    
    // 只有当 index 有值时才设置
    if (e.currentTarget.dataset.index !== undefined) {
      setDataObj.index = e.currentTarget.dataset.index;
    }
    
    this.setData(setDataObj);

    if (this.data.applyItem.gbDoBuyStatus < 3) {
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
    console.log("contoEditApplytoEditApply")
    var applyItem = e.currentTarget.dataset.order;
    console.log("arritme", e)
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
      var setDataObj = {
        applyItem: e.currentTarget.dataset.order,
        showCash: true,
        applyStandardName: applyItem.gbDoStandard,
        itemNxDis: e.currentTarget.dataset.item,
        itemDis: e.currentTarget.dataset.goods,
        editApply: true,
        applyNumber: applyItem.gbDoQuantity,
        applyRemark: applyItem.gbDoRemark,
        canSave: false,
        priceLevel: e.currentTarget.dataset.order.gbDoCostPriceLevel,
      };
      
      // 只有当 index 有值时才设置
      if (e.currentTarget.dataset.index !== undefined) {
        setDataObj.index = e.currentTarget.dataset.index;
      }
      
      this.setData(setDataObj);
     console.log("cansaveee", this.data.canSave)
      if (this.data.applyItem.gbDoSubtotal !== null) {
        console.log("eidididiiidid");
        this.setData({
          applySubtotal: applyItem.gbDoSubtotal + "元"
        })
      }
     
     

    }
  },



  confirmStandard(e) {
    var data = {
      gbDsDisGoodsId: this.data.applyItem.gbDoDisGoodsId,
      gbDsStandardName: e.detail.newStandardName,
    }
    gbDisSaveStandard(data).
    then(res => {
      if (res.result.code == 0) {
        var standardArr = this.data.itemDis.gbDistributerStandardEntities;
        standardArr.push(res.result.data);
        var standards = "itemDis.gbDistributerStandardEntities"
        this.setData({
          [standards]: standardArr,
          applyStandardName: res.result.data.gbDsStandardName,
        })
        
        // 更新订单列表中的规格数据
        this._updateOrderListStandards(standardArr);
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },

  /**
   * 更新订单列表中的规格数据
   * @param {Array} standardArr 新的规格数组
   */
  _updateOrderListStandards(standardArr) {
    const { applyArr, depArr, index } = this.data;
    
    // 更新单部门订单列表 (applyArr)
    if (applyArr && Array.isArray(applyArr) && index !== undefined) {
      const targetOrder = applyArr[index];
      if (targetOrder) {
        if (targetOrder.gbDistributerGoodsEntities && Array.isArray(targetOrder.gbDistributerGoodsEntities)) {
          // 按类别显示的数据结构
          for (let goods of targetOrder.gbDistributerGoodsEntities) {
            if (goods.gbDistributerGoodsId === this.data.applyItem.gbDoDisGoodsId) {
              goods.gbDistributerStandardEntities = standardArr;
              break;
            }
          }
        } else {
          // 按时间显示的简单数据结构
          if (targetOrder.gbDistributerGoodsEntity && targetOrder.gbDistributerGoodsEntity.gbDistributerGoodsId === this.data.applyItem.gbDoDisGoodsId) {
            targetOrder.gbDistributerGoodsEntity.gbDistributerStandardEntities = standardArr;
          }
        }
      }
      
      // 更新页面数据
      this.setData({
        applyArr: applyArr
      });
    }
    
    // 更新多部门订单列表 (depArr)
    if (depArr && Array.isArray(depArr) && index !== undefined) {
      // 对于多部门情况，需要找到对应的部门和订单
      for (let dep of depArr) {
        if (dep.depOrders && Array.isArray(dep.depOrders)) {
          const targetOrder = dep.depOrders[index];
          if (targetOrder) {
            if (targetOrder.gbDistributerGoodsEntities && Array.isArray(targetOrder.gbDistributerGoodsEntities)) {
              // 按类别显示的数据结构
              for (let goods of targetOrder.gbDistributerGoodsEntities) {
                if (goods.gbDistributerGoodsId === this.data.applyItem.gbDoDisGoodsId) {
                  goods.gbDistributerStandardEntities = standardArr;
                  break;
                }
              }
            } else {
              // 按时间显示的简单数据结构
              if (targetOrder.gbDistributerGoodsEntity && targetOrder.gbDistributerGoodsEntity.gbDistributerGoodsId === this.data.applyItem.gbDoDisGoodsId) {
                targetOrder.gbDistributerGoodsEntity.gbDistributerStandardEntities = standardArr;
              }
            }
          }
        }
      }
      
      // 更新页面数据
      this.setData({
        depArr: depArr
      });
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
          console.log('[chefOrder] 检测到搜索状态，重新搜索');
          // 如果正在搜索，重新搜索并保持搜索状态
          this.reSearch();
          if(this.data.showType == 'time'){
            this._initData();
          }else{
            this._initDataByFather();
          }
        }
          else{
            if(this.data.showType == 'time'){
              this._initData();
            }else{
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
    console.log(e);
    const {
      type
    } = e.detail;
    this.setData({
      showType: type,
    })
    if (type === 'time') {
      this._initData();

    
    } else if (type === 'category') {
      // TODO: 按类别排序逻辑
      console.log('页面收到：按类别排序');
      this._initDataByFather();
    }
  },


  onSearchInput(e) {
    const value = e.detail.value;
    console.log('[chefOrder] 收到输入内容:', value);
    console.log('[chefOrder] 事件详情:', e);
    
    this.setData({
      searchValue: value
    });
    
    if (!value) {
      console.log('[chefOrder] 搜索值为空，清空搜索结果');
      this.setData({
        searchArr: null  // 改为null，这样搜索蒙版会消失
      });
      return;
    }
  
   
    // 实时搜索
    var data = {
      depFatherId: this.data.depFatherId,
      depId: -1,
      searchStr: value
    };
    console.log('[chefOrder] 搜索参数:', data);
    
    depSearchTodayOrders(data).then(res => {
      console.log('[chefOrder] 搜索API返回:', res);
      if (res.result.code == 0) {
        this.setData({
          searchArr: res.result.data || [],  // 确保返回空数组而不是null
        });
        console.log('[chefOrder] 搜索成功，结果数量:', res.result.data ? res.result.data.length : 0);
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
    console.log("重新搜索", this.data.searchValue)
   
    // 实时搜索
    var data = {
      depFatherId: this.data.depFatherId,
      depId: -1,
      searchStr: this.data.searchValue
    };
    console.log("搜索参数:", data);
    
    // 同时执行搜索和页面数据更新
    Promise.all([
      depSearchTodayOrders(data),
      this.updatePageData()
    ]).then(([searchRes, pageRes]) => {
      console.log("搜索API返回:", searchRes);
      if (searchRes.result.code == 0) {
        this.setData({
          searchArr: searchRes.result.data || [],  // 确保返回空数组而不是null
        });
        console.log("搜索成功，结果数量:", searchRes.result.data ? searchRes.result.data.length : 0);
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
      if (this.data.depHasSubs == 1) {
        if(this.data.showType == 'time'){
          this._initDataSub();
        }else if(this.data.showType =='category'){
          this._initDataByFather();
        }
      } else {
        if (this.data.showType === 'time') {
          this._initData();
        } else if (this.data.showType === 'category') {
          this._initDataByFather();
        }
      }
      resolve();
    });
  },


  onSearchCancel() {
    console.log('[chefOrder] 点击取消搜索');
    // 清空搜索结果，恢复原订单列表
    this.setData({
      searchArr: null,  // 改为null，这样搜索蒙版会消失
      searchValue: ''
    });
    
  },
  




  receiveStock(e) {

    var id = e.currentTarget.dataset.item.gbDepartmentOrdersId;
    load.showLoading("收货中");
    depReceiveStock(id).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
       
        if (this.data.searchArr !== null && this.data.searchValue && this.data.searchValue.trim()) {
          console.log('[chefOrder] 检测到搜索状态，重新搜索');
          // 如果正在搜索，重新搜索并保持搜索状态
          this.reSearch();
          if(this.data.showType == 'time'){
            this._initData();
          }else{
            this._initDataByFather();
          }
        }else{
            if(this.data.showType == 'time'){
              this._initData();
            }else{
              this._initDataByFather();
            }
          }
          
      }else{
        if(this.data.showType == 'time'){
          this._initData();
        }else{
          this._initDataByFather();
        }
        wx.showToast({
          title:  res.result.msg,
          icon: 'none'
        })
      }
    })
  },



  toBack(){
    // 检查新商品订单数量（gbDoStatus == -2）
    // const newGoodsCount = this._countNewGoodsOrders();
    // if (newGoodsCount > 0) {
    //   // 标记已经显示过提示，避免 onUnload 重复弹窗
    //   this.setData({
    //     hasShownNewGoodsAlert: true
    //   });
    //   // this._showNewGoodsAlert(newGoodsCount);
    // } else {
     
    // }

    wx.navigateBack({delta: 1});
  },

  /**
   * 检查并统计 gbDoStatus == -2 的订单数量
   * @returns {number} 新商品订单数量
   */
  _countNewGoodsOrders() {
    const { applyArr, depArr } = this.data;
    let count = 0;
    
    // 检查 applyArr 中的订单
    if (applyArr && Array.isArray(applyArr)) {
      for (let father of applyArr) {
        if (father.gbDistributerGoodsEntities && Array.isArray(father.gbDistributerGoodsEntities)) {
          for (let goods of father.gbDistributerGoodsEntities) {
            // 检查两种可能的订单数组字段
            const orderArrays = [
              goods.nxDepartmentOrdersEntities,
              goods.gbDepartmentOrdersEntities
            ];
            
            for (let orderArray of orderArrays) {
              if (orderArray && Array.isArray(orderArray)) {
                for (let order of orderArray) {
                  if (order.gbDoStatus === -2) {
                    count++;
                  }
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
    
    // 检查 depArr 中的订单（多部门情况）
    if (depArr && Array.isArray(depArr)) {
      for (let dep of depArr) {
        if (dep.depOrders && Array.isArray(dep.depOrders)) {
          for (let father of dep.depOrders) {
            if (father.gbDistributerGoodsEntities && Array.isArray(father.gbDistributerGoodsEntities)) {
              for (let goods of father.gbDistributerGoodsEntities) {
                // 检查两种可能的订单数组字段
                const orderArrays = [
                  goods.nxDepartmentOrdersEntities,
                  goods.gbDepartmentOrdersEntities
                ];
                
                for (let orderArray of orderArrays) {
                  if (orderArray && Array.isArray(orderArray)) {
                    for (let order of orderArray) {
                      if (order.gbDoStatus === -2) {
                        count++;
                      }
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
        
        console.log('滚动到第一个新商品订单位置');
      } else {
        console.log('未找到新商品订单元素');
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
          console.log('用户确认离开页面');
          wx.navigateBack({delta: 1});
        } else {
          // 用户选择继续处理，滚动到第一个新商品订单
          console.log('用户选择继续处理订单');
          setTimeout(() => {
            this._scrollToFirstNewGoods();
          }, 300); // 延迟300ms确保模态框完全关闭
        }
      }
    });
  },

  // onHide(){
  //   // 检查是否有新商品订单（gbDoStatus == -2）
  //   const newGoodsCount = this._countNewGoodsOrders();
  //   if (newGoodsCount > 0 && !this.data.hasShownNewGoodsAlert) {
  //     // 使用 wx.showModal 提示用户
  //     wx.showModal({
  //       title: '提示',
  //       content: `您还有${newGoodsCount}个新商品订单需要先处理（匹配到商品库或添加为临时商品），否则采购员无法看到这些订单。`,
  //       confirmText: '知道了',
  //       showCancel: false,
  //       success: (res) => {
  //         console.log('用户确认离开页面，有新商品订单未处理');
  //       }
  //     });
  //   }
  // },

  // onUnload(){
    // 检查是否有新商品订单（gbDoStatus == -2）
    // const newGoodsCount = this._countNewGoodsOrders();
    // if (newGoodsCount > 0 && !this.data.hasShownNewGoodsAlert) {
    //   // 延迟显示提示，确保在页面卸载前显示
    //   setTimeout(() => {
    //     wx.showModal({
    //       title: '提示',
    //       content: `您还有${newGoodsCount}个新商品订单需要先处理（匹配到商品库或添加为临时商品），否则采购员无法看到这些订单。`,
    //       confirmText: '知道了',
    //       showCancel: false,
    //       success: (res) => {
    //         console.log('用户确认离开页面，有新商品订单未处理');
    //       }
    //     });
    //   }, 100);
    // }
  // },






})