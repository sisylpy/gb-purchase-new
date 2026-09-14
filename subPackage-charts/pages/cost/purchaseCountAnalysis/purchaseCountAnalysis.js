var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil.js');
var api = require('../../../../services/apiDistributer.js');
var config = require('../../../../config/index.js');
var echarts = require('../../../../ec-canvas/echarts.js');
var globalData = getApp().globalData;
var ICON_ROOT = '/subPackage-charts/images/purchase/icon_pack/';
var COLORS = ['#25c687', '#ff9d3e', '#48a2ff', '#ff7790', '#8e87e8'];

function num(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
function shortDate(v) { var p = String(v || '').split('-'); return p.length === 3 ? Number(p[1]) + '月' + Number(p[2]) + '日' : v; }
function imageUrl(v) { return !v ? '' : (/^https?:\/\//.test(v) ? v : config.server + v); }
function trend(v) { if (v === null || v === undefined) return { text: '--', direction: 'flat' }; var n = num(v); return { text: (n > 0 ? '+' : '') + n.toFixed(1) + '%', direction: n > 0 ? 'up' : (n < 0 ? 'down' : 'flat') }; }
function parse(v) { var p = v.split('-'); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])); }
function iso(d) { var m=d.getMonth()+1, day=d.getDate(); return d.getFullYear()+'-'+(m<10?'0':'')+m+'-'+(day<10?'0':'')+day; }

Page({
  data: {
    navBarHeight: 0, iconRoot: ICON_ROOT,
    bannerUrl: 'https://grainservice.club/uploadImage/purchase-count-analysis-banner.png?v=2',
    periodKey: 'month', sourceIndex: 0, sourceNames: ['全部来源', '自采', '供货商'], sourceValues: ['ALL', 'SELF', 'SUPPLIER'],
    departmentIndex: 0, departmentList: [{ gbDepartmentId: 0, gbDepartmentName: '全部门店' }], departmentNames: ['全部门店'],
    rhythmMetric: 'count', ecRhythm: { lazyLoad: true }, loading: true, hasData: false, summary: {}, goods: [], behaviors: [], tips: []
  },

  onLoad: function () {
    var disInfo = wx.getStorageSync('disInfo') || {};
    var deps = [{ gbDepartmentId: 0, gbDepartmentName: '全部门店' }].concat(disInfo.gbDepartmentEntityList || []);
    this.setData({ navBarHeight: globalData.navBarHeight * globalData.rpxR, disId: disInfo.gbDistributerId, departmentList: deps, departmentNames: deps.map(function (x) { return x.gbDepartmentName; }) });
    this._syncDate(); this._load();
  },
  onShow: function () { if (this.data.updateDate) { this.setData({ updateDate: false, periodKey: 'custom' }); this._syncDate(); this._load(); } },
  onPullDownRefresh: function () { this._load(); },

  _syncDate: function () {
    var saved = wx.getStorageSync('myDate'), start = dateUtils.getFirstDateInMonth(), stop = dateUtils.getArriveDate(0);
    if (saved) { var range = saved.name === 'custom' ? dateUtils.getDateRange(saved.name, saved.startDate, saved.stopDate) : dateUtils.getDateRange(saved.name); start = range.startDate; stop = range.stopDate; }
    this.setData({ startDate: start, stopDate: stop, dateRangeText: shortDate(start) + ' - ' + shortDate(stop) });
  },
  selectPeriod: function (e) { var key=e.currentTarget.dataset.key, start=key==='thirty'?dateUtils.getArriveDate(-29):dateUtils.getFirstDateInMonth(), stop=dateUtils.getArriveDate(0); this.setData({ periodKey:key,startDate:start,stopDate:stop,dateRangeText:shortDate(start)+' - '+shortDate(stop) }); this._load(); },
  toDatePage: function () { this.setData({ updateDate:true }); wx.navigateTo({ url:'/pages/common/selectDate/selectDate?startDate='+this.data.startDate+'&stopDate='+this.data.stopDate+'&dateType=month' }); },
  changeDepartment: function (e) { this.setData({departmentIndex:Number(e.detail.value)}); this._load(); },
  changeSource: function (e) { this.setData({sourceIndex:Number(e.detail.value)}); this._load(); },
  switchRhythm: function (e) { this.setData({rhythmMetric:e.currentTarget.dataset.metric}, this._scheduleRhythm.bind(this)); },

  _load: function () {
    var that=this, dep=this.data.departmentList[this.data.departmentIndex]||{};
    if (!this.data.disId) { load.showToast('缺少分销商信息'); return; }
    this.setData({loading:true}); load.showLoading('获取数据中');
    api.getGbPurchaseCountAnalysis({disId:this.data.disId,startDate:this.data.startDate,stopDate:this.data.stopDate,purDepId:dep.gbDepartmentId||'',sourceType:this.data.sourceValues[this.data.sourceIndex]})
      .then(function(res){ load.hideLoading(); wx.stopPullDownRefresh(); if(!res.result||res.result.code!==0){that.setData({loading:false,hasData:false});load.showToast((res.result&&res.result.msg)||'获取失败');return;} that._apply(res.result.data||{}); })
      .catch(function(){load.hideLoading();wx.stopPullDownRefresh();that.setData({loading:false,hasData:false});load.showToast('网络请求失败');});
  },

  _fillDays: function (rows) {
    var map={}; (rows||[]).forEach(function(x){map[x.day]=x;}); var out=[], d=parse(this.data.startDate), end=parse(this.data.stopDate);
    while(d<=end){var key=iso(d), row=map[key]||{day:key,purchaseCount:0,activeSourceCount:0}; out.push(row); d.setDate(d.getDate()+1);} return out;
  },
  _apply: function (data) {
    var s=data.summary||{}, total=num(s.purchaseCount), dateDays=Math.round((parse(this.data.stopDate)-parse(this.data.startDate))/86400000)+1;
    var goods=(data.frequentGoods||[]).map(function(x,i){var dots=Math.min(7,Math.max(1,num(x.recentSevenActiveDays)));return Object.assign({},x,{image:imageUrl(x.goodsImage),initial:String(x.goodsName||'商').slice(0,1),percentDisplay:num(x.percent).toFixed(1),color:COLORS[i%COLORS.length],dotsArr:new Array(dots).fill(1)});});
    var behaviors=(data.behaviorObservations||[]).map(function(x,i){return Object.assign({},x,{avatar:imageUrl(x.avatarUrl),initial:String(x.subjectName||'采').slice(0,1),percentDisplay:num(x.percent).toFixed(1),barWidth:Math.max(6,num(x.percent)),color:COLORS[i%COLORS.length],roleText:x.subjectType==='SUPPLIER'?'合作最频繁':'最活跃采购员'});});
    this.setData({loading:false,hasData:total>0,daily:this._fillDays(data.dailyRhythm||[]),goods:goods,behaviors:behaviors,tips:(data.tips||[]).map(function(x){return Object.assign({},x,{displayValue:x.type==='peakDay'?shortDate(x.value):x.value});}),summary:{purchaseCount:total,activeDays:num(s.activePurchaseDays),activeRate:dateDays?Math.round(num(s.activePurchaseDays)*100/dateDays):0,highName:s.highFrequencyGoodsName||'暂无',highCount:num(s.highFrequencyGoodsCount),average:num(s.averageDailyCount).toFixed(1),countTrend:trend(s.countChangePercent),averageTrend:trend(s.averageChangePercent)}},this._scheduleRhythm.bind(this));
  },
  _scheduleRhythm: function () {
    var that=this;
    wx.nextTick(function(){setTimeout(function(){that._drawRhythm();},80);});
  },
  _drawRhythm: function () {
    var c=this.selectComponent('#rhythmChart');
    if(!this.data.hasData){return;}
    if(!c){
      this._rhythmInitAttempts=(this._rhythmInitAttempts||0)+1;
      if(this._rhythmInitAttempts<6){setTimeout(this._drawRhythm.bind(this),100);}
      return;
    }
    this._rhythmInitAttempts=0;
    var rows=this.data.daily||[],metric=this.data.rhythmMetric,that=this;
    c.init(function(canvas,width,height,dpr){if(that.rhythmChart)that.rhythmChart.dispose();var chart=echarts.init(canvas,null,{width:width,height:height,devicePixelRatio:dpr});that.rhythmChart=chart;chart.setOption({grid:{left:8,right:8,top:24,bottom:8,containLabel:true},xAxis:{type:'category',data:rows.map(function(x){var p=x.day.split('-');return Number(p[1])+'/'+Number(p[2]);}),axisTick:{show:false},axisLine:{lineStyle:{color:'#dbe8e4'}},axisLabel:{fontSize:9,color:'#7e8da4',interval:rows.length>16?2:0}},yAxis:{type:'value',minInterval:1,splitNumber:3,axisLine:{show:false},axisTick:{show:false},axisLabel:{fontSize:10,color:'#7e8da4'},splitLine:{lineStyle:{color:'#eef4f2'}}},series:[{type:'bar',barWidth:'42%',data:rows.map(function(x){return{value:num(metric==='count'?x.purchaseCount:x.activeSourceCount),itemStyle:{color:num(x.purchaseCount)>=8?'#2bc68c':'#9ae8c2',borderRadius:[7,7,0,0]}};})}]});return chart;});
  },
  toCategoryGoods:function(e){wx.navigateTo({url:'/subPackage-charts/pages/cost/purchaseCategoryDetail/purchaseCategoryDetail?focusGoodsId='+e.currentTarget.dataset.id});},
  toBack:function(){wx.navigateBack({delta:1});}
});
