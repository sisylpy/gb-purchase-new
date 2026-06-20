/**
 * AI 对话页辅助：顾问话题、Run 参数、会话列表规范化
 */

var GB_DU_ADMIN_GROUP_MANAGER_APP = 0;
var GB_DU_ADMIN_STORE_MANAGER_APP = 11;
var GB_DU_ADMIN_STORE_ORDER_APP = 12;

var MENU_OPERATION_ADVISOR_ID = 13;

function emojiForTopicId(id) {
  var map = {
    'dish-profit': '🍲',
    'procurement-structure': '💰',
    'profit-gap': '📉',
    'weekly-checkup': '📋',
  };
  return map[id] || '✨';
}

function mapWorkflowsToTopics(workflows) {
  if (!workflows || !Array.isArray(workflows) || !workflows.length) return null;
  return workflows.map(function (wf) {
    var enabled = wf.enabled !== false;
    var status = (wf.status || 'ACTIVE').toUpperCase();
    var clickable = enabled && status !== 'COMING_SOON';
    return {
      title: wf.title || '',
      description: wf.description || '',
      questions: [{
        text: wf.title || '',
        clickable: clickable,
        status: status,
        workflowCode: wf.workflowCode || '',
        questionCode: wf.workflowCode || '',
        id: wf.workflowId || wf.workflowCode || ('wf_' + (wf.title || '').substring(0, 20)),
      }],
    };
  });
}

function extractSuggestedTopicsPayload(result) {
  if (!result) return null;
  var code = result.code;
  if (code !== undefined && code !== 0 && code !== '0') return null;
  var d = result.data;
  if (d && Array.isArray(d.questionTopics) && d.questionTopics.length > 0) return d.questionTopics;
  var wfTopics = mapWorkflowsToTopics(d && d.commonWorkflows);
  if (wfTopics) return wfTopics;
  return null;
}

function normalizeSuggestedQuestion(raw) {
  var text = raw.text || '';
  var status = (raw.status || 'ACTIVE').toUpperCase();
  var clickable = raw.clickable !== false && status !== 'COMING_SOON';
  var id = raw.id || raw.questionCode || ('q_' + text.substring(0, 20));
  return {
    id: id,
    text: text,
    status: status,
    clickable: clickable,
    workflowCode: raw.workflowCode || '',
    questionCode: raw.questionCode || '',
  };
}

function normalizeSuggestedTopic(raw, index) {
  var title = raw.title || '';
  var description = raw.description || '';
  var qArr = raw.questions || [];
  var questions = (Array.isArray(qArr) ? qArr : []).map(normalizeSuggestedQuestion);
  return {
    id: raw.topicId || raw.id || String(index),
    title: title,
    description: description,
    questions: questions,
    emoji: emojiForTopicId(raw.topicId || raw.id || String(index)),
  };
}

function buildRunPayloadBase(userInfo) {
  var disInfo = wx.getStorageSync('disInfo') || {};
  var distributerIdRaw = userInfo.gbDuDistributerId || disInfo.gbDistributerId;
  var departmentIdRaw = userInfo.gbDuDepartmentId || userInfo.gbDepartmentId;

  function positiveNum(v) {
    if (v === null || v === undefined || v === '') return null;
    var n = Number(v);
    if (isNaN(n) || n <= 0) return null;
    return n;
  }

  var userId = positiveNum(userInfo.gbDepartmentUserId);
  var dDep = positiveNum(departmentIdRaw);
  var dDis = positiveNum(distributerIdRaw);

  var rawAdmin = userInfo.gbDuAdmin;
  var adminNum =
    rawAdmin === null || rawAdmin === undefined || rawAdmin === ''
      ? NaN
      : Number(rawAdmin);
  var isGroupManagerApp = adminNum === GB_DU_ADMIN_GROUP_MANAGER_APP;
  var isStoreManagerApp = adminNum === GB_DU_ADMIN_STORE_MANAGER_APP;
  var isStoreOrderApp = adminNum === GB_DU_ADMIN_STORE_ORDER_APP;

  if (!userId) {
    console.log('[AI对话][范围判定] 结果: 无法创建 — 无有效 userId');
    return null;
  }

  var payload;

  if (isGroupManagerApp) {
    if (!dDis) {
      console.log('[AI对话][范围判定] 结果: 无法创建 — 集团管理端须提供 distributerId');
      return null;
    }
    payload = { userId: userId, scopeMode: 'GROUP', distributerId: dDis };
  } else if (isStoreManagerApp || isStoreOrderApp) {
    if (dDep) {
      payload = { userId: userId, scopeMode: 'STORE', departmentId: dDep };
    } else if (dDis) {
      payload = { userId: userId, scopeMode: 'GROUP', distributerId: dDis };
    } else {
      console.log('[AI对话][范围判定] 结果: 无法创建 — 门店/部门端无有效 departmentId 与 distributerId');
      return null;
    }
  } else if (dDep) {
    payload = { userId: userId, scopeMode: 'STORE', departmentId: dDep };
  } else if (dDis) {
    payload = { userId: userId, scopeMode: 'GROUP', distributerId: dDis };
  } else {
    console.log('[AI对话][范围判定] 结果: 无法创建 — 既无 departmentId 也无 distributerId');
    return null;
  }

  console.log('[AI对话][Run参数]', payload);
  return payload;
}

function normalizeConversationRow(raw) {
  return {
    id: raw.id || raw.gbAiConversationId || raw.conversationId || raw.topicId,
    title:
      raw.title ||
      raw.topicTitle ||
      raw.summary ||
      raw.lastMessage ||
      raw.gbAiConversationTitle ||
      '对话',
    time:
      raw.updateTime ||
      raw.updatedAt ||
      raw.gbAiConversationUpdateTime ||
      raw.createTime ||
      raw.gbAiConversationCreateTime ||
      '',
    threadKind: raw.threadKind || raw.conversationType || '',
  };
}

function isWorkRecordConversation(row) {
  if (row.threadKind === 'WORK_RECORD') return true;
  if (row.title === '店长工作记录') return true;
  return false;
}

function cleanContextSummary(cs) {
  if (!cs || typeof cs !== 'object') return null;
  var cleaned = cs.contextBar;
  if (cleaned && typeof cleaned === 'string') {
    cleaned = cleaned.trim();
    cleaned = cleaned.replace(/\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}\s+(\d{2}\/\d{2}\s*[-–—]\s*\d{2}\/\d{2})/g, '$1');
    if (/^门店沿用|^【查询范围】|^下面按本门店/.test(cleaned)) {
      cleaned = '';
    }
  }
  return {
    contextBar: cleaned || '',
    storeText: cs.storeText || '',
    timeText: cs.timeText || '',
    dateRangeText: cs.dateRangeText || '',
    scopeText: cs.scopeText || '',
  };
}

module.exports = {
  MENU_OPERATION_ADVISOR_ID: MENU_OPERATION_ADVISOR_ID,
  extractSuggestedTopicsPayload: extractSuggestedTopicsPayload,
  normalizeSuggestedTopic: normalizeSuggestedTopic,
  buildRunPayloadBase: buildRunPayloadBase,
  normalizeConversationRow: normalizeConversationRow,
  isWorkRecordConversation: isWorkRecordConversation,
  cleanContextSummary: cleanContextSummary,
};
