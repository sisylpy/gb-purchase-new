var preparationApi = require('../../services/preparation');
var preparationUtil = require('../../utils/preparation');

Component({
  data: {
    visible: false,
    loading: false,
    error: '',
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
      if (!identity.distributerId || !identity.operatorId) {
        this.setData({
          visible: false,
          error: '登录身份不完整，暂时无法校验备料权限',
        });
        return;
      }

      var that = this;
      this.setData({ loading: true, error: '' });
      preparationApi.listCapabilities(identity.distributerId).then(function (rows) {
        var departments = preparationUtil.enabledPreparationDepartments(rows, identity);
        var selected = preparationUtil.selectCurrentDepartment(departments, identity);
        if (selected) {
          wx.setStorageSync('preparationDepartmentId', selected.departmentId);
        }
        that.setData({
          visible: departments.length > 0,
          loading: false,
          error: '',
        });
      }).catch(function (error) {
        that.setData({
          visible: false,
          loading: false,
          error: error.message || '备料权限校验失败',
        });
      });
    },

    openPreparation: function () {
      wx.navigateTo({ url: '/subPackage-preparation/pages/home/home' });
    },
  },
});
