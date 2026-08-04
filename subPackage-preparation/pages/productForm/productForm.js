var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');

Page({
  data: {
    navBarHeight: 0,
    id: null,
    editing: false,
    loading: true,
    submitting: false,
    departments: [],
    departmentIndex: 0,
    dimensions: [
      { value: 'MASS', label: '重量', baseUnit: 'G' },
      { value: 'VOLUME', label: '容量', baseUnit: 'ML' },
      { value: 'COUNT', label: '计数', baseUnit: 'EA' },
    ],
    dimensionIndex: 0,
    shelfUnits: [
      { value: 'MINUTE', label: '分钟', factor: 1 },
      { value: 'HOUR', label: '小时', factor: 60 },
      { value: 'DAY', label: '天', factor: 1440 },
    ],
    shelfUnitIndex: 1,
    form: {
      productCode: '',
      productName: '',
      preparationDepartmentId: '',
      unitDimension: 'MASS',
      baseUnitCode: 'G',
      shelfLifeValue: '24',
      storageNote: '',
      unitLocked: 0,
      rowVersion: 0,
    },
  },

  onLoad: function (options) {
    this.identity = util.getIdentity();
    var id = options && options.id ? Number(options.id) : null;
    this.setData({
      id: id,
      editing: !!id,
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
    });
    this.loadInitial();
  },

  loadInitial: function () {
    var that = this;
    var capabilityPromise = api.listCapabilities(this.identity.distributerId);
    var productPromise = this.data.id
      ? api.getProduct(this.data.id, this.identity.distributerId)
      : Promise.resolve(null);
    Promise.all([capabilityPromise, productPromise]).then(function (results) {
      var departments = util.enabledPreparationDepartments(results[0], that.identity);
      var product = results[1];
      var selected = util.selectCurrentDepartment(departments, that.identity);
      var form = Object.assign({}, that.data.form);
      var dimensionIndex = 0;
      var shelfUnitIndex = 1;
      if (product) {
        dimensionIndex = that.data.dimensions.findIndex(function (row) { return row.value === product.unitDimension; });
        if (dimensionIndex < 0) dimensionIndex = 0;
        var minutes = Number(product.shelfLifeMinutes || 0);
        var shelfValue = minutes;
        if (minutes % 1440 === 0) {
          shelfValue = minutes / 1440;
          shelfUnitIndex = 2;
        } else if (minutes % 60 === 0) {
          shelfValue = minutes / 60;
          shelfUnitIndex = 1;
        } else {
          shelfUnitIndex = 0;
        }
        form = {
          productCode: product.productCode || '',
          productName: product.productName || '',
          preparationDepartmentId: product.preparationDepartmentId,
          unitDimension: product.unitDimension,
          baseUnitCode: product.baseUnitCode,
          shelfLifeValue: String(shelfValue),
          storageNote: product.storageNote || '',
          unitLocked: Number(product.unitLocked || 0),
          rowVersion: Number(product.rowVersion || 0),
        };
      } else if (selected) {
        form.preparationDepartmentId = selected.departmentId;
      }
      var departmentIndex = departments.findIndex(function (row) {
        return String(row.departmentId) === String(form.preparationDepartmentId);
      });
      that.setData({
        loading: false,
        departments: departments,
        departmentIndex: departmentIndex < 0 ? 0 : departmentIndex,
        dimensionIndex: dimensionIndex,
        shelfUnitIndex: shelfUnitIndex,
        form: form,
      });
    }).catch(function (error) {
      that.setData({ loading: false });
      util.showError(error);
    });
  },

  onInput: function (event) {
    var field = event.currentTarget.dataset.field;
    this.setData({ ['form.' + field]: event.detail.value });
  },

  onDepartmentChange: function (event) {
    var index = Number(event.detail.value || 0);
    var row = this.data.departments[index];
    this.setData({
      departmentIndex: index,
      'form.preparationDepartmentId': row ? row.departmentId : '',
    });
  },

  onDimensionChange: function (event) {
    var index = Number(event.detail.value || 0);
    var row = this.data.dimensions[index];
    this.setData({
      dimensionIndex: index,
      'form.unitDimension': row.value,
      'form.baseUnitCode': row.baseUnit,
    });
  },

  onShelfUnitChange: function (event) {
    this.setData({ shelfUnitIndex: Number(event.detail.value || 0) });
  },

  submit: function () {
    if (this.data.submitting) return;
    var form = this.data.form;
    var shelfUnit = this.data.shelfUnits[this.data.shelfUnitIndex];
    var shelfLifeMinutes = Number(form.shelfLifeValue) * shelfUnit.factor;
    if (!String(form.productCode || '').trim() || !String(form.productName || '').trim()) {
      wx.showToast({ title: '请填写产品编码和名称', icon: 'none' });
      return;
    }
    if (!form.preparationDepartmentId) {
      wx.showToast({ title: '请选择具备 PREPARATION 能力的部门', icon: 'none' });
      return;
    }
    if (!(shelfLifeMinutes > 0)) {
      wx.showToast({ title: '保质期必须大于 0', icon: 'none' });
      return;
    }
    var body = {
      distributerId: this.identity.distributerId,
      productCode: String(form.productCode).trim(),
      productName: String(form.productName).trim(),
      preparationDepartmentId: Number(form.preparationDepartmentId),
      unitDimension: form.unitDimension,
      baseUnitCode: form.baseUnitCode,
      shelfLifeMinutes: shelfLifeMinutes,
      storageNote: String(form.storageNote || '').trim() || null,
      operatorId: this.identity.operatorId,
    };
    if (this.data.editing) body.rowVersion = Number(form.rowVersion);
    var that = this;
    this.setData({ submitting: true });
    var promise = this.data.editing
      ? api.updateProduct(this.data.id, body)
      : api.createProduct(body);
    promise.then(function (result) {
      that.setData({ submitting: false });
      wx.showToast({ title: that.data.editing ? '已保存' : '已创建', icon: 'success' });
      if (that.data.editing) {
        setTimeout(function () { wx.navigateBack({ delta: 1 }); }, 500);
      } else {
        setTimeout(function () {
          wx.redirectTo({ url: '/subPackage-preparation/pages/productDetail/productDetail?id=' + result.id });
        }, 500);
      }
    }).catch(function (error) {
      that.setData({ submitting: false });
      util.showError(error);
    });
  },

  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
