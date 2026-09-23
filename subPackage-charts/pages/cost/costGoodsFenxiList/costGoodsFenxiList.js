var dateUtils = require('../../../../lib/dateUtil');
var api = require('../../../services/api.js');
var config = require('../../../../config/index');
var load = require('../../../../lib/load.js');
var globalData = getApp().globalData;

function numberValue(value) {
  var number = parseFloat(String(value == null ? 0 : value).replace(/,/g, ''));
  return isNaN(number) ? 0 : number;
}

function money(value) {
  return numberValue(value).toFixed(2).replace(/\.00$/, '');
}

function shortDate(value) {
  var parts = String(value || '').split('-');
  return parts.length === 3 ? Number(parts[1]) + '月' + Number(parts[2]) + '日' : value;
}

function imageUrl(path) {
  if (!path) return '/images/logo.jpg';
  if (/^https?:\/\//.test(path)) return path;
  return (config.server || '').replace(/\/$/, '') + '/'
    + String(path).replace(/^\//, '').split('/').map(encodeURIComponent).join('/');
}

function idString(value) {
  return value == null ? '' : String(value);
}

function positiveId(value) {
  var resolved = Number(value || 0);
  return resolved > 0 ? resolved : 0;
}

function storeRootDepartmentId(department) {
  var row = department || {};
  return positiveId(row.gbDepartmentFatherId) || positiveId(row.gbDepartmentId);
}

function categoryIcon(name) {
  if (/蔬菜/.test(name)) return '♧';
  if (/肉|禽|蛋/.test(name)) return '◉';
  if (/水产|海鲜/.test(name)) return '◆';
  if (/冻/.test(name)) return '❄';
  if (/调料|干货/.test(name)) return '♨';
  if (/米|面|粮油/.test(name)) return '▰';
  return '▦';
}

function categoryImageUrl(row) {
  var path = row.gbDfgFatherGoodsImg || row.gbDfgFatherGoodsImgLarge;
  return path ? imageUrl(path) : '';
}

function catalogCategory(row) {
  var name = row.gbDfgFatherGoodsName || '未命名分类';
  return {
    id: idString(row.gbDistributerFatherGoodsId),
    name: name,
    imageUrl: categoryImageUrl(row),
    icon: categoryIcon(name),
    count: 0
  };
}

function ingredientRow(raw) {
  var rate = numberValue(raw.devianceRate);
  var tone = Math.abs(rate) >= 25 ? 'danger' : Math.abs(rate) >= 10 ? 'warn' : 'ok';
  var dishes = raw.supportedDishes || [];
  return Object.assign({}, raw, {
    name: raw.gbDgGoodsName || '未命名原料',
    imageUrl: imageUrl(raw.gbDgGoodsFileImg),
    categoryId: idString(raw.gbDgDfgGoodsGreatId),
    amountText: money(raw.outboundTotalAmount),
    rateText: (rate > 0 ? '+' : '') + money(rate) + '%',
    dishCount: dishes.length,
    dishNames: dishes.slice(0, 3).map(function (item) { return item.dishName; }).join('、'),
    statusText: tone === 'danger' ? '重点关注' : tone === 'warn' ? '建议核查' : '正常',
    tone: tone
  });
}

Page({
  data: {
    navBarHeight: 0,
    hanzi: '本月',
    dateText: '',
    status: 'all',
    statusLabel: '全部出库',
    sortBy: 'outbound',
    sortLabel: '出库金额',
    sortOrder: 'desc',
    categoryId: '',
    categoryName: '',
    catalogCategories: [],
    categories: [],
    allRows: [],
    rows: [],
    search: ''
  },

  onLoad: function (options) {
    options = options || {};
    this._hasShownOnce = false;
    var dis = wx.getStorageSync('disInfo') || {};
    var dep = wx.getStorageSync('depInfo') || {};
    var store = wx.getStorageSync('mendianInfo') || {};
    this.setData({
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      disId: options.disId || dis.gbDistributerId,
      depFatherId: positiveId(options.depFatherId)
        || storeRootDepartmentId(store)
        || storeRootDepartmentId(dep)
        || '',
      searchDepId: options.searchDepId || '-1'
    });
    this.syncDate();
    this.loadCategories();
  },

  onShow: function () {
    // onLoad 后会先加载分类并请求一次数据；后续每次回到本页都刷新，
    // 避免后端发布、配方修改或从详情页返回后继续展示旧的关联菜品数量。
    if (!this._hasShownOnce) {
      this._hasShownOnce = true;
      return;
    }
    this.setData({ updateDate: false });
    this.syncDate();
    this.loadData();
  },

  syncDate: function () {
    var saved = wx.getStorageSync('myDate');
    var range = saved
      ? (saved.name === 'custom'
        ? dateUtils.getDateRange(saved.name, saved.startDate, saved.stopDate)
        : dateUtils.getDateRange(saved.name))
      : { startDate: dateUtils.getFirstDateInMonth(), stopDate: dateUtils.getArriveDate(0), name: '本月' };
    this.setData({
      startDate: range.startDate,
      stopDate: range.stopDate,
      hanzi: (saved && saved.hanzi) || range.name || '本月',
      dateText: shortDate(range.startDate) + ' - ' + shortDate(range.stopDate)
    });
  },

  loadCategories: function () {
    var that = this;
    load.showLoading('获取分类');
    api.disGetDepGoodsCataGbLite({ disId: this.data.disId, goodsType: 99 }).then(function (res) {
      if (!res.result || res.result.code !== 0) {
        throw new Error((res.result && res.result.msg) || '商品分类加载失败');
      }
      var data = res.result && res.result.data;
      var categories = data && data.cataArr ? data.cataArr.map(catalogCategory).filter(function (item) {
        return item.id;
      }) : [];
      that.setData({ catalogCategories: categories }, function () {
        that.loadData();
      });
    }).catch(function () {
      load.hideLoading();
      wx.showToast({ title: '商品分类加载失败', icon: 'none' });
      that.loadData();
    });
  },

  buildCategories: function (rows) {
    var categories = (this.data.catalogCategories || []).map(function (item) {
      return Object.assign({}, item, { count: 0 });
    });
    var known = {};
    categories.forEach(function (item) { known[item.id] = item; });
    var hasUncategorized = false;
    rows.forEach(function (row) {
      if (!row.categoryId || !known[row.categoryId]) {
        row.categoryId = 'uncategorized';
        hasUncategorized = true;
      }
    });
    if (hasUncategorized) {
      var uncategorized = { id: 'uncategorized', name: '未分类', icon: '▦', count: 0 };
      categories.push(uncategorized);
      known[uncategorized.id] = uncategorized;
    }
    rows.forEach(function (row) {
      known[row.categoryId].count += 1;
    });
    return categories;
  },

  loadData: function () {
    var that = this;
    load.showLoading('加载中');
    api.outboundIngredientAnalysis({
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      disId: this.data.disId,
      depFatherId: this.data.depFatherId,
      verificationStatus: this.data.status,
      sortBy: this.data.sortBy,
      sortOrder: this.data.sortOrder,
      goodsNameSearch: this.data.search
    }).then(function (res) {
      load.hideLoading();
      var data = (res.result && res.result.data) || {};
      var rows = (data.ingredientsAnalysis || []).map(ingredientRow);
      var categories = that.buildCategories(rows);
      var selectedId = idString(that.data.categoryId);
      if (!rows.some(function (row) { return row.categoryId === selectedId; })) {
        var firstWithGoods = categories.filter(function (item) { return item.count > 0; })[0];
        selectedId = firstWithGoods ? firstWithGoods.id : (categories[0] ? categories[0].id : '');
      }
      var selectedCategory = categories.filter(function (item) { return item.id === selectedId; })[0];
      that.setData({
        allRows: rows,
        categories: categories,
        categoryId: selectedId,
        categoryName: selectedCategory ? selectedCategory.name : '',
        summary: data.summary || {}
      });
      that.apply();
    }).catch(function () {
      load.hideLoading();
      wx.showToast({ title: '原料列表加载失败', icon: 'none' });
    });
  },

  apply: function () {
    var categoryId = idString(this.data.categoryId);
    var keyword = (this.data.search || '').toLowerCase();
    var rows = (this.data.allRows || []).filter(function (row) {
      return row.categoryId === categoryId && (!keyword || row.name.toLowerCase().indexOf(keyword) >= 0);
    });
    this.setData({ rows: rows });
  },

  chooseStatus: function (event) {
    var value = event.currentTarget.dataset.value;
    var labels = {
      all: '全部出库',
      verified: '已核销',
      unverified: '未核销',
      employeeMeal: '员工餐'
    };
    this.setData({ status: value, statusLabel: labels[value] || '全部出库' });
    this.loadData();
  },

  chooseSort: function (event) {
    var value = event.currentTarget.dataset.value;
    if (value === this.data.sortBy) {
      this.setData({ sortOrder: this.data.sortOrder === 'desc' ? 'asc' : 'desc' });
    } else {
      var labels = {
        outbound: '出库金额',
        deviance: '出库分摊偏差率',
        devianceAmount: '偏差金额'
      };
      this.setData({ sortBy: value, sortOrder: 'desc', sortLabel: labels[value] || '出库金额' });
    }
    this.loadData();
  },

  chooseCategory: function (event) {
    var selectedId = idString(event.currentTarget.dataset.id);
    var selectedCategory = (this.data.categories || []).filter(function (item) {
      return item.id === selectedId;
    })[0];
    this.setData({
      categoryId: selectedId,
      categoryName: selectedCategory ? selectedCategory.name : ''
    });
    this.apply();
  },

  searchInput: function (event) {
    this.setData({ search: event.detail.value });
    this.loadData();
  },

  noop: function () {},

  toDetail: function (event) {
    var row = this.data.rows[event.currentTarget.dataset.index];
    wx.setStorageSync('costIngredient', row);
    wx.setStorageSync('disGoods', Object.assign({}, row, { gbDistributerGoodsId: row.disGoodsId }));
    wx.navigateTo({
      url: '../goodsFenxiCost/goodsFenxiCost?disGoodsId=' + row.disGoodsId
        + '&searchDepId=' + this.data.searchDepId
        + '&depFatherId=' + this.data.depFatherId
    });
  },

  toDatePage: function () {
    this.setData({ updateDate: true });
    wx.navigateTo({
      url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate
        + '&stopDate=' + this.data.stopDate + '&dateType=month'
    });
  },

  toBack: function () {
    wx.navigateBack();
  }
});
