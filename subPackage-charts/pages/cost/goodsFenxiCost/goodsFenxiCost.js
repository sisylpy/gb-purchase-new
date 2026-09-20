var dateUtils=require('../../../../lib/dateUtil'),api=require('../../../services/api.js'),apiDis=require('../../../../services/apiDistributer.js'),load=require('../../../../lib/load.js'),globalData=getApp().globalData;
function n(v){var x=parseFloat(String(v==null?0:v).replace(/,/g,''));return isNaN(x)?0:x}function money(v){return n(v).toFixed(2).replace(/\.00$/,'')}function shortDate(s){var p=String(s||'').split('-');return p.length===3?Number(p[1])+'月'+Number(p[2])+'日':s}
Page({data:{navBarHeight:0,hanzi:'本月',dateText:'',row:{},dishes:[],daily:[],loading:true},
onLoad:function(options){var cached=wx.getStorageSync('costIngredient')||{},legacy=wx.getStorageSync('disGoods')||{},target=Number(options.disGoodsId||0),cachedId=Number(cached.disGoodsId||cached.gbDistributerGoodsId||0),row=target&&cachedId!==target?legacy:(cached.disGoodsId||cached.gbDistributerGoodsId?cached:legacy),dis=wx.getStorageSync('disInfo')||{},searchDepId=options.searchDepId||'-1',depFatherId=options.depFatherId||(searchDepId!=='-1'?searchDepId:'');this.setData({navBarHeight:globalData.navBarHeight*globalData.rpxR,disId:options.disId||dis.gbDistributerId,depFatherId:depFatherId,disGoodsId:options.disGoodsId||row.disGoodsId||row.gbDistributerGoodsId,searchDepId:searchDepId,row:this.viewRow(row),dishes:this.viewDishes(row.supportedDishes||[])});this.syncDate();this.loadData()},
onShow:function(){if(this.data.updateDate){this.setData({updateDate:false});this.syncDate();this.loadData()}},syncDate:function(){var s=wx.getStorageSync('myDate'),r=s?(s.name==='custom'?dateUtils.getDateRange(s.name,s.startDate,s.stopDate):dateUtils.getDateRange(s.name)):{startDate:dateUtils.getFirstDateInMonth(),stopDate:dateUtils.getArriveDate(0),name:'本月'};this.setData({startDate:r.startDate,stopDate:r.stopDate,hanzi:(s&&s.hanzi)||r.name||'本月',dateText:shortDate(r.startDate)+' - '+shortDate(r.stopDate)})},
viewRow:function(r){var total=n(r.outboundTotalAmount),verified=n(r.verifiedAmount),un=n(r.nonVerifiedAmount),meal=n(r.employeeMealAmount),qty=n(r.outboundTotalQty),actual=n(r.actualUsage),theory=n(r.theoryUsage),diff=actual-theory;return Object.assign({},r,{name:r.name||r.gbDgGoodsName||'原料详情',unit:r.gbDgGoodsStandardname||'斤',unitPriceText:money(r.unitPrice),totalText:money(total),verifiedText:money(verified),unverifiedText:money(un),mealText:money(meal),qtyText:money(qty),verifiedQtyText:money(r.verifiedQty),unverifiedQtyText:money(r.nonVerifiedQty),mealQtyText:money(r.employeeMealQty),verifiedPct:total?Math.round(verified*100/total):0,unverifiedPct:total?Math.round(un*100/total):0,mealPct:total?Math.round(meal*100/total):0,theoryText:money(theory),actualText:money(actual),diffText:(diff>0?'+':'')+money(diff),diffTone:diff>0?'danger':'ok'})},
viewDishes:function(list){return(list||[]).map(function(d){var diff=n(d.diffUsage);return Object.assign({},d,{salesText:money(d.salesPortions),unitText:money(d.recipeUnitPerDish),theoryText:money(d.theoryUsage),actualText:money(d.actualUsage),diffText:(diff>0?'+':'')+money(diff),tone:diff>0?'danger':'ok'})})},
loadData:function(){var that=this;load.showLoading('加载中');Promise.all([api.outboundIngredientAnalysis({startDate:this.data.startDate,stopDate:this.data.stopDate,disId:this.data.disId,depFatherId:this.data.depFatherId,verificationStatus:'all',sortBy:'outbound',sortOrder:'desc'}),apiDis.getGbUnitPriceAnalysis({disId:this.data.disId,startDate:this.data.startDate,stopDate:this.data.stopDate,sourceType:'ALL',purDepId:'',disGoodsId:this.data.disGoodsId})]).then(function(all){load.hideLoading();var d=(all[0].result&&all[0].result.data)||{},p=(all[1].result&&all[1].result.data)||{},g=(p.goods||[])[0]||{},ingredient=(d.ingredientsAnalysis||[]).filter(function(x){return Number(x.disGoodsId)===Number(that.data.disGoodsId)})[0]||{},daily=(p.priceTrend||[]).map(function(x){return{date:x.day||'',value:x.averageUnitPrice==null?null:n(x.averageUnitPrice)}}),merged=Object.assign({},that.data.row,ingredient,{unitPrice:g.currentUnitPrice||ingredient.unitPrice||that.data.row.unitPrice,previousPrice:g.previousUnitPrice,priceChangePercent:g.priceChangePercent});that.setData({loading:false,daily:daily,history:{},row:that.viewRow(merged),dishes:that.viewDishes(ingredient.supportedDishes||[])},function(){that.scheduleChart()})}).catch(function(){load.hideLoading();that.setData({loading:false},function(){that.scheduleChart()})})},
scheduleChart:function(){var that=this;wx.nextTick(function(){setTimeout(function(){that.drawChart()},80)})},
drawChart:function(){
  var that=this,daily=(this.data.daily||[]).filter(function(x){return x.value!==null&&x.value!==undefined&&!isNaN(Number(x.value))});
  if(!daily.length)daily=[{date:'本期',value:n(this.data.row.unitPrice)}];
  this.createSelectorQuery().select('#trendCanvas').fields({node:true,size:true}).exec(function(result){
    var target=result&&result[0];
    if(!target||!target.node||!target.width||!target.height){
      that.chartInitAttempts=(that.chartInitAttempts||0)+1;
      if(that.chartInitAttempts<8)setTimeout(function(){that.drawChart()},100);
      return;
    }
    that.chartInitAttempts=0;
    var canvas=target.node,width=target.width,height=target.height;
    var dpr=wx.getWindowInfo?wx.getWindowInfo().pixelRatio:1;
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    var ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.clearRect(0,0,width,height);
    var left=42,right=14,top=28,bottom=28,plotWidth=width-left-right,plotHeight=height-top-bottom;
    var values=daily.map(function(x){return Number(x.value)}),min=Math.min.apply(null,values),max=Math.max.apply(null,values);
    var pad=max===min?Math.max(Math.abs(max)*0.08,0.1):(max-min)*0.25;
    var yMin=Math.max(0,min-pad),yMax=max+pad;if(yMax===yMin)yMax=yMin+1;
    ctx.font='10px sans-serif';ctx.textBaseline='middle';ctx.textAlign='right';ctx.fillStyle='#728099';ctx.strokeStyle='#e8edf2';ctx.lineWidth=1;
    for(var gridIndex=0;gridIndex<4;gridIndex++){
      var ratio=gridIndex/3,y=top+plotHeight*ratio,label=yMax-(yMax-yMin)*ratio;
      ctx.beginPath();ctx.setLineDash([4,4]);ctx.moveTo(left,y);ctx.lineTo(width-right,y);ctx.stroke();ctx.setLineDash([]);
      ctx.fillText(money(label),left-7,y);
    }
    var points=daily.map(function(x,index){
      var px=daily.length===1?left+plotWidth/2:left+plotWidth*index/(daily.length-1);
      var py=top+(yMax-Number(x.value))/(yMax-yMin)*plotHeight;
      return{x:px,y:py,value:Number(x.value),date:x.date};
    });
    function traceLine(){ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(var i=1;i<points.length;i++){var prev=points[i-1],cur=points[i],mid=(prev.x+cur.x)/2;ctx.bezierCurveTo(mid,prev.y,mid,cur.y,cur.x,cur.y)}}
    traceLine();ctx.lineTo(points[points.length-1].x,top+plotHeight);ctx.lineTo(points[0].x,top+plotHeight);ctx.closePath();
    var gradient=ctx.createLinearGradient(0,top,0,top+plotHeight);gradient.addColorStop(0,'rgba(51,207,143,0.28)');gradient.addColorStop(1,'rgba(51,207,143,0.03)');ctx.fillStyle=gradient;ctx.fill();
    traceLine();ctx.strokeStyle='#099c65';ctx.lineWidth=3;ctx.stroke();
    points.forEach(function(point,index){
      ctx.beginPath();ctx.arc(point.x,point.y,4,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#099c65';ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle='#099c65';ctx.font='10px sans-serif';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText('¥'+money(point.value),point.x,point.y-7);
      var parts=String(point.date).split('-'),dateLabel=parts.length>2?Number(parts[1])+'/'+Number(parts[2]):point.date;
      ctx.fillStyle='#728099';ctx.textBaseline='top';ctx.fillText(dateLabel,point.x,top+plotHeight+8);
    });
  });
},
toDish:function(e){var d=this.data.dishes[e.currentTarget.dataset.index];if(!d||!d.dishId)return;wx.setStorageSync('foodGoodsFenxiDetailContext',{name:d.dishName});wx.navigateTo({url:'../foodGoodsFenxiDetail/foodGoodsFenxiDetail?foodId='+d.dishId+'&disId='+this.data.disId+'&depFatherId='+this.data.depFatherId})},toDatePage:function(){this.setData({updateDate:true});wx.navigateTo({url:'/pages/common/selectDate/selectDate?startDate='+this.data.startDate+'&stopDate='+this.data.stopDate+'&dateType=month'})},toBack:function(){wx.navigateBack()}})
