var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
var config = require('../../../../config/index.js');
var dateUtils = require('../../../../utils/dateUtil');
var chartsApi = require('../../../services/api.js');

Page({

  onShow() {
    // 推荐直接用新API
    let windowInfo = wx.getWindowInfo();
    let globalData = getApp().globalData;
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
    });

    if(this.data.update){
      this._getInitData();
    }
  },

  /**
   * 页面的初始数据
   */
  data: {
    currentTab: 0, // 当前激活的tab: 0-成本, 1-采购, 2-库存
    tabTitles: ['经营报表','成本报表', '采购报表', '库存报表'],
    businessReportArr: [],
    costReportArr: [],
    purchaseReportArr: [],
    stockReportArr: [],
    showOperation: false,
    chooseSize: false,
    animationData: {},
    startDate: '',
    stopDate: '',
    dateType: 'month',
    repId: '',
    depName: '',
    type: '',
    code: '',
    userInfo: {},
    disInfo: {}
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      url: config.server,
      update: false,
      showOperation: false,
      chooseSize: false,
      animationData: {},
      startDate: dateUtils.getFirstDateInMonth(),
      stopDate: dateUtils.getArriveDate(0),
      dateType: 'month'
    })

    var disUserInfo = wx.getStorageSync('userInfo');
    if(disUserInfo){
      this.setData({
        userInfo: disUserInfo
      })
    }

    var disInfo = wx.getStorageSync('disInfo');
    if(disInfo){
      this.setData({
        disInfo: disInfo
      })
    }

    this._getInitData();
  },

  // Tab切换事件（data-index 为字符串，需转数字否则 switch 无法匹配 case 0/1/2/3）
  onTabChange(e) {
    const index = parseInt(e.currentTarget.dataset.index, 10);
    if (Number.isNaN(index)) return;
    this.setData({
      currentTab: index
    });
    this._getInitData();
  },

  // Swiper切换事件
  onSwiperChange(e) {
    const current = Number(e.detail.current);
    this.setData({
      currentTab: Number.isNaN(current) ? 0 : current
    });
    this._getInitData();
  },

  _getInitData() {
    load.showLoading("查询报表中");
    
    const userId = this.data.userInfo.gbDepartmentUserId;
    let currentTab = Number(this.data.currentTab);
    if (Number.isNaN(currentTab)) currentTab = 0;

    let apiCall;
    let dataKey;

    switch (currentTab) {
      case 0:
        apiCall = chartsApi.getDisUserReportsBusiness(userId);
        dataKey = 'businessReportArr';
        break;
      case 1:
        apiCall = chartsApi.getDisUserReportsCost(userId);
        dataKey = 'costReportArr';
        break;
      case 2:
        apiCall = chartsApi.getDisUserReportsPurchase(userId);
        dataKey = 'purchaseReportArr';
        break;
      case 3:
        apiCall = chartsApi.getDisUserReportsStock(userId);
        dataKey = 'stockReportArr';
        break;
      default:
        apiCall = chartsApi.getDisUserReportsBusiness(userId);
        dataKey = 'businessReportArr';
        break;
    }

    if (!apiCall || typeof apiCall.then !== 'function') {
      load.hideLoading();
      return;
    }

    apiCall.then(res => {
      load.hideLoading();
      console.log(res.result)
      if (res.result.code == 0) {
        const raw = res.result.data || [];
        const withKeys = raw.map((item, idx) => {
          const id = item.report && item.report.gbReportId;
          return Object.assign({}, item, {
            _listKey: id != null && id !== '' ? id : `idx-${idx}`
          });
        });
        const updateData = {};
        updateData[dataKey] = withKeys;
        this.setData(updateData);
      }
    }).catch(err => {
      load.hideLoading();
      console.error('获取报表数据失败:', err);
    });
  },

  openOperation(e) {
    this.setData({
      showOperation: true,
      repId: e.currentTarget.dataset.id,
      depName: e.currentTarget.dataset.name,
      type: e.currentTarget.dataset.type,
      code: e.currentTarget.dataset.code
    })

    this.chooseSezi();
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
    }, 20)
  },

  hideMask() {
    this.hideModal();
    this.setData({
      showOperation: false,
    })
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

  deleteReport(e) {
    chartsApi.delteReport(this.data.repId).then(res => {
      if (res.result.code == 0) {
        this._getInitData();
      }
    })
  },

  testPdf(){
    var that = this;
    load.showLoading("下载PDF....")
    wx.downloadFile({
      url: config.apiUrl + 'reportPDF/downloadReportPdfGb?id=1'+'&startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate,
      header: {},
      success(res) {
        if (res.statusCode === 200) {
          console.log('下载成功，临时文件路径：', res.tempFilePath);
          console.log('文件大小：', res.tempFileSize);
    
          wx.openDocument({
            filePath: res.tempFilePath,
            fileType: 'pdf',
            success: function () {
              console.log('打开 PDF 成功');
            },
            fail: function (err) {
              console.error('打开 PDF 失败：', err);
            }
          });
        } else {
          console.error('下载失败，状态码：', res.statusCode);
        }
      },
      fail(err) {
        console.error('下载失败：', err);
        wx.showToast({
          title: '下载失败',
          icon: 'none'
        });
      },
      complete() {
        load.hideLoading();
      }
    });
  },

  creatExcel1() {
    if(this.data.code !== -1){
      var that = this;
      load.showLoading("下载Excel表中....")
      wx.downloadFile({
        url: config.apiUrl + 'gbreport/downloadReportExcelGb?id=' + this.data.repId
        +'&startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate,
        header: {},
        success(res) {
          if (res.statusCode === 200) {
            console.log(res);
            var tempFilePath = res.tempFilePath;
            var path = wx.env.USER_DATA_PATH + "/" + that.data.depName + that.data.startDate +"-" + that.data.stopDate+ that.data.type +  ".xls"
            wx.saveFile({
              tempFilePath: tempFilePath,
              filePath: path,
              fileType: 'xls',
              success(sRes) {
                wx.openDocument({
                  filePath: sRes.savedFilePath,
                  showMenu: true,
                  fileType: 'xls',
                  success: function (oRes) {
                    console.log("open")
                    that.hideMask();
                  }
                })
              },
              fail(sF) {
                console.log(sF);
                wx.showToast({
                  title: '保存失败',
                })
              }
            })
          }
        },
        fail() {
          wx.showToast({
            title: '下载失败',
            icon: 'none'
          })
        },
        complete() {
          load.hideLoading();
        }
      })
    }else{
      wx.showModal({
        title: '没必要生成表',
        content: '没有数据',
        showCancel: false,
        complete: (res) => {
        }
      })
    }
  },

  
  
  creatExcel() {
    if(this.data.code !== -1){
      var that = this;
      load.showLoading("下载Excel表中....")
      
      wx.downloadFile({
        url: config.apiUrl + 'gbreport/downloadReportExcelGb?id=' + this.data.repId
        +'&startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate,
        // 不传filePath，让系统自动分配临时路径
        success(res) {
          console.log('下载成功:', res);
          if (res.statusCode === 200) {
            const tempFilePath = res.tempFilePath;
            
            // 保存到稳定路径
            const filePath = `${wx.env.USER_DATA_PATH}/report_${Date.now()}.xls`;
            
            wx.getFileSystemManager().saveFile({
              tempFilePath: tempFilePath,
              filePath: filePath,
              success(saveRes) {
                console.log('保存成功:', saveRes);
                // 使用保存后的稳定路径打开文档
                wx.openDocument({
                  filePath: saveRes.savedFilePath,
                  showMenu: true,
                  fileType: 'xls',
                  success: function (oRes) {
                    console.log("打开文档成功");
                    that.hideMask();
                  },
                  fail: function(err) {
                    console.error("打开文档失败:", err);
                    wx.showToast({
                      title: '文件打开失败',
                      icon: 'none'
                    });
                  }
                });
              },
              fail(saveErr) {
                console.error('保存失败:', saveErr);
                // 保存失败，直接尝试用临时路径打开
                wx.openDocument({
                  filePath: tempFilePath,
                  showMenu: true,
                  fileType: 'xls',
                  success: function (oRes) {
                    console.log("使用临时路径打开成功");
                    that.hideMask();
                  },
                  fail: function(err) {
                    console.error("使用临时路径失败:", err);
                    wx.showToast({
                      title: '文件处理失败',
                      icon: 'none'
                    });
                  }
                });
              }
            });
          } else {
            console.error('下载失败，状态码:', res.statusCode);
            wx.showToast({
              title: '下载失败',
              icon: 'none'
            });
          }
        },
        fail(err) {
          console.error('下载失败:', err);
          wx.showToast({
            title: '下载失败',
            icon: 'none'
          });
        },
        complete() {
          load.hideLoading();
        }
      });
    } else {
      wx.showModal({
        title: '没必要生成表',
        content: '没有数据',
        showCancel: false
      });
    }
  },


  // 根据当前tab跳转到不同的页面
  toDate(){
    const currentTab = this.data.currentTab;
    let url = '';
    
    switch(currentTab) {
      case 0: // 成本报表
        url = '../dateReport/dateReport?type=business';
        break;
      case 1: // 成本报表
        url = '../dateReport/dateReport?type=cost';
        break;
      case 2: // 采购报表
        url = '../dateReport/dateReport?type=purchase';
        break;
      case 3: // 库存报表
        url = '../subDepStock/subDepStock';
        break;
    }
    
    wx.navigateTo({
      url: url,
    })
  },

  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },

})


