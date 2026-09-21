var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil.js');
var config = require('../../../../config/index.js');
var echarts = require('../../../../ec-canvas/echarts');
var globalData = getApp().globalData;
import { dishIngredientDashboard } from '../../../../services/apiDistributerFood';
import apiDistributer from '../../../../services/apiDistributer.js';
function num(v){var n=Number(v);return isNaN(n)?0:n;} function money(v){return num(v).toFixed(2);} function imageUrl(v){return !v?'':(/^https?:\/\//.test(v)?v:config.server+v);}

Page({
  data:{navBarHeight:0,loading:true,hasData:false,ecTrend:{lazyLoad:true}},
  onLoad:function(o){this.context=wx.getStorageSync('ingredientCostContext')||{};this.setData({navBarHeight:globalData.navBarHeight*globalData.rpxR,foodId:Number(o.foodId||0),goodsId:Number(o.goodsId||0),disId:Number(o.disId||0),depFatherId:Number(o.depFatherId||0)});this._syncDate();this._load();},
  onShow:function(){if(this.data.updateDate){this.setData({updateDate:false});this._syncDate();this._load();}},
  onUnload:function(){if(this.chart)this.chart.dispose();},
  _syncDate:function(){var s=wx.getStorageSync('myDate'),r=s?(s.name==='custom'?dateUtils.getDateRange(s.name,s.startDate,s.stopDate):dateUtils.getDateRange(s.name)):{startDate:dateUtils.getFirstDateInMonth(),stopDate:dateUtils.getArriveDate(0),name:'本月'};this.setData({startDate:r.startDate,stopDate:r.stopDate,hanzi:s&&s.hanzi||r.name||'本月',dateType:s?s.dateType:'month'});},
  _load:function(){
    var that=this;
    this.setData({loading:true});
    load.showLoading('加载原料详情');
    var dashboardRequest=dishIngredientDashboard({startDate:this.data.startDate,stopDate:this.data.stopDate,disId:this.data.disId,depFatherId:this.data.depFatherId,foodId:this.data.foodId,primaryDisGoodsId:this.data.goodsId,trendGranularity:'month'});
    var purchaseRequest=apiDistributer.getGbPurGoodsDetailList({disGoodsId:this.data.goodsId,startDate:this.data.startDate,stopDate:this.data.stopDate}).catch(function(){return {result:{code:-1,data:{}}};});
    Promise.all([dashboardRequest,purchaseRequest]).then(function(results){
      load.hideLoading();
      var dashboard=results[0]&&results[0].result||{};
      var purchase=results[1]&&results[1].result||{};
      if(dashboard.code!==0){that.setData({loading:false});load.showToast(dashboard.msg||'加载失败');return;}
      that._apply(dashboard.data||{},purchase.code===0?(purchase.data||{}):{});
    }).catch(function(){load.hideLoading();that.setData({loading:false});load.showToast('网络异常');});
  },
  _apply:function(data,purchaseData){
    var rows=data.consumptionAuditIngredients||[],item=null;
    for(var i=0;i<rows.length;i++){if(Number(rows[i].goodsId)===this.data.goodsId){item=rows[i];break;}}
    if(!item){this.setData({loading:false,hasData:false});return;}
    var theory=num(item.theoryOutboundQty),actual=num(item.actualOutboundQty),diff=actual-theory;
    var records=item.stockReduceRecords||[];
    var wasteCount=records.filter(function(x){return x.reduceType==='WASTE'||x.reduceType==='LOSS';}).length;
    var points=(purchaseData.itemList||[]).map(function(x){
      var date=x.date||'',parts=date.split('-');
      return {date:date,label:parts.length===3?Number(parts[1])+'/'+Number(parts[2]):date,value:num(x.purUnitPrice)};
    }).filter(function(x){return x.date&&x.value>0;}).sort(function(a,b){return a.date>b.date?1:(a.date<b.date?-1:0);});
    var first=points.length?points[0].value:0,last=points.length?points[points.length-1].value:0;
    var hasPriceRate=points.length>1&&first>0;
    var priceRate=hasPriceRate?(last-first)*100/first:0;
    this.trendPoints=points;
    this.setData({loading:false,hasData:true,goods:{name:item.goodsName||'未命名原料',image:imageUrl(item.goodsImage),unit:item.unit||'',portion:item.gbDfgPortionAmount||item.recipeUsagePerPortion||'0',portionUnit:item.gbDfgPortionUnit||item.unit||'',theory:money(theory),actual:money(actual),difference:money(diff),cost:money(item.selectedDishAllocatedCost||item.actualOutboundAmount),costShare:money(num(item.selectedDishAllocatedCost||item.actualOutboundAmount)/(Math.max(num(data.dish&&data.dish.outboundAllocatedCostPerPortion)*num(data.dish&&data.dish.salesPortions),.01))*100),priceRate:hasPriceRate?priceRate.toFixed(1):'--',wasteCount:wasteCount},dish:{name:data.dish&&data.dish.foodName||this.context.foodName||'',image:this.context.foodImage||''},related:(item.relatedDishAllocations||[]).slice(0,4).map(function(x){return Object.assign({},x,{cost:money(x.allocatedCost||x.actualOutboundAmount),usage:money(x.allocatedConsumption||x.actualOutboundQty)});}),causes:[{icon:'↗',title:'采购价变化',text:hasPriceRate?'区间采购单价变化 '+priceRate.toFixed(1)+'%':'区间内有效采购单价记录不足',value:hasPriceRate?(priceRate>=0?'+':'')+priceRate.toFixed(1)+'%':'—',tone:'red'},{icon:'◇',title:'出库分摊偏差',text:'实际分摊量比理论量 '+(diff>=0?'多 ':'少 ')+money(Math.abs(diff))+(item.unit||''),value:(diff>=0?'+':'-')+money(Math.abs(diff)),tone:'orange'},{icon:'▤',title:'损耗记录',text:wasteCount?'已记录损耗或废弃，可结合记录核查':'本期未发现损耗记录',value:wasteCount+'条',tone:'blue'}]},this._draw.bind(this));
  },
  _draw:function(){
    var c=this.selectComponent('#trendChart'),that=this;
    if(!c)return;
    c.init(function(canvas,w,h,dpr){
      if(that.chart)that.chart.dispose();
      var chart=echarts.init(canvas,null,{width:w,height:h,devicePixelRatio:dpr});
      that.chart=chart;
      var pts=that.trendPoints||[];
      if(!pts.length){
        chart.setOption({title:{text:'暂无有效采购单价',left:'center',top:'middle',textStyle:{color:'#8a99aa',fontSize:13,fontWeight:'normal'}}});
        return chart;
      }
      chart.setOption({grid:{left:12,right:12,top:32,bottom:10,containLabel:true},xAxis:{type:'category',boundaryGap:false,data:pts.map(function(x){return x.label;}),axisLine:{lineStyle:{color:'#d5e5de'}},axisTick:{show:false},axisLabel:{color:'#718198',fontSize:10}},yAxis:{type:'value',scale:true,splitNumber:3,axisLine:{show:false},axisTick:{show:false},axisLabel:{color:'#718198',fontSize:10,formatter:function(value){return '¥'+Number(value).toFixed(2);}},splitLine:{lineStyle:{type:'dashed',color:'#e6eeeb'}}},series:[{type:'line',name:'采购单价',smooth:true,data:pts.map(function(x){return x.value;}),symbol:'circle',symbolSize:7,label:{show:pts.length<=8,position:'top',formatter:function(params){return '¥'+Number(params.value).toFixed(2);},color:'#38584c',fontSize:10},lineStyle:{color:'#07a766',width:3},itemStyle:{color:'#07a766'},areaStyle:{color:'rgba(28,190,116,.15)'}}]});
      return chart;
    });
  },
  toDatePage:function(){this.setData({updateDate:true});wx.navigateTo({url:'/pages/common/selectDate/selectDate?startDate='+this.data.startDate+'&stopDate='+this.data.stopDate+'&dateType='+this.data.dateType});},
  showRecords:function(){load.showToast('采购记录入口正在完善');},toBack:function(){wx.navigateBack();}
});
