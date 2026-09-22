var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil');
var chartsApi = require('../../../services/api.js');
var config = require('../../../../config/index.js');
var globalData = getApp().globalData;

function numberOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  var n = Number(v);
  return isNaN(n) ? null : n;
}

function num(v) {
  var n = numberOrNull(v);
  return n === null ? 0 : n;
}

function money(v) {
  return num(v).toFixed(2);
}

function qty(v) {
  return num(v).toFixed(2).replace(/\.00$/, '');
}

function imageUrl(v) {
  return !v ? '' : (/^https?:\/\//.test(v) ? v : config.server + v);
}

function percentText(v) {
  return v === null ? '—' : v.toFixed(1) + '%';
}

Page({
  data: {
    navBarHeight: 0,
    loading: true,
    hasData: false,
    ingredients: [],
    attention: []
  },

  onLoad: function (options) {
    this.context = wx.getStorageSync('foodGoodsFenxiDetailContext') || {};
    this.setData({
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      foodId: Number(options.foodId || 0),
      disId: Number(options.disId || 0),
      depFatherId: Number(options.depFatherId || 0)
    });
    this._syncDate();
    this._load();
  },

  onShow: function () {
    if (this.data.updateDate) {
      this.setData({ updateDate: false });
      this._syncDate();
      this._load();
    }
  },

  _syncDate: function () {
    var saved = wx.getStorageSync('myDate');
    var range = saved
      ? (saved.name === 'custom'
        ? dateUtils.getDateRange(saved.name, saved.startDate, saved.stopDate)
        : dateUtils.getDateRange(saved.name))
      : { startDate: dateUtils.getFirstDateInMonth(), stopDate: dateUtils.getArriveDate(0), name: '本月' };
    this.setData({
      startDate: range.startDate,
      stopDate: range.stopDate,
      hanzi: saved && saved.hanzi || range.name || '本月',
      dateType: saved ? saved.dateType : 'month'
    });
  },

  _load: function () {
    var that = this;
    this.setData({ loading: true });
    load.showLoading('加载菜品成本明细');
    chartsApi.getDishCostDetail({
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      disId: this.data.disId,
      depFatherId: this.data.depFatherId,
      foodId: this.data.foodId
    }).then(function (res) {
      load.hideLoading();
      var body = res && res.result || {};
      if (body.code !== 0) {
        that.setData({ loading: false, hasData: false });
        load.showToast(body.msg || '加载失败');
        return;
      }
      that._apply(body.data || {});
    }).catch(function () {
      load.hideLoading();
      that.setData({ loading: false, hasData: false });
      load.showToast('网络异常');
    });
  },

  _apply: function (row) {
    var sales = num(row.salesPortions);
    var price = num(row.listPricePerPortion || row.salesUnitPrice);
    var theoryTotal = numberOrNull(row.theoryCostTotal);
    if (theoryTotal === null) theoryTotal = num(row.theoryCostPerPortion) * sales;
    var actualTotal = num(row.outboundAllocatedCostAmount);
    var revenue = num(row.salesAmount);
    var originalRevenue = price * sales;
    var unreceivedAmount = Math.max(0, originalRevenue - revenue);
    var difference = actualTotal - theoryTotal;
    var differenceAbs = Math.abs(difference);
    var differenceLabel = difference > 0 ? '比配方多花' : difference < 0 ? '比配方少花' : '与配方一致';
    var costCompareText = difference > 0
      ? '实际用料成本比配方标准多 ¥' + money(differenceAbs) + '，会压低毛利，建议检查用量、采购价和损耗。'
      : difference < 0
        ? '实际用料成本比配方标准少 ¥' + money(differenceAbs) + '，可能是节省，也可能是出库没记全，建议先核对。'
        : '实际用料成本与配方标准一致，成本记录暂未发现明显偏差。';
    var actualMargin = numberOrNull(row.actualGrossMarginRate);
    var lower = numberOrNull(this.context.grossMarginStandardBandLower);
    var upper = numberOrNull(this.context.grossMarginStandardBandUpper);
    var target = numberOrNull(row.targetGrossMarginRate);
    var floatAbs = numberOrNull(row.grossMarginFloatAbs);

    if ((lower === null || upper === null) && target !== null && floatAbs !== null) {
      lower = target - floatAbs;
      upper = target + floatAbs;
    }

    var status = 'pending';
    var statusLabel = '待复核';
    var deviationLabel = '数据待确认';
    var deviationValue = '—';
    var advice = '当前成本或目标数据不完整，建议先完善配方与成本记录。';
    var whyTitle = '为什么需要复核？';

    if (actualMargin !== null && lower !== null && upper !== null) {
      if (actualMargin > upper) {
        status = 'high';
        statusLabel = '毛利偏高';
        deviationLabel = '高于上限';
        deviationValue = '+' + (actualMargin - upper).toFixed(1) + '%';
        advice = '实际毛利率明显高于目标区间，建议优先核查成本采集、出库分摊与配料用量。';
        whyTitle = '为什么毛利偏高？';
      } else if (actualMargin < lower) {
        status = 'low';
        statusLabel = '毛利偏低';
        deviationLabel = '低于下限';
        deviationValue = '-' + (lower - actualMargin).toFixed(1) + '%';
        advice = '实际毛利率低于目标区间，建议重点检查售价、采购成本和配料用量。';
        whyTitle = '为什么毛利偏低？';
      } else {
        status = 'healthy';
        statusLabel = '毛利健康';
        deviationLabel = '目标区间内';
        deviationValue = '0.0%';
        advice = '实际毛利率位于目标区间内，建议继续保持当前售价与成本管理。';
        whyTitle = '毛利为什么健康？';
      }
    }

    var ingredients = (row.ingredientRows || []).map(function (item) {
      var theoryCost = num(item.theoryCostPerPortion) * sales;
      var actualCost = num(item.outboundAllocatedCostPerPortion) * sales;
      var diff = actualCost - theoryCost;
      return Object.assign({}, item, {
        name: item.gbDgGoodsName || '未命名配料',
        image: imageUrl(item.gbDgGoodsFileImg || item.gbDgNxFatherImg),
        unit: item.gbDgGoodsStandardname || '',
        portion: qty(item.recipeUnitPerDish),
        theoryCost: money(theoryCost),
        actualCost: money(actualCost),
        difference: money(diff),
        diffValue: diff,
        diffTone: diff > 0 ? 'danger' : diff < 0 ? 'saving' : 'neutral',
        share: theoryTotal > 0 ? theoryCost * 100 / theoryTotal : 0
      });
    }).sort(function (a, b) {
      return num(b.theoryCost) - num(a.theoryCost);
    });

    ingredients.forEach(function (item) {
      item.shareText = item.share.toFixed(1);
      item.barWidth = Math.max(3, Math.min(100, item.share));
    });

    var top = ingredients[0] || {};
    var largestGap = ingredients.slice().sort(function (a, b) {
      return Math.abs(b.diffValue) - Math.abs(a.diffValue);
    })[0] || {};
    var targetRange = lower !== null && upper !== null
      ? lower.toFixed(0) + '% ~ ' + upper.toFixed(0) + '%'
      : (this.context.targetRange || '—');
    var differenceTone = difference > 0 ? 'danger' : difference < 0 ? 'saving' : 'neutral';

    this.setData({
      loading: false,
      hasData: true,
      dish: {
        name: row.dishName || this.context.name || '未命名菜品',
        image: imageUrl(row.dishImageLarge || row.dishImage) || this.context.image || '',
        price: money(price),
        sales: qty(sales),
        revenue: money(revenue),
        originalRevenue: money(originalRevenue),
        unreceivedAmount: money(unreceivedAmount),
        count: ingredients.length,
        margin: percentText(actualMargin),
        targetRange: targetRange,
        theoryTotal: money(theoryTotal),
        actualCost: money(actualTotal),
        actualProfit: money(revenue - actualTotal),
        difference: money(difference),
        differenceAbs: money(differenceAbs),
        differenceLabel: differenceLabel,
        differenceTone: differenceTone
      },
      analysis: {
        status: status,
        statusLabel: statusLabel,
        deviationLabel: deviationLabel,
        deviationValue: deviationValue,
        advice: advice,
        whyTitle: whyTitle,
        costCompareText: costCompareText
      },
      ingredients: ingredients,
      attention: [
        {
          icon: '!', tone: 'red', title: '优先核查 ' + (top.name || '配料成本'),
          text: top.name ? '理论成本占比 ' + (top.shareText || '0.0') + '%' : '当前没有可核查的配料'
        },
        {
          icon: '⌕', tone: 'blue', title: '关注成本采集',
          text: largestGap.name
            ? largestGap.name + '成本差额 ¥' + money(Math.abs(largestGap.diffValue))
            : '检查配料成本是否完整'
        },
        {
          icon: '▤', tone: 'green', title: '复核建议',
          text: '检查 TOP 用量与出库记录，确认配料分摊准确性'
        }
      ]
    });
  },

  toDatePage: function () {
    this.setData({ updateDate: true });
    wx.navigateTo({
      url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType
    });
  },

  toBack: function () {
    wx.navigateBack();
  }
});
