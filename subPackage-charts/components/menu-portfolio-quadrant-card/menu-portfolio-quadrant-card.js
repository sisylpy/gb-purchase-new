/**
 * 菜品分类分布 - 经营看板卡片（ECharts 环形图）
 *
 * cardData（由 _resolveDisplayCard 预构建）：
 * {
 *   title: "菜品分类分布",
 *   subtitle: "按本轮菜单内销量与实际利润相对分层",
 *   totalDishCount: 4,
 *   categories: [
 *     { categoryCode, categoryName, count, ratio, summary, recommendedAction, dishes[] }
 *   ]
 * }
 */

var echarts = require('../../ec-canvas/echarts');

var CATEGORY_COLORS = {
  STAR: '#F5A623',
  TRAFFIC: '#4A90D9',
  POTENTIAL: '#7ED321',
  ELIMINATE: '#D0021B',
};

Component({
  properties: {
    cardData: {
      type: Object,
      value: null,
      observer: '_onCardDataChange',
    },
  },

  data: {
    visible: false,
    title: '',
    subtitle: '',
    totalDishCount: 0,
    categories: [],
    expandedCategory: '',
    insightText: '',
    emptyReason: '',
    _colorMap: CATEGORY_COLORS,
    ec: {
      lazyLoad: true,
    },
  },

  methods: {
    _onCardDataChange: function (newVal) {
      if (!newVal) {
        this.setData({ visible: false });
        return;
      }

      // 空状态：显示提示文案
      if (!Array.isArray(newVal.categories) || !newVal.categories.length) {
        this.setData({
          visible: true,
          title: newVal.title || '菜单结构四象限',
          subtitle: '',
          categories: [],
          emptyReason: newVal.emptyReason || '暂无数据',
          insightText: '',
        });
        return;
      }

      // 补齐 categoryCode：后端可能只返回 categoryName
      var categories = newVal.categories.map(function (cat) {
        var code = cat.categoryCode;
        if (!code && cat.categoryName) {
          var name = String(cat.categoryName);
          if (name.indexOf('明星') !== -1) code = 'STAR';
          else if (name.indexOf('引流') !== -1) code = 'TRAFFIC';
          else if (name.indexOf('潜力') !== -1) code = 'POTENTIAL';
          else if (name.indexOf('淘汰') !== -1) code = 'ELIMINATE';
        }
        return Object.assign({}, cat, { categoryCode: code || cat.categoryCode || 'UNKNOWN' });
      });

      // 生成经营结论
      var insightText = this._buildInsight(categories, newVal.totalDishCount);

      // 保留之前的展开状态
      var prevExpanded = this.data.expandedCategory;
      var stillExists = categories.some(function (c) { return c.categoryCode === prevExpanded; });

      this.setData({
        visible: true,
        title: newVal.title || '菜品分类分布',
        subtitle: newVal.subtitle || '按本轮菜单内销量与实际利润相对分层',
        totalDishCount: newVal.totalDishCount || 0,
        categories: categories,
        expandedCategory: stillExists ? prevExpanded : '',
        insightText: insightText,
      });

      // 延迟初始化 ECharts（等待 DOM 就绪）
      var that = this;
      setTimeout(function () {
        that._initChart(categories, newVal.totalDishCount || 0);
      }, 300);
    },

    /** 初始化 ECharts 环形图 */
    _initChart: function (categories, totalCount) {
      var that = this;
      var ecComponent = this.selectComponent('#mpq-donut');
      if (!ecComponent) {
        console.warn('[MPQ] ec-canvas 组件未找到 #mpq-donut');
        return;
      }

      ecComponent.init(function (canvas, width, height, dpr) {
        var chart = echarts.init(canvas, null, {
          width: width,
          height: height,
          devicePixelRatio: dpr,
        });

        var option = that._buildChartOption(categories, totalCount);
        chart.setOption(option);
        return chart;
      });
    },

    /** 构建 ECharts option */
    _buildChartOption: function (categories, totalCount) {
      var data = categories.map(function (cat) {
        return {
          name: cat.categoryName,
          value: cat.count || 0,
          itemStyle: {
            color: CATEGORY_COLORS[cat.categoryCode] || '#d0d0d0',
          },
        };
      });

      return {
        series: [{
          type: 'pie',
          radius: ['55%', '75%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: true,
          label: {
            show: false,
          },
          labelLine: {
            show: false,
          },
          data: data,
        }],
        graphic: [
          {
            type: 'text',
            left: 'center',
            top: '38%',
            style: {
              text: '菜品总数',
              textAlign: 'center',
              fontSize: 12,
              fill: '#9aa0a6',
            },
          },
          {
            type: 'text',
            left: 'center',
            top: '50%',
            style: {
              text: (totalCount || 0) + '道',
              textAlign: 'center',
              fontSize: 20,
              fontWeight: 'bold',
              fill: '#1a1a1a',
            },
          },
        ],
      };
    },

    /** 生成经营结论 */
    _buildInsight: function (categories, totalCount) {
      if (!categories || !categories.length) return '';

      // 找出 count 最大的分类
      var maxCat = categories.reduce(function (prev, curr) {
        return (curr.count || 0) > (prev.count || 0) ? curr : prev;
      }, categories[0]);

      if (!maxCat) return '';
      return '本月共分析 ' + (totalCount || 0) + ' 道菜，' + maxCat.categoryName + '占比最高，建议优先检查' + maxCat.categoryName + '成本和定价。';
    },

    /** 点击分类标题展开/收起 dishes */
    onCategoryToggle: function (e) {
      var code = e.currentTarget.dataset.code;
      if (!code) return;
      var next = this.data.expandedCategory === code ? '' : code;
      this.setData({ expandedCategory: next });
    },
  },
});
