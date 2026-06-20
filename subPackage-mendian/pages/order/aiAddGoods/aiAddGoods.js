var load = require('../../../../lib/load.js');
var aiGoodsAddApi = require('../../../../services/aiGoodsAddApi.js');

function trimStr(s) {
  if (s == null || s === undefined) return '';
  return String(s).replace(/^\s+|\s+$/g, '');
}

/** DIRECT_TEMP：`existingOrderStandards` 可能为 string[] 或带 gbDsStandardName 的对象 */
function normalizeOrderStandardNameList(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  var out = [];
  for (var i = 0; i < raw.length; i++) {
    var x = raw[i];
    var s = '';
    if (x == null) {
      continue;
    }
    if (typeof x === 'object') {
      if (x.gbDsStandardName != null && x.gbDsStandardName !== '') {
        s = trimStr(x.gbDsStandardName);
      } else if (x.name != null && x.name !== '') {
        s = trimStr(x.name);
      } else if (x.standardName != null && x.standardName !== '') {
        s = trimStr(x.standardName);
      }
    } else {
      s = trimStr(x);
    }
    if (s) {
      out.push(s);
    }
  }
  return out;
}

/** §5.1 v0.7：临时品直连（不调 DeepSeek / 目录匹配）；请求侧别名与 DIRECT_TEMP 等价 */
function isTempDirectAnalyzeModeRequest(mode) {
  var s = mode != null && mode !== '' ? String(mode).trim() : '';
  return s === 'DIRECT_TEMP' || s === 'ADD_TEMP' || s === 'TEMP_ONLY' || s === 'TEMP_GOODS';
}

/** 当前页用户输入（名称/规格/说明），与输入框一致 — 用于回写，避免被接口中间态覆盖 */
function preserveUserGoodsFromPage(page) {
  var d = page.data;
  return {
    goodsName: trimStr(d.goodsName),
    goodsSpec: trimStr(d.goodsSpec),
    goodsFurtherDescription: trimStr(d.goodsFurtherDescription),
  };
}

/** 联调日志：打印 request 返回的完整结构（含 result 业务体） */
function logAiGoodsAddApiResponse(tag, res) {
  var r = res && res.result;
  if (r != null && typeof r === 'object') {
    try {
    } catch (e) {
    }
  }
}

function parseAiResponse(res) {
  var r = res && res.result;
  if (!r) {
    return { ok: false, flowState: 'ERROR', msg: '网络异常', data: {} };
  }
  var code = r.code;
  var data = r.data;
  if (data == null || typeof data !== 'object') {
    data = {};
  }
  var flowState = r.flowState || data.flowState || 'ERROR';
  var msg = r.msg || '';
  if (code != null && code !== 0 && code !== '0') {
    return { ok: false, flowState: 'ERROR', msg: msg || '请求失败', data: data };
  }
  if (flowState === 'ERROR') {
    return { ok: false, flowState: 'ERROR', msg: msg || '操作失败，请稍后重试。', data: data };
  }
  return { ok: true, flowState: flowState, msg: msg, data: data };
}

/** §3.5a / v0.11：BRANCH_CONFIRM 口语化主说明（与接口固定 assistantMessage 对齐，前端写死避免模型摘要干扰） */
var BRANCH_CONFIRM_GUIDE_MAIN =
  '先看下面推荐的一级/二级是不是您想归的那一类——是就确认，系统会在该大类下帮您加上这件货；不是就改手动选目录重新归类，或直接加成临时商品。';

/** §2：农鑫预检索三态 `DIS_CATALOG_*`；兼容旧版单一 `DIS_CATALOG_CHOICE` */
function isDisCatalogPrefetchFlowState(fs) {
  return (
    fs === 'DIS_CATALOG_GB_ONLY' ||
    fs === 'DIS_CATALOG_NX_ONLY' ||
    fs === 'DIS_CATALOG_MIXED' ||
    fs === 'DIS_CATALOG_CHOICE'
  );
}

Page({
  data: {
    flowState: 'INPUT',
    windowWidth: 750,
    windowHeight: 1200,
    navBarHeight: 88,

    goodsName: '',
    goodsSpec: '',
    /** 每次「提交分析」等请求前同步，用于非 INPUT 态顶部展示 */
    lastSubmittedGoodsName: '',
    lastSubmittedGoodsSpec: '',
    /** §5.1：选填「说明」（`goodsFurtherDescription`）；analyze / confirm TEMP 同源 */
    goodsFurtherDescription: '',
    lastSubmittedGoodsFurtherDescription: '',

    sessionId: '',
    assistantMessage: '',
    matchSummary: null,
    candidates: [],
    selectedNxGoodsId: null,
    tempPreview: null,
    persistedGoods: null,
    /** §5.1 扩充目录成功时与 persistedGoods 同时返回，字段与 createDistributerGoodsFromNxGoods 一致 */
    gbDistributerGoods: null,
    /** 成功时 data 返回，部门商品摘要（字段与表对齐） */
    gbDepartmentDisGoods: null,
    successSummary: null,

    /** MATCH_SINGLE / MATCH_CHOICE / MANUAL_CATALOG_SKU_*：见 docs §5.1 */
    nxCatalogConfirmIntents: [],

    /** ''=默认 AI；'MANUAL_CATALOG'；临时品直连：'DIRECT_TEMP' | 'ADD_TEMP' | 'TEMP_ONLY' | 'TEMP_GOODS'（§5.1 v0.7） */
    analyzeModeRequest: '',
    manualGreatGrandNxGoodsId: null,
    manualGrandNxGoodsId: null,
    manualFatherNxGoodsId: null,
    catalogLevel1Options: [],
    catalogLevel2Options: [],
    catalogLevel3Options: [],
    analyzeModeHint: '',
    responseAnalyzeMode: '',

    branchOptions: [],
    selectedGrandNxGoodsId: null,
    /** TEMP_CONFIRM「返回」：NO_MATCH | BRANCH_CONFIRM | MANUAL_CATALOG_BRANCH | MATCH_CHOICE | DIS_CATALOG_PREFETCH | MANUAL_CATALOG_SKU_CHOICE */
    tempPreviewSource: '',
    /** §5.1：DIS_CATALOG_* 与 flowState 对齐，埋点用：`GB_ONLY` | `NX_ONLY` | `MIXED` */
    catalogHitComposition: '',
    /** 是否为预检索候选块（DIS_CATALOG_GB_ONLY | NX_ONLY | MIXED | 旧 CHOICE） */
    disCatalogPrefetch: false,
    /** 「多选一」且无 nxCatalogConfirmIntents 时主按钮文案（prefetch：待下载→下载文案，否则选中确认） */
    disCatalogPrimaryFallbackLabel: '',
    /** 从 TEMP 返回预检索态时恢复的 flowState */
    disCatalogFlowStateBeforeTemp: '',

    /** `TEMP_ADD_ORDER_STANDARD`：用户本次规格；`existingOrderStandards`：主规格+已有订货规格名列表 */
    requestedOrderStandard: '',
    existingOrderStandards: [],

    errorMsg: '',

    /** 目录类流程：底部按钮 position:fixed 贴屏底，scroll-view = 导航下剩余高度 + padding-bottom */
    catalogLayoutSticky: false,
    catalogScrollViewHeightRpx: 1112,
    catalogScrollPaddingBottomRpx: 0,
    catalogFooterVariant: '',

    departmentId: 0,
    distributerId: 0,
    depId: 0,
    depFatherId: null,
  },

  onLoad: function (options) {
    var goodsName = options.goodsName ? decodeURIComponent(options.goodsName) : '';
    this.setData({
      goodsName: goodsName,
      lastSubmittedGoodsName: goodsName,
      lastSubmittedGoodsSpec: '',
    });

    var userValue = wx.getStorageSync('userInfo');
    if (userValue) {
      this.setData({ userInfo: userValue });
    }

    var distributerId = 0;
    var disValue = wx.getStorageSync('disInfo');
    if (disValue && disValue.gbDistributerId != null) {
      distributerId = Number(disValue.gbDistributerId);
      this.setData({
        disInfo: disValue,
        distributerId: distributerId,
      });
    }

    var depValue = wx.getStorageSync('orderDepInfo');
    if (depValue) {
      var depId = depValue.gbDepartmentId;
      var father = depValue.gbDepartmentFatherId;
      this.setData({
        depInfo: depValue,
        depId: depId,
        departmentId: depId,
        depFatherId: father != null && father !== '' ? father : null,
      });
    }
  },

  onShow: function () {
    var windowInfo = wx.getWindowInfo();
    var globalData = getApp().globalData;
    var that = this;
    this.setData(
      {
        windowWidth: windowInfo.windowWidth * globalData.rpxR,
        windowHeight: windowInfo.windowHeight * globalData.rpxR,
        navBarHeight: globalData.navBarHeight * globalData.rpxR,
      },
      function () {
        that.syncCatalogStickyLayout();
      }
    );
  },

  onReady: function () {
    this.syncCatalogStickyLayout();
  },

  /**
   * BRANCH / NO_MATCH / 手动 L1–L3：底部操作区固定，列表在中间区域滚动。
   */
  syncCatalogStickyLayout: function () {
    var d = this.data;
    var fs = d.flowState;
    var FOOTER_RPX_MULTI = 560;
    var FOOTER_RPX_SINGLE = 200;
    var multi =
      fs === 'BRANCH_CONFIRM' || fs === 'MANUAL_CATALOG_BRANCH' || fs === 'NO_MATCH';
    var single =
      fs === 'MANUAL_CATALOG_L1' || fs === 'MANUAL_CATALOG_L2' || fs === 'MANUAL_CATALOG_L3';
    var sticky = !!(multi || single);
    var nav = Number(d.navBarHeight) || 0;
    var wh = Number(d.windowHeight) || 1200;
    var full = Math.max(0, wh - nav);
    var safeBottomRpx = 0;
    try {
      var winInfo = wx.getWindowInfo();
      if (
        winInfo &&
        winInfo.safeArea &&
        typeof winInfo.safeArea.bottom === 'number' &&
        typeof winInfo.screenHeight === 'number' &&
        winInfo.windowWidth > 0
      ) {
        var insetPx = Math.max(0, winInfo.screenHeight - winInfo.safeArea.bottom);
        safeBottomRpx = insetPx * (750 / winInfo.windowWidth);
      }
    } catch (e0) {}
    var footerBase = sticky ? (multi ? FOOTER_RPX_MULTI : FOOTER_RPX_SINGLE) : 0;
    var footerReserved = footerBase + safeBottomRpx;
    /** 滚动区占满导航下整块视口；底部留白用 padding-bottom，避免被 fixed 页脚盖住 */
    var scrollH = Math.max(200, full);
    var padBottom = sticky ? footerReserved + 8 : 0;
    var variant = multi ? 'multi' : single ? 'single' : '';
    if (
      d.catalogLayoutSticky === sticky &&
      d.catalogScrollViewHeightRpx === scrollH &&
      d.catalogScrollPaddingBottomRpx === padBottom &&
      d.catalogFooterVariant === variant
    ) {
      return;
    }
    this.setData({
      catalogLayoutSticky: sticky,
      catalogScrollViewHeightRpx: scrollH,
      catalogScrollPaddingBottomRpx: padBottom,
      catalogFooterVariant: variant,
    });
  },

  onGoodsNameInput: function (e) {
    this.setData({ goodsName: e.detail.value });
  },

  onGoodsSpecInput: function (e) {
    this.setData({ goodsSpec: e.detail.value });
  },

  onGoodsFurtherDescriptionInput: function (e) {
    this.setData({ goodsFurtherDescription: e.detail.value });
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  },

  /** 与当前输入框一致，写入「您填写的商品」展示用 */
  _syncLastSubmittedFromForm: function () {
    var k = preserveUserGoodsFromPage(this);
    this.setData({
      lastSubmittedGoodsName: k.goodsName,
      lastSubmittedGoodsSpec: k.goodsSpec,
      lastSubmittedGoodsFurtherDescription: k.goodsFurtherDescription,
    });
  },

  _buildAnalyzePayload: function (extra) {
    var d = this.data;
    var payload = {
      goodsName: trimStr(d.goodsName),
      goodsSpec: trimStr(d.goodsSpec),
      departmentId: Number(d.departmentId),
      distributerId: Number(d.distributerId),
      depId: Number(d.depId),
    };
    if (d.sessionId) {
      payload.sessionId = d.sessionId;
    }
    if (d.analyzeModeRequest === 'MANUAL_CATALOG') {
      payload.analyzeMode = 'MANUAL_CATALOG';
    } else if (isTempDirectAnalyzeModeRequest(d.analyzeModeRequest)) {
      payload.analyzeMode = 'DIRECT_TEMP';
    }
    if (d.analyzeModeRequest === 'MANUAL_CATALOG') {
      if (d.manualGreatGrandNxGoodsId != null && d.manualGreatGrandNxGoodsId !== '') {
        payload.manualGreatGrandNxGoodsId = Number(d.manualGreatGrandNxGoodsId);
      }
      if (d.manualGrandNxGoodsId != null && d.manualGrandNxGoodsId !== '') {
        payload.manualGrandNxGoodsId = Number(d.manualGrandNxGoodsId);
      }
      if (d.manualFatherNxGoodsId != null && d.manualFatherNxGoodsId !== '') {
        payload.manualFatherNxGoodsId = Number(d.manualFatherNxGoodsId);
      }
    }
    if (d.depFatherId != null && d.depFatherId !== '') {
      payload.depFatherId = Number(d.depFatherId);
    }
    var furtherDesc = trimStr(d.goodsFurtherDescription);
    if (furtherDesc) {
      payload.goodsFurtherDescription = furtherDesc;
    }
    if (extra && typeof extra === 'object') {
      for (var k in extra) {
        if (extra.hasOwnProperty(k)) {
          payload[k] = extra[k];
        }
      }
    }
    if (isTempDirectAnalyzeModeRequest(d.analyzeModeRequest)) {
      delete payload.confirmedGrandNxGoodsId;
      delete payload.manualGreatGrandNxGoodsId;
      delete payload.manualGrandNxGoodsId;
      delete payload.manualFatherNxGoodsId;
    }
    return payload;
  },

  _applyAnalyzeData: function (parsed) {
    var keep = preserveUserGoodsFromPage(this);
    var data = parsed.data || {};
    var sessionId = data.sessionId || this.data.sessionId;
    var fs = parsed.flowState;

    if (fs === 'SUCCESS') {
      this.setData({
        sessionId: sessionId,
        errorMsg: '',
      });
      this._applySuccess(parsed);
      return;
    }

    if (fs === 'TEMP_DUPLICATE') {
      this._applyTempDuplicateFlow(parsed, sessionId);
      return;
    }
    if (fs === 'TEMP_ADD_ORDER_STANDARD') {
      this._applyTempAddOrderStandardFlow(parsed, sessionId);
      return;
    }

    var matchSummary = data.matchSummary != null ? data.matchSummary : null;
    var candidates = Array.isArray(data.candidates) ? data.candidates : [];
    var tempPreview = data.tempPreview != null ? data.tempPreview : null;
    var branchOptions = Array.isArray(data.branchOptions) ? data.branchOptions : [];
    var assistantMessage = data.assistantMessage || parsed.msg || '';
    if (fs === 'BRANCH_CONFIRM' || fs === 'MANUAL_CATALOG_BRANCH') {
      assistantMessage = BRANCH_CONFIRM_GUIDE_MAIN;
    }

    var thatApply = this;
    if ((fs === 'MATCH_SINGLE' || fs === 'MANUAL_CATALOG_SKU_SINGLE') && !matchSummary) {
      this.setData(
        {
          flowState: 'ERROR',
          errorMsg: '返回数据不完整，请重试',
          sessionId: sessionId,
          goodsName: keep.goodsName,
          goodsSpec: keep.goodsSpec,
        },
        function () {
          thatApply.syncCatalogStickyLayout();
        }
      );
      return;
    }

    if ((fs === 'BRANCH_CONFIRM' || fs === 'MANUAL_CATALOG_BRANCH') && branchOptions.length === 0) {
      this.setData(
        {
          flowState: 'ERROR',
          errorMsg: '返回数据不完整，请重试',
          sessionId: sessionId,
          goodsName: keep.goodsName,
          goodsSpec: keep.goodsSpec,
        },
        function () {
          thatApply.syncCatalogStickyLayout();
        }
      );
      return;
    }

    if (isDisCatalogPrefetchFlowState(fs) && candidates.length === 0) {
      this.setData(
        {
          flowState: 'ERROR',
          errorMsg: '返回数据不完整，请重试',
          sessionId: sessionId,
          goodsName: keep.goodsName,
          goodsSpec: keep.goodsSpec,
        },
        function () {
          thatApply.syncCatalogStickyLayout();
        }
      );
      return;
    }

    if (fs === 'MANUAL_CATALOG_L1') {
      var l1chk = Array.isArray(data.catalogLevel1Options) ? data.catalogLevel1Options : [];
      if (l1chk.length === 0) {
        this.setData(
          {
            flowState: 'ERROR',
            errorMsg: '返回数据不完整，请重试',
            sessionId: sessionId,
            goodsName: keep.goodsName,
            goodsSpec: keep.goodsSpec,
          },
          function () {
            thatApply.syncCatalogStickyLayout();
          }
        );
        return;
      }
    }

    var goodsNameForView = keep.goodsName;
    var goodsSpecForView = keep.goodsSpec;
    var goodsFurtherDescriptionForView = keep.goodsFurtherDescription;

    if (fs === 'TEMP_CONFIRM') {
      if (!sessionId) {
        this.setData(
          {
            flowState: 'ERROR',
            errorMsg: '返回数据不完整，请重试',
            goodsName: keep.goodsName,
            goodsSpec: keep.goodsSpec,
            goodsFurtherDescription: keep.goodsFurtherDescription,
          },
          function () {
            thatApply.syncCatalogStickyLayout();
          }
        );
        return;
      }
      var tp0 = tempPreview != null && typeof tempPreview === 'object' ? tempPreview : {};
      tempPreview = Object.assign({}, tp0);
      var tpn = trimStr(tempPreview.goodsName);
      var tps = trimStr(tempPreview.goodsSpec);
      tempPreview.goodsName = tpn || keep.goodsName;
      tempPreview.goodsSpec = tps || keep.goodsSpec;
      goodsNameForView = trimStr(tempPreview.goodsName) || keep.goodsName;
      goodsSpecForView = trimStr(tempPreview.goodsSpec) || keep.goodsSpec;
      goodsFurtherDescriptionForView =
        trimStr(this.data.goodsFurtherDescription) || trimStr(tempPreview.goodsFurtherDescription);
    }

    var l1 = Array.isArray(data.catalogLevel1Options) ? data.catalogLevel1Options : [];
    var l2 = Array.isArray(data.catalogLevel2Options) ? data.catalogLevel2Options : [];
    var l3 = Array.isArray(data.catalogLevel3Options) ? data.catalogLevel3Options : [];
    var skuFlow = fs === 'MANUAL_CATALOG_SKU_SINGLE' || fs === 'MANUAL_CATALOG_SKU_CHOICE';

    var intentFlow =
      fs === 'MATCH_SINGLE' ||
      fs === 'MATCH_CHOICE' ||
      isDisCatalogPrefetchFlowState(fs) ||
      skuFlow;
    var nxCatalogConfirmIntents = [];
    if (intentFlow && Array.isArray(data.nxCatalogConfirmIntents)) {
      nxCatalogConfirmIntents = data.nxCatalogConfirmIntents.slice();
    }
    function hasUseMatchedIntentIn(arr) {
      return Array.isArray(arr) && arr.some(function (x) {
        return x && String(x.intent).trim() === 'USE_MATCHED';
      });
    }
    var catalogListHasNotDownloaded =
      (fs === 'MATCH_CHOICE' || fs === 'MANUAL_CATALOG_SKU_CHOICE' || isDisCatalogPrefetchFlowState(fs)) &&
      candidates.some(function (c) {
        return c && c.disImportStatus === 'NOT_DOWNLOADED';
      });
    if (catalogListHasNotDownloaded && !hasUseMatchedIntentIn(nxCatalogConfirmIntents)) {
      nxCatalogConfirmIntents.unshift({
        intent: 'USE_MATCHED',
        label: '下载目录商品到本店',
      });
    }
    var singleHasNotDownloaded =
      (fs === 'MATCH_SINGLE' || fs === 'MANUAL_CATALOG_SKU_SINGLE') &&
      matchSummary &&
      matchSummary.disImportStatus === 'NOT_DOWNLOADED';
    if (singleHasNotDownloaded && !hasUseMatchedIntentIn(nxCatalogConfirmIntents)) {
      nxCatalogConfirmIntents.unshift({
        intent: 'USE_MATCHED',
        label: '下载目录商品到本店',
      });
    }

    var disCatalogPrimaryFallbackLabel = '';
    if (isDisCatalogPrefetchFlowState(fs)) {
      disCatalogPrimaryFallbackLabel = catalogListHasNotDownloaded
        ? '下载目录商品到本店'
        : '确认使用选中目录商品';
    } else if (fs === 'MATCH_CHOICE' || fs === 'MANUAL_CATALOG_SKU_CHOICE') {
      if (catalogListHasNotDownloaded) {
        disCatalogPrimaryFallbackLabel = '下载目录商品到本店';
      }
    }

    this.setData(
      {
        flowState: fs,
        sessionId: sessionId,
        assistantMessage: assistantMessage,
        matchSummary: matchSummary,
        candidates: candidates,
        selectedNxGoodsId: null,
        tempPreview: tempPreview,
        persistedGoods: data.persistedGoods != null ? data.persistedGoods : null,
        gbDistributerGoods: data.gbDistributerGoods != null ? data.gbDistributerGoods : null,
        gbDepartmentDisGoods: data.gbDepartmentDisGoods != null ? data.gbDepartmentDisGoods : null,
        branchOptions: (fs === 'BRANCH_CONFIRM' || fs === 'MANUAL_CATALOG_BRANCH') ? branchOptions : [],
        selectedGrandNxGoodsId: null,
        tempPreviewSource: '',
        analyzeModeRequest: fs === 'TEMP_CONFIRM' ? '' : this.data.analyzeModeRequest,
        nxCatalogConfirmIntents: nxCatalogConfirmIntents,
        catalogLevel1Options: l1,
        catalogLevel2Options: l2,
        catalogLevel3Options: l3,
        catalogHitComposition:
          isDisCatalogPrefetchFlowState(fs) && data.catalogHitComposition != null && String(data.catalogHitComposition).trim() !== ''
            ? String(data.catalogHitComposition).trim()
            : '',
        disCatalogPrefetch: isDisCatalogPrefetchFlowState(fs),
        disCatalogPrimaryFallbackLabel: disCatalogPrimaryFallbackLabel,
        analyzeModeHint: data.analyzeModeHint != null && data.analyzeModeHint !== '' ? String(data.analyzeModeHint) : '',
        responseAnalyzeMode: data.analyzeMode != null && data.analyzeMode !== '' ? String(data.analyzeMode) : '',
        errorMsg: '',
        goodsName: goodsNameForView,
        goodsSpec: goodsSpecForView,
        goodsFurtherDescription: goodsFurtherDescriptionForView,
      },
      function () {
        thatApply.syncCatalogStickyLayout();
      }
    );
  },

  /** 发起 §5.1 analyze（已带好 analyzeMode / manual* 等 payload）；payloadExtra 如 { skipCatalogPrefetch: true } */
  _runAnalyze: function (loadingText, payloadExtra) {
    var that = this;
    load.showLoading(loadingText || '正在对照商品库，请稍候…');
    var payload = this._buildAnalyzePayload(payloadExtra || null);
    aiGoodsAddApi.analyze(payload).then(function (res) {
      logAiGoodsAddApiResponse('POST ai/goods-add/analyze', res);
      load.hideLoading();
      var parsed = parseAiResponse(res);
      var keep = preserveUserGoodsFromPage(that);
      if (!parsed.ok) {
        that.setData(
          {
            flowState: 'ERROR',
            errorMsg: parsed.msg || '操作失败，请稍后重试。',
            goodsName: keep.goodsName,
            goodsSpec: keep.goodsSpec,
          },
          function () {
            that.syncCatalogStickyLayout();
          }
        );
        return;
      }
      that._applyAnalyzeData(parsed);
    }).catch(function (err) {
      load.hideLoading();
      var keep = preserveUserGoodsFromPage(that);
      that.setData(
        {
          flowState: 'ERROR',
          errorMsg: '网络异常，请重试',
          goodsName: keep.goodsName,
          goodsSpec: keep.goodsSpec,
        },
        function () {
          that.syncCatalogStickyLayout();
        }
      );
    });
  },

  submitAnalyze: function () {
    var name = trimStr(this.data.goodsName);
    var spec = trimStr(this.data.goodsSpec);
    if (!name || !spec) {
      wx.showToast({ title: '请填写商品名称和规格。', icon: 'none' });
      return;
    }
    if (!this.data.depId || !this.data.distributerId) {
      wx.showToast({ title: '缺少部门或批发商信息', icon: 'none' });
      return;
    }

    this.setData({
      analyzeModeRequest: '',
      manualGreatGrandNxGoodsId: null,
      manualGrandNxGoodsId: null,
      manualFatherNxGoodsId: null,
    });
    this._syncLastSubmittedFromForm();
    this._runAnalyze('正在对照商品库，请稍候…');
  },

  /** 首屏：直接添加临时商品（DIRECT_TEMP 及 ADD_TEMP / TEMP_ONLY / TEMP_GOODS）→ §5.1 当场落库 SUCCESS；优先于 confirmedGrand；不调 DeepSeek（v0.7） */
  startDirectTempFromInput: function () {
    var name = trimStr(this.data.goodsName);
    var spec = trimStr(this.data.goodsSpec);
    if (!name || !spec) {
      wx.showToast({ title: '请填写商品名称和规格。', icon: 'none' });
      return;
    }
    if (!this.data.depId || !this.data.distributerId) {
      wx.showToast({ title: '缺少部门或批发商信息', icon: 'none' });
      return;
    }
    this.setData({
      analyzeModeRequest: 'DIRECT_TEMP',
      manualGreatGrandNxGoodsId: null,
      manualGrandNxGoodsId: null,
      manualFatherNxGoodsId: null,
    });
    this._syncLastSubmittedFromForm();
    this._runAnalyze('请稍候…');
  },

  /** 首屏：自己选目录（analyzeMode=MANUAL_CATALOG） */
  startManualCatalogFromInput: function () {
    var name = trimStr(this.data.goodsName);
    var spec = trimStr(this.data.goodsSpec);
    if (!name || !spec) {
      wx.showToast({ title: '请填写商品名称和规格。', icon: 'none' });
      return;
    }
    if (!this.data.depId || !this.data.distributerId) {
      wx.showToast({ title: '缺少部门或批发商信息', icon: 'none' });
      return;
    }
    this.setData({
      analyzeModeRequest: 'MANUAL_CATALOG',
      manualGreatGrandNxGoodsId: null,
      manualGrandNxGoodsId: null,
      manualFatherNxGoodsId: null,
    });
    this._syncLastSubmittedFromForm();
    this._runAnalyze('加载目录…');
  },

  /** 带 session 切手动目录：NO_MATCH「自己从一级目录选」与 BRANCH_CONFIRM / MANUAL_CATALOG_BRANCH「自己选目录」共用 */
  startManualCatalogFromNoMatch: function () {
    if (!this.data.sessionId) {
      wx.showToast({ title: '会话已失效，请重新填写', icon: 'none' });
      return;
    }
    this.setData({
      analyzeModeRequest: 'MANUAL_CATALOG',
      manualGreatGrandNxGoodsId: null,
      manualGrandNxGoodsId: null,
      manualFatherNxGoodsId: null,
    });
    this._syncLastSubmittedFromForm();
    this._runAnalyze('加载目录…');
  },

  selectManualCatalogLevel1: function (e) {
    var id = e.currentTarget.dataset.nxGoodsId;
    if (id == null || id === '') {
      return;
    }
    this.setData({
      analyzeModeRequest: 'MANUAL_CATALOG',
      manualGreatGrandNxGoodsId: Number(id),
      manualGrandNxGoodsId: null,
      manualFatherNxGoodsId: null,
    });
    this._syncLastSubmittedFromForm();
    this._runAnalyze('加载目录…');
  },

  selectManualCatalogLevel2: function (e) {
    var id = e.currentTarget.dataset.nxGoodsId;
    if (id == null || id === '') {
      return;
    }
    this.setData({
      analyzeModeRequest: 'MANUAL_CATALOG',
      manualGrandNxGoodsId: Number(id),
      manualFatherNxGoodsId: null,
    });
    this._syncLastSubmittedFromForm();
    this._runAnalyze('加载目录…');
  },

  selectManualCatalogLevel3: function (e) {
    var id = e.currentTarget.dataset.nxGoodsId;
    if (id == null || id === '') {
      return;
    }
    this.setData({
      analyzeModeRequest: 'MANUAL_CATALOG',
      manualFatherNxGoodsId: Number(id),
    });
    this._syncLastSubmittedFromForm();
    this._runAnalyze('加载目录…');
  },

  /** 手动逐级：返回上一级 */
  manualCatalogBackOneStep: function () {
    var fs = this.data.flowState;
    if (fs === 'MANUAL_CATALOG_L1') {
      this.backToInput();
      return;
    }
    if (fs === 'MANUAL_CATALOG_L2') {
      this.setData({
        manualGreatGrandNxGoodsId: null,
        manualGrandNxGoodsId: null,
        manualFatherNxGoodsId: null,
      });
    } else if (fs === 'MANUAL_CATALOG_L3') {
      this.setData({
        manualGrandNxGoodsId: null,
        manualFatherNxGoodsId: null,
      });
    } else {
      return;
    }
    this._syncLastSubmittedFromForm();
    this._runAnalyze('加载目录…');
  },

  selectBranchOption: function (e) {
    var id = e.currentTarget.dataset.grandId;
    if (id == null || id === '') {
      return;
    }
    this.setData({ selectedGrandNxGoodsId: Number(id) });
  },

  /** BRANCH_CONFIRM：带 confirmedGrandNxGoodsId 再次 analyze，成功时接口可直接返回 SUCCESS */
  confirmBranchAnalyze: function () {
    var gid = this.data.selectedGrandNxGoodsId;
    if (gid == null || !isFinite(gid)) {
      wx.showToast({ title: '请先选择一项分类', icon: 'none' });
      return;
    }
    if (!this.data.sessionId) {
      wx.showToast({ title: '会话已失效，请重新填写', icon: 'none' });
      return;
    }
    this._syncLastSubmittedFromForm();

    var that = this;
    load.showLoading('正在生成目录商品，请稍候…');
    var payload = this._buildAnalyzePayload({ confirmedGrandNxGoodsId: Number(gid) });
    aiGoodsAddApi.analyze(payload).then(function (res) {
      logAiGoodsAddApiResponse('POST ai/goods-add/analyze (confirmedGrandNxGoodsId)', res);
      load.hideLoading();
      var parsed = parseAiResponse(res);
      var keep = preserveUserGoodsFromPage(that);
      if (!parsed.ok) {
        that.setData(
          {
            flowState: 'ERROR',
            errorMsg: parsed.msg || '操作失败，请稍后重试。',
            goodsName: keep.goodsName,
            goodsSpec: keep.goodsSpec,
          },
          function () {
            that.syncCatalogStickyLayout();
          }
        );
        return;
      }
      that._applyAnalyzeData(parsed);
    }).catch(function (err) {
      load.hideLoading();
      var keep = preserveUserGoodsFromPage(that);
      that.setData(
        {
          flowState: 'ERROR',
          errorMsg: '网络异常，请重试',
          goodsName: keep.goodsName,
          goodsSpec: keep.goodsSpec,
        },
        function () {
          that.syncCatalogStickyLayout();
        }
      );
    });
  },

  fromBranchBackEdit: function () {
    var that = this;
    this.setData(
      {
        flowState: 'INPUT',
        sessionId: '',
        branchOptions: [],
        selectedGrandNxGoodsId: null,
        assistantMessage: '',
        matchSummary: null,
        candidates: [],
        tempPreview: null,
        persistedGoods: null,
        gbDistributerGoods: null,
        gbDepartmentDisGoods: null,
        successSummary: null,
        nxCatalogConfirmIntents: [],
        tempPreviewSource: '',
        errorMsg: '',
        analyzeModeRequest: '',
        manualGreatGrandNxGoodsId: null,
        manualGrandNxGoodsId: null,
        manualFatherNxGoodsId: null,
        catalogLevel1Options: [],
        catalogLevel2Options: [],
        catalogLevel3Options: [],
        analyzeModeHint: '',
        catalogHitComposition: '',
        disCatalogPrefetch: false,
        disCatalogPrimaryFallbackLabel: '',
        disCatalogFlowStateBeforeTemp: '',
        responseAnalyzeMode: '',
        requestedOrderStandard: '',
        existingOrderStandards: [],
      },
      function () {
        that.syncCatalogStickyLayout();
      }
    );
    this._syncLastSubmittedFromForm();
  },

  goTempFromBranchConfirm: function () {
    var src = this.data.flowState === 'MANUAL_CATALOG_BRANCH' ? 'MANUAL_CATALOG_BRANCH' : 'BRANCH_CONFIRM';
    var that = this;
    this.setData(
      {
        flowState: 'TEMP_CONFIRM',
        tempPreviewSource: src,
        tempPreview: null,
      },
      function () {
        that.syncCatalogStickyLayout();
      }
    );
  },

  /** MATCH_CHOICE：都不对，改为临时商品（不经 NO_MATCH） */
  choiceGoTemp: function () {
    var fs0 = this.data.flowState;
    var src;
    var extra = {};
    if (fs0 === 'MANUAL_CATALOG_SKU_CHOICE') {
      src = 'MANUAL_CATALOG_SKU_CHOICE';
    } else if (isDisCatalogPrefetchFlowState(fs0)) {
      src = 'DIS_CATALOG_PREFETCH';
      extra.disCatalogFlowStateBeforeTemp = fs0;
    } else {
      src = 'MATCH_CHOICE';
    }
    var that = this;
    this.setData(
      Object.assign(
        {
          flowState: 'TEMP_CONFIRM',
          tempPreviewSource: src,
          tempPreview: null,
        },
        extra
      ),
      function () {
        that.syncCatalogStickyLayout();
      }
    );
  },

  /** DIS_CATALOG_GB_ONLY：列表均在库，接口常仅给 ADD_SIBLING_SKU——补一条「选中行直接去下单」 */
  confirmDisCatalogUseInStock: function () {
    var gid = this.data.selectedNxGoodsId;
    if (gid == null || !isFinite(Number(gid))) {
      wx.showToast({ title: '请先选择一行商品', icon: 'none' });
      return;
    }
    var row = this._findCandidateByNxGoodsId(gid);
    if (!row || row.disImportStatus !== 'ALREADY_IN_MY_GOODS') {
      wx.showToast({ title: '请选择已在本店的商品', icon: 'none' });
      return;
    }
    var needConfirmApi = row.useConfirmApi === true || row.useConfirmApi === 'true';
    if (needConfirmApi) {
      wx.showToast({ title: '该项需先下载目录品', icon: 'none' });
      return;
    }
    this._applyDisCatalogAlreadyInGoods(row);
  },

  selectCandidate: function (e) {
    var id = e.currentTarget.dataset.id;
    if (id == null || id === '') {
      return;
    }
    this.setData({ selectedNxGoodsId: Number(id) });
  },

  /** 在 candidates / disCatalog 列表中查找当前选中 nxGoodsId */
  _findCandidateByNxGoodsId: function (nxGoodsId) {
    var list = this.data.candidates;
    if (!Array.isArray(list)) {
      return null;
    }
    var id = Number(nxGoodsId);
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c && Number(c.nxGoodsId) === id) {
        return c;
      }
    }
    return null;
  },

  /**
   * DIS_CATALOG_*：已在本店（无需 confirm）——直接成功并带回 gb，便于「完成」回调下单
   */
  _applyDisCatalogAlreadyInGoods: function (candidate) {
    var gb = {
      gbDistributerGoodsId: candidate.gbDistributerGoodsId,
      gbDgGoodsName: candidate.displayName,
      gbDgGoodsStandardname: candidate.standardName,
    };
    var summary = this._buildSuccessSummary(null, gb, null);
    summary.nxGoodsId = candidate.nxGoodsId != null ? Number(candidate.nxGoodsId) : null;
    var that = this;
    this.setData(
      {
        flowState: 'SUCCESS',
        persistedGoods: null,
        gbDistributerGoods: gb,
        gbDepartmentDisGoods: null,
        successSummary: summary,
        assistantMessage: '',
        branchOptions: [],
        selectedGrandNxGoodsId: null,
        matchSummary: null,
        candidates: [],
        selectedNxGoodsId: null,
        tempPreview: null,
        tempPreviewSource: '',
        nxCatalogConfirmIntents: [],
        analyzeModeRequest: '',
        manualGreatGrandNxGoodsId: null,
        manualGrandNxGoodsId: null,
        manualFatherNxGoodsId: null,
        catalogLevel1Options: [],
        catalogLevel2Options: [],
        catalogLevel3Options: [],
        analyzeModeHint: '',
        catalogHitComposition: '',
        disCatalogPrefetch: false,
        disCatalogPrimaryFallbackLabel: '',
        disCatalogFlowStateBeforeTemp: '',
        responseAnalyzeMode: this.data.responseAnalyzeMode || '',
        requestedOrderStandard: '',
        existingOrderStandards: [],
        errorMsg: '',
      },
      function () {
        that.syncCatalogStickyLayout();
      }
    );
    wx.setStorageSync('needRefreshOrderData', true);
  },

  /** 目录匹配确认：`dataset.intent` 为 `USE_MATCHED` | `ADD_SIBLING_SKU`（与 §5.2 `nxCatalogIntent` 对应） */
  confirmNxCatalogWithIntent: function (e) {
    var intent = (e.currentTarget.dataset.intent != null && e.currentTarget.dataset.intent !== '')
      ? String(e.currentTarget.dataset.intent).trim()
      : 'USE_MATCHED';
    var d = this.data;
    if (!d.sessionId) {
      wx.showToast({ title: '会话已失效，请重新填写', icon: 'none' });
      return;
    }
    var nxGoodsId = null;
    if ((d.flowState === 'MATCH_SINGLE' || d.flowState === 'MANUAL_CATALOG_SKU_SINGLE') && d.matchSummary && d.matchSummary.nxGoodsId != null) {
      nxGoodsId = Number(d.matchSummary.nxGoodsId);
    } else if (
      (d.flowState === 'MATCH_CHOICE' ||
        d.flowState === 'MANUAL_CATALOG_SKU_CHOICE' ||
        isDisCatalogPrefetchFlowState(d.flowState)) &&
      d.selectedNxGoodsId != null
    ) {
      nxGoodsId = Number(d.selectedNxGoodsId);
    }
    if (nxGoodsId == null || !isFinite(nxGoodsId)) {
      wx.showToast({ title: '请先选择一个商品', icon: 'none' });
      return;
    }

    if (isDisCatalogPrefetchFlowState(d.flowState) && intent === 'USE_MATCHED') {
      var disRow = this._findCandidateByNxGoodsId(nxGoodsId);
      var needConfirmApi =
        disRow && (disRow.useConfirmApi === true || disRow.useConfirmApi === 'true');
      if (disRow && disRow.disImportStatus === 'ALREADY_IN_MY_GOODS' && !needConfirmApi) {
        this._applyDisCatalogAlreadyInGoods(disRow);
        return;
      }
    }

    var body = {
      sessionId: d.sessionId,
      confirmType: 'NX_CATALOG',
      nxGoodsId: nxGoodsId,
    };
    if (intent === 'ADD_SIBLING_SKU') {
      var gn = trimStr(d.goodsName);
      var gs = trimStr(d.goodsSpec);
      if (!gn || !gs) {
        wx.showToast({ title: '请填写商品名称和规格', icon: 'none' });
        return;
      }
      body.nxCatalogIntent = 'ADD_SIBLING_SKU';
      body.goodsName = gn;
      body.goodsSpec = gs;
    } else if (intent !== 'USE_MATCHED') {
      wx.showToast({ title: '不支持的确认方式', icon: 'none' });
      return;
    }

    var that = this;
    load.showLoading(intent === 'ADD_SIBLING_SKU' ? '正在新增目录 SKU…' : '保存中…');
    aiGoodsAddApi.confirm(body).then(function (res) {
      logAiGoodsAddApiResponse('POST ai/goods-add/confirm NX_CATALOG', res);
      load.hideLoading();
      var parsed = parseAiResponse(res);
      var keep = preserveUserGoodsFromPage(that);
      if (!parsed.ok || parsed.flowState !== 'SUCCESS') {
        wx.showToast({ title: parsed.msg || '保存失败', icon: 'none' });
        that.setData(
          {
            flowState: 'ERROR',
            errorMsg: parsed.msg || '操作失败，请稍后重试。',
            goodsName: keep.goodsName,
            goodsSpec: keep.goodsSpec,
          },
          function () {
            that.syncCatalogStickyLayout();
          }
        );
        return;
      }
      var okMsg = res.result && res.result.msg ? String(res.result.msg).trim() : '';
      if (intent === 'ADD_SIBLING_SKU' && okMsg) {
        wx.showToast({ title: okMsg, icon: 'none', duration: 2500 });
      }
      that._applySuccess(parsed);
    }).catch(function (err) {
      load.hideLoading();
      var keep = preserveUserGoodsFromPage(that);
      that.setData(
        {
          flowState: 'ERROR',
          errorMsg: '网络异常，请重试',
          goodsName: keep.goodsName,
          goodsSpec: keep.goodsSpec,
        },
        function () {
          that.syncCatalogStickyLayout();
        }
      );
    });
  },

  _buildSuccessSummary: function (pg, gb, ddg) {
    var name = (pg && pg.gbDgGoodsName) || (gb && gb.gbDgGoodsName) || '';
    var spec = (pg && pg.gbDgGoodsStandardname) || (gb && gb.gbDgGoodsStandardname) || '';
    var gid = null;
    if (pg && pg.gbDistributerGoodsId != null && pg.gbDistributerGoodsId !== '') {
      gid = pg.gbDistributerGoodsId;
    } else if (gb && gb.gbDistributerGoodsId != null && gb.gbDistributerGoodsId !== '') {
      gid = gb.gbDistributerGoodsId;
    }
    var depDisId = null;
    if (ddg && ddg.gbDepartmentDisGoodsId != null && ddg.gbDepartmentDisGoodsId !== '') {
      depDisId = ddg.gbDepartmentDisGoodsId;
    }
    return {
      goodsName: name,
      goodsSpec: spec,
      nxGoodsId: pg && pg.nxGoodsId != null && pg.nxGoodsId !== '' ? pg.nxGoodsId : null,
      nxGoodsFatherNodeId: pg && pg.nxGoodsFatherNodeId != null && pg.nxGoodsFatherNodeId !== '' ? pg.nxGoodsFatherNodeId : null,
      nxGoodsFatherId: pg && pg.nxGoodsFatherId != null && pg.nxGoodsFatherId !== '' ? pg.nxGoodsFatherId : null,
      refNxGoodsId: pg && pg.refNxGoodsId != null && pg.refNxGoodsId !== '' ? pg.refNxGoodsId : null,
      addedSiblingNxSku: !!(pg && pg.addedSiblingNxSku),
      gbDistributerGoodsId: gid,
      gbDepartmentDisGoodsId: depDisId,
    };
  },

  _applySuccess: function (parsed) {
    var keep = preserveUserGoodsFromPage(this);
    var data = parsed.data || {};
    var pg = data.persistedGoods != null ? data.persistedGoods : null;
    var gb = data.gbDistributerGoods != null ? data.gbDistributerGoods : null;
    var ddg = data.gbDepartmentDisGoods != null ? data.gbDepartmentDisGoods : null;
    var summary = this._buildSuccessSummary(pg, gb, ddg);
    var that = this;
    this.setData(
      {
        flowState: 'SUCCESS',
        persistedGoods: pg,
        gbDistributerGoods: gb,
        gbDepartmentDisGoods: ddg,
        successSummary: summary,
        assistantMessage: data.assistantMessage || '',
        branchOptions: [],
        selectedGrandNxGoodsId: null,
        matchSummary: null,
        candidates: [],
        selectedNxGoodsId: null,
        tempPreview: null,
        tempPreviewSource: '',
        nxCatalogConfirmIntents: [],
        goodsName: keep.goodsName,
        goodsSpec: keep.goodsSpec,
        analyzeModeRequest: '',
        manualGreatGrandNxGoodsId: null,
        manualGrandNxGoodsId: null,
        manualFatherNxGoodsId: null,
        catalogLevel1Options: [],
        catalogLevel2Options: [],
        catalogLevel3Options: [],
        analyzeModeHint: '',
        catalogHitComposition: '',
        disCatalogPrefetch: false,
        disCatalogPrimaryFallbackLabel: '',
        disCatalogFlowStateBeforeTemp: '',
        responseAnalyzeMode: data.analyzeMode != null && data.analyzeMode !== '' ? String(data.analyzeMode) : '',
        requestedOrderStandard: '',
        existingOrderStandards: [],
      },
      function () {
        that.syncCatalogStickyLayout();
      }
    );
    wx.setStorageSync('needRefreshOrderData', true);
  },

  /**
   * DIRECT_TEMP：TEMP_DUPLICATE（同名规格已在主规格/订货规格命中，不落库；data 与同态 DUPLICATE / SUCCESS 摘要一致）。
   */
  _applyTempDuplicateFlow: function (parsed, sessionIdHint) {
    var keep = preserveUserGoodsFromPage(this);
    var data = parsed.data || {};
    var pg = data.persistedGoods != null ? data.persistedGoods : null;
    var gb = data.gbDistributerGoods != null ? data.gbDistributerGoods : null;
    var ddg = data.gbDepartmentDisGoods != null ? data.gbDepartmentDisGoods : null;
    var summary = this._buildSuccessSummary(pg, gb, ddg);
    var sid = sessionIdHint != null && sessionIdHint !== '' ? sessionIdHint : data.sessionId || this.data.sessionId;
    var that = this;
    this.setData(
      {
        flowState: 'TEMP_DUPLICATE',
        sessionId: sid != null && sid !== '' ? String(sid) : '',
        persistedGoods: pg,
        gbDistributerGoods: gb,
        gbDepartmentDisGoods: ddg,
        successSummary: summary,
        assistantMessage: data.assistantMessage || parsed.msg || '',
        requestedOrderStandard: '',
        existingOrderStandards: [],
        branchOptions: [],
        selectedGrandNxGoodsId: null,
        matchSummary: null,
        candidates: [],
        selectedNxGoodsId: null,
        tempPreview: null,
        tempPreviewSource: '',
        nxCatalogConfirmIntents: [],
        analyzeModeRequest: '',
        goodsName: keep.goodsName,
        goodsSpec: keep.goodsSpec,
        goodsFurtherDescription: keep.goodsFurtherDescription,
        manualGreatGrandNxGoodsId: null,
        manualGrandNxGoodsId: null,
        manualFatherNxGoodsId: null,
        catalogLevel1Options: [],
        catalogLevel2Options: [],
        catalogLevel3Options: [],
        analyzeModeHint: '',
        catalogHitComposition: '',
        disCatalogPrefetch: false,
        disCatalogPrimaryFallbackLabel: '',
        disCatalogFlowStateBeforeTemp: '',
        responseAnalyzeMode:
          data.analyzeMode != null && data.analyzeMode !== ''
            ? String(data.analyzeMode)
            : 'DIRECT_TEMP',
        errorMsg: '',
      },
      function () {
        that.syncCatalogStickyLayout();
      }
    );
    wx.setStorageSync('needRefreshOrderData', true);
  },

  /**
   * DIRECT_TEMP：TEMP_ADD_ORDER_STANDARD（同名、规格尚未在主/订货规格中；引导维护订货规格，不落库）。
   */
  _applyTempAddOrderStandardFlow: function (parsed, sessionIdHint) {
    var keep = preserveUserGoodsFromPage(this);
    var data = parsed.data || {};
    var pg = data.persistedGoods != null ? data.persistedGoods : null;
    var gb = data.gbDistributerGoods != null ? data.gbDistributerGoods : null;
    var ddg = data.gbDepartmentDisGoods != null ? data.gbDepartmentDisGoods : null;
    var summary = this._buildSuccessSummary(pg, gb, ddg);
    var sid = sessionIdHint != null && sessionIdHint !== '' ? sessionIdHint : data.sessionId || this.data.sessionId;
    var req = trimStr(data.requestedOrderStandard) || keep.goodsSpec;
    var existList = normalizeOrderStandardNameList(data.existingOrderStandards);
    var that = this;
    this.setData(
      {
        flowState: 'TEMP_ADD_ORDER_STANDARD',
        sessionId: sid != null && sid !== '' ? String(sid) : '',
        persistedGoods: pg,
        gbDistributerGoods: gb,
        gbDepartmentDisGoods: ddg,
        successSummary: summary,
        assistantMessage: data.assistantMessage || parsed.msg || '',
        requestedOrderStandard: req,
        existingOrderStandards: existList,
        branchOptions: [],
        selectedGrandNxGoodsId: null,
        matchSummary: null,
        candidates: [],
        selectedNxGoodsId: null,
        tempPreview: null,
        tempPreviewSource: '',
        nxCatalogConfirmIntents: [],
        analyzeModeRequest: '',
        goodsName: keep.goodsName,
        goodsSpec: keep.goodsSpec,
        goodsFurtherDescription: keep.goodsFurtherDescription,
        manualGreatGrandNxGoodsId: null,
        manualGrandNxGoodsId: null,
        manualFatherNxGoodsId: null,
        catalogLevel1Options: [],
        catalogLevel2Options: [],
        catalogLevel3Options: [],
        analyzeModeHint: '',
        catalogHitComposition: '',
        disCatalogPrefetch: false,
        disCatalogPrimaryFallbackLabel: '',
        disCatalogFlowStateBeforeTemp: '',
        responseAnalyzeMode:
          data.analyzeMode != null && data.analyzeMode !== ''
            ? String(data.analyzeMode)
            : 'DIRECT_TEMP',
        errorMsg: '',
      },
      function () {
        that.syncCatalogStickyLayout();
      }
    );
  },

  /**
   * TEMP_ADD_ORDER_STANDARD：后台已返 gb + 部门商品时，返回上一层并由 resGoodsSearch.applyAiAddedGoodsForOrder 打开 myDismodalDep（订货弹窗内有「添加规格」）。
   */
  finishOpenDepModalFromAiAddGoods: function () {
    var gb = this.data.gbDistributerGoods;
    var ddg = this.data.gbDepartmentDisGoods;
    if (!gb) {
      wx.showToast({ title: '缺少批发商商品信息', icon: 'none' });
      return;
    }
    if (!ddg) {
      wx.showToast({ title: '缺少部门商品信息，无法在订货弹窗维护规格', icon: 'none' });
      return;
    }
    this.finishSuccess();
  },

  /** 不落库分支：直接返回上一级，不调 applyAiAddedGoodsForOrder（不弹出订货面板） */
  finishAiAddBackWithoutCallback: function () {
    wx.navigateBack({ delta: 1 });
  },

  goTempFromNoMatch: function () {
    var that = this;
    this.setData(
      {
        flowState: 'TEMP_CONFIRM',
        tempPreviewSource: 'NO_MATCH',
        tempPreview: null,
      },
      function () {
        that.syncCatalogStickyLayout();
      }
    );
  },

  /** DIS_CATALOG_*：同 session 传 skipCatalogPrefetch 再 analyze，进入 AI 对照 */
  disCatalogContinueWithAi: function () {
    if (!this.data.sessionId) {
      wx.showToast({ title: '会话已失效，请重新填写', icon: 'none' });
      return;
    }
    this._syncLastSubmittedFromForm();
    this._runAnalyze('正在用 AI 对照目录…', { skipCatalogPrefetch: true });
  },

  noneOfCandidates: function () {
    if (isDisCatalogPrefetchFlowState(this.data.flowState)) {
      this.disCatalogContinueWithAi();
      return;
    }
    var that = this;
    this.setData(
      {
        flowState: 'NO_MATCH',
        analyzeModeRequest: '',
        manualGreatGrandNxGoodsId: null,
        manualGrandNxGoodsId: null,
        manualFatherNxGoodsId: null,
        catalogLevel1Options: [],
        catalogLevel2Options: [],
        catalogLevel3Options: [],
        analyzeModeHint: '',
        catalogHitComposition: '',
        disCatalogPrefetch: false,
        disCatalogPrimaryFallbackLabel: '',
        disCatalogFlowStateBeforeTemp: '',
        responseAnalyzeMode: '',
        matchSummary: null,
        candidates: [],
        selectedNxGoodsId: null,
        assistantMessage: '',
        tempPreview: null,
      },
      function () {
        that.syncCatalogStickyLayout();
      }
    );
  },

  confirmTempGoods: function () {
    var d = this.data;
    if (!d.sessionId) {
      wx.showToast({ title: '会话已失效，请重新填写', icon: 'none' });
      return;
    }
    var name = trimStr(d.goodsName);
    var spec = trimStr(d.goodsSpec);
    var note = trimStr(d.goodsFurtherDescription);

    var that = this;
    load.showLoading('保存中…');
    var body = {
      sessionId: d.sessionId,
      confirmType: 'TEMP',
      goodsName: name,
      goodsSpec: spec,
    };
    if (note) {
      body.goodsFurtherDescription = note;
    }
    aiGoodsAddApi.confirm(body).then(function (res) {
      logAiGoodsAddApiResponse('POST ai/goods-add/confirm TEMP', res);
      load.hideLoading();
      var parsed = parseAiResponse(res);
      var keep = preserveUserGoodsFromPage(that);
      if (!parsed.ok || parsed.flowState !== 'SUCCESS') {
        wx.showToast({ title: parsed.msg || '保存失败', icon: 'none' });
        that.setData(
          {
            flowState: 'ERROR',
            errorMsg: parsed.msg || '操作失败，请稍后重试。',
            goodsName: keep.goodsName,
            goodsSpec: keep.goodsSpec,
          },
          function () {
            that.syncCatalogStickyLayout();
          }
        );
        return;
      }
      that._applySuccess(parsed);
    }).catch(function (err) {
      load.hideLoading();
      var keep = preserveUserGoodsFromPage(that);
      that.setData(
        {
          flowState: 'ERROR',
          errorMsg: '网络异常，请重试',
          goodsName: keep.goodsName,
          goodsSpec: keep.goodsSpec,
        },
        function () {
          that.syncCatalogStickyLayout();
        }
      );
    });
  },

  backToInput: function () {
    var that = this;
    this.setData(
      {
        flowState: 'INPUT',
        sessionId: '',
        assistantMessage: '',
        matchSummary: null,
        candidates: [],
        selectedNxGoodsId: null,
        tempPreview: null,
        persistedGoods: null,
        gbDistributerGoods: null,
        gbDepartmentDisGoods: null,
        successSummary: null,
        nxCatalogConfirmIntents: [],
        branchOptions: [],
        selectedGrandNxGoodsId: null,
        tempPreviewSource: '',
        errorMsg: '',
        analyzeModeRequest: '',
        manualGreatGrandNxGoodsId: null,
        manualGrandNxGoodsId: null,
        manualFatherNxGoodsId: null,
        catalogLevel1Options: [],
        catalogLevel2Options: [],
        catalogLevel3Options: [],
        analyzeModeHint: '',
        catalogHitComposition: '',
        disCatalogPrefetch: false,
        disCatalogPrimaryFallbackLabel: '',
        disCatalogFlowStateBeforeTemp: '',
        responseAnalyzeMode: '',
        requestedOrderStandard: '',
        existingOrderStandards: [],
      },
      function () {
        that.syncCatalogStickyLayout();
      }
    );
    this._syncLastSubmittedFromForm();
  },

  fromNoMatchBackEdit: function () {
    var that = this;
    this.setData(
      {
        flowState: 'INPUT',
        sessionId: '',
        assistantMessage: '',
        matchSummary: null,
        candidates: [],
        selectedNxGoodsId: null,
        tempPreview: null,
        persistedGoods: null,
        gbDistributerGoods: null,
        gbDepartmentDisGoods: null,
        successSummary: null,
        nxCatalogConfirmIntents: [],
        branchOptions: [],
        selectedGrandNxGoodsId: null,
        tempPreviewSource: '',
        errorMsg: '',
        analyzeModeRequest: '',
        manualGreatGrandNxGoodsId: null,
        manualGrandNxGoodsId: null,
        manualFatherNxGoodsId: null,
        catalogLevel1Options: [],
        catalogLevel2Options: [],
        catalogLevel3Options: [],
        analyzeModeHint: '',
        catalogHitComposition: '',
        disCatalogPrefetch: false,
        disCatalogPrimaryFallbackLabel: '',
        disCatalogFlowStateBeforeTemp: '',
        responseAnalyzeMode: '',
        requestedOrderStandard: '',
        existingOrderStandards: [],
      },
      function () {
        that.syncCatalogStickyLayout();
      }
    );
    this._syncLastSubmittedFromForm();
  },

  fromTempBack: function () {
    var src = this.data.tempPreviewSource;
    var patch = { tempPreviewSource: '' };
    if (src === 'BRANCH_CONFIRM') {
      patch.flowState = 'BRANCH_CONFIRM';
      patch.assistantMessage = BRANCH_CONFIRM_GUIDE_MAIN;
    } else if (src === 'MANUAL_CATALOG_BRANCH') {
      patch.flowState = 'MANUAL_CATALOG_BRANCH';
      patch.assistantMessage = BRANCH_CONFIRM_GUIDE_MAIN;
    } else if (src === 'MATCH_CHOICE') {
      patch.flowState = 'MATCH_CHOICE';
    } else if (src === 'DIS_CATALOG_PREFETCH') {
      var backFs = this.data.disCatalogFlowStateBeforeTemp;
      patch.flowState =
        backFs && isDisCatalogPrefetchFlowState(backFs) ? backFs : 'DIS_CATALOG_MIXED';
      patch.disCatalogFlowStateBeforeTemp = '';
    } else if (src === 'MANUAL_CATALOG_SKU_CHOICE') {
      patch.flowState = 'MANUAL_CATALOG_SKU_CHOICE';
    } else {
      patch.flowState = 'NO_MATCH';
    }
    var thatBack = this;
    this.setData(patch, function () {
      thatBack.syncCatalogStickyLayout();
    });
  },

  retryError: function () {
    var that = this;
    this.setData(
      {
        flowState: 'INPUT',
        errorMsg: '',
        sessionId: '',
        branchOptions: [],
        selectedGrandNxGoodsId: null,
        matchSummary: null,
        candidates: [],
        tempPreview: null,
        persistedGoods: null,
        gbDistributerGoods: null,
        gbDepartmentDisGoods: null,
        successSummary: null,
        nxCatalogConfirmIntents: [],
        tempPreviewSource: '',
        assistantMessage: '',
        analyzeModeRequest: '',
        manualGreatGrandNxGoodsId: null,
        manualGrandNxGoodsId: null,
        manualFatherNxGoodsId: null,
        catalogLevel1Options: [],
        catalogLevel2Options: [],
        catalogLevel3Options: [],
        analyzeModeHint: '',
        catalogHitComposition: '',
        disCatalogPrefetch: false,
        disCatalogPrimaryFallbackLabel: '',
        disCatalogFlowStateBeforeTemp: '',
        responseAnalyzeMode: '',
        requestedOrderStandard: '',
        existingOrderStandards: [],
      },
      function () {
        that.syncCatalogStickyLayout();
      }
    );
    this._syncLastSubmittedFromForm();
  },

  finishSuccess: function () {
    var pages = getCurrentPages();
    if (pages.length >= 2) {
      var prev = pages[pages.length - 2];
      if (prev && typeof prev.applyAiAddedGoodsForOrder === 'function') {
        prev.applyAiAddedGoodsForOrder(this.data.gbDistributerGoods, this.data.gbDepartmentDisGoods);
      }
    }
    wx.navigateBack({ delta: 1 });
  },
});
