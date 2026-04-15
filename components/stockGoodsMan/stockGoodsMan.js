var globalData = getApp().globalData;

Component({
  properties: {
    show: {
      type: Boolean,
      value: true
    },
    item: {
      type: Object,
      value: {}
    },
    scrollViewTop: {
      type: Number,
      value: 0
    },
    windowHeight: {
      type: Number,
      value: 0
    },
    windowWidth: {
      type: Number,
      value: 0
    },
    consultItem: {
      type: Object,
      value: {}
    },
    canSure: {
      type: Boolean,
      value: true
    },
    nowTime: {
      type: String,
      value: ""
    },
    canWaste: {
      type: Boolean,
      value: false
    },
    resWeight: {
      type: String,
      value: "0"
    },
    showType: {
      type: String,
      value: ""
    },
    resultTime: {
      type: String,
      value: ""
    },
    depGoods: {
      type: Object,
      value: {}
    },
    depList: {
      type: Array,
      value: []
    }
  },

  data: {
    items: [
      { name: '3', value: '退货' },
      { name: '4', value: '废弃' },
      { name: '6', value: '转部门' }
    ],
    selectedDepIndex: -1,
    originalDepName: "",
    originalDepId: "",
    reason: "",
    src: ""
  },

  methods: {
    onDepChange(e) {
      var selectedIndex = e.detail.value;
      var selectedDep = this.data.depList[selectedIndex];

      if (selectedDep && selectedDep.gbDepartmentId === this.data.originalDepId) {
        wx.showToast({ title: '不能转给原部门', icon: 'none' });
        return;
      }

      this.setData({ selectedDepIndex: selectedIndex });
      this._checkTransferCanSure();
    },

    _checkTransferCanSure() {
      var selectedDepIndex = this.data.selectedDepIndex;
      if (selectedDepIndex >= 0 && this.data.depList && this.data.depList.length > 0) {
        this.setData({ canSure: true });
      } else {
        this.setData({ canSure: false });
      }
    },

    radioChange(e) {
      this._changeShowType(e);
    },

    _changeShowType(e) {
      var type = e.detail.value;
      var myReturnWeightData = "item.gbDgsMyReturnWeight";
      var myLossWeightData = "item.gbDgsMyLossWeight";
      this.setData({
        showType: type,
        [myReturnWeightData]: "-1",
        [myLossWeightData]: "-1",
        resWeight: 0,
        selectedDepIndex: -1,
        canSure: false
      });

      if (type == 3) {
        this.setData({ canSure: false });
      } else if (type == 4) {
        this.setData({ canSure: false });
      } else if (type == 6) {
        this.setData({ canSure: false, selectedDepIndex: 0 });
      }
    },

    getWasteWeight(e) {
      var myProduceWeightData = "item.gbDgsMyProduceWeight";
      var myWasteWeightData = "item.gbDgsMyWasteWeight";
      var restWeight = this.data.item.gbDgsRestWeight;
      var proWeight = (Number(restWeight) - Number(e.detail.value)).toFixed(1);
      if (e.detail.value.length > 0) {
        if (Number(e.detail.value) <= Number(restWeight)) {
          this.setData({
            [myProduceWeightData]: proWeight,
            canSure: true,
            [myWasteWeightData]: e.detail.value
          });
        } else {
          wx.showToast({ title: '输入不正确，不能大于剩余数量', icon: 'none' });
          this.setData({
            [myWasteWeightData]: "",
            canSure: false,
            [myProduceWeightData]: "-1"
          });
        }
      } else {
        this.setData({
          canSure: false,
          [myWasteWeightData]: "",
          [myProduceWeightData]: "-1"
        });
      }
    },

    getReturnWeight(e) {
      var myReturnWeightData = "item.gbDgsMyReturnWeight";
      var restWeight = this.data.item.gbDgsRestWeight;
      if (e.detail.value.length > 0) {
        if (Number(e.detail.value) <= Number(restWeight)) {
          this.setData({
            [myReturnWeightData]: e.detail.value,
            canSure: true
          });
        } else {
          wx.showToast({ title: '输入不正确，不能大于剩余数量', icon: 'none' });
          this.setData({
            [myReturnWeightData]: "-1",
            canSure: false
          });
        }
      } else {
        this.setData({
          [myReturnWeightData]: "-1",
          canSure: false
        });
      }
    },

    cancle() {
      this.setData({
        show: false,
        showType: 4,
        canSure: true,
        stockArr: [],
        resWeight: 0,
        reason: "",
        src: ""
      });
      this.triggerEvent('cancle');
    },

    costFocusWaste() {
      var inventoryWeight = "item.gbDgsMyWasteWeight";
      this.setData({
        [inventoryWeight]: "",
        canSure: false
      });
    },

    confirm(e) {
      var showType = this.data.showType;

      if (showType == 6) {
        if (this.data.selectedDepIndex === undefined || this.data.depList.length === 0) {
          wx.showToast({ title: '请选择目标部门', icon: 'none' });
          return;
        }
        this.triggerEvent('confirm', {
          item: this.data.item,
          showType: showType,
          stockId: this.data.item.gbDepartmentGoodsStockId,
          targetDepId: this.data.depList[this.data.selectedDepIndex].gbDepartmentId,
          targetDepName: this.data.depList[this.data.selectedDepIndex].gbDepartmentName
        });
        this.setData({
          show: false,
          showType: "3",
          canSure: false,
          selectedDepIndex: -1
        });
      } else if (this.data.canSure) {
        this.triggerEvent('confirm', {
          item: this.data.item,
          showType: showType,
          src: this.data.src,
          reason: this.data.reason
        });
        this.setData({
          show: false,
          showType: "3",
          canSure: true,
          reason: "",
          src: "",
          resWeight: "0"
        });
      } else {
        wx.showToast({ title: '请完善操作信息', icon: 'none' });
      }
    }
  },

  lifetimes: {
    attached() {
      if (this.data.item && this.data.item.gbDepartmentEntity) {
        this.setData({
          originalDepName: this.data.item.gbDepartmentEntity.gbDepartmentName,
          originalDepId: this.data.item.gbDepartmentEntity.gbDepartmentId
        });
      }
    }
  },

  observers: {
    'depList': function (depList) {},
    'item': function (item) {
      if (item && item.gbDepartmentEntity) {
        this.setData({
          originalDepName: item.gbDepartmentEntity.gbDepartmentName,
          originalDepId: item.gbDepartmentEntity.gbDepartmentId
        });
      }
    }
  }
});
