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
      if (!identity.distributerId || !identity.operatorId || !identity.currentStoreId || !wx.getStorageSync('token')) {
        this.setData({
          visible: false,
          error: '请使用有效门店账号登录后使用备料管理',
        });
        return;
      }

      this.setData({ visible: true, loading: false, error: '' });
    },

    openPreparation: function () {
      wx.navigateTo({ url: '/subPackage-preparation/pages/storeHome/storeHome' });
    },
  },
});
