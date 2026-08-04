var statusLabels = {
  DRAFT: '草稿',
  IN_PROGRESS: '进行中',
  SUBMITTED: '已提交',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  OPEN: '待整改',
  RECTIFYING: '整改中',
  PENDING_ACCEPTANCE: '待接受',
  PENDING_REVIEW: '待复核',
  REJECTED: '被退回',
};

var severityLabels = { LOW: '低', MEDIUM: '中', HIGH: '高', CRITICAL: '严重' };
var eventLabels = {
  INSPECTION_CREATED: '巡店创建',
  INSPECTION_DRAFT_UPDATED: '巡店信息更新',
  INSPECTION_ITEM_ADDED: '现场记录保存',
  AI_DRAFT_READY: 'AI 草稿生成',
  ISSUE_CONFIRMED: '问题确认',
  RECTIFICATION_TASK_CREATED: '整改任务生成',
  ISSUE_STATUS_CHANGED: '问题状态变化',
  INSPECTION_SUBMITTED: '巡店提交',
  RECTIFICATION_ACCEPTED: '店长接受',
  RECTIFICATION_DRAFT_SAVED: '整改草稿保存',
  RECTIFICATION_SUBMITTED: '整改提交复核',
  RECTIFICATION_REJECTED: '复核退回',
  RECTIFICATION_APPROVED: '复核通过',
  INSPECTION_COMPLETED: '巡店完成',
};

function pad(value) { return Number(value) < 10 ? '0' + Number(value) : String(value); }

function localDate(offsetDays) {
  var date = new Date();
  if (offsetDays) date.setDate(date.getDate() + Number(offsetDays));
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function localDateTime() {
  var date = new Date();
  return localDate(0) + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
}

function formatTime(value) {
  return value ? String(value).replace('T', ' ').slice(0, 16) : '暂无';
}

function statusLabel(value) { return statusLabels[value] || '状态暂无'; }
function severityLabel(value) { return severityLabels[value] || '暂无'; }
function eventLabel(value) { return eventLabels[value] || '业务记录'; }

function statusClass(value) {
  if (value === 'COMPLETED') return 'status-success';
  if (value === 'REJECTED' || value === 'CANCELLED') return 'status-danger';
  if (value === 'PENDING_REVIEW' || value === 'PENDING_ACCEPTANCE' || value === 'SUBMITTED') return 'status-warning';
  if (value === 'IN_PROGRESS' || value === 'RECTIFYING' || value === 'OPEN') return 'status-primary';
  return 'status-muted';
}

function hasAction(identity, action) {
  return !!identity && (identity.allowedActions || []).indexOf(action) >= 0;
}

function createKey(prefix) {
  return String(prefix || 'inspection') + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
}

function persistentKey(scope, prefix) {
  var storageKey = 'franchiseIdempotency:' + scope;
  var value = wx.getStorageSync(storageKey);
  if (!value) {
    value = createKey(prefix);
    wx.setStorageSync(storageKey, value);
  }
  return value;
}

function clearPersistentKey(scope) { wx.removeStorageSync('franchiseIdempotency:' + scope); }

function persistentCommand(scope, factory) {
  var storageKey = 'franchiseCommand:' + scope;
  var value = wx.getStorageSync(storageKey);
  if (!value) {
    value = factory();
    wx.setStorageSync(storageKey, value);
  }
  return value;
}

function clearPersistentCommand(scope) { wx.removeStorageSync('franchiseCommand:' + scope); }

function showError(error, options) {
  var status = Number(error && error.status || 0);
  var title = '请求失败';
  var content = error && error.message ? error.message : '网络连接失败，请稍后重试';
  if (status === 401 || status === 403) title = '登录或权限校验失败';
  if (status === 404) title = '记录不存在';
  if (status === 409) title = '数据已发生变化';
  if (status === 422) {
    title = 'AI 整理未完成';
    content = ((error && error.message) ? error.message + '。' : 'AI 返回的草稿结构无效。') +
      '原始记录和已上传照片已保留，可直接重试。';
  }
  if (status >= 500) title = '服务暂时异常';
  wx.showModal({
    title: title,
    content: content,
    showCancel: false,
    success: function () {
      if (options && typeof options.afterClose === 'function') options.afterClose();
    },
  });
}

function confirm(title, content) {
  return new Promise(function (resolve) {
    wx.showModal({
      title: title || '请确认',
      content: content || '',
      confirmColor: '#187e6e',
      success: function (result) { resolve(!!result.confirm); },
      fail: function () { resolve(false); },
    });
  });
}

function decorateTimeline(rows) {
  return (rows || []).map(function (row) {
    var detail = row.detail || {};
    var detailText = detail.reviewComment || detail.reason || detail.summary || '';
    if (!detailText && detail.taskNo) detailText = '任务编号：' + detail.taskNo;
    if (!detailText && detail.issueNo) detailText = '问题编号：' + detail.issueNo;
    if (!detailText && typeof detail.candidateCount !== 'undefined') detailText = '整理出 ' + detail.candidateCount + ' 个候选问题';
    if (!detailText && typeof detail.issueCount !== 'undefined') detailText = '本次提交 ' + detail.issueCount + ' 个正式问题';
    if (!detailText && detail.roundNo && row.eventType === 'RECTIFICATION_SUBMITTED') detailText = '第 ' + detail.roundNo + ' 轮整改已提交';
    return Object.assign({}, row, {
      displayType: eventLabel(row.eventType),
      displayTime: formatTime(row.occurredAt),
      detailText: detailText,
      statusText: row.toStatus ? statusLabel(row.toStatus) : '',
    });
  });
}

function composeRectification(form) {
  var rows = [
    ['问题原因', form.reason],
    ['已采取措施', form.measures],
    ['整改说明', form.description],
    ['补充说明', form.supplement],
  ];
  return rows.filter(function (row) { return String(row[1] || '').trim(); })
    .map(function (row) { return row[0] + '：' + String(row[1]).trim(); }).join('\n');
}

function parseRectification(content) {
  var form = { reason: '', measures: '', description: '', supplement: '' };
  var mapping = { '问题原因': 'reason', '已采取措施': 'measures', '整改说明': 'description', '补充说明': 'supplement' };
  String(content || '').split('\n').forEach(function (line) {
    Object.keys(mapping).some(function (label) {
      if (line.indexOf(label + '：') === 0 || line.indexOf(label + ':') === 0) {
        form[mapping[label]] = line.slice(label.length + 1).trim();
        return true;
      }
      return false;
    });
  });
  if (!form.reason && !form.measures && !form.description && !form.supplement && content) {
    form.description = String(content);
  }
  return form;
}

module.exports = {
  localDate: localDate,
  localDateTime: localDateTime,
  formatTime: formatTime,
  statusLabel: statusLabel,
  severityLabel: severityLabel,
  eventLabel: eventLabel,
  statusClass: statusClass,
  hasAction: hasAction,
  createKey: createKey,
  persistentKey: persistentKey,
  clearPersistentKey: clearPersistentKey,
  persistentCommand: persistentCommand,
  clearPersistentCommand: clearPersistentCommand,
  showError: showError,
  confirm: confirm,
  decorateTimeline: decorateTimeline,
  composeRectification: composeRectification,
  parseRectification: parseRectification,
};
