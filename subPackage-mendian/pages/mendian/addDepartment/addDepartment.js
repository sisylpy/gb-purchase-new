const app = getApp()
const globalData = app.globalData;

import {
  saveGbDepartment,
} from '../../../../services/mendian';
import {
  updateDepUserAdminGb,
} from '../../../../services/apiGbDepartmentUser';


Page({
  /**
   * 页面的初始数据
   */
  data: {
    showNumber: false,
    selNumber: 1,
    addFinished: false,
    hasSubs: 0,
    cankaoDep: 0,
    cankaoDepId: -1,
    referenceDepId: -1,
    resName:"",
    gbDepartmentEntities: [
    {
        gbDepartmentName: '',
        gbDepartmentHasSubs: 0,
        gbDepartmentSubAmount: 0,
        gbDepartmentIsGroupDep: 0,

       }
    ],
   
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      disId: options.disId,
      type: options.type,
      depLevel: 1,
    })
   
   
    var mendianInfo = wx.getStorageSync('mendianInfo');
    if(mendianInfo){
      this.setData({
        referenceDepId: mendianInfo.gbDepartmentId,
        cankaoDepId: mendianInfo.gbDepartmentId,
      })
     
    }

    var userInfo = wx.getStorageSync('userInfo');
    if(userInfo){
      this.setData({
        userInfo: userInfo,
      })
     
    }

    var disInfo = wx.getStorageSync('disInfo');
    if(disInfo){
      this.setData({
        disInfo: disInfo,
        gbDmPurchaseNumber: disInfo.gbDistributerModuleEntity.gbDmPurchaseNumber
      })
     
    }

  },


  getRestrauntName(e){
    if(e.detail.value.length > 0){
      this.setData({
        resName:  e.detail.value,
      })  
      this._ifCanSave();
    }else{
      this.setData({
        addFinished: false
      })
    }
  },
  
  radioChangeCankao(e){
    var selectedDepId = Number(e.detail.value);
    if(selectedDepId == -1 && this.data.gbDmPurchaseNumber == -1){
      wx.showToast({
        title: '无权限设置',
        icon : 'none'
      })
      // 强制刷新 radio 选中状态，恢复到"参考现有门店"
      this.setData({
        cankaoDepId: this.data.referenceDepId,
      })
      return;
    }
    this.setData({
      cankaoDepId: selectedDepId,
    })  
    this._ifCanSave();

  },

  
   radioChange: function (e) {
    this.setData({
      hasSubs: e.detail.value, 
    })  
    if(this.data.hasSubs == 0){
      this.setData({
        showNumber:false,
        depNumbers: "",
        deps: [],
      })
    }
    this._ifCanSave();

  },


  // 处理部门数量输入
  handleDepartmentNumber(e) {
    const num = parseInt(e.detail.value, 10);
    if (num > 0) {
      const departments = Array(num)
        .fill('')
        .map(() => ({
          gbDepartmentName: ''
        }));
      this.setData({
        selNumber: num,
        gbDepartmentEntities: departments,
      });
    }
    this._ifCanSave();
  },

  // 更新部门名称
  getDepartmentName(e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    const departments = this.data.gbDepartmentEntities;
    departments[index].gbDepartmentName = value;
    this.setData({
      gbDepartmentEntities: departments,
    });
  },

   /**
    * 显示几个部门
    * @param {}} e 
    */
  showDepNumbersPart(e){
    this.setData({
      showNumber: true
    })
  },

  /**
   * 选择几个部门
   * @param {*} e 
   */
  selIndex(e){
    var num = Number(e.currentTarget.dataset.index) + 1;
    var resArr = [];
    for(var i = 0; i < num; i++) {
         var res = {
           gbDepartmentName: null,
           gbDepartmentHasSubs: 0,
           gbDepartmentSubAmount: 0,
           gbDepartmentIsGroupDep: 0,

          };
          resArr.push(res);
    }
    
    this.setData({
      depNumbers: num,
      showNumber: false,
      gbDepartmentEntities: resArr
    })

  },

  selDepartment(e){
    var index = e.currentTarget.dataset.index;
    var dep = this.data.mendianArr[index]; 
    this.setData({
      cankaoDep: dep,
      showNumber: false,
    })
    this._ifCanSave();

  },

  getDepartmentName(e){
    var index = e.currentTarget.dataset.index;
    var name = e.detail.value;
    var depNameData = "gbDepartmentEntities["+index+"].gbDepartmentName"
    this.setData({
      [depNameData]: name,
    })  
    this._ifCanSave();


  },
 

  /**
   * 检查可下一步状态
   */
   _ifCanSave(){
     if(!String(this.data.resName || '').trim()){
       this.setData({ addFinished: false });
       return;
     }

     // 参考门店时，子部门完全由后端复制，不校验也不提交页面中的占位部门。
     if(Number(this.data.cankaoDepId) > 0){
       this.setData({ addFinished: true });
       return;
     }

     var arr = this.data.gbDepartmentEntities || [];
     var allNamed = arr.length == this.data.selNumber && arr.every(function(item){
       return item && String(item.gbDepartmentName || '').trim().length > 0;
     });
     this.setData({ addFinished: allNamed });
    
   },

  
  hideNumber(){
    if(this.data.showNumber){
      this.setData({
        showNumber: false
      })
    }
  },

  clickConfirm(e){
      this.setData({
        focusIndex: e.currentTarget.dataset.index + 1,
      })
  },

  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  },

  saveDepartment(){
    var that = this;
    var useReferenceStore = Number(this.data.cankaoDepId) > 0;
    var departmentEntities = useReferenceStore ? [] : (this.data.gbDepartmentEntities || []).filter(function(item){
      return item && String(item.gbDepartmentName || '').trim().length > 0;
    }).map(function(item){
      return Object.assign({}, item, {
        gbDepartmentName: String(item.gbDepartmentName).trim()
      });
    });
    var  dep = {
      gbDepartmentDisId: this.data.disId,
      gbDepartmentFatherId: 0,
      gbDepartmentName: this.data.resName,
      gbDepartmentSubAmount: departmentEntities.length,
      gbDepartmentIsGroupDep: 1,
      gbDepartmentType: 1,
      cankaoDepId: Number(this.data.cankaoDepId),
      fatherGoodsIds: "",
      gbDepartmentEntityList: departmentEntities
      }
      wx.showLoading({ title: "保存新店铺" });
      saveGbDepartment(dep)
      .then(res =>{
        wx.hideLoading();
        if(res.result.code == 0){

          that._updateDepUserInfo()
          wx.setStorageSync('disInfo', res.result.data);
          var pages = getCurrentPages();
          var prevPagePre = pages[pages.length - 3];
          prevPagePre.setData({
            disInfo: res.result.data,
            update: true
          })
          var prevPage = pages[pages.length - 2]; //上一个页面
          //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
          prevPage.setData({
            disInfo: res.result.data,
            update: true
          })
          
          wx.navigateBack({
            delta: 1,
          })
      
        }
      })

  },


_updateDepUserInfo(index){
  var item = this.data.userInfo;
  updateDepUserAdminGb(item).then(res =>{
    if(res.result.code == 0){
    
      wx.setStorageSync('userInfo', res.result.data.userInfo);
      wx.setStorageSync('disInfo', res.result.data.disInfo);
      wx.navigateBack({delta: 2})
    }
  })

},

  








  
})
