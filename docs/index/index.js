const globalData = getApp().globalData;
var load = require('../../lib/load.js');
const apiUrl = require('../../config.js')
var dateUtils = require('../../utils/dateUtil')


import {
  gbLoginIndex
} from '../../lib/apiDistributer'


import {
  // swiper-1
  getPurchaseGoodsGbWithTabCount,
  saveDisPurGoodsBatchGb,
  purUserSaveMendain,
  puraserReturnPurGoods,
  receiveGbBatchItem,
  receiveGbBatch,
  //swiper - 2
  jingjingGetBuyingGoodsGb,
  jingjingGetBuyingGoodsGbWithNx,
  deleteDisPurBatchGbItem,
  deleteDisPurAndNxDataItem,

  addAutoOrderGoods,
  cancleTuihuoByPurGoodsId
} from '../../lib/apiDepOrder'

Page({

  onShow() {
    // 打印从公众号打开的参数
    let launchOptions = wx.getLaunchOptionsSync();
    console.log("========== 页面来源 ==========");
    console.log("启动参数:", launchOptions);
    console.log("场景值:", launchOptions.scene);
    console.log("来源小程序:", launchOptions.referrerInfo?.appId);
    console.log("来源信息:", launchOptions.referrerInfo);
    
    let windowInfo = wx.getWindowInfo();
    let globalData = getApp().globalData;
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
    });

    wx.removeStorageSync('selArr');

    if (this.data.tab1Index == 0) {
      this._getInitData();
    } else {
      if (this.data.hasNxDis) {
        this._initBatchWithNxData();
      } else {
        this._initBatchData();
      }
    }
  },


  /**
   * 页面的初始数据
   */
  data: {
    tab1Index: 0,
    itemIndex: 0, // 当前选中的 Tab 索引
    sliderWidth: 0, // 滑块宽度
    sliderLeft: 0, // 滑块偏移量

    purArr: [],
    selectedArr: [],
    showGoods: false,
    userInfo: null,
    showPage: false, // 控制弹出层和蒙版显示
    popupAnimation: {}, // 弹出层动画
    disInfo: {
      gbDistributerName: '', // 门店名称
    },
    hasSubs: 2, // 部门类型
    selNumber: 1, // 部门数量
    isShixianAuto: false,
    tabs: [{
        name: "未采购",
        amount: ""
      },
      {
        name: "订货",
        amount: ""
      }
    ],


  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {


    var week = dateUtils.getWhatDay(0);
    var date = dateUtils.getOnlyHao(0);
    var todayaaa = dateUtils.getArriveDate(0);

    this.setData({
      week: week,
      date: date,
      todayaaa: todayaaa,
      url: apiUrl.server,
      todayDate: dateUtils.getArriveDate(0),
    })
    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {

      if (userInfo.gbDuAdmin == 1) {
        wx.redirectTo({
          url: '../../subPackage-ai/pages/ai/chefOrderDep/chefOrderDep',
        })
      } else {
       

        this.setData({
          userInfo: userInfo,
          userId: userInfo.gbDepartmentUserId,
        })

        var disInfo = wx.getStorageSync('disInfo');
        if (disInfo) {
          this.setData({
            disInfo: disInfo,
            disId: disInfo.gbDistributerId,
            depId: disInfo.mendianDepartmentList[0].gbDepartmentId,
          })
        }

        if (disInfo.nxDistributerGbDistributerEntity !== null) {
          this.setData({
            hasNxDis: true,
          })
        } else {
          this.setData({
            hasNxDis: false,
          })
        }



        this._checkIfShowPage();
      }


    } else {
      this._userLogin()
    }

    this.calculateSlider(0); // 初始化时计算滑块宽度和位置


  },


  // Purchase页面刷新
  onPurchaseRefresh() {
    console.log("onPurchaseRefreshonPurchaseRefresh")
    this.setData({
      purchaseRefreshing: true
    })
    load.showLoading("获取订单");


    getPurchaseGoodsGbWithTabCount(this.data.disId)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          wx.stopPullDownRefresh()
          this.setData({
            purchaseRefreshing: false
          })
          var newOrderCount = "tabs[0].amount";
          var wxOrderCountData = "tabs[1].amount";
          this.setData({
            purArr: res.result.data.arr,
            selectedArr: [],
            [newOrderCount]: res.result.data.orderAmount,
            [wxOrderCountData]: res.result.data.wxAmount,
            disInfo: res.result.data.disInfo,
          })

          wx.setStorageSync('disInfo', res.result.data.disInfo)
        } else {
          this.setData({
            purArr: [],

          })
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
          this.setData({
            purArr: []
          })
        }
      })

  },

  // Order页面刷新
  onOrderRefresh() {
    this.setData({
      orderRefreshing: true
    })

    if (this.data.hasNxDis) {
      this._initBatchWithNxData();
    } else {
      this._initBatchData();
    }

  },

  _initBatchData() {
    load.showLoading("获取订货")
    jingjingGetBuyingGoodsGb(this.data.disId)
      .then(res => {
        load.hideLoading();
        console.log(res.result.data);
        if (res.result.code == 0) {
          wx.stopPullDownRefresh()
          this.setData({
            orderRefreshing: false
          })
          var newOrderCount = "tabs[0].amount";
          var wxOrderCountData = "tabs[1].amount";
          this.setData({
            batchArr: res.result.data.arr,
            [newOrderCount]: res.result.data.orderAmount,
            [wxOrderCountData]: res.result.data.wxAmount,
            disInfo: res.result.data.disInfo,
          })

          wx.setStorageSync('disInfo', res.result.data.disInfo);

        } else {
          this.setData({
            purArr: [],
            batchSize: 0,
            finishSize: 0,
            selectedArr: []
          })
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
          this.setData({
            purArr: []
          })
        }
      })


  },


  _initBatchWithNxData() {

    load.showLoading("获取订货")
    jingjingGetBuyingGoodsGbWithNx(this.data.disId)
      .then(res => {
        load.hideLoading();
        console.log(res.result.data);
        if (res.result.code == 0) {
          wx.stopPullDownRefresh()
          this.setData({
            orderRefreshing: false
          })
          var newOrderCount = "tabs[0].amount";
          var wxOrderCountData = "tabs[1].amount";
          this.setData({
            nxDisArr: res.result.data.arr,
            [newOrderCount]: res.result.data.orderAmount,
            [wxOrderCountData]: res.result.data.wxAmount,
            disInfo: res.result.data.disInfo,
          })

          wx.setStorageSync('disInfo', res.result.data.disInfo);

        } else {
          this.setData({
            purArr: [],
            batchSize: 0,
            finishSize: 0,
            selectedArr: []
          })
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
          this.setData({
            purArr: []
          })
        }
      })

  },



  _checkIfShowPage() {
    if (this.data.disInfo.mendianDepartmentList.length == 0) {
      this.setData({
        showPage: true,
        mendianInfo: {
          gbDepartmentDisId: this.data.disId,
          gbDepartmentType: 1,
          gbDepartmentSubAmount: 0,
          gbDepartmentIsGroupDep: 1,
          gbDepartmentFatherId: 0,
          gbDepartmentName: this.data.disInfo.gbDistributerName,
          gbDepartmentPrintName: this.data.disInfo.gbDistributerName,
          gbDepartmentAttrName: this.data.disInfo.gbDistributerName,
          gbDepartmentLevel: 0,
          gbDepartmentEntityList: [{
            gbDepartmentName: this.data.disInfo.gbDistributerName
          }],
        },
        gbDepartmentEntities: [{
          gbDepartmentName: this.data.disInfo.gbDistributerName
        }],
      })

      this.showPopup();

    }
  },





  _getInitData() {
    load.showLoading("获取订单");

    getPurchaseGoodsGbWithTabCount(this.data.disId)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          var newOrderCount = "tabs[0].amount";
          var wxOrderCountData = "tabs[1].amount";
          this.setData({
            purArr: res.result.data.arr,
            selectedArr: [],
            disInfo: res.result.data.disInfo,
            [newOrderCount]: res.result.data.orderAmount,
            [wxOrderCountData]: res.result.data.wxAmount,
          })

          wx.setStorageSync('disInfo', res.result.data.disInfo);
          this.calculateSlider(0); // 更新滑块宽度和位置

        } else {
          this.setData({
            purArr: [],

          })
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
          this.setData({
            purArr: []
          })
        }
      })
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
  bindKeyInput(e) {
    this.setData({
      'disInfo.gbDistributerName': e.detail.value,
    });
  },

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
    if (!this.data.disInfo.gbDistributerName) {
      wx.showToast({
        title: '请输入门店名称',
        icon: 'none'
      });
      return;
    }
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
    purUserSaveMendain(mendian).then(res => {
      if (res.result.code == 0) {
        this.setData({
          disInfo: res.result.data,
        })
        wx.setStorageSync('disInfo', res.result.data);
        wx.setStorageSync('mendianInfo', res.result.data.mendianDepartmentList[0]);
        this._getInitData();
        this.hidePopup();
      }
    })
  },


  // 隐藏弹出层
  hidePopup() {
    this.setData({
      showPage: false
    });
  },

  _userLogin() {
    wx.login({
      success: (resLogin) => {
        gbLoginIndex(resLogin.code)
          .then((res) => {
            console.log("res.re", res.result)
            if (res.result.code !== -1) {
              if (res.result.data !== "noBuyer") {
                wx.setStorageSync('disInfo', res.result.data.disInfo);
                wx.setStorageSync('userInfo', res.result.data.depUserInfo);
                var admin = res.result.data.depUserInfo.gbDuAdmin;
                if (admin == 2) {
                  var avatarUrl = '';
                  if (res.result.data.depUserInfo.gbDuWxAvartraUrl) {
                    avatarUrl = apiUrl.server + res.result.data.depUserInfo.gbDuWxAvartraUrl;
                  } else {
                    avatarUrl = '/images/user.png';
                  }
                  this.setData({
                    avatarUrl: avatarUrl,
                    disInfo: res.result.data.disInfo,
                    userInfo: res.result.data.depUserInfo,
                    disId: res.result.data.disInfo.gbDistributerId,
                    depId: res.result.data.disInfo.mendianDepartmentList[0].gbDepartmentId,
                  })
                  if (res.result.data.disInfo.nxDistributerGbDistributerEntity !== null) {
                    this.setData({
                      hasNxDis: true,
                    })
                  } else {
                    this.setData({
                      hasNxDis: false,
                    })
                  }

                  wx.setStorageSync('mendianInfo', res.result.data.disInfo.mendianDepartmentList[0]);
                  this._checkIfShowPage();
                  this._getInitData();
                } else {
                  console.log("admidndndidid==111111")
                  wx.setStorageSync('orderDepInfo', res.result.data.depInfo);
                  wx.redirectTo({
                    url: '../../subPackage-ai/pages/ai/chefOrderDep/chefOrderDep',
                  })
                }

              } else {
                console.log("111")
                wx.redirectTo({
                  url: '../../subPackage/pages/gbMarket/jinriListWithLogin/jinriListWithLogin',
                })

              }

              //跳转到首页
            } else {
              wx.redirectTo({
                url: '../tro/tro',
              })
            }
          })
      }
    })
  },



  toStock() {
    console.log("dstooddkckc")
    wx.navigateTo({
      url: '../../subPackage-charts/pages/stock/index/index',
    })
  },



  toFinishPurGoods(e) {
    var arr = this._getPurSelArr();
    wx.setStorageSync('purArr', arr);
    wx.navigateTo({
      url: '../../subPackage/pages/purGoods/purGoods',
    })
  },

  _getPurSelArr() {
    var arr = this.data.selectedArr;
    var temp = [];
    if (arr.length > 0) {
      for (var i = 0; i < arr.length; i++) {
        console.log("itetm==", arr[i].item)
        arr[i].item.purchaseDepartmentEntity = null;
        arr[i].item.purchaseDepartmentUser = null;
        arr[i].item.wasteDepartmentEntities = null;
        temp.push(arr[i].item);
      }
    }
    return temp;
  },


  toOrderApp(e) {
    var arr = this._getPurSelArr();
    wx.setStorageSync('selArr', arr);
    console.log("toOrderApp")
    wx.navigateTo({
      url: '../../subPackage-supplier/pages/supplier/supplierOrder/supplierOrder',
    })

  },


  cancelDisBatch() {
    this.setData({
      isTishi: false
    })
    if (this.data.batchId !== -1) {
      deleteDisBatch(this.data.batchId)
        .then(res => {
          if (res.result.code == 0) {
            // this._getWxPurGoods();
          }
        })
    }

  },



  //

  cancelGbNxDataItem(e) {
    deleteDisPurAndNxDataItem(e.currentTarget.dataset.id)
      .then(res => {
        if (res.result.code == 0) {
          this._getAppOrder();
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
          this._getAppOrder();
        }
      })
  },

  cancelGbBatchItem() {
    this.setData({
      showOperation: false
    })
    if(this.data.editPurGoods.gbDpgOrdersWeightAmount > 0){
      wx.showModal({
        title: '供货商已出库',
        content: '如果要取消订货，请供货商先设置商品为“重新拣货称重”',
        showCancel: false,
        confirmText: "好的",
        complete: (res) => {
         
        }
      })

    }else{
      
      var id = this.data.editPurGoods.gbDistributerPurchaseGoodsId;
      deleteDisPurBatchGbItem(id)
        .then(res => {
          if (res.result.code == 0) {
            if (this.data.hasNxDis) {
              this._initBatchWithNxData();
            } else {
              this._initBatchData();
            }
          } else {
            wx.showToast({
              title: res.result.msg,
              icon: 'none'
            })
  
          }
        })
    }
    
  },



  receiveGbBatchItem() {
    this.setData({
      showOperation: false
    })
    if(this.data.editBatch.gbDpbStatus  < 2 ){
      wx.showModal({
        title: '出库',
        content: '如果要取消订货，请供货商先设置商品为“重新拣货称重”',
        showCancel: false,
        confirmText: "好的",
        complete: (res) => {
         
        }
      })

    }else{
      
      var id = this.data.editPurGoods.gbDistributerPurchaseGoodsId;
      receiveGbBatchItem(id)
        .then(res => {
          if (res.result.code == 0) {
            if (this.data.hasNxDis) {
              this._initBatchWithNxData();
            } else {
              this._initBatchData();
            }
          } else {
            wx.showToast({
              title: res.result.msg,
              icon: 'none'
            })
  
          }
        })
    }
    
  },


  toAiOrders() {

    console.log("aa")
    wx.setStorageSync('mendianInfo', this.data.disInfo.mendianDepartmentList[0])
    wx.navigateTo({
      url: '../../subPackage-ai/pages/ai/chefOrder/chefOrder',
    })
  },



  // swiper one

  selectItem(e) {
    var index = e.currentTarget.dataset.index;
    var id = e.currentTarget.dataset.id;
    console.log(index);
    console.log(this.data.purArr);
    var item = this.data.purArr[index];
    var itemSelected = this.data.purArr[index].isSelected;
    var selectedData = "purArr[" + index + "].isSelected";
    var selectedArrTemp = this.data.selectedArr;

    if (itemSelected) {
      selectedArrTemp.splice(selectedArrTemp.findIndex(item => item.id === id), 1);
      this.setData({
        [selectedData]: false,
        selectedArr: selectedArrTemp
      })
      var orderArr = this.data.purArr[index].gbDistributerGoodsEntity.gbDepartmentOrdersEntities;
      console.log(orderArr.length);
      for (var i = 0; i < orderArr.length; i++) {

        var orderData = "purArr[" + index + "].gbDistributerGoodsEntity.gbDepartmentOrdersEntities[" + i + "].isNotice";
        this.setData({
          [orderData]: false
        })

      }

    } else {
      var item = {
        item: item,
        goodsIndex: index,
        id: id
      }
      selectedArrTemp.push(item);
      // var userData = "purArr[" + index + "].gbDpgPurUserId";
      this.setData({
        [selectedData]: true,
        // [userData]: this.data.userInfo.gbDepartmentUserId,
        selectedArr: selectedArrTemp
      })

      var arr = this.data.purArr[index].gbDistributerGoodsEntity.gbDepartmentOrdersEntities;
      for (var i = 0; i < arr.length; i++) {
        var orderChoicedData = "purArr[" + index + "].gbDistributerGoodsEntity.gbDepartmentOrdersEntities[" + i + "].isNotice";
        this.setData({
          [orderChoicedData]: true
        })
      }
    }
  },


  selectOrders(e) {
    console.log(e);
    var index = e.currentTarget.dataset.index;
    var orderIndex = e.currentTarget.dataset.orderindex;
    var orderChoiced = this.data.purArr[index].gbDistributerGoodsEntity.gbDepartmentOrdersEntities[orderIndex].isNotice;
    console.log(this.data.purArr[index].gbDistributerGoodsEntity.gbDepartmentOrdersEntities[orderIndex].gbDoQuantity)
    var arr = this.data.purArr[index].gbDistributerGoodsEntity.gbDepartmentOrdersEntities;
    var orderChoicedData = "purArr[" + index + "].gbDistributerGoodsEntity.gbDepartmentOrdersEntities[" + orderIndex + "].isNotice";
    if (orderChoiced) {
      this.setData({
        [orderChoicedData]: false
      })
      var noChoiceAmount = 0;
      for (var i = 0; i < arr.length; i++) {
        var choice = arr[i].isNotice;
        if (!choice) {
          noChoiceAmount = Number(noChoiceAmount) + Number(1);
        }
      }
      console.log("noechociicid", noChoiceAmount);
      console.log("noechociicid", arr.length);
      if (noChoiceAmount == arr.length) {
        var goodsSelectedData = "purArr[" + index + "].isSelected";
        var selArr = this.data.selectedArr;
        var newSelArr = selArr.filter(item => item.goodsIndex !== index);
        this.setData({
          [goodsSelectedData]: false,
          selectedArr: newSelArr
        })
      }
    } else {
      this.setData({
        [orderChoicedData]: true
      })

      var id = this.data.purArr[index].gbDistributerPurchaseGoodsId;
      var selectedArrTemp = this.data.selectedArr;
      var item = this.data.purArr[index];

      if (selectedArrTemp.length > 0) {
        for (var i = 0; i < selectedArrTemp.length; i++) {
          var selid = selectedArrTemp[i].id;
          if (id == selid) {
            selectedArrTemp.splice(i, 1);
          }
        }

        var item = {
          item: item,
          goodsIndex: index,
          id: id
        }
        selectedArrTemp.push(item);

        var selectedData = "purArr[" + index + "].isSelected";
        this.setData({
          [selectedData]: true,
          selectedArr: selectedArrTemp
        })
      } else {
        var temp = [];
        var item = {
          item: item,
          goodsIndex: index,
          id: id
        }
        temp.push(item);
        var selectedData = "purArr[" + index + "].isSelected";
        this.setData({
          [selectedData]: true,
          selectedArr: temp
        })
      }
    }
  },


  
  deleteOrderGoods(e) {
    var selArr = this.data.selectedArr;
    var index = e.currentTarget.dataset.index;
    var selItem = this.data.selectedArr[index];
    var selgoodsIndex = selItem.goodsIndex;
    var purData = "purArr[" + selgoodsIndex + "].isSelected";
    selArr.splice(index, 1);
    var orderArr = this.data.purArr[selgoodsIndex].gbDepartmentOrdersEntities;
    if (orderArr.length > 0) {
      for (var i = 0; i < orderArr.length; i++) {
        var oderData = "purArr[" + selgoodsIndex + "].gbDepartmentOrdersEntities[" + i + "].isNotice";
        this.setData({
          [oderData]: false
        })
      }
    }
    this.setData({
      [purData]: false,
      selectedArr: selArr
    })
    if (selArr.length == 0) {
      this.setData({
        showOperation: false
      })
    }
  },



  /**
   * 计算偏移量
   */
  calculateSlider(index) {
    const query = wx.createSelectorQuery();
    query.select(`#tab-${index}`).boundingClientRect(); // 获取选中 Tab 的宽度和位置
    query.exec(res => {
      const tabRect = res[0]; // 当前 Tab 的位置信息
      this.setData({
        sliderWidth: tabRect.width, // 设置滑块宽度等于 Tab 宽度
        sliderLeft: tabRect.left, // 设置滑块左侧偏移量等于 Tab 的左边距
      });
    });
  },

  /**
   * tabItme点击
   */
  onTab1Click(event) {
    let index = event.currentTarget.dataset.index;
    this.setData({
      tab1Index: index,
      itemIndex: index,
    })

  },

  /**
   * 动画结束时会触发 animationfinish 事件
   */
  swiperChange(event) {
    this.setData({
      tab1Index: event.detail.current,
      itemIndex: event.detail.current,
      selectedArr: []
    })

    if (this.data.tab1Index == 0) {
      this._getInitData();
    }
    if (this.data.tab1Index == 1) {
      if (this.data.hasNxDis) {
        this._initBatchWithNxData();
      } else {
        this._initBatchData();
      }

    }

    this.calculateSlider(event.detail.current); // 更新滑块宽度和位置
  },





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
    }, 100)
  },

  hideModal: function (e) {
    var that = this;
    var animation = wx.createAnimation({
      duration: 2000,
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
    }, 4000)
  },



  hideMask() {
    this.setData({
      showOperation: false,
    })
    this.hideModal();
  },


  hide() {
    this.setData({
      showChoice: false
    })
  },

  toEditHome() {
    wx.navigateTo({
      url: '../../subPackage-charts/pages/management/homePage/homePage?disId=' + this.data.disId,
    })
  },


  showCar() {
    this.setData({
      showGoods: true,
    })
  },

  closeGoods() {
    this.setData({
      showGoods: false,
    })
  },

  toPay() {
    wx.navigateTo({
      url: '../../subPackage/pages/account/payPage/payPage?type=0',
    })
  },

  toEditUser() {
    wx.navigateTo({
      url: '../../subPackage/pages/account/userEdit/userEdit',
    })
  },

  // xiadan
  toResGoods() {

    wx.navigateTo({
      url: '../../subPackage-goods/pages/goods/resGoods/resGoods',
    })

  },



  showReturnType(e) {
    console.log(e);
    this.setData({
      showReturn: true,
      returnItem: e.currentTarget.dataset.item,
      returnOrders: e.currentTarget.dataset.item.gbDistributerGoodsEntity.gbDepartmentOrdersEntities[0],
      // depName: this.data.userInfo.gbDepartmentEntity.gbDepartmentName
    })

  },

  confirmReturn() {
    var item = this.data.returnItem;
    item.gbDpgPurUserId = this.data.userInfo.gbDepartmentUserId;
    puraserReturnPurGoods(item).then(res => {
      if (res.result.code == 0) {
        this._getInitData();
      }
    })
  },

  /**
   * 切换自动订货状态
   * @param {Object} e 事件对象
   */
  changeAutoGoods(e) {
    const goodsId = this.data.editPurGoods.gbDistributerGoodsEntity.gbDistributerGoodsId;
    const supplierId = this.data.batchSupplier.nxJrdhSupplierId;
    const currentGsId = this.data.editPurGoods.gbDistributerGoodsEntity.gbDgGbSupplierId;

    // 如果当前供货商ID不等于批次供货商ID，说明未开启自动订货，需要开启
    // 如果当前供货商ID等于批次供货商ID，说明已开启自动订货，需要取消
    const changeSupplierId = (supplierId !== currentGsId) ? supplierId : -1;

    // 简单设置显示小贴士
    this.setData({
      showTip: true,
      showOperation: false
    });

    load.showLoading((supplierId !== currentGsId) ? "开启自动订货中..." : "取消自动订货中...");
    // 调用API更新自动订货状态
    addAutoOrderGoods({
      supplierId: changeSupplierId,
      goodsId: goodsId
    }).then(res => {
      load.hideLoading();

      if (res.result.code === 0) {
        // 显示成功提示
        wx.showToast({
          title: (supplierId !== currentGsId) ? '已开启自动订货' : '已关闭自动订货',
          icon: 'success',
          duration: 2000
        });
        var data = "batchArr[" + this.data.bIndex + "].gbDPGEntities[" + this.data.gIndex + "].gbDistributerGoodsEntity";

        res.result.data.gbDepartmentOrdersEntities = this.data.gDepArr;
        this.setData({
          [data]: res.result.data,
        })

      } else {
        wx.showToast({
          title: res.result.msg || '操作失败',
          icon: 'none'
        });
        // 失败时隐藏小贴士
        this.setData({
          showTip: false
        });
      }
    })

  },



  onShareAppMessage(e) {
    return new Promise((resolve, reject) => {

      var arr = this._getPurSelArr();
      var batch = {
        gbDpbPurUserId: this.data.userInfo.gbDepartmentUserId,
        gbDpbDistributerId: this.data.disInfo.gbDistributerId,
        gbDpbPurDepartmentId: this.data.depId,
        gbDpbUserAdminType: 2,
        gbDPGEntities: arr,
        gbDpbPurchaseType: 2,
        gbDpbBuyUserOpenId: this.data.userInfo.gbDuWxOpenId,
      };

      load.showLoading("保存订货")
      saveDisPurGoodsBatchGb(batch).then(res => {
        load.hideLoading();

        if (res.result.code == 0) {
          var batchId = res.result.data.gbDistributerPurchaseBatchId;
          var retName = this.data.disInfo.gbDistributerName;
          var userId = this.data.userInfo.gbDepartmentUserId;
          var depId = this.data.depId;
          this.setData({
            isTishi: true,
            selectedArr: [],
            batchId: batchId, // 保存batchId
            retName: retName // 保存retName
          });

          resolve({
            title: "订货商品", // 默认是小程序的名称(可以写slogan等)
            path: `subPackage/pages/gbMarket/gbOrderBatch/gbOrderBatch?batchId=${batchId}&retName=${retName}&disId=${this.data.disInfo.gbDistributerId}&fromBuyer=1&depId=${depId}&buyUserId=${userId}`,
            imageUrl: this.data.url + '/userImage/say.png',
          })
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
      })
    })

  },




  toEditPurGoods(e) {
    this.setData({
      bIndex: e.currentTarget.dataset.bindex,
      gIndex: e.currentTarget.dataset.gindex,
      gDepArr: e.currentTarget.dataset.item.gbDistributerGoodsEntity.gbDepartmentOrdersEntities,
      goodsSupplierId: e.currentTarget.dataset.item.gbDistributerGoodsEntity.gbDgGbSupplierId,
      selSupplerId: e.currentTarget.dataset.item.gbDpgPurchaseNxSupplierId,
      showOperation: true,
      editPurGoods: e.currentTarget.dataset.item,
      batchSupplier: e.currentTarget.dataset.supplier,
      editBatch: e.currentTarget.dataset.batch,

    })

  },








showFinish(e){
  this.setData({
    showReceiveWarn: true,
    editBatch: e.currentTarget.dataset.item,
  })
},
hideReceive(){
  this.setData({
    showReceiveWarn: false,
    editBatch: "",
  })
},

  toReceiveBatch(){
  this.setData({
    showReceiveWarn: false
  })
  var id = this.data.editBatch.gbDistributerPurchaseBatchId;
  load.showLoading("收货中");
  receiveGbBatch(id).then(res =>{
    load.hideLoading();
    if(res.result.code == 0){
      if (this.data.hasNxDis) {
        this._initBatchWithNxData();
      } else {
        this._initBatchData();
      }

    }else{
      
      wx.showToast({
        title: res.result.msg,
        icon: 'none'
      })
    }
  })

},



delTuihuo(e){

  var id = e.currentTarget.dataset.id;
  
  // 显示确认弹窗
  wx.showModal({
    title: '确认取消退货',
    content: '您确定要取消退货吗？',
    showCancel: true,
    confirmText: '确认',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        // 用户点击确认，执行取消退货操作
        cancleTuihuoByPurGoodsId(id).then(res =>{
          if(res.result.code == 0){
            if (this.data.hasNxDis) {
              this._initBatchWithNxData();
            } else {
              this._initBatchData();
            }
          }
        })
      }
      // 如果用户点击取消，不执行任何操作
    }
  })

},  




})