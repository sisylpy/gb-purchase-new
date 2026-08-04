var api = require('../../services/franchiseInspection');

Component({
  data: {
    visible: false,
    loading: false,
    identity: null,
    error: '',
  },

  lifetimes: {
    attached: function () { this.checkAccess(); },
  },

  pageLifetimes: {
    show: function () { this.checkAccess(); },
  },

  methods: {
    checkAccess: function () {
      if (this.data.loading) return;
      var that = this;
      this.setData({ loading: true, error: '' });
      api.bootstrapIdentity().then(function (identity) {
        var actions = identity.allowedActions || [];
        var visible = actions.some(function (action) {
          return action.indexOf('INSPECTION_') === 0 || action.indexOf('RECTIFICATION_') === 0 ||
            action.indexOf('ISSUE_') === 0;
        });
        that.setData({ visible: visible, identity: identity, loading: false, error: '' });
      }).catch(function (error) {
        // 无正式加盟角色时不展示假入口；登录异常可由用户点击重新校验。
        var isAuth = error && (error.errorCode === 'AUTH_REQUIRED' || error.errorCode === 'TOKEN_INVALID' ||
          error.errorCode === 'TOKEN_EXPIRED');
        that.setData({
          visible: false,
          loading: false,
          error: isAuth ? '巡店登录状态已失效，点击重新登录' : '',
        });
      });
    },

    openInspection: function () {
      wx.navigateTo({ url: '/subPackage-inspection/pages/home/home' });
    },
  },
});
