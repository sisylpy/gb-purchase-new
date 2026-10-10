/**
 * 统一 HTTP 请求封装（支持 gb / nx 双后端）
 *
 * - 默认 backend: 'gb'（GB 部门服务器）
 * - platform/customer/* 等路径可传 backend: 'nx'，或依赖路径自动识别
 */

var config = require('../config/index');

var PLATFORM_PATH_PREFIX = 'platform/';

function resolveBackend(options, path) {
  if (options && options.backend) {
    return options.backend === 'nx' ? 'nx' : 'gb';
  }
  if (path && String(path).indexOf(PLATFORM_PATH_PREFIX) === 0) {
    return 'nx';
  }
  return 'gb';
}

function getBackendConfig(backend) {
  return backend === 'nx' ? config.getBackend('nx') : config.getBackend('gb');
}

/**
 * 发起 HTTP 请求
 * @param {string} path - 接口路径（不含 baseUrl）
 * @param {Object} [data={}] - 请求参数
 * @param {Object} [options={}] - 可选配置
 * @param {string} [options.method='GET'] - 请求方法
 * @param {'gb'|'nx'} [options.backend='gb'] - 目标后端
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
  var backend = resolveBackend(options, path);
  var backendConfig = getBackendConfig(backend);

  if (showLoading) {
    wx.showLoading({ title: loadingText, mask: true });
  }

  return new Promise(function (resolve, reject) {
    var header = {
      'content-type': options.contentType || (method === 'POST' ? 'application/json' : 'application/x-www-form-urlencoded'),
    };
    if (options.headers) {
      Object.keys(options.headers).forEach(function (key) {
        if (options.headers[key] !== undefined && options.headers[key] !== null && options.headers[key] !== '') {
          header[key] = options.headers[key];
        }
      });
    }
    var token = wx.getStorageSync('token');
    if (token) {
      header['Authorization'] = token;
    }

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
        if (res.statusCode === 200) {
          resolve({ result: res.data, backend: backend });
        } else if (res.statusCode === 401 && options.handleUnauthorized !== false) {
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          wx.redirectTo({ url: '/pages/register/register' });
          reject(res);
        } else if (res.statusCode === 401) {
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
  var backend = resolveBackend(options, path);
  var backendConfig = getBackendConfig(backend);

  return new Promise(function (resolve, reject) {
    wx.uploadFile({
      url: backendConfig.apiUrl + path,
      filePath: filePath,
      name: name,
      formData: formData,
      header: {
        'Content-Type': 'multipart/form-data',
      },
      success: function (res) {
        resolve({ result: res.data, backend: backend });
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
  /** GB API 根（兼容旧代码） */
  apiUrl: config.gbApiUrl,
  /** GB 静态资源根（兼容旧代码） */
  server: config.gbServer,
  gbApiUrl: config.gbApiUrl,
  gbServer: config.gbServer,
  nxApiUrl: config.nxApiUrl,
  nxServer: config.nxServer,
  getServerUrl: function (backend) {
    return backend === 'nx' ? config.nxServer : config.gbServer;
  },
};
