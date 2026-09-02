const globalData = getApp().globalData;
import apiUrl from '../../../../config/index.js';
import { dishIngredientDashboard as fetchDishIngredientDashboard } from '../../../../services/apiDistributerFood';
var load = require('../../../../lib/load.js');

var _pageEcharts = null;
function getEcharts() {
  if (_pageEcharts) return _pageEcharts;
  try {
    var mod = require('../../../../ec-canvas/echarts');
    _pageEcharts = mod && mod.default ? mod.default : mod;
  } catch (e) {
    console.error('[dishIngredientDashboard] echarts', e);
    _pageEcharts = null;
  }
  return _pageEcharts;
}

function num(s) {
  if (s == null || s === '') return 0;
  var n = parseFloat(String(s));
  return n === n ? n : 0;
}

/** 折线图纵轴刻度：避免浮点产生几十位小数，统一一位 */
function lineYAxisLabel(v) {
  var n = typeof v === 'number' ? v : parseFloat(String(v));
  if (n !== n) return v;
  return n.toFixed(1);
}

/** 与 /wxs/utilizationLevel.wxs 中 levelFromRate 一致 */
function utilLevelFromRateStr(rateStr) {
  if (rateStr == null || rateStr === undefined || rateStr === '') {
    return '';
  }
  var n = parseFloat(String(rateStr).trim());
  if (n !== n) {
    return '';
  }
  if (n < 90) {
    return 'LOW';
  }
  if (n <= 110) {
    return 'NORMAL';
  }
  if (n <= 120) {
    return 'HIGH';
  }
  return 'CRITICAL';
}

function utilLabelFromLevel(level) {
  var s = level != null ? String(level).toUpperCase() : '';
  if (s === 'LOW') {
    return '偏低';
  }
  if (s === 'NORMAL') {
    return '正常';
  }
  if (s === 'HIGH') {
    return '偏高';
  }
  if (s === 'CRITICAL') {
    return '浪费严重';
  }
  return '';
}

/** 当前行偏差率所属档位（优先接口 deviance，否则按 devianceRate 推算） */
function utilCurrentBandForRow(item) {
  if (!item) {
    return { label: '', hasData: false };
  }
  if (item.deviance) {
    if (item.deviance.labelZh) {
      return { label: String(item.deviance.labelZh), hasData: true };
    }
    var fromLevel = utilLabelFromLevel(item.deviance.level);
    if (fromLevel) {
      return { label: fromLevel, hasData: true };
    }
  }
  var lv = utilLevelFromRateStr(item.devianceRate);
  var lab = utilLabelFromLevel(lv);
  if (lab) {
    return { label: lab, hasData: true };
  }
  return { label: '', hasData: false };
}

/**
 * 弹窗内「四档标准」——只写数字区间，给老板一眼对照（与 utilizationLevel.wxs 一致）
 * 偏低小于90；正常90～110；偏高大于110且不超过120；浪费严重大于120
 */
function usageTipFourLevelsLines() {
  return [
    '分档标准（看「偏差率」百分数落在哪一段）：',
    '偏低：不到 90%',
    '正常：90% 到 110%（含 90、也含 110）',
    '偏高：比 110% 高，一直到 120%（含 120%）',
    '浪费严重：超过 120%',
  ];
}

/**
 * 成本占比条：每行 = 该行 outboundAllocatedCostPerPortion / 所有行 outboundAllocatedCostPerPortion 之和 ×100
 * （不是 actual / 自身。若 sum=0 则全为 0.00，调完可关日志）
 */
function enrichIngredientRowsWithCostShare(rows) {
  var list = rows || [];
  var sum = 0;
  for (var i = 0; i < list.length; i++) {
    sum += num(list[i] && list[i].outboundAllocatedCostPerPortion);
  }
  if (sum === 0 && list.length) {
    console.warn(
      '[dishIngredientDashboard][costShare] sum 为 0：请核对接口每行是否带 outboundAllocatedCostPerPortion。首行:',
      list[0]
    );
  }
  for (var j = 0; j < list.length; j++) {
    var r = list[j];
    if (!r) continue;
    var a = num(r.outboundAllocatedCostPerPortion);
    if (sum > 0) {
      var pct = (a / sum) * 100;
      r.costShareBarPct = pct.toFixed(2);
    } else {
      r.costShareBarPct = '0.00';
    }
  }
  return list;
}

function enrichCostStructureForPie(cs) {
  if (!cs || !cs.segments || !cs.segments.length) return cs;
  var total = num(cs.totalCostPerPortion);
  var segs = cs.segments;
  for (var i = 0; i < segs.length; i++) {
    var s = segs[i];
    var c = s && num(s.costPerPortion);
    if (total > 0 && c >= 0) {
      s.sharePercentDisplay = ((c / total) * 100).toFixed(2);
    } else {
      s.sharePercentDisplay = s && s.sharePercent != null && String(s.sharePercent).trim() !== '' ? String(s.sharePercent).trim() : '0.00';
    }
    s.pieValue = c > 0 ? c : 0.0001;
  }
  return cs;
}

var PIE_COLORS = ['#FF4D4F', '#FA8C16', '#FADB14', '#52C41A', '#1890FF', '#8C8C8C', '#BFBFBF', '#D9D9D9'];

Page({
  data: {
    navBarHeight: 0,
    url: '',
    pageTitle: '配料看板',
    loading: true,
    errMsg: '',

    startDate: '',
    stopDate: '',
    hanzi: '',
    disId: '',
    depFatherId: '',
    foodId: '',

    dish: null,
    ingredientRows: [],
    costStructure: null,
    costTrend: null,
    scopeOutboundSubtotals: null,
    summarySuggestionZh: '',
    disclaimerZh: '',

    // 合并自 dishIngredientAudit
    consumptionAuditIngredients: [],
    auditDishSummary: null,
    auditExpandedList: [],

    ecLazy: { lazyLoad: true },
    /** 与饼图分两个 lazy 对象，避免同页多 ec-canvas 共享 ec 时异常 */
    ecLazyLine: { lazyLoad: true },

    showUsageTip: false,
    usageTipTitle: '',
    usageTipLines: [],
  },

  _pieChart: null,
  _lineChart: null,



  onShow() {
    if (this.data.update) {
      this._syncDatesFromMyDateStorage();

      this.setData({ update: false });
      this._load();
      return;
    }
   
  },


  _syncDatesFromMyDateStorage() {
    var myDate = wx.getStorageSync('myDate');
    if (myDate) {
      var dateRange;
      if (myDate.name === 'custom') {
        dateRange = dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate);
      } else {
        dateRange = dateUtils.getDateRange(myDate.name);
      }
      this.setData({
        startDate: dateRange.startDate,
        stopDate: dateRange.stopDate,
        dateType: myDate.dateType,
        hanzi: myDate.hanzi || dateRange.name,
      });
    } else {
      this.setData({
        dateType: 'month',
        startDate: dateUtils.getFirstDateInMonth(),
        stopDate: dateUtils.getArriveDate(0),
        hanzi: "本月",
      });
    }
  },

  onLoad: function (options) {
    var o = options || {};
    // 兼容 dishId/dishName 旧参数名
    var startDate = o.startDate || '';
    var stopDate = o.stopDate || '';
    if (!startDate || !stopDate) {
      var myDate = wx.getStorageSync('myDate');
      if (myDate) {
        var dateRange;
        if (myDate.name === 'custom') {
          dateRange = dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate);
        } else {
          dateRange = dateUtils.getDateRange(myDate.name);
        }
        startDate = dateRange.startDate;
        stopDate = dateRange.stopDate;
      } else {
        startDate = dateUtils.getFirstDateInMonth();
        stopDate = dateUtils.getArriveDate(0);
      }
    }
    this.setData({
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      foodId: o.foodId || o.dishId || '',
      dateType: o.dateType || '',
      startDate: startDate,
      stopDate: stopDate,
      hanzi: o.hanzi ? decodeURIComponent(String(o.hanzi)) : '',
      disId: o.disId != null && o.disId !== undefined ? String(o.disId) : '',
      depFatherId: o.depFatherId != null && o.depFatherId !== undefined ? String(o.depFatherId) : '',
      pageTitle: (o.foodName || o.dishName) ? decodeURIComponent(String(o.foodName || o.dishName)) : '配料看板',
    });
    if (!this.data.foodId || !this.data.startDate || !this.data.stopDate) {
      this.setData({ loading: false, errMsg: '参数不完整' });
      return;
    }
    this._load();
  },

  onUnload: function () {
    this._disposeCharts();
  },

  _disposeCharts: function () {
    try {
      if (this._pieChart && this._pieChart.dispose) {
        this._pieChart.dispose();
      }
    } catch (e) {}
    try {
      if (this._lineChart && this._lineChart.dispose) {
        this._lineChart.dispose();
      }
    } catch (e) {}
    this._pieChart = null;
    this._lineChart = null;
  },

  toBack: function () {
    wx.navigateBack();
  },

  _openUsageTip: function (title, lines) {
    this.setData({
      showUsageTip: true,
      usageTipTitle: title || '说明',
      usageTipLines: Array.isArray(lines) ? lines : [],
    });
  },

  onCloseUsageTip: function () {
    this.setData({
      showUsageTip: false,
      usageTipTitle: '',
      usageTipLines: [],
    });
  },

  /** 表头：用量偏差列说明 */
  onTapUsageDeviationColumnHelp: function () {
    var lines = [
      '这一列里，「偏差率」百分数落在下面哪一段，就是哪一档。',
      '和配方差太多时会标「异常」。',
      '',
    ].concat(usageTipFourLevelsLines());
    lines.push('', '点某一格，最上面一行大字就是当前档位。');
    this._openUsageTip('用量偏差', lines);
  },

  /** 数据行：老板一眼看档位 */
  onTapUsageDeviation: function (e) {
    var ri = (e.currentTarget.dataset || {}).ri;
    if (ri === undefined || ri === null) {
      return;
    }
    var rows = this.data.ingredientRows || [];
    var item = rows[ri];
    if (!item) {
      return;
    }
    var band = utilCurrentBandForRow(item);
    var rateStr =
      item.devianceRate != null && String(item.devianceRate).trim() !== ''
        ? String(item.devianceRate).trim()
        : '';

    var lines = [];
    if (band.hasData && band.label) {
      lines.push('【当前这一档】' + band.label);
    } else {
      lines.push('【当前这一档】暂无（没有偏差率百分数可对）');
    }
    if (rateStr !== '') {
      lines.push('本行偏差率：' + rateStr + '%');
    }
    lines.push('');
    lines = lines.concat(usageTipFourLevelsLines());
    this._openUsageTip(item.gbDgGoodsName || '配料', lines);
  },

  _load: function () {
    var that = this;
    load.showLoading('加载中');
    fetchDishIngredientDashboard({
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      disId: this.data.disId,
      depFatherId: this.data.depFatherId,
      foodId: this.data.foodId,
      trendGranularity: 'month',
    })
      .then(function (res) {
        load.hideLoading();
        // 调试：查看接口原样（真机/开发者工具 Console，调完可删）
        var r = res && res.result;
        if (!r || (r.code !== 0 && r.code !== '0')) {
          console.warn('[dishIngredientDashboard] 非成功 r', r);
          that.setData({
            loading: false,
            errMsg: (r && r.msg) || '加载失败',
          });
          return;
        }
        var d = r.data;
        var raw = d.ingredientRows;
        enrichIngredientRowsWithCostShare(raw);
        var costStruct = d.costStructure;
        if (costStruct) enrichCostStructureForPie(costStruct);

        // 处理排查数据：预计算理论和实际对比条
        var auditIngredients = d.consumptionAuditIngredients;
        var auditExpandedList = [];
        for (var i = 0; i < auditIngredients.length; i++) {
          auditExpandedList[i] = false;
          var ing = auditIngredients[i];
          var theory = parseFloat(ing.recipeUsagePerPortion);
          var actual = parseFloat(ing.actualPerPortion);
          var maxVal = Math.max(theory, actual);
          if (maxVal <= 0) maxVal = 1;
          var orderMagnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
          var normalized = maxVal / orderMagnitude;
          var niceMax;
          if (normalized <= 1) niceMax = 1;
          else if (normalized <= 1.5) niceMax = 1.5;
          else if (normalized <= 2) niceMax = 2;
          else if (normalized <= 2.5) niceMax = 2.5;
          else if (normalized <= 5) niceMax = 5;
          else niceMax = 10;
          niceMax = Math.round(niceMax * orderMagnitude * 1000) / 1000;
          var ticks = [];
          var tickCount = 4;
          for (var t = 0; t < tickCount; t++) {
            ticks.push(Math.round(niceMax / (tickCount - 1) * t * 1000) / 1000);
          }
          ing._chart = {
            theoryPercent: ((theory / niceMax) * 100).toFixed(1),
            actualPercent: ((actual / niceMax) * 100).toFixed(1),
            maxVal: niceMax,
            ticks: ticks
          };
        }

        that.setData(
          {
            loading: false,
            errMsg: '',
            dish: d.dish,
            pageTitle: d.dish.foodName,
            ingredientRows: raw,
            costStructure: costStruct,
            costTrend: d.costTrend,
            scopeOutboundSubtotals: d.scopeOutboundSubtotals,
            summarySuggestionZh: d.summarySuggestionZh,
            disclaimerZh: d.disclaimerZh,
            consumptionAuditIngredients: auditIngredients,
            auditDishSummary: d.dishSummary,
            auditExpandedList: auditExpandedList,
          },
          function () {
            that._disposeCharts();
            that._initCharts();
          }
        );
      })
      .catch(function (err) {
        console.error('[dishIngredientDashboard] fetch 异常', err);
        load.hideLoading();
        that.setData({ loading: false, errMsg: '网络错误' });
      });
  },

  _donutOption: function (segs) {
    var data = (segs || []).map(function (s, i) {
      var w = 0;
      if (s && s.pieValue != null) {
        w = num(s.pieValue);
      } else {
        w = s ? num(s.costPerPortion) : 0;
      }
      if (!(w > 0)) w = 0.0001;
      return {
        name: s.name || '—',
        value: w,
      };
    });
    return {
      color: PIE_COLORS,
      tooltip: { trigger: 'item', confine: true },
      series: [
        {
          name: '成本占比',
          type: 'pie',
          radius: ['40%', '66%'],
          itemStyle: { borderRadius: 2, borderColor: '#fff', borderWidth: 1 },
          label: { fontSize: 12, color: '#1f2937', fontWeight: 500 },
          data: data,
        },
      ],
    };
  },

  _lineOption: function (trend) {
    var pts = (trend && trend.points) || [];
    var cats = pts.map(function (p) {
      return p.periodLabel || '—';
    });
    var vals = pts.map(function (p) {
      return num(p.primaryIngredientCostPerPortion);
    });
    // 仅 1 点或 y 全相等时 ECharts 易画成「空」；拉开 y 轴 + 强显拐点
    var n = vals.length;
    var vmin = 0;
    var vmax = 1;
    if (n) {
      vmin = vals[0];
      vmax = vals[0];
      for (var k = 1; k < n; k++) {
        if (vals[k] < vmin) vmin = vals[k];
        if (vals[k] > vmax) vmax = vals[k];
      }
    }
    // 同值或单点：Y 不拉开时曲线/点容易贴在边缘或像没画
    var yAxis;
    if (n > 0 && vmin === vmax) {
      var c0 = vmax;
      yAxis = {
        type: 'value',
        min: c0 > 0 ? Math.max(0, c0 * 0.4) : 0,
        max: c0 > 0 ? c0 * 1.25 : 1,
        minInterval: 0.01,
        axisLabel: { fontSize: 12, color: '#4b5563', formatter: lineYAxisLabel },
        splitLine: { lineStyle: { type: 'dashed', color: '#e8ebef' } },
      };
    } else {
      yAxis = {
        type: 'value',
        minInterval: 0.1,
        axisLabel: { fontSize: 12, color: '#4b5563', formatter: lineYAxisLabel },
        splitLine: { lineStyle: { type: 'dashed', color: '#e8ebef' } },
      };
    }
    var isSparse = n <= 2;
    return {
      color: ['#FF4D4F'],
      grid: { left: 12, right: 12, top: 36, bottom: 8, containLabel: true },
      tooltip: { show: true, confine: true, trigger: 'axis' },
      xAxis: {
        type: 'category',
        boundaryGap: isSparse,
        data: cats,
        axisLabel: { fontSize: 12, color: '#4b5563' },
        axisLine: { lineStyle: { color: '#dce0e6' } },
      },
      yAxis: yAxis,
      series: [
        {
          name: (trend && trend.primaryGoodsName) || '配料',
          type: 'line',
          smooth: n > 2,
          showSymbol: true,
          showAllSymbol: n <= 2,
          symbol: 'circle',
          symbolSize: n <= 2 ? 12 : 6,
          lineStyle: { width: 2.5 },
          data: vals,
          areaStyle: n > 1 ? { color: 'rgba(255, 77, 79, 0.08)' } : { color: 'rgba(255, 77, 79, 0.12)' },
        },
      ],
    };
  },

  _initCharts: function () {
    var echartsMod = getEcharts();
    if (!echartsMod || !echartsMod.init) return;
    var that = this;
    var segs = this.data.costStructure.segments;
    var trend = this.data.costTrend;

    var runLineOnce = function (label) {
      if (that._lineChart) return;
      var lineComp = that.selectComponent('#dga_line');
      if (!lineComp || typeof lineComp.init !== 'function') {
        console.error('[dishIngredientDashboard][line] ec-canvas 未就绪', label);
        return;
      }
      var opt = that._lineOption(trend);
      try {
        lineComp.init(function (canvas, width, height, dpr) {
          if (!width || !height) return null;
          var ch = echartsMod.init(canvas, null, {
            width: width,
            height: height,
            devicePixelRatio: dpr || (wx.getSystemInfoSync().pixelRatio || 2),
          });
          ch.setOption(opt, true);
          that._lineChart = ch;
          try { ch.resize(); } catch (rz) {}
          return ch;
        });
      } catch (err) {
        console.error('[dishIngredientDashboard][line] init 抛错', label, err);
      }
    };

    setTimeout(function () {
      var pieComp = that.selectComponent('#dga_pie');
      if (pieComp && pieComp.init) {
        try {
          pieComp.init(function (canvas, width, height, dpr) {
            if (!width || !height) return null;
            var ch = echartsMod.init(canvas, null, {
              width: width,
              height: height,
              devicePixelRatio: dpr || (wx.getSystemInfoSync().pixelRatio || 2),
            });
            ch.setOption(that._donutOption(segs), true);
            that._pieChart = ch;
            return ch;
          });
        } catch (err) {
          console.error('[dishIngredientDashboard][pie] init 异常', err);
        }
      }
      runLineOnce('t=280ms');
    }, 280);

    setTimeout(function () {
      if (!that._lineChart) runLineOnce('重试+900ms');
    }, 900);
    setTimeout(function () {
      if (!that._lineChart) runLineOnce('重试+2000ms');
    }, 2000);
  },



  // 配料排查：切换展开/折叠
  onToggleAuditIngredient: function (e) {
    var idx = e.currentTarget.dataset.index;
    var i = Number(idx);
    var newList = this.data.auditExpandedList.slice();
    if (newList[i]) {
      newList[i] = false;
    } else {
      newList[i] = true;
    }
    this.setData({ auditExpandedList: newList });
  },

  toDatePage() {
    this.setData({
      update: true
    })
    wx.navigateTo({
      url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate +
        '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType,
    })
  },

  
});
