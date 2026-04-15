/**
 * 本地存储封装
 * @module lib/storage
 */

var PREFIX = 'jj_';

module.exports = {
  get: function (key, defaultValue) {
    if (typeof defaultValue === 'undefined') defaultValue = null;
    try {
      var value = wx.getStorageSync(PREFIX + key);
      return value !== '' && value !== undefined ? value : defaultValue;
    } catch (e) {
      console.error('[Storage] get error:', key, e);
      return defaultValue;
    }
  },

  set: function (key, value) {
    try {
      wx.setStorageSync(PREFIX + key, value);
    } catch (e) {
      console.error('[Storage] set error:', key, e);
    }
  },

  remove: function (key) {
    try {
      wx.removeStorageSync(PREFIX + key);
    } catch (e) {
      console.error('[Storage] remove error:', key, e);
    }
  },

  clear: function () {
    try {
      wx.clearStorageSync();
    } catch (e) {
      console.error('[Storage] clear error:', e);
    }
  },
};
