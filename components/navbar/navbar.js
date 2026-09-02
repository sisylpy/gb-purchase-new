Component({
  properties: {
    title: { type: String, value: '页面标题' },
    avatar: { type: String, value: '' },
    buttonText: { type: String, value: '' },
    showBack: { type: Boolean, value: false },
    livePulse: { type: Boolean, value: false },
    leadingMenu: { type: Boolean, value: false },
  },

  data: {
    statusBarHeight: 0,
    navBarFullHeightPx: 0,
  },

  lifetimes: {
    attached: function () {
      this._calcHeight();
    },
  },

  observers: {
    buttonText: '_calcHeight',
    leadingMenu: '_calcHeight',
  },

  methods: {
    _calcHeight: function () {
      var app = getApp();
      var gd = app && app.globalData;
      if (!gd) return;

      var sb = gd.statusBarHeight || 20;
      var mb = gd.menuButtonInfo;
      if (!mb) return;

      // 导航栏内容高度 = 胶囊高度 + (胶囊顶部 - 状态栏) * 2
      var navContentH = mb.height + (mb.top - sb) * 2;
      var fullH = sb + navContentH;

      this.setData({
        statusBarHeight: sb,
        navBarFullHeightPx: fullH,
      });
    },

    onNavButtonTap: function () {
      this.triggerEvent('navbuttontap');
    },
  },
});
