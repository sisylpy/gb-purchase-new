/**
 * 我的工作记录页面
 *
 * 视图：
 * - AI整理（默认）：展示分类标签 + polishedContent + 原话收起展开 + 时间
 * - 流水记录：只展示原始记录，无分类标签
 *
 * 交互：
 * - 按"今天/昨天/具体日期"分组，日期与同一天内记录均按时间倒序（新在上，旧在下）
 * - 右上角“＋”进入 AI 识别与确认页
 * - 下拉刷新 + 分页加载
 */

var api = require('../../services/api');
var dateUtil = require('../../../lib/dateUtil');
var sourceCardBuilder = require('../../utils/sourceCardBuilder');

Page({
  data: {
    // 导航栏高度
    navBarHeight: 0,

    // 记录数据（按日期分组后）
    groupedRecords: [],

    // 原始记录列表（未分组，用于流水视图）
    rawRecordList: [],

    // 修改弹窗
    showEditPopup: false,
    editingRecordId: '',
    editingContent: '',

    // 加载状态
    loading: false,
    refreshing: false,
    loadingMore: false,
    noMore: false,

    // 分页
    page: 1,
    pageSize: 20,

    // 滚动定位
    scrollIntoView: '',

    // 用户/门店上下文
    userId: 0,
    departmentId: 0,
    distributerId: 0,

    // 长期会话ID
    conversationId: null,

    // 分类映射（id -> {name, icon, bg, color}）
    categoryMap: {},

    // 分类列表（含「全部」，用于筛选栏）
    categoryList: [],

    // 当前选中的分类 ID（null 表示「全部」）
    activeCategoryId: null,
  },

  onLoad: function (options) {
    var that = this;
    var sys = wx.getSystemInfoSync();
    var app = getApp();
    var gd = app.globalData || {};

    // 计算导航栏高度（rpx）
    var navBarHeightPx = gd.navBarHeight || (sys.statusBarHeight + 44);
    var rpxRatio = 750 / sys.windowWidth;
    var navBarHeightRpx = Math.round(navBarHeightPx * rpxRatio);

    // 读取用户上下文
    var userInfo = wx.getStorageSync('userInfo') || {};
    var disInfo = wx.getStorageSync('disInfo') || {};
    var mendianInfo = wx.getStorageSync('mendianInfo') || {};

    var userId = userInfo.gbDepartmentUserId;
    var departmentId = mendianInfo.gbDepartmentId;
    var distributerId = userInfo.gbDuDistributerId ;

    that.setData({
      navBarHeight: navBarHeightRpx,
      userId: userId,
      departmentId: departmentId,
      distributerId: distributerId,
    });

    // 初始化加载
    that._initLoad();
  },

  onShow: function () {
    if (this._loadedOnce) this._fetchRecords(false);
  },

  // ========== 初始化加载 ==========

  _initLoad: function () {
    var that = this;
    that.setData({ loading: true, page: 1, noMore: false });

    // 并行获取：长期会话 + 分类列表
    Promise.all([
      that._fetchConversation(),
      that._fetchCategories(),
    ])
      .then(function () {
        return that._fetchRecords();
      })
      .then(function () {
        that.setData({ loading: false });
        that._loadedOnce = true;
      })
      .catch(function (err) {
        console.error('[工作记录] 初始化加载失败', err);
        that.setData({ loading: false });
        wx.showToast({ title: '加载失败，请下拉刷新', icon: 'none' });
      });
  },

  // ========== 获取长期 Conversation ==========

  _fetchConversation: function () {
    var that = this;
    var userId = that.data.userId;
    var departmentId = that.data.departmentId;

    if (!userId) {
      console.warn('[工作记录] 无有效 userId，跳过获取会话');
      return Promise.resolve();
    }

    return api
      .getWorkRecordConversation({ userId: userId, departmentId: departmentId, distributerId: that.data.distributerId || undefined })
      .then(function (res) {
        var result = res.result || {};
        var data = result.data || result;
        var conversationId = data.id || data.conversationId || data.gbAiConversationId || null;
        if (conversationId) {
          that.setData({ conversationId: conversationId });
        }
      })
      .catch(function (err) {
        console.warn('[工作记录] 获取会话失败', err);
        // 会话获取失败不影响页面展示，后续新建记录时可自动创建
      });
  },

  // ========== 查询分类 ==========

  _fetchCategories: function () {
    var that = this;
    var userId = that.data.userId;
    if (!userId) {
      console.warn('[工作记录] 无有效 userId，跳过获取分类列表');
      return Promise.resolve();
    }

    var params = { userId: userId };
    if (that.data.distributerId) {
      params.distributerId = that.data.distributerId;
    }

    return api
      .getWorkRecordCategories(params)
      .then(function (res) {
        var result = res.result || {};
        var list = result.data || result || [];
        var map = {};
        (Array.isArray(list) ? list : []).forEach(function (item) {
          var id = item.id || item.categoryId || item.code;
          if (id !== undefined && id !== null) {
            map[id] = {
              name: item.name || item.categoryName || '未分类',
              icon: item.icon || item.emoji || '',
              bg: item.bgColor || item.backgroundColor || '#e8f5e9',
              color: item.color || item.textColor || '#2e7d32',
            };
          }
        });
        // 构建带「全部」的分类列表（用于筛选栏）
        var categoryList = [{ id: null, name: '全部', icon: '', bg: '#e8f5e9', color: '#2e7d32' }];
        (Array.isArray(list) ? list : []).forEach(function (item) {
          var id = item.id || item.categoryId || item.code;
          if (id !== undefined && id !== null) {
            categoryList.push({
              id: id,
              name: item.name || item.categoryName || '未分类',
              icon: item.icon || item.emoji || '',
              bg: item.bgColor || item.backgroundColor || '#e8f5e9',
              color: item.color || item.textColor || '#2e7d32',
            });
          }
        });

        that.setData({ categoryMap: map, categoryList: categoryList });
      })
      .catch(function (err) {
        console.error('[工作记录] 获取分类列表失败（status=%s, msg=%s），页面将使用记录接口自带的 categoryName 显示',
          (err && err.statusCode) || 'unknown',
          (err && (err.message || err.errMsg)) || 'unknown');
      });
  },

  // ========== 查询工作记录列表 ==========

  _fetchRecords: function (isLoadMore) {
    var that = this;
    var page = isLoadMore ? that.data.page + 1 : 1;
    var pageSize = that.data.pageSize;

    if (!isLoadMore) {
      that.setData({ page: 1, noMore: false });
    }

    var params = {
      userId: that.data.userId,
      departmentId: that.data.departmentId,
      distributerId: that.data.distributerId || undefined,
      page: page,
      pageSize: pageSize,
    };

    // 分类筛选
    var activeCategoryId = that.data.activeCategoryId;
    if (activeCategoryId !== null && activeCategoryId !== undefined) {
      params.categoryId = activeCategoryId;
    }

    return api
      .listWorkRecords(params)
      .then(function (res) {
        var result = res.result || {};
        var body = result.data || result;
        var items = body.items || body.list || body.records || body || [];
        if (!Array.isArray(items)) {
          items = [];
        }

        var total = body.total || items.length;
        var hasMore = items.length >= pageSize && page * pageSize < total;

        // 规范化记录
        var normalized = items.map(that._normalizeRecord.bind(that));

        // 合并数据（如果是加载更多）
        var allRecords;
        if (isLoadMore) {
          allRecords = that.data.rawRecordList.concat(normalized);
        } else {
          allRecords = normalized;
        }

        // 日期分组
        var grouped = that._groupByDate(allRecords);

        that.setData({
          rawRecordList: allRecords,
          groupedRecords: grouped,
          page: page,
          noMore: !hasMore,
          loadingMore: false,
        }, function () {
          that._prefetchSourceCardsForRecords(allRecords);
        });

        // 倒序排列时最新记录在顶部，无需滚动
      })
      .catch(function (err) {
        console.error('[工作记录] 获取记录列表失败', err);
        that.setData({ loadingMore: false });
        wx.showToast({ title: '获取记录失败', icon: 'none' });
      });
  },

  // ========== 记录规范化 ==========

  _normalizeRecord: function (raw) {
    var that = this;
    var categoryMap = that.data.categoryMap || {};

    var id = raw.id || raw.recordId || raw.workRecordId || raw.gbWorkRecordId || (Date.now() + Math.random());
    var rawContent = raw.rawContent || raw.content || raw.message || raw.gbWorkRecordRawContent || '';
    var polishedContent = raw.polishedContent || raw.gbWorkRecordPolishedContent || '';
    var title = raw.title || raw.gbWorkRecordTitle || raw.gbWrTitle || '';
    var createdAt =
      raw.recordedAtEpoch ||
      raw.createdAtEpoch ||
      raw.recordedAt ||
      raw.gbWrRecordedAt ||
      raw.createdAt ||
      raw.createTime ||
      raw.gbWorkRecordCreateTime ||
      raw.gbWrCreatedAt ||
      '';
    var status = raw.aiStatus || raw.status || raw.gbWorkRecordStatus || 'SUCCESS';
    var announcementPublished = raw.announcementPublished === true;

    var rawTags = Array.isArray(raw.tags) ? raw.tags : [];
    var tags = rawTags.map(function (tag) {
      var tagId = tag.categoryId || tag.id;
      var style = categoryMap[tagId] || {};
      return {
        id: tagId,
        name: tag.categoryName || tag.name || style.name || '未分类',
        icon: style.icon || '',
        bg: style.bg || '#eef5f1',
        color: style.color || '#35745c',
      };
    });

    // 旧单分类字段继续作为没有关系数据时的兼容回退
    var categoryId = raw.categoryId || raw.gbWorkRecordCategoryId || null;

    // 后端直接返回的分类名称（优先使用，最权威）
    var categoryNameFromApi = raw.categoryName || raw.gbWorkRecordCategoryName || null;

    // 来源信息（用于 BUSINESS_CARD 来源卡片展示）
    var originType = raw.originType || raw.gbWorkRecordOriginType || null;
    var sourceConversationId = raw.sourceConversationId || raw.gbWorkRecordSourceConversationId || null;
    var sourceMessageId = raw.sourceMessageId || raw.gbWorkRecordSourceMessageId || null;
    var sourceRunId = raw.sourceRunId || raw.gbWorkRecordSourceRunId || null;
    var sourceCardType = raw.sourceCardType || raw.gbWorkRecordSourceCardType || raw.bizCardType || raw.gbWorkRecordBizCardType || null;
    var sourceItemKey = raw.sourceItemKey || raw.gbWorkRecordSourceItemKey || raw.bizItemKey || null;

    // 列表接口可能未返 originType，有 sourceCardType 即视为业务卡来源
    if (!originType && sourceCardType) {
      originType = 'BUSINESS_CARD';
    }
    var isBusinessCard = originType === 'BUSINESS_CARD';

    // 数据库整数 ID（source-card 等 API 需要纯整数 gb_work_record.id，不能带小数点后缀）
    var _dbRecordId = null;
    var rawRecordId = raw.recordId;
    var rawGbWrId = raw.gbWorkRecordId;
    var rawWrId = raw.workRecordId;
    var idSource = 'none';
    if (rawRecordId !== undefined && rawRecordId !== null && !isNaN(parseInt(rawRecordId, 10))) {
      _dbRecordId = parseInt(rawRecordId, 10);
      idSource = 'recordId';
    } else if (rawGbWrId !== undefined && rawGbWrId !== null && String(rawGbWrId).indexOf('.') < 0 && !isNaN(parseInt(rawGbWrId, 10))) {
      _dbRecordId = parseInt(rawGbWrId, 10);
      idSource = 'gbWorkRecordId';
    } else if (rawWrId !== undefined && rawWrId !== null && String(rawWrId).indexOf('.') < 0 && !isNaN(parseInt(rawWrId, 10))) {
      _dbRecordId = parseInt(rawWrId, 10);
      idSource = 'workRecordId';
    } else if (raw.id) {
      // 去除小数点后缀（如 1781089081159.0103 → 1781089081159）
      var idStr = String(raw.id);
      var dotIdx = idStr.indexOf('.');
      _dbRecordId = parseInt(dotIdx >= 0 ? idStr.substring(0, dotIdx) : idStr, 10);
      if (isNaN(_dbRecordId)) { _dbRecordId = null; } else { idSource = 'id.stripDot'; }
    }

    // 解析时间
    var timeObj = that._parseTime(createdAt);

    // 分类名称优先级：后端直接返回 > categoryMap 查找 > "未分类"（当有 ID 但无名称时）
    var category = (categoryId !== null && categoryId !== undefined) ? (categoryMap[categoryId] || {}) : {};
    var categoryName = categoryNameFromApi || category.name || null;
    if (categoryId !== null && categoryId !== undefined && !categoryName) {
      categoryName = '未分类';
    }
    if (!tags.length && categoryId !== null && categoryId !== undefined) {
      tags.push({
        id: categoryId,
        name: categoryName || '未分类',
        icon: category.icon || '',
        bg: category.bg || '#eef5f1',
        color: category.color || '#35745c',
      });
    }

    var displayTitle = raw.displayTitle || title || categoryName || '';

    // 状态文本
    var statusText = '整理成功';
    if (status === 'FAILED') {
      statusText = '整理失败';
    } else if (status === 'PENDING' || status === 'PROCESSING') {
      statusText = '整理中…';
    }

    return {
      id: id,
      title: title,
      displayTitle: displayTitle,
      rawContent: rawContent,
      polishedContent: polishedContent,
      status: status,
      statusText: statusText,
      announcementPublished: announcementPublished,
      announcementId: raw.announcementId || null,
      announcementPublishedAt: raw.announcementPublishedAt || '',
      categoryId: categoryId,
      categoryName: categoryName || '未分类',
      categoryIcon: category.icon || '',
      categoryBg: category.bg || '#f0f0f0',
      categoryColor: category.color || '#999999',
      tags: tags,
      createdAt: createdAt,
      date: timeObj.date,
      timeStr: timeObj.timeStr,
      timestamp: timeObj.timestamp,
      _rawExpanded: false,
      _dbRecordId: _dbRecordId,
      // 来源卡片字段
      originType: originType,
      sourceConversationId: sourceConversationId,
      sourceMessageId: sourceMessageId,
      sourceRunId: sourceRunId,
      sourceCardType: sourceCardType,
      sourceItemKey: sourceItemKey,
      _isBusinessCard: isBusinessCard,
      // 来源卡片内联展开状态
      _sourceExpanded: isBusinessCard,
      _sourceLoading: false,
      _sourceError: '',
      _sourceCardType: '',
      _sourceCardData: null,
      _sourceConversationId: null,
      _sourceMessageId: null,
    };
  },

  // ========== 时间解析 ==========

  _parseTime: function (timeStrOrDate) {
    var date = null;
    if (timeStrOrDate instanceof Date) {
      date = timeStrOrDate;
    } else if (typeof timeStrOrDate === 'number' && isFinite(timeStrOrDate)) {
      date = new Date(timeStrOrDate);
    } else if (timeStrOrDate !== null && timeStrOrDate !== undefined && timeStrOrDate !== '') {
      var str = String(timeStrOrDate).trim();
      if (/^\d+$/.test(str)) {
        date = new Date(parseInt(str, 10));
      } else {
        var hasExplicitTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(str);
        if (hasExplicitTimezone) {
          date = new Date(str);
        } else {
          date = new Date(str.replace(/-/g, '/').replace('T', ' ').split('.')[0]);
        }
      }
    }
    if (!date || isNaN(date.getTime())) {
      console.warn('[工作记录] 无法解析时间，使用当前时刻:', timeStrOrDate);
      date = new Date();
    }

    // 固定按中国标准时间（UTC+8）展示，不依赖手机或服务器所在时区。
    var chinaDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    var year = chinaDate.getUTCFullYear();
    var month = chinaDate.getUTCMonth() + 1;
    var day = chinaDate.getUTCDate();
    var hour = chinaDate.getUTCHours();
    var minute = chinaDate.getUTCMinutes();

    var pad = function (n) {
      return n < 10 ? '0' + n : String(n);
    };

    return {
      date: year + '-' + pad(month) + '-' + pad(day),
      timeStr: pad(hour) + ':' + pad(minute),
      timestamp: date.getTime(),
    };
  },

  // ========== 日期分组 ==========

  _groupByDate: function (records) {
    var that = this;
    var today = that._parseTime(new Date()).date;

    var yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    var yesterday = that._parseTime(yesterdayDate).date;

    // 按日期分组（使用对象）
    var map = {};
    records.forEach(function (record) {
      var d = record.date;
      if (!map[d]) {
        map[d] = [];
      }
      map[d].push(record);
    });

    // 提取日期键并排序（降序，最新日期在上）
    var dates = Object.keys(map).sort(function (a, b) {
      return b.localeCompare(a);
    });

    // 构建分组数组
    var groups = dates.map(function (date) {
      var dateLabel;
      if (date === today) {
        dateLabel = '今天';
      } else if (date === yesterday) {
        dateLabel = '昨天';
      } else {
        var parts = date.split('-');
        var year = parseInt(parts[0], 10);
        var month = parseInt(parts[1], 10);
        var day = parseInt(parts[2], 10);
        var currentYear = new Date().getFullYear();
        if (year === currentYear) {
          dateLabel = month + '月' + day + '日';
        } else {
          dateLabel = year + '年' + month + '月' + day + '日';
        }
      }

      return {
        dateKey: date,
        dateLabel: dateLabel,
        records: map[date].sort(function (a, b) {
          return (b.timestamp || 0) - (a.timestamp || 0);
        }),
      };
    });

    return groups;
  },

  // ========== 分类筛选 ==========

  onFilterCategory: function (e) {
    var categoryId = e.currentTarget.dataset.id;
    // dataset 中 null 会变成字符串 'null'，需要特殊处理
    if (categoryId === 'null' || categoryId === '') {
      categoryId = null;
    }
    if (categoryId === this.data.activeCategoryId) return;

    this.setData({ activeCategoryId: categoryId });
    this._fetchRecords(false);
  },

  // ========== 原话展开/收起 ==========

  toggleRawExpand: function (e) {
    var id = e.currentTarget.dataset.id;
    var groups = this.data.groupedRecords;
    var found = false;

    for (var gi = 0; gi < groups.length; gi++) {
      var records = groups[gi].records;
      for (var ri = 0; ri < records.length; ri++) {
        if (String(records[ri].id) === String(id)) {
          var key = 'groupedRecords[' + gi + '].records[' + ri + ']._rawExpanded';
          this.setData({
            [key]: !records[ri]._rawExpanded,
          });
          found = true;
          break;
        }
      }
      if (found) break;
    }
  },

  // ========== 下拉刷新 ==========

  onRefresh: function () {
    var that = this;
    that.setData({ refreshing: true });
    Promise.all([that._fetchConversation(), that._fetchCategories()])
      .then(function () {
        return that._fetchRecords(false);
      })
      .then(function () {
        that.setData({ refreshing: false });
      })
      .catch(function () {
        that.setData({ refreshing: false });
      });
  },

  // ========== 分页加载 ==========

  onLoadMore: function () {
    var that = this;
    if (that.data.loadingMore || that.data.noMore) return;
    that.setData({ loadingMore: true });
    that._fetchRecords(true);
  },

  onAddRecord: function () {
    wx.navigateTo({ url: '../workRecordConfirm/workRecordConfirm' });
  },

  // ========== AI 失败时重新整理 ==========

  onRetryPolish: function (e) {
    var that = this;
    var recordId = e.currentTarget.dataset.id;
    if (!recordId) return;

    wx.showLoading({ title: '重新整理中', mask: true });

    api
      .retryAiWorkRecord(recordId, { userId: that.data.userId })
      .then(function (res) {
        wx.hideLoading();

        // 尝试用后端返回的数据原地更新当前记录
        var result = res.result || {};
        var data = result.data || result;
        var preparedRecords = Array.isArray(data.records) ? data.records : [];
        if (preparedRecords.length && preparedRecords.every(function (item) { return item.aiStatus === 'SUCCESS'; })) {
          wx.navigateTo({
            url: '../workRecordConfirm/workRecordConfirm?recordIds=' + preparedRecords.map(function (item) {
              return item.recordId;
            }).join(','),
          });
          return;
        }
        var rawRecordList = that.data.rawRecordList;
        var found = false;

        for (var i = 0; i < rawRecordList.length; i++) {
          if (String(rawRecordList[i].id) === String(recordId)) {
            // 用后端返回的完整数据重新规范化并原地替换
            var updated = that._normalizeRecord(Object.assign({}, data, {
              rawContent: data.rawContent || data.content || rawRecordList[i].rawContent,
            }));
            rawRecordList[i] = updated;
            found = true;
            break;
          }
        }

        if (found) {
          var grouped = that._groupByDate(rawRecordList);
          that.setData({
            rawRecordList: rawRecordList,
            groupedRecords: grouped,
          });
          wx.showToast({ title: '整理完成', icon: 'success' });
        } else {
          // 找不到对应记录时回退为全量刷新
          that._fetchRecords(false);
          wx.showToast({ title: '已提交整理', icon: 'success' });
        }
      })
      .catch(function (err) {
        wx.hideLoading();
        console.error('[工作记录] 重新整理失败', err);
        wx.showToast({ title: '整理失败', icon: 'none' });
      });
  },

  // ========== 滚动到指定记录 ==========

  _scrollToRecord: function (recordId) {
    if (!recordId) return;
    var that = this;
    var viewId = 'record-' + recordId;
    that.setData({ scrollIntoView: viewId });
    setTimeout(function () {
      that.setData({ scrollIntoView: '' });
    }, 300);
  },

  // ========== 返回上一页 ==========

  toBack: function () {
    wx.navigateBack();
  },

  // ========== 来源卡片弹层 ==========

  /** 在 groupedRecords 中定位记录路径 */
  _findRecordPath: function (displayId) {
    var groups = this.data.groupedRecords || [];
    for (var i = 0; i < groups.length; i++) {
      var items = groups[i].records || [];
      for (var j = 0; j < items.length; j++) {
        if (items[j].id === displayId || items[j]._dbRecordId === displayId) {
          return {
            basePath: 'groupedRecords[' + i + '].records[' + j + ']',
            record: items[j],
          };
        }
      }
    }
    return null;
  },

  /** 列表加载后自动拉取业务卡来源（无需手点「查看来源」） */
  _prefetchSourceCardsForRecords: function (records) {
    var that = this;
    (records || []).forEach(function (record) {
      if (!record._isBusinessCard) return;
      if (record._sourceCardData || record._sourceLoading) return;
      if (record._dbRecordId === null || record._dbRecordId === undefined) {
        console.warn('[工作记录] 无法 prefetch 来源卡片：缺少 recordId', record.id, record.sourceCardType);
        return;
      }

      var found = that._findRecordPath(record.id);
      if (!found) return;

      var basePath = found.basePath;
      var setObj = {};
      setObj[basePath + '._sourceExpanded'] = true;
      setObj[basePath + '._sourceLoading'] = true;
      setObj[basePath + '._sourceError'] = '';
      that.setData(setObj);
      that._fetchInlineSourceCard(record._dbRecordId, basePath);
    });
  },

  /**
   * 点击「查看来源」/「收起来源」—— 内联展开/收起
   * 业务卡记录在列表加载时会自动 prefetch；此处供手动收起/重试
   */
  onViewSource: function (e) {
    var that = this;
    var displayId = e.currentTarget.dataset.id;
    if (!displayId) return;

    var found = that._findRecordPath(displayId);
    if (!found) {
      wx.showToast({ title: '无法获取来源', icon: 'none' });
      return;
    }

    var record = found.record;
    var basePath = found.basePath;

    if (record._sourceExpanded) {
      that.setData((function () { var u = {}; u[basePath + '._sourceExpanded'] = false; return u; })());
      return;
    }

    if (record._sourceLoading) return;

    if (record._sourceCardData && !record._sourceError) {
      that.setData((function () { var u = {}; u[basePath + '._sourceExpanded'] = true; return u; })());
      return;
    }

    var dbRecordId = record._dbRecordId;
    if (dbRecordId === null || dbRecordId === undefined) {
      wx.showToast({ title: '无法获取来源', icon: 'none' });
      return;
    }

    var setObj = {};
    setObj[basePath + '._sourceExpanded'] = true;
    setObj[basePath + '._sourceLoading'] = true;
    setObj[basePath + '._sourceError'] = '';
    that.setData(setObj);
    that._fetchInlineSourceCard(dbRecordId, basePath);
  },

  /**
   * 获取来源卡片数据（内联版本）
   * GET /api/ai/work-records/{recordId}/source-card
   */
  _fetchInlineSourceCard: function (recordId, basePath) {
    var that = this;
    var userId = that.data.userId;
    var done = function (updates) {
      updates[basePath + '._sourceLoading'] = false;
      that.setData(updates);
    };

    api.getWorkRecordSourceCard(recordId, { userId: userId })
      .then(function (res) {
        var result = res.result || res || {};
        if (result.code !== undefined && result.code !== 0 && result.code !== '0') {
          var wrapErr = result.msg || result.message || '来源加载失败';
          done((function () { var u = {}; u[basePath + '._sourceError'] = wrapErr; return u; })());
          return;
        }

        var data = result.data || result;
        var updates = {};

        if (data.code === 'NOT_BUSINESS_CARD') {
          updates[basePath + '._sourceError'] = '该记录没有业务来源';
          done(updates);
          return;
        }
        if (data.code === 'BUSINESS_CARD_NOT_FOUND') {
          updates[basePath + '._sourceError'] = '原业务卡片已无法读取';
          done(updates);
          return;
        }
        if (data.errorCode) {
          updates[basePath + '._sourceError'] = data.message || data.msg || '来源加载失败';
          done(updates);
          return;
        }
        if (typeof data.code === 'string' && data.code !== '0' && data.code !== 'SUCCESS'
          && data.code !== 'NOT_BUSINESS_CARD' && data.code !== 'BUSINESS_CARD_NOT_FOUND') {
          updates[basePath + '._sourceError'] = data.message || data.msg || '来源加载失败';
          done(updates);
          return;
        }

        var cardType = data.cardType || data.sourceCardType || '';
        var payload = data.payload || data.cardPayload || {};
        if (!cardType) {
          updates[basePath + '._sourceError'] = '来源卡片类型缺失';
          done(updates);
          return;
        }

        var cardData = that._buildSourceCardData(cardType, data, payload);

        updates[basePath + '._sourceCardType'] = cardType;
        updates[basePath + '._sourceCardData'] = cardData;
        updates[basePath + '._sourceCardTitle'] = data.cardTitle || data.title || '';
        updates[basePath + '._sourceCardSubtitle'] = data.cardSubtitle || data.subtitle || '';
        updates[basePath + '._sourceConversationId'] = data.conversationId || '';
        updates[basePath + '._sourceMessageId'] = data.messageId || '';
        console.log('[工作记录] 来源卡片加载成功', { recordId: recordId, cardType: cardType });
        done(updates);
      })
      .catch(function (err) {
        console.error('[工作记录] 获取来源卡片失败', err);
        var updates = {};
        updates[basePath + '._sourceError'] = '来源加载失败';
        done(updates);
      });
  },

  /**
   * 组装来源卡片的 cardData（与 aiChat._resolveDisplayCard 逻辑对齐）
   */
  _buildSourceCardData: function (cardType, sourceData, payload) {
    return sourceCardBuilder.buildSourceCardData(cardType, sourceData, payload);
  },

  /**
   * 关闭来源卡片内联展开
   */
  onCloseSource: function (e) {
    var id = e.currentTarget.dataset.id;
    if (!id) return;

    var groups = this.data.groupedRecords;
    for (var i = 0; i < groups.length; i++) {
      var records = groups[i].records;
      for (var j = 0; j < records.length; j++) {
        if (String(records[j].id) === String(id)) {
          var key = 'groupedRecords[' + i + '].records[' + j + ']._sourceExpanded';
          this.setData({ [key]: false });
          return;
        }
      }
    }
  },

  // ========== 修改 / 删除 ==========

  /**
   * 辅助：在 groupedRecords 中查找记录索引
   */
  _findRecordIndex: function (id) {
    var groups = this.data.groupedRecords;
    for (var i = 0; i < groups.length; i++) {
      var records = groups[i].records;
      for (var j = 0; j < records.length; j++) {
        if (String(records[j].id) === String(id)) {
          return { gi: i, ri: j, record: records[j] };
        }
      }
    }
    return null;
  },

  /**
   * 点击「修改」按钮 —— 弹出编辑弹窗
   */
  onEditRecord: function (e) {
    var id = e.currentTarget.dataset.id;
    if (!id) return;

    var pos = this._findRecordIndex(id);
    if (!pos) return;

    // 编辑 polishedContent，没有则用 rawContent
    var editContent = pos.record.polishedContent || pos.record.rawContent || '';

    this.setData({
      showEditPopup: true,
      editingRecordId: String(id),
      editingContent: editContent,
    });
  },

  /**
   * 编辑弹窗 textarea 输入事件
   */
  onEditInputChange: function (e) {
    this.setData({ editingContent: e.detail.value || '' });
  },

  /**
   * 点击「保存」—— 调用 PUT 接口
   */
  onSaveEdit: function () {
    var that = this;
    var id = that.data.editingRecordId;
    var content = (that.data.editingContent || '').trim();
    if (!id) return;
    if (!content) {
      wx.showToast({ title: '内容不能为空', icon: 'none' });
      return;
    }

    var pos = this._findRecordIndex(id);
    if (!pos) return;

    var dbRecordId = pos.record._dbRecordId;
    if (dbRecordId === null || dbRecordId === undefined) {
      wx.showToast({ title: '无法修改此记录', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中', mask: true });

    api.updateWorkRecord(dbRecordId, that.data.userId, { content: content })
      .then(function () {
        wx.hideLoading();

        // 本地更新 polishedContent
        var rawRecordList = that.data.rawRecordList;
        for (var k = 0; k < rawRecordList.length; k++) {
          if (String(rawRecordList[k].id) === String(id)) {
            rawRecordList[k].polishedContent = content;
            break;
          }
        }

        var grouped = that._groupByDate(rawRecordList);
        that.setData({
          rawRecordList: rawRecordList,
          groupedRecords: grouped,
          showEditPopup: false,
          editingRecordId: '',
          editingContent: '',
        });

        wx.showToast({ title: '修改成功', icon: 'success' });
      })
      .catch(function (err) {
        wx.hideLoading();
        console.error('[工作记录] 修改失败', err);
        wx.showToast({ title: '修改失败，请重试', icon: 'none' });
      });
  },

  /**
   * 点击「取消」—— 关闭编辑弹窗
   */
  onCancelEdit: function () {
    this.setData({
      showEditPopup: false,
      editingRecordId: '',
      editingContent: '',
    });
  },

  /**
   * 点击「公告」按钮 —— 推送到店内公告栏
   */
  onPushToAnnouncement: function (e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    if (!id) return;

    var pos = this._findRecordIndex(id);
    if (!pos) return;

    var dbRecordId = pos.record._dbRecordId;
    if (dbRecordId === null || dbRecordId === undefined) {
      wx.showToast({ title: '无法推送此记录', icon: 'none' });
      return;
    }

    var userId = that.data.userId;
    if (!userId) {
      wx.showToast({ title: '未获取到登录信息', icon: 'none' });
      return;
    }

    var payload = { userId: userId };
    if (that.data.departmentId) payload.departmentId = that.data.departmentId;
    if (that.data.distributerId) payload.distributerId = that.data.distributerId;

    wx.showLoading({ title: '推送中…', mask: true });

    api.pushWorkRecordToAnnouncement(dbRecordId, payload)
      .then(function (res) {
        wx.hideLoading();
        var result = res.result || res || {};
        var announcement = result.data || result;
        var rawRecordList = that.data.rawRecordList.slice();
        for (var i = 0; i < rawRecordList.length; i++) {
          if (String(rawRecordList[i].id) === String(id)) {
            rawRecordList[i].announcementPublished = true;
            rawRecordList[i].announcementId = announcement.announcementId || announcement.id || null;
            rawRecordList[i].announcementPublishedAt = announcement.publishedAt || '';
            break;
          }
        }
        that.setData({
          rawRecordList: rawRecordList,
          groupedRecords: that._groupByDate(rawRecordList),
        });
        wx.showToast({ title: '已推送', icon: 'success', duration: 1500 });
      })
      .catch(function (err) {
        wx.hideLoading();
        console.error('[店长日志] 推送公告失败', err);
        var errMsg = '推送失败';
        if (err && err.data && err.data.message) errMsg = err.data.message;
        else if (err && err.message) errMsg = err.message;
        wx.showToast({ title: errMsg, icon: 'none', duration: 2500 });
      });
  },

  /**
   * 点击「删除」按钮
   */
  onDeleteRecord: function (e) {
    var that = this;
    var id = e.currentTarget.dataset.id;
    if (!id) return;

    var pos = this._findRecordIndex(id);
    if (!pos) return;

    var dbRecordId = pos.record._dbRecordId;
    if (dbRecordId === null || dbRecordId === undefined) {
      wx.showToast({ title: '无法删除此记录', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复，确定要删除这条工作记录吗？',
      confirmColor: '#fa5151',
      success: function (res) {
        if (!res.confirm) return;

        wx.showLoading({ title: '删除中', mask: true });

        api.deleteWorkRecord(dbRecordId, that.data.userId)
          .then(function () {
            wx.hideLoading();

            // 从列表中移除
            var rawRecordList = that.data.rawRecordList.filter(function (item) {
              return String(item.id) !== String(id);
            });
            var grouped = that._groupByDate(rawRecordList);

            that.setData({
              rawRecordList: rawRecordList,
              groupedRecords: grouped,
            });

            wx.showToast({ title: '已删除', icon: 'success' });
          })
          .catch(function (err) {
            wx.hideLoading();
            console.error('[工作记录] 删除失败', err);
            wx.showToast({ title: '删除失败，请重试', icon: 'none' });
          });
      },
    });
  },
});
