const app = getApp();
const { getDate } = require('../../../services/depOrder');

let windowWidth = 0;
let itemWidth = 0;

Page({
  data: {
    tabs: ['日期', '星期', '月份', '自定义'],
    tabIndex: 0,
    itemIndex: 0,
    sliderOffset: 0,
    sliderOffsets: [],
    startDate: '',
    stopDate: '',
    dateType: 'day',
    windowWidth: 375,
    windowHeight: 667,
    contentHeight: 500,
    navBarHeight: 88,
    rpxR: 2,
  },

  onLoad: function (options) {
    const globalData = app.globalData || wx.getStorageSync('globalData') || {};
    const systemInfo = wx.getSystemInfoSync() || {};
    
    const windowInfo = wx.getWindowInfo();
    const rpxR = 750 / (globalData.windowWidth || systemInfo.windowWidth || 375);
    const navBarHeight = (globalData.navBarHeight || 88);
    const statusBarHeight = (globalData.statusBarHeight || 20);
    
    this.setData({
      windowWidth: (globalData.windowWidth || systemInfo.windowWidth || 375) * rpxR,
      windowHeight: (globalData.windowHeight || systemInfo.windowHeight || 667) * rpxR,
      contentHeight: ((globalData.windowHeight || systemInfo.windowHeight || 667) - 200) * rpxR,
      navBarHeight: navBarHeight,
      statusBarHeight: statusBarHeight,
      rpxR: rpxR,
      startDate: options.startDate || '',
      stopDate: options.stopDate || '',
      dateType: options.dateType || 'day',
    });

    // 根据传入的 dateType 设置 tab
    var dateType = this.data.dateType;
    if (dateType === 'day') {
      this.setData({ tabIndex: 0, itemIndex: 0 });
    } else if (dateType === 'week') {
      this.setData({ tabIndex: 1, itemIndex: 1 });
    } else if (dateType === 'month') {
      this.setData({ tabIndex: 2, itemIndex: 2 });
    } else if (dateType === 'customer' || dateType === 'custom') {
      this.setData({ tabIndex: 3, itemIndex: 3 });
    }

    this._initData();
    this._calculateSliderOffsets();
  },

  _initData() {
    getDate().then(res => {
      if (res.result.code == 0) {
        this.setData({
          dayMap: res.result.data.day,
          weekMap: res.result.data.week,
          monthArr: res.result.data.month,
        });
      }
    }).catch(err => {
      console.error('获取日期数据失败', err);
      // 使用本地日期数据作为备选
      this._initLocalDate();
    });
  },

  _initLocalDate() {
    const today = new Date();
    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const getWeekDay = (d) => ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][d.getDay()];
    const getMonthDay = (d) => `${d.getMonth() + 1}月${d.getDate()}日`;

    // 今天
    const todayStr = formatDate(today);
    
    // 昨天
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    // 本周一
    const thisWeekStart = new Date(today);
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    thisWeekStart.setDate(today.getDate() + daysToMonday);
    
    // 本周日
    const thisWeekEnd = new Date(today);
    const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    thisWeekEnd.setDate(today.getDate() + daysToSunday);

    // 上周一
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    
    // 上周日
    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);

    // 过去7天
    const lastSevenDayStart = new Date(today);
    lastSevenDayStart.setDate(today.getDate() - 6);

    // 本月第一天
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // 上月第一天
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    
    // 上月最后一天
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    // 过去30天
    const lastThirtyDayStart = new Date(today);
    lastThirtyDayStart.setDate(today.getDate() - 29);

    this.setData({
      dayMap: {
        today: {
          todayStartDate: todayStr,
          todayStopDate: todayStr,
          todayString: getMonthDay(today),
          todayWeek: getWeekDay(today)
        },
        yesterday: {
          yesterdayStartDate: yesterdayStr,
          yesterdayStopDate: yesterdayStr,
          yesterdayString: getMonthDay(yesterday),
          yesterdayWeek: getWeekDay(yesterday)
        }
      },
      weekMap: {
        lastSevenDay: {
          lastSevenDayStartDate: formatDate(lastSevenDayStart),
          lastSevenDayStopDate: todayStr,
          lastSevenDayStartDateString: formatDate(lastSevenDayStart).substring(5),
          lastSevenDayStopDateString: todayStr.substring(5)
        },
        thisWeek: {
          thisWeekStartDate: formatDate(thisWeekStart),
          thisWeekStopDate: formatDate(thisWeekEnd),
          thisWeekStartString: formatDate(thisWeekStart).substring(5),
          thisWeekStopString: formatDate(thisWeekEnd).substring(5)
        },
        lastWeek: {
          lastWeekStartDate: {
            monday: formatDate(lastWeekStart),
            sunday: formatDate(lastWeekEnd),
            mondayString: formatDate(lastWeekStart).substring(5),
            sundayString: formatDate(lastWeekEnd).substring(5)
          }
        }
      },
      monthArr: {
        lastThirtyDay: {
          lastThirtyDayStartDate: formatDate(lastThirtyDayStart),
          lastThirtyDayStopDate: todayStr,
          lastThirtyDayStartDateString: formatDate(lastThirtyDayStart).substring(5),
          lastThirtyDayStopDateString: todayStr.substring(5)
        },
        thisMonth: {
          thisMonthStartDate: formatDate(thisMonthStart),
          thisMonthStopDate: todayStr,
          thisMonthStartDateString: formatDate(thisMonthStart).substring(5)
        },
        lastMonth: {
          lastMonthStartDate: formatDate(lastMonthStart),
          lastMonthStopDate: formatDate(lastMonthEnd),
          lastMonthStartDateString: formatDate(lastMonthStart).substring(5)
        }
      }
    });
  },

  _calculateSliderOffsets() {
    const that = this;
    wx.getSystemInfo({
      success: function (res) {
        itemWidth = Math.ceil(res.windowWidth / that.data.tabs.length);
        let tempArr = [];
        for (let i in that.data.tabs) {
          tempArr.push(itemWidth * i);
        }
        var index = that.data.tabIndex;
        windowWidth = res.windowWidth;
        that.setData({
          sliderOffsets: tempArr,
          sliderOffset: tempArr[index],
        });
      }
    });
  },

  onTabClick(event) {
    let index = event.currentTarget.dataset.index;
    this.setData({
      sliderOffset: this.data.sliderOffsets[index],
      tabIndex: index,
      itemIndex: index,
    });
  },

  animationfinish(event) {
    this.setData({
      sliderOffset: this.data.sliderOffsets[event.detail.current],
      tabIndex: event.detail.current,
      itemIndex: event.detail.current,
    });
  },

  selectDay(e) {
    var pages = getCurrentPages();
    var prevPage = pages[pages.length - 2];

    var dateType = e.currentTarget.dataset.type;
    var dateName = e.currentTarget.dataset.name || '';
    var hanzi = e.currentTarget.dataset.hanzi || '';
    var startDate = e.currentTarget.dataset.startdate;
    var stopDate = e.currentTarget.dataset.stopdate;

    // 直接调用上一个页面的 setData 方法
    if (prevPage) {
      prevPage.setData({
        update: true,
        updateMyDate: false,
        dateType: dateType,
        startDate: startDate,
        stopDate: stopDate,
      });
    }

    // 存储到 storage
    var myDate = {
      dateType: dateType,
      name: dateName,
      hanzi: hanzi,
      startDate: startDate,
      stopDate: stopDate
    };
    wx.setStorageSync('myDate', myDate);

    wx.navigateBack({
      delta: 1,
    });
  },

  bindChangeStart(e) {
    this.setData({
      startDate: e.detail.value
    });
  },

  bindChangeStop(e) {
    this.setData({
      stopDate: e.detail.value
    });
  },

  selectSelfDate() {
    if (!this.data.startDate || !this.data.stopDate) {
      wx.showToast({
        title: '请选择开始和结束日期',
        icon: 'none'
      });
      return;
    }

    var startDate = new Date(this.data.startDate);
    var stopDate = new Date(this.data.stopDate);

    if (startDate > stopDate) {
      wx.showToast({
        title: '开始日期不能晚于结束日期',
        icon: 'none'
      });
      return;
    }

    var pages = getCurrentPages();
    var prevPage = pages[pages.length - 2];

    var myDate = {
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      dateType: 'customer',
      name: 'custom',
      hanzi: '自定义',
    };
    wx.setStorageSync('myDate', myDate);

    if (prevPage) {
      prevPage.setData({
        startDate: this.data.startDate,
        stopDate: this.data.stopDate,
        dateType: 'customer',
        update: true,
      });
    }

    wx.navigateBack({
      delta: 1,
    });
  },

  toBack() {
    wx.navigateBack({
      delta: 1,
    });
  },
});
