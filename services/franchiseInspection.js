/**
 * 加盟巡店与整改正式接口。
 * 复用 lib/request 和现有微信登录，只在这里处理巡店业务码、分页与媒体传输。
 */
var http = require('../lib/request');
var config = require('../config/index');
var loginApi = require('../pages/services/pages');

var PREFIX = 'franchise/v1/';
var mediaDownloadCache = {};

function numericCode(value) {
  if (value === null || typeof value === 'undefined' || value === '') return 0;
  var parsed = Number(value);
  return isNaN(parsed) ? value : parsed;
}

function parseBody(value) {
  if (value && typeof value === 'object') return value;
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch (ignore) {
    return { code: -1, msg: String(value) };
  }
}

function normalizeError(error) {
  if (error && error.inspectionError) return error;
  var response = error || {};
  var body = parseBody(response.data || response.result);
  var httpStatus = Number(response.statusCode || response.status || 0);
  var businessCode = numericCode(body.code);
  var status = httpStatus >= 200 && httpStatus < 300 && Number(businessCode) !== 0
    ? Number(businessCode)
    : Number(httpStatus || businessCode || 0);
  return {
    inspectionError: true,
    status: status,
    code: Number(businessCode) !== 0 ? businessCode : numericCode(status),
    errorCode: body.errorCode || '',
    message: String(body.msg || body.message || response.errMsg || '请求失败，请稍后重试'),
    raw: error,
  };
}

function call(path, data, method, options) {
  var opts = Object.assign({
    method: method || 'GET',
    showErrorToast: false,
  }, options || {});
  return http.request(PREFIX + path, data || {}, opts).then(function (response) {
    var body = parseBody(response && response.result);
    if (numericCode(body.code) !== 0) {
      return Promise.reject(normalizeError({ statusCode: 200, data: body }));
    }
    return body.data;
  }).catch(function (error) {
    return Promise.reject(normalizeError(error));
  });
}

function get(path, query) { return call(path, query || {}, 'GET'); }
function post(path, body) { return call(path, body || {}, 'POST'); }
function put(path, body) { return call(path, body || {}, 'PUT'); }
function patch(path, body) { return call(path, body || {}, 'PATCH'); }
function remove(path, body) { return call(path, body || {}, 'DELETE'); }

function saveLoginResult(result) {
  var body = result && result.result ? result.result : {};
  if (numericCode(body.code) !== 0 || !body.data || !body.data.token) {
    return Promise.reject(normalizeError({
      statusCode: 403,
      data: body.code ? body : { code: 403, errorCode: 'AUTH_REQUIRED', msg: '请重新登录后使用巡店管理' },
    }));
  }
  var data = body.data;
  wx.setStorageSync('token', 'Bearer ' + data.token);
  wx.setStorageSync('franchiseTokenExpiresAt', data.tokenExpiresAt || '');
  if (data.disInfo) wx.setStorageSync('disInfo', data.disInfo);
  if (data.depUserInfo) wx.setStorageSync('userInfo', data.depUserInfo);
  if (data.depInfo) wx.setStorageSync('mendianInfo', data.depInfo);
  if (data.orderDepInfo) wx.setStorageSync('orderDepInfo', data.orderDepInfo);
  return data;
}

function refreshToken() {
  return new Promise(function (resolve, reject) {
    wx.login({
      success: function (login) {
        if (!login.code) {
          reject(normalizeError({ statusCode: 403, data: { code: 403, msg: '微信登录凭证获取失败' } }));
          return;
        }
        loginApi.gbLoginIndex(login.code).then(saveLoginResult).then(resolve).catch(reject);
      },
      fail: function (error) { reject(normalizeError(error)); },
    });
  });
}

function ensureToken(force) {
  var token = wx.getStorageSync('token');
  if (!force && token) {
    token = String(token).trim();
    if (!/^Bearer\s+/i.test(token)) wx.setStorageSync('token', 'Bearer ' + token);
    return Promise.resolve(token);
  }
  return refreshToken();
}

function isTokenError(error) {
  return error && (error.errorCode === 'AUTH_REQUIRED' || error.errorCode === 'TOKEN_INVALID' ||
    error.errorCode === 'TOKEN_EXPIRED' || Number(error.status) === 401);
}

function bootstrapIdentity() {
  return ensureToken(false).then(function () { return get('me'); }).catch(function (error) {
    if (!isTokenError(error)) return Promise.reject(error);
    return ensureToken(true).then(function () { return get('me'); });
  });
}

function listAll(path, query, pageSize) {
  var params = Object.assign({}, query || {}, { page: 1, pageSize: pageSize || 100 });
  return get(path, params).then(function (first) {
    var items = (first && first.items) || [];
    var pages = Number(first && first.totalPages || 1);
    if (pages <= 1) return items;
    var requests = [];
    for (var page = 2; page <= pages; page += 1) {
      requests.push(get(path, Object.assign({}, params, { page: page })));
    }
    return Promise.all(requests).then(function (results) {
      results.forEach(function (result) { items = items.concat((result && result.items) || []); });
      return items;
    });
  });
}

function uploadMedia(params, onProgress) {
  var backend = config.getBackend();
  var task;
  var promise = new Promise(function (resolve, reject) {
    var header = {};
    var authorization = http.getAuthorizationHeader();
    if (authorization) header.Authorization = authorization;
    task = wx.uploadFile({
      url: backend.apiUrl + PREFIX + 'media-assets',
      filePath: params.filePath,
      name: 'file',
      formData: {
        storeId: String(params.storeId),
        businessType: params.businessType,
        businessId: String(params.businessId),
        mediaStage: params.mediaStage,
      },
      header: header,
      success: function (response) {
        var body = parseBody(response.data);
        if (response.statusCode >= 200 && response.statusCode < 300 && numericCode(body.code) === 0) {
          resolve(body.data);
        } else {
          reject(normalizeError({ statusCode: response.statusCode, data: body }));
        }
      },
      fail: function (error) { reject(normalizeError(error)); },
    });
    if (task && typeof task.onProgressUpdate === 'function' && typeof onProgress === 'function') {
      task.onProgressUpdate(function (progress) { onProgress(Number(progress.progress || 0)); });
    }
  });
  return { promise: promise, task: function () { return task; } };
}

function absoluteMediaUrl(path) {
  if (/^https?:\/\//i.test(path || '')) return path;
  return config.getBackend().apiUrl.replace(/\/$/, '') + '/' + String(path || '').replace(/^\//, '');
}

function downloadMedia(asset, original) {
  var id = asset && asset.mediaAssetId;
  var key = String(id || '') + ':' + (original ? 'original' : 'thumbnail');
  if (mediaDownloadCache[key]) return Promise.resolve(mediaDownloadCache[key]);
  var path = original ? asset.originalUrl : asset.thumbnailUrl;
  return new Promise(function (resolve, reject) {
    var header = {};
    var authorization = http.getAuthorizationHeader();
    if (authorization) header.Authorization = authorization;
    wx.downloadFile({
      url: absoluteMediaUrl(path),
      header: header,
      success: function (response) {
        if (response.statusCode >= 200 && response.statusCode < 300 && response.tempFilePath) {
          mediaDownloadCache[key] = response.tempFilePath;
          resolve(response.tempFilePath);
        } else {
          reject(normalizeError({ statusCode: response.statusCode, data: response.data }));
        }
      },
      fail: function (error) { reject(normalizeError(error)); },
    });
  });
}

module.exports = {
  normalizeError: normalizeError,
  ensureToken: ensureToken,
  bootstrapIdentity: bootstrapIdentity,
  getMe: function () { return get('me'); },
  registerInspector: function () { return put('me/roles/INSPECTOR', {}); },
  listStores: function () { return get('stores'); },
  listAssignees: function (storeId) { return get('stores/' + storeId + '/assignees', { role: 'STORE_MANAGER' }); },
  createInspection: function (body) { return post('inspections', body); },
  listInspections: function (query) { return get('inspections', query); },
  getInspection: function (id) { return get('inspections/' + id); },
  updateInspection: function (id, body) { return patch('inspections/' + id, body); },
  addInspectionItem: function (id, body) { return post('inspections/' + id + '/items', body); },
  organizeDraft: function (inspectionId, itemId, body) {
    return post('inspections/' + inspectionId + '/items/' + itemId + ':organize-draft', body);
  },
  confirmIssues: function (inspectionId, itemId, body) {
    return post('inspections/' + inspectionId + '/items/' + itemId + '/issues:confirm', body);
  },
  submitInspection: function (id, body) { return post('inspections/' + id + ':submit', body); },
  getIssue: function (id) { return get('issues/' + id); },
  createRectificationTask: function (issueId, body) {
    return post('issues/' + issueId + '/rectification-tasks', body);
  },
  listTasks: function (query) { return get('rectification-tasks', query); },
  listAllTasks: function (query) { return listAll('rectification-tasks', query); },
  getTask: function (id) { return get('rectification-tasks/' + id); },
  acceptTask: function (id, body) { return post('rectification-tasks/' + id + ':accept', body); },
  saveSubmissionDraft: function (id, body) { return put('rectification-tasks/' + id + '/submission-draft', body); },
  submitRectification: function (id, body) { return post('rectification-tasks/' + id + ':submit', body); },
  reviewRectification: function (id, body) { return post('rectification-tasks/' + id + ':review', body); },
  listMedia: function (query) { return get('media-assets', query); },
  listAllMedia: function (query) { return listAll('media-assets', query); },
  voidMedia: function (id, rowVersion) { return remove('media-assets/' + id, { rowVersion: rowVersion }); },
  uploadMedia: uploadMedia,
  downloadMedia: downloadMedia,
};
