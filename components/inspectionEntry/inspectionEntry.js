var api = require('../../services/franchiseInspection');

Component({
  data: {
    visible: false,
    loading: false,
    identity: null,
    requiresInspectorRegistration: false,
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
        var roles = identity.roleCodes || [];
        var isInspector = roles.indexOf('INSPECTOR') >= 0;
        that.setData({
          visible: true,
          identity: identity,
          requiresInspectorRegistration: !isInspector,
          loading: false,
          error: '',
        });
      }).catch(function (error) {
        var needsRegistration = error && error.errorCode === 'FRANCHISE_ROLE_MISSING';
        var isAuth = error && (error.errorCode === 'AUTH_REQUIRED' || error.errorCode === 'TOKEN_INVALID' ||
          error.errorCode === 'TOKEN_EXPIRED');
        that.setData({
          visible: needsRegistration,
          identity: null,
          requiresInspectorRegistration: needsRegistration,
          loading: false,
          error: isAuth ? '巡店登录状态已失效，点击重新登录' :
            (needsRegistration ? '' : (error.message || '巡店身份校验失败，点击重试')),
        });
      });
    },

    openInspection: function () {
      wx.navigateTo({
        url: this.data.requiresInspectorRegistration
          ? '/subPackage-inspection/pages/register/register'
          : '/subPackage-inspection/pages/home/home',
      });
    },
  },
});
