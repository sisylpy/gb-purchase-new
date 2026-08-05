/**
 * 统一 HTTP 请求封装
 */

var config = require('../config/index');

function getBackendConfig() {
  return config.getBackend();
}

function authorizationHeader() {
  var token = wx.getStorageSync('token');
  if (!token) return '';
  token = String(token).trim();
  return /^Bearer\s+/i.test(token) ? token : ('Bearer ' + token);
}

function isAuthenticationFailure(res) {
  var body = (res && res.data) || {};
  var errorCode = body.errorCode || '';
  return Number(res && res.statusCode) === 401 ||
    (Number(res && res.statusCode) === 403 &&
      ['AUTH_REQUIRED', 'TOKEN_INVALID', 'TOKEN_EXPIRED'].indexOf(errorCode) >= 0);
}

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
  var backendConfig = getBackendConfig();

  if (showLoading) {
    wx.showLoading({ title: loadingText, mask: true });
  }

  return new Promise(function (resolve, reject) {
    var writesJson = ['POST', 'PUT', 'PATCH', 'DELETE'].indexOf(method) >= 0;
    var header = {
      'content-type': options.contentType || (writesJson ? 'application/json' : 'application/x-www-form-urlencoded'),
    };
    var authorization = authorizationHeader();
    if (authorization) header.Authorization = authorization;

    var url = backendConfig.apiUrl + path;
    var requestData = data;

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
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ result: res.data });
        } else if (isAuthenticationFailure(res)) {
          wx.removeStorageSync('token');
          if (Number(res.statusCode) === 401) {
            wx.removeStorageSync('userInfo');
            wx.redirectTo({ url: '/pages/register/register' });
          }
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

function get(path, data, options) {
  return request(path, data, Object.assign({}, options, { method: 'GET' }));
}

function post(path, data, options) {
  return request(path, data, Object.assign({}, options, { method: 'POST' }));
}

function uploadFile(path, filePath, name, formData, options) {
  if (typeof options === 'undefined') options = {};
  var backendConfig = getBackendConfig();

  return new Promise(function (resolve, reject) {
    var header = {};
    var authorization = authorizationHeader();
    if (authorization) header.Authorization = authorization;
    wx.uploadFile({
      url: backendConfig.apiUrl + path,
      filePath: filePath,
      name: name,
      formData: formData,
      header: header,
      success: function (res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ result: res.data });
        } else {
          reject(res);
        }
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
  getServerUrl: function () {
    return config.server;
  },
  getAuthorizationHeader: authorizationHeader,
};
