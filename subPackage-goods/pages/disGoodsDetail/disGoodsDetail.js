var dateUtils = require('../../../lib/dateUtil.js');
var goodsApi = require('../../services/api.js');

const globalData = getApp().globalData;
var config = require('../../../config/index.js');
var load = require('../../../lib/load.js');

Page({

  onShow() {
     // 推荐直接用新API
     let windowInfo = wx.getWindowInfo();
     let globalData = getApp().globalData;
     this.setData({
       windowWidth: windowInfo.windowWidth * globalData.rpxR,
       windowHeight: windowInfo.windowHeight * globalData.rpxR,
       navBarHeight: globalData.navBarHeight * globalData.rpxR,
     });

    this._getGoodsDetail();
  },

  /**
   * 页面的初始数据
   */
  data: {

    purDepArr: [],
    supplierArr: [],
    nxDistributerList: [],
    canSave: true,
    nxGoodsId: -1,
    supplierId: -1,
    // items:[
    //   {
    //     name: '2',
    //     value: '集采',
    //     checked: ""
    //   },


    // ],
    items: [{
        name: '1',
        value: '自采',
        checked: ""
      },

      {
        name: '21',
        value: '自动订货',
        checked: ""
      }
    
     
    ],
    itemsSupplier: [{
        name: '2',
        value: '集采',
        checked: ""
      },
      {
        name: '21',
        value: '自动订货',
        checked: ""
      },
    ]

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      url: config.server,
      disGoodsId: options.id,
    })
    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo
      })
    }

    var value = wx.getStorageSync('disInfo');
    if (value) {
      this.setData({
        disId: value.gbDistributerId,
        disInfo: value,
      })
    }
    var mendianInfo = wx.getStorageSync('mendianInfo');
    if (mendianInfo) {
      this.setData({
        purDepId: mendianInfo.gbDepartmentId,
      })
    }
    var value = wx.getStorageSync('disGoods');
    if (value) {
      this.setData({
        goods: value
      })
      if (value.gbDepartmentEntity !== null) {
        this.setData({
          toDepInfo: value.gbDepartmentEntity,
          gbDepId: value.gbDgGbDepartmentId,
          nxDisId: value.gbDgNxDistributerId,
        })
        this._showWhichType(this.data.toDepInfo.gbDepartmentType);
      } else {
        this.setData({
          toDepInfo: null
        })
      }
    }

    // this._getSupplier();

  },

  _getGoodsDetail() {
    load.showLoading("获取商品信息")
    goodsApi.gbDisGetGoodsDetail(this.data.disGoodsId).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {this.setData({
          goods: res.result.data.goodsInfo,
        })
      } else {
        wx.showToast({
          title: res.result.msg,
        })

      }

    })
  },


  _getSupplier() {
    var that = this;
    goodsApi.gbDisGetAllNxDistributerAndSupplier(this.data.disId).then(res => {
      if (res.result.code == 0) {
        that.setData({
          nxDistributerList: res.result.data.nx,
          supplierArr: res.result.data.supplier,
        })
        if (that.data.nxDistributerList.length > 0) {
          if (that.data.toDepInfo !== null) {
            if (that.data.toDepInfo.gbDepartmentType == 5) {
              var nxDisId = this.data.goods.gbDgNxDistributerId;
              for (var i = 0; i < this.data.nxDistributerList.length; i++) {
                var id = this.data.nxDistributerList[i].nxDgdNxDistributerId;
                if (nxDisId == id) {
                  var data = "nxDistributerList[" + i + "]isSelected";
                  this.setData({
                    [data]: true,
                  })
                }
              }
            } else {
              var data = "nxDistributerList[0].isSelected";
              that.setData({
                [data]: true,
              })
            }
            // 

            if (that.data.toDepInfo.gbDepartmentType == 2 && this.data.goods.gbDgGbSupplierId !== null) {
              var nxDisId = this.data.goods.gbDgGbSupplierId;
              for (var i = 0; i < this.data.supplierArr.length; i++) {
                var id = this.data.supplierArr[i].nxJrdhSupplierId;
                if (nxDisId == id) {
                  var data = "supplierArr[" + i + "]isSelected";
                  this.setData({
                    [data]: true,
                  })
                }
              }
            } else {
              var data = "supplierArr[0].isSelected";
              that.setData({
                [data]: true,
              })
            }


          }
        }
      }
    })

  },



  _getItems(what) {
    var disModuel = this.data.disInfo.gbDistributerModuleEntity;
    var items = [];
    if (this.data.purDepArr.length > 0) {
      var store = disModuel.gbDmPurchaseNumber;
      if (store == 0) {
        if (what == 2) {
          var item = {
            name: '2',
            value: '集采',
            checked: true,
          };
        } else {
          var item = {
            name: '2',
            value: '集采',
            checked: false,
          };
        }
        items.push(item);
      }

    }
    if (this.data.sotckDepArr.length > 0) {
      var stock = disModuel.gbDmStockNumber;
      if (stock == 0) {
        if (what == 3) {
          var item = {
            name: '3',
            value: '库存',
            checked: true
          };
        } else {
          var item = {
            name: '3',
            value: '库存',
            checked: false
          };
        }

        items.push(item);
      }

    }
    if (this.data.kitchenDepArr.length > 0) {
      var kitchen = disModuel.gbDmCentralKitchenNumber;
      if (kitchen == 0) {
        if (what == 4) {
          var item = {
            name: '4',
            value: '中央厨房',
            checked: true
          };
        } else {
          var item = {
            name: '4',
            value: '中央厨房',
            checked: false
          };
        }

        items.push(item);
      }
    }
    if (this.data.nxDistributerList.length > 0) {
      var appSupplier = this.data.disInfo.appSupplierDepartment;
      if (appSupplier !== null) {
        if (what == 5) {
          var item = {
            name: '5',
            value: '配送商',
            checked: true
          };
        } else {
          var item = {
            name: '5',
            value: '配送商',
            checked: false
          };
        }
        items.push(item);
      }
    } else {
      if (this.data.disInfo.appSupplierDepartment !== null) {
        var item = {
          name: '5',
          value: '配送商',
          checked: false
        };
        items.push(item);
      }
    }


    if (this.data.disInfo.gbDistributerBusinessType < 20 && this.data.disInfo.mendianDepartmentList.length > 1) {
      var item = {
        name: '1',
        value: '自采',
      };

      items.push(item);
    }
    this.setData({
      items: items,
    })
  },

  _showWhichType(value) {
    if (value == 2) {
      this.setData({
        showPurDeps: true,
        showSupplier: false,
      })
    }

    if (value == 21) {
      this.setData({
        showPurDeps: false,
        showSupplier: true,
      })
    }
    if (value == 5) {
      this.setData({
        showPurDeps: false,
        showSupplier: false,
      })
    }

  },



  _getGoodsShowDeps() {
    if (this.data.toDepInfo !== null) {
      var toDep = this.data.toDepInfo;
      var toDepId = toDep.gbDepartmentId;
      //如果是自采
      if (toDep.gbDepartmentType == 1) {
        this.setData({
          showPurDeps: false,
        })
      }
      //如果是集采
      if (toDep.gbDepartmentType == 2) {
        var purTemp = this.data.disInfo.mendianDepartmentList;
        for (var i = 0; i < purTemp.length; i++) {
          var id = purTemp[i].gbDepartmentId;
          if (toDepId == id) {
            purTemp[i].isSelected = true;
          }
        }
        var stockTemp = this.data.disInfo.stockDepartmentList;
        if (stockTemp.length > 0) {
          stockTemp[0].isSelected = true;
        }
        var kitchenTemp = this.data.disInfo.kitchenDepartmentList;
        if (kitchenTemp.length > 0) {
          kitchenTemp[0].isSelected = true;
        }

        this.setData({
          purDepArr: purTemp,
          sotckDepArr: stockTemp,
          kitchenDepArr: kitchenTemp,

        })
      }

      //如果是库房
      if (toDep.gbDepartmentType == 3) {
        var stockTemp = this.data.disInfo.stockDepartmentList;
        for (var i = 0; i < stockTemp.length; i++) {
          var id = stockTemp[i].gbDepartmentId;
          if (toDepId == id) {
            stockTemp[i].isSelected = true;
          }
        }
        var purTemp = this.data.disInfo.mendianDepartmentList;
        if (purTemp.length > 0) {
          purTemp[0].isSelected = true;
        }
        var kitchenTemp = this.data.disInfo.kitchenDepartmentList;
        if (kitchenTemp.length > 0) {
          kitchenTemp[0].isSelected = true;
        }

        this.setData({
          purDepArr: purTemp,
          sotckDepArr: stockTemp,
          kitchenDepArr: kitchenTemp,
        })
      }
      //如果是配送
      if (toDep.gbDepartmentType == 4) {
        var kitchenTemp = this.data.disInfo.kitchenDepartmentList;for (var i = 0; i < kitchenTemp.length; i++) {
          var id = kitchenTemp[i].gbDepartmentId;
          if (toDepId == id) {
            kitchenTemp[i].isSelected = true;
          }
        }
        var purTemp = this.data.disInfo.mendianDepartmentList;
        if (purTemp.length > 0) {
          purTemp[0].isSelected = true;
        }
        var stockTemp = this.data.disInfo.stockDepartmentList;
        if (stockTemp.length > 0) {
          stockTemp[0].isSelected = true;
        }

        this.setData({
          purDepArr: purTemp,
          sotckDepArr: stockTemp,
          kitchenDepArr: kitchenTemp,
        })
      }
      //如果是配送
      if (toDep.gbDepartmentType == 5) {
        var nxDistributerListTemp = this.data.nxDistributerList;
        if (nxDistributerListTemp.length > 0) {var nxDisId = this.data.nxDisId;

          for (var i = 0; i < nxDistributerListTemp.length; i++) {
            var id = nxDistributerListTemp[i].nxDgdNxDistributerId;
            if (nxDisId == id) {
              nxDgdNxDistributerId[i].isSelected = true;
            }
          }
          var purTemp = this.data.disInfo.mendianDepartmentList;
          if (purTemp.length > 0) {
            purTemp[0].isSelected = true;
          }
          var stockTemp = this.data.disInfo.stockDepartmentList;
          if (stockTemp.length > 0) {
            stockTemp[0].isSelected = true;
          }
          var kitchenTemp = this.data.disInfo.kitchenDepartmentList;
          if (kitchenTemp.length > 0) {
            kitchenTemp[0].isSelected = true;
          }

          this.setData({
            purDepArr: purTemp,
            sotckDepArr: stockTemp,
            kitchenDepArr: kitchenTemp,
          })
        }

      }
    } else {
      this._getNoToDepartmentSetDeps();
    }
  },

  _getNoToDepartmentSetDeps() {var disInfo = this.data.disInfo;
    var purTemp = disInfo.mendianDepartmentList;
    var stockTemp = disInfo.stockDepartmentList;
    var kitchenTemp = disInfo.kitchenDepartmentList;
    if (purTemp.length > 0) {
      for (var i = 0; i < purTemp.length; i++) {
        if (i == 0) {
          purTemp[i].isSelected = true;
        } else {
          purTemp[i].isSelected = false;
        }
      }
      this.setData({
        purDepArr: purTemp,
      })
    } else {
      this.setData({
        purDepArr: [],
      })
    }

    if (stockTemp.length > 0) {
      for (var i = 0; i < stockTemp.length; i++) {if (i == 0) {
          stockTemp[i].isSelected = true;
        } else {
          stockTemp[i].isSelected = false;
        }
      }
      this.setData({
        sotckDepArr: stockTemp,
      })


    } else {
      this.setData({
        sotckDepArr: []
      })
    }
    if (kitchenTemp.length > 0) {
      for (var i = 0; i < kitchenTemp.length; i++) {
        if (i == 0) {
          kitchenTemp[i].isSelected = true;
        } else {
          kitchenTemp[i].isSelected = false;
        }
      }
      this.setData({
        kitchenDepArr: kitchenTemp,
      })
    } else {
      this.setData({
        kitchenDepArr: [],
      })
    }
    // if (nxDistributerList.length > 0) {
    //   for (var i = 0; i < nxDistributerList.length; i++) {
    //     if (i == 0) {
    //       nxDistributerList[i].isSelected = true;
    //     } else {
    //       nxDistributerList[i].isSelected = false;
    //     }
    //   }
    //   this.setData({
    //     kitchenDepArr: kitchenTemp,
    //   })
    // } else {
    //   this.setData({
    //     kitchenDepArr: [],
    //   })
    // }

  },


  getComGoodsContent(e) {if (e.currentTarget.dataset.type == 0 && e.detail.value.length > 0) {
      var name = "goods.gbDgGoodsName";
      this.setData({
        [name]: e.detail.value
      })
    }
    if (e.currentTarget.dataset.type == 1 && e.detail.value.length > 0) {
      var standard = "goods.gbDgGoodsStandardname";
      this.setData({
        [standard]: e.detail.value
      })

    }
    if (e.currentTarget.dataset.type == 2) {
      var standardWeight = "goods.gbDgGoodsStandardWeight";
      this.setData({
        [standardWeight]: e.detail.value
      })

    }
    if (e.currentTarget.dataset.type == 3) {
      var brand = "goods.gbDgGoodsBrand";
      if (e.detail.value.length > 0) {
        this.setData({
          [brand]: e.detail.value
        })
      } else {
        this.setData({
          [brand]: null
        })
      }

    }
    if (e.currentTarget.dataset.type == 4) {
      var place = "goods.gbDgGoodsPlace";
      if (e.detail.value.length > 0) {
        this.setData({
          [place]: e.detail.value
        })
      } else {
        this.setData({
          [place]: null
        })
      }
    }
    if (e.currentTarget.dataset.type == 5) {
      var detail = "goods.gbDgGoodsDetail";
      if (e.detail.value.length > 0) {
        this.setData({
          [detail]: e.detail.value
        })
      } else {
        this.setData({
          [detail]: null
        })
      }
    }
    if (e.currentTarget.dataset.type == 6) {
      var sellingPrice = "goods.gbDgSellingPrice";
      if (e.detail.value.length > 0) {this.setData({
          [sellingPrice]: e.detail.value
        })} else {
        this.setData({
          [sellingPrice]: ""
        })
      }
    }
    if (e.currentTarget.dataset.type == 7) {
      var cartonUnit = "goods.gbDgCartonUnit";
      if (e.detail.value.length > 0) {
        this.setData({
          [cartonUnit]: e.detail.value
        })
      } else {
        this.setData({
          [cartonUnit]: null
        })
      }
    }
    if (e.currentTarget.dataset.type == 8) {
      var itemsPerCarton = "goods.gbDgItemsPerCarton";
      if (e.detail.value.length > 0) {
        this.setData({
          [itemsPerCarton]: e.detail.value
        })
      } else {
        this.setData({
          [itemsPerCarton]: null
        })
      }
    }
    this._ifCanSave();

  },

  radioChange(e) {var type = e.detail.value;var typeData = "goods.gbDgGoodsType";
    this.setData({
      [typeData]: type
    })


    if (type == "2") {

      this.setData({
        gbDepId: this.data.purDepId,
        showPurDeps: true,
        showSupplier: false,
        nxGoodsId: -1,
        supplierId: -1

      })

    } else if (type == "21") {

      this.setData({
        gbDepId: this.data.purDepId,
        showPurDeps: false,
        showSupplier: true,
      })
    }
    
    this._ifCanSave();

  },

  
  selectItem(e) {
    var index = e.currentTarget.dataset.index;
    var goodsData = "goods.gbDgGbDepartmentId"
    this.setData({
      gbDepId: e.currentTarget.dataset.id,
      [goodsData]: e.currentTarget.dataset.id,
    })
    if (this.data.showPurDeps) {
      for (var i = 0; i < this.data.purDepArr.length; i++) {
        var selItemData = "purDepArr[" + i + "].isSelected";
        if (i == index) {
          this.setData({
            [selItemData]: true,
            gbDepId: this.data.purDepArr[i].gbDepartmentId,
            [goodsData]: this.data.purDepArr[i].gbDepartmentId,
            nxDisId: -1,
            nxGoodsId: -1,
          })
        } else {
          this.setData({
            [selItemData]: false,
          })
        }
      }
    }
    if (this.data.showStockDeps) {
      for (var i = 0; i < this.data.sotckDepArr.length; i++) {
        var selItemData = "sotckDepArr[" + i + "].isSelected";
        if (i == index) {
          this.setData({
            [selItemData]: true,
            gbDepId: this.data.sotckDepArr[i].gbDepartmentId,
            nxDisId: -1,
            nxGoodsId: -1,
            [goodsData]: this.data.sotckDepArr[i].gbDepartmentId,

          })
        } else {
          this.setData({
            [selItemData]: false,
          })
        }
      }
    }
    if (this.data.showKitchenDeps) {
      for (var i = 0; i < this.data.kitchenDepArr.length; i++) {
        var selItemData = "kitchenDepArr[" + i + "].isSelected";
        if (i == index) {
          this.setData({
            [selItemData]: true,
            gbDepId: this.data.kitchenDepArr[i].gbDepartmentId,
            nxDisId: -1,
            nxGoodsId: -1,
            [goodsData]: this.data.kitchenDepArr[i].gbDepartmentId,
          })
        } else {
          this.setData({
            [selItemData]: false,
          })
        }
      }
    }
   
  },



  toSupplier() {
    wx.navigateTo({
      url: '../appointSupplierList/appointSupplierList?purDepId=' + this.data.gbDepId,
    })
  },


  updateComGoods(e) {
    if (this.data.canSave) {
      var goods = this.data.goods;
      goods.gbDgGbDepartmentId = this.data.gbDepId;
      goods.gbDgNxDistributerId = this.data.nxDisId;
      goods.gbDgNxDistributerGoodsId = this.data.nxGoodsId;
      goods.gbDgGbSupplierId = this.data.supplierId;
      load.showLoading("保存商品");
      goodsApi.disUpdateDisGoodsGb(goods).then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          let pages = getCurrentPages();
        
          let prevPageT = pages[pages.length - 2];
          prevPageT.setData({
            update: true
          })
       
          wx.navigateBack({
            delta: 1,
          })
        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
      })
    } else {
      wx.showToast({
        title: '请检查必填内容',
        icon: 'none'
      })
    }


  },


  _ifCanSave() {var goodsName = this.data.goods.gbDgGoodsName;
    var standard = this.data.goods.gbDgGoodsStandardname;
    var type = this.data.goods.gbDgGoodsType;
    if (goodsName.length > 0 && standard.length > 0) {
      if (type == 21) {if (this.data.goods.gbDgGbSupplierId == -1 || this.data.goods.gbDgGbSupplierId == null) {
          this.setData({
            canSave: false
          })
        }} else if (type == 5) {

        if (this.data.goods.gbDgNxDistributerId == -1) {
          this.setData({
            canSave: false
          })
        }

      } else {
        this.setData({
          canSave: true
        })
      }

    } else {
      this.setData({
        canSave: false
      })
    }
  },

  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },



  // onUnload() {
  //   wx.removeStorageSync('disGoods')
  // }



})