
var app = getApp();

const globalData = getApp().globalData;
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../lib/dateUtil');
var gbDistributerGoodsApi = require('../../../../services/gbDistributerGoodsApi.js');


Page({

  onShow: function () {

    // 推荐直接用新API
    let windowInfo = wx.getWindowInfo();
    let globalData = getApp().globalData;
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
    });
  },

  /**
   * 页面的初始数据
   */
  data: {
   
    src: "",
    
  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    
     var disInfo = wx.getStorageSync('disInfo');
     if(disInfo){
       this.setData({
        disInfo: disInfo,
        disId: disInfo.gbDistributerId,
       })
     }
     var mendianInfo = wx.getStorageSync('mendianInfo');
     if(mendianInfo){
       this.setData({
        toDepId: mendianInfo.gbDepartmentId,
       })
     }
     var depInfo = wx.getStorageSync('orderDepInfo');
     if(depInfo){
       this.setData({
        depInfo: depInfo,
        depFatherId: depInfo.gbDepartmentFatherId,
        depId: depInfo.gbDepartmentId,
       })
     }

    this.setData({
     
      goods: {
        gbDgGoodsSort: this.data.depId,
        gbDgGoodsSonsSort: this.data.depId,
        gbDgGbDepartmentId: this.data.toDepId,
        gbDgPullOff: 0,
        gbDgGoodsStatus: 0,
        gbDgDistributerId: this.data.disId,
        gbDgGoodsName: options.goodsName,
        gbDgGoodsStandardname: "",
        gbDgGoodsStandardWeight: "",
        gbDgCartonUnit: "",
        gbDgQuantityDays: "",
        gbDgGoodsBrand: "",
        gbDgGoodsPlace: "",
        gbDgGoodsInventoryType: 1,
        gbDgNxGoodsFatherColor: "#20afb8",
        gbDgGoodsFile: 'goodsImage/logo.png',
        gbDistributerStandardEntities: [],
        gbDgGoodsDetail: "",
        gbDgGoodsType: 2,
      },
      fatherName:"临时添加",
      isGrade: 0,
    })
  },


  /**
   * 将中文计量单位转换为统一标准缩写
   */
  _normalizeUnit: function (value) {
    if (!value || typeof value !== 'string') return value;
    var unitMap = {
      '毫升': 'ml',
      '升': 'L',
      '公斤': 'kg',
      '千克': 'kg',
      '克': 'g',
      '斤': 'jin',
      '两': 'liang',
      '吨': 't',
      '毫克': 'mg',
    };
    var result = value;
    // 先去掉数字和中文单位之间的空格："400 毫升" → "400毫升"
    for (var cn in unitMap) {
      if (unitMap.hasOwnProperty(cn)) {
        result = result.replace(new RegExp('(\\d+)\\s*' + cn, 'g'), '$1' + unitMap[cn]);
      }
    }
    // 去掉数字和英文单位缩写之间的空格："400 ml" → "400ml"
    result = result.replace(/(\d+)\s+(ml|L|kg|g|jin|liang|t|mg)/g, '$1$2');
    return result;
  },

  /**
   * 去空格处理：移除首尾空格，并将中间连续空格替换为单个空格
   */
  _trimSpaces: function (value) {
    if (!value || typeof value !== 'string') return value;
    return value.trim().replace(/\s+/g, ' ');
  },

  getDisGoodsContent(e) {
    var nameData = "goods.gbDgGoodsName";
    var standardData = "goods.gbDgGoodsStandardname";
    var standardWeightData = "goods.gbDgGoodsStandardWeight";
    var cartonUnitData = "goods.gbDgCartonUnit";
    var itemsPerCartonData = "goods.gbDgItemsPerCarton";
    var brandData = "goods.gbDgGoodsBrand";
    var placeData = "goods.gbDgGoodsPlace";
    var detailData = "goods.gbDgGoodsDetail";
    
    var rawValue = e.detail.value;

    if (e.currentTarget.dataset.type == 0) {
      var val = this._trimSpaces(rawValue);
      this.setData({
        name: val,
        [nameData]: val
      })
    }
    if (e.currentTarget.dataset.type == 1) {
      var val = this._trimSpaces(rawValue);
      var normalizedStandard = this._normalizeUnit(val);
      this.setData({
        standard: normalizedStandard,
        [standardData]: normalizedStandard
      })
    }
    if (e.currentTarget.dataset.type == 2) {
      var val = this._trimSpaces(rawValue);
      var normalizedWeight = this._normalizeUnit(val);
      this.setData({
        [standardWeightData]: normalizedWeight
      })
    }
    if (e.currentTarget.dataset.type == 3) {
      var val = this._trimSpaces(rawValue);
      this.setData({
        [brandData]: val
      })
    }
    if (e.currentTarget.dataset.type == 6) {
      var val = this._trimSpaces(rawValue);
      this.setData({
        [cartonUnitData]: val
      })
    }
    if (e.currentTarget.dataset.type == 7) {
      var val = this._trimSpaces(rawValue);
      this.setData({
        [itemsPerCartonData]: val
      })
    }
    if (e.currentTarget.dataset.type == 4) {
      var val = this._trimSpaces(rawValue);
      this.setData({
        [placeData]: val
      })
    }

    if (e.currentTarget.dataset.type == 5) {
      var val = this._trimSpaces(rawValue);
      this.setData({
        [detailData]: val
      })
    }

    this._ifCanSave();
   
   
  },

  _ifCanSave(){
    if(this.data.isGrade == 0){
      if (this.data.goods.gbDgGoodsName != null  && this.data.goods.gbDgGoodsName.length > 0  && this.data.standard != null && this.data.standard.length > 0  && this.data.fatherName != null ) {
        this.setData({
          canSave: true
        })
      }else{
        this.setData({
          canSave: false
        })
      }
    }
    if(this.data.isGrade == 1){
      if (this.data.name != null && this.data.standard != null  && this.data.fatherName != null  && this.data.goods.gbDgBuyingPriceOne > 0 
        && this.data.goods.gbDgBuyingPriceTwo > 0  && this.data.goods.gbDgBuyingPriceThree > 0 ) {
        this.setData({
          canSave: true
        })
      }else{
        this.setData({
          canSave: false
        })
      }
    }
  },

   //选择图片
   choiceImg: function (e) {
    var _this = this;
    wx.chooseImage({
      count: 1, // 最多可以选择的图片张数，默认9
      sizeType: ['original', 'compressed'], // original 原图，compressed 压缩图，默认二者都有
      sourceType: ['album', 'camera'], // album 从相册选图，camera 使用相机，默认二者都有
      success: function (res) {
        _this.setData({
          src: res.tempFilePaths,
          isSelectImg: true,
        })
      },
      fail: function () {

      },
      complete: function () {
      }
    })
  },

  delPic(){
    this.setData({
      src: ""
    })
  
  },

  saveDisGoods() {
    if (!this.data.canSave) {
      wx.showToast({
        title: '请填写必填项',
        icon: 'none',
      });
      return;
    }
    load.showLoading('保存商品');
    var filePathList = this.data.src;
    var goodsName = this.data.goods.gbDgGoodsName;
    var disId = this.data.disId;
    // 规格、重量中的空格用 "GS" 替换，统一表示
    var standard = (this.data.goods.gbDgGoodsStandardname || '').replace(/\s+/g, 'GS');
    var detail = this.data.goods.gbDgGoodsDetail;
    var standardWeight = (this.data.goods.gbDgGoodsStandardWeight || '').replace(/\s+/g, 'GS');
    var cartonUnit = this.data.goods.gbDgCartonUnit;
    var itemsPerCarton = this.data.goods.gbDgItemsPerCarton;
    var brand = this.data.goods.gbDgGoodsBrand;
    var place = this.data.goods.gbDgGoodsPlace;
    var toDepId = this.data.toDepId;
    var depId = this.data.depId;
    var depFatherId = this.data.depFatherId;
    var _this = this;
    gbDistributerGoodsApi
      .saveLinshiGoodsGb(filePathList, goodsName, standard, detail, disId, toDepId, depId, depFatherId, standardWeight, brand, place, cartonUnit, itemsPerCarton)
      .then(function (res) {
        load.hideLoading();
        var item = res.item;
        var id =
          item &&
          (item.gbDistributerGoodsId != null
            ? item.gbDistributerGoodsId
            : item.nxDistributerGoodsId);
        if (id > 0) {
          var goodsId = 'goods.gbDistributerGoodsId';
          _this.setData({
            [goodsId]: id,
          });
          var pages = getCurrentPages();
          var prevPage = pages[pages.length - 2];
          prevPage.setData({
            item: item,
            depGoods: null,
            itemDis: item,
            isSearching: false,
            show: true,
            applyStandardName: item.gbDgGoodsStandardname,
            addNewGoods: true,
          });
          wx.navigateBack({
            delta: 1,
          });
        } else {
          var msg =
            item && (item.msg || item.message)
              ? item.msg || item.message
              : typeof res.result === 'string'
                ? res.result
                : '保存失败';
          wx.showToast({
            title: String(msg).slice(0, 80),
            icon: 'none',
          });
        }
      })
      .catch(function (err) {
        load.hideLoading();
        console.error('[disAddGoods] saveLinshiGoodsGb fail', err);
        wx.showToast({
          title: (err && err.errMsg) ? String(err.errMsg).slice(0, 36) : '网络异常',
          icon: 'none',
        });
      });
  },


  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },




 




})