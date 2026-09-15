var goodsApi = require('../../services/api.js');
var load = require('../../../lib/load.js');
var dateUtils = require('../../../lib/dateUtil.js');
var config = require('../../../config/index.js');

const globalData = getApp().globalData;

Page({

  data: {
    showEdit: false,
    canSave: true,
    showOperation: false,
    showChoice: false,
    showFresh: false,
    showAdd: false,
    showAddAlias: false,
    editStandard: false,
    editAlias: false,
    showStorePicker: false,
    selectedStoreName: '',
    storeList: [],
    depConfigChanged: false,
    standardName: '',
    standardScale: '-1',
    depGoodsName: '',
    depGoodsId: '',
    canStoreProxyPurchase: false,
    items: [
      { name: '1', value: '自采' },
      { name: '21', value: '自动订货' }
    ],
    baseTypeItems: [
      { name: '1', value: '门店自采' },
      { name: '6', value: '门店代采' },
      { name: '2', value: '集采' },
      { name: '21', value: '自动订货' },
      { name: '3', value: '库房' },
      { name: '4', value: '中央厨房' },
      { name: '5', value: '配送' }
    ]
  },

  onShow() {
    let windowInfo = wx.getWindowInfo();
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
    });
    this._getDepGoodsDetail();
  },

  onLoad(options) {
    this.setData({
      depGoodsId: options.depGoodsId,
      updateTime: dateUtils.getDateTimeString(),
    });

     var mendianInfo = wx.getStorageSync('mendianInfo');
    if (mendianInfo) {
      this.setData({
        mendianInfo: mendianInfo,
        depFatherId: mendianInfo.gbDepartmentId
      })
    }

    
    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({ userInfo: userInfo });
    }

    var disInfo = wx.getStorageSync('disInfo');
    if (disInfo) {
      this.setData({ disInfo: disInfo });
      this._refreshDepTypeItems();
    }

    var mendianInfo = wx.getStorageSync('mendianInfo');
    if (mendianInfo) {
      this.setData({
        mendianInfo: mendianInfo,
        gbDepId: mendianInfo.gbDepartmentId
      });
    }
  },

  _normalizeDepGoodsPackFields(depGoods) {
    if (!depGoods) {
      return depGoods;
    }
    var dis = depGoods.gbDistributerGoodsEntity;
    if (!dis) {
      return depGoods;
    }
    if (!this._hasText(depGoods.gbDgGoodsStandardWeight) && this._hasText(dis.gbDgGoodsStandardWeight)) {
      depGoods.gbDgGoodsStandardWeight = dis.gbDgGoodsStandardWeight;
    }
    if (!this._hasText(depGoods.gbDgCartonUnit) && this._hasText(dis.gbDgCartonUnit)) {
      depGoods.gbDgCartonUnit = dis.gbDgCartonUnit;
    }
    if (!this._hasText(depGoods.gbDgItemsPerCarton) && this._hasText(dis.gbDgItemsPerCarton)) {
      depGoods.gbDgItemsPerCarton = dis.gbDgItemsPerCarton;
    }
    return depGoods;
  },

  _getDepGoodsDetail() {
    load.showLoading('获取商品信息');
    goodsApi.getDepGoodsDetail(this.data.depGoodsId).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        var depGoods = this._normalizeDepGoodsPackFields(res.result.data);
        var goods = depGoods.gbDistributerGoodsEntity || {};
        var selectedStoreName = depGoods.gbDdgGoodsType == 6 ? (depGoods.gbDdgGbDepartmentName || '') : '';
        this.setData({
          depGoods: depGoods,
          goods: goods,
          selectedStoreName: selectedStoreName,
        });
        this._computeStoreInfo();
      } else {
        wx.showToast({ title: res.result.msg, icon: 'none' });
      }
    }).catch(() => {
      load.hideLoading();
      wx.showToast({ title: '获取商品信息失败', icon: 'none' });
    });
  },

  _hasText(value) {
    return value !== null && value !== undefined && value !== '' && value !== 'null';
  },

  // ========== 编辑模式切换 ==========
  toggleEdit() {
    this.setData({ showEdit: !this.data.showEdit });
  },

  // ========== 输入框变更 ==========
  getComGoodsContent(e) {
    var type = e.currentTarget.dataset.type;
    var fieldMap = {
      '0': 'goods.gbDgGoodsName',
      '1': 'goods.gbDgGoodsStandardname',
      '2': 'goods.gbDgGoodsStandardWeight',
      '3': 'goods.gbDgGoodsBrand',
      '4': 'goods.gbDgGoodsPlace',
      '5': 'goods.gbDgGoodsDetail',
      '7': 'goods.gbDgCartonUnit',
      '8': 'goods.gbDgItemsPerCarton',
    };
    var key = fieldMap[type];
    if (key) {
      this.setData({ [key]: e.detail.value });
    }
    this._ifCanSave();
  },

  radioChange(e) {
    var type = e.detail.value;
    this.setData({ 'goods.gbDgGoodsType': type });
    this._ifCanSave();
  },

  /** 部门采购方式变更 */
  radioDepTypeChange(e) {
    var type = e.detail.value;
    this.setData({ 'depGoods.gbDdgGoodsType': type, depConfigChanged: true });
  },

  _ifCanSave() {
    var name = this.data.goods.gbDgGoodsName;
    var standard = this.data.goods.gbDgGoodsStandardname;
    var canSave = name && name.length > 0 && standard && standard.length > 0;
    this.setData({ canSave: canSave });
  },

  // ========== 保存商品 ==========
  updateComGoods() {
    if (!this.data.canSave) {
      wx.showToast({ title: '请检查必填内容', icon: 'none' });
      return;
    }
    var goods = this.data.goods;
    load.showLoading('保存商品');
    goodsApi.disUpdateDisGoodsGb(goods).then(res => {
      if (res.result.code == 0) {
        // 批发商商品保存成功后，同步更新部门商品
        this._saveDepGoods();
      } else {
        load.hideLoading();
        wx.showToast({ title: res.result.msg, icon: 'none' });
      }
    }).catch(() => {
      load.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  },

  /** 保存部门商品实体 */
  _saveDepGoods() {
    var depGoods = this.data.depGoods;
    if (!depGoods || !depGoods.gbDepartmentDisGoodsId) {
      load.hideLoading();
      wx.showToast({ title: '修改成功' });
      this.setData({ showEdit: false });
      this._getDepGoodsDetail();
      return;
    }
    goodsApi.updateDepGoods(depGoods).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        this.setData({ depGoods: res.result.data });
        wx.showToast({ title: '修改成功' });
        this.setData({ showEdit: false });
        this._getDepGoodsDetail();
      } else {
        wx.showToast({ title: res.result.msg, icon: 'none' });
      }
    }).catch(() => {
      load.hideLoading();
      wx.showToast({ title: '部门商品保存失败', icon: 'none' });
    });
  },

  // ========== 停止订货（批发商级） ==========
  switchChange(e) {
    var val = e.detail.value ? '1' : '0';
    this.setData({ 'goods.gbDgPullOff': val });
    this._updateGoodsPullOff();
  },

  _updateGoodsPullOff() {
    goodsApi.updateGbGoodsPullOff(this.data.goods).then(res => {
      if (res.result.code == 0) {
        this.setData({ goods: res.result.data });
      } else {
        wx.showToast({ title: res.result.msg, icon: 'none' });
      }
    });
  },

  // ========== 停止订货（部门级） ==========
  switchDepPullOff(e) {
    var val = e.detail.value ? 1 : 0;
    this.setData({ 'depGoods.gbDdgDepGoodsPullOff': val });
    load.showLoading('保存部门停止订货');
    goodsApi.updateDepGoods(this.data.depGoods).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        this.setData({ depGoods: res.result.data });
        wx.showToast({ title: '修改成功' });
      } else {
        wx.showToast({ title: res.result.msg, icon: 'none' });
        // 回滚
        this.setData({ 'depGoods.gbDdgDepGoodsPullOff': val == 1 ? 0 : 1 });
      }
    }).catch(() => {
      load.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
      this.setData({ 'depGoods.gbDdgDepGoodsPullOff': val == 1 ? 0 : 1 });
    });
  },

  _updateGoods() {
    load.showLoading('修改商品');
    goodsApi.updateGbGoods(this.data.goods).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        wx.showToast({ title: '修改成功' });
        this.setData({ showOperation: false, showFresh: false, goods: res.result.data });
        this._getDepGoodsDetail();
      } else {
        wx.showToast({ title: res.result.msg, icon: 'none' });
      }
    }).catch(() => {
      load.hideLoading();
    });
  },

  // ========== 订货单位 ==========
  addStandard() {
    this.setData({
      showAdd: true,
      depGoodsName: this.data.goods.gbDgGoodsName,
      standardName: '',
      standardScale: '-1',
      editStandard: false,
    });
  },

  getFocus(e) {
    var height = (globalData.windowHeight - e.detail.keyboardHeight) * globalData.rpxR;
    this.setData({ modalContentHeight: height });
  },

  clickItem(e) {
    this.setData({ depGoodsName: this.data.goods.gbDgGoodsName });
    if (e.currentTarget.dataset.type === 'standard') {
      this.setData({
        showOperation: true,
        showChoice: true,
        choiceType: 'standard',
        indexStandand: e.currentTarget.dataset.index,
        itemStandard: e.currentTarget.dataset.itemstandard,
        standardName: e.currentTarget.dataset.itemstandard.gbDsStandardName,
        standardScale: e.currentTarget.dataset.itemstandard.gbDsStandardScale,
      });
    }
    if (e.currentTarget.dataset.type === 'alias') {
      this.setData({
        showOperation: true,
        showChoice: true,
        choiceType: 'alias',
        indexAlias: e.currentTarget.dataset.index,
        itemAlias: e.currentTarget.dataset.itemalias,
      });
    }
  },

  edit() {
    if (this.data.choiceType === 'standard') {
      this.setData({ showAdd: true, editStandard: true, showChoice: false, showOperation: false });
    }
    if (this.data.choiceType === 'alias') {
      this.setData({ editAlias: true, showAddAlias: true, showChoice: false, showOperation: false });
    }
  },

  delete() {
    if (this.data.choiceType === 'standard') {
      var id = this.data.itemStandard.gbDistributerStandardId;
      goodsApi.gbDisDeleteStandard(id).then(res => {
        if (res.result.code == 0) {
          var arr = this.data.goods.gbDistributerStandardEntities.slice();
          arr.splice(this.data.indexStandand, 1);
          this.setData({ 'goods.gbDistributerStandardEntities': arr, showOperation: false, showChoice: false });
        } else {
          wx.showToast({ title: res.result.msg, icon: 'none' });
        }
      });
    }
    if (this.data.choiceType === 'alias') {
      var id = this.data.itemAlias.gbDistributerAliasId;
      goodsApi.disDeleteAlias(id).then(res => {
        if (res.result.code == 0) {
          var arr = this.data.goods.gbDistributerAliasEntities.slice();
          arr.splice(this.data.indexAlias, 1);
          this.setData({ 'goods.gbDistributerAliasEntities': arr, showOperation: false, showChoice: false });
        } else {
          wx.showToast({ title: res.result.msg, icon: 'none' });
        }
      });
    }
  },

  confirmStandard(e) {
    if (this.data.editStandard) {
      this._updateStandard(e);
    } else {
      this._saveStandard(e);
    }
    this.setData({ standardName: '', depGoodsName: '', itemStandard: '', editStandard: false, showChoice: false });
  },

  _saveStandard(e) {
    var data = {
      gbDsDisGoodsId: this.data.goods.gbDistributerGoodsId,
      gbDsStandardName: e.detail.standardName,
      gbDsStandardScale: e.detail.standardScale,
    };
    load.showLoading('保存商品规格');
    goodsApi.gbDisSaveStandard(data).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        var arr = (this.data.goods.gbDistributerStandardEntities || []).slice();
        arr.push(res.result.data);
        this.setData({ 'goods.gbDistributerStandardEntities': arr });
      } else {
        wx.showToast({ title: res.result.msg, icon: 'none' });
      }
    });
  },

  _updateStandard(e) {
    var data = {
      gbDistributerStandardId: this.data.itemStandard.gbDistributerStandardId,
      gbDsStandardName: e.detail.standardName,
      gbDsStandardScale: e.detail.standardScale,
    };
    load.showLoading('修改商品规格');
    goodsApi.gbDisUpdateStandard(data).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        var key = 'goods.gbDistributerStandardEntities[' + this.data.indexStandand + ']';
        this.setData({ [key]: data });
      } else {
        wx.showToast({ title: res.result.msg, icon: 'none' });
      }
    });
  },

  // ========== 别名 ==========
  addAlias() {
    this.setData({ editAlias: false, showAddAlias: true, depGoodsName: this.data.goods.gbDgGoodsName });
  },

  confirmAlias(e) {
    if (this.data.editAlias) {
      this._updateAlias(e);
    } else {
      this._saveAlias(e);
    }
    this.setData({ depGoodsName: '', itemAlias: '', editAlias: false });
  },

  _saveAlias(e) {
    var data = {
      gbDaDisGoodsId: this.data.goods.gbDistributerGoodsId,
      gbDaAliasName: e.detail.aliasName,
    };
    load.showLoading('保存别名');
    goodsApi.saveDisAlias(data).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        var arr = (this.data.goods.gbDistributerAliasEntities || []).slice();
        arr.push(res.result.data);
        this.setData({ 'goods.gbDistributerAliasEntities': arr });
      } else {
        wx.showToast({ title: res.result.msg, icon: 'none' });
      }
    });
  },

  _updateAlias(e) {
    var data = {
      gbDistributerAliasId: this.data.itemAlias.gbDistributerAliasId,
      gbDaAliasName: e.detail.aliasName,
    };
    load.showLoading('更新别名');
    goodsApi.updateDisAlias(data).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        var key = 'goods.gbDistributerAliasEntities[' + this.data.indexAlias + ']';
        this.setData({ [key]: data });
      } else {
        wx.showToast({ title: res.result.msg, icon: 'none' });
      }
    });
  },

  // ========== 弹窗控制 ==========
  hideMask() {
    this.setData({ showOperation: false, showChoice: false, showFresh: false });
  },

  cancle() {
    this.setData({ showAdd: false, showAddAlias: false });
  },

  // ========== 自动订货供货商 ==========
  toSupplier() {
    wx.setStorageSync('depGoods', this.data.depGoods);
    wx.navigateTo({
      url: '../appointSupplierList/appointSupplierList?purDepId=' + this.data.gbDepId,
    })
  },

  // ========== 代采门店选择 ==========
  /** 单门店企业不展示「门店代采」采购方式 */
  _refreshDepTypeItems() {
    var disInfo = this.data.disInfo;
    var canStoreProxy = !!(disInfo && disInfo.mendianDepartmentList
      && disInfo.mendianDepartmentList.length > 1);
    var items = [
      { name: '1', value: '自采' },
      { name: '21', value: '自动订货' }
    ];
    if (canStoreProxy) {
      items.splice(1, 0, { name: '6', value: '门店代采' });
    }
    this.setData({
      canStoreProxyPurchase: canStoreProxy,
      items: items,
    });
  },

  /** 根据 disInfo.mendianDepartmentList 过滤出可选门店（排除自己） */
  _computeStoreInfo() {
    this._refreshDepTypeItems();
    var disInfo = this.data.disInfo;
    var gbDepId = this.data.gbDepId;
    if (!disInfo || !disInfo.mendianDepartmentList) return;

    // 获取当前已选中的代采门店ID
    var selectedStoreId = this.data.depGoods && this.data.depGoods.gbDdgGbDepartmentId;

    var storeList = disInfo.mendianDepartmentList.filter(function (store) {
      return store.gbDepartmentId != gbDepId;
    }).map(function (store) {
      if (selectedStoreId && store.gbDepartmentId == selectedStoreId) {
        store.isSelected = true;
      } else {
        store.isSelected = false;
      }
      return store;
    });

    this.setData({ storeList: storeList });
  },

  /** 展示门店选择器 */
  showStoreSelector() {
    if (!this.data.storeList || this.data.storeList.length === 0) {
      wx.showToast({ title: '暂无可选门店', icon: 'none' });
      return;
    }
    this.setData({ showStorePicker: true });
  },

  /** 隐藏门店选择器 */
  hideStoreSelector() {
    this.setData({ showStorePicker: false });
  },

  /** 选中门店 */
  onSelectStore(e) {
    var id = e.currentTarget.dataset.id;
    var name = e.currentTarget.dataset.name;
    this.setData({
      'depGoods.gbDdgGbDepartmentId': id,
      selectedStoreName: name,
      showStorePicker: false,
      depConfigChanged: true
    });
  },

  /** 保存部门商品配置（采购方式 + 代采门店） */
  saveDepConfig() {
    load.showLoading('保存配置');
    goodsApi.updateDepGoods(this.data.depGoods).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        var depGoods = this._normalizeDepGoodsPackFields(res.result.data);
        var goods = depGoods.gbDistributerGoodsEntity || {};
        this.setData({
          depGoods: depGoods,
          goods: goods,
          depConfigChanged: false,
        });
        wx.showToast({ title: '保存成功' });
      } else {
        wx.showToast({ title: res.result.msg, icon: 'none' });
      }
    }).catch(() => {
      load.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  },

  // ========== 返回 ==========
  toBack() {
    wx.navigateBack({ delta: 1 });
  }
});
