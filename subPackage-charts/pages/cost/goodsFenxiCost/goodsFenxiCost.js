var dateUtils = require('../../../../lib/dateUtil');
var api = require('../../../services/api.js');
var apiDis = require('../../../../services/apiDistributer.js');
var load = require('../../../../lib/load.js');
var echarts = require('../../../../ec-canvas/echarts');
var config = require('../../../../config/index.js');
var globalData = getApp().globalData;

function num(value) {
  var parsed = parseFloat(String(value == null ? 0 : value).replace(/,/g, ''));
  return isNaN(parsed) ? 0 : parsed;
}

function money(value) {
  return num(value).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function signed(value) {
  var resolved = num(value);
  return (resolved > 0 ? '+' : '') + money(resolved);
}

function imageUrl(value) {
  if (!value) return '';
  if (/^https?:\/\//.test(value)) return value;
  return String(config.server || '').replace(/\/$/, '') + '/' + String(value).replace(/^\//, '');
}

function shortDate(value) {
  var parts = String(value || '').split('-');
  return parts.length === 3 ? Number(parts[1]) + '月' + Number(parts[2]) + '日' : value;
}

function hasOwn(row, key) {
  return row && Object.prototype.hasOwnProperty.call(row, key);
}

function positiveId(value) {
  var resolved = Number(value || 0);
  return resolved > 0 ? resolved : 0;
}

function storeRootDepartmentId(department) {
  var row = department || {};
  return positiveId(row.gbDepartmentFatherId) || positiveId(row.gbDepartmentId);
}

function receivedQuantity(purchaseRow) {
  var stocks = purchaseRow.gbDepartmentGoodsStockEntities || [];
  if (stocks.length) {
    return stocks.reduce(function (sum, stock) { return sum + num(stock.gbDgsWeight); }, 0);
  }
  return num(purchaseRow.gbDpgBuyQuantity);
}

function fallbackPurchaseBusiness(data) {
  var rows = data.arr || [];
  var batches = {};
  var sources = {};
  var totalQuantity = 0;
  var totalAmount = 0;
  rows.forEach(function (row) {
    var batchKey = row.gbDpgBatchId ? 'B:' + row.gbDpgBatchId : 'P:' + row.gbDistributerPurchaseGoodsId;
    var supplierId = Number(row.gbDpgPurchaseNxSupplierId || -1);
    var selfPurchase = supplierId <= 0;
    var buyer = ((row.purchaseDepartmentUser || {}).gbDuWxNickName) || '';
    var buyerId = Number(row.gbDpgPurUserId || 0);
    var sourceKey = selfPurchase
      ? 'SELF:' + (buyerId > 0 ? buyerId : (buyer || 'UNKNOWN'))
      : 'SUPPLIER:' + supplierId;
    var sourceName = selfPurchase ? '自采' : (((row.nxJrdhSupplierEntity || {}).nxJrdhsSupplierName) || '供货商');
    var quantity = receivedQuantity(row);
    var amount = num(row.gbDpgBuySubtotal);
    var lossQuantity = 0;
    var lossAmount = 0;
    var wasteQuantity = 0;
    var wasteAmount = 0;
    (row.gbDepartmentGoodsStockEntities || []).forEach(function (stock) {
      lossQuantity += num(stock.gbDgsLossWeight);
      lossAmount += num(stock.gbDgsLossSubtotal);
      wasteQuantity += num(stock.gbDgsWasteWeight);
      wasteAmount += num(stock.gbDgsWasteSubtotal);
    });
    batches[batchKey] = true;
    totalQuantity += quantity;
    totalAmount += amount;
    if (!sources[sourceKey]) sources[sourceKey] = { sourceType: selfPurchase ? 'SELF' : 'SUPPLIER', sourceName: sourceName, batches: {}, purchaseQuantity: 0, purchaseAmount: 0, buyerNames: [], lossQuantity: 0, lossAmount: 0, wasteQuantity: 0, wasteAmount: 0 };
    sources[sourceKey].batches[batchKey] = true;
    sources[sourceKey].purchaseQuantity += quantity;
    sources[sourceKey].purchaseAmount += amount;
    sources[sourceKey].lossQuantity += lossQuantity;
    sources[sourceKey].lossAmount += lossAmount;
    sources[sourceKey].wasteQuantity += wasteQuantity;
    sources[sourceKey].wasteAmount += wasteAmount;
    if (selfPurchase && buyer && sources[sourceKey].buyerNames.indexOf(buyer) < 0) sources[sourceKey].buyerNames.push(buyer);
  });
  var sourceRows = Object.keys(sources).map(function (key) {
    var source = sources[key];
    return {
      sourceType: source.sourceType,
      sourceName: source.sourceName,
      buyerNames: source.buyerNames,
      batchCount: Object.keys(source.batches).length,
      purchaseQuantity: source.purchaseQuantity,
      purchaseAmount: source.purchaseAmount,
      averageUnitPrice: source.purchaseQuantity ? source.purchaseAmount / source.purchaseQuantity : 0,
      quantitySharePercent: totalQuantity ? source.purchaseQuantity * 100 / totalQuantity : 0,
      lossQuantity: source.lossQuantity,
      lossAmount: source.lossAmount,
      wasteQuantity: source.wasteQuantity,
      wasteAmount: source.wasteAmount
    };
  }).sort(function (a, b) { return b.purchaseQuantity - a.purchaseQuantity; });
  return {
    purchaseSummary: {
      batchCount: Object.keys(batches).length,
      totalQuantity: totalQuantity,
      totalAmount: totalAmount,
      averageUnitPrice: totalQuantity ? totalAmount / totalQuantity : 0
    },
    purchaseSources: sourceRows,
    inventorySummary: data.inventorySummary || {}
  };
}

Page({
  data: {
    navBarHeight: 0,
    hanzi: '本月',
    dateText: '',
    row: {},
    purchase: {},
    purchaseSources: [],
    dishes: [],
    daily: [],
    ecTrend: { lazyLoad: true },
    loading: true
  },

  onLoad: function (options) {
    var cached = wx.getStorageSync('costIngredient') || {};
    var legacy = wx.getStorageSync('disGoods') || {};
    var target = Number(options.disGoodsId || 0);
    var cachedId = Number(cached.disGoodsId || cached.gbDistributerGoodsId || 0);
    var source = target && cachedId !== target ? legacy : (cachedId ? cached : legacy);
    var dis = wx.getStorageSync('disInfo') || {};
    var dep = wx.getStorageSync('depInfo') || {};
    var store = wx.getStorageSync('mendianInfo') || {};
    var searchDepId = options.searchDepId || '-1';
    var depFatherId = positiveId(options.depFatherId)
      || positiveId(searchDepId !== '-1' ? searchDepId : 0)
      || storeRootDepartmentId(store)
      || storeRootDepartmentId(dep)
      || '';
    this.setData({
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      disId: options.disId || dis.gbDistributerId,
      depFatherId: depFatherId,
      disGoodsId: options.disGoodsId || source.disGoodsId || source.gbDistributerGoodsId,
      searchDepId: searchDepId,
      row: this.viewRow(source),
      dishes: this.viewDishes(source.supportedDishes || [])
    });
    this.syncDate();
    this.loadData();
  },

  onShow: function () {
    if (this.data.updateDate) {
      this.setData({ updateDate: false });
      this.syncDate();
      this.loadData();
    }
  },

  syncDate: function () {
    var stored = wx.getStorageSync('myDate');
    var range = stored
      ? (stored.name === 'custom' ? dateUtils.getDateRange(stored.name, stored.startDate, stored.stopDate) : dateUtils.getDateRange(stored.name))
      : { startDate: dateUtils.getFirstDateInMonth(), stopDate: dateUtils.getArriveDate(0), name: '本月' };
    this.setData({
      startDate: range.startDate,
      stopDate: range.stopDate,
      hanzi: (stored && stored.hanzi) || range.name || '本月',
      dateText: shortDate(range.startDate) + ' - ' + shortDate(range.stopDate)
    });
  },

  viewRow: function (raw) {
    var row = raw || {};
    var relatedDishes = row.supportedDishes || [];
    var relatedDishNamesText = relatedDishes.slice(0, 4).map(function (dish) {
      return dish.dishName || '';
    }).filter(Boolean).join('、');
    if (relatedDishes.length > 4) relatedDishNamesText += '等' + relatedDishes.length + '道菜';
    var unit = row.gbDgGoodsStandardname || row.unit || '斤';
    var verified = num(row.verifiedAmount);
    var pending = hasOwn(row, 'businessPendingUseAmount') ? num(row.businessPendingUseAmount) : num(row.nonVerifiedAmount);
    var normal = hasOwn(row, 'businessNormalSaleAmount') ? num(row.businessNormalSaleAmount) : verified;
    var discount = num(row.businessDiscountMealAmount);
    var employee = hasOwn(row, 'businessEmployeeMealAmount') ? num(row.businessEmployeeMealAmount) : num(row.employeeMealAmount);
    var loss = num(row.lossAmount);
    var waste = num(row.wasteAmount);
    var destinationTotal = normal + discount + employee + pending + loss + waste;
    var destinations = [
      { key: 'normal', name: '正常售卖', hint: '正常卖出的菜', amountText: money(normal), qtyText: money(row.businessNormalSaleQty), color: '#16a36a' },
      { key: 'discount', name: '折扣餐', hint: '含会员优惠和赠送', amountText: money(discount), qtyText: money(row.businessDiscountMealQty), color: '#4388f7' },
      { key: 'employee', name: '员工餐', hint: '菜品和原料员工餐', amountText: money(employee), qtyText: money(hasOwn(row, 'businessEmployeeMealQty') ? row.businessEmployeeMealQty : row.employeeMealQty), color: '#f39b25' },
      { key: 'pending', name: '待确认用途', hint: '出库了，还没对应到菜品', amountText: money(pending), qtyText: money(hasOwn(row, 'businessPendingUseQty') ? row.businessPendingUseQty : row.nonVerifiedQty), color: '#ef5b64' },
      { key: 'loss', name: '损耗', hint: '破损、人为损坏等意外减少', amountText: money(loss), qtyText: money(row.lossQty), color: '#8f79d9' },
      { key: 'waste', name: '废弃', hint: '保鲜商品超过保鲜时间后登记', amountText: money(waste), qtyText: money(row.wasteQty), color: '#d86677' }
    ].map(function (item) {
      var amount = num(item.amountText);
      item.percent = destinationTotal ? Math.round(amount * 100 / destinationTotal) : 0;
      item.barWidth = amount > 0 ? Math.max(3, item.percent) : 0;
      return item;
    });
    var diff = num(row.diffUsage != null ? row.diffUsage : num(row.actualUsage) - num(row.theoryUsage));
    var conclusion = pending > 0
      ? '有 ¥' + money(pending) + ' 的出库还没对应到菜品，建议先核对出库和配方记录。'
      : (loss > 0 || waste > 0
        ? '本期登记损耗 ¥' + money(loss) + '、废弃 ¥' + money(waste) + '，建议查看登记原因。'
        : '本期出库用途已经基本对应清楚。');
    return Object.assign({}, row, {
      name: row.name || row.gbDgGoodsName || '原料详情',
      initial: String(row.name || row.gbDgGoodsName || '原').slice(0, 1),
      relatedDishNamesText: relatedDishNamesText,
      unit: unit,
      imageUrl: imageUrl(row.gbDgGoodsFileImg || row.imageUrl),
      unitPriceText: money(row.unitPrice),
      priceRecordCount: Number(row.purchaseCount || 0),
      totalText: money(row.businessDestinationTotalAmount || row.outboundTotalAmount),
      totalQtyText: money(row.businessDestinationTotalQty || row.outboundTotalQty),
      theoryText: money(row.theoryUsage),
      actualText: money(row.actualUsage),
      diffText: signed(diff),
      diffAbsText: money(Math.abs(diff)),
      diffTone: Math.abs(diff) < 0.01 ? 'ok' : 'danger',
      destinations: destinations,
      destinationTotalText: money(destinationTotal),
      conclusion: conclusion
    });
  },

  viewPurchase: function (raw) {
    var fallback = fallbackPurchaseBusiness(raw || {});
    var summary = (raw && raw.purchaseSummary) || fallback.purchaseSummary;
    var inventory = (raw && raw.inventorySummary) || fallback.inventorySummary || {};
    return {
      batchCount: Number(summary.batchCount || 0),
      totalQuantityText: money(summary.totalQuantity),
      totalAmountText: money(summary.totalAmount),
      averagePriceText: money(summary.averageUnitPrice),
      currentStockText: inventory.currentStockWeight == null ? '--' : money(inventory.currentStockWeight),
      currentStockAmountText: inventory.currentStockAmount == null ? '--' : money(inventory.currentStockAmount),
      hasCurrentStock: inventory.currentStockWeight != null,
      hasPurchase: Number(summary.batchCount || 0) > 0
    };
  },

  viewPurchaseSources: function (raw) {
    var fallback = fallbackPurchaseBusiness(raw || {});
    return ((raw && raw.purchaseSources) || fallback.purchaseSources || []).map(function (source, index) {
      var share = num(source.quantitySharePercent);
      return Object.assign({}, source, {
        indexNo: index + 1,
        iconText: source.sourceType === 'SELF' ? '自' : '供',
        typeText: source.sourceType === 'SELF' ? '自采' : '供货商',
        buyerText: (source.buyerNames || []).join('、'),
        displayName: source.sourceType === 'SELF'
          ? ((source.buyerNames || []).join('、') || '未记录采购人')
          : (source.sourceName || '供货商'),
        quantityText: money(source.purchaseQuantity),
        amountText: money(source.purchaseAmount),
        priceText: money(source.averageUnitPrice),
        shareText: money(share),
        lossQuantityText: money(source.lossQuantity),
        lossAmountText: money(source.lossAmount),
        wasteQuantityText: money(source.wasteQuantity),
        wasteAmountText: money(source.wasteAmount),
        barWidth: share > 0 ? Math.max(4, share) : 0
      });
    });
  },

  viewDishes: function (list) {
    return (list || []).map(function (dish) {
      var diff = num(dish.diffUsage);
      var theoryUsage = num(dish.theoryUsage);
      var actualUsage = num(dish.actualUsage);
      var usageMax = Math.max(theoryUsage, actualUsage, 0);
      var normal = num(dish.normalSalePortions);
      var discount = num(dish.discountMealPortions);
      var employee = num(dish.employeeMealPortions);
      var total = num(dish.totalBusinessPortions != null ? dish.totalBusinessPortions : dish.salesPortions);
      var focusShare = Math.max(0, Math.min(100, num(dish.focusIngredientTheoryCostSharePercent)));
      var otherShare = Math.max(0, 100 - focusShare);
      var status = dish.costRecordStatus || 'OK';
      var issue = Math.abs(diff) < 0.01
        ? '配方用量和实际分摊基本一致'
        : (diff < 0 ? '实际少分摊 ' + money(Math.abs(diff)) + '，请核对配方或出库' : '实际多分摊 ' + money(diff) + '，请留意成本偏高');
      return Object.assign({}, dish, {
        image: imageUrl(dish.dishImageLarge || dish.dishImage),
        initial: String(dish.dishName || '菜').slice(0, 1),
        totalText: money(total),
        normalText: money(normal),
        discountText: money(discount),
        employeeText: money(employee),
        unitText: money(dish.recipeUnitPerDish),
        theoryText: money(theoryUsage),
        actualText: money(actualUsage),
        diffText: signed(diff),
        tone: Math.abs(diff) < 0.01 ? 'ok' : 'danger',
        issueText: issue,
        theoryBarWidth: usageMax ? Math.max(3, theoryUsage * 100 / usageMax) : 0,
        actualBarWidth: usageMax ? Math.max(3, actualUsage * 100 / usageMax) : 0,
        ingredientCountText: Number(dish.ingredientCount || 0),
        focusShareText: money(focusShare),
        otherShareText: money(otherShare),
        focusShareWidth: focusShare,
        otherShareWidth: otherShare,
        focusTheoryCostText: money(dish.focusIngredientTheoryCost),
        otherTheoryCostText: money(dish.otherIngredientTheoryCost),
        salesAmountText: money(dish.salesAmount),
        theoryCostText: money(dish.dishTheoryCostTotal),
        allocatedCostText: money(dish.dishAllocatedCostTotal),
        theoryGrossProfitText: money(dish.theoryGrossProfit),
        recordedGrossProfitText: money(dish.recordedGrossProfit),
        theoryGrossMarginText: money(dish.theoryGrossMarginRate),
        recordedGrossMarginText: money(dish.recordedGrossMarginRate),
        costRecordTone: status === 'OK' ? 'ok' : 'danger',
        costRecordWarning: dish.costRecordWarning || '成本数据正在汇总，请稍后再看。'
      });
    });
  },

  loadData: function () {
    var that = this;
    load.showLoading('加载中');
    Promise.all([
      api.outboundIngredientAnalysis({
        startDate: this.data.startDate,
        stopDate: this.data.stopDate,
        disId: this.data.disId,
        depFatherId: this.data.depFatherId,
        verificationStatus: 'all',
        sortBy: 'outbound',
        sortOrder: 'desc'
      }),
      apiDis.getGbUnitPriceAnalysis({
        disId: this.data.disId,
        startDate: this.data.startDate,
        stopDate: this.data.stopDate,
        sourceType: 'ALL',
        purDepId: '',
        disGoodsId: this.data.disGoodsId
      }),
      apiDis.getGbPurGoodsDetailList({
        disGoodsId: this.data.disGoodsId,
        startDate: this.data.startDate,
        stopDate: this.data.stopDate
      })
    ]).then(function (responses) {
      load.hideLoading();
      var outbound = (responses[0].result && responses[0].result.data) || {};
      var price = (responses[1].result && responses[1].result.data) || {};
      var purchaseData = (responses[2].result && responses[2].result.data) || {};
      var priceGoods = (price.goods || [])[0] || {};
      var ingredient = (outbound.ingredientsAnalysis || []).filter(function (item) {
        return Number(item.disGoodsId) === Number(that.data.disGoodsId);
      })[0] || {};
      var daily = (price.priceTrend || []).map(function (item) {
        return { date: item.day || '', value: item.averageUnitPrice == null ? null : num(item.averageUnitPrice) };
      });
      var merged = Object.assign({}, that.data.row, ingredient, {
        unitPrice: priceGoods.currentUnitPrice || ingredient.unitPrice || that.data.row.unitPrice,
        previousPrice: priceGoods.previousUnitPrice,
        priceChangePercent: priceGoods.priceChangePercent,
        minUnitPrice: priceGoods.minUnitPrice,
        maxUnitPrice: priceGoods.maxUnitPrice,
        purchaseCount: priceGoods.purchaseCount
      });
      that.setData({
        loading: false,
        daily: daily,
        row: that.viewRow(merged),
        purchase: that.viewPurchase(purchaseData),
        purchaseSources: that.viewPurchaseSources(purchaseData),
        dishes: that.viewDishes(ingredient.supportedDishes || [])
      }, function () { that.scheduleChart(); });
    }).catch(function (error) {
      load.hideLoading();
      console.error('[goodsFenxiCost] load data failed', error);
      that.setData({ loading: false }, function () { that.scheduleChart(); });
    });
  },

  scheduleChart: function () {
    var that = this;
    wx.nextTick(function () { setTimeout(function () { that.drawChart(); }, 80); });
  },

  drawChart: function () {
    var component = this.selectComponent('#trend');
    var daily = this.data.daily || [];
    var that = this;
    if (!component) {
      this.chartInitAttempts = (this.chartInitAttempts || 0) + 1;
      if (this.chartInitAttempts < 8) setTimeout(this.drawChart.bind(this), 100);
      return;
    }
    this.chartInitAttempts = 0;
    var dates = daily.map(function (item) {
      var parts = String(item.date).split('-');
      return parts.length > 2 ? Number(parts[1]) + '/' + Number(parts[2]) : item.date;
    });
    var values = daily.map(function (item) { return item.value; });
    if (!dates.length) {
      dates = ['本期'];
      values = [num(this.data.row.unitPrice)];
    }
    component.init(function (canvas, width, height, dpr) {
      if (that.trendChart) that.trendChart.dispose();
      var chart = echarts.init(canvas, null, { width: width, height: height, devicePixelRatio: dpr });
      that.trendChart = chart;
      canvas.setChart(chart);
      chart.setOption({
        animation: false,
        grid: { left: 8, right: 12, top: 26, bottom: 8, containLabel: true },
        xAxis: { type: 'category', data: dates, boundaryGap: false, axisLine: { lineStyle: { color: '#cad7d1' } }, axisLabel: { color: '#64758a', fontSize: 11 } },
        yAxis: { type: 'value', splitNumber: 3, splitLine: { lineStyle: { color: '#e2eee9', type: 'dashed' } }, axisLabel: { color: '#64758a', fontSize: 11 } },
        series: [{ type: 'line', data: values, connectNulls: true, smooth: true, symbol: 'circle', symbolSize: 8, lineStyle: { color: '#0ca36a', width: 3 }, itemStyle: { color: '#fff', borderColor: '#0ca36a', borderWidth: 3 }, areaStyle: { color: 'rgba(31,190,124,.16)' } }]
      });
      return chart;
    });
  },

  toDishAnalysis: function (event) {
    var dish = this.data.dishes[event.currentTarget.dataset.index];
    if (!dish || !dish.dishId) return;
    wx.setStorageSync('foodGoodsFenxiDetailContext', { name: dish.dishName, image: dish.image });
    wx.navigateTo({
      url: '/subPackage-charts/pages/cost/foodGoodsFenxiDetail/foodGoodsFenxiDetail'
        + '?foodId=' + dish.dishId
        + '&disId=' + this.data.disId
        + '&depFatherId=' + this.data.depFatherId
    });
  },

  toDatePage: function () {
    this.setData({ updateDate: true });
    wx.navigateTo({
      url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=month'
    });
  },

  toBack: function () { wx.navigateBack(); }
});
