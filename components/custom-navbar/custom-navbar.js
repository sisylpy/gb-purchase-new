
Component({
  properties: {
    title: {
      type: String,
      value: '页面标题'
    },
    avatar: {
      type: String,
      value: '/images/avatar.png'
    },
    buttonText: {
      type: String,
      value: '按钮'
    }
  },
  data: {
    statusBarHeight: 20,
    navBarContentHeight: 44,
    navBarHeight: 64,
    menuButtonInfo: null,
    navBarContentHeight: 44,
    leftWidth: 0,
    rightWidth: 0,

  },
  lifetimes: {
    attached() {
      const app = getApp();
      // console.log("jssssss" , app.globalData)
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
        navBarHeight: app.globalData.navBarHeight,
        menuButtonInfo: app.globalData.menuButtonInfo,
        leftWidth: leftWidth,
        navBarHeight: navBarHeight,
        rightWidth: rightWidth

      });
      console.log("leeeee", leftWidth , "rihgll==", rightWidth)

    }
  },
  methods: {
    navbuttontap() {
      this.triggerEvent('navbuttontap');
    }
  }
});

