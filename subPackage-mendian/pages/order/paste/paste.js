import load from '../../../../lib/load';
const { depPasteSearchGoods, deleteOrderGb } = require('../../../../services/depOrder');
import { parseOrderFromText } from '../../../../lib/orderParser';
import pasteDepListCache from '../../../../lib/pasteDepListCache';

const { saveOrdersToPasteDepList, removeDepFromPasteDepList, filterDraftOrders, sanitizePasteDepList } = pasteDepListCache;
const globalData = getApp().globalData;

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
    todayCount: null,
    goodsName: null,
    inputContent: '',
    bottomHeight: 180,
    showOperationLinshi: false,
    hasShownNewGoodsAlert: false,
    pasteDepList: [],
    pasteDepIndex: -1,
    newGoodsCount: 0,
    saveCount: null,
    showOperationPaste: false,
    orderPasteIndex: -1,
    orderItem: null,
    orderArrIndex: -1,
  },

  onLoad(options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      depFatherId: options.depFatherId,
      depId: options.depId,
      disId: options.disId,
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
      const cachedOrders = filterDraftOrders(cachedList[existingIndex].arr);
      if (cachedOrders.length > 0) {
        this.setData({
          pasteDepList: cachedList,
          pasteDepIndex: existingIndex,
          orderArr: cachedOrders,
          saveCount: null,
        });
        this._updateNewGoodsCount(cachedOrders);
        this._updateHasUnsavedOrders(cachedOrders);
      } else {
        this.setData({ pasteDepList: cachedList });
      }
    } else {
      this.setData({ pasteDepList: cachedList });
    }
  },

  onInput(e) {
    this.setData({ inputContent: e.detail.value });
  },

  clearSentence() {
    this.setData({
      inputContent: '',
      orderArr: [],
      saveCount: null,
      newGoodsCount: 0,
      hasUnsavedOrders: false,
    });
    this._clearStorageForCurrentDep();
  },

  parseOrder() {
    const text = (this.data.inputContent || '').trim();
    if (!text) {
      wx.showToast({ title: '请先输入订单内容', icon: 'none' });
      return;
    }

    const ctx = {
      depId: this.data.depId,
      depFatherId: this.data.depFatherId,
      disId: this.data.disId,
      userId: this.data.userId,
    };

    const { orders, invalidSegments } = parseOrderFromText(text, ctx);
    const orderArr = adaptParsedOrdersToOrderArr(orders, ctx);

    if (!orderArr.length) {
      wx.showToast({ title: '未识别到有效商品，请检查输入格式', icon: 'none' });
      return;
    }

    this.setData({ orderArr, saveCount: null });
    this._updateHasUnsavedOrders(orderArr);
    this._updateNewGoodsCount(orderArr);
    this._saveToStorage(orderArr);

    if (invalidSegments && invalidSegments.length > 0) {
      wx.showModal({
        title: '部分条目需核对',
        content: `已解析 ${orderArr.length} 条，有 ${invalidSegments.length} 处数量或单位可能异常，请在下方订单卡片中修改后再匹配商品。`,
        showCancel: false,
      });
    }
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
    this._saveToStorage(this.data.orderArr);
  },

  depPasteSearchGoods() {
    if (!this._checkOrderContent()) return;

    load.showLoading('识别商品中');
    depPasteSearchGoods(this.data.orderArr).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        wx.setStorageSync('needRefreshOrderData', true);
        const tempArr = res.result.data || [];
        const unmatchedCount = tempArr.filter(item => item.gbDoStatus === -2).length;
        const savedCount = tempArr.filter(item => item.gbDoStatus !== -2).length;

        this.setData({
          todayCount: this.data.orderArr.length,
          saveCount: savedCount,
          orderArr: tempArr,
        });
        this._updateNewGoodsCount(tempArr);
        this._saveToStorage(tempArr);

        if (unmatchedCount > 0) {
          wx.showModal({
            title: '部分商品未匹配',
            content: `有 ${unmatchedCount} 个商品未能自动匹配，请逐条核对或点击「查找商品」处理后再提交。`,
            showCancel: false,
          });
        } else {
          wx.showToast({ title: res.msg || '商品匹配完成', icon: 'none' });
        }
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

  _updateHasUnsavedOrders(orders) {
    const arr = orders || this.data.orderArr || [];
    this.setData({ hasUnsavedOrders: arr.some(o => o.gbDoStatus === -2) });
  },

  _updateNewGoodsCount(orders) {
    const arr = orders || this.data.orderArr || [];
    this.setData({
      newGoodsCount: arr.filter(o => o.gbDoStatus === -2).length,
    });
  },

  _saveToStorage(orders) {
    const orderArr = orders || this.data.orderArr;
    const pasteDepList = saveOrdersToPasteDepList({
      depId: this.data.depId,
      orderArr: orderArr || [],
      pasteDepList: this.data.pasteDepList,
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
    this.setData({ orderArr: arr, showOperationPaste: false });
    this._updateNewGoodsCount(arr);
    this._saveToStorage(arr);
  },

  hideMask() {
    this.setData({ showOperationPaste: false });
  },

  toBack() {
    const newGoodsCount = this.data.orderArr.filter(o => o.gbDoStatus === -2).length;
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
    const index = e.currentTarget.dataset.index;
    this.setData({
      showOperationLinshi: true,
      applyItem: e.currentTarget.dataset.order,
      goodsName: e.currentTarget.dataset.name,
      orderArrIndex: index,
      orderPasteIndex: index,
    });
  },

  hideMaskLinshi() {
    this.setData({ showOperationLinshi: false });
  },

  delApplyPaste() {
    const index = this.data.orderArrIndex;
    if (index < 0) {
      this.hideMaskLinshi();
      return;
    }

    const applyItem = (this.data.orderArr[index] || this.data.applyItem);
    const removeFromList = () => {
      const arr = this.data.orderArr.slice();
      arr.splice(index, 1);
      const savedCount = arr.filter(item => item.gbDoStatus !== -2).length;
      const updates = {
        orderArr: arr,
        showOperationLinshi: false,
        saveCount: arr.length === 0 ? null : (savedCount > 0 ? savedCount : this.data.saveCount),
      };
      this.setData(updates);
      this._updateNewGoodsCount(arr);
      this._updateHasUnsavedOrders(arr);
      this._saveToStorage(arr);
      wx.setStorageSync('needRefreshOrderData', true);
    };

    const orderId = applyItem && applyItem.gbDepartmentOrdersId;
    if (orderId) {
      load.showLoading('删除中');
      deleteOrderGb(orderId).then(res => {
        load.hideLoading();
        if (res.result.code != 0) {
          wx.showToast({ title: res.result.msg || '删除失败', icon: 'none' });
          return;
        }
        removeFromList();
      }).catch(() => {
        load.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
      });
      return;
    }

    removeFromList();
  },

  toPasteFromGoods(e) {
    const index = e.currentTarget.dataset.index != null
      ? e.currentTarget.dataset.index
      : this.data.orderArrIndex;
    const order = e.currentTarget.dataset.order || (this.data.orderArr[index]);
    this.setData({
      applyItem: order,
      goodsName: order && order.gbDoGoodsName,
      orderArrIndex: index,
      orderPasteIndex: index,
    });
    wx.setStorageSync('applyItem', order);
    this.hideMaskLinshi();
    wx.navigateTo({
      url: '../editDepApplyGoods/editDepApplyGoods?from=paste&orderPasteIndex=' + index,
    });
  },
});
