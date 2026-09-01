/**
 * 菜品销量 Excel：上传（与日营业额相同元数据 + 表结构）
 * POST /ai/daily-revenue/upload-food-sales-excel
 * 放在主包 lib，供 subPackage-charts / subPackage-mendian 共用（分包间不可互相 require）
 */

var apiUrl = require('../config/index');

/**
 * @param {string} filePath 本地临时文件路径
 * @param {string|number} departmentId 部门 ID
 * @param {string|number} distributerId 批发商 ID
 * @returns {Promise<{ result: any }>}
 */
function uploadFoodSalesExcel(filePath, departmentId, distributerId) {
  var header = {};
  var token = wx.getStorageSync('token');
  if (token) {
    header.Authorization = token;
  }
  return new Promise(function (resolve, reject) {
    wx.uploadFile({
      url: apiUrl.apiUrl + 'ai/daily-revenue/upload-food-sales-excel',
      filePath: filePath,
      name: 'file',
      formData: {
        departmentId: String(departmentId),
        distributerId: String(distributerId),
      },
      header: header,
      success: function (res) {
        try {
          var data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
          resolve({ result: data });
        } catch (e) {
          resolve({ result: res.data });
        }
      },
      fail: function (err) {
        reject(err);
      },
    });
  });
}

/**
 * 合并 Excel：菜品日销售 + 日营业额
 * POST /ai/daily-revenue/upload-combined-excel
 */
function uploadCombinedDailyExcel(filePath, departmentId, distributerId) {
  var header = {};
  var token = wx.getStorageSync('token');
  if (token) {
    header.Authorization = token;
  }
  return new Promise(function (resolve, reject) {
    wx.uploadFile({
      url: apiUrl.apiUrl + 'ai/daily-revenue/upload-combined-excel',
      filePath: filePath,
      name: 'file',
      formData: {
        departmentId: String(departmentId),
        distributerId: String(distributerId),
      },
      header: header,
      timeout: 60000, // 1 分钟
      success: function (res) {
        try {
          var data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
          resolve({ result: data });
        } catch (e) {
          resolve({ result: res.data });
        }
      },
      fail: function (err) {
        reject(err);
      },
    });
  });
}

/**
 * AI经营日报：只分析并返回菜品匹配/金额核对预览，不直接入库。
 */
function analyzeAiRevenueExcel(filePath, departmentId, distributerId) {
  var header = {};
  var token = wx.getStorageSync('token');
  if (token) {
    header.Authorization = token;
  }
  return new Promise(function (resolve, reject) {
    wx.uploadFile({
      url: apiUrl.apiUrl + 'ai/daily-revenue/ai-import/analyze',
      filePath: filePath,
      name: 'file',
      formData: {
        departmentId: String(departmentId),
        distributerId: String(distributerId),
      },
      header: header,
      timeout: 180000,
      success: function (res) {
        try {
          var data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
          resolve({ result: data });
        } catch (e) {
          resolve({ result: res.data });
        }
      },
      fail: reject,
    });
  });
}

/** 预览全部通过后确认入库。 */
function commitAiRevenueImport(jobId, departmentId, distributerId) {
  var header = { 'content-type': 'application/x-www-form-urlencoded' };
  var token = wx.getStorageSync('token');
  if (token) {
    header.Authorization = token;
  }
  return new Promise(function (resolve, reject) {
    wx.request({
      url: apiUrl.apiUrl + 'ai/daily-revenue/ai-import/' + encodeURIComponent(jobId) + '/commit',
      method: 'POST',
      data: {
        departmentId: departmentId,
        distributerId: distributerId,
      },
      header: header,
      timeout: 120000,
      success: function (res) {
        resolve({ result: res.data });
      },
      fail: reject,
    });
  });
}

/** 下载结构化失败明细并用微信文档预览打开。 */
function openAiRevenueFailureReport(jobId, departmentId, distributerId) {
  var header = {};
  var token = wx.getStorageSync('token');
  if (token) {
    header.Authorization = token;
  }
  var query =
    '?departmentId=' + encodeURIComponent(departmentId) +
    '&distributerId=' + encodeURIComponent(distributerId);
  return new Promise(function (resolve, reject) {
    wx.downloadFile({
      url: apiUrl.apiUrl + 'ai/daily-revenue/ai-import/' + encodeURIComponent(jobId) + '/failure-report' + query,
      header: header,
      timeout: 60000,
      success: function (res) {
        if (res.statusCode !== 200 || !res.tempFilePath) {
          reject(new Error('失败明细下载失败'));
          return;
        }
        wx.openDocument({
          filePath: res.tempFilePath,
          fileType: 'xlsx',
          showMenu: true,
          success: resolve,
          fail: reject,
        });
      },
      fail: reject,
    });
  });
}

module.exports = {
  uploadFoodSalesExcel: uploadFoodSalesExcel,
  uploadCombinedDailyExcel: uploadCombinedDailyExcel,
  analyzeAiRevenueExcel: analyzeAiRevenueExcel,
  commitAiRevenueImport: commitAiRevenueImport,
  openAiRevenueFailureReport: openAiRevenueFailureReport,
};
