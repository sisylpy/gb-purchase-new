/**
 * 京采市场 - 订货 Tab
 * 购物车（status=-1）+ 今日正式订货（checkout 后 listTodayLines）
 */
var load = require('../../lib/load');
var pageLayout = require('../../lib/pageLayout');
var platformCart = require('../../utils/platformCart');
var platformCartApi = require('../../services/platformCart');
var platformOrderApi = require('../../services/platformOrder');
var platformBillApi = require('../../services/platformBill');

Page({
  data: {
    activeTab: 'cart',
    loading: false,
    empty: true,
    statusBarHeight: 20,
    scrollTopPadding: 64,
    windowWidth: 375,
    windowHeight: 667,
    /** 购物车 */
    cartLines: [],
    confirmedLines: [],
    pendingPriceLines: [],
    selectedIds: [],
    selectAll: true,
    knownTotal: '0.00',
    pendingPriceItemCount: 0,
    payAmount: '0.00',
    checkoutNotice: '',
    hasPaymentProcessing: false,
    checkoutBlocked: false,
    /** 正式订货（按采购单分组） */
    todayBills: [],
    todayBillCount: 0,
    todayLineCount: 0,
    formalEmpty: true,
    formalLoading: false,
    /** 兼容旧编辑逻辑：当前展开 bill 的明细行 */
    platformLines: [],
    show: false,
    editApply: true,
    applyNumber: '',
    applyStandardName: '',
    applyRemark: '',
    applySubtotal: '',
    canSave: false,
    nxGoods: null,
    editingLine: null,
    editingIndex: -1,
    editingSource: ''
  },

  onLoad: function () {
    pageLayout.applyPlatformTabLayout(this, 'orders', {
      headerKind: 'title'
    });
  },

  onShow: function () {
    pageLayout.applyPlatformTabLayout(this, 'orders', {
      headerKind: 'title'
    });
    var pendingTab = wx.getStorageSync('ordersActiveTab');
    if (pendingTab === 'formal' || pendingTab === 'cart') {
      wx.removeStorageSync('ordersActiveTab');
      this.setData({ activeTab: pendingTab });
    }
    this._refreshAll();
  },

  onTabSwitch: function (e) {
    var tab = e.currentTarget.dataset.tab;
    if (!tab || tab === this.data.activeTab) return;
    this.setData({ activeTab: tab });
    if (tab === 'formal') {
      this._loadFormalOrders();
    } else {
      this._loadCart();
    }
  },

  _refreshAll: function () {
    this._loadCart();
    if (this.data.activeTab === 'formal') {
      this._loadFormalOrders();
    }
  },

  _loadCart: function () {
    var that = this;
    var ctx = platformCart.getBuyerContext();
    this.setData({ loading: true });
    if (!ctx.gbDepartmentId) {
      this.setData({
        loading: false,
        cartLines: [],
        confirmedLines: [],
        pendingPriceLines: [],
        selectedIds: [],
        empty: true,
        knownTotal: '0.00',
        pendingPriceItemCount: 0,
        payAmount: '0.00'
      });
      platformCart.updateTabBadge(0);
      return;
    }

    platformCartApi.listLines().then(function (body) {
      if (!platformCartApi.isOk(body) || !body.data) {
        that.setData({
          loading: false,
          cartLines: [],
          confirmedLines: [],
          pendingPriceLines: [],
          selectedIds: [],
          empty: true
        });
        platformCart.updateTabBadge(0);
        return;
      }
      var rawLines = body.data.lines || [];
      var prevSelected = (that.data.selectedIds || []).filter(function (id) {
        return rawLines.some(function (l) { return l.nxOrderId === id; });
      });
      that._applyCartView(rawLines, prevSelected.length ? prevSelected : null, null);
      that.setData({ loading: false });
      platformCart.updateTabBadge(body.data.lineCount != null ? body.data.lineCount : rawLines.length);
      that._refreshCartSummary();
    }).catch(function (err) {
      console.error('[orders] cart list error', err);
      that.setData({
        loading: false,
        cartLines: [],
        confirmedLines: [],
        pendingPriceLines: [],
        selectedIds: [],
        empty: true
      });
      platformCart.updateTabBadge(0);
    });
  },

  _markSelected: function (lines, selectedIds) {
    return (lines || []).map(function (line) {
      var copy = Object.assign({}, line);
      copy.selected = selectedIds.indexOf(line.nxOrderId) >= 0;
      return copy;
    });
  },

  _isLineCheckoutSelectable: function (line) {
    return line && line.editable !== false && !line.paymentProcessing;
  },

  _filterSelectableIds: function (ids) {
    var that = this;
    return (ids || []).filter(function (id) {
      return that._isLineCheckoutSelectable(that._findCartLine(id));
    });
  },

  _applyCartView: function (rawLines, selectedIds, selectAll) {
    var split = platformCart.splitCartLines(rawLines);
    var formatted = rawLines.map(platformCart.formatCartLine);
    var selectableIds = formatted.filter(this._isLineCheckoutSelectable.bind(this))
      .map(function (l) { return l.nxOrderId; });
    var ids = (selectedIds || []).filter(function (id) {
      return selectableIds.indexOf(id) >= 0;
    });
    if (!ids.length && selectableIds.length) {
      ids = selectableIds.slice();
    }
    var all = selectAll != null
      ? selectAll
      : (ids.length === selectableIds.length && selectableIds.length > 0);
    var hasPaymentProcessing = formatted.some(function (line) {
      return line.paymentProcessing;
    });
    this.setData({
      cartLines: formatted,
      confirmedLines: this._markSelected(split.confirmedLines, ids),
      pendingPriceLines: this._markSelected(split.pendingPriceLines, ids),
      selectedIds: ids,
      selectAll: all,
      empty: rawLines.length === 0,
      hasPaymentProcessing: hasPaymentProcessing,
      checkoutBlocked: ids.length === 0 && hasPaymentProcessing
    });
  },

  _refreshCartSummary: function () {
    var that = this;
    var ids = this.data.selectedIds;
    if (!ids.length) {
      this.setData({
        knownTotal: '0.00',
        pendingPriceItemCount: 0,
        payAmount: '0.00',
        checkoutNotice: ''
      });
      return;
    }
    platformCartApi.checkoutPreview(ids).then(function (body) {
      if (!platformCartApi.isOk(body) || !body.data) {
        that._calcLocalSummary();
        return;
      }
      var data = body.data;
      var ids = that.data.selectedIds;
      that.setData({
        confirmedLines: that._markSelected(
          (data.confirmedLines || []).map(platformCart.formatCartLine),
          ids
        ),
        pendingPriceLines: that._markSelected(
          (data.pendingPriceLines || []).map(platformCart.formatCartLine),
          ids
        ),
        knownTotal: data.knownTotal || '0.00',
        pendingPriceItemCount: data.pendingPriceItemCount || 0,
        payAmount: data.payAmount || data.knownTotal || '0.00',
        checkoutNotice: data.notice || '部分商品需称重确认，后续可能产生补款'
      });
    }).catch(function () {
      that._calcLocalSummary();
    });
  },

  _calcLocalSummary: function () {
    var ids = this.data.selectedIds;
    var known = 0;
    var pending = 0;
    this.data.cartLines.forEach(function (line) {
      if (ids.indexOf(line.nxOrderId) < 0) return;
      if (line.priceConfirmStatus === 'CONFIRMED' && line.lineSubtotal) {
        known += Number(line.lineSubtotal);
      } else {
        pending += 1;
      }
    });
    this.setData({
      knownTotal: known.toFixed(2),
      pendingPriceItemCount: pending,
      payAmount: known.toFixed(2),
      checkoutNotice: pending > 0 ? '部分商品需称重确认，后续可能产生补款' : ''
    });
  },

  _loadFormalOrders: function () {
    this._loadTodayBills();
  },

  _loadTodayBills: function () {
    var that = this;
    var ctx = platformCart.getBuyerContext();
    if (!ctx.gbDepartmentId) {
      this.setData({
        todayBills: [],
        todayBillCount: 0,
        todayLineCount: 0,
        formalEmpty: true,
        platformLines: []
      });
      return;
    }
    this.setData({ formalLoading: true });
    platformBillApi.listBills().then(function (body) {
      if (!platformBillApi.isOk(body) || !body.data) {
        that.setData({
          formalLoading: false,
          todayBills: [],
          todayBillCount: 0,
          todayLineCount: 0,
          formalEmpty: true,
          platformLines: []
        });
        return;
      }
      var data = body.data;
      var bills = (data.bills || []).map(function (bill) {
        return Object.assign({}, bill, {
          expanded: false,
          detailLines: [],
          detailLoading: false
        });
      });
      that.setData({
        formalLoading: false,
        todayBills: bills,
        todayBillCount: data.billCount != null ? data.billCount : bills.length,
        todayLineCount: data.totalLineCount != null ? data.totalLineCount : 0,
        formalEmpty: bills.length === 0,
        platformLines: []
      });
    }).catch(function () {
      that.setData({
        formalLoading: false,
        todayBills: [],
        todayBillCount: 0,
        todayLineCount: 0,
        formalEmpty: true,
        platformLines: []
      });
    });
  },

  onToggleBillExpand: function (e) {
    var billId = Number(e.currentTarget.dataset.billId);
    var index = Number(e.currentTarget.dataset.index);
    var bills = (this.data.todayBills || []).slice();
    var bill = bills[index];
    if (!bill || bill.billId !== billId) return;
    var nextExpanded = !bill.expanded;
    bill.expanded = nextExpanded;
    this.setData({ todayBills: bills });
    if (nextExpanded && (!bill.detailLines || !bill.detailLines.length)) {
      this._loadBillDetail(index, billId);
    }
  },

  _loadBillDetail: function (index, billId) {
    var that = this;
    var bills = (this.data.todayBills || []).slice();
    var bill = bills[index];
    if (!bill) return;
    bill.detailLoading = true;
    this.setData({ todayBills: bills });
    platformBillApi.billDetail(billId).then(function (body) {
      bills = (that.data.todayBills || []).slice();
      bill = bills[index];
      if (!bill || bill.billId !== billId) return;
      bill.detailLoading = false;
      if (platformBillApi.isOk(body) && body.data) {
        bill.detailLines = body.data.lines || [];
      } else {
        bill.detailLines = bill.linesPreview || [];
      }
      that.setData({ todayBills: bills });
    }).catch(function () {
      bills = (that.data.todayBills || []).slice();
      bill = bills[index];
      if (!bill) return;
      bill.detailLoading = false;
      bill.detailLines = bill.linesPreview || [];
      that.setData({ todayBills: bills });
    });
  },

  onGoBillPending: function (e) {
    var billId = Number(e.currentTarget.dataset.billId);
    if (!billId) return;
    wx.navigateTo({ url: '/pages/billPending/billPending?from=orders&billId=' + billId });
  },

  _findBillLine: function (orderId) {
    var found = null;
    (this.data.todayBills || []).forEach(function (bill) {
      (bill.detailLines || []).forEach(function (line) {
        if (line.orderId === orderId) found = line;
      });
    });
    return found;
  },

  onToggleSelectAll: function () {
    var selectable = this.data.cartLines.filter(this._isLineCheckoutSelectable.bind(this));
    var selectAll = !this.data.selectAll;
    var ids = selectAll ? selectable.map(function (l) { return l.nxOrderId; }) : [];
    this.setData({
      selectAll: selectAll,
      selectedIds: ids,
      confirmedLines: this._markSelected(this.data.confirmedLines, ids),
      pendingPriceLines: this._markSelected(this.data.pendingPriceLines, ids)
    });
    this._refreshCartSummary();
  },

  onToggleLine: function (e) {
    var id = Number(e.currentTarget.dataset.id);
    var line = this._findCartLine(id);
    if (line && (line.paymentProcessing || line.editable === false)) {
      wx.showToast({ title: line.paymentProcessingMessage || '支付处理中', icon: 'none' });
      return;
    }
    var ids = this.data.selectedIds.slice();
    var idx = ids.indexOf(id);
    if (idx >= 0) {
      ids.splice(idx, 1);
    } else {
      ids.push(id);
    }
    var all = ids.length === this.data.cartLines.filter(this._isLineCheckoutSelectable.bind(this)).length
      && ids.length > 0;
    this.setData({
      selectedIds: ids,
      selectAll: all,
      confirmedLines: this._markSelected(this.data.confirmedLines, ids),
      pendingPriceLines: this._markSelected(this.data.pendingPriceLines, ids)
    });
    this._refreshCartSummary();
  },

  onGoCheckout: function () {
    var ids = this._filterSelectableIds(this.data.selectedIds);
    if (!ids.length) {
      if (this.data.hasPaymentProcessing) {
        wx.showToast({ title: '部分商品支付处理中，请稍候', icon: 'none' });
      } else {
        wx.showToast({ title: '请选择要结算的商品', icon: 'none' });
      }
      return;
    }
    wx.navigateTo({
      url: '/pages/checkout/checkout?orderIds=' + encodeURIComponent(JSON.stringify(ids))
    });
  },

  onCallSupplier: function (e) {
    var phone = e.currentTarget.dataset.phone;
    if (!phone) return;
    wx.makePhoneCall({ phoneNumber: String(phone).replace(/\s/g, '') });
  },

  onCartLineMenu: function (e) {
    var id = Number(e.currentTarget.dataset.id);
    var line = this._findCartLine(id);
    if (!line) return;
    if (line.paymentProcessing || line.editable === false) {
      wx.showToast({ title: line.paymentProcessingMessage || '支付处理中', icon: 'none' });
      return;
    }
    var that = this;
    wx.showActionSheet({
      itemList: ['修改数量', '删除'],
      success: function (res) {
        if (res.tapIndex === 0) {
          that.onEditCartLine({ currentTarget: { dataset: { id: id } } });
        } else if (res.tapIndex === 1) {
          that.onDeleteCartLine({ currentTarget: { dataset: { id: id } } });
        }
      }
    });
  },

  onEditCartLine: function (e) {
    var id = Number(e.currentTarget.dataset.id);
    var line = this._findCartLine(id);
    if (!line) return;
    if (line.paymentProcessing || line.editable === false) {
      wx.showToast({ title: line.paymentProcessingMessage || '支付处理中', icon: 'none' });
      return;
    }
    this.setData({
      show: true,
      editApply: true,
      editingSource: 'cart',
      editingLine: line,
      editingIndex: -1,
      applyNumber: line.quantity,
      applyStandardName: line.standard,
      applyRemark: '',
      canSave: true,
      nxGoods: {
        nxGoodsId: line.nxGoodsId,
        nxGoodsName: line.goodsName,
        nxGoodsStandardname: line.standard,
        nxGoodsBrand: '',
        nxGoodsStandardWeight: '',
        nxAliasEntities: [],
        nxGoodsStandardEntities: [{ nxStandardName: line.standard }]
      }
    });
  },

  onDeleteCartLine: function (e) {
    var id = Number(e.currentTarget.dataset.id);
    var line = this._findCartLine(id);
    if (!line) return;
    var that = this;
    wx.showModal({
      title: '删除商品',
      content: '确定从购物车删除「' + line.goodsName + '」？',
      success: function (res) {
        if (res.confirm) that._deleteCartLine(line);
      }
    });
  },

  _findCartLine: function (nxOrderId) {
    var found = null;
    this.data.cartLines.forEach(function (line) {
      if (line.nxOrderId === nxOrderId) found = line;
    });
    return found;
  },

  _deleteCartLine: function (line) {
    var that = this;
    platformCartApi.deleteLine(line.nxOrderId).then(function (body) {
      if (!platformCartApi.isOk(body)) {
        wx.showToast({ title: (body && body.msg) || '删除失败', icon: 'none' });
        return;
      }
      wx.showToast({ title: '已删除', icon: 'success' });
      that._loadCart();
    }).catch(function () {
      wx.showToast({ title: '删除失败', icon: 'none' });
    });
  },

  _updateCartLine: function (line, quantity, standard, remark, onSuccess) {
    var that = this;
    platformCartApi.updateLine(line.nxOrderId, {
      quantity: quantity,
      standard: standard,
      remark: remark
    }).then(function (body) {
      if (!platformCartApi.isOk(body)) {
        wx.showToast({ title: (body && body.msg) || '保存失败', icon: 'none' });
        return;
      }
      if (typeof onSuccess === 'function') onSuccess(body.data);
      that._loadCart();
      wx.showToast({ title: '已保存', icon: 'success' });
    }).catch(function () {
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  },

  onEditBillLine: function (e) {
    var orderId = Number(e.currentTarget.dataset.orderId);
    var line = this._findBillLine(orderId);
    if (!line || !line.editable) {
      if (line && !line.editable) {
        wx.showToast({ title: '已匹配配送商，不可修改', icon: 'none' });
      }
      return;
    }
    this.setData({
      show: true,
      editApply: true,
      editingSource: 'formal',
      editingLine: line,
      editingIndex: -1,
      applyNumber: line.quantity,
      applyStandardName: line.standard,
      applyRemark: line.remark || '',
      canSave: true,
      nxGoods: {
        nxGoodsId: line.nxGoodsId,
        nxGoodsName: line.goodsName,
        nxGoodsStandardname: line.standard,
        nxGoodsBrand: '',
        nxGoodsStandardWeight: '',
        nxAliasEntities: [],
        nxGoodsStandardEntities: []
      }
    });
  },

  onEditPlatformLine: function (e) {
    var idx = Number(e.currentTarget.dataset.index);
    var line = this.data.platformLines[idx];
    if (!line || !line.editable) {
      if (line && !line.editable) {
        wx.showToast({ title: '已匹配配送商，不可修改', icon: 'none' });
      }
      return;
    }
    this.setData({
      show: true,
      editApply: true,
      editingSource: 'formal',
      editingLine: line,
      editingIndex: idx,
      applyNumber: line.quantity,
      applyStandardName: line.standard,
      applyRemark: line.remark || '',
      canSave: true,
      nxGoods: {
        nxGoodsId: line.nxGoodsId,
        nxGoodsName: line.goodsName,
        nxGoodsStandardname: line.standard,
        nxGoodsBrand: '',
        nxGoodsStandardWeight: '',
        nxAliasEntities: [],
        nxGoodsStandardEntities: []
      }
    });
  },

  _savePlatformLine: function (line, quantity, standard, remark, onSuccess) {
    var that = this;
    load.showLoading('保存中');
    platformOrderApi.updateLine(line.orderId, {
      quantity: quantity,
      standard: standard,
      remark: remark
    }).then(function (res) {
      load.hideLoading();
      var body = platformOrderApi.parseBody(res);
      if (!platformOrderApi.isOk(body)) {
        wx.showToast({ title: (body && body.msg) || '保存失败', icon: 'none' });
        return;
      }
      if (typeof onSuccess === 'function') onSuccess(body.data);
      that._loadTodayBills();
      wx.showToast({ title: '已保存', icon: 'success' });
    }).catch(function () {
      load.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  },

  _deletePlatformLine: function (line) {
    var that = this;
    load.showLoading('删除中');
    platformOrderApi.deleteLineCustomer(line.orderId).then(function (res) {
      load.hideLoading();
      var body = platformOrderApi.parseBody(res);
      if (!platformOrderApi.isOk(body)) {
        wx.showToast({ title: (body && body.msg) || '删除失败', icon: 'none' });
        return;
      }
      that.setData({ show: false, editingLine: null, nxGoods: null });
      that._loadTodayBills();
      wx.showToast({ title: '已删除', icon: 'success' });
    }).catch(function () {
      load.hideLoading();
      wx.showToast({ title: '删除失败', icon: 'none' });
    });
  },

  confirm: function (e) {
    var detail = e.detail || {};
    var line = this.data.editingLine;
    if (!line || !detail.applyNumber) {
      wx.showToast({ title: '请输入数量', icon: 'none' });
      return;
    }
    var that = this;
    if (this.data.editingSource === 'cart') {
      this._updateCartLine(
        line,
        detail.applyNumber,
        detail.applyStandardName || line.standard,
        detail.applyRemark || '',
        function () {
          that.setData({ show: false, editingLine: null, editingSource: '', nxGoods: null });
        }
      );
      return;
    }
    this._savePlatformLine(
      line,
      detail.applyNumber,
      detail.applyStandardName || line.standard,
      detail.applyRemark || '',
      function () {
        that.setData({ show: false, editingLine: null, nxGoods: null });
      }
    );
  },

  cancle: function () {
    this.setData({ show: false, editingLine: null, editingSource: '', nxGoods: null });
  },

  delApply: function () {
    var line = this.data.editingLine;
    if (!line) return;
    if (this.data.editingSource === 'cart') {
      this._confirmDeleteCartLine(line);
      return;
    }
    this._confirmDeletePlatformLine(line);
  },

  _confirmDeleteCartLine: function (line) {
    var that = this;
    wx.showModal({
      title: '删除商品',
      content: '确定从购物车删除「' + line.goodsName + '」？',
      success: function (res) {
        if (res.confirm) {
          that.setData({ show: false, editingLine: null, editingSource: '', nxGoods: null });
          that._deleteCartLine(line);
        }
      }
    });
  },

  _confirmDeletePlatformLine: function (line) {
    var that = this;
    wx.showModal({
      title: '删除订货',
      content: '确定删除「' + line.goodsName + '」？',
      success: function (res) {
        if (res.confirm) that._deletePlatformLine(line);
      }
    });
  },

  changeStandard: function (e) {
    this.setData({
      applyStandardName: e.detail.applyStandardName,
      canSave: true
    });
  },

  goCategory: function () {
    wx.switchTab({ url: '/pages/categoryGoods/categoryGoods' });
  },

  goShop: function () {
    wx.switchTab({ url: '/pages/home/home' });
  }
});
