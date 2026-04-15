var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil');
var config = require('../../../../config.js');
var depOrder = require('../../../../services/depOrder');

// ========================
// 本页面使用的所有接口方法（来自 depOrder）
// ========================
// depOrder.updateOrderGbJj(data)       POST  gbdepartmentorders/updateOrderGbJj         修改进价订单
// depOrder.deleteOrderGb(data)         GET   gbdepartmentorders/deleteOrderGb/{id}       删除订单
// depOrder.depGetApplyAiByTime(data)   POST  gbdepartmentdisgoods/depGetApplyAiByTime    按时间获取部门申请
// depOrder.depGetApplyAiFather(data)   POST  gbdepartmentdisgoods/depGetApplyAiFather    按分类获取部门申请
// depOrder.depReceiveStock(data)       POST  gbdepartmentorders/depReceiveStock          确认收货
// depOrder.depSearchTodayOrders(data)  POST  gbdepartmentorders/depSearchTodayOrders     搜索今日订单
// depOrder.gbDisSaveStandard(data)     POST  gbdistributerstandard/gbDisSaveStandard     保存配送标准
// depOrder.gbDisDeleteStandard(data)   GET   gbdistributerstandard/gbDisDeleteStandard/{id} 删除配送标准
// depOrder.disSaveStandard(data)       POST  gbdistributerstandard/disSaveStandard       保存配送标准（旧）
// depOrder.disDeleteStandard(data)     GET   gbdistributerstandard/disDeleteStandard/{id} 删除配送标准（旧）
// ========================


Page({

  data: {
    showPopup: false,
    popupAnim: {},
    showType: 'time',
    searchArr: null,
    searchValue: '',
  },

  // ========================
  // 生命周期
  // ========================

  onReady() {
    var anim = wx.createAnimation({
      duration: 500,
      timingFunction: 'ease-in-out'
    });
    anim.scale(1.1).step({ duration: 250 }).scale(1).step({ duration: 250 });
    this.setData({ fabMainAnimation: anim.export() });
  },

  onLoad(options) {
    var globalData = getApp().globalData;
    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        disId: userInfo.gbDuDistributerId
      });

      var mendianInfo = wx.getStorageSync('mendianInfo');
      if (mendianInfo) {
        this.setData({
          mendianInfo: mendianInfo,
          depFatherId: mendianInfo.gbDepartmentId,
          depId: mendianInfo.gbDepartmentId,
          depHasSubs: mendianInfo.gbDepartmentSubAmount,
        });
        if (mendianInfo.gbDepartmentSubAmount > 0) {
          this.setData({
            depId: mendianInfo.gbDepartmentEntityList[0].gbDepartmentId,
          });
        }
      }
    }

    this._initData();
  },

  onShow() {
    var globalData = getApp().globalData;
    this.setData({
      windowWidth: wx.getWindowInfo().windowWidth * globalData.rpxR,
      windowHeight: wx.getWindowInfo().windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: config.server,
      todayDate: dateUtils.getArriveDateString(0),
    });

    var needImmediateRefresh = wx.getStorageSync('needRefreshOrderData');
    if (needImmediateRefresh) {
      wx.removeStorageSync('needRefreshOrderData');
      this._refreshData();
      return;
    }
  },

  // ========================
  // 数据加载
  // ========================

  /** 按时间加载部门申请数据 */
  _initData() {
    load.showLoading("获取数据中");
    depOrder.depGetApplyAiByTime(this.data.depFatherId)
      .then(function(res) {
        load.hideLoading();
        if (res.result.code == 0) {
          console.log("rers", res.result.data);
          if (this.data.depHasSubs > 0) {
            var depArrWithGlobalIndex = this._calculateGlobalOrderIndexForDepArr(res.result.data.arr);
            this.setData({
              depArr: depArrWithGlobalIndex,
            });
          } else {
            this.setData({
              applyArr: res.result.data.arr,
            });
          }
        } else {
          wx.showToast({ title: res.result.msg, icon: "none" });
        }
      }.bind(this));
  },

  /** 按分类加载部门申请数据 */
  _initDataByFather() {
    load.showLoading("获取数据中");
    return depOrder.depGetApplyAiFather(this.data.mendianInfo.gbDepartmentId)
      .then(function(res) {
        load.hideLoading();
        if (res.result.code == 0) {
          if (this.data.depHasSubs > 1) {
            var depArrWithGlobalIndex = this._calculateGlobalOrderIndexForDepArr(res.result.data.arr);
            this.setData({ depArr: depArrWithGlobalIndex });
          } else {
            var applyArrWithGlobalIndex = this._calculateGlobalOrderIndex(res.result.data.arr);
            this.setData({ applyArr: applyArrWithGlobalIndex });
          }
        } else {
          wx.showToast({ title: res.result.msg, icon: "none" });
        }
        return res;
      }.bind(this))
      .catch(function(error) {
        load.hideLoading();
        wx.showToast({ title: '网络异常，请重试', icon: 'none' });
        throw error;
      });
  },

  /** 刷新数据（根据当前显示模式自动选择 time/category） */
  _refreshData() {
    if (this.data.showType == 'time') {
      this._initData();
    } else {
      this._initDataByFather();
    }
  },

  /** 刷新数据，并在搜索中时同步刷新搜索结果 */
  _refreshDataWithSearch() {
    if (this.data.searchArr !== null && this.data.searchValue && this.data.searchValue.trim()) {
      this.reSearch();
    }
    this._refreshData();
  },

  // ========================
  // 全局序号计算
  // ========================

  /** 为多部门数据中的所有订单计算全局序号 */
  _calculateGlobalOrderIndexForDepArr(depArr) {
    if (!depArr || !Array.isArray(depArr)) return depArr;
    var globalOrderIndex = 1;
    return depArr.map(function(dep) {
      if (dep.depOrders && Array.isArray(dep.depOrders)) {
        dep.depOrders = dep.depOrders.map(function(father) {
          return this._assignGlobalIndex(father, function() { return globalOrderIndex++; });
        }.bind(this));
      }
      return dep;
    }.bind(this));
  },

  /** 为单部门数据中的所有订单计算全局序号 */
  _calculateGlobalOrderIndex(depArr) {
    if (!depArr || !Array.isArray(depArr) || depArr.length === 0) return [];
    var dep = depArr[0];
    if (!dep.depOrders || !Array.isArray(dep.depOrders)) return [];
    var globalOrderIndex = 1;
    return dep.depOrders.map(function(father) {
      return this._assignGlobalIndex(father, function() { return globalOrderIndex++; });
    }.bind(this));
  },

  /** 为单个分类下的所有订单赋全局序号（共用逻辑） */
  _assignGlobalIndex(father, nextIndex) {
    if (father.gbDistributerGoodsEntities && Array.isArray(father.gbDistributerGoodsEntities)) {
      father.gbDistributerGoodsEntities.forEach(function(goods) {
        var orderArrays = [goods.nxDepartmentOrdersEntities, goods.gbDepartmentOrdersEntities];
        orderArrays.forEach(function(orderArray) {
          if (orderArray && Array.isArray(orderArray)) {
            orderArray.forEach(function(order) {
              order.globalOrderIndex = nextIndex();
            });
          }
        });
      });
    } else if (father.gbDistributerGoodsEntity) {
      father.globalOrderIndex = nextIndex();
    }
    return father;
  },

  // ========================
  // FAB 弹窗
  // ========================

  /** 点击 FAB 按钮，弹出快捷操作菜单 */
  onFabTap() {
    this.setData({ showPopup: true }, function() {
      var anim = wx.createAnimation({ duration: 0, timingFunction: 'ease', transformOrigin: '100% 100%' });
      anim.scale(0.1).opacity(0.2).step();
      this.setData({ popupAnim: anim.export() }, function() {
        setTimeout(function() {
          var anim = wx.createAnimation({ duration: 400, timingFunction: 'cubic-bezier(.21,1.02,.73,1)', transformOrigin: '100% 100%' });
          anim.scale(1).opacity(1).step();
          this.setData({ popupAnim: anim.export() });
        }.bind(this), 20);
      }.bind(this));
    }.bind(this));
  },

  /** 点击遮罩，关闭弹窗 */
  onMaskTap() {
    var animation = wx.createAnimation({
      duration: 320,
      timingFunction: 'cubic-bezier(.21,1.02,.73,1)',
      transformOrigin: '90% 90%',
    });
    animation.scale(0.1).opacity(0.2).step();
    this.setData({ popupAnim: animation.export() });
    setTimeout(function() {
      this.setData({ showPopup: false });
    }.bind(this), 320);
  },

  /** 点击弹窗内容，关闭弹窗 */
  onPopupTap() {
    this.onMaskTap();
  },

  // ========================
  // 排序 & 搜索
  // ========================

  /** 切换排序方式（按时间/按分类）并重新加载数据 */
  onSortByChange(e) {
    var type = e.detail.type;
    this.setData({ showType: type });
    this._refreshData();
  },

  /** 搜索输入时实时查询订单 */
  onSearchInput(e) {
    var value = e.detail.value;
    this.setData({ searchValue: value });
    if (!value) {
      this.setData({ searchArr: null });
      return;
    }
    var data = { depFatherId: this.data.depFatherId, depId: -1, searchStr: value };
    depOrder.depSearchTodayOrders(data).then(function(res) {
      if (res.result.code == 0) {
        this.setData({ searchArr: res.result.data || [] });
      } else {
        this.setData({ searchArr: [] });
      }
    }.bind(this)).catch(function(error) {
      this.setData({ searchArr: [] });
    }.bind(this));
  },

  /** 搜索结果 + 页面数据同步刷新 */
  reSearch() {
    var data = { depFatherId: this.data.depFatherId, depId: -1, searchStr: this.data.searchValue };
    Promise.all([
      depOrder.depSearchTodayOrders(data),
      this.updatePageData()
    ]).then(function(results) {
      var searchRes = results[0];
      if (searchRes.result.code == 0) {
        this.setData({ searchArr: searchRes.result.data || [] });
      } else {
        this.setData({ searchArr: [] });
      }
    }.bind(this)).catch(function(error) {
      this.setData({ searchArr: [] });
    }.bind(this));
  },

  /** 取消搜索，清空搜索状态 */
  onSearchCancel() {
    this.setData({ searchArr: null, searchValue: '' });
  },

  /** 刷新当前页面数据（Promise 包装） */
  updatePageData() {
    var that = this;
    return new Promise(function(resolve) {
      that._refreshData();
      resolve();
    });
  },

  // ========================
  // 选择工作范围 & 分店
  // ========================

  /** 选择工作范围（全部/单部门） */
  selectWorkScope(e) {
    var scope = e.currentTarget.dataset.scope;
    this.setData({
      workScope: scope,
      selDepId: scope === 'all' ? '' : this.data.selDepId,
      selDepartmentName: scope === 'all' ? '' : this.data.selDepartmentName
    }, function() { this.checkFormValid(); }.bind(this));
  },

  /** 选择部门（多部门门店时弹出选择） */
  selectDepartment(e) {
    var dep = e.currentTarget.dataset.item;
    var depFatherId = dep.gbDepartmentId;
    if (dep.gbDepartmentFatherId > 0) {
      depFatherId = dep.gbDepartmentFatherId;
    }
    var depId = dep.gbDepartmentId;
    this.setData({ dep: dep, depFatherId: depFatherId, depId: depId, e: e });
    wx.setStorageSync('orderDepInfo', dep);
    if (this.data.openType == 'paste') {
      wx.navigateTo({ url: '../paste/paste?depFatherId=' + this.data.depFatherId + '&depId=' + this.data.depId + '&disId=' + this.data.disId });
    } else if (this.data.openType == 'books') {
      wx.navigateTo({ url: '../resGoodsAi/resGoodsAi' });
    } else if (this.data.openType == 'ai') {
      wx.navigateTo({ url: '../customerGoodsAi/customerGoodsAi?depId=' + this.data.depId + '&disId=' + this.data.disId });
    }
  },

  /** 隐藏部门选择弹窗 */
  hideChoiceMask() {
    this.setData({ showChoice: false });
  },

  // ========================
  // 订货操作
  // ========================

  /** 跳转到订货页面 */
  toOrder(e) {
    if (this.data.disInfo.mendianDepartmentList.length > 1) {
      this.setData({ showChoice: true, toType: "order" });
    } else {
      this.setData({ showOperation: true });
    }
  },

  /** 隐藏操作弹窗 */
  hideOperation() {
    this.setData({ showOperation: false });
  },

  /** 添加新订单（根据类型跳转不同页面） */
  toAddOrder(e) {
    var type = e.currentTarget.dataset.type;
    if (this.data.depHasSubs > 1) {
      this.setData({ showChoice: true, openType: type });
    } else {
      wx.setStorageSync('orderDepInfo', this.data.mendianInfo);
      if (type == 'paste') {
        wx.navigateTo({ url: '../paste/paste?depFatherId=' + this.data.depFatherId + '&depId=' + this.data.depId + '&disId=' + this.data.disId });
      } else if (type == 'ai') {
        wx.navigateTo({ url: '../customerGoodsAi/customerGoodsAi?depId=' + this.data.depId + '&disId=' + this.data.disId });
      } else if (type == 'books') {
        wx.navigateTo({ url: '../resGoodsAi/resGoodsAi' });
      }
    }
  },

  /** 跳转到订货记录页面 */
  toRecord() {
    this.hideOperation();
    wx.navigateTo({ url: '../paste/paste?depFatherId=' + this.data.depFatherId + '&depId=' + this.data.depId });
  },

  // ========================
  // 订单编辑
  // ========================

  /** 点击编辑订单（部门商品） */
  toEditApply(e) {
    var goodsId = e.currentTarget.dataset.id;
    var name = e.currentTarget.dataset.name;
    var setDataObj = {
      showOperationGoods: true,
      goodsId: goodsId,
      goodsName: name,
      disGoods: e.currentTarget.dataset.goods,
      applyItem: e.currentTarget.dataset.order,
      depId: e.currentTarget.dataset.depid,
      subName: e.currentTarget.dataset.subname,
    };
    if (e.currentTarget.dataset.index !== undefined) {
      setDataObj.index = e.currentTarget.dataset.index;
    }
    this.setData(setDataObj);

    if (this.data.applyItem.gbDoBuyStatus < 3) {
      var applyItem = this.data.applyItem;
      this.setData({
        show: true,
        applyStandardName: applyItem.gbDoStandard,
        printStandard: applyItem.gbDoPrintStandard,
        itemDis: this.data.applyItem.gbDistributerGoodsEntity,
        item: this.data.applyItem.gbDepartmentDisGoodsEntity,
        editApply: true,
        applyNumber: applyItem.gbDoQuantity,
        applyRemark: applyItem.gbDoRemark,
        priceLevel: applyItem.gbDoCostPriceLevel,
        canSave: true,
      });
    } else {
      wx.showToast({ title: '请供货商修改订单状态', icon: 'none' });
    }
    this.hideModal();
    this.setData({ showOperationGoods: false });
  },

  /** 点击编辑订单（配送商品） */
  toEditApplyDis(e) {
    var applyItem = e.currentTarget.dataset.order;
    var itemStatus = applyItem.nxDoPurchaseStatus;
    applyItem.disgoods = e.currentTarget.dataset.disgoods;
    if (itemStatus > 2) {
      wx.showModal({
        title: "不能修改",
        content: "订单在配送中，如果有变化，请与采购员联系.",
        showCancel: false,
        confirmText: "知道了",
        success: function(res) {}
      });
    } else {
      var setDataObj = {
        applyItem: e.currentTarget.dataset.order,
        showCash: true,
        applyStandardName: applyItem.gbDoStandard,
        itemNxDis: e.currentTarget.dataset.item,
        itemDis: e.currentTarget.dataset.goods,
        editApply: true,
        applyNumber: applyItem.gbDoQuantity,
        applyRemark: applyItem.gbDoRemark,
        canSave: false,
        priceLevel: e.currentTarget.dataset.order.gbDoCostPriceLevel,
      };
      if (e.currentTarget.dataset.index !== undefined) {
        setDataObj.index = e.currentTarget.dataset.index;
      }
      this.setData(setDataObj);
      if (this.data.applyItem.gbDoSubtotal !== null) {
        this.setData({ applySubtotal: applyItem.gbDoSubtotal + "元" });
      }
    }
  },

  /** 确认修改订单 */
  confirm(e) {
    if (this.data.editApply) {
      this._updateDisOrder(e);
    }
    this.setData({
      show: false, editApply: false, applyItem: "", item: "",
      applyNumber: "", applyStandardName: "", printStandard: "",
    });
  },

  /** 调用接口修改订单数据 */
  _updateDisOrder(e) {
    var dg = {
      id: this.data.applyItem.gbDepartmentOrdersId,
      weight: e.detail.applyNumber,
      standard: e.detail.applyStandardName,
      remark: e.detail.applyRemark,
      printStandard: this.data.printStandard,
      priceLevel: this.data.priceLevel
    };
    depOrder.updateOrderGbJj(dg).then(function(res) {
      load.showLoading("修改订单");
      if (res.result.code == 0) {
        load.hideLoading();
        this._refreshDataWithSearch();
      } else {
        load.hideLoading();
        wx.showToast({ title: res.result.msg, icon: "none" });
      }
    }.bind(this));
  },

  // ========================
  // 删除订单
  // ========================

  /** 弹出删除确认弹窗（从操作面板进入） */
  delApply() {
    this.setData({
      warnContent: this.data.goodsName + "  " + this.data.applyItem.gbDoQuantity + this.data.applyItem.gbDoStandard,
      show: false,
      popupType: 'deleteOrder',
      showPopupWarn: true,
      showOperationGoods: false,
      showOperationLinshi: false
    });
    this.hideModal();
  },

  /** 弹出删除确认弹窗（从临时操作面板进入） */
  delApplyPaste() {
    load.showLoading("删除订单");
    depOrder.deleteOrderGb(this.data.applyItem.gbDepartmentOrdersId).then(function(res) {
      load.hideLoading();
      if (res.result.code == 0) {
        this._refreshDataWithSearch();
        this.setData({ applyItem: "", showOperationLinshi: false });
      } else {
        wx.showToast({ title: res.result.msg, icon: 'none' });
      }
    }.bind(this));
  },

  /** 确认删除订单（从删除确认弹窗触发） */
  deleteApplyApi() {
    this.setData({ popupType: "", showPopupWarn: false });
    load.showLoading("删除订单");
    depOrder.deleteOrderGb(this.data.applyItem.gbDepartmentOrdersId).then(function(res) {
      load.hideLoading();
      if (res.result.code == 0) {
        this._refreshDataWithSearch();
        this.setData({ applyItem: "" });
      } else {
        wx.showToast({ title: res.result.msg, icon: 'none' });
      }
    }.bind(this));
  },

  /** 确认收货 */
  receiveStock(e) {
    var id = e.currentTarget.dataset.item.gbDepartmentOrdersId;
    load.showLoading("收货中");
    depOrder.depReceiveStock(id).then(function(res) {
      load.hideLoading();
      if (res.result.code == 0) {
        this._refreshDataWithSearch();
      } else {
        this._refreshData();
        wx.showToast({ title: res.result.msg, icon: 'none' });
      }
    }.bind(this));
  },

  // ========================
  // 标准规格
  // ========================

  /** 删除标准规格（弹出确认弹窗） */
  delStandard(e) {
    this.setData({
      warnContent: e.detail.standardName,
      popupType: 'deleteSpec',
      showPopupWarn: true,
      disStandardId: e.detail.id,
    });
  },

  /** 调用接口删除标准规格 */
  deleteStandardApi() {
    depOrder.gbDisDeleteStandard(this.data.disStandardId).then(function(res) {
      if (res.result.code == 0) {
        var standards = "itemDis.gbDistributerStandardEntities";
        this.setData({ [standards]: res.result.data.gbDistributerStandardEntities });
        this._updateOrderListStandards(res.result.data.gbDistributerStandardEntities);
        this.setData({ popupType: "", showPopupWarn: false, disStandardId: "" });
      } else {
        wx.showToast({ title: res.result.msg, icon: 'none' });
      }
    }.bind(this));
  },

  /** 保存新的标准规格 */
  confirmStandard(e) {
    var data = {
      gbDsDisGoodsId: this.data.applyItem.gbDoDisGoodsId,
      gbDsStandardName: e.detail.newStandardName,
    };
    depOrder.gbDisSaveStandard(data).then(function(res) {
      if (res.result.code == 0) {
        var standardArr = this.data.itemDis.gbDistributerStandardEntities;
        standardArr.push(res.result.data);
        var standards = "itemDis.gbDistributerStandardEntities";
        this.setData({ [standards]: standardArr, applyStandardName: res.result.data.gbDsStandardName });
        this._updateOrderListStandards(standardArr);
      } else {
        wx.showToast({ title: res.result.msg, icon: 'none' });
      }
    }.bind(this));
  },

  /** 切换订单规格 */
  changeStandard(e) {
    this.setData({
      applyStandardName: e.detail.applyStandardName,
      priceLevel: e.detail.level,
    });
    var levelTwoStandard = this.data.applyItem.gbDistributerGoodsEntity.gbDgWillPriceTwoStandard;
    if (this.data.applyStandardName == levelTwoStandard) {
      this.setData({ printStandard: levelTwoStandard });
    } else {
      this.setData({ printStandard: this.data.applyItem.gbDistributerGoodsEntity.gbDgGoodsStandardname });
    }
  },

  /** 更新订单列表中的标准规格数据（同步内存数据） */
  _updateOrderListStandards(standardArr) {
    var applyArr = this.data.applyArr;
    var depArr = this.data.depArr;
    var index = this.data.index;
    var disGoodsId = this.data.applyItem.gbDoDisGoodsId;

    if (applyArr && Array.isArray(applyArr) && index !== undefined) {
      var targetOrder = applyArr[index];
      if (targetOrder) {
        this._syncStandardsToOrder(targetOrder, disGoodsId, standardArr);
      }
      this.setData({ applyArr: applyArr });
    }
    if (depArr && Array.isArray(depArr) && index !== undefined) {
      for (var i = 0; i < depArr.length; i++) {
        var dep = depArr[i];
        if (dep.depOrders && Array.isArray(dep.depOrders)) {
          var targetOrder = dep.depOrders[index];
          if (targetOrder) {
            this._syncStandardsToOrder(targetOrder, disGoodsId, standardArr);
          }
        }
      }
      this.setData({ depArr: depArr });
    }
  },

  /** 将标准规格同步到单个订单对象（共用逻辑） */
  _syncStandardsToOrder(targetOrder, disGoodsId, standardArr) {
    if (targetOrder.gbDistributerGoodsEntities && Array.isArray(targetOrder.gbDistributerGoodsEntities)) {
      for (var i = 0; i < targetOrder.gbDistributerGoodsEntities.length; i++) {
        var goods = targetOrder.gbDistributerGoodsEntities[i];
        if (goods.gbDistributerGoodsId === disGoodsId) {
          goods.gbDistributerStandardEntities = standardArr;
          break;
        }
      }
    } else if (targetOrder.gbDistributerGoodsEntity && targetOrder.gbDistributerGoodsEntity.gbDistributerGoodsId === disGoodsId) {
      targetOrder.gbDistributerGoodsEntity.gbDistributerStandardEntities = standardArr;
    }
  },

  // ========================
  // 确认弹窗
  // ========================

  /** 确认警告弹窗操作 */
  confirmWarn() {
    if (this.data.popupType == 'deleteSpec') {
      this.deleteStandardApi();
    } else {
      this.deleteApplyApi();
    }
  },

  /** 关闭警告弹窗 */
  closeWarn() {
    this.setData({ warnContent: "", popupType: '', showPopupWarn: false });
  },

  // ========================
  // 临时操作面板 & 动画
  // ========================

  /** 打开临时操作面板（编辑/删除订单） */
  openOperationLinshi(e) {
    this.setData({
      dep: e.currentTarget.dataset.dep,
      depId: e.currentTarget.dataset.depid,
      showOperationLinshi: true,
      applyItem: e.currentTarget.dataset.order,
      goodsName: e.currentTarget.dataset.name
    });
    this.chooseSezi();
  },

  /** 隐藏临时操作面板 */
  hideMaskLinshi() {
    this.setData({ showOperationLinshi: false });
  },

  /** 隐藏商品操作面板 */
  hideMaskGoods() {
    this.hideModal();
    this.setData({ showOperationGoods: false });
  },

  /** 从商品跳转到编辑申请页 */
  toPasteFromGoods(e) {
    wx.setStorageSync('applyItem', this.data.applyItem);
    this.hideMaskLinshi();
    wx.navigateTo({ url: '../editDepApplyGoods/editDepApplyGoods?from=chefOrder' });
  },

  /** 底部弹窗弹出动画 */
  chooseSezi(e) {
    var that = this;
    var animation = wx.createAnimation({ duration: 100, timingFunction: 'linear' });
    that.animation = animation;
    animation.translateY(200).step();
    that.setData({ animationData: animation.export(), chooseSize: true });
    setTimeout(function() {
      animation.translateY(0).step();
      that.setData({ animationData: animation.export() });
    }, 20);
  },

  /** 底部弹窗关闭动画 */
  hideModal(e) {
    var that = this;
    var animation = wx.createAnimation({ duration: 1000, timingFunction: 'linear' });
    that.animation = animation;
    animation.translateY(200).step();
    that.setData({ animationData: animation.export() });
    setTimeout(function() {
      animation.translateY(0).step();
      that.setData({ animationData: animation.export(), chooseSize: false });
    }, 200);
  },

  // ========================
  // 分享 & 导航
  // ========================

  /** 分享订货员注册页面 */
  onShareAppMessage(options) {
    var path = "/subPackage-mendian/pages/mendian/depUserRegister/depUserRegister?disId=" + this.data.disId + '&depFatherId=' + this.data.depFatherId + '&admin=1';
    return {
      title: "订货员注册",
      path: path,
      imageUrl: this.data.url + '/userImage/say.png',
    }
  },

  /** 返回上一页 */
  toBack() {
    wx.navigateBack({ delta: 1 });
  },

})
