
Component({
  properties: {
    titleLarge: {
      type: String,
      value: '0元'
    },
    title: {
      type: String,
      value: '总采购'
    },
    avatar: {
      type: String,
      value: '/images/avatar.png'
    },
    buttonText: {
      type: String,
      value: '按钮'
    },
    isScrolled: {
      type: Boolean,
      value: false
    },
    tabIndex: {
      type: Number,
      value: 0
    },
    pageType: {
      type: String,
      value: 'cost' // 'cost' 或 'purchase'
    }
  },
  data: {
    statusBarHeight: 20,
    navBarContentHeight: 64,
    navBarHeight: 84,
    menuButtonInfo: null,
    leftWidth: 0,
    rightWidth: 0,

  },
  lifetimes: {
    attached() {
      const app = getApp();
       var windowWidth = app.globalData.windowWidth;
       var menuButtonInfo = app.globalData.menuButtonInfo;
       const navBarContentHeight = menuButtonInfo.height + (menuButtonInfo.top - statusBarHeight) * 2;
       var statusBarHeight = app.globalData.statusBarHeight;
       const navBarHeight = statusBarHeight + navBarContentHeight;
       const rightWidth = windowWidth - menuButtonInfo.left; // 右侧宽度
       const leftWidth = rightWidth; // 左侧宽度与右侧相同

      this.setData({
        statusBarHeight: app.globalData.statusBarHeight,
        navBarContentHeight: app.globalData.navBarContentHeight,
        // navBarHeight: app.globalData.navBarHeight,
        menuButtonInfo: app.globalData.menuButtonInfo,
        leftWidth: leftWidth,
        navBarHeight: navBarHeight,
        rightWidth: rightWidth,

      });
    }
  },

  methods: {
    navbuttontap() {
      this.triggerEvent('navbuttontap');
    },
    onSearchTap() {
      this.triggerEvent('searchtap');
    },
    onMinusTap() {
      this.triggerEvent('minustap');
    },
    onTabClick(event) {
      const index = event.currentTarget.dataset.index;
      const type = event.currentTarget.dataset.type;
      this.triggerEvent('tabclick', { index, type });
    }
  }
});

