/**
 * 双按钮导航栏（集团首页：门店 + 设置）
 *
 * 与通用 navbar 分离，避免单/双按钮混用导致布局串版。
 * 规则：
 * - 标题：绝对铺满层，左右分别 padding；
 * - 左侧：图标/live + 「门店」「设置」横排，不与右侧胶囊抢位。
 */

Component({
  properties: {
    title: { type: String, value: '' },
    avatar: { type: String, value: '' },
    showBack: { type: Boolean, value: false },
    livePulse: { type: Boolean, value: false },
    secondaryText: { type: String, value: '门店' },
    primaryText: { type: String, value: '设置' },
  },

  data: {
    statusBarHeight: 20,
    navBarContentHeight: 44,
    navBarFullHeightPx: 64,
    titlePadLeftPx: 0,
    titlePadRightPx: 0,
    /** 标题最大宽度（屏宽 − 左右安全区），避免与左侧条、胶囊重叠 */
    titleMaxWidthPx: 200,
  },

  lifetimes: {
    attached: function () {
      this._layout();
    },
    ready: function () {
      this._layout();
    },
  },

  methods: {
    _layout: function () {
      var app = getApp();
      if (!app || !app.globalData) {
        return;
      }
      var gd = app.globalData;
      var ww = gd.windowWidth || 375;
      var mb = gd.menuButtonInfo;
      var sb = gd.statusBarHeight != null ? gd.statusBarHeight : 20;
      if (!mb || mb.left == null) {
        return;
      }
      var r = ww / 750;
      var navContentH = mb.height + (mb.top - sb) * 2;
      var fullH = sb + navContentH;
      /** 左侧：头像/live + 双按钮占位，标题左侧让开 */
      var leftClusterPx = Math.ceil(300 * r);
      var rightGapPx =
        mb.right != null
          ? Math.max(Math.ceil(100 * r), Math.floor(ww - mb.right) + Math.ceil(16 * r))
          : Math.ceil(120 * r);
      var titlePadRightPx = rightGapPx;
      var titlePadLeftPx = Math.min(
        Math.floor(ww * 0.48),
        leftClusterPx + Math.ceil(16 * r)
      );
      /** 标题以屏幕中心为轴居中，宽度不超过左右安全区内侧 */
      var titleMaxWidthPx = Math.max(
        80,
        ww - titlePadLeftPx - titlePadRightPx
      );

      this.setData({
        statusBarHeight: sb,
        navBarContentHeight: navContentH,
        navBarFullHeightPx: fullH,
        titlePadLeftPx: titlePadLeftPx,
        titlePadRightPx: titlePadRightPx,
        titleMaxWidthPx: titleMaxWidthPx,
      });
    },

    onNavTap: function () {
      this.triggerEvent('navbuttontap', {}, { bubbles: true, composed: true });
    },

    onSecondaryTap: function () {
      console.log('[navbar-dual] secondarynavtap 点击「门店」', {
        secondaryText: this.properties.secondaryText,
      });
      this.triggerEvent('secondarynavtap', {}, { bubbles: true, composed: true });
    },
  },
});
