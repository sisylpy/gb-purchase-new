/**
 * 经营看板日期区间：与 selectDate 页 myDate 缓存对齐
 */

function buildDefaultMonthRange(dateUtils) {
  return {
    dateType: 'month',
    startDate: dateUtils.getFirstDateInMonth(),
    stopDate: dateUtils.getArriveDate(0),
    hanzi: '本月',
  };
}

function datePatchFromStorage(dateUtils) {
  var myDate = wx.getStorageSync('myDate');
  if (!myDate) {
    return buildDefaultMonthRange(dateUtils);
  }
  var dateRange = myDate.name === 'custom'
    ? dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate)
    : dateUtils.getDateRange(myDate.name);
  return {
    startDate: dateRange.startDate,
    stopDate: dateRange.stopDate,
    dateType: myDate.dateType,
    hanzi: myDate.hanzi || dateRange.name,
  };
}

function buildStatsQuery(page) {
  var q = {};
  if (page.data.startDate) q.startDate = page.data.startDate;
  if (page.data.stopDate) q.endDate = page.data.stopDate;
  return q;
}

module.exports = {
  datePatchFromStorage: datePatchFromStorage,
  buildStatsQuery: buildStatsQuery,
};
