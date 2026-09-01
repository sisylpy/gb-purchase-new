var preparationUtil = require('../../utils/preparation');

Component({
  data: {
    visible: false,
    loading: false,
    error: '',
    title: '中间料',
    description: '维护中间料配方、制作和损耗记录',
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
      // 该入口仅校验登录态，不做部门/中央厨房判断，直接进入门店中间料。
      if (!identity.distributerId || !identity.operatorId || !wx.getStorageSync('token')) {
        this.setData({
          visible: false,
          loading: false,
          error: '请先登录后使用中间料',
        });
        return;
      }

      this.setData({
        visible: true,
        loading: false,
        error: '',
        title: '中间料',
        description: '维护中间料配方、制作和损耗记录',
      });
    },

    openPreparation: function () {
      if (this.data.loading) return;
      wx.navigateTo({ url: '/subPackage-preparation/pages/storeProducts/storeProducts' });
    },
  },
});
