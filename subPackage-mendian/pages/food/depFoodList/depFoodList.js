

var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
import apiUrl from '../../../../config/index.js'
var dateUtils = require('../../../../lib/dateUtil.js');

import {
  depGetAllFood,
  downLoadDepFood,
  cancleDownloadFood
} from '../../../services/apiDistributerFood'
var foodSalesExcelApi = require('../../../services/foodSalesExcelApi.js');


function _getRespHeader(headers, key) {
  if (!headers || typeof headers !== 'object') return '';
  var lower = key.toLowerCase();
  for (var k in headers) {
    if (Object.prototype.hasOwnProperty.call(headers, k) && k.toLowerCase() === lower) {
      return String(headers[k] || '');
    }
  }
  return '';
}

/** 根据响应头推断 Excel 类型（辅助，最终以二进制魔数为准） */
function _guessExcelFromHeaders(headers) {
  var ct = _getRespHeader(headers, 'content-type').toLowerCase();
  if (ct.indexOf('spreadsheetml.sheet') >= 0) {
    return { ext: 'xlsx', fileType: 'xlsx' };
  }
  if (ct.indexOf('ms-excel') >= 0 || ct.indexOf('application/excel') >= 0) {
    return { ext: 'xls', fileType: 'xls' };
  }
  var cd = _getRespHeader(headers, 'content-disposition');
  var m = /\.(xlsx|xls)/i.exec(cd);
  if (m) {
    var ext = m[1].toLowerCase();
    return { ext: ext, fileType: ext };
  }
  return null;
}

/**
 * 根据文件头判断真实格式：xlsx 为 ZIP(PK…)，xls 为 OLE(D0 CF 11 E0…)
 * 与扩展名、openDocument 的 fileType 必须一致，否则 Excel 会报「扩展名无效」
 */
function _guessExcelFromArrayBuffer(ab) {
  if (!ab || !ab.byteLength || ab.byteLength < 4) return null;
  var u8 = new Uint8Array(ab.slice(0, 8));
  if (u8[0] === 0x50 && u8[1] === 0x4b) {
    return { ext: 'xlsx', fileType: 'xlsx' };
  }
  if (u8[0] === 0xd0 && u8[1] === 0xcf && u8[2] === 0x11 && u8[3] === 0xe0) {
    return { ext: 'xls', fileType: 'xls' };
  }
  if (u8[0] === 0x3c) {
    return { notExcel: 'html' };
  }
  return null;
}

function _tryParseJsonErrorMessage(ab) {
  var start = 0;
  var head = new Uint8Array(ab.slice(0, Math.min(ab.byteLength, 4)));
  if (head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf) {
    start = 3;
  }
  var u8 = new Uint8Array(ab.slice(start, start + 1));
  if (!u8.length || (u8[0] !== 0x7b && u8[0] !== 0x5b)) return '';
  var len = Math.min(ab.byteLength, 8192);
  var txt = '';
  try {
    txt = new TextDecoder('utf-8').decode(new Uint8Array(ab.slice(start, len)));
  } catch (e) {
    return '';
  }
  if (!/^\s*[\{\[]/.test(txt)) return '';
  try {
    var j = JSON.parse(txt);
    return j.msg || j.message || (j.result && j.result.msg) || '';
  } catch (e2) {
    return '';
  }
}

function _openFoodSalesTemplateDoc(filePath, fileType, onFailTryAlt) {
  wx.openDocument({
    filePath: filePath,
    fileType: fileType,
    showMenu: true,
    success: function () {
      wx.showToast({ title: '模板已打开，填写后可通过上传导入', icon: 'none' });
    },
    fail: function (err) {
      if (onFailTryAlt) {
        var alt = fileType === 'xlsx' ? 'xls' : 'xlsx';
        wx.openDocument({
          filePath: filePath,
          fileType: alt,
          showMenu: true,
          success: function () {
            wx.showToast({ title: '模板已打开', icon: 'none' });
          },
          fail: function () {
            console.error('openDocument', err);
            wx.showToast({ title: '无法用系统打开，请把文件发到电脑用 Excel 打开', icon: 'none', duration: 3500 });
          },
        });
      } else {
        console.error('openDocument', err);
        wx.showToast({ title: '打开文件失败', icon: 'none' });
      }
    },
  });
}


Page({


  data: {
   
    showFoodSalesTemplateModal: false,
    foodSalesTemplateStartDate: '',
    foodSalesTemplateEndDate: '',
    showIngredientsModal: false,
    currentFood: null,
    ingredientList: [],

  },
  onShow() {
    if (this.data.toAdd) {
      this._initData();
    }
  },

  onLoad(optons) {

    const today = dateUtils.getArriveDate(0);
    const firstDay = today.substring(0, 8) + '01';
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      todayDate: today,
      foodSalesTemplateStartDate: firstDay,
      foodSalesTemplateEndDate: today,
    })


    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      disId: optons.disId,
      url: apiUrl.server ,
      type: optons.type,
    })

    var value = wx.getStorageSync('disInfo');
    if (value) {
      this.setData({
        disInfo: value,
        depFatherId: value.mendianDepartmentList[0].gbDepartmentId
      })
    }
    var myDate = wx.getStorageSync('myDate');
    if (myDate) {
      var dateRange;
      if (myDate.name === 'custom') {
        dateRange = dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate);
      } else {
        dateRange = dateUtils.getDateRange(myDate.name);
      }
      this.setData({
        startDate: dateRange.startDate,
        stopDate: dateRange.stopDate,
        dateType: myDate.dateType,
        hanzi: myDate.hanzi || dateRange.name,
      });
    } else {
      this.setData({
        dateType: 'month',
        startDate: dateUtils.getFirstDateInMonth(),
        stopDate: dateUtils.getArriveDate(0),
        hanzi: "本月",
      });
    }


    this._initData();

  },

  _initData() {
      var data = {
        startDate: this.data.startDate,
        stopDate: this.data.stopDate,
        disId: this.data.disId,
        depFatherId: this.data.depFatherId
      }
      load.showLoading("获取供货商")
    depGetAllFood(data).then(res => {
      if (res.result.code == 0) {
        load.hideLoading();
        console.log('[depFoodList] 反序列化后(normalized):', JSON.stringify(res.result.data));
     
        this.setData({
          foodArr: res.result.data,
          toAdd: false

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

  _ensureDepartmentForExcel() {
    const disInfo = wx.getStorageSync('disInfo');
    const departmentId = disInfo ? this._resolveDepartmentId(disInfo) : this.data.departmentId;
    if (!departmentId) {
      wx.showToast({ title: '请先登录门店并选择部门', icon: 'none' });
      return '';
    }
    if (departmentId !== this.data.departmentId) {
      this.setData({ departmentId: departmentId, disInfo: disInfo || this.data.disInfo });
    }
    return departmentId;
  },

  _resolveDistributerId() {
    const disInfo = this.data.disInfo || wx.getStorageSync('disInfo');
    if (disInfo && disInfo.gbDistributerId) {
      return disInfo.gbDistributerId;
    }
    return this.data.disId || '';
  },

  /** 下载菜品销量 Excel 模板：选择日期范围 */
  onDownloadFoodSalesTemplate() {
    if (!this._ensureDepartmentForExcel()) return;
    this.setData({ showFoodSalesTemplateModal: true });
  },

  _resolveDepartmentId(disInfo) {
    if (!disInfo) return '';
    if (disInfo.mendianDepartmentList && disInfo.mendianDepartmentList.length) {
      return disInfo.mendianDepartmentList[0].gbDepartmentId;
    }
   
    return '';
  },

  onCloseFoodSalesTemplateModal() {
    this.setData({ showFoodSalesTemplateModal: false });
  },

  onFoodSalesTemplateStartChange(e) {
    this.setData({ foodSalesTemplateStartDate: e.detail.value });
  },

  onFoodSalesTemplateEndChange(e) {
    this.setData({ foodSalesTemplateEndDate: e.detail.value });
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
    const departmentId = this._ensureDepartmentForExcel();
    if (!departmentId) return;
    this.onCloseFoodSalesTemplateModal();
    this._downloadFoodSalesTemplateFile(startDate, endDate, departmentId);
  },

  _downloadFoodSalesTemplateFile(startDate, endDate, departmentId) {
    wx.showLoading({ title: '正在下载...', mask: true });
    const base = apiUrl.apiUrl;
    const q =
      'startDate=' + encodeURIComponent(startDate) +
      '&endDate=' + encodeURIComponent(endDate) +
      '&departmentId=' + encodeURIComponent(String(departmentId));
    const url = base + 'ai/daily-revenue/download-food-sales-smart-template?' + q;
    const header = {};
    const token = wx.getStorageSync('token');
    if (token) {
      header.Authorization = token;
    }
    wx.request({
      url: url,
      method: 'GET',
      header: header,
      responseType: 'arraybuffer',
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode !== 200 || !res.data) {
          wx.showToast({ title: '下载失败(' + (res.statusCode || '?') + ')', icon: 'none' });
          return;
        }
        var ab = res.data;
        var jsonErr = _tryParseJsonErrorMessage(ab);
        if (jsonErr) {
          wx.showToast({
            title: jsonErr.length > 36 ? jsonErr.slice(0, 36) + '…' : jsonErr,
            icon: 'none',
            duration: 4000,
          });
          return;
        }
        var fromBin = _guessExcelFromArrayBuffer(ab);
        if (fromBin && fromBin.notExcel === 'html') {
          wx.showToast({ title: '服务端返回了网页而非表格，请检查接口或登录状态', icon: 'none', duration: 4000 });
          return;
        }
        var fmt = fromBin || _guessExcelFromHeaders(res.header) || { ext: 'xls', fileType: 'xls' };
        var filePath = wx.env.USER_DATA_PATH + '/food_sales_template_' + Date.now() + '.' + fmt.ext;
        var fs = wx.getFileSystemManager();
        fs.writeFile({
          filePath: filePath,
          data: ab,
          success: function () {
            _openFoodSalesTemplateDoc(filePath, fmt.fileType, true);
          },
          fail: function (writeErr) {
            console.error('writeFile', writeErr);
            wx.showToast({ title: '保存文件失败', icon: 'none' });
          },
        });
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('download template', err);
        wx.showToast({ title: '网络请求失败', icon: 'none' });
      },
    });
  },

  /** 上传菜品销量 Excel */
  onUploadFoodSalesExcel() {
    const departmentId = this._ensureDepartmentForExcel();
    if (!departmentId) return;
    const distributerId = this._resolveDistributerId();
    if (!distributerId) {
      wx.showToast({ title: '缺少批发商信息', icon: 'none' });
      return;
    }
    const that = this;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls'],
      success(res) {
        const tempFilePath = res.tempFiles[0].path;
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
        console.error('chooseMessageFile', err);
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
        if (code === 0 || code === '0') {
          wx.showToast({ title: '上传成功', icon: 'success' });
        } else {
          const msg = (res.result && res.result.msg) || '上传失败';
          wx.showToast({ title: msg, icon: 'none' });
        }
      })
      .catch((err) => {
        wx.hideLoading();
        console.error('upload food sales excel', err);
        wx.showToast({ title: '网络请求失败', icon: 'none' });
      });
  },

  cancleDownloadFood(e){
    var depFood = e.currentTarget.dataset.item;
    load.showLoading("取消菜品")
    cancleDownloadFood(depFood).then(res =>{
      load.hideLoading();
      if(res.result.code == 0){
        this._initData();
      }
    })

  },


  onCloseIngredientsModal(){
    this.setData({ showIngredientsModal: false });
  },









})