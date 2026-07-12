// 标准胶囊式导航栏几何参数计算（消除各 navbar 组件重复的高度计算代码）。
//
// 行为约定（与现有 5 个 navbar 组件渲染保持一致）：
//   - navBarContentHeight 沿用 app.globalData.navBarContentHeight（iOS 44 / 其他 48 估值），
//     不做修改，避免改动标题内容区的渲染高度。
//   - navBarHeight 采用胶囊真实尺寸公式计算：
//       statusBarHeight + (menuButtonInfo.height + (menuButtonInfo.top - statusBarHeight) * 2)
//     该公式与 app.js 中全局 navBarHeight(= bottom + top - statusBarHeight) 数学等价。
//   - leftWidth / rightWidth 按 (windowWidth - menuButtonInfo.left) 计算，左右对称。
function calcSimpleNavBar(globalData) {
  var windowWidth = globalData.windowWidth;
  var menuButtonInfo = globalData.menuButtonInfo;
  var statusBarHeight = globalData.statusBarHeight;
  var navBarContentHeight = globalData.navBarContentHeight;
  var navBarHeight = statusBarHeight + (menuButtonInfo.height + (menuButtonInfo.top - statusBarHeight) * 2);
  var rightWidth = windowWidth - menuButtonInfo.left;
  var leftWidth = rightWidth;

  return {
    statusBarHeight: statusBarHeight,
    navBarContentHeight: navBarContentHeight,
    navBarHeight: navBarHeight,
    menuButtonInfo: menuButtonInfo,
    leftWidth: leftWidth,
    rightWidth: rightWidth
  };
}

module.exports = { calcSimpleNavBar: calcSimpleNavBar };
