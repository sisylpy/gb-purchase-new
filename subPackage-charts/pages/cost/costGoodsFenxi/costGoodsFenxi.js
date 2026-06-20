var load = require('../../../../lib/load.js');
var globalData = getApp().globalData;
var dateUtils = require('../../../../lib/dateUtil');
var chartsApi = require('../../../services/api.js');
var config = require('../../../../config/index.js');
var echarts = require('../../../../ec-canvas/echarts');

var UTIL_BUCKET_COLOR = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  NORMAL: '#16a34a',
  LOW: '#2563eb',
};

var DEFAULT_INGREDIENT_PAGE_SIZE = 20;

Page({
  data: {
    ecUtil: {
      lazyLoad: false,
    },
    summary: null,
    devianceDistribution: null,
    ingredientsAnalysis: [],
    outboundGoodsRows: [],
    loading: false,
    listLoadingMore: false,
    ingredientHasMore: true,
    ingredientListPage: 0,
    ingredientPageSize: DEFAULT_INGREDIENT_PAGE_SIZE,
    ingredientTotal: null,
    searchBarOpen: false,
    searchInputFocus: false,
    goodsNameSearch: '',
    goodsNameSearchDraft: '',
    emptyHint: '',
    update: false,
    mendianInfo: null,
    activeSubDepIndex: 0,
    activeSubDepId: '',
    activeSubDepName: '',
    ingredientSortBy: 'outbound',
    ingredientSortOrder: 'asc',
    /** 核销状态筛选：all | verified | unverified | employeeMeal */
    verificationStatus: 'all',
    expandedDisGoodsId: null,
    /** 仅用于展开/收起后恢复滚动，不用来跟手滚动同步，避免与子高度变化时被重置冲突 */
    ingredientScrollRestoreTop: '',
  },

  onShow: function () {
    if (this.data.update) {
      this._syncDatesFromMyDateStorage();
      this.setData({ update: false });
      this._fetchReport();
    }
  },

  onUnload: function () {
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
      this._searchDebounceTimer = null;
    }
    if (this._utilDonutChart) {
      try {
        this._utilDonutChart.dispose();
      } catch (e) {}
      this._utilDonutChart = null;
    }
  },

  onLoad: function (options) {
    var userInfo = wx.getStorageSync('userInfo');
    var disId = (options && options.disId) || (userInfo && userInfo.gbDuDistributerId);

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: config.server,
      disId: disId,
    });

    this._syncDatesFromMyDateStorage();

    var mendianInfo = wx.getStorageSync('mendianInfo');
    if (mendianInfo) {
      this.setData({
          mendianInfo: mendianInfo,
          depFatherId: mendianInfo.gbDepartmentId,
        },
      );
    }

    this._fetchReport();
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
        hanzi: '本月',
      });
    }
  },

  _getUtilDonutOption: function () {
    var dist = this.data.devianceDistribution;
    if (!dist || !dist.buckets || !dist.buckets.length) {
      return {
        title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { fontSize: 12 } },
      };
    }
    var total = dist.totalKindsWithDeviance;
    var buckets = dist.buckets;
    var seriesData = buckets.map(function (b) {
      var lvl = b.level;
      return {
        name: b.labelZh || lvl,
        value: typeof b.count === 'number' ? b.count : parseFloat(b.count) || 0,
        itemStyle: { color: UTIL_BUCKET_COLOR[lvl] || '#9ca3af' },
      };
    });
    var sum = seriesData.reduce(function (a, x) {
      return a + x.value;
    }, 0);
    if (sum <= 0) {
      return {
        title: {
          text: total + '\n种配料',
          left: 'center',
          top: 'center',
          textAlign: 'center',
          textStyle: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
        },
        series: [],
      };
    }
    return {
      animation: true,
      tooltip: { show: false },
      series: [
        {
          type: 'pie',
          radius: ['48%', '72%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          label: { show: false },
          labelLine: { show: false },
          data: seriesData,
        },
      ],
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: '42%',
          style: {
            text: String(total),
            textAlign: 'center',
            fill: '#111827',
            fontSize: 18,
            fontWeight: 'bold',
          },
        },
        {
          type: 'text',
          left: 'center',
          top: '54%',
          style: {
            text: '种配料',
            textAlign: 'center',
            fill: '#6b7280',
            fontSize: 12,
          },
        },
      ],
    };
  },

  _initUtilDonutChart: function () {
    var that = this;
    if (!this.data.devianceDistribution || !this.data.devianceDistribution.buckets) {
      if (this._utilDonutChart) {
        try {
          this._utilDonutChart.dispose();
        } catch (e) {}
        this._utilDonutChart = null;
      }
      return;
    }
    var comp = this.selectComponent('#utilDonut');
    if (!comp) {
      return;
    }
    if (this._utilDonutChart) {
      this._utilDonutChart.setOption(this._getUtilDonutOption(), true);
      return;
    }
    comp.init(function (canvas, width, height) {
      var Chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: globalData.rpxR,
      });
      that._utilDonutChart = Chart;
      Chart.setOption(that._getUtilDonutOption());
      return Chart;
    });
  },

  _pickTotalCount: function (data) {
    if (data == null) {
      return null;
    }
    var t =
      data.ingredientTotal != null
        ? data.ingredientTotal
        : data.total != null
          ? data.total
          : data.totalCount != null
            ? data.totalCount
            : data.listTotal != null
              ? data.listTotal
              : null;
    if (t == null || t === '') {
      return null;
    }
    var n = parseInt(String(t), 10);
    return isNaN(n) ? null : n;
  },

  _mergeIngredientRows: function (prev, incoming) {
    var prevArr = prev || [];
    var add = incoming || [];
    if (!add.length) {
      return prevArr;
    }
    var seen = {};
    var i;
    for (i = 0; i < prevArr.length; i++) {
      var id = prevArr[i].disGoodsId;
      if (id != null) {
        seen[id] = 1;
      }
    }
    var out = prevArr.slice();
    for (i = 0; i < add.length; i++) {
      var row = add[i];
      var rid = row.disGoodsId;
      if (rid != null && seen[rid]) {
        continue;
      }
      if (rid != null) {
        seen[rid] = 1;
      }
      out.push(row);
    }
    return out;
  },

  _fetchIngredientReport: function (append) {
    var that = this;
    var isAppend = !!append;
    if (!this.data.disId) {
      wx.showToast({ title: '缺少配送商信息', icon: 'none' });
      return;
    }
    if (isAppend) {
      if (!that.data.ingredientHasMore || that.data.listLoadingMore || that.data.loading) {
        return;
      }
      that.setData({ listLoadingMore: true });
    } else {
      this.setData({ loading: true });
      load.showLoading('加载中');
    }

    var pageSize = this.data.ingredientPageSize || DEFAULT_INGREDIENT_PAGE_SIZE;
    var lastPage = this.data.ingredientListPage || 0;
    var reqPage = isAppend ? lastPage + 1 : 1;

    var req = {
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      endDate: this.data.stopDate,
      disId: this.data.disId,
      depFatherId: this.data.depFatherId,
      sortBy: this.data.ingredientSortBy || 'outbound',
      sortOrder: this.data.ingredientSortOrder || 'asc',
      goodsNameSearch: this.data.goodsNameSearch || '',
      page: reqPage,
      pageSize: pageSize,
      verificationStatus: this.data.verificationStatus || 'all',
    };
    var sid = this.data.activeSubDepId;
    if (sid != null && sid !== '') {
      req.subDepId = sid;
    }
    chartsApi.outboundIngredientAnalysis(req)
      .then(function (res) {
        // console.log('[costGoodsFenxi] outboundIngredientAnalysis 响应数据:', JSON.stringify(res));

        if (!isAppend) {
          load.hideLoading();
        }
        var data = (res.result && res.result.data) || {};
        var _rows = data.ingredientsAnalysis || data.list || [];
        var rows = _rows;
        var sortOrderEcho = data.sortOrder;
        var nextSortOrder =
          sortOrderEcho === 'desc' || sortOrderEcho === 'asc' ? sortOrderEcho : that.data.ingredientSortOrder;
        var pageEcho = data.page != null ? data.page : data.currentPage;
        var resolvedPage = pageEcho != null ? parseInt(String(pageEcho), 10) : reqPage;
        if (isNaN(resolvedPage)) {
          resolvedPage = reqPage;
        }
        var sizeEcho = data.pageSize != null ? parseInt(String(data.pageSize), 10) : pageSize;
        if (!isNaN(sizeEcho) && sizeEcho > 0 && sizeEcho !== that.data.ingredientPageSize) {
          that.setData({ ingredientPageSize: sizeEcho });
        }

        var totalCount = that._pickTotalCount(data);
        var prevList = that.data.ingredientsAnalysis || [];
        var nextList = isAppend ? that._mergeIngredientRows(prevList, rows) : rows;

        var hasMore;
        if (totalCount != null) {
          hasMore = nextList.length < totalCount;
        } else {
          hasMore = rows.length >= pageSize;
        }

        var firstId = nextList.length ? nextList[0].disGoodsId : null;
        var summary = data.summary;
        var utilDist = data.devianceDistribution;
        if (isAppend) {
          if (summary == null || summary === undefined) {
            summary = that.data.summary;
          }
          if (utilDist == null || utilDist === undefined) {
            utilDist = that.data.devianceDistribution;
          }
        } else {
          if (summary === undefined) {
            summary = null;
          }
          if (utilDist === undefined) {
            utilDist = null;
          }
        }

        // 计算出库去向分布百分比（仅用于展示）
        var distPcts = that._computeDistributionPct(summary);

        // 回显后端返回的 verificationStatus
        var vsEcho = data.verificationStatus;
        if (vsEcho && vsEcho !== 'all' && vsEcho !== 'verified' && vsEcho !== 'unverified' && vsEcho !== 'employeeMeal') {
          vsEcho = null;
        }

        var emptyHint = '';
        if (!nextList.length && !isAppend) {
          emptyHint = that.data.goodsNameSearch
            ? '未找到「' + that.data.goodsNameSearch + '」相关配料'
            : '';
        }

        that.setData(
          {
            loading: false,
            listLoadingMore: false,
            summary: summary,
            devianceDistribution: utilDist,
            ingredientsAnalysis: nextList,
            ingredientListPage: resolvedPage,
            ingredientTotal: totalCount != null ? totalCount : isAppend ? that.data.ingredientTotal : null,
            ingredientHasMore: hasMore,
            expandedDisGoodsId: isAppend ? that.data.expandedDisGoodsId : firstId,
            ingredientSortOrder: nextSortOrder,
            verificationStatus: vsEcho || that.data.verificationStatus,
            _distVerifiedPct: distPcts.verified,
            _distNonVerifiedPct: distPcts.nonVerified,
            _distMealPct: distPcts.meal,
            _distVerifiedTxt: distPcts.verifiedText,
            _distNonVerifiedTxt: distPcts.nonVerifiedText,
            _distMealTxt: distPcts.mealText,
            emptyHint: emptyHint,
          },
          function () {
            if (!isAppend) {
              wx.nextTick(function () {
                that._initUtilDonutChart();
              });
            }
          }
        );
      })
      .catch(function () {
        if (!isAppend) {
          load.hideLoading();
        }
        that.setData({
          loading: false,
          listLoadingMore: false,
        });
        if (!isAppend) {
          that.setData({
            summary: null,
            devianceDistribution: null,
            ingredientsAnalysis: [],
            expandedDisGoodsId: null,
            ingredientListPage: 0,
            ingredientTotal: null,
            ingredientHasMore: false,
            emptyHint: '',
          });
        }
      });
  },

  _fetchReport: function () {
    var that = this;
    this.setData(
      {
        ingredientListPage: 0,
        ingredientTotal: null,
        ingredientHasMore: true,
        listLoadingMore: false,
      },
      function () {
        that._fetchIngredientReport(false);
      }
    );
  },

  onIngredientScrollToLower: function () {
    this._fetchIngredientReport(true);
  },

  onToggleSearchBar: function () {
    var open = !this.data.searchBarOpen;
    if (open) {
      this.setData({
        searchBarOpen: true,
        searchInputFocus: true,
        goodsNameSearchDraft: this.data.goodsNameSearch || this.data.goodsNameSearchDraft || '',
      });
    } else {
      this.setData({
        searchBarOpen: false,
        searchInputFocus: false,
      });
    }
  },

  onGoodsSearchInput: function (e) {
    var that = this;
    var v = (e.detail && e.detail.value) || '';
    this.setData({ goodsNameSearchDraft: v });
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
    }
    this._searchDebounceTimer = setTimeout(function () {
      var t = (that.data.goodsNameSearchDraft || '').trim();
      if (t === (that.data.goodsNameSearch || '')) {
        return;
      }
      that.setData({ goodsNameSearch: t }, function () {
        that._fetchReport();
      });
    }, 400);
  },

  onGoodsSearchConfirm: function (e) {
    var v = ((e.detail && e.detail.value) || this.data.goodsNameSearchDraft || '').trim();
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
      this._searchDebounceTimer = null;
    }
    this.setData({ goodsNameSearch: v, goodsNameSearchDraft: v }, function () {
      this._fetchReport();
    });
  },

  onGoodsSearchClear: function () {
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
      this._searchDebounceTimer = null;
    }
    this.setData({ goodsNameSearch: '', goodsNameSearchDraft: '' }, function () {
      this._fetchReport();
    });
  },

  /** 计算出库去向分布百分比（仅用于前端展示） */
  _computeDistributionPct: function (summary) {
    if (!summary) {
      return { verified: 0, nonVerified: 0, meal: 0, verifiedText: '0%', nonVerifiedText: '0%', mealText: '0%' };
    }
    var total = parseFloat(String(summary.totalOutboundAmount || '0'));
    var verified = parseFloat(String(summary.verifiedTotalAmount || '0'));
    var nonVerified = parseFloat(String(summary.nonVerifiedTotalAmount || '0'));
    var meal = parseFloat(String(summary.employeeMealTotalAmount || '0'));
    if (isNaN(total) || total <= 0) {
      return { verified: 0, nonVerified: 0, meal: 0, verifiedText: '0%', nonVerifiedText: '0%', mealText: '0%' };
    }
    function fmt(v) {
      var p = Math.round((v / total) * 10000) / 100;
      return p.toFixed(p === Math.round(p) ? 0 : p < 10 ? 1 : 0) + '%';
    }
    return {
      verified: Math.round((verified / total) * 10000) / 100,
      nonVerified: Math.round((nonVerified / total) * 10000) / 100,
      meal: Math.round((meal / total) * 10000) / 100,
      verifiedText: fmt(verified),
      nonVerifiedText: fmt(nonVerified),
      mealText: fmt(meal),
    };
  },

  onVerificationFilterChange: function (e) {
    var status = e.currentTarget.dataset.status;
    if (!status || status === this.data.verificationStatus) {
      return;
    }
    var that = this;
    this.setData(
      { verificationStatus: status },
      function () {
        that._fetchReport();
      }
    );
  },

  onIngredientSort: function (e) {
    var that = this;
    var sort = e.currentTarget.dataset.sort;
    if (!sort) {
      return;
    }
    var curBy = this.data.ingredientSortBy;
    var curOrder = this.data.ingredientSortOrder || 'asc';
    if (sort === curBy) {
      var nextOrder = curOrder === 'asc' ? 'desc' : 'asc';
      this.setData({ ingredientSortOrder: nextOrder }, function () {
        that._fetchReport();
      });
    } else {
      this.setData({ ingredientSortBy: sort, ingredientSortOrder: 'asc' }, function () {
        that._fetchReport();
      });
    }
  },

  onIngredientFilter: function () {
    wx.showToast({ title: '筛选开发中', icon: 'none' });
  },

  onIngredientListScroll: function (e) {
    var d = e.detail;
    if (d && typeof d.scrollTop === 'number') {
      this._lastIngredientScrollTop = d.scrollTop;
    }
  },

  /**
   * scroll-view 在子节点高度变化时往往会把 scrollTop 置 0，表现为展开/收起「跳一下」。
   * 在布局更新后把滚动位置写回（优先 node.scrollTo，其次 scroll-top 双次 setData 触发）。
   */
  _restoreIngredientListScroll: function (top) {
    var that = this;
    var y = typeof top === 'number' && !isNaN(top) ? top : 0;
    wx.createSelectorQuery()
      .in(this)
      .select('#cogIngredientScroll')
      .node()
      .exec(function (res) {
        var node = res && res[0] && res[0].node;
        if (node && typeof node.scrollTo === 'function') {
          try {
            node.scrollTo({ scrollTop: y, animated: false });
            return;
          } catch (err) {}
        }
        var bump = y + 0.01;
        that.setData({ ingredientScrollRestoreTop: bump }, function () {
          wx.nextTick(function () {
            that.setData({ ingredientScrollRestoreTop: y }, function () {
              wx.nextTick(function () {
                that.setData({ ingredientScrollRestoreTop: '' });
              });
            });
          });
        });
      });
  },

  onToggleIngredientExpand: function (e) {
    var id = e.currentTarget.dataset.id;
    if (id === undefined || id === null) {
      return;
    }
    var saved =
      typeof this._lastIngredientScrollTop === 'number' ? this._lastIngredientScrollTop : 0;
    var cur = this.data.expandedDisGoodsId;
    var next = cur == id ? null : id;
    var that = this;
    this.setData({ expandedDisGoodsId: next }, function () {
      wx.nextTick(function () {
        setTimeout(function () {
          that._restoreIngredientListScroll(saved);
        }, 32);
      });
    });
  },

  toDatePage: function () {
    this.setData({ update: true });
    wx.navigateTo({
      url:
        '/pages/common/selectDate/selectDate?startDate=' +
        this.data.startDate +
        '&stopDate=' +
        this.data.stopDate +
        '&dateType=' +
        (this.data.dateType || 'month'),
    });
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 });
  },
});
