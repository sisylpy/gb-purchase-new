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
      
      // 当搜索框内容为空时，关闭键盘
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
      // 失去焦点时，不要自动退出搜索状态，让用户手动取消
      console.log('[main-navbar] 输入框失去焦点，当前搜索值:', this.data.searchValue);
      console.log('[main-navbar] 输入框失去焦点，事件详情:', e);
      // 注释掉自动退出搜索的逻辑，避免误触发
      // const value = this.data.searchValue || '';
      // if (!value) {
      //   console.log('[main-navbar] 输入框失去焦点且内容为空，退出搜索');
      //   this.triggerEvent('searchcancel');
      // }
    },
    onSearchFocus(e) {
      // 当切换按钮菜单显示时，点击搜索框自动关闭切换面板
      if (this.data.showSwitchMenu) {
        console.log('[main-navbar] 搜索框获得焦点，关闭切换菜单');
        this.setData({ showSwitchMenu: false });
      }
    },
  },
  observers: {
    'searchValue': function(value) {
      // 只有当搜索值真正变化时才更新搜索状态
      // 避免在搜索过程中意外清空搜索状态
      if (value !== undefined) {
        this.setData({ isSearching: !!value });
      }
    }
  },
});

