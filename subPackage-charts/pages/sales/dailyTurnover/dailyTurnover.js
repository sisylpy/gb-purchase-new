const globalData = getApp().globalData;

var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil.js')
var apiUrl = require('../../../../config/index');
var api = require('../../../services/api.js');
var echarts = require('../../../../ec-canvas/echarts');
var foodSalesTemplateWx = require('../../../../lib/foodSalesTemplateWx.js');
var foodSalesExcelApi = require('../../../../lib/foodSalesExcelApi.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    ecTurnover: {
      lazyLoad: false
    },

    // 日期相关默认值
    startDate: '',
    stopDate: '',
    dateType: 'month',
    hanzi: '本月',
    update: false,

    // 批发商
    distributerId: '',

    // 新数据结构
    summary: null,
    dailyRows: [],

    // 每日行展开控制
    showAllDailyRows: true,

    // 合并模板相关
    showCombinedTemplateModal: false,
    combinedTemplateStartDate: '',
    combinedTemplateEndDate: '',
    todayDate: '',

    // AI经营日报导入：上传后先展示预览/失败明细，确认后才入库
    showAiImportPreview: false,
    aiImportPreview: null,
    aiImportSubmitting: false,
  },

  onShow() {
    if (this.data.update) {
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
          update: false
        }, () => {
          this._initData();
          this._consumeUnifiedImportRequest();
        });
        return;
      }
    }
    this._initData();
    this._consumeUnifiedImportRequest();
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this._routeAutoImportMode = options && options.autoImport
      ? String(options.autoImport) : '';
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
    })

    this._syncDatesFromMyDateStorage();

    var value = wx.getStorageSync('mendianInfo');
    if (value) {
      this.setData({
        mendianInfo: value,
        depFatherId: value.gbDepartmentId,
      });

    }

    // 获取批发商信息
    var disInfo = wx.getStorageSync('disInfo');
    if (disInfo && disInfo.gbDistributerId) {
      this.setData({
        distributerId: disInfo.gbDistributerId,
      });
    }

    // 合并模板日期初始化
    var today = dateUtils.getArriveDate(0);
    var firstDay = today.substring(0, 8) + '01';
    this.setData({
      todayDate: today,
      combinedTemplateStartDate: firstDay,
      combinedTemplateEndDate: today,
    });

    this._initData();
  },

  onReady: function () {
    this._consumeUnifiedImportRequest();
  },

  /**
   * 旧的销量/营业额编辑页只负责把用户带回这个唯一导入入口。
   * 文件解析、菜名确认、覆盖预览和提交证据不得再分散到其它页面。
   */
  _consumeUnifiedImportRequest: function () {
    var mode = this._routeAutoImportMode || '';
    this._routeAutoImportMode = '';
    var request = wx.getStorageSync('dailyTurnoverUnifiedImportRequest');
    if (request) {
      wx.removeStorageSync('dailyTurnoverUnifiedImportRequest');
      var requestedAt = Number(request.requestedAt || 0);
      if (requestedAt > 0 && Date.now() - requestedAt <= 60000) {
        mode = request.mode || mode;
      }
    }
    if (!mode || this._autoImportOpening) return;
    this._autoImportOpening = true;
    var that = this;
    setTimeout(function () {
      that._autoImportOpening = false;
      if (mode === 'standard') {
        that.onUploadCombinedExcel();
      } else {
        that.onAiImportExcel();
      }
    }, 80);
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

  /**
   * 初始化数据
   */
  _initData() {
    load.showLoading("获取数据中")
    var params = {
      departmentId: this.data.depFatherId,
      startDate: this.data.startDate,
      endDate: this.data.stopDate,
    };
    // 传入批发商 ID
    if (this.data.distributerId) {
      params.distributerId = this.data.distributerId;
    }

    api.getDailyTurnover(params).then(res => {
      load.hideLoading();

      var result = res.result;
      var data = result.data;

      if (result.code == 0 && data) {
        var summary = data.summary || null;
        var dailyRows = data.dailyRows || [];

        this.setData({
          summary: summary,
          dailyRows: dailyRows,
        });

        // 延迟初始化图表
        if (dailyRows && dailyRows.length > 0) {
          var that = this;
          setTimeout(function() {
            that.init_chart();
          }, 300);
        }
      } else {
        wx.showToast({
          title: result.msg || '获取数据失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      load.hideLoading();
      console.log('err:', err);
      wx.showToast({
        title: '网络请求失败',
        icon: 'none'
      });
    });
  },

  /**
   * 初始化营业额趋势图表
   */
  init_chart: function () {
    var that = this;
    that.echartsComponent = that.selectComponent('#turnoverChart');
    if (!that.echartsComponent) {
      return;
    }
    that.echartsComponent.init((canvas, width, height) => {
      const Chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: globalData.rpxR
      });
      const option = that.getChartOption();
      Chart.setOption(option);
      that.setData({
        chartDrawn: true
      });
      return Chart;
    });
  },

  /**
   * 获取图表配置：堂食/外卖双折线图
   */
  getChartOption() {
    const dailyRows = this.data.dailyRows || [];
    if (!dailyRows || dailyRows.length === 0) {
      return {
        title: { text: '暂无数据', left: 'center', top: 'center' }
      };
    }

    var dates = [];
    var dineInData = [];
    var takeoutData = [];

    dailyRows.forEach(function(item) {
      var d = item.date || '';
      if (d) {
        var parts = d.split('-');
        dates.push(parts[1] + '/' + parts[2]);
      } else {
        dates.push('');
      }
      dineInData.push(parseFloat(item.dineInRevenueAmount) || 0);
      takeoutData.push(parseFloat(item.takeoutRevenueAmount) || 0);
    });

    return {
      animation: true,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
        formatter: function(params) {
          var day = params[0].axisValue;
          var html = day + '<br/>';
          params.forEach(function(item) {
            html += item.marker + item.seriesName + ': ' + item.value + '元<br/>';
          });
          return html;
        }
      },
      legend: {
        show: true,
        top: 0,
        right: 0,
        itemWidth: 16,
        itemHeight: 8,
        textStyle: { fontSize: 12, color: '#666' },
        data: ['堂食', '外卖']
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '8%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#e0e0e0' } },
        axisLabel: { color: '#999', fontSize: 11 },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisLabel: { color: '#999', fontSize: 11 },
        splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } }
      },
      series: [
        {
          name: '堂食',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          data: dineInData,
          itemStyle: { color: '#007aff' },
          lineStyle: { width: 2.5 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(0,122,255,0.15)' },
                { offset: 1, color: 'rgba(0,122,255,0.02)' }
              ]
            }
          }
        },
        {
          name: '外卖',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          data: takeoutData,
          itemStyle: { color: '#34c759' },
          lineStyle: { width: 2.5 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(52,199,89,0.15)' },
                { offset: 1, color: 'rgba(52,199,89,0.02)' }
              ]
            }
          }
        }
      ]
    };
  },

  /** 展开/收起每日详情 */
  toggleDailyRows: function () {
    this.setData({ showAllDailyRows: !this.data.showAllDailyRows });
  },

  /**
   * 跳转日期选择
   */
  toDatePage() {
    this.setData({ update: true })
    wx.navigateTo({
      url: '/pages/common/selectDate/selectDate?startDate=' + this.data.startDate +
        '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType,
    })
  },

  /**
   * 返回
   */
  toBack() {
    wx.navigateBack({ delta: 1 })
  },

  /**
   * 添加单日营业额
   */
  addSingleDay() {
    var anchor =
      (this.data.stopDate && String(this.data.stopDate).substring(0, 10)) ||
      (this.data.startDate && String(this.data.startDate).substring(0, 10)) ||
      dateUtils.getArriveDate(0);
    wx.navigateTo({
      url:
        '../addFoodSales/addFoodSales?type=single&departmentId=' +
        (this.data.depFatherId || '') +
        '&anchorDate=' +
        encodeURIComponent(anchor),
    });
  },

  /**
   * 每日详情某一行：进入「修改菜品销量」
   */
  openFoodSalesEdit(e) {
    var raw = e.currentTarget.dataset.recordDate || e.currentTarget.dataset.date;
    if (raw == null || raw === '') {
      wx.showToast({ title: '日期缺失', icon: 'none' });
      return;
    }
    var day = String(raw).trim().substring(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      wx.showToast({ title: '日期格式异常', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url:
        '../editFoodSales/editFoodSales?edit=1&type=single&departmentId=' +
        (this.data.depFatherId || '') +
        '&anchorDate=' +
        encodeURIComponent(day),
    });
  },

  // ========== 合并模板：下载 / 上传 ==========

  _ensureTemplateDepartmentId: function () {
    var id = this.data.depFatherId;
    if (!id) {
      wx.showToast({ title: '请先登录门店', icon: 'none' });
      return '';
    }
    return id;
  },

  _resolveDistributerId: function () {
    var disInfo = this.data.disInfo || wx.getStorageSync('disInfo');
    if (disInfo && disInfo.gbDistributerId != null) {
      return disInfo.gbDistributerId;
    }
    return '';
  },

  onDownloadCombinedTemplate: function () {
    if (!this._ensureTemplateDepartmentId()) return;
    var today = dateUtils.getArriveDate(0);
    var patch = { showCombinedTemplateModal: true, todayDate: today };
    if (this.data.combinedTemplateStartDate > today) {
      patch.combinedTemplateStartDate = today;
    }
    if (this.data.combinedTemplateEndDate > today) {
      patch.combinedTemplateEndDate = today;
    }
    this.setData(patch);
  },

  onCloseCombinedTemplateModal: function () {
    this.setData({ showCombinedTemplateModal: false });
  },

  onCombinedTemplateStartChange: function (e) {
    var value = e.detail.value;
    var today = dateUtils.getArriveDate(0);
    var v = value > today ? today : value;
    var end0 = this.data.combinedTemplateEndDate;
    var patch = { combinedTemplateStartDate: v };
    if (end0 && v > end0) {
      patch.combinedTemplateEndDate = v;
    }
    this.setData(patch);
  },

  onCombinedTemplateEndChange: function (e) {
    var value = e.detail.value;
    var today = dateUtils.getArriveDate(0);
    var v = value > today ? today : value;
    var start0 = this.data.combinedTemplateStartDate;
    if (start0 && v < start0) {
      v = start0;
    }
    this.setData({ combinedTemplateEndDate: v });
  },

  onConfirmDownloadCombined: function () {
    var startDate = this.data.combinedTemplateStartDate;
    var endDate = this.data.combinedTemplateEndDate;
    if (!startDate || !endDate) {
      wx.showToast({ title: '请选择日期范围', icon: 'none' });
      return;
    }
    if (startDate > endDate) {
      wx.showToast({ title: '开始日期不能晚于结束日期', icon: 'none' });
      return;
    }
    var today = dateUtils.getArriveDate(0);
    if (startDate > today || endDate > today) {
      wx.showToast({ title: '开始/结束日期不能晚于今天', icon: 'none' });
      return;
    }
    var departmentId = this._ensureTemplateDepartmentId();
    if (!departmentId) return;
    this.onCloseCombinedTemplateModal();
    foodSalesTemplateWx.downloadCombinedDailyTemplate(apiUrl.apiUrl, startDate, endDate, departmentId);
  },

  _isExcelChatFile: function (f) {
    if (!f) return false;
    var name = String(f.name || '').toLowerCase();
    var path = String(f.path || '').toLowerCase();
    return (
      name.endsWith('.xlsx') ||
      name.endsWith('.xls') ||
      path.endsWith('.xlsx') ||
      path.endsWith('.xls')
    );
  },

  _promptNonExcelChatFile: function (f) {
    var name = String((f && f.name) || '').toLowerCase();
    if (name.endsWith('.numbers')) {
      wx.showModal({
        title: '当前是 Numbers 格式',
        content:
          '您选的是 Apple「Numbers」表格（.numbers），与 Excel（.xlsx/.xls）不同，无法直接导入。\n\n请用 Numbers 打开后：右上角「共享」→「Excel」→ 导出 .xlsx，再发到微信里上传。',
        showCancel: false,
        confirmText: '知道了',
      });
      return;
    }
    wx.showToast({
      title: '请选 .xlsx 或 .xls（Excel）',
      icon: 'none',
      duration: 2800,
    });
  },

  /** 选择任意订货/POS系统导出的Excel，由AI识别菜品销量和营业额。 */
  onAiImportExcel: function () {
    var departmentId = this._ensureTemplateDepartmentId();
    if (!departmentId) return;
    var distributerId = this._resolveDistributerId();
    if (!distributerId) {
      wx.showToast({ title: '缺少批发商信息', icon: 'none' });
      return;
    }
    var that = this;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success: function (res) {
        var f = (res.tempFiles || [])[0];
        if (!f || !f.path) {
          wx.showToast({ title: '未获取到文件', icon: 'none' });
          return;
        }
        if (!that._isExcelChatFile(f)) {
          that._promptNonExcelChatFile(f);
          return;
        }
        that._chooseAiImportSettings(f.path, departmentId, distributerId);
      },
      fail: function (err) {
        var msg = err && err.errMsg ? String(err.errMsg) : '';
        if (msg.indexOf('cancel') < 0 && msg.indexOf('取消') < 0) {
          wx.showToast({ title: '未选择文件', icon: 'none' });
        }
      },
    });
  },

  _resolveOperatorId: function () {
    var userInfo = wx.getStorageSync('userInfo') || {};
    var operatorId = Number(userInfo.gbDepartmentUserId || 0);
    if (!operatorId) {
      wx.showToast({ title: '缺少当前操作人信息', icon: 'none' });
      return 0;
    }
    return operatorId;
  },

  _chooseAiImportSettings: function (filePath, departmentId, distributerId) {
    var that = this;
    var lastSource = wx.getStorageSync('revenueImportSourceSystem') || '';
    wx.showModal({
      title: '填写报表来源',
      content: lastSource,
      editable: true,
      placeholderText: '例如：美团收银、二维火、客如云',
      confirmText: '下一步',
      success: function (res) {
        if (!res.confirm) return;
        var sourceSystem = String(res.content || '').trim();
        if (!sourceSystem) {
          wx.showToast({ title: '请填写POS系统或文件来源', icon: 'none' });
          return;
        }
        wx.setStorageSync('revenueImportSourceSystem', sourceSystem);
        wx.showActionSheet({
          itemList: ['只更新文件中的菜品（推荐）', '整段日期范围覆盖'],
          success: function (modeRes) {
            that._analyzeAiRevenueFile(filePath, departmentId, distributerId, {
              sourceSystem: sourceSystem,
              templateType: '经营日报',
              importMode: modeRes.tapIndex === 1 ? 'RANGE_REPLACE' : 'PATCH',
              operatorId: that._resolveOperatorId(),
            });
          },
        });
      },
    });
  },

  _analyzeAiRevenueFile: function (filePath, departmentId, distributerId, options) {
    if (!options || !options.operatorId) return;
    var that = this;
    wx.showLoading({ title: 'AI正在识别...', mask: true });
    foodSalesExcelApi
      .analyzeAiRevenueExcel(filePath, departmentId, distributerId, options)
      .then(function (res) {
        wx.hideLoading();
        var result = res.result || {};
        if (result.code !== 0 && result.code !== '0') {
          wx.showModal({
            title: '识别失败',
            content: result.msg || 'Excel暂时无法识别，请检查文件后重试',
            showCancel: false,
          });
          return;
        }
        var preview = result.data;
        if (!preview) {
          wx.showToast({ title: '没有返回识别结果', icon: 'none' });
          return;
        }
        that.setData({
          aiImportPreview: preview,
          showAiImportPreview: true,
          aiImportSubmitting: false,
        });
      })
      .catch(function (err) {
        wx.hideLoading();
        console.error('analyze ai revenue excel', err);
        wx.showToast({ title: 'AI识别请求失败', icon: 'none' });
      });
  },

  onConfirmAiDishCandidate: function (e) {
    var preview = this.data.aiImportPreview;
    if (!preview || this.data.aiImportSubmitting) return;
    var rawDishName = e.currentTarget.dataset.rawname;
    var foodId = Number(e.currentTarget.dataset.foodid || 0);
    var foodName = e.currentTarget.dataset.foodname || '';
    var departmentId = this._ensureTemplateDepartmentId();
    var distributerId = this._resolveDistributerId();
    var operatorId = this._resolveOperatorId();
    if (!rawDishName || !foodId || !departmentId || !distributerId || !operatorId) return;
    var that = this;
    wx.showModal({
      title: '确认菜品对应关系',
      content: 'Excel中的“' + rawDishName + '”以后对应系统菜品“' + foodName + '”？',
      confirmText: '确认对应',
      success: function (res) {
        if (!res.confirm) return;
        that.setData({ aiImportSubmitting: true });
        wx.showLoading({ title: '正在确认...', mask: true });
        foodSalesExcelApi.confirmAiRevenueDishMapping(preview.jobId, {
          departmentId: departmentId,
          distributerId: distributerId,
          rawDishName: rawDishName,
          foodId: foodId,
          operatorId: operatorId,
          confirmationReason: '用户在营业额导入预览中确认',
        }).then(function (result) {
          wx.hideLoading();
          var body = result.result || {};
          that.setData({ aiImportSubmitting: false });
          if (body.code === 0 || body.code === '0') {
            that.setData({ aiImportPreview: body.data });
            wx.showToast({ title: '已确认菜品', icon: 'success' });
          } else {
            wx.showModal({ title: '确认失败', content: body.msg || '请稍后重试', showCancel: false });
          }
        }).catch(function (err) {
          wx.hideLoading();
          that.setData({ aiImportSubmitting: false });
          console.error('confirm ai dish mapping', err);
          wx.showToast({ title: '确认请求失败', icon: 'none' });
        });
      },
    });
  },

  onCloseAiImportPreview: function () {
    if (this.data.aiImportSubmitting) return;
    this.setData({ showAiImportPreview: false });
  },

  noopAiImport: function () {},

  onRetryAiImport: function () {
    if (this.data.aiImportSubmitting) return;
    this.setData({ showAiImportPreview: false });
    this.onAiImportExcel();
  },

  onOpenAiImportFailureReport: function () {
    var preview = this.data.aiImportPreview;
    if (!preview || !preview.jobId) return;
    var departmentId = this._ensureTemplateDepartmentId();
    var distributerId = this._resolveDistributerId();
    var operatorId = this._resolveOperatorId();
    if (!departmentId || !distributerId || !operatorId) return;
    wx.showLoading({ title: '生成明细...', mask: true });
    foodSalesExcelApi
      .openAiRevenueFailureReport(preview.jobId, departmentId, distributerId)
      .then(function () { wx.hideLoading(); })
      .catch(function (err) {
        wx.hideLoading();
        console.error('open ai revenue failure report', err);
        wx.showToast({ title: '失败明细打开失败', icon: 'none' });
      });
  },

  onCommitAiImport: function () {
    var preview = this.data.aiImportPreview;
    if (!preview || !preview.jobId || !preview.canCommit || this.data.aiImportSubmitting) {
      return;
    }
    var departmentId = this._ensureTemplateDepartmentId();
    var distributerId = this._resolveDistributerId();
    var operatorId = this._resolveOperatorId();
    if (!departmentId || !distributerId || !operatorId) return;
    var that = this;
    wx.showModal({
      title: '确认导入',
      content: preview.impact && preview.impact.explanation
        ? preview.impact.explanation + '。确认继续吗？'
        : '确认按识别结果更新菜品销量和营业额？',
      success: function (modalRes) {
        if (!modalRes.confirm) return;
        that.setData({ aiImportSubmitting: true });
        wx.showLoading({ title: '正在导入...', mask: true });
        foodSalesExcelApi
          .commitAiRevenueImport(preview.jobId, departmentId, distributerId, operatorId)
          .then(function (res) {
            wx.hideLoading();
            var result = res.result || {};
            if (result.code === 0 || result.code === '0') {
              that.setData({
                showAiImportPreview: false,
                aiImportPreview: null,
                aiImportSubmitting: false,
              });
              wx.showToast({ title: '导入成功', icon: 'success' });
              that._initData();
            } else {
              that.setData({ aiImportSubmitting: false });
              wx.showModal({
                title: '导入未完成',
                content: result.msg || '本次数据均未写入，请稍后重试',
                showCancel: false,
              });
            }
          })
          .catch(function (err) {
            wx.hideLoading();
            that.setData({ aiImportSubmitting: false });
            console.error('commit ai revenue import', err);
            wx.showToast({ title: '导入请求失败', icon: 'none' });
          });
      },
    });
  },

  onUploadCombinedExcel: function () {
    var departmentId = this._ensureTemplateDepartmentId();
    if (!departmentId) return;
    var distributerId = this._resolveDistributerId();
    if (!distributerId) {
      wx.showToast({ title: '缺少批发商信息', icon: 'none' });
      return;
    }
    var that = this;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success: function (res) {
        var list = res.tempFiles || [];
        var f = list[0];
        if (!f || !f.path) {
          wx.showToast({ title: '未获取到文件', icon: 'none' });
          return;
        }
        if (!that._isExcelChatFile(f)) {
          that._promptNonExcelChatFile(f);
          return;
        }
        wx.showModal({
          title: '确认上传',
          content: '系统会先核对菜品、销量、单价和营业额，确认无误后再写入。',
          success: function (modalRes) {
            if (modalRes.confirm) {
              var operatorId = that._resolveOperatorId();
              if (!operatorId) return;
              that._analyzeAiRevenueFile(f.path, departmentId, distributerId, {
                sourceSystem: '精彩账本标准模板',
                templateType: '合并营业额模板',
                templateVersion: 'v1',
                importMode: 'PATCH',
                operatorId: operatorId,
              });
            }
          },
        });
      },
      fail: function (err) {
        var msg = err && err.errMsg ? String(err.errMsg) : '';
        if (msg.indexOf('cancel') >= 0 || msg.indexOf('取消') >= 0) {
          return;
        }
        wx.showToast({ title: '未选择文件', icon: 'none' });
      },
    });
  },

})
