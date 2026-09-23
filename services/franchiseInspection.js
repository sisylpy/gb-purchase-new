/**
 * 加盟门店总部整改任务接口。
 * 门店端只负责接受任务、提交整改和查看复核结果。
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
  var errorCode = body.errorCode || '';
  var message = String(body.msg || body.message || response.errMsg || '请求失败，请稍后重试');
  if (errorCode === 'MEDIA_ASSET_ID_INVALID') {
    message = '照片标识无效，请刷新页面后重试';
  }
  return {
    inspectionError: true,
    status: status,
    code: Number(businessCode) !== 0 ? businessCode : numericCode(status),
    errorCode: errorCode,
    message: message,
    raw: error,
  };
}

function wxLoginCode() {
  return withTimeout(new Promise(function (resolve, reject) {
    wx.login({
      success: function (result) {
        if (result && result.code) resolve(result.code);
        else reject(normalizeError({ statusCode: 400, data: { code: 400, errorCode: 'WECHAT_CODE_REQUIRED', msg: '微信登录凭证获取失败，请重试' } }));
      },
      fail: function (error) { reject(normalizeError(error)); },
    });
  }), 30000, '微信登录超时，请重试');
}

function withTimeout(promise, timeoutMs, message) {
  return new Promise(function (resolve, reject) {
    var settled = false;
    var timer = setTimeout(function () {
      if (settled) return;
      settled = true;
      reject(normalizeError({
        statusCode: 0,
        data: { code: -1, errorCode: 'NETWORK_TIMEOUT', msg: message || '网络请求超时，请检查网络后重试' },
      }));
    }, Number(timeoutMs || 30000));
    promise.then(function (value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    }).catch(function (error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
  });
}

function call(path, data, method, options) {
  var opts = Object.assign({
    method: method || 'GET',
    showErrorToast: false,
  }, options || {});
  var request = http.request(PREFIX + path, data || {}, opts).then(function (response) {
    var body = parseBody(response && response.result);
    if (numericCode(body.code) !== 0) {
      return Promise.reject(normalizeError({ statusCode: 200, data: body }));
    }
    return body.data;
  }).catch(function (error) {
    return Promise.reject(normalizeError(error));
  });
  return withTimeout(request, opts.timeoutMs || 30000);
}

function get(path, query) { return call(path, query || {}, 'GET'); }
function post(path, body, options) { return call(path, body || {}, 'POST', options); }
function put(path, body) { return call(path, body || {}, 'PUT'); }
function remove(path, body) { return call(path, body || {}, 'DELETE'); }

function clearLegacyStoreContext() {
  ['disInfo', 'userInfo', 'mendianInfo', 'orderDepInfo', 'purDepInfo', 'franchiseCurrentUser']
    .forEach(function (key) { wx.removeStorageSync(key); });
}

function saveLoginResult(result) {
  var body = result && result.result ? result.result : {};
  if (numericCode(body.code) !== 0 || !body.data || !body.data.token) {
    return Promise.reject(normalizeError({
      statusCode: 403,
      data: body.code ? body : { code: 403, errorCode: 'AUTH_REQUIRED', msg: '请重新登录后继续使用' },
    }));
  }
  var data = body.data;
  mediaDownloadCache = {};
  wx.setStorageSync('token', 'Bearer ' + data.token);
  wx.setStorageSync('franchiseTokenExpiresAt', data.tokenExpiresAt || '');
  if (data.identityState === 'FRANCHISEE_OWNER_ACTIVE') {
    // 经营主体负责人使用正式 franchise scope，绝不能恢复整个 distributor 的 legacy 门店缓存。
    clearLegacyStoreContext();
    if (data.depUserInfo) wx.setStorageSync('userInfo', data.depUserInfo);
    if (data.currentUser) wx.setStorageSync('franchiseCurrentUser', data.currentUser);
    return data;
  }
  if (data.disInfo) wx.setStorageSync('disInfo', data.disInfo);
  if (data.depUserInfo) wx.setStorageSync('userInfo', data.depUserInfo);
  if (data.depInfo) wx.setStorageSync('mendianInfo', data.depInfo);
  if (data.orderDepInfo) wx.setStorageSync('orderDepInfo', data.orderDepInfo);
  return data;
}

function refreshToken() {
  return wxLoginCode().then(function (code) {
    return withTimeout(loginApi.gbLoginIndex(code), 30000).then(saveLoginResult);
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

function refreshIdentity() {
  return refreshToken().then(function () { return get('me'); });
}

var FRANCHISEE_OWNER_ROLE = 'FRANCHISEE_OWNER';
var STORE_MANAGER_ROLE = 'STORE_MANAGER';

function invitationLookup(lookup) {
  return encodeURIComponent(String(lookup || '').trim());
}

function invitationSummaryWithRole(summary, fallbackRole) {
  var normalized = Object.assign({}, summary || {});
  normalized.targetRole = String(normalized.targetRole || fallbackRole || '').trim().toUpperCase();
  normalized.invitationStatus = normalized.invitationStatus || normalized.status || '';
  return normalized;
}

function shouldTryFranchiseeOwnerSummary(error) {
  return error && (error.errorCode === 'INVITATION_NOT_FOUND' || Number(error.status) === 404);
}

function getStoreOwnerInvitationSummary(lookup) {
  return get('store-owner-invitations/' + invitationLookup(lookup) + '/summary').then(function (summary) {
    // 兼容尚未返回 targetRole 的历史店长邀请摘要。
    return invitationSummaryWithRole(summary, STORE_MANAGER_ROLE);
  });
}

function getFranchiseeOwnerInvitationSummary(lookup) {
  return get('franchisee-owner-invitations/' + invitationLookup(lookup) + '/summary').then(function (summary) {
    return invitationSummaryWithRole(summary, FRANCHISEE_OWNER_ROLE);
  });
}

function getRoleInvitationSummary(lookup) {
  // 旧链接没有角色参数，先按原店长接口查询；只有明确“未找到”时才尝试经营主体负责人接口。
  return getStoreOwnerInvitationSummary(lookup).catch(function (error) {
    if (!shouldTryFranchiseeOwnerSummary(error)) return Promise.reject(error);
    return getFranchiseeOwnerInvitationSummary(lookup);
  });
}

function saveInvitationAcceptance(accepted) {
  if (accepted && accepted.token) {
    wx.setStorageSync('token', 'Bearer ' + accepted.token);
    wx.setStorageSync('franchiseTokenExpiresAt', accepted.tokenExpiresAt || '');
    if (accepted.currentUser) wx.setStorageSync('franchiseCurrentUser', accepted.currentUser);
  }
  // 接受邀请已经建立正式餐饮用户；再次按原登录主链取得完整门店、部门和经营资料。
  return refreshToken().then(function (loginData) {
    return { invitation: accepted, login: loginData };
  });
}

function acceptStoreOwnerInvitation(lookup, profile) {
  var input = profile || {};
  return wxLoginCode().then(function (code) {
    return post('store-owner-invitations/' + invitationLookup(lookup) + ':accept', {
      code: code,
      userName: String(input.userName || '').trim(),
    });
  }).then(saveInvitationAcceptance);
}

function acceptFranchiseeOwnerInvitation(lookup, profile) {
  var input = profile || {};
  return wxLoginCode().then(function (code) {
    return post('franchisee-owner-invitations/' + invitationLookup(lookup) + ':accept', {
      code: code,
      userName: String(input.userName || '').trim(),
    });
  }).then(saveInvitationAcceptance);
}

function normalizeRelatedMedia(rows) {
  return (rows || []).map(function (row) {
    return Object.assign({
      localKey: 'asset-' + row.mediaAssetId,
      status: row.status || 'READY',
      uploadStatus: 'ready',
      progress: 100,
      mimeType: row.mediaType || '',
      createdAt: row.uploadedAt || '',
    }, row);
  });
}

function listAll(path, query, pageSize) {
  var params = Object.assign({}, query || {}, { page: 1, pageSize: pageSize || 100 });
  return get(path, params).then(function (first) {
    var items = (first && first.items) || [];
    var pages = Number(first && first.totalPages || 1);
    if (pages <= 1) return deduplicateItems(items);
    var requests = [];
    for (var page = 2; page <= pages; page += 1) {
      requests.push(get(path, Object.assign({}, params, { page: page })));
    }
    return Promise.all(requests).then(function (results) {
      results.forEach(function (result) { items = items.concat((result && result.items) || []); });
      return deduplicateItems(items);
    });
  });
}

function deduplicateItems(items) {
  var seen = {};
  return (items || []).filter(function (item, index) {
    if (!item || typeof item !== 'object') return true;
    var id = item.inspectionId || item.rectificationTaskId || item.mediaAssetId || item.issueId || item.id;
    if (id === null || typeof id === 'undefined' || id === '') return true;
    var key = String(id);
    if (seen[key]) return false;
    seen[key] = index + 1;
    return true;
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
      timeout: 120000,
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

function downloadMedia(asset, original, retriedAfterLogin) {
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
      timeout: 60000,
      header: header,
      success: function (response) {
        if (response.statusCode >= 200 && response.statusCode < 300 && response.tempFilePath) {
          mediaDownloadCache[key] = response.tempFilePath;
          resolve(response.tempFilePath);
        } else if (!retriedAfterLogin && (Number(response.statusCode) === 401 || Number(response.statusCode) === 403)) {
          ensureToken(true).then(function () {
            return downloadMedia(asset, original, true);
          }).then(resolve).catch(reject);
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
  refreshIdentity: refreshIdentity,
  getRoleInvitationSummary: getRoleInvitationSummary,
  getStoreOwnerInvitationSummary: getStoreOwnerInvitationSummary,
  getFranchiseeOwnerInvitationSummary: getFranchiseeOwnerInvitationSummary,
  acceptStoreOwnerInvitation: acceptStoreOwnerInvitation,
  acceptFranchiseeOwnerInvitation: acceptFranchiseeOwnerInvitation,
  approveWebLogin: function (userCode) {
    return post('auth/web-login-sessions/' + encodeURIComponent(String(userCode || '').trim()) + ':approve', {});
  },
  getMe: function () { return get('me'); },
  createRestaurantUpgradeTicket: function (body) {
    return post('onboarding/restaurant-upgrade-ticket', body);
  },
  listStores: function () { return get('stores'); },
  getFranchiseeOperations: function (storeId) {
    return get('franchisee/operations/overview', storeId ? { storeId: storeId } : {});
  },
  getStoreOperationOverview: function (storeId) {
    return get('stores/' + storeId + '/operation-overview');
  },
  listStoreRecipeVersions: function (storeId) {
    return get('standard-sync/stores/' + storeId + '/recipe-versions');
  },
  applyLatestRecipeVersion: function (adoptionId, body) {
    return post('standard-sync/recipe-adoptions/' + adoptionId + ':apply-latest', body);
  },
  listAssignees: function (storeId) { return get('stores/' + storeId + '/assignees', { role: 'STORE_MANAGER' }); },
  listTasks: function (query) { return get('rectification-tasks', query); },
  listAllTasks: function (query) { return listAll('rectification-tasks', query); },
  getTask: function (id) { return get('rectification-tasks/' + id); },
  acceptTask: function (id, body) { return post('rectification-tasks/' + id + ':accept', body); },
  saveSubmissionDraft: function (id, body) { return put('rectification-tasks/' + id + '/submission-draft', body); },
  submitRectification: function (id, body) { return post('rectification-tasks/' + id + ':submit', body); },
  listMedia: function (query) { return get('media-assets', query); },
  listAllMedia: function (query) { return listAll('media-assets', query); },
  listRelatedMedia: function (businessType, businessId, evidenceStage) {
    var query = { businessType: businessType, businessId: businessId };
    if (evidenceStage) query.evidenceStage = evidenceStage;
    return get('media-assets/relations', query).then(normalizeRelatedMedia);
  },
  voidMedia: function (id, rowVersion) { return remove('media-assets/' + id, { rowVersion: rowVersion }); },
  uploadMedia: uploadMedia,
  downloadMedia: downloadMedia,
};
