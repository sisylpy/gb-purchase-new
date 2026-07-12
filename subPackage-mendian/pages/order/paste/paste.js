import load from '../../../../lib/load';
const { depPasteSearchGoods, deleteOrderGb } = require('../../../../services/depOrder');
import { parseOrderFromText } from '../../../../lib/orderParser';
import pasteDepListCache from '../../../../lib/pasteDepListCache';

const {
  saveOrdersToPasteDepList,
  removeDepFromPasteDepList,
  hasUnmatchedOrders,
  sanitizePasteDepList,
} = pasteDepListCache;
const globalData = getApp().globalData;

// 腾讯云语音识别配置（密钥放在 config.js，已在 .gitignore 中，避免泄露）
let appConfig = {};
try { appConfig = require('../../../../config.js'); } catch (e) { appConfig = {}; }
const TENCENT_CLOUD_SECRET_ID = appConfig.tencentCloud?.secretId || '';
const TENCENT_CLOUD_SECRET_KEY = appConfig.tencentCloud?.secretKey || '';
const TENCENT_CLOUD_APP_ID = appConfig.tencentCloud?.appId || '1308821743';
const TENCENT_CLOUD_ENGINE_MODEL_TYPE = appConfig.tencentCloud?.engineModelType || '16k_zh';
const TENCENT_CLOUD_VOICE_FORMAT = appConfig.tencentCloud?.voiceFormat || 1;

// 语音识别管理器（插件未声明/未授权时降级为不可用）
let speechRecognizerManager = null;
try {
  const plugin = requirePlugin('QCloudAIVoice');
  speechRecognizerManager = plugin.speechRecognizerManager();
} catch (e) {
  console.warn('[paste] QCloudAIVoice 插件未就绪，录音功能不可用', e);
}

function adaptParsedOrdersToOrderArr(items, ctx) {
  if (!Array.isArray(items)) return [];
  return items.map(item => ({
    gbDoGoodsName: item.nxDoGoodsName || '',
    gbDoGoodsNameOriginal: item.nxDoGoodsOriginalName || item.nxDoGoodsName || '',
    gbDoQuantity: item.nxDoQuantity != null ? String(item.nxDoQuantity) : '',
    gbDoStandard: item.nxDoStandard || '斤',
    gbDoRemark: item.nxDoRemark || '',
    gbDoAddRemark: !!item.nxDoAddRemark,
    gbDoStatus: -2,
    gbDoDepartmentId: ctx.depId,
    gbDoDepartmentFatherId: ctx.depFatherId,
    gbDoDistributerId: ctx.disId,
    gbDoOrderUserId: ctx.userId,
    gbDoIsAgent: 1,
    gbDoStandardWarn: item.nxDoStandardWarn || 0,
  })).filter(o => o.gbDoGoodsName && o.gbDoGoodsName.trim());
}

Page({
  data: {
    orderArr: [],
    goodsName: null,
    inputContent: '',
    hasInput: false,
    bottomHeight: 180,
    showOperationLinshi: false,
    hasShownNewGoodsAlert: false,
    pasteDepList: [],
    pasteDepIndex: -1,
    newGoodsCount: 0,
    orderSubmitted: false,
    showOperationPaste: false,
    orderPasteIndex: -1,
    orderItem: null,
    orderArrIndex: -1,
    listScrollHeight: 0,
    listCardMinHeight: 0,
    contentPadding: 40,

    // ===== 语音录音相关 =====
    sentence: '',            // 实时识别文本
    originSentence: '',      // 原始语音/粘贴内容（用于"重新粘贴"恢复）
    isRecording: false,      // 是否录音中
    recognitionStatus: '',   // 识别状态文案
    hasAiRecognized: false,  // 是否已成功解析（用于底部按钮切换为"重新粘贴"）
    silenceTimer: null,      // 静音超时定时器
    lastVoiceTime: 0,        // 最后一次检测到语音的时间
    duration: 0,             // 本次录音时长（秒）
    timer: null,             // 时长计时器
    hasUsedExtraTime: false, // 是否已使用过额外录音时间（本项目后端暂无时长限制，仅作预留）
  },

  onLoad(options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      depFatherId: options.depFatherId,
      depId: options.depId,
      disId: options.disId,
    }, () => {
      this._updateListLayoutHeights();
    });

    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo,
        disId: userInfo.gbDuDistributerId,
        userId: userInfo.gbDepartmentUserId,
      });
    }

    const cachedList = sanitizePasteDepList();
    const existingIndex = cachedList.findIndex(item => String(item.depId) === String(options.depId));
    if (existingIndex >= 0) {
      const entry = cachedList[existingIndex];
      this.setData({
        pasteDepList: cachedList,
        pasteDepIndex: existingIndex,
        orderArr: entry.arr,
        orderSubmitted: !!entry.orderSubmitted,
      }, () => {
        this._updateListLayoutHeights();
      });
      this._updateNewGoodsCount(entry.arr);
    } else {
      this.setData({ pasteDepList: cachedList });
    }

    // 初始化腾讯云语音识别回调
    if (speechRecognizerManager) {
      speechRecognizerManager.OnRecognitionStart = (res) => {
        console.log('开始识别', res);
        this.setData({ recognitionStatus: '识别中...' });
      };

      speechRecognizerManager.OnSentenceBegin = (res) => {
        console.log('一句话开始', res);
      };

      speechRecognizerManager.OnRecognitionResultChange = (res) => {
        console.log('识别变化时', res);
        if (res.result) {
          this.setData({
            sentence: res.result.voice_text_str,
            lastVoiceTime: Date.now(),
          });

          if (this.data.silenceTimer) clearTimeout(this.data.silenceTimer);
          // 静音 6 秒自动停止录音
          const silenceTimer = setTimeout(() => {
            console.log('检测到静音，自动停止录音');
            this.stopRecord();
            wx.showToast({ title: '检测到静音，已停止录音', icon: 'none', duration: 2000 });
          }, 6000);
          this.setData({ silenceTimer });
        }
      };

      speechRecognizerManager.OnSentenceEnd = (res) => {
        console.log('一句话结束', res);
      };

      speechRecognizerManager.OnRecognitionComplete = (res) => {
        console.log('========== 语音识别完成 ==========');
        console.log('识别结束', res);
        if (this.data.silenceTimer) clearTimeout(this.data.silenceTimer);
        this.setData({ recognitionStatus: '识别完成', isRecording: false });

        const recognizedText = this.data.sentence;
        console.log('【语音识别原始文本】:', recognizedText);
        if (!recognizedText || recognizedText.trim() === '') {
          console.log('识别文本为空，跳过');
          return;
        }

        // 直接显示原始识别结果，用户可修改后点"识别订单"
        this.setData({
          inputContent: recognizedText,
          originSentence: recognizedText,
          hasInput: recognizedText.trim().length > 0,
          hasAiRecognized: false,
        }, () => {
          this._updateListLayoutHeights();
        });
      };

      speechRecognizerManager.OnError = (res) => {
        console.log('识别失败', res);
        this.setData({ recognitionStatus: '识别失败', isRecording: false });
      };

      speechRecognizerManager.OnRecorderStop = (res) => {
        console.log('录音结束', res);
        this.setData({ inputContent: this.data.sentence });
      };
    }
  },

  onInput(e) {
    const value = e.detail.value || '';
    this.setData({
      inputContent: value,
      hasInput: value.trim().length > 0,
    }, () => {
      this._updateListLayoutHeights();
    });
  },

  _updateListLayoutHeights() {
    const contentPadding = this.data.contentPadding || 40;
    const navBarHeight = this.data.navBarHeight || 0;
    const windowHeight = this.data.windowHeight || 0;
    const bottomHeight = this.data.bottomHeight || 0;
    const hasBottomBar =
      !this.data.orderSubmitted &&
      (this.data.orderArr.length > 0 || this.data.hasInput);
    const bottomReserve = hasBottomBar ? bottomHeight : 0;
    const listScrollHeight = Math.max(
      windowHeight - navBarHeight - contentPadding - bottomReserve,
      0
    );
    this.setData({ listScrollHeight, listCardMinHeight: listScrollHeight });
  },

  _resetToInputState() {
    this.setData({
      inputContent: '',
      hasInput: false,
      orderArr: [],
      orderSubmitted: false,
      newGoodsCount: 0,
      hasUnsavedOrders: false,
    }, () => {
      this._updateListLayoutHeights();
    });
    this._clearStorageForCurrentDep();
  },

  _afterOrderListChanged(orderArr, orderSubmitted) {
    const submitted = orderSubmitted !== undefined ? orderSubmitted : this.data.orderSubmitted;
    if (submitted && !hasUnmatchedOrders(orderArr)) {
      this._resetToInputState();
      return true;
    }
    this.setData({ orderArr }, () => {
      this._updateListLayoutHeights();
    });
    this._updateNewGoodsCount(orderArr);
    this._saveToStorage(orderArr, submitted);
    return false;
  },

  clearSentence() {
    this._resetToInputState();
  },

  // ===================== 语音录音 =====================

  onHide() {
    if (this.data.isRecording) this.stopRecord();
  },

  onUnload() {
    if (this.data.isRecording) this.stopRecord();
    if (this.data.timer) clearInterval(this.data.timer);
    if (this.data.silenceTimer) clearTimeout(this.data.silenceTimer);
  },

  toggleRecord() {
    if (this.data.isRecording) {
      this.stopRecord();
    } else {
      this.startRecord();
    }
  },

  startRecord() {
    if (!speechRecognizerManager) {
      wx.showToast({ title: '录音插件未配置', icon: 'none' });
      return;
    }

    wx.vibrateShort && wx.vibrateShort();
    const that = this;
    this.setData({
      duration: 0,
      isRecording: true,
      recognitionStatus: '识别中...',
      sentence: this.data.sentence || '',
    });

    const params = {
      secretkey: TENCENT_CLOUD_SECRET_KEY,
      secretid: TENCENT_CLOUD_SECRET_ID,
      appid: TENCENT_CLOUD_APP_ID,
      engine_model_type: TENCENT_CLOUD_ENGINE_MODEL_TYPE,
      voice_format: TENCENT_CLOUD_VOICE_FORMAT,
    };

    if (that.data.timer) clearInterval(that.data.timer);
    that.data.timer = setInterval(() => {
      that.setData({ duration: that.data.duration + 1 });
    }, 1000);

    speechRecognizerManager.start(params);
  },

  stopRecord() {
    const that = this;
    if (that.data.timer) { clearInterval(that.data.timer); that.data.timer = null; }
    if (that.data.silenceTimer) { clearTimeout(that.data.silenceTimer); }
    if (that.data.isRecording) {
      that.setData({ isRecording: false, silenceTimer: null });
    }
    if (speechRecognizerManager) speechRecognizerManager.stop();
  },

  // ===================== 恢复 / 重新粘贴 =====================

  /** 解析后回到原始输入状态，保留 originSentence 供反复修改 */
  againPaste() {
    const originalText = this.data.originSentence || this.data.inputContent || this.data.sentence || '';
    this._resetToInputState();
    this.setData({
      sentence: originalText,
      inputContent: originalText,
      hasInput: originalText.trim().length > 0,
      originSentence: originalText,
      hasAiRecognized: false,
    }, () => {
      this._updateListLayoutHeights();
    });
  },

  /** 彻底清空，回到初始态 */
  backBegin() {
    this._resetToInputState();
    this.setData({
      sentence: '',
      originSentence: '',
      hasAiRecognized: false,
    });
  },

  // ===================== 不合格片段标记 =====================

  /** 解析前移除插入的【】标记 */
  _stripInvalidMarkers(content) {
    if (!content) return '';
    return String(content).replace(/【/g, '').replace(/】/g, '');
  },

  /** 在原文中按不合格片段插入纯文本标记【】 */
  _insertInvalidMarkersInContent(content, invalidSegments) {
    if (!content || !invalidSegments || invalidSegments.length === 0) return content;
    let result = '';
    let remaining = content;
    while (true) {
      let best = { pos: -1, seg: null };
      for (const seg of invalidSegments) {
        if (!seg.segmentText) continue;
        const idx = remaining.indexOf(seg.segmentText);
        if (idx >= 0 && (best.pos < 0 || idx < best.pos)) {
          best = { pos: idx, seg };
        }
      }
      if (best.pos < 0) break;
      result += remaining.slice(0, best.pos);
      result += '【' + best.seg.segmentText + '】';
      remaining = remaining.slice(best.pos + best.seg.segmentText.length);
    }
    result += remaining;
    return result;
  },

  parseOrder() {
    let text = (this.data.inputContent || '').trim();
    if (!text) {
      wx.showToast({ title: '请先输入订单内容', icon: 'none' });
      return;
    }

    // 解析前先移除上次插入的【】修改标记
    text = this._stripInvalidMarkers(text);

    const ctx = {
      depId: this.data.depId,
      depFatherId: this.data.depFatherId,
      disId: this.data.disId,
      userId: this.data.userId,
    };

    const result = parseOrderFromText(text, ctx);
    const orders = result.orders || [];
    const invalidSegments = result.invalidSegments || [];

    // 存在不合格片段：在原文插入【】标记，回显到输入框让用户修改
    if (invalidSegments.length > 0) {
      const contentForHighlight = result.contentForHighlight || text;
      const modifiedContent = this._insertInvalidMarkersInContent(contentForHighlight, invalidSegments);
      this.setData({
        sentence: modifiedContent,
        inputContent: modifiedContent,
        hasInput: true,
      }, () => {
        this._updateListLayoutHeights();
      });
      wx.showToast({ title: '存在格式不合格项，【】标记处请修改', icon: 'none', duration: 2500 });
      return;
    }

    const orderArr = adaptParsedOrdersToOrderArr(orders, ctx);

    if (!orderArr.length) {
      wx.showToast({ title: '未识别到有效商品，请检查输入格式', icon: 'none' });
      return;
    }

    this.setData({ orderArr, orderSubmitted: false, hasAiRecognized: true, originSentence: text }, () => {
      this._updateListLayoutHeights();
    });
    this._updateNewGoodsCount(orderArr);
    this._saveToStorage(orderArr, false);
  },

  editOrder(e) {
    const { type, index } = e.currentTarget.dataset;
    const value = e.detail.value;
    const key = `orderArr[${index}]`;

    if (type === 'name') this.setData({ [`${key}.gbDoGoodsName`]: value });
    if (type === 'quantity') this.setData({ [`${key}.gbDoQuantity`]: value });
    if (type === 'standard') this.setData({ [`${key}.gbDoStandard`]: value });
    if (type === 'remark') {
      this.setData({
        [`${key}.gbDoRemark`]: value,
        [`${key}.gbDoAddRemark`]: value.length > 0,
      });
    }
    this.setData({ orderArrIndex: index });
    this._saveToStorage(this.data.orderArr, false);
  },

  depPasteSearchGoods() {
    if (!this._checkOrderContent()) return;

    load.showLoading('识别商品中');
    depPasteSearchGoods(this.data.orderArr).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        wx.setStorageSync('needRefreshOrderData', true);
        const tempArr = res.result.data || [];
        const unmatchedCount = tempArr.filter(item => Number(item.gbDoStatus) === -2).length;

        if (unmatchedCount === 0) {
          wx.showToast({ title: res.msg || '商品匹配完成', icon: 'none' });
          this._resetToInputState();
          return;
        }

        this.setData({
          orderArr: tempArr,
          orderSubmitted: true,
        }, () => {
          this._updateListLayoutHeights();
        });
        this._updateNewGoodsCount(tempArr);
        this._saveToStorage(tempArr, true);

        wx.showModal({
          title: '部分商品未匹配',
          content: `有 ${unmatchedCount} 个商品未能自动匹配，请逐条核对或点击「查找商品」处理后再提交。`,
          showCancel: false,
        });
      } else {
        wx.showToast({
          title: (res.result && res.result.msg) || '商品匹配失败',
          icon: 'none',
        });
      }
    }).catch(() => {
      load.hideLoading();
    });
  },

  _checkOrderContent() {
    const arr = this.data.orderArr;
    if (!arr || !arr.length) {
      wx.showToast({ title: '订单列表为空', icon: 'none' });
      return false;
    }

    for (let i = 0; i < arr.length; i++) {
      const { gbDoGoodsName, gbDoQuantity, gbDoStandard, gbDoStandardWarn } = arr[i];
      if (!gbDoGoodsName || !gbDoQuantity || !gbDoStandard) {
        wx.showModal({
          title: '提示',
          content: `第 ${i + 1} 条订单内容不完整，请补全商品名、数量和单位`,
          showCancel: false,
        });
        return false;
      }

      if (gbDoStandard.length > 2 && gbDoStandardWarn == 0) {
        wx.showModal({
          title: '单位异常',
          content: `第 ${i + 1} 条「${gbDoGoodsName}」的单位「${gbDoStandard}」过长，请修改后重试`,
          showCancel: false,
        });
        return false;
      }
    }
    return true;
  },

  _updateNewGoodsCount(orders) {
    const arr = orders || this.data.orderArr || [];
    this.setData({
      newGoodsCount: arr.filter(o => Number(o.gbDoStatus) === -2).length,
    });
  },

  _saveToStorage(orders, orderSubmitted) {
    const orderArr = orders || this.data.orderArr;
    const submitted = orderSubmitted !== undefined ? orderSubmitted : this.data.orderSubmitted;
    const pasteDepList = saveOrdersToPasteDepList({
      depId: this.data.depId,
      orderArr: orderArr || [],
      pasteDepList: this.data.pasteDepList,
      orderSubmitted: submitted,
    });
    const pasteDepIndex = pasteDepList.findIndex(
      item => String(item.depId) === String(this.data.depId)
    );
    this.setData({
      pasteDepList,
      pasteDepIndex: pasteDepIndex >= 0 ? pasteDepIndex : -1,
    });
  },

  _clearStorageForCurrentDep() {
    const pasteDepList = removeDepFromPasteDepList(this.data.depId);
    this.setData({ pasteDepList, pasteDepIndex: -1 });
  },

  showPasteOperation(e) {
    this.setData({
      orderPasteIndex: e.currentTarget.dataset.index,
      showOperationPaste: true,
      orderItem: this.data.orderArr[e.currentTarget.dataset.index],
    });
  },

  addRemark() {
    const index = this.data.orderPasteIndex;
    this.setData({
      [`orderArr[${index}].gbDoAddRemark`]: true,
      showOperationPaste: false,
    });
  },

  delOrder() {
    const arr = this.data.orderArr.slice();
    arr.splice(this.data.orderPasteIndex, 1);
    this.setData({ orderArr: arr, showOperationPaste: false }, () => {
      this._updateListLayoutHeights();
    });
    this._afterOrderListChanged(arr);
  },

  hideMask() {
    this.setData({ showOperationPaste: false });
  },

  toBack() {
    const newGoodsCount = this.data.orderArr.filter(o => Number(o.gbDoStatus) === -2).length;
    if (newGoodsCount > 0) {
      wx.showModal({
        title: '提示',
        content: `还有 ${newGoodsCount} 个商品未处理，确定离开吗？`,
        success: (res) => {
          if (res.confirm) {
            this.setData({ hasShownNewGoodsAlert: true });
            wx.navigateBack({ delta: 1 });
          }
        },
      });
      return;
    }
    wx.navigateBack({ delta: 1 });
  },

  openOperationLinshi(e) {
    const index = Number(e.currentTarget.dataset.index);
    const order = e.currentTarget.dataset.order || this.data.orderArr[index];
    this.setData({
      showOperationLinshi: true,
      applyItem: order,
      goodsName: order && order.gbDoGoodsName,
      orderArrIndex: index,
    });
  },

  hideMaskLinshi() {
    this.setData({ showOperationLinshi: false });
  },

  delApplyPaste(e) {
    const index = e && e.currentTarget && e.currentTarget.dataset.index != null
      ? Number(e.currentTarget.dataset.index)
      : Number(this.data.orderArrIndex);

    if (index < 0 || index >= this.data.orderArr.length) {
      this.hideMaskLinshi();
      return;
    }

    const order = this.data.orderArr[index];
    const removeLocal = () => {
      const arr = this.data.orderArr.slice();
      arr.splice(index, 1);
      this.setData({
        orderArr: arr,
        showOperationLinshi: false,
      }, () => {
        this._updateListLayoutHeights();
      });
      this._afterOrderListChanged(arr);
    };

    if (this.data.orderSubmitted && order.gbDepartmentOrdersId) {
      load.showLoading('删除中');
      deleteOrderGb(order.gbDepartmentOrdersId).then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          wx.setStorageSync('needRefreshOrderData', true);
          removeLocal();
        } else {
          wx.showToast({
            title: (res.result && res.result.msg) || '删除失败',
            icon: 'none',
          });
        }
      }).catch(() => {
        load.hideLoading();
      });
      return;
    }

    removeLocal();
  },

  toPasteFromGoods(e) {
    const hasDatasetIndex = e && e.currentTarget && e.currentTarget.dataset.index != null;
    const index = hasDatasetIndex
      ? Number(e.currentTarget.dataset.index)
      : Number(this.data.orderArrIndex);
    const order = (hasDatasetIndex && e.currentTarget.dataset.order)
      || this.data.applyItem
      || this.data.orderArr[index];
    this.setData({
      applyItem: order,
      orderArrIndex: index,
    });
    wx.setStorageSync('applyItem', order);
    wx.setStorageSync('editDepApplyFrom', 'paste');
    this.hideMaskLinshi();
    wx.navigateTo({
      url: '../editDepApplyGoods/editDepApplyGoods?from=paste&orderPasteIndex=' + index,
    });
  },
});
