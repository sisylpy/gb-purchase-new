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
    },
    searchValue: {
      type: String,
      value: ''
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
    showSwitchMenu: false,
    isSearching: false,
    currentType: "time"
  },
  lifetimes: {
    attached() {
      const app = getApp();
       var windowWidth = app.globalData.windowWidth;
       var menuButtonInfo = app.globalData.menuButtonInfo;
       const navBarContentHeight = menuButtonInfo.height + (menuButtonInfo.top - statusBarHeight) * 2;
       var statusBarHeight = app.globalData.statusBarHeight;
       const navBarHeight = statusBarHeight + navBarContentHeight;

       
       const rightWidth = windowWidth - menuButtonInfo.left;
       const leftWidth = rightWidth;

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
    onNavButtonTapBack() {
      this.triggerEvent('navbuttontap');
    },
    onSwitchBtnTap() {
      console.log('[main-navbar] 点击了切换按钮');
      this.setData({ showSwitchMenu: true });
    },
    onSwitchMenuMask() {
      console.log('[main-navbar] 点击了遮罩层，关闭菜单');
      this.setData({ showSwitchMenu: false });
    },
    
    onSortByTime() {
      console.log('[main-navbar] 点击了按时间');
      this.setData({ showSwitchMenu: false ,currentType: "time"});
     
      this.triggerEvent('sortby', { type: 'time' });
    },
    onSortByCategory() {
      console.log('[main-navbar] 点击了按类别');
      this.setData({ showSwitchMenu: false ,currentType: "category"});

      this.triggerEvent('sortby', { type: 'category' });
    },
    noop() {
      console.log('[main-navbar] catchtap noop 被触发');
    },
    onSearchInput(e) {
      const value = e.detail.value;
      console.log('[main-navbar] 输入框内容变化:', value);
      this.setData({ isSearching: !!value });
      this.triggerEvent('searchinput', { value });
      
      if (!value) {
        wx.hideKeyboard();
      }
    },
    onCancelSearch() {
      console.log('[main-navbar] 点击取消搜索');
      this.setData({ isSearching: false });
      this.triggerEvent('searchcancel');
    },
    onSearchBlur(e) {
      console.log('[main-navbar] 输入框失去焦点，当前搜索值:', this.data.searchValue);
      console.log('[main-navbar] 输入框失去焦点，事件详情:', e);
    },
    onSearchFocus(e) {
      if (this.data.showSwitchMenu) {
        console.log('[main-navbar] 搜索框获得焦点，关闭切换菜单');
        this.setData({ showSwitchMenu: false });
      }
    },
  },
  observers: {
    'searchValue': function(value) {
      if (value !== undefined) {
        this.setData({ isSearching: !!value });
      }
    }
  },
});
