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

module.exports = {
  uploadFoodSalesExcel: uploadFoodSalesExcel,
  uploadCombinedDailyExcel: uploadCombinedDailyExcel,
};
