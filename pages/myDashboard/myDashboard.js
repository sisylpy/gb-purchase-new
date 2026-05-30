var dashboardApi = require('../../services/aiDashboard');
var dateUtils = require('../../lib/dateUtil');

/** 安全取正整数 */
function positiveNum(v) {
  var n = parseInt(v);
  return (n === n && n > 0) ? n : 0;
}

Page({

  onShow: function () {
    // 从日期选择页返回时刷新
    if (this.data._pendingRefresh) {
      this.setData({ _pendingRefresh: false });
      this._loadRender();
      return;
    }

    // 从日期选择页通过 storage 传参
    var myDate = wx.getStorageSync('myDate');
    if (myDate && this.data._needsDateUpdate) {
      var dateRange;
      if (myDate.name === 'custom') {
        dateRange = dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate);
      } else {
        dateRange = dateUtils.getDateRange(myDate.name);
      }
      this.setData({
        hanzi: myDate.hanzi || dateRange.name,
        _needsDateUpdate: false,
      });
      // 用返回的日期覆盖时间窗口再请求
      this._scope.startDate = dateRange.startDate;
      this._scope.stopDate = dateRange.stopDate;
      this._loadRender();
      return;
    }

    // 首次或正常刷新
    if (this.data._initialized) {
      this._loadRender();
    }
  },

  data: {
    navBarHeight: 0,
    isLoading: true,
    hasData: false,
    errorMsg: '',

    // 时间窗口显示
    hanzi: '本月',
    timeWindow: null,

    // 模块列表
    modules: [],

    // 关注卡片添加相关
    showAddFocusDialog: false,
    focusCatalog: [],
    addFocusWidgetType: '',
    addFocusTitle: '',
    addFocusMetric: '',
    addFocusDishName: '',
    addFocusIngredientName: '',

    // 模块编辑相关
    showModuleEditDialog: false,
    editingModule: null,

    // 内部状态标记
    _initialized: false,
    _needsDateUpdate: true,
    _pendingRefresh: false,
  },

  onLoad: function () {
    var globalData = getApp().globalData;
    var navBarHeight = globalData.statusBarHeight +
      (globalData.menuButtonInfo.height +
        (globalData.menuButtonInfo.top - globalData.statusBarHeight) * 2);

    this.setData({
      navBarHeight: navBarHeight * globalData.rpxR,
    });

    // 初始化默认日期范围（本月）
    var defaultDateRange = dateUtils.getDateRange('thisMonth');

    // 获取用户信息
    var userInfo = wx.getStorageSync('userInfo') || {};
    var disInfo = wx.getStorageSync('disInfo') || {};
    var mendianInfo = wx.getStorageSync('mendianInfo');

    var userId = positiveNum(userInfo.gbDepartmentUserId);
    var distributerId = positiveNum(userInfo.gbDuDistributerId || disInfo.gbDistributerId);
    var departmentId = positiveNum(
      mendianInfo ? mendianInfo.gbDepartmentId : (userInfo.gbDuDepartmentId || userInfo.gbDepartmentId)
    );

    var scopeMode =   'STORE';

    if (!userId || !distributerId) {
      this.setData({
        isLoading: false,
        errorMsg: '无法获取用户信息，请重新登录',
      });
      return;
    }

    // 缓存基础 scope 参数
    this._scope = {
      userId: userId,
      distributerId: distributerId,
      scopeMode: scopeMode,
      departmentId: departmentId,
      startDate: defaultDateRange.startDate,
      stopDate: defaultDateRange.stopDate,
    };

    this.setData({
      _initialized: true,
      _needsDateUpdate: false,
    });

    this._loadRender();
  },

  /** 调用 render 接口加载数据 */
  _loadRender: function () {
    var that = this;
    that.setData({ isLoading: true, errorMsg: '' });

    var params = {
      userId: that._scope.userId,
      distributerId: that._scope.distributerId,
      scopeMode: that._scope.scopeMode,
      departmentId: that._scope.departmentId,
      startDate: that._scope.startDate,
      endDate: that._scope.stopDate,
      includeAdvice: false,
    };

    dashboardApi.renderDashboard(params).then(function (res) {
      var result = res.result;
      if (result.code === 0 && result.data) {
        var data = result.data;
        console.log("rers", data);
        var modules = (data.modules || [])
          .filter(function (m) { return m.enabled === true; })
          .sort(function (a, b) { return (a.position || 0) - (b.position || 0); });

        that.setData({
          isLoading: false,
          hasData: true,
          dashboard: data.dashboard || {},
          timeWindow: data.timeWindow || {},
          modules: modules,
          advice: data.advice || null,
        });
      } else {
        that.setData({
          isLoading: false,
          hasData: false,
          errorMsg: (result && result.msg) || '加载失败',
        });
      }
    }).catch(function () {
      that.setData({
        isLoading: false,
        errorMsg: '网络异常，请重试',
      });
    });
  },

  /** 跳转日期选择页 */
  toDatePage: function () {
    this.setData({ _needsDateUpdate: true, _pendingRefresh: true });
    wx.navigateTo({
      url: '/pages/common/selectDate/selectDate?startDate=' + this._scope.startDate +
        '&stopDate=' + this._scope.stopDate + '&dateType=month',
    });
  },

  /** 返回 */
  /** 跳转首页 */
  toHomeTap: function () {
    wx.reLaunch({ url: '/pages/index/index' });
  },

  /** 跳转 AI 助手 */
  toAiChat: function () {
    wx.navigateTo({ url: '/pages/storeAiChat/storeAiChat' });
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  },

  // ========================
  // 模块编辑
  // ========================

  /** 打开模块编辑弹窗 */
  onEditModule: function (e) {
    var moduleId = e.currentTarget.dataset.moduleid;
    var modules = this.data.modules;
    var target = null;
    for (var i = 0; i < modules.length; i++) {
      if (modules[i].moduleId === moduleId) {
        target = modules[i];
        break;
      }
    }
    if (!target || !target.configurable) return;

    this.setData({
      showModuleEditDialog: true,
      editingModule: {
        moduleId: target.moduleId,
        moduleTitle: target.moduleTitle,
        enabled: target.enabled !== false,
        position: target.position,
        config: target.config || {},
      },
    });
  },

  /** 关闭模块编辑弹窗 */
  onCloseModuleEdit: function () {
    this.setData({ showModuleEditDialog: false, editingModule: null });
  },

  /** 切换模块启用/隐藏 */
  onToggleModuleEnabled: function () {
    var m = this.data.editingModule;
    if (!m) return;
    m.enabled = !m.enabled;
    this.setData({ editingModule: m });
  },

  /** 修改模块标题输入 */
  onEditModuleTitleInput: function (e) {
    var m = this.data.editingModule;
    if (!m) return;
    m.moduleTitle = e.detail.value;
    this.setData({ editingModule: m });
  },

  /** 提交模块编辑 */
  onSubmitModuleEdit: function () {
    var that = this;
    var m = that.data.editingModule;
    if (!m) return;

    dashboardApi.updateModule(m.moduleId, {
      userId: that._scope.userId,
      moduleTitle: m.moduleTitle,
      enabled: m.enabled,
      position: m.position,
      config: m.config,
    }).then(function () {
      that.setData({ showModuleEditDialog: false, editingModule: null });
      that._loadRender();
    }).catch(function () {
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  },

  // ========================
  // 关注卡片管理
  // ========================

  /** 打开添加关注卡片弹窗 */
  onAddFocusWidget: function () {
    var that = this;
    dashboardApi.getFocusWidgetCatalog().then(function (res) {
      var result = res.result;
      var catalog = (result.code === 0 && result.data) ? result.data : [];
      that.setData({
        showAddFocusDialog: true,
        focusCatalog: catalog,
        addFocusWidgetType: '',
        addFocusMetric: '',
        addFocusTitle: '',
        addFocusDishName: '',
        addFocusIngredientName: '',
      });
    }).catch(function () {
      wx.showToast({ title: '加载目录失败', icon: 'none' });
    });
  },

  /** 关闭添加弹窗 */
  onCloseAddFocus: function () {
    this.setData({ showAddFocusDialog: false });
  },

  /** 选择关注类型 */
  onSelectWidgetType: function (e) {
    this.setData({
      addFocusWidgetType: e.currentTarget.dataset.type,
      addFocusMetric: '',
      addFocusTitle: '',
      addFocusDishName: '',
      addFocusIngredientName: ''
    });
  },

  /** 选择指标 */
  onSelectMetric: function (e) {
    this.setData({ addFocusMetric: e.currentTarget.dataset.metric, addFocusTitle: '' });
  },

  /** 填写标题 */
  onAddFocusTitleInput: function (e) {
    this.setData({ addFocusTitle: e.detail.value });
  },

  /** 填写菜品名（仅 DISH_FOCUS） */
  onAddFocusDishNameInput: function (e) {
    var dishName = e.detail.value;
    this.setData({ addFocusDishName: dishName });
    this._autoGenerateTitle(dishName);
  },

  /** 填写配料名（仅 INGREDIENT_FOCUS） */
  onAddFocusIngredientNameInput: function (e) {
    var name = e.detail.value;
    this.setData({ addFocusIngredientName: name });
    this._autoGenerateTitle(name);
  },

  /**
   * 根据对象名称 + 指标自动生成标题
   * 规则：{对象名}本月{指标标签}
   */
  _autoGenerateTitle: function (objectName) {
    var that = this;
    var metric = that.data.addFocusMetric;
    if (!objectName || !metric) return;

    // 从 catalog 中找到对应的 metric label
    var catalog = that.data.focusCatalog;
    var label = '';
    for (var i = 0; i < catalog.length; i++) {
      var metrics = catalog[i].metrics || [];
      for (var j = 0; j < metrics.length; j++) {
        if (metrics[j].value === metric) {
          label = metrics[j].label;
          break;
        }
      }
      if (label) break;
    }

    var title = objectName + '本月' + label;
    that.setData({ addFocusTitle: title });
  },

  /** 提交添加关注卡片 */
  onSubmitAddFocus: function () {
    var that = this;
    var widgetType = that.data.addFocusWidgetType;
    var metric = that.data.addFocusMetric;
    var title = that.data.addFocusTitle;
    var dishName = that.data.addFocusDishName;
    var ingredientName = that.data.addFocusIngredientName;

    if (!widgetType || !metric) {
      wx.showToast({ title: '请选择关注类型和指标', icon: 'none' });
      return;
    }
    if (!title) {
      wx.showToast({ title: '请输入或自动生成卡片标题', icon: 'none' });
      return;
    }
    if (widgetType === 'DISH_FOCUS' && !dishName) {
      wx.showToast({ title: '请输入菜品名称', icon: 'none' });
      return;
    }
    if (widgetType === 'INGREDIENT_FOCUS' && !ingredientName) {
      wx.showToast({ title: '请输入配料名称', icon: 'none' });
      return;
    }

    // 找到 custom_focus 模块
    var modules = that.data.modules;
    var focusModule = null;
    for (var i = 0; i < modules.length; i++) {
      if (modules[i].moduleKey === 'custom_focus') {
        focusModule = modules[i];
        break;
      }
    }
    if (!focusModule) {
      wx.showToast({ title: '未找到关注模块', icon: 'none' });
      return;
    }

    // 计算新 position
    var widgets = (focusModule.payload && focusModule.payload.widgets) || [];
    var maxPos = 0;
    for (var j = 0; j < widgets.length; j++) {
      if (widgets[j].position > maxPos) maxPos = widgets[j].position;
    }

    var config = { metric: metric };
    if (widgetType === 'DISH_FOCUS') {
      config.dishName = dishName;
    } else if (widgetType === 'INGREDIENT_FOCUS') {
      config.ingredientName = ingredientName;
    }

    var data = {
      userId: that._scope.userId,
      dashboardId: (that.data.dashboard && that.data.dashboard.dashboardId) || 1,
      moduleId: focusModule.moduleId,
      widgetType: widgetType,
      title: title,
      position: (maxPos || 0) + 1,
      config: config,
    };

    dashboardApi.addFocusWidget(data).then(function (res) {
      var result = res.result;
      if (result.code === 0) {
        that.setData({ showAddFocusDialog: false });
        that._loadRender();
      } else {
        wx.showToast({ title: (result && result.msg) || '添加失败', icon: 'none' });
      }
    }).catch(function () {
      wx.showToast({ title: '网络异常', icon: 'none' });
    });
  },

  /** 删除关注卡片 */
  onDeleteFocusWidget: function (e) {
    var that = this;
    var widgetId = e.currentTarget.dataset.widgetid;

    wx.showModal({
      title: '提示',
      content: '确定要删除该关注卡片吗？',
      success: function (modalRes) {
        if (modalRes.confirm) {
          dashboardApi.deleteFocusWidget(widgetId, that._scope.userId).then(function () {
            that._loadRender();
          }).catch(function () {
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      },
    });
  },
});
