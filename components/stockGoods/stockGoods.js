const app = getApp();
var stockUnit = require('../../lib/stockUnitConvert.js');

var LOSS_REASONS = ['自然损耗', '加工损耗', '过称误差', '其他'];

Component({
  properties: {
    show: { type: Boolean, value: false },
    item: { type: Object, value: { gbDgsStars: 3 } },
    consultItem: { type: Object, value: null },
    depGoods: { type: Object, value: null },
    modalHeight: { type: Number, value: 0 },
    scrollViewTop: { type: Number, value: 0 },
    windowHeight: { type: Number, value: 0 },
    windowWidth: { type: Number, value: 0 },
    canSure: { type: Boolean, value: true },
    nowTime: { type: String, value: '' },
    canWaste: { type: Boolean, value: false },
    resWeight: { type: String, value: '0' },
    showType: { type: String, value: '1' },
    resultTime: { type: String, value: '' },
    stockBatchIndex: { type: Number, value: 0 },
  },

  data: {
    minUnitOptions: stockUnit.MIN_UNIT_OPTIONS,
    keyboardOffset: 0,
    inputAmountMin: '',
    stockMinUnit: 'g',
    stockMinUnitIndex: 1,
    packUnit: '',
    packQtyInMin: 0,
    canPickUnit: false,
    useMinUnit: false,
    restPack: 0,
    restMin: 0,
    stockPackLabel: '',
    stockRestLabel: '',
    equivPackText: '',
    calcUseMin: '',
    calcRestPack: '',
    calcRestMin: '',
    goodsImg: '',
    lossReasons: LOSS_REASONS,
    lossReasonIndex: 1,
    reason: '',
    src: '',
  },

  observers: {
    show: function (show) {
      if (show) {
        this._initUnitContext();
        this.setData({ keyboardOffset: 0 });
      }
    },
    'depGoods, item': function () {
      if (this.data.show) {
        this._initUnitContext();
      }
    },
  },

  methods: {
    _getGoodsEntity() {
      var item = this.data.item || {};
      var dep = this.data.depGoods || {};
      return item.gbDistributerGoodsEntity || dep.gbDistributerGoodsEntity || {};
    },

    _initUnitContext() {
      var ctx = stockUnit.buildStockUnitContext(this.data.depGoods, this.data.item);
      var restLabel = ctx.useMin
        ? (stockUnit.trimAmount(ctx.restPack, 4) + ctx.packUnit
          + ' ≈ ' + stockUnit.formatDisplayAmount(ctx.restMin, ctx.minUnit) + ctx.minUnit)
        : (stockUnit.trimAmount(ctx.restPack, 4) + ctx.packUnit);
      var entity = ctx.entity;
      var img = entity.gbDgNxFatherImg || entity.gbDgGoodsFile || entity.gbDgGoodsFileImg || '';
      if (img && String(img).indexOf('http') !== 0) {
        var base = (app.globalData && app.globalData.server) || '';
        img = base + img;
      }
      var unitOpts = ctx.unitPickerOptions || stockUnit.MIN_UNIT_OPTIONS;
      var displayUnit = ctx.packUnit || ctx.minUnit;
      var idx = unitOpts.indexOf(displayUnit);
      if (idx < 0) idx = 0;
      this.setData({
        packUnit: ctx.packUnit,
        packQtyInMin: ctx.packQtyInMin,
        canPickUnit: ctx.canPickUnit,
        useMinUnit: false,
        minUnitOptions: unitOpts,
        restPack: ctx.restPack,
        restMin: ctx.restMin,
        stockPackLabel: ctx.packLabel,
        stockRestLabel: restLabel,
        stockMinUnit: displayUnit,
        stockMinUnitIndex: idx,
        goodsImg: img,
        inputAmountMin: String(this.data.showType) === '1' ? this._normalUseDefaultInput() : '',
        equivPackText: '',
        calcUseMin: '',
        calcRestPack: '',
        calcRestMin: '',
      }, () => {
        if (String(this.data.showType) === '4' && this.data.canWaste) {
          this._maybePrefillWasteAmount(true);
        } else if (String(this.data.showType) === '1') {
          this._maybePrefillNormalUseAmount(true);
        } else {
          this._recalcByShowType();
        }
      });
    },

    _wasteDefaultInput(ctx) {
      ctx = ctx || this._ctxSnapshot();
      if (ctx.useMin) {
        return stockUnit.formatDisplayAmount(ctx.restMin, ctx.minUnit);
      }
      return stockUnit.trimAmount(ctx.restPack, 4);
    },

    /** 正常使用（盘点后剩余量）默认填 0，表示默认全部用完 */
    _normalUseDefaultInput() {
      return '0';
    },

    _maybePrefillNormalUseAmount(force) {
      if (String(this.data.showType) !== '1') return;
      if (!force && this.data.inputAmountMin) return;
      this.setData({ inputAmountMin: this._normalUseDefaultInput() }, () => this._recalcNormalUse());
    },

    _maybePrefillWasteAmount(force) {
      if (String(this.data.showType) !== '4' || !this.data.canWaste) return;
      if (!force && this.data.inputAmountMin) return;
      var amount = this._wasteDefaultInput();
      if (!amount || amount === '0') return;
      this.setData({ inputAmountMin: amount }, () => this._recalcDirectUse());
    },

    _recalcByShowType() {
      var showType = String(this.data.showType);
      if (showType === '1') {
        this._recalcNormalUse();
      } else if (showType === '2' || showType === '3' || showType === '4' || showType === '6') {
        this._recalcDirectUse();
      }
    },

    _recalcNormalUse() {
      var inputMin = parseFloat(this.data.inputAmountMin);
      var ctx = this._ctxSnapshot();
      if (!this.data.inputAmountMin || isNaN(inputMin)) {
        this.setData({
          equivPackText: '',
          calcUseMin: '',
          calcRestPack: '',
          calcRestMin: '',
          canSure: false,
        });
        return;
      }
      if (ctx.useMin && inputMin >= ctx.restMin) {
        wx.showToast({ title: '不能大于或等于剩余数量', icon: 'none' });
        this.setData({ canSure: false });
        return;
      }
      if (!ctx.useMin && inputMin >= ctx.restPack) {
        wx.showToast({ title: '不能大于或等于剩余数量', icon: 'none' });
        this.setData({ canSure: false });
        return;
      }
      var remainPack = ctx.useMin
        ? stockUnit.minToPack(inputMin, ctx.packQtyInMin)
        : inputMin;
      var usePack = parseFloat((ctx.restPack - remainPack).toFixed(8));
      if (usePack < 0) {
        this.setData({ canSure: false });
        return;
      }
      var useMin = ctx.useMin ? (ctx.restMin - inputMin) : usePack;
      var myProduce = stockUnit.trimAmount(usePack, 4);
      var remainPackStr = stockUnit.trimAmount(remainPack, 8);
      this.setData({
        equivPackText: ctx.useMin
          ? ('折合：' + stockUnit.trimAmount(remainPack, 4) + ctx.packUnit)
          : '',
        calcUseMin: ctx.useMin
          ? (stockUnit.formatDisplayAmount(useMin, ctx.minUnit) + ctx.minUnit
            + ' ≈ ' + stockUnit.trimAmount(usePack, 4) + ctx.packUnit)
          : (myProduce + ctx.packUnit),
        calcRestPack: stockUnit.trimAmount(remainPack, 4) + ctx.packUnit,
        calcRestMin: ctx.useMin
          ? ('≈ ' + stockUnit.formatDisplayAmount(inputMin, ctx.minUnit) + ctx.minUnit)
          : '',
        resWeight: remainPackStr,
        canSure: true,
      });
      var itemData = 'item.gbDgsMyProduceWeight';
      this.setData({ [itemData]: myProduce });
    },

    _recalcDirectUse() {
      var inputMin = parseFloat(this.data.inputAmountMin);
      var ctx = this._ctxSnapshot();
      var showType = String(this.data.showType);
      if (!this.data.inputAmountMin || isNaN(inputMin) || inputMin <= 0) {
        this.setData({
          equivPackText: '',
          calcRestPack: '',
          calcRestMin: '',
          canSure: false,
        });
        this._clearDirectWeight();
        return;
      }
      var amountPack = ctx.useMin
        ? stockUnit.minToPack(inputMin, ctx.packQtyInMin)
        : inputMin;
      if (amountPack > ctx.restPack) {
        wx.showToast({ title: '不能大于剩余数量', icon: 'none' });
        this.setData({ canSure: false });
        this._clearDirectWeight();
        return;
      }
      var restAfterPack = parseFloat((ctx.restPack - amountPack).toFixed(8));
      var restAfterMin = ctx.useMin
        ? (ctx.restMin - inputMin)
        : restAfterPack;
      var amountPackStr = stockUnit.trimAmount(amountPack, 8);
      var patch = {
        equivPackText: ctx.useMin
          ? ('折合：' + stockUnit.trimAmount(amountPack, 4) + ctx.packUnit)
          : '',
        calcRestPack: stockUnit.trimAmount(restAfterPack, 4) + ctx.packUnit,
        calcRestMin: ctx.useMin
          ? ('≈ ' + stockUnit.formatDisplayAmount(restAfterMin, ctx.minUnit) + ctx.minUnit)
          : '',
        canSure: showType === '2' ? !!this._lossFormReady() : true,
      };
      if (showType === '2') {
        patch['item.gbDgsMyLossWeight'] = amountPackStr;
      } else if (showType === '3') {
        patch['item.gbDgsMyReturnWeight'] = amountPackStr;
      } else if (showType === '4') {
        patch['item.gbDgsMyWasteWeight'] = amountPackStr;
        var proPack = parseFloat((ctx.restPack - amountPack).toFixed(8));
        patch['item.gbDgsMyProduceWeight'] = stockUnit.trimAmount(proPack, 4);
      } else if (showType === '6') {
        patch['item.gbDgsMyEmployeeMealWeight'] = amountPackStr;
      }
      this.setData(patch);
    },

    _clearDirectWeight() {
      this.setData({
        'item.gbDgsMyLossWeight': '-1',
        'item.gbDgsMyReturnWeight': '-1',
        'item.gbDgsMyWasteWeight': '-1',
        'item.gbDgsMyEmployeeMealWeight': '-1',
      });
    },

    _lossFormReady() {
      var w = this.data.item && this.data.item.gbDgsMyLossWeight;
      if (!w || w === '-1' || parseFloat(w) <= 0) return false;
      if (this.data.lossReasonIndex === 3) {
        return !!(this.data.reason && String(this.data.reason).trim());
      }
      return true;
    },

    _ctxSnapshot() {
      return {
        packUnit: this.data.packUnit,
        packQtyInMin: this.data.packQtyInMin,
        useMin: this.data.useMinUnit,
        restPack: this.data.restPack,
        restMin: this.data.restMin,
        minUnit: this.data.stockMinUnit,
      };
    },

    onTabSelect(e) {
      var type = e.currentTarget.dataset.type;
      if (String(type) === String(this.data.showType)) return;
      this._applyShowType(type);
    },

    _applyShowType(type) {
      var typeStr = String(type);
      var item = this.data.item || {};
      var patch = {
        showType: typeStr,
        inputAmountMin: typeStr === '1' ? this._normalUseDefaultInput() : '',
        equivPackText: '',
        calcUseMin: '',
        calcRestPack: '',
        calcRestMin: '',
        resWeight: '0',
        reason: '',
        src: '',
        canSure: false,
        lossReasonIndex: 1,
        'item.gbDgsMyLossWeight': '-1',
        'item.gbDgsMyReturnWeight': '-1',
        'item.gbDgsMyWasteWeight': '-1',
        'item.gbDgsMyEmployeeMealWeight': '-1',
        'item.gbDgsMyProduceWeight': typeStr === '1' ? item.gbDgsRestWeight : '0',
      };
      if (typeStr === '4' && !this.data.canWaste) {
        patch.canSure = false;
      }
      this.setData(patch, () => {
        if (typeStr === '4' && this.data.canWaste) {
          this._maybePrefillWasteAmount(true);
        } else if (typeStr === '1') {
          this._maybePrefillNormalUseAmount(true);
        }
      });
    },

    radioChange(e) {
      this._applyShowType(e.detail.value);
    },

    onAmountInput(e) {
      this.setData({ inputAmountMin: e.detail.value }, () => {
        this._recalcByShowType();
      });
    },

    onInputFocus(e) {
      var h = (e.detail && e.detail.height) || 0;
      this.setData({ keyboardOffset: h });
    },

    onInputBlur() {
      this.setData({ keyboardOffset: 0 });
    },

    onMinUnitChange(e) {
      var idx = parseInt(e.detail.value, 10) || 0;
      var opts = this.data.minUnitOptions || stockUnit.MIN_UNIT_OPTIONS;
      var unit = opts[idx] || 'g';
      var entity = this._getGoodsEntity();
      var packUnit = this.data.packUnit;
      var pq = stockUnit.resolvePackQtyInMin(packUnit, unit, entity);
      var restPack = this.data.restPack;
      var useMin = pq > 0 && unit !== packUnit;
      var canPick = pq > 0;
      var restMin = useMin ? stockUnit.packToMin(restPack, pq) : restPack;
      this.setData({
        stockMinUnitIndex: idx,
        stockMinUnit: unit,
        packQtyInMin: pq,
        canPickUnit: canPick,
        useMinUnit: useMin,
        restMin: restMin,
        stockRestLabel: useMin
          ? (stockUnit.trimAmount(restPack, 4) + packUnit
            + ' ≈ ' + stockUnit.formatDisplayAmount(restMin, unit) + unit)
          : (stockUnit.trimAmount(restPack, 4) + packUnit),
      }, () => this._recalcByShowType());
    },

    onLossReasonTap(e) {
      var idx = parseInt(e.currentTarget.dataset.index, 10) || 0;
      var patch = { lossReasonIndex: idx };
      if (idx !== 3) patch.reason = '';
      this.setData(patch, () => this._recalcDirectUse());
    },

    getLossReason(e) {
      this.setData({ reason: e.detail.value }, () => this._recalcDirectUse());
    },

    choiceImg() {
      var that = this;
      wx.chooseImage({
        count: 1,
        sizeType: ['original', 'compressed'],
        sourceType: ['album', 'camera'],
        success(res) {
          that.setData({ src: res.tempFilePaths }, () => that._recalcDirectUse());
        },
      });
    },

    delPic() {
      this.setData({ src: '' }, () => this._recalcDirectUse());
    },

    cancle() {
      this.setData({
        show: false,
        showType: '1',
        canSure: true,
        resWeight: '0',
        reason: '',
        src: '',
        inputAmountMin: '',
        keyboardOffset: 0,
      });
      this.triggerEvent('cancle');
    },

    confirm() {
      if (!this.data.canSure) return;
      var reason = this.data.reason;
      if (String(this.data.showType) === '2') {
        var lr = LOSS_REASONS[this.data.lossReasonIndex] || '';
        reason = reason ? (lr + '：' + reason) : lr;
      }
      this.triggerEvent('confirm', {
        item: this.data.item,
        showType: this.data.showType,
        src: this.data.src,
        reason: reason,
      });
      this.setData({
        show: false,
        showType: '1',
        canSure: true,
        reason: '',
        src: '',
        resWeight: '0',
        inputAmountMin: '',
      });
    },

    stopTap() {},
  },
});
