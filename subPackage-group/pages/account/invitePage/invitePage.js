
const globalData = getApp().globalData;
var app = getApp()
import QRCode from '../../../../utils/qrcode/weapp.qrcode.esm'

Page({


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
  
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      screenWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      rpxR: globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      depId: options.depId,
      disId: options.disId,
      depName: options.depName,
      admin: options.admin

    })
    this.createQrcode();



  },

  shareImg() {
    var that = this;
    var context = wx.createCanvasContext("positionPoster");
    context.beginPath();
    var bigWidth = (that.data.windowWidth - 80 )/ globalData.rpxR;
    var bigHeight = (that.data.windowHeight - 360 - that.data.statusBarHeight) / globalData.rpxR;
   

    // 第一行
    that._createDisName(that, context,bigWidth, bigHeight);
   
    //矩形底色
    var www = bigWidth  - 50  ;
    var left = 50/2;
    var topSmallBack = bigHeight / 3; 
     context.setFillStyle("rgba(243, 249, 250, 0.938)");
     context.fillRect(left, topSmallBack, www, www + bigWidth / 6);
    
     // 矩形内文字-第一行
     that._createCodeWord(that, context,bigWidth, bigHeight);
     var left_code = Number(left) +  Number(50);
     var www_code = Number(www) - Number(100);

    var top = bigHeight / 3 + bigWidth / 6 + bigWidth / 12 ;
    context.drawImage(that.data.qrcodePath, left_code, top, www_code, www_code);
    
    context.draw(false, function () {
      wx.canvasToTempFilePath({
        x: 0,
        y: 0,
        width: that.data.windowWidth ,
        height: that.data.windowHeight,
        destWidth: that.data.windowWidth,
        destHeight: that.data.windowHeight,
        canvasId: "positionPoster",
        success: function (res) {
          that.saveImage = res.tempFilePath;
          that.setData({
            src: res.tempFilePath
          })
          if (!res.tempFilePath) {
            wx.showModal({
              title: "提示",
              content: "图片绘制中，请稍后重试",
              showCancel: false,
            });
          }
        },
        fail: (res) => {
          wx.hideLoading();
          that.isShow = false;
        },
      });
    });
  },

  //disName
  _createDisName(that,context, bigWidth, bigHeight ){
    let nickName = that.data.depName;
    context.font = "30px sans-serif";
    context.fillStyle = "black";
    var content = nickName + " 邀请您加入注册" + "订货小程序"
    var left  = 50;
    var top = bigHeight / 10 ;
    that.toFormateStr(context, content, left, top , 40, bigWidth - 100);
  
  },

  _createCodeWord(that,context, bigWidth, bigHeight){
   if(that.data.rpxR < 3){
    context.font =  "17px sans-serif";
   }else{
    context.font =  "18px sans-serif";
   }
    context.fillStyle = "gray";
    var content = "长按识别二维码,注册小程序"
    var left = 75;
    var www = bigWidth  -100 ;
    var top = bigHeight / 3 + bigWidth / 6 + bigWidth / 12 - bigWidth / 24;
    context.fillText(content, left, top, www);
  },


  toFormateStr(ctx, str, axisX, axisY, titleHeight, maxWidth) {
    // 字体
    ctx.setFontSize(28);
    // 颜色
    ctx.setFillStyle("#000");
    // 文本处理
    let strArr = str.split("");
    let row = [];
    let temp = "";
    for (let i = 0; i < strArr.length; i++) {
      if (ctx.measureText(temp).width < maxWidth) {
        temp += strArr[i];
      } else {
        i--; //这里添加了i-- 是为了防止字符丢失，效果图中有对比
        row.push(temp);
        temp = "";
      }
    }

    row.push(temp); // row有多少项则就有多少行
    //如果数组长度大于2，现在只需要显示两行则只截取前两项,把第二行结尾设置成'...'
    if (row.length > 2) {
      let rowCut = row.slice(0, 2);
      let rowPart = rowCut[1];
      let test = "";
      let empty = [];
      for (let i = 0; i < rowPart.length; i++) {
        if (ctx.measureText(test).width < maxWidth) {
          test += rowPart[i];
        } else {
          break;
        }
      }
      empty.push(test);
      let group = empty[0] + "..."; //这里只显示两行，超出的用...表示
      rowCut.splice(1, 1, group);
      row = rowCut;
    }
    // 把文本绘制到画布中
    for (let i = 0; i < row.length; i++) {
      // 一次渲染一行
      ctx.fillText(row[i], axisX, axisY + i * titleHeight, maxWidth);
     
    }
    // // 保存当前画布状态
    // ctx.save();
    // // // 将之前在绘图上下文中的描述（路径、变形、样式）画到 canvas 中。
    // ctx.draw();
  },


// 生成二维码
//https://grainservice.club:8443/nongxinle/api/gbdepartmentuser/gbdepartmentUserRegiste
createQrcode() {
  var that = this;
  var depUrl = "";
  if(that.data.admin == 11){
    depUrl = "gbdepartmentUserRegiste"
  }
  if(that.data.admin == 2 || that.data.admin == 31){
    depUrl = "gbPurchaseUserRegiste"
  }
  if(that.data.admin == 3){
    depUrl = "gbStockUserRegiste"
  }
  if(that.data.admin == 4){
    depUrl = "gbProductionUserRegiste"
  }
  const query = wx.createSelectorQuery()
  query.select('#qrcode')
    .fields({
      node: true,
      size: true
    })
    .exec((res) => {
      var canvas = res[0].node
      // 调用方法drawQrcode生成二维码
      QRCode({
        canvas: canvas,
        canvasId: 'qrcode',
        // width: that.data.windowWidth / 5,
        padding: 0,
        background: '#ffffff',
        foreground: '#000000',
        text:  "https://grainservice.club:8443/nongxinle/api/gbdepartmentuser/"
         + depUrl + "?disId=" + that.data.disId +"&depId=" + that.data.depId
         + "&depName=" + that.data.depName + "&admin=" + that.data.admin,
      })
 
      // 获取临时路径（得到之后，想干嘛就干嘛了）
      wx.canvasToTempFilePath({
        canvasId: 'qrcode',
        canvas: canvas,
        x: 0,
        y: 0,
        width: that.data.windowWidth ,
        height: that.data.windowWidth,
        destWidth: that.data.windowWidth / 2,
        destHeight: that.data.windowWidth /2,
        success(res) {
          // console.log('二维码临时路径：', res.tempFilePath)
          that.setData({
            qrcodePath: res.tempFilePath
          })
              that.shareImg();
            
        },
        fail(res) {
          console.error(res)
        }
      })
    })
},


  share() {
    wx.showShareImageMenu({
      path: this.data.src,
      success(){
        wx.navigateBack({
          delta: 1,
        })

      },fail(f){
      }
    })
  },





  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },

})