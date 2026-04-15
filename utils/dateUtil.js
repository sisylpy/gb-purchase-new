function formatTime(date) {
  var year = date.getFullYear()
  var month = date.getMonth() + 1
  var day = date.getDate()
  if(day < 10){
    day = "0" + day;
  }
  if(month < 10){
    month = "0" + month;
  }
  var hour = date.getHours()
  var minute = date.getMinutes()
  return [year, month, day].map(formatNumber).join('-') + ' ' + [hour, minute].map(formatNumber).join(':')
}

function formatNumber(n) {
  n = n.toString()
  return n[1] ? n : '0' + n
}

function formatDate(date) {
  var year = date.getFullYear()
  var month = date.getMonth() + 1
  var day = date.getDate()
  if(day < 10){
    day = "0" + day;
  }
  if(month < 10){
    month = "0" + month;
  }
  return year+"-"+month +"-"+ day
}

function getWhichFullDate(which) {
  var date  = new Date();
  var year = date.getFullYear()
  var month = date.getMonth() + 1
  var day = date.getDate() + which * 1
  if(day < 10){
    day = "0" + day;
  }
  if(month < 10){
    month = "0" + month;
  }
  return year+"-"+month +"-"+ day
}

function getWhichOnlyDate(which) {
  var date  = new Date();
  var month = date.getMonth() + 1
  var day = date.getDate() + which * 1
  if(day < 10){
    day = "0" + day;
  }
  if(month < 10){
    month = "0" + month;
  }
  return month +"-"+ day
}

function getWhichWeeksYear(date, which) {
   var a = date.getFullYear()
   var b = date.getMonth() + 1
   var c = date.getDate() + which * 1
   var date1 = new Date(a, parseInt(b) - 1, c), date2 = new Date(a, 0, 1),
   d = Math.round((date1.valueOf() - date2.valueOf()) / 86400000);
   return Math.ceil(
   (d + ((date2.getDay() + 1) - 1)) / 7
   );
}

function getArriveWhatWeek(date, which) {
  var weeks = new Array("星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六");
    var day = date.getDay() +  which * 1;
    if(day == 7){
     var  week = "星期日"
    }else{
      var week = weeks[day];
    }
     return week;
}

function getWhichDay(date, which) {
  var day = date.getDate() + which * 1
     return day;
}

function getArriveDate( which) {
  var dateArrive = new Date();
  dateArrive.setTime(dateArrive.getTime()+ which*1 * 24*60*60*1000);
  var date = dateArrive.getDate();
  var month = dateArrive.getMonth()+1;
  if(date < 10){
    date = '0' + date;
  }
  if(month < 10){
    month = '0' + month;
  }
   var s3 = dateArrive.getFullYear()+"-" + month + "-" + date
  return s3;
}

function getArriveOnlyDate(which) {
  var dateOnly = new Date();
  dateOnly.setTime(dateOnly.getTime()+ which *1* 24*60*60*1000);
  var date = dateOnly.getDate();
  var month = dateOnly.getMonth()+1;
  if(date < 10){
    date = '0' + date;
  }
  if(month < 10){
    month = '0' + month;
  }
   var s3 = month + "-" + date
  return s3;
}

function getNowTime(){
  var dateDate = new Date();
  var year = dateDate.getFullYear()
  var month = dateDate.getMonth() + 1
  if (month < 10) {
    month = "0" + month;
  }
  var day = dateDate.getDate();
  var hour = dateDate.getHours();
  var minutes = dateDate.getMinutes();
  if (minutes < 10) {
    minutes = "0" + minutes;
  }
  var seconds = dateDate.getSeconds();
  if (seconds < 10) {
    seconds = "0" + seconds;
  }
  var nowTime = year + "-" + month + '-' + day + " " + hour + ":" + minutes + ":" + seconds;
  return nowTime;
}

function getDateTimeString() {
  var dateOnly = new Date();
  dateOnly.setTime(dateOnly.getTime());
  var date = dateOnly.getDate();
  var month = dateOnly.getMonth()+1;
   var s3 = month + "月" + date + "日"
  return s3;
}

function getArriveWeeksYear(which) {
   var dateFull = new Date();
   var a = dateFull.getFullYear()
   var b = dateFull.getMonth() + 1
   var c = dateFull.getDate() + which * 1
   var date1 = new Date(a, parseInt(b) - 1, c), date2 = new Date(a, 0, 1),
   d = Math.round((date1.valueOf() - date2.valueOf()) / 86400000);
   return Math.ceil(
   (d + ((date2.getDay() + 1) - 1)) / 7
   );
}

function getArriveWhatDay(which) {
  var dateDay = new Date();
  var weeks = new Array("星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六");
    var day = dateDay.getDay() +  which * 1;
    if(day == 7){
     var  week = "星期日"
    }else{
      var week = weeks[day];
    }
     return week;
}

function getFirstDateInMonth(){
  var dateFull = new Date();
  var a = dateFull.getFullYear()
   var b = dateFull.getMonth() + 1;
   if(b < 10){
     b = "0" + b;
   }
   return a + "-" + b + "-" + "01"
}

function getLastDateInMonth (){
  var year = new Date().getFullYear();
    var month = new Date().getMonth() + 1;
    var lastDate = new Date(year, month , 0).getDate();
    month = month < 10 ? '0' + month : month ;
    return [year,month ,lastDate ].join("-");
}

function getFirstDateInMonthString(){
  var dateFull = new Date();
   var b = dateFull.getMonth() + 1;
   return b + "月" + "1日"
}

function getFirstDateLastMonth(){
  var dateFull = new Date();
  var a = dateFull.getFullYear()
   var b = dateFull.getMonth();
   if(b < 10){
     b = "0" + b;
   }if(b == 12){
     a = a - 1;
     b = "01";
   }
   return a + "-" + b + "-" + "01"
}

function getArriveDateString( which) {
  var dateArrive = new Date();
  dateArrive.setTime(dateArrive.getTime()+ which*1 * 24*60*60*1000);
  var date = dateArrive.getDate();
  var month = dateArrive.getMonth()+1;
   var s3 = month + "月" + date+ "日"
  return s3;
}

function getWhatDay(which) {
  var dateDay = new Date();
  var weeks = new Array("星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六");
    var day = dateDay.getDay() +  which * 1;
    if(day == 7){
     var  week = "星期日"
    }else{
      var week = weeks[day];
    }
     return week;
}

function getOnlyHao(which) {
  var dateOnly = new Date();
  dateOnly.setTime(dateOnly.getTime()+ which *1* 24*60*60*1000);
   var s3 = dateOnly.getDate()
  return s3;
}

function getOnlyDate(which) {
  var dateOnly = new Date();
  dateOnly.setTime(dateOnly.getTime()+ which *1* 24*60*60*1000);
   var s3 = (dateOnly.getMonth()+1) + "-" + dateOnly.getDate()
  return s3;
}

function getOnlyTime(which) {
  var date  = new Date();
  var year = date.getFullYear()
  var month = date.getMonth() + 1
  var day = date.getDate() + which * 1
  if(day < 10){
    day = "0" + day;
  }
   var hour = date.getHours()
  var minute = date.getMinutes()
  return hour+":"+minute
}

function getDateRange(rangeType, customStartDate, customEndDate) {
  if (!rangeType) {
    return { startDate: '', stopDate: '' };
  }
  var today = new Date();
  var year = today.getFullYear();
  var month = today.getMonth() + 1;
  var date = today.getDate();
  function formatDate(d) {
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return y + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  }
  var startDate = '';
  var stopDate = '';
  switch (rangeType) {
    case 'today':
      startDate = stopDate = formatDate(today);
      break;
    case 'yesterday':
      var yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      startDate = stopDate = formatDate(yesterday);
      break;
    case 'thisWeek':
      var thisWeekStart = new Date(today);
      var dayOfWeek = today.getDay();
      var daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      thisWeekStart.setDate(today.getDate() + daysToMonday);
      startDate = formatDate(thisWeekStart);
      var thisWeekEnd = new Date(today);
      var daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      thisWeekEnd.setDate(today.getDate() + daysToSunday);
      stopDate = formatDate(thisWeekEnd);
      break;
    case 'lastWeek':
      var lastWeekStart = new Date(today);
      var dayOfWeek = today.getDay();
      var daysToLastMonday = dayOfWeek === 0 ? -13 : -6 - dayOfWeek;
      lastWeekStart.setDate(today.getDate() + daysToLastMonday);
      startDate = formatDate(lastWeekStart);
      var lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
      stopDate = formatDate(lastWeekEnd);
      break;
    case 'lastSevenDays':
      var sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      startDate = formatDate(sevenDaysAgo);
      var yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      stopDate = formatDate(yesterday);
      break;
    case 'thisMonth':
      var thisMonthStart = new Date(year, month - 1, 1);
      startDate = formatDate(thisMonthStart);
      stopDate = formatDate(today);
      break;
    case 'lastMonth':
      var lastMonthStart = new Date(year, month - 2, 1);
      startDate = formatDate(lastMonthStart);
      var lastMonthEnd = new Date(year, month - 1, 0);
      stopDate = formatDate(lastMonthEnd);
      break;
    case 'lastThirtyDays':
      var lastMonthToday = new Date(today);
      lastMonthToday.setMonth(lastMonthToday.getMonth() - 1);
      startDate = formatDate(lastMonthToday);
      stopDate = formatDate(today);
      break;
    case 'custom':
    case 'customer':
      if (customStartDate && customEndDate) {
        startDate = customStartDate;
        stopDate = customEndDate;
      } else {
        startDate = stopDate = '';
      }
      break;
    default:
      startDate = stopDate = '';
  }
  var chineseName = '';
  switch (rangeType) {
    case 'today': chineseName = '今天'; break;
    case 'yesterday': chineseName = '昨天'; break;
    case 'thisWeek': chineseName = '本周'; break;
    case 'lastWeek': chineseName = '上周'; break;
    case 'lastSevenDays': chineseName = '过去7天'; break;
    case 'thisMonth': chineseName = '本月'; break;
    case 'lastMonth': chineseName = '上月'; break;
    case 'lastThirtyDays': chineseName = '过去30天'; break;
    case 'custom':
    case 'customer': chineseName = '自定义'; break;
    default: chineseName = rangeType;
  }
  return {
    startDate: startDate,
    stopDate: stopDate,
    name: chineseName
  };
}

function getHowManyDays(targetDate) {
  if (!targetDate) {
    return 0;
  }
  var dateStr = targetDate.toString();
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    var target = new Date(dateStr);
  } else {
    target = new Date(dateStr);
  }
  if (isNaN(target.getTime())) {
    return 0;
  }
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  var timeDiff = today.getTime() - target.getTime();
  var daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  return daysDiff;
}

function getMonthFirstAndLastDay(monthStr, year) {
  if (!monthStr) {
    return { firstDay: '', lastDay: '' };
  }
  if (!year) {
    year = new Date().getFullYear();
  }
  var month = parseInt(monthStr);
  if (month < 1 || month > 12) {
    return { firstDay: '', lastDay: '' };
  }
  var monthFormatted = month < 10 ? '0' + month : month.toString();
  var firstDay = year + '-' + monthFormatted + '-01';
  var lastDayDate = new Date(year, month, 0);
  var lastDay = year + '-' + monthFormatted + '-' + (lastDayDate.getDate() < 10 ? '0' + lastDayDate.getDate() : lastDayDate.getDate());
  return {
    firstDay: firstDay,
    lastDay: lastDay
  };
}

module.exports = {
  formatTime: formatTime,
  formatDate: formatDate,
  getWhatDay: getWhatDay,
  getOnlyHao: getOnlyHao,
  getOnlyDate: getOnlyDate,
  getWhichFullDate: getWhichFullDate,
  getWhichOnlyDate: getWhichOnlyDate,
  getWhichWeeksYear: getWhichWeeksYear,
  getArriveWhatWeek: getArriveWhatWeek,
  getWhichDay: getWhichDay,
  getArriveDate: getArriveDate,
  getArriveOnlyDate: getArriveOnlyDate,
  getArriveWeeksYear: getArriveWeeksYear,
  getArriveWhatDay: getArriveWhatDay,
  getDateTimeString: getDateTimeString,
  getFirstDateInMonth: getFirstDateInMonth,
  getLastDateInMonth: getLastDateInMonth,
  getFirstDateInMonthString: getFirstDateInMonthString,
  getArriveDateString: getArriveDateString,
  getNowTime: getNowTime,
  getOnlyTime: getOnlyTime,
  getDateRange: getDateRange,
  getHowManyDays: getHowManyDays,
  getMonthFirstAndLastDay: getMonthFirstAndLastDay,
  getFirstDateLastMonth: getFirstDateLastMonth
};
