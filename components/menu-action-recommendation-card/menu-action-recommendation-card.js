/**
 * 菜单优化方案卡 — AI presentation 主展示
 *
 * cardData（由 _resolveDisplayCard 预构建）：
 * {
 *   title, shopName, timeLabel,
 *   aiContent: { mainSummary, keyFindings, focusSections, nextSteps, supportingEvidence, capabilityBoundaryZh },
 *   empty
 * }
 */

function normalizeSteps(raw) {
  if (!raw || !Array.isArray(raw)) return [];
  var result = [];
  for (var i = 0; i < raw.length; i++) {
    var item = raw[i];
    if (typeof item === 'string') { result.push(item); }
    else if (item && typeof item === 'object') {
      var txt = item.step || item.text || item.action || '';
      if (txt) result.push(txt);
    }
  }
  return result.filter(function (s) { return s && s.trim().length > 0; });
}

/** 从 supportingEvidence 按 displayLabel 模糊查找值 */
function findEvidence(evidenceList, labelKeyword) {
  if (!evidenceList || !Array.isArray(evidenceList)) return '';
  for (var i = 0; i < evidenceList.length; i++) {
    var row = evidenceList[i];
    var lbl = (row.displayLabel || row.label || '');
    if (lbl.indexOf(labelKeyword) !== -1) {
      return (row.value || '') + (row.unit || '');
    }
  }
  return '';
}

/** 扁平化所有 focusSections 里的菜品 */
function collectFocusDishes(sections) {
  if (!sections || !Array.isArray(sections)) return [];
  var result = [];
  for (var i = 0; i < sections.length; i++) {
    var dishes = sections[i].dishes;
    if (dishes && Array.isArray(dishes)) {
      for (var j = 0; j < dishes.length; j++) {
        result.push(dishes[j]);
      }
    }
  }
  return result;
}

Component({
  properties: {
    cardData: {
      type: Object,
      value: null,
      observer: '_onCardDataChange',
    },
  },

  data: {
    visible: false,
    title: '',
    shopName: '',
    timeLabel: '',
    empty: false,

    // AI 生成内容
    aiMainSummary: '',
    aiKeyFindings: [],
    aiFocusSections: [],
    aiNextSteps: [],
    aiSupportingEvidence: [],
    aiCapabilityBoundaryZh: '',
    hasAiContent: false,

    // 头部核心数据
    heroGrossMargin: '',
    heroDishCount: '',

    // 扁平化关注的菜品
    flatFocusDishes: [],
  },

  methods: {
    _onCardDataChange: function (newVal) {
      if (!newVal) {
        this.setData({ visible: false });
        return;
      }

      var ai = newVal.aiContent;
      var hasAi = ai && (
        ai.mainSummary ||
        (Array.isArray(ai.keyFindings) && ai.keyFindings.length > 0) ||
        (Array.isArray(ai.focusSections) && ai.focusSections.length > 0) ||
        (Array.isArray(ai.nextSteps) && ai.nextSteps.length > 0) ||
        (Array.isArray(ai.supportingEvidence) && ai.supportingEvidence.length > 0) ||
        ai.capabilityBoundaryZh
      );

      var evidence = (ai && Array.isArray(ai.supportingEvidence)) ? ai.supportingEvidence : [];
      var focusSections = (ai && Array.isArray(ai.focusSections)) ? ai.focusSections : [];

      this.setData({
        visible: true,
        title: newVal.title || '菜单优化方案',
        shopName: newVal.shopName || '',
        timeLabel: newVal.timeLabel || '',
        empty: newVal.empty === true,

        aiMainSummary: (ai && ai.mainSummary) || '',
        aiKeyFindings: (ai && Array.isArray(ai.keyFindings)) ? ai.keyFindings : [],
        aiFocusSections: focusSections,
        aiNextSteps: normalizeSteps((ai && ai.nextSteps) || []),
        aiSupportingEvidence: evidence,
        aiCapabilityBoundaryZh: (ai && ai.capabilityBoundaryZh) || '',
        hasAiContent: !!hasAi,

        // 头部核心数据
        heroGrossMargin: findEvidence(evidence, '综合毛利率'),
        heroDishCount: findEvidence(evidence, '分析菜品数'),

        // 扁平化
        flatFocusDishes: collectFocusDishes(focusSections),
      });
    },
  },
});
