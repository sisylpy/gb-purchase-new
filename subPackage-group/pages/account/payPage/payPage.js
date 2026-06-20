const globalData = getApp().globalData;
var app = getApp()
var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config/index.js'
import {
  gbDisBuyUser,
  gbDisGetBuyType,
  buyMachines,
  addPoints,
} from '../../../../services/apiDistributerPay.js'

let itemWidth = 0;
let windowWidth = 0;

Page({

  /**
   * 视口与中间滑动区高度（扣除顶部导航 + Tab + 底部固定购买栏）
   */
  _syncLayoutMetrics() {
    var windowInfo = wx.getWindowInfo();
    var gd = getApp().globalData;
    var rpxR = gd.rpxR;
    var windowHeightRpx = windowInfo.windowHeight * rpxR;
    var navBarHeightRpx = gd.navBarHeight * rpxR;
    var tabsBarRpx = 80;
    var bottomFixedBarRpx = 176;
    var safeBottomRpx = (windowInfo.safeAreaInsets && windowInfo.safeAreaInsets.bottom)
      ? Math.ceil(windowInfo.safeAreaInsets.bottom * rpxR)
      : 0;
    var bottomReserveRpx = bottomFixedBarRpx + safeBottomRpx;
    var contentSwiperHeight = windowHeightRpx - navBarHeightRpx - tabsBarRpx - bottomReserveRpx;
    if (contentSwiperHeight < 200) {
      contentSwiperHeight = 200;
    }
    this.setData({
      windowWidth: windowInfo.windowWidth * rpxR,
      windowHeight: windowHeightRpx,
      navBarHeight: navBarHeightRpx,
      statusBarHeight: gd.statusBarHeight * rpxR,
      contentSwiperHeight: contentSwiperHeight,
      bottomReserveRpx: bottomReserveRpx,
    });
  },

  onShow: function () {
    this._syncLayoutMetrics();
    if (this.data.type !== undefined) {
      this.clueOffset(this.data.type);
    }
  },
  /**
   * 页面的初始数据
   */
  data: {
    sliderOffset: 0,
    sliderOffsets: [],
    sliderLeft: 0,
    tabs: [

      {
        name: "流量",
        amount: "",
        amountOk: "",
      }, {
        name: "扩展",
        amount: "",
        amountOk: "",
      }
      
    ],
    selArr: [],
    aaa: 0,
    type: 0,
    currentTab: 0,

    expired: false, // 默认未过期
    haveLiwu: false,
    countdownText: '',

    contentSwiperHeight: 400,
    bottomReserveRpx: 176,

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    var disInfoValue = wx.getStorageSync('disInfo');
    if (disInfoValue) {
      this.setData({
        disInfo: disInfoValue,
        disId: disInfoValue.gbDistributerId,

      })
    }

    // 保存 type 参数，供 onShow 使用
    if (options.type !== undefined) {
      this.setData({
        type: parseInt(options.type)
      });
    }



    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo
      })
    }



    this.setData({
      rpxR: globalData.rpxR,
      url: apiUrl.server,
      selIndex: 0,
      img: 'userImage/index_share1.png',
    })

    this._syncLayoutMetrics();
    this._initData();
    // clueOffset 现在在 onShow 中调用，确保 windowWidth 已设置


  },


  _showLiwu() {
    var disInfoValue = this.data.disInfo;

    // 检查必要的数据是否存在
    if (!disInfoValue || !disInfoValue.gbDistributerSettleFullTime || !this.data.liwuDay) {
      console.warn('Missing required data for _showLiwu:', {
        disInfo: disInfoValue,
        liwuDay: this.data.liwuDay
      });
      return;
    }

    var dateString = disInfoValue.gbDistributerSettleFullTime;
    
    // 验证日期字符串格式
    if (!dateString || typeof dateString !== 'string' || !dateString.includes(' ') || !dateString.includes('-')) {
      console.warn('Invalid date string format:', dateString);
      return;
    }

    try {
      const dateParts = dateString.split(" ");
      const dateArray = dateParts[0].split("-"); // 获取 "YYYY-MM-DD"
      const timeArray = dateParts[1].split(":"); // 获取 "HH:MM:SS"

      // 验证日期和时间数组
      if (dateArray.length !== 3 || timeArray.length < 2) {
        console.warn('Invalid date or time format:', { dateArray, timeArray });
        return;
      }

      // 验证 liwuDay 是否为有效数字
      const liwuDay = parseInt(this.data.liwuDay);
      if (isNaN(liwuDay) || liwuDay < 0) {
        console.warn('Invalid liwuDay value:', this.data.liwuDay);
        return;
      }

      // 使用 Date.UTC 来创建 UTC 时间
      const utcDate = Date.UTC(
        parseInt(dateArray[0], 10), // 年
        parseInt(dateArray[1], 10) - 1, // 月，注意：JavaScript 中月份是从 0 开始的
        parseInt(dateArray[2], 10), // 日
        parseInt(timeArray[0], 10), // 时
        parseInt(timeArray[1], 10), // 分
        parseInt(timeArray[2] || 0, 10) // 秒，如果没有秒数则默认为0
      );

      // 验证 UTC 日期是否有效
      if (isNaN(utcDate)) {
        console.warn('Invalid UTC date calculated:', utcDate);
        return;
      }

      const newDate = new Date(utcDate + liwuDay * 24 * 60 * 60 * 1000); // 加上天数（转成毫秒）
      
      // 验证新日期是否有效
      if (isNaN(newDate.getTime())) {
        console.warn('Invalid new date calculated:', newDate);
        return;
      }

      var ddd = newDate.toISOString().slice(0, 19).replace("T", " "); // 格式化为 "YYYY-MM-DD HH:MM:SS" 格式
      
      this.setData({
        currentTime: disInfoValue.gbDistributerSettleFullTime, // 假设当前时间
        endTime: ddd,
      })

      const that = this;
      const currentTime = new Date(this.data.currentTime.replace(/-/g, '/'));
      const endTime = new Date(this.data.endTime.replace(/-/g, '/'));

      // 验证解析后的日期是否有效
      if (isNaN(currentTime.getTime()) || isNaN(endTime.getTime())) {
        console.warn('Invalid parsed dates:', { currentTime, endTime });
        return;
      }

      // 判断活动是否已过期
      if (currentTime > endTime) {
        this.setData({
          expired: true
        });
      } else {
        // 启动倒计时
        const currentTime = new Date();
        const timeDiff = endTime - currentTime;

        // 如果结束时间已经过期
        if (timeDiff <= 0) {
          clearInterval(that.interval);
          that.setData({
            expired: true
          });
          return;
        }

        // 计算剩余的天、小时、分钟、秒
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

        // 更新倒计时文本
        that.setData({
          countdownText: `${days}天 ${hours} 小时 ${minutes}分钟`
        });

        // this.startCountdown(endTime);
      }
    } catch (error) {
      console.error('Error in _showLiwu:', error);
      // 设置默认值，避免页面崩溃
      this.setData({
        expired: true,
        countdownText: '时间计算错误'
      });
    }

    var haveLiwu = wx.getStorageSync('haveLiwu');
    if(haveLiwu){
      this.setData({
        haveLiwu: true,
      })
    }else{
      this.setData({
        haveLiwu: false
      })
    }
  },



  startCountdown: function (endTime) {
    const that = this;
    // 每秒更新一次倒计时
    this.interval = setInterval(function () {
      const currentTime = new Date();
      const timeDiff = endTime - currentTime;

      // 如果结束时间已经过期
      if (timeDiff <= 0) {
        clearInterval(that.interval);
        that.setData({
          expired: true
        });
        return;
      }

      // 计算剩余的天、小时、分钟、秒
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      // 更新倒计时文本
      that.setData({
        countdownText: `${days}天 ${hours} 小时 ${minutes}分钟`
      });
    }, 10000);
  },

  getLiwu: function () {
    if (this.data.disInfo.gbDistributerBuyQuantity > 50) {

      var data = {
        disId: this.data.disId,
        points: this.data.liwu
      }
      var that = this;
      addPoints(data).then(res => {
        if (res.result.code == 0) {
         wx.showModal({
           title: '领取成功！',
           content: this.data.liwu + '点已到帐',
           showCancel:false,
           complete: (res) => {
             if (res.confirm) {
              wx.setStorageSync('haveLiwu', true);
              that.setData({
                haveLiwu: true,
              })
             }
           }
         })
         
        }
      })

    } else {
      wx.showToast({
        title: '需要先充值',
        icon: 'none'
      });
    }



  },



  changeIndex(e) {
    var index = e.currentTarget.dataset.index;
    this.setData({
      selIndex: index,
      orderSubtotal: this.data.payArr[index].gbGdpPaySubtotal,
      quantity: this.data.payArr[index].gbGdpBuyQuantity,
    })
  },



  _initData() {
    var data = {
      disId: this.data.disId,
      type: this.data.type,
    }
    var that  = this;
    load.showLoading("获取数据中");
    gbDisGetBuyType(data).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        this.setData({
          payArr: res.result.data.list,
          payEntities: res.result.data.payEntities,
          liwu: res.result.data.liwu,
          liwuDay: res.result.data.liwuDay,
          disInfo: res.result.data.disInfo,

        })
        wx.setStorageSync('disInfo', res.result.data.disInfo);
        that._showLiwu();
        if (this.data.currentTab < 2) {
          this.setData({
            orderSubtotal: res.result.data.list[0].gbGdpPaySubtotal,
            quantity: res.result.data.list[0].gbGdpBuyQuantity,
          })
        } else {
          this.setData({
            orderSubtotal: 0,
            quantity: 0,
          })

        }
      }
    })


  },



  toDep() {

    wx.navigateTo({
      url: '../selDepartment/selDepartment?quantity=' + this.data.quantity + "&subtotal=" + this.data.orderSubtotal,
    })
  },


  gorRunnerLobbyList() {
    var arr = [];
    var sel = this.data.selArr;
    for (var i = 0; i < sel.length; i++) {

      var price = sel[i].perPrice;

      var one = {
        gbGdpPaySubtotal: sel[i].gbGdpPaySubtotal,
        payUserOpenId: this.data.userInfo.gbDuWxOpenId,
        gbGdpBuyQuantity: 1,
        gbGdpGbDisId: this.data.disInfo.gbDistributerId,
        gbGdpType: sel[i].gbGdpType,
        gbGdpImgUrl: sel[i].gbGdpImgUrl,
        gbGdpSellDetail: sel[i].gbGdpSellDetail,
      }
      arr.push(one);
    }

    buyMachines(arr)
      .then(res => {
        if (res.result.code == 0) {
          var map = res.result.map;

          wx.requestPayment({
            nonceStr: map.nonceStr,
            package: map.package,
            signType: "MD5",
            timeStamp: map.timeStamp,
            paySign: map.paySign,

            success: function (resPay) {
              wx.showToast({
                title: '充值成功',

              })
              wx.navigateBack({
                delta: 1
              })

            },
            fail: function (res) {

            }
          })


        }
      })
  },

  gorRunnerLobby: function (e) {

    var that = this;
    var data = {
      disId: this.data.disId,
      openId: this.data.userInfo.gbDuWxOpenId,
      subtotal: this.data.orderSubtotal,
      type: this.data.type,
      quantity: this.data.quantity,
    }

    gbDisBuyUser(data)
      .then(res => {
        if (res.result.code == 0) {
          var map = res.result.map;

          wx.requestPayment({
            nonceStr: map.nonceStr,
            package: map.package,
            signType: "MD5",
            timeStamp: map.timeStamp,
            paySign: map.paySign,

            success: function (resPay) {

              wx.showToast({
                title: '充值成功',

              })
              wx.navigateBack({
                delta: 1
              });


            },
            fail: function (res) {

            }
          })


        }
      })
  },



  /**
   * 计算偏移量
   */
  clueOffset(type) {
    // 检查必要的数据是否存在
    if (!this.data.windowWidth || !this.data.tabs || this.data.tabs.length === 0) {
      console.warn('Missing required data for clueOffset:', {
        windowWidth: this.data.windowWidth,
        tabs: this.data.tabs
      });
      return;
    }

    itemWidth = Math.ceil(this.data.windowWidth / this.data.tabs.length);
    
    // 检查 itemWidth 是否有效
    if (isNaN(itemWidth) || itemWidth <= 0) {
      console.warn('Invalid itemWidth calculated:', itemWidth);
      return;
    }
    
    let tempArr = [];
    for (let i in this.data.tabs) {
      tempArr.push(itemWidth * i);
    }
    // tab 样式初始化
    this.setData({
      sliderOffsets: tempArr,
      sliderLeft: (this.data.windowWidth / 8),
    });

  },

  /**
   * tabItme点击
   */
  onTab1Click(event) {

    this.setData({
      currentTab: event.currentTarget.dataset.current,
      selIndex: 0,
    })

  },


  bindChange: function (e) {
    this.setData({
      currentTab: e.detail.current,
      sliderOffset: this.data.sliderOffsets[e.detail.current],
      type: e.detail.current,
      selIndex: 0,
    })

    this._initData()

  },

  toAddBusiness(){
    wx.navigateTo({
      url: '/subPackage-mendian/pages/mendian/addDepartment/addDepartment?disId=' + this.data.disId,
    })
  },

  // // 跳转客服
  toCustomerServicePages: function () {
    try {
      wx.openCustomerServiceChat({
        extInfo: {
          url: 'https://work.weixin.qq.com/kfid/kfce23df54c35579b3f' //客服ID
        },
        corpId: 'ww9778dea409045fe6', //企业微信ID
        success(res) {

        },fail(resF) {
          
        }
      })
    } catch (error) {
      showToast("请更新至微信最新版本")
    }
  },


  /**
   * 邀请采购员
   * @param {*} options 
   */
  onShareAppMessage: function (options) {
    return {
      title: "向你推荐专业的饭店采购小程序", // 默认是小程序的名称(可以写slogan等)
      path: '/pages/inviteTro/inviteTro?disId=' + this.data.userInfo.gbDuDistributerId +
        '&disName=' + this.data.disInfo.gbDistributerName,
      imageUrl: this.data.url + this.data.img,
    }
  },



  addMachine(e) {

    var index = e.currentTarget.dataset.index;
    var arr = this.data.selArr;
    var item = this.data.payArr[index];
    var data = "payArr[" + index + "].isSelected";
    if (item.isSelected) {
      this.setData({
        [data]: false
      })
      var purId = item.perPrice;
      var choicePrintArr = arr.filter(item => item.perPrice !== purId);
      this.setData({
        selArr: choicePrintArr
      })

    } else {
      this.setData({
        [data]: true
      })
      var selArr = this.data.selArr;
      selArr.push(item);
      this.setData({
        selArr: selArr
      })
    }

    var selArr = this.data.selArr;
    var total = 0;
    if (selArr.length > 0) {
      for (var i = 0; i < selArr.length; i++) {
        total += Number(selArr[i].gbGdpPaySubtotal);
      }
    }
    this.setData({
      orderSubtotal: total,
      aaa: total
    })

  },

  toBack() {
    wx.navigateBack({
      delta: 1
    })
  },


})