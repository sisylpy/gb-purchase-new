/**
 * 平台 Tab 页统一布局（与 home 一致：固定顶栏 + scroll-view 100vh + padding-top）
 */
var HEADER = {
  HOME_CONTENT_RPX: 184,
  TITLE_BLOCK_RPX: 120,
  SNAPSHOT_SUB_RPX: 88,
  PROFILE_BLOCK_RPX: 200,
  CATALOG_BODY_MARGIN_RPX: 10,
  CATALOG_SUBCAT_RPX: 80
};

function getGlobalData() {
  var app = getApp();
  return (app && app.globalData) ? app.globalData : {};
}

function getWindowMetrics() {
  var windowInfo = wx.getWindowInfo();
  var globalData = getGlobalData();
  var rpxR = globalData.rpxR || (750 / windowInfo.windowWidth);
  var statusBarPx = globalData.statusBarHeight != null ? globalData.statusBarHeight : 20;
  var navContentPx = globalData.navBarHeight != null ? globalData.navBarHeight : 44;
  var navFullPx = statusBarPx + navContentPx;

  return {
    rpxR: rpxR,
    windowWidth: windowInfo.windowWidth * rpxR,
    windowHeight: windowInfo.windowHeight * rpxR,
    navBarHeight: navContentPx * rpxR,
    statusBarHeight: statusBarPx * rpxR,
    navBarFullHeight: navFullPx * rpxR,
    windowWidthPx: windowInfo.windowWidth,
    windowHeightPx: windowInfo.windowHeight,
    statusBarPx: statusBarPx,
    navContentPx: navContentPx,
    navFullPx: navFullPx
  };
}

/** home 同款：scrollTopPadding = statusBar + headerContent */
function calcScrollTopPadding(metrics, headerKind, options) {
  options = options || {};
  var extraRpx = options.headerExtraRpx || 0;
  if (headerKind === 'home') {
    return metrics.statusBarPx + (options.headerContentRpx || HEADER.HOME_CONTENT_RPX) / metrics.rpxR;
  }
  if (headerKind === 'navbar-dual') {
    return metrics.navFullPx + extraRpx / metrics.rpxR;
  }
  if (headerKind === 'title') {
    return metrics.statusBarPx + (options.headerContentRpx || HEADER.TITLE_BLOCK_RPX) / metrics.rpxR;
  }
  if (headerKind === 'profile') {
    return metrics.statusBarPx + (options.headerContentRpx || HEADER.PROFILE_BLOCK_RPX) / metrics.rpxR;
  }
  return metrics.statusBarPx;
}

function calcBodyHeightRpx(metrics, scrollTopPaddingPx) {
  return metrics.windowHeight - scrollTopPaddingPx * metrics.rpxR;
}

/**
 * 平台 5 个 Tab 页统一布局
 * @param {'home'|'navbar-dual'|'title'|'profile'} headerKind
 * @param {'scroll'|'catalog'} bodyKind  scroll=整页滚动 catalog=顶栏下双列独立滚动
 */
function applyPlatformTabLayout(pageInstance, pageTag, options) {
  options = options || {};
  var metrics = getWindowMetrics();
  var headerKind = options.headerKind || 'navbar-dual';
  var bodyKind = options.bodyKind || 'scroll';
  var scrollTopPaddingPx = calcScrollTopPadding(metrics, headerKind, options);
  var bodyHeightRpx = calcBodyHeightRpx(metrics, scrollTopPaddingPx);
  var bodyMargin = options.bodyMarginRpx != null
    ? options.bodyMarginRpx
    : HEADER.CATALOG_BODY_MARGIN_RPX;
  var subcatRow = options.subcatRowRpx != null ? options.subcatRowRpx : HEADER.CATALOG_SUBCAT_RPX;
  var listHeight = bodyHeightRpx - bodyMargin;
  var goodsListHeight = subcatRow > 0 ? listHeight - subcatRow : listHeight;

  var patch = {
    statusBarHeight: metrics.statusBarPx,
    navBarFullHeightPx: metrics.navFullPx,
    scrollTopPadding: scrollTopPaddingPx,
    windowWidth: metrics.windowWidth,
    windowHeight: metrics.windowHeight,
    windowWidthPx: metrics.windowWidthPx,
    windowHeightPx: metrics.windowHeightPx,
    navBarHeight: metrics.navBarHeight,
    navBarFullHeight: metrics.navBarFullHeight,
    bodyHeight: bodyHeightRpx > 100 ? bodyHeightRpx : 600,
    listHeight: listHeight > 100 ? listHeight : 600,
    goodsListHeight: goodsListHeight > 100 ? goodsListHeight : 520,
    mainBodyHeight: listHeight > 100 ? listHeight : 600
  };

  console.log('[pageLayout][' + (pageTag || 'tab') + ']', {
    headerKind: headerKind,
    bodyKind: bodyKind,
    scrollTopPaddingPx: scrollTopPaddingPx,
    bodyHeightRpx: patch.bodyHeight,
    listHeightRpx: patch.listHeight,
    goodsListHeightRpx: patch.goodsListHeight,
    windowHeightPx: metrics.windowHeightPx,
    navFullPx: metrics.navFullPx
  });

  pageInstance.setData(patch);
  return metrics;
}

/** @deprecated 分包旧页 resGoodsAi 用 */
function calcGoodsScrollHeight(metrics, extraOffsetRpx) {
  metrics = metrics || getWindowMetrics();
  var extra = extraOffsetRpx != null ? extraOffsetRpx : 0;
  return metrics.windowHeight - 200 - metrics.statusBarHeight - extra;
}

function applyPageMetrics(pageInstance, extraData, pageTag) {
  var extraOffsetRpx = extraData && extraData._layoutExtraRpx != null ? extraData._layoutExtraRpx : 0;
  var metrics = getWindowMetrics();
  var listHeight = calcGoodsScrollHeight(metrics, extraOffsetRpx);
  var patch = {
    windowWidth: metrics.windowWidth,
    windowHeight: metrics.windowHeight,
    navBarHeight: metrics.navBarHeight,
    statusBarHeight: metrics.statusBarHeight,
    navBarFullHeight: metrics.navBarFullHeight,
    listHeight: listHeight > 200 ? listHeight : 600
  };
  if (extraData) {
    var dataPatch = Object.assign({}, extraData);
    delete dataPatch._layoutExtraRpx;
    Object.assign(patch, dataPatch);
  }
  pageInstance.setData(patch);
  return metrics;
}

function applyTabCatalogMetrics(pageInstance, pageTag, options) {
  return applyPlatformTabLayout(pageInstance, pageTag, Object.assign({
    headerKind: 'navbar-dual',
    bodyKind: 'catalog'
  }, options || {}));
}

function logRenderedRects(pageInstance, selectors, pageTag) {
  if (!pageInstance || !selectors || !selectors.length) return;
  var query = pageInstance.createSelectorQuery();
  selectors.forEach(function (item) {
    query.select(item.selector).boundingClientRect();
  });
  query.exec(function (rects) {
    var result = {};
    selectors.forEach(function (item, index) {
      var rect = rects[index];
      result[item.name] = rect ? { top: rect.top, height: rect.height, bottom: rect.bottom } : null;
    });
    console.log('[pageLayout][' + (pageTag || 'page') + '] renderedRects(px)', result);
  });
}

module.exports = {
  HEADER: HEADER,
  getGlobalData: getGlobalData,
  getWindowMetrics: getWindowMetrics,
  calcScrollTopPadding: calcScrollTopPadding,
  applyPlatformTabLayout: applyPlatformTabLayout,
  calcGoodsScrollHeight: calcGoodsScrollHeight,
  applyPageMetrics: applyPageMetrics,
  applyTabCatalogMetrics: applyTabCatalogMetrics,
  logRenderedRects: logRenderedRects
};
