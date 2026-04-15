/**
 * 统一 HTTP 请求封装
 * 
 * 环境配置直接读取 config/index.js，干净简单
 */

var config = require('../config/index');

/**
 * 发起 HTTP 请求
 * @param {string} path - 接口路径（不含 baseUrl）
 * @param {Object} [data={}] - 请求参数
 * @param {Object} [options={}] - 可选配置
 * @param {string} [options.method='GET'] - 请求方法
 * @param {boolean} [options.showLoading=false] - 是否显示 loading
 * @param {string} [options.loadingText='加载中...'] - loading 文案
 * @param {boolean} [options.showErrorToast=true] - 失败时是否弹 toast
 * @returns {Promise<Object>}
 */
function request(path, data, options) {
  if (typeof data === 'undefined') data = {};
  if (typeof options === 'undefined') options = {};

  var showLoading = options.showLoading || false;
  var loadingText = options.loadingText || '加载中...';
  var showErrorToast = options.showErrorToast !== false;
  var method = (options.method || 'GET').toUpperCase();

  if (showLoading) {
    wx.showLoading({ title: loadingText, mask: true });
  }

  return new Promise(function (resolve, reject) {
    var header = {
      'content-type': options.contentType || (method === 'POST' ? 'application/json' : 'application/x-www-form-urlencoded'),
    };
    var token = wx.getStorageSync('token');
    if (token) {
      header['Authorization'] = token;
    }

    var url = config.apiUrl + path;
    var requestData = data;

    // useUrlParams: true 时，将 data 作为 URL 参数（适合某些只接受表单/URL参数的 POST 接口）
    if (options.useUrlParams && method === 'POST' && Object.keys(data).length > 0) {
      var params = [];
      for (var key in data) {
        params.push(key + '=' + encodeURIComponent(data[key]));
      }
      url = url + '?' + params.join('&');
      requestData = {};
      header['content-type'] = 'application/x-www-form-urlencoded';
    }

    wx.request({
      url: url,
      method: method,
      data: requestData,
      header: header,
      success: function (res) {
        if (res.statusCode === 200) {
          resolve({ result: res.data });
        } else if (res.statusCode === 401) {
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          wx.redirectTo({ url: '/pages/register/register' });
          reject(res);
        } else {
          reject(res);
        }
      },
      fail: function (err) {
        if (showErrorToast) {
          wx.showToast({ title: '网络异常，请重试', icon: 'none' });
        }
        reject(err);
      },
      complete: function () {
        if (showLoading) {
          wx.hideLoading();
        }
      },
    });
  });
}

/**
 * GET 请求快捷方法
 */
function get(path, data, options) {
  return request(path, data, Object.assign({}, options, { method: 'GET' }));
}

/**
 * POST 请求快捷方法
 */
function post(path, data, options) {
  return request(path, data, Object.assign({}, options, { method: 'POST' }));
}

/**
 * 上传文件快捷方法
 */
function uploadFile(path, filePath, name, formData) {
  return new Promise(function (resolve, reject) {
    wx.uploadFile({
      url: config.apiUrl + path,
      filePath: filePath,
      name: name,
      formData: formData,
      header: {
        "Content-Type": "multipart/form-data"
      },
      success: function (res) {
        resolve({ result: res.data });
      },
      fail: function (e) {
        reject(e);
      },
    });
  });
}

module.exports = {
  request: request,
  get: get,
  post: post,
  uploadFile: uploadFile,
  apiUrl: config.apiUrl,
  server: config.server,
  getServerUrl: function() {
    return config.server;
  },
};
