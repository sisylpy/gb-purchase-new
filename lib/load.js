/**
 * Loading 工具函数
 * @module lib/load
 */

function showLoading(message) {
  if (wx.showLoading) {
    wx.showLoading({
      title: message,
      mask: true,
    });
  } else {
    wx.showToast({
      title: message,
      icon: 'loading',
      mask: true,
      duration: 20000,
    });
  }
}

function hideLoading() {
  if (wx.hideLoading) {
    wx.hideLoading();
  } else {
    wx.hideToast();
  }
}

module.exports = {
  showLoading: showLoading,
  hideLoading: hideLoading,
};
