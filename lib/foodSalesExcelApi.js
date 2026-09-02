var apiUrl = require('../config/index');

/**
 * AI经营日报：只分析并返回菜品匹配/金额核对预览，不直接入库。
 */
function analyzeAiRevenueExcel(filePath, departmentId, distributerId, options) {
  options = options || {};
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
        sourceSystem: String(options.sourceSystem || ''),
        templateType: String(options.templateType || '经营日报'),
        templateVersion: String(options.templateVersion || ''),
        importMode: String(options.importMode || 'PATCH'),
        operatorId: String(options.operatorId || ''),
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
function confirmAiRevenueDishMapping(jobId, payload) {
  var header = { 'content-type': 'application/json' };
  var token = wx.getStorageSync('token');
  if (token) header.Authorization = token;
  return new Promise(function (resolve, reject) {
    wx.request({
      url: apiUrl.apiUrl + 'ai/daily-revenue/ai-import/' + encodeURIComponent(jobId) + '/dish-mappings/confirm',
      method: 'POST',
      data: payload,
      header: header,
      timeout: 120000,
      success: function (res) { resolve({ result: res.data }); },
      fail: reject,
    });
  });
}

function commitAiRevenueImport(jobId, departmentId, distributerId, operatorId) {
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
        operatorId: operatorId,
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
  analyzeAiRevenueExcel: analyzeAiRevenueExcel,
  confirmAiRevenueDishMapping: confirmAiRevenueDishMapping,
  commitAiRevenueImport: commitAiRevenueImport,
  openAiRevenueFailureReport: openAiRevenueFailureReport,
};
