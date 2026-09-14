/**
 * 手机端「AI 能帮我做什么」完整能力导航页
 * 数据来源：GET /api/ai/capability-map（后端统一能力目录，按业务分类分组）
 * 点击示例问题仅带回 AI 输入框，不自动发送、不覆盖用户已输入内容。
 */
var ai = require('../../../services/aiChatApi');

Page({
  data: {
    groups: [],
    loading: true,
    expandedGroup: '',
    navBarHeight: 64,
  },

  onLoad: function () {
    this._loadCapabilities();
  },

  _loadCapabilities: function () {
    var that = this;
    ai.getCapabilityMap()
      .then(function (res) {
        var data = (res && res.result && res.result.data) || (res && res.data) || [];
        var groups = Array.isArray(data) ? data : [];
        that.setData({ groups: groups, loading: false });
      })
      .catch(function () {
        that.setData({ loading: false });
        wx.showToast({ title: '能力目录加载失败', icon: 'none' });
      });
  },

  onGroupTap: function (e) {
    var category = e.currentTarget.dataset.category;
    var next = this.data.expandedGroup === category ? '' : category;
    this.setData({ expandedGroup: next });
  },

  onQuestionTap: function (e) {
    var text = e.currentTarget.dataset.text;
    if (!text) return;
    // 通过 storage 传回 aiChat 页面，填入输入框（不自动发送）
    wx.setStorageSync('aiCapabilityQuestion', text);
    wx.navigateBack();
  },

  onBack: function () {
    wx.navigateBack();
  },
});
