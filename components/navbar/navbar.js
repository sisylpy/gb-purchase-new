Component({
  properties: {
    title: { type: String, value: '页面标题' },
    avatar: { type: String, value: '' },
    buttonText: { type: String, value: '' },
    showBack: { type: Boolean, value: false },
  },

  data: {
    statusBarHeight: 20,
    navBarContentHeight: 44,
    navBarHeight: 64,
    leftWidth: 0,
    rightWidth: 0,
  },

  lifetimes: {
    attached: function () {
      var app = getApp();
      var windowWidth = app.globalData.windowWidth;
      var menuButtonInfo = app.globalData.menuButtonInfo;
      var statusBarHeight = app.globalData.statusBarHeight;
      var navBarContentHeight = menuButtonInfo.height + (menuButtonInfo.top - statusBarHeight) * 2;
      var navBarHeight = statusBarHeight + navBarContentHeight;
      var rightWidth = windowWidth - menuButtonInfo.left;
      var leftWidth = rightWidth;

      this.setData({
        statusBarHeight: statusBarHeight,
        navBarContentHeight: navBarContentHeight,
        navBarHeight: navBarHeight,
        leftWidth: leftWidth,
        rightWidth: rightWidth,
      });
    }
  },

  methods: {
    onNavButtonTap: function () {
      this.triggerEvent('navbuttontap');
    }
  }
});
