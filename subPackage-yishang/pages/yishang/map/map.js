var load = require('../../../../lib/load.js');

const globalData = getApp().globalData;
var app = getApp()

import { 
  getMarketNxGoodsDistributers,
} from '../../../../lib/apiDistributer'

Page({
  data: {
   points: [],
    distributerArr: [],
    update: false,
    showDitu: true
    
  },

  onShow() {
    if (this.data.update) {
      // this._initData();
    }
  },


  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,     
      statusBarHeight: globalData.statusBarHeight  * globalData.rpxR,
      nxGoodsId: options.nxGoodsId,
      nxGoodsName: options.nxGoodsName,
    })
    
    var value = wx.getStorageSync('disInfo');
    if (value) {
      this.setData({
        disId: value.gbDistributerId,
        disInfo: value,
        appSupplierDepId: value.appSupplierDepartment.gbDepartmentId
      })
      console.log("gbDistributerLan", value.gbDistributerLan)

      if(value.gbDistributerLan == null || value.gbDistributerLan == ""){
        console.log("gbDistributerLan", value.gbDistributerLan)
        var _this = this;
        wx.chooseLocation({
          success: function (res) {
            console.log('chooseLocation', res);
            _this.setData({
              latitude: res.latitude,
              longitude: res.longitude,
               markers: _this._initData(res.latitude, res.longitude)
            })
         
    
          },
        })
    }
  }

    var userInfo = wx.getStorageSync('userInfo');
    if(userInfo){
      this.setData({
        userInfo: userInfo
      })
    }

    var disGoods = wx.getStorageSync('disGoods');
    if(disGoods){
      this.setData({
        disGoods: disGoods
      })
    }
    
    // var that = this;

    // wx.getSetting({
    //   success(res) {
    //     console.log("resreeesss",res)
    //     if (!res.authSetting['scope.userLocation']) {
    //       wx.authorize({
    //         scope: 'scope.userLocation',
    //         success() {
    //           // 用户已经同意授权，可以调用 wx.getLocation
    //           wx.getLocation({
    //             type: 'wgs84',
    //             success: function (res) {
    //               console.log(res);
    //               that.setData({
    //                 latitude: res.latitude,
    //                 longitude: res.longitude,
    //                 markers: that._initData(res.latitude, res.longitude)
    //               });
    //             }
    //           });
    //         },
    //         fail() {
    //           // 用户拒绝授权，提示用户需要授权
    //           wx.showToast({
    //             title: '需要授权地理位置权限',
    //             icon: 'none'
    //           });
    //         }
    //       });
    //     } else {
    //       // 用户已经授权，直接调用 wx.getLocation
    //       wx.getLocation({
    //         type: 'wgs84',
    //         success: function (res) {
    //           console.log(res);
             
    //           that.setData({
    //             latitude: res.latitude,
    //             longitude: res.longitude,
    //             markers: that._initData(res.latitude, res.longitude)
    //           });
    //         },
    //         fail: function (err) {
    //           console.error("获取位置失败:", err);
    //         }
    //       });
    //     }
    //   }
    // });



  

  },




  _initData(a,b) {
    var that = this;
    load.showLoading("获取订单中")
    var data = {
      nxGoodsId : this.data.nxGoodsId,
      fromLat: a,
      fromLng: b,
    }
    getMarketNxGoodsDistributers(data).then(res => {
      load.hideLoading();
      console.log(res)
      if (res.result.code == 0) {
        if (res.result.data.length > 0) {
          this.setData({
            distributerArr: res.result.data,
          })
          var points = [];
          for (var i = 0; i < res.result.data.length; i++) {
            var item = {
              latitude: res.result.data[i].nxDistributerLan,
              longitude: res.result.data[i].nxDistributerLun,
            }
            console.log("pioindss" , item);
           points.push(item);
          }
          var myPoint = {
            latitude: this.data.latitude,
          longitude: this.data.longitude,
          }
         points.push(myPoint);
          this.setData({
           points:points
          })
          that.getHospitalMarkers();
        }else{
          this.setData({
            distributerArr: []
          })
        }
      } else {
        wx.showToast({
          title: '获取订单失败',
        })
      }
    })   

  },


  checkboxChange(e) {
    console.log(e);
    this.setData({
      resArr: e.detail.value,
    })
  },

  /**
   * 获取客户标识
   */
  getHospitalMarkers() {
    let markers = [];
    if (this.data.distributerArr.length > 0) {
      for (let date of this.data.distributerArr) {
        let marker = this.createMarker(date);
        markers.push(marker)
      }
      let mymarker = {
        iconPath: this.data.userInfo.gbDiuWxAvartraUrl,
        id: 0,
        name: this.data.disInfo.gbDistributerName,
        latitude: this.data.latitude,
        longitude: this.data.longitude,
          width: 25,
         height: 48,
        label: {
          content:  this.data.disInfo.gbDistributerName, //文本
          color: '#187e6e', //文本颜色
          borderRadius: 3, //边筐圆角
          borderWidth: 1, //边筐宽度
          borderColor: '#187e6e', //边筐颜色
          bgColor: '#ffffff', //背景色
          padding: 5, //文本边缘留白
          textAlign: 'center', //文本对齐方式。有效值: left, right, center
          x: 2,
          y: 1,
        }
      }
      markers.push(mymarker);
    }

    this.setData({
      markers: markers
    })

    if (this.data.points.length > 0) {
      var mapCtx = wx.createMapContext('myMap')
      mapCtx.includePoints({
        padding: [50],
       points: this.data.points
      })
    }
  },

  /**
   * 还有地图标识，可以在name上面动手
   */
  createMarker(point) {
    let latitude = point.nxDistributerLan;
    let longitude = point.nxDistributerLun;

    let marker = {
      iconPath: "/images/location.png",
      id: point.nxDistributerId || 0,
      name: point.nxDistributerName || '',
      latitude: latitude,
      longitude: longitude,
        width: 25,
       height: 48,
      label: {
        content: point.nxDistributerName, //文本
        color: '#FF0202', //文本颜色
        borderRadius: 3, //边筐圆角
        borderWidth: 1, //边筐宽度
        borderColor: '#FF0202', //边筐颜色
        bgColor: '#ffffff', //背景色
        padding: 5, //文本边缘留白
        textAlign: 'center', //文本对齐方式。有效值: left, right, center
        x: 2,
        y: 1,
      }
    };
    return marker;
  },

  bindEvent() {
    this.mapCtx.initMarkerCluster({
      enableDefaultStyle: true,
      zoomOnClick: true,
      gridSize: 60,
      complete(res) {
        console.log('initMarkerCluster', res)
      }
    })

    // enableDefaultStyle 为 true 时不会触发改事件
    this.mapCtx.on('markerClusterCreate', res => {
      console.log('clusterCreate', res)
      const clusters = res.clusters
      const markers = clusters.map(cluster => {
        const {
          center,
          clusterId,
          markerIds
        } = cluster
        return {
          ...center,
          width: 0,
          height: 0,
          clusterId, // 必须
          label: {
            content: markerIds.length + '',
            fontSize: 20,
            width: 60,
            height: 60,
            bgColor: '#00ff00',
            borderRadius: 30,
            textAlign: 'center',
            anchorX: 0,
            anchorY: -30,
          }
        }
      })
      this.mapCtx.addMarkers({
        markers,
        clear: false,
        complete(res) {
          console.log('clusterCreate addMarkers', res)
        }
      })
    })

  },


  addMarkers() {

    let marker = {
      iconPath: "/images/location.png",
      id: 0,
      name: 'abc',
      latitude: 39.958843,
      longitude: 116.82941,
      //   width: 25,
      //  height: 48,
      label: {
        content: 'qidian', //文本
        color: '#FF0202', //文本颜色
        borderRadius: 3, //边筐圆角
        borderWidth: 1, //边筐宽度
        borderColor: '#FF0202', //边筐颜色
        bgColor: '#ffffff', //背景色
        padding: 5, //文本边缘留白
        textAlign: 'center', //文本对齐方式。有效值: left, right, center
        x: 2,
        y: 1,
      }
    };
  },

  removeMarkers() {
    this.mapCtx.addMarkers({
      clear: true,
      markers: []
    })
  },


  
toPhone(e){


  wx.makePhoneCall({
    phoneNumber:  e.currentTarget.dataset.phone, // 需要拨打的电话号码
    success: function (res) {
      console.log('拨打电话成功', res);
    },
    fail: function (err) {
      console.error('拨打电话失败', err);
    }
  });
},



toNxdistributer(e){
  wx.setStorageSync('nxDisInfo', e.currentTarget.dataset.item)
  var id = e.currentTarget.dataset.id;
  var name = e.currentTarget.dataset.name;;
  wx.navigateTo({
    url: '../nxDistributerGoods/nxDistributerGoods?nxDisId=' + id +
      '&name=' + name + '&toDepId=' + this.data.appSupplierDepId,
  })
},

  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  },

  toDitu(){
    this.setData({
      showDitu: true,
      showLiebiao: false
    })

  },
  toLiebiao(e){
    console.log(e);

    this.setData({
      showDitu: false,
      showLiebiao: true,
    })

  }






})