const globalData = getApp().globalData;

var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil.js')
var apiUrl = require('../../../../config/index');
var api = require('../../../services/api.js');
var foodSalesTemplateWx = require('../../../../lib/foodSalesTemplateWx.js');
var foodSalesExcelApi = require('../../../../lib/foodSalesExcelApi.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    // 模式：single 或 batch
    isBatch: false,
    departmentId: '',
    
    // 单日模式
    singleDate: '',
    
    // 批量模式
    startDate: '',
    endDate: '',
    batchDays: 0,
    
// 金额
    dineInRevenue: '',
    dineInOrderCount: '',
    dineInCustomerCount: '',
    takeoutRevenue: '',
    takeoutOrderCount: '',
    platformFee: '',

    // 预览
    grossRevenue: '0.00',
    netRevenue: '0.00',
    totalGrossRevenue: '0.00',

    // 模板下载
    showTemplateModal: false,
    templateStartDate: '',
    templateEndDate: '',

    // 菜品销量模板
    showFoodSalesTemplateModal: false,
    foodSalesTemplateStartDate: '',
    foodSalesTemplateEndDate: '',

    // 当天日期（用于限制日期选择）
    todayDate: '',
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const today = dateUtils.getArriveDate(0);
    const firstDay = today.substring(0, 8) + '01';
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      departmentId: options.departmentId || '',
      isBatch: options.type === 'batch',
      todayDate: today,
      foodSalesTemplateStartDate: firstDay,
      foodSalesTemplateEndDate: today,
    })

    // 默认今天
    if (!this.data.isBatch) {
      this.setData({
        singleDate: today
      })
    }
    var disInfo = wx.getStorageSync('disInfo');
    if (disInfo) {
      this.setData({
        disInfo: disInfo,
        departmentId: disInfo.mendianDepartmentList[0].gbDepartmentId,  // 部门ID
      })
    }
  },

  /**
   * 日期选择变化
   */
  onDateChange(e) {
    this.setData({
      singleDate: e.detail.value
    })
  },

  /**
   * 开始日期变化
   */
  onStartDateChange(e) {
    this.setData({
      startDate: e.detail.value
    })
    this._calcBatchDays();
  },

  /**
   * 结束日期变化
   */
  onEndDateChange(e) {
    this.setData({
      endDate: e.detail.value
    })
    this._calcBatchDays();
  },

  /**
   * 计算批量天数
   */
  _calcBatchDays() {
    const start = new Date(this.data.startDate);
    const end = new Date(this.data.endDate);
    
    if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      this.setData({
        batchDays: days
      })
      this._calcPreview();
    }
  },

  /**
   * 堂食营业额输入
   */
  onDineInInput(e) {
    this.setData({
      dineInRevenue: e.detail.value
    })
    this._calcPreview();
  },

  /**
   * 堂食订单数输入
   */
  onDineInOrderInput(e) {
    this.setData({
      dineInOrderCount: e.detail.value
    })
  },

  /**
   * 堂食顾客数输入
   */
  onDineInCustomerInput(e) {
    this.setData({
      dineInCustomerCount: e.detail.value
    })
  },

  /**
   * 回车跳转到堂食订单数（单日模式）
   */
  onDineInOrderFocus() {
    this._focusInput('#dineInOrderInput');
  },

  /**
   * 回车跳转到堂食顾客数（单日模式）
   */
  onDineInCustomerFocus() {
    this._focusInput('#dineInCustomerInput');
  },

  /**
   * 回车跳转到外卖营业额（单日模式）
   */
  onTakeoutInputFocus() {
    this._focusInput('#takeoutRevenueInput');
  },

  /**
   * 回车跳转到外卖订单数（单日模式）
   */
  onTakeoutOrderFocus() {
    this._focusInput('#takeoutOrderInput');
  },

  /**
   * 回车跳转到平台抽成（单日模式）
   */
  onPlatformFeeFocus() {
    this._focusInput('#platformFeeInput');
  },

  /**
   * 回车跳转到外卖营业额（批量模式）
   */
  onTakeoutInputFocusBatch() {
    this._focusInput('#batchTakeoutInput');
  },

  /**
   * 回车跳转到平台抽成（批量模式）
   */
  onPlatformFeeInputFocusBatch() {
    this._focusInput('#batchPlatformFeeInput');
  },

  /**
   * 通用聚焦方法
   */
  _focusInput(id) {
    const query = this.createSelectorQuery().select('#' + id.replace('#', ''));
    query.fieldsForProxy = { id: true };
    query.exec((res) => {
      // 延迟聚焦
      setTimeout(() => {
        const focusQuery = this.createSelectorQuery().select('#' + id.replace('#', ''));
        focusQuery.boundingClientRect().exec((focusRes) => {
          if (focusRes[0]) {
            wx.createSelectorQuery().select('#' + id.replace('#', '')).focus();
          }
        });
      }, 100);
    });
  },

  /**
   * 外卖营业额输入
   */
  onTakeoutInput(e) {
    this.setData({
      takeoutRevenue: e.detail.value
    })
    this._calcPreview();
  },

  /**
   * 外卖订单数输入
   */
  onTakeoutOrderInput(e) {
    this.setData({
      takeoutOrderCount: e.detail.value
    })
  },

  /**
   * 平台抽成输入
   */
  onPlatformFeeInput(e) {
    this.setData({
      platformFee: e.detail.value
    })
    this._calcPreview();
  },

  /**
   * 计算预览金额
   */
  _calcPreview() {
    const dineIn = parseFloat(this.data.dineInRevenue) || 0;
    const takeout = parseFloat(this.data.takeoutRevenue) || 0;
    const platformFee = parseFloat(this.data.platformFee) || 0;
    
    const gross = dineIn + takeout;
    const net = gross - platformFee;
    
    this.setData({
      grossRevenue: gross.toFixed(2),
      netRevenue: net.toFixed(2),
      totalGrossRevenue: (gross * this.data.batchDays).toFixed(2)
    })
  },

  /**
   * 点击保存按钮
   */
  onSave() {
    // 验证
    if (!this.data.isBatch) {
      // 单日模式验证
      if (!this.data.singleDate) {
        wx.showToast({ title: '请选择日期', icon: 'none' });
        return;
      }
      if (!this.data.dineInRevenue && !this.data.takeoutRevenue) {
        wx.showToast({ title: '请输入营业额', icon: 'none' });
        return;
      }
    } else {
      // 批量模式验证
      if (!this.data.startDate || !this.data.endDate) {
        wx.showToast({ title: '请选择日期范围', icon: 'none' });
        return;
      }
      if (this.data.batchDays <= 0) {
        wx.showToast({ title: '日期范围无效', icon: 'none' });
        return;
      }
    }

    load.showLoading("保存中...")
    
    if (this.data.isBatch) {
      this._saveBatch();
    } else {
      this._saveSingle();
    }
  },

  /**
   * 保存单日
   */
  _saveSingle() {
    const data = {
      gbAiDailyRevenueDistributerId: this.data.disInfo.gbDistributerId,
      gbAiDailyRevenueDepartmentId: this.data.departmentId,
      gbAiDailyRevenueRecordDate: this.data.singleDate,
      gbAiDailyRevenueDineInRevenue: parseFloat(this.data.dineInRevenue) || 0,
      gbAiDailyRevenueDineInOrderCount: parseInt(this.data.dineInOrderCount) || 0,
      gbAiDailyRevenueDineInCustomerCount: parseInt(this.data.dineInCustomerCount) || 0,
      gbAiDailyRevenueTakeoutRevenue: parseFloat(this.data.takeoutRevenue) || 0,
      gbAiDailyRevenueTakeoutOrderCount: parseInt(this.data.takeoutOrderCount) || 0,
      gbAiDailyRevenuePlatformFee: parseFloat(this.data.platformFee) || 0,
    }
    
    api.saveDailyTuxrnover(data).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({ title: res.result.msg || '保存失败', icon: 'none' });
      }
    }).catch(err => {
      load.hideLoading();
      wx.showToast({ title: '网络请求失败', icon: 'none' });
    });
  },

  /**
   * 批量保存
   */
  _saveBatch() {
    const days = this._getDateRange(this.data.startDate, this.data.endDate);
    const dineIn = parseFloat(this.data.dineInRevenue) || 0;
    const takeout = parseFloat(this.data.takeoutRevenue) || 0;
    const platformFee = parseFloat(this.data.platformFee) || 0;
    
    const list = days.map(date => ({
      gbAiDailyRevenueDepartmentId: this.data.departmentId,
      gbAiDailyRevenueDate: date,
      gbAiDailyRevenueDineInRevenue: dineIn,
      gbAiDailyRevenueTakeoutRevenue: takeout,
      gbAiDailyRevenuePlatformFee: platformFee,
    }))
    
    api.saveBatchDailyTurnover(list).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({ title: res.result.msg || '保存失败', icon: 'none' });
      }
    }).catch(err => {
      load.hideLoading();
      wx.showToast({ title: '网络请求失败', icon: 'none' });
    });
  },

  /**
   * 获取日期范围内的所有日期
   */
  _getDateRange(startDate, endDate) {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    while (start <= end) {
      const year = start.getFullYear();
      const month = String(start.getMonth() + 1).padStart(2, '0');
      const day = String(start.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
      start.setDate(start.getDate() + 1);
    }
    
    return dates;
  },

  /**
   * 返回
   */
  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },

  /**
   * 下载模板
   */
  onDownloadTemplate() {
    const today = dateUtils.getArriveDate(0);
    const firstDay = today.substring(0, 8) + '01';  // 当月第一天
    this.setData({
      showTemplateModal: true,
      templateStartDate: firstDay,
      templateEndDate: today,
    });
  },

  /**
   * 关闭模板弹窗
   */
  onCloseTemplateModal() {
    this.setData({
      showTemplateModal: false,
    });
  },

  /**
   * 模板开始日期变化
   */
  onTemplateStartChange(e) {
    this.setData({
      templateStartDate: e.detail.value,
    });
  },

  /**
   * 模板结束日期变化
   */
  onTemplateEndChange(e) {
    this.setData({
      templateEndDate: e.detail.value,
    });
  },

  /**
   * 确认下载
   */
  onConfirmDownload() {
    const { templateStartDate, templateEndDate } = this.data;
    if (!templateStartDate || !templateEndDate) {
      wx.showToast({ title: '请选择日期范围', icon: 'none' });
      return;
    }

    this.onCloseTemplateModal();
    this._downloadTemplateFile(templateStartDate, templateEndDate);
  },

  /**
   * 下载模板文件
   */
  _downloadTemplateFile(startDate, endDate) {
    const departmentId = this.data.departmentId;
    if (!departmentId) {
      wx.showToast({ title: '部门ID无效', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '正在下载...' });

    const baseUrl = apiUrl.apiUrl;
    const url = `${baseUrl}ai/daily-revenue/download-smart-template?startDate=${startDate}&endDate=${endDate}&departmentId=${departmentId}`;
    console.log('下载模板URL:', url);

    wx.request({
      url: url,
      method: 'GET',
      responseType: 'arraybuffer',
      success(res) {
        wx.hideLoading();
        console.log('请求状态:', res.statusCode);
        console.log('数据类型:', typeof res.data);
        console.log('数据长度:', res.data ? res.data.byteLength : 0);

        if (res.statusCode === 200 && res.data) {
          const filePath = `${wx.env.USER_DATA_PATH}/turnover_template_${Date.now()}.xls`;
          const fs = wx.getFileSystemManager();
          
          // 直接写入 ArrayBuffer
          fs.writeFile({
            filePath: filePath,
            data: res.data,
            success(writeRes) {
              console.log('文件写入成功, 路径:', filePath);
              
              // 打开文件
              wx.openDocument({
                filePath: filePath,
                fileType: 'xls',
                showMenu: true,
                success(openRes) {
                  console.log('文件已打开');
                  wx.showToast({ title: '模板已打开，请编辑后保存', icon: 'none' });
                },
                fail(openErr) {
                  console.error('打开文件失败:', openErr);
                  wx.showToast({ title: '打开文件失败', icon: 'none' });
                },
              });
            },
            fail(writeErr) {
              console.error('写入文件失败:', writeErr);
              wx.showToast({ title: '保存文件失败', icon: 'none' });
            }
          });
        } else {
          wx.showToast({ title: '下载失败: ' + res.statusCode, icon: 'none' });
        }
      },
      fail(err) {
        wx.hideLoading();
        wx.showToast({ title: '网络请求失败', icon: 'none' });
        console.error('下载请求失败:', err);
      }
    });
  },

  /**
   * 上传Excel
   */
  onUploadExcel() {
    const that = this;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls'],
      success(res) {
        const tempFilePath = res.tempFiles[0].path;
        console.log('选择文件:', tempFilePath);

        wx.showModal({
          title: '确认上传',
          content: '确定要上传Excel文件导入营业额数据吗？',
          success(modalRes) {
            if (modalRes.confirm) {
              that._uploadExcelFile(tempFilePath);
            }
          }
        });
      },
      fail(err) {
        console.error('选择文件失败:', err);
        wx.showToast({ title: '未选择文件', icon: 'none' });
      }
    });
  },

  /**
   * 上传Excel文件
   */
  _uploadExcelFile(filePath) {
    const departmentId = this.data.departmentId;
    const disInfo = this.data.disInfo;

    if (!departmentId) {
      wx.showToast({ title: '部门ID无效', icon: 'none' });
      return;
    }

    const distributerId = disInfo ? disInfo.gbDistributerId : 0;

    wx.showLoading({ title: '正在上传...' });

    api.uploadTurnoverExcel(filePath, departmentId, distributerId)
      .then(res => {
        wx.hideLoading();
        console.log('上传结果:', res);

        if (res.result.code == 0) {
          wx.showToast({ title: '上传成功', icon: 'success' });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({ title: res.result.msg || '上传失败', icon: 'none' });
        }
      })
      .catch(err => {
        wx.hideLoading();
        console.error('上传失败:', err);
        wx.showToast({ title: '网络请求失败', icon: 'none' });
      });
  },

  _resolveDepartmentIdForFood(disInfo) {
    if (!disInfo) return '';
    if (disInfo.mendianDepartmentList && disInfo.mendianDepartmentList.length) {
      return disInfo.mendianDepartmentList[0].gbDepartmentId;
    }
    return '';
  },

  _ensureDepartmentForFoodExcel() {
    const disInfo = wx.getStorageSync('disInfo');
    const departmentId = disInfo ? this._resolveDepartmentIdForFood(disInfo) : this.data.departmentId;
    if (!departmentId) {
      wx.showToast({ title: '请先登录门店并选择部门', icon: 'none' });
      return '';
    }
    if (departmentId !== this.data.departmentId) {
      this.setData({ departmentId: departmentId, disInfo: disInfo || this.data.disInfo });
    }
    return departmentId;
  },

  _resolveFoodDistributerId() {
    const disInfo = this.data.disInfo || wx.getStorageSync('disInfo');
    if (disInfo && disInfo.gbDistributerId) {
      return disInfo.gbDistributerId;
    }
    return '';
  },

  onDownloadFoodSalesTemplate() {
    if (!this._ensureDepartmentForFoodExcel()) return;
    const today = dateUtils.getArriveDate(0);
    const patch = { showFoodSalesTemplateModal: true, todayDate: today };
    if (this.data.foodSalesTemplateStartDate > today) {
      patch.foodSalesTemplateStartDate = today;
    }
    if (this.data.foodSalesTemplateEndDate > today) {
      patch.foodSalesTemplateEndDate = today;
    }
    this.setData(patch);
  },

  onCloseFoodSalesTemplateModal() {
    this.setData({ showFoodSalesTemplateModal: false });
  },

  onFoodSalesTemplateStartChange(e) {
    const value = e.detail.value;
    const today = dateUtils.getArriveDate(0);
    let v = value > today ? today : value;
    const { foodSalesTemplateEndDate: end0 } = this.data;
    const patch = { foodSalesTemplateStartDate: v };
    if (end0 && v > end0) {
      patch.foodSalesTemplateEndDate = v;
    }
    this.setData(patch);
  },

  onFoodSalesTemplateEndChange(e) {
    const value = e.detail.value;
    const today = dateUtils.getArriveDate(0);
    let v = value > today ? today : value;
    const { foodSalesTemplateStartDate: start0 } = this.data;
    if (start0 && v < start0) {
      v = start0;
    }
    this.setData({ foodSalesTemplateEndDate: v });
  },

  onConfirmDownloadFoodSales() {
    const startDate = this.data.foodSalesTemplateStartDate;
    const endDate = this.data.foodSalesTemplateEndDate;
    if (!startDate || !endDate) {
      wx.showToast({ title: '请选择日期范围', icon: 'none' });
      return;
    }
    if (startDate > endDate) {
      wx.showToast({ title: '开始日期不能晚于结束日期', icon: 'none' });
      return;
    }
    const today = dateUtils.getArriveDate(0);
    if (startDate > today || endDate > today) {
      wx.showToast({ title: '开始/结束日期不能晚于今天', icon: 'none' });
      return;
    }
    const departmentId = this._ensureDepartmentForFoodExcel();
    if (!departmentId) return;
    this.onCloseFoodSalesTemplateModal();
    foodSalesTemplateWx.downloadFoodSalesSmartTemplate(apiUrl.apiUrl, startDate, endDate, departmentId);
  },

  _isExcelChatFile(f) {
    if (!f) return false;
    var name = String(f.name || '').toLowerCase();
    var path = String(f.path || '').toLowerCase();
    return (
      name.endsWith('.xlsx') ||
      name.endsWith('.xls') ||
      path.endsWith('.xlsx') ||
      path.endsWith('.xls')
    );
  },

  _promptNonExcelChatFile(f) {
    var name = String((f && f.name) || '').toLowerCase();
    if (name.endsWith('.numbers')) {
      wx.showModal({
        title: '当前是 Numbers 格式',
        content:
          '您选的是 Apple「Numbers」表格（.numbers），与 Excel（.xlsx/.xls）不同，无法直接导入。\n\n请用 Numbers 打开后：右上角「共享」→「Excel」→ 导出 .xlsx，再发到微信里上传。',
        showCancel: false,
        confirmText: '知道了',
      });
      return;
    }
    wx.showToast({
      title: '请选 .xlsx 或 .xls（Excel）',
      icon: 'none',
      duration: 2800,
    });
  },

  onUploadFoodSalesExcel() {
    const departmentId = this._ensureDepartmentForFoodExcel();
    if (!departmentId) return;
    const distributerId = this._resolveFoodDistributerId();
    if (!distributerId) {
      wx.showToast({ title: '缺少批发商信息', icon: 'none' });
      return;
    }
    const that = this;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success(res) {
        var list = res.tempFiles || [];
        var f = list[0];
        if (!f || !f.path) {
          wx.showToast({ title: '未获取到文件', icon: 'none' });
          return;
        }
        var okExcel = that._isExcelChatFile(f);
        if (!okExcel) {
          that._promptNonExcelChatFile(f);
          return;
        }
        const tempFilePath = f.path;
        wx.showModal({
          title: '确认上传',
          content: '确定上传该 Excel 导入菜品销量数据？',
          success(modalRes) {
            if (modalRes.confirm) {
              that._uploadFoodSalesExcelFile(tempFilePath, departmentId, distributerId);
            }
          },
        });
      },
      fail(err) {
        var msg = err && err.errMsg ? String(err.errMsg) : '';
        if (msg.indexOf('cancel') >= 0 || msg.indexOf('取消') >= 0) {
          return;
        }
        wx.showToast({ title: '未选择文件', icon: 'none' });
      },
    });
  },

  _uploadFoodSalesExcelFile(filePath, departmentId, distributerId) {
    wx.showLoading({ title: '正在上传...', mask: true });
    foodSalesExcelApi
      .uploadFoodSalesExcel(filePath, departmentId, distributerId)
      .then((res) => {
        wx.hideLoading();
        const code = res.result && res.result.code;
        const msg = res.result && res.result.msg;
        if (code === 0 || code === '0') {
          wx.showToast({ title: '菜品销量导入成功', icon: 'success' });
        } else {
          wx.showToast({ title: msg || '上传失败', icon: 'none' });
        }
      })
      .catch((err) => {
        wx.hideLoading();
        console.error('upload food sales excel', err);
        wx.showToast({ title: '网络请求失败', icon: 'none' });
      });
  },
})
