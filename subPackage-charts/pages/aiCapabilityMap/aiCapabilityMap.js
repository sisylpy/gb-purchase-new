/**
 * 手机端「AI 能帮我做什么」完整能力导航页
 * 数据来源：GET /api/ai/capability-map（后端统一能力目录，按业务分类分组）
 * 点击示例问题带回由后端 Catalog 投影的 entry object，不自动发送、不覆盖用户已输入内容。
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
    var contractId = e.currentTarget.dataset.contractId;
    if (!text || !contractId) return;
    // contractId 只是客户端入口声明；服务端仍会按 ACTIVE Catalog、产品面、权限和 example 关系复核。
    wx.setStorageSync('aiCapabilityEntry', {
      text: text,
      entryContractId: contractId,
      entrySource: 'CAPABILITY_EXAMPLE',
    });
    wx.navigateBack();
  },

  onBack: function () {
    wx.navigateBack();
  },
});
