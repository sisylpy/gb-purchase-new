var navbarGeom = require('../../lib/navbarGeom');

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
      value: '/images/user.png'
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
      this.setData(navbarGeom.calcSimpleNavBar(app.globalData));
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
