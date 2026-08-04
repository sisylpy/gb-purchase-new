var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');

Page({
  data: {
    navBarHeight: 0,
    loading: true,
    submitting: false,
    products: [],
    productIndex: -1,
    versions: [],
    versionIndex: -1,
    departments: [],
    departmentIndex: 0,
    idempotencyKey: '',
  },

  onLoad: function () {
    this.identity = util.getIdentity();
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      idempotencyKey: api.createIdempotencyKey('BATCH-CREATE'),
    });
    this.loadInitial();
  },

  loadInitial: function () {
    var that = this;
    Promise.all([
      api.listProducts(this.identity.distributerId, 'ENABLED'),
      api.listCapabilities(this.identity.distributerId),
    ]).then(function (results) {
      var departments = util.enabledPreparationDepartments(results[1], that.identity);
      var selected = util.selectCurrentDepartment(departments, that.identity);
      var departmentIndex = departments.findIndex(function (row) {
        return selected && String(row.departmentId) === String(selected.departmentId);
      });
      that.setData({
        loading: false,
        products: results[0] || [],
        departments: departments,
        departmentIndex: departmentIndex < 0 ? 0 : departmentIndex,
      });
    }).catch(function (error) {
      that.setData({ loading: false });
      util.showError(error);
    });
  },

  onProductChange: function (event) {
    var index = Number(event.detail.value || 0);
    var product = this.data.products[index];
    var that = this;
    this.setData({ productIndex: index, versions: [], versionIndex: -1, loading: true });
    api.listPublishedRecipeVersions(product.id, this.identity.distributerId).then(function (versions) {
      that.setData({ loading: false, versions: versions || [], versionIndex: versions && versions.length ? 0 : -1 });
      if (!versions || !versions.length) {
        wx.showModal({ title: '没有可用配方', content: '该中间制品尚无已发布配方，请先发布配方版本。', showCancel: false });
      }
    }).catch(function (error) {
      that.setData({ loading: false });
      util.showError(error);
    });
  },

  onVersionChange: function (event) { this.setData({ versionIndex: Number(event.detail.value || 0) }); },
  onDepartmentChange: function (event) { this.setData({ departmentIndex: Number(event.detail.value || 0) }); },

  submit: function () {
    if (this.data.submitting) return;
    var product = this.data.products[this.data.productIndex];
    var version = this.data.versions[this.data.versionIndex];
    var department = this.data.departments[this.data.departmentIndex];
    if (!product || !version || !department) {
      wx.showToast({ title: '请完整选择中间制品、已发布配方和部门', icon: 'none' });
      return;
    }
    var that = this;
    this.setData({ submitting: true });
    api.createBatch({
      distributerId: this.identity.distributerId,
      departmentId: department.departmentId,
      intermediateProductId: product.id,
      recipeVersionId: version.recipeVersionId,
      idempotencyKey: this.data.idempotencyKey,
      operatorId: this.identity.operatorId,
    }).then(function (result) {
      that.setData({ submitting: false });
      wx.redirectTo({ url: '/subPackage-preparation/pages/batchDetail/batchDetail?batchId=' + result.batchId });
    }).catch(function (error) {
      that.setData({ submitting: false });
      util.showError(error);
    });
  },
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
