var preparationApi = require('../../services/preparation');
var preparationUtil = require('../../utils/preparation');

Component({
  data: {
    visible: false,
    loading: false,
    error: '',
    mode: 'store',
    title: '备料管理',
    description: '维护备料品、配方和原料损耗',
  },

  lifetimes: {
    attached: function () {
      this.checkAccess();
    },
  },

  pageLifetimes: {
    show: function () {
      this.checkAccess();
    },
  },

  methods: {
    checkAccess: function () {
      if (this.data.loading) return;
      var identity = preparationUtil.getIdentity();
      if (!identity.distributerId || !identity.operatorId || !identity.currentStoreId || !wx.getStorageSync('token')) {
        this.setData({
          visible: false,
          error: '请使用有效门店账号登录后使用备料管理',
        });
        return;
      }

      var that = this;
      this.setData({ loading: true, error: '' });
      preparationApi.listCapabilities(identity.distributerId).then(function (rows) {
        var departments = preparationUtil.enabledPreparationDepartments(rows, identity);
        var selected = preparationUtil.selectCurrentDepartment(departments, identity);
        var advanced = !!selected;
        if (selected) {
          wx.setStorageSync('preparationDepartmentId', selected.departmentId);
        }
        that.setData({
          visible: true,
          loading: false,
          error: '',
          mode: advanced ? 'central' : 'store',
          title: advanced ? '中央厨房备料' : '备料管理',
          description: advanced
            ? '生产批次、领料、库存与成本追踪'
            : '维护备料品、配方和原料损耗',
        });
      }).catch(function (error) {
        that.setData({
          visible: false,
          loading: false,
          error: error.message || '备料模式校验失败，请稍后重试',
        });
      });
    },

    openPreparation: function () {
      if (this.data.loading) return;
      var route = this.data.mode === 'central'
        ? '/subPackage-preparation/pages/home/home'
        : '/subPackage-preparation/pages/storeHome/storeHome';
      wx.navigateTo({ url: route });
    },
  },
});
