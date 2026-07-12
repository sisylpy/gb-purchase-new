var navbarGeom = require('../../lib/navbarGeom');

Component({
  properties: {
    title: {
      type: String,
      value: '页面标题'
    },
    avatar: {
      type: String,
      value: '/images/user.png'
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
      this.setData(navbarGeom.calcSimpleNavBar(app.globalData));
    }
  },

  methods: {
    navbuttontap() {
      this.triggerEvent('navbuttontap');
    }
  }
});
