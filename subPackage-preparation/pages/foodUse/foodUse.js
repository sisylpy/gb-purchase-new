var app = getApp();
var api = require('../../../services/preparation');
var util = require('../../../utils/preparation');

Page({
  data: {
    navBarHeight: 0,
    loading: true,
    submitting: false,
    completed: false,
    foods: [],
    filteredFoods: [],
    foodKeyword: '',
    foodIndex: -1,
    showFoodPicker: false,
    versions: [],
    versionIndex: -1,
    recipe: null,
    components: [],
    portions: '',
    producedDate: '',
    producedTime: '',
    idempotencyKey: '',
    showBatchPicker: false,
    batchPicker: { componentIndex: -1, lineIndex: -1, keyword: '', rows: [], filteredRows: [] },
    result: null,
  },

  onLoad: function (options) {
    this.identity = util.getIdentity();
    this.departmentId = Number(wx.getStorageSync('preparationDepartmentId'));
    this.preselectedProductId = options.productId ? Number(options.productId) : null;
    this.preselectedBatchId = options.batchId ? Number(options.batchId) : null;
    this.lineSeed = 1;
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      producedDate: util.localDate(),
      producedTime: util.localTime(),
      idempotencyKey: api.createIdempotencyKey('FOOD-USE'),
    });
    this.loadFoods();
  },

  loadFoods: function () {
    var that = this;
    api.listFoodTree(this.identity.distributerId).then(function (tree) {
      var foods = util.flattenFoods(tree).filter(function (row) { return row.recipeModel === 'VERSIONED'; });
      that.setData({ loading: false, foods: foods, filteredFoods: foods });
    }).catch(function (error) { that.setData({ loading: false }); util.showError(error); });
  },

  openFoodPicker: function () { this.setData({ showFoodPicker: true, foodKeyword: '', filteredFoods: this.data.foods }); },
  closeFoodPicker: function () { this.setData({ showFoodPicker: false }); },
  onFoodSearch: function (event) {
    var keyword = String(event.detail.value || '').trim().toLowerCase();
    this.setData({
      foodKeyword: keyword,
      filteredFoods: this.data.foods.filter(function (row) {
        return !keyword || String(row.foodName || '').toLowerCase().indexOf(keyword) >= 0 || String(row.categoryName || '').toLowerCase().indexOf(keyword) >= 0;
      }),
    });
  },
  chooseFood: function (event) {
    var foodId = Number(event.currentTarget.dataset.id);
    var index = this.data.foods.findIndex(function (row) { return Number(row.foodId) === foodId; });
    this.setData({ showFoodPicker: false, foodIndex: index, versions: [], versionIndex: -1, components: [], loading: true });
    this.loadFoodRecipe(this.data.foods[index]);
  },

  loadFoodRecipe: function (food) {
    var that = this;
    api.getFoodRecipeByFood(food.foodId, this.identity.distributerId).then(function (detail) {
      return api.listFoodVersions(detail.recipe.id, that.identity.distributerId).then(function (versions) {
        versions = (versions || []).filter(function (row) { return row.status === 'PUBLISHED'; });
        if (!versions.length) throw { preparationError: true, status: 409, message: '该 VERSIONED 菜品没有已发布配方版本' };
        var currentIndex = versions.findIndex(function (row) { return String(row.id) === String(detail.recipe.currentPublishedVersionId); });
        if (currentIndex < 0) currentIndex = 0;
        that.setData({
          versions: versions.map(function (row) { return Object.assign({}, row, { label: 'V' + row.versionNo }); }),
          versionIndex: currentIndex,
          recipe: detail.recipe,
        });
        return that.loadVersion(detail.recipe.id, versions[currentIndex].id);
      });
    }).catch(function (error) { that.setData({ loading: false }); util.showError(error); });
  },

  onVersionChange: function (event) {
    var index = Number(event.detail.value || 0);
    this.setData({ versionIndex: index, loading: true });
    this.loadVersion(this.data.recipe.id, this.data.versions[index].id);
  },

  loadVersion: function (recipeId, versionId) {
    var that = this;
    return api.getFoodRecipe(recipeId, this.identity.distributerId, versionId).then(function (detail) {
      var componentRows = (detail.components || []).filter(function (row) { return row.itemKind === 'INTERMEDIATE_PRODUCT'; });
      if (!componentRows.length) throw { preparationError: true, status: 400, message: '已发布菜品配方没有中间制品组件，不能进入本流程' };
      return Promise.all(componentRows.map(function (row) {
        return Promise.all([
          api.getProduct(row.intermediateProductId, that.identity.distributerId),
          api.listAvailableBatches(row.intermediateProductId, that.identity.distributerId, that.departmentId),
        ]).then(function (results) {
          var product = results[0];
          var batches = (results[1] || []).map(function (batch) {
            return Object.assign({}, batch, {
              display: batch.batchNo + ' · 剩余 ' + util.formatNumber(batch.remainingQuantity, 6) + ' ' + product.baseUnitCode + ' · 到期 ' + util.timePart(batch.expiresAt),
            });
          });
          var line = that.newLine(row.inputUnitCode || product.baseUnitCode);
          if (that.preselectedProductId === row.intermediateProductId && that.preselectedBatchId) {
            var selected = batches.find(function (batch) { return Number(batch.intermediateBatchId) === that.preselectedBatchId; });
            if (selected) line.batch = selected;
          }
          return Object.assign({}, row, {
            productName: product.productName,
            baseUnitCode: product.baseUnitCode,
            batches: batches,
            lines: [line],
            standardRequiredText: '—',
            actualUsedText: '0',
            varianceText: '—',
          });
        });
      })).then(function (components) {
        that.setData({ loading: false, components: components });
        that.recalculate();
      });
    }).catch(function (error) { that.setData({ loading: false }); util.showError(error); });
  },

  newLine: function (unit) {
    return { localId: this.lineSeed++, batch: null, usedQuantity: '', inputUnitCode: unit || '' };
  },
  addLine: function (event) {
    var index = Number(event.currentTarget.dataset.index);
    var components = this.data.components.slice();
    components[index].lines.push(this.newLine(components[index].inputUnitCode));
    this.setData({ components: components });
  },
  removeLine: function (event) {
    var component = Number(event.currentTarget.dataset.component);
    var line = Number(event.currentTarget.dataset.line);
    var components = this.data.components.slice();
    if (components[component].lines.length > 1) components[component].lines.splice(line, 1);
    this.setData({ components: components });
    this.recalculate();
  },
  onPortionsInput: function (event) { this.setData({ portions: event.detail.value }); this.recalculate(); },
  onUsedInput: function (event) {
    var component = Number(event.currentTarget.dataset.component);
    var line = Number(event.currentTarget.dataset.line);
    this.setData({ ['components[' + component + '].lines[' + line + '].usedQuantity']: event.detail.value });
    this.recalculate();
  },
  onDateChange: function (event) { this.setData({ producedDate: event.detail.value }); },
  onTimeChange: function (event) { this.setData({ producedTime: event.detail.value }); },

  recalculate: function () {
    var portions = Number(this.data.portions || 0);
    var components = this.data.components.map(function (row) {
      var standard = Number(row.quantityPerPortion || 0) * portions;
      var actual = row.lines.reduce(function (sum, line) { return sum + Number(line.usedQuantity || 0); }, 0);
      return Object.assign({}, row, {
        standardRequiredText: portions > 0 ? util.formatNumber(standard, 6) : '—',
        actualUsedText: util.formatNumber(actual, 6),
        varianceText: portions > 0 ? util.formatNumber(actual - standard, 6) : '—',
      });
    });
    this.setData({ components: components });
  },

  openBatchPicker: function (event) {
    var componentIndex = Number(event.currentTarget.dataset.component);
    var lineIndex = Number(event.currentTarget.dataset.line);
    var rows = this.data.components[componentIndex].batches || [];
    this.setData({
      showBatchPicker: true,
      batchPicker: { componentIndex: componentIndex, lineIndex: lineIndex, keyword: '', rows: rows, filteredRows: rows },
    });
  },
  closeBatchPicker: function () { this.setData({ showBatchPicker: false }); },
  onBatchSearch: function (event) {
    var keyword = String(event.detail.value || '').trim().toLowerCase();
    this.setData({
      'batchPicker.keyword': keyword,
      'batchPicker.filteredRows': this.data.batchPicker.rows.filter(function (row) {
        return !keyword || String(row.batchNo || '').toLowerCase().indexOf(keyword) >= 0 || String(row.intermediateBatchId).indexOf(keyword) >= 0;
      }),
    });
  },
  chooseBatch: function (event) {
    var batch = event.currentTarget.dataset.item;
    var path = 'components[' + this.data.batchPicker.componentIndex + '].lines[' + this.data.batchPicker.lineIndex + '].batch';
    this.setData({ [path]: batch, showBatchPicker: false });
  },

  submit: function () {
    if (this.data.submitting) return;
    var food = this.data.foods[this.data.foodIndex];
    var version = this.data.versions[this.data.versionIndex];
    if (!food || !version || !(Number(this.data.portions) > 0)) {
      wx.showToast({ title: '请选择菜品配方并填写实际制作份数', icon: 'none' });
      return;
    }
    var lines = [];
    for (var i = 0; i < this.data.components.length; i++) {
      var component = this.data.components[i];
      for (var j = 0; j < component.lines.length; j++) {
        var line = component.lines[j];
        if (!line.batch || !(Number(line.usedQuantity) > 0)) {
          wx.showToast({ title: '请为每一行选择可用批次并填写实际使用量', icon: 'none' });
          return;
        }
        lines.push({
          recipeComponentId: component.id,
          intermediateBatchId: line.batch.intermediateBatchId,
          usedQuantity: Number(line.usedQuantity),
          inputUnitCode: line.inputUnitCode,
          expectedBatchRowVersion: line.batch.rowVersion,
        });
      }
    }
    var that = this;
    this.setData({ submitting: true });
    api.createFoodUse({
      distributerId: this.identity.distributerId,
      foodId: food.foodId,
      foodRecipeVersionId: version.id,
      producedPortionCount: Number(this.data.portions),
      usedDepartmentId: this.departmentId,
      producedAt: util.toLocalDateTime(this.data.producedDate, this.data.producedTime),
      idempotencyKey: this.data.idempotencyKey,
      operatorId: this.identity.operatorId,
      intermediateLines: lines,
    }).then(function (result) {
      var netZero = Number(result.recordedIntermediateCost) === 0 && (result.intermediateLines || []).length > 0;
      that.setData({
        submitting: false,
        completed: true,
        result: Object.assign({}, result, {
          totalCostText: util.formatMoney(result.recordedIntermediateCost),
          perPortionText: util.formatMoney(result.recordedIntermediateCostPerPortion),
          netZero: netZero,
        }),
      });
    }).catch(function (error) { that.setData({ submitting: false }); util.showError(error); });
  },
  toRecords: function () { wx.redirectTo({ url: '/subPackage-preparation/pages/records/records?type=use' }); },
  noop: function () {},
  toBack: function () { wx.navigateBack({ delta: 1 }); },
});
