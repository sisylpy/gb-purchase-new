var globalData = getApp().globalData;
var apiUrl = require('../../../../config/index');

Page({
  data: {
    showMendianPicker: false,
    menuGroups: [],
  },

  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
    });
    this._loadMendianInfo();
    wx.removeStorageSync('myDate');

    wx.removeStorageSync('Food');
  },

  onShow: function () {
    this._loadMendianInfo();
  },

  _loadMendianInfo: function () {
    var value = wx.getStorageSync('mendianInfo');
    if (value) {
      this.setData({
        mendianInfo: value,
        disId: value.gbDepartmentDisId,
      });
    }
    var disInfo = wx.getStorageSync('disInfo');
    if (disInfo) {
      this.setData({
        disInfo: disInfo,
        mendianList: disInfo.mendianDepartmentList,
      });
    }
    this._buildMenuGroups();
  },

  // 构建菜单分组（按图片设计：基础管理 / 菜品与商品 / 采购与供应链 / 经营分析）
  _buildMenuGroups: function () {
    var d = this.data;
    var mendianList = d.mendianList || [];
    var disInfo = d.disInfo;

    // 商品管理：单店跳集团 resGoods，多店跳门店 depGoodsIndex
    var isSingleStore = !!(disInfo && disInfo.mendianDepartmentList && disInfo.mendianDepartmentList.length === 1);
    var goodsBind = isSingleStore ? 'toGroupGoods' : 'toResGoods';
    var goodsSub = '采购商品管理';

    var R = '/images/restaurant_management_small/';
    var P = '/images/procurement_supplier_small/';
    var baseItems = [
      { icon: R + 'company_management.png', iconBg: '#FFF4E8', name: '公司管理', sub: '公司信息', bind: 'toGroup' },
      { icon: R + 'manage_settings.png', iconBg: '#E6F7EE', name: '门店管理', sub: '门店与设置', bind: 'toMendian' },
      { icon: P + 'upgrade_franchise.png', iconBg: '#F2EAFE', name: '升级加盟', sub: '保留本店数据升级', bind: 'toFranchiseUpgrade' },
    ];
    if (mendianList.length > 1) {
      baseItems.unshift({ icon: P + 'store_management.png', iconBg: '#E8F4FD', name: '选择分店', sub: '切换分店', bind: 'showMendianPicker' });
    }

    var foodItems = [
      { icon: R + 'dish_management.png', iconBg: '#E8F5E9', name: '菜单管理', sub: '菜品与规格', bind: 'toStaffMeal' },
      { icon: P + 'purchase_analysis.png', iconBg: '#FFF3E0', name: '采购分析', sub: '采购统计分析', bind: 'toPurGoodsFenxi' },
      { icon: R + 'dish_operation.png', iconBg: '#E0F7FA', name: '菜品经营', sub: '菜品经营概览', bind: 'toMendainFood' },
    ];
    var purchaseItems = [
      { icon: R + 'intermediate_prep.png', iconBg: '#E0F2F1', name: '中间料', sub: '配方、制作和损耗记录', bind: 'toPreparation' },
      { icon: R + 'notebook.png', iconBg: '#EDE7F6', name: '菜单', sub: '菜单管理', bind: 'toFood' },
      { icon: P + 'purchase_team.png', iconBg: '#E3F2FD', name: '采购组', sub: '采购员与权限', bind: 'toStaff' },
      { icon: P + 'supplier_coupon.png', iconBg: '#E3F2FD', name: '供应商管理', sub: '供应商', bind: 'toJrdh' },
    ];

    // 常用功能：从基础数据抽出的高频入口，置于第二个模块
    var commonItems = [
      { icon: R + 'daily_dashboard.png', iconBg: '#FFF3E0', name: '营业额', sub: '营业额录入', bind: 'toDaily' },
      { icon: R + 'place_order.png', iconBg: '#FFF8E1', name: '报表', sub: '经营报表', bind: 'toReportStock' },
      { icon: R + 'ingredient_management.png', iconBg: '#F3E8FD', name: '商品管理', sub: goodsSub, bind: goodsBind },
    ];

    var analysisItems = [
      { icon: R + 'daily_dashboard.png', iconBg: '#E8F5E9', name: '经营看板',  bind: 'toPurchaseDate' },
      { icon: R + 'dish_operation.png', iconBg: '#F3E8FD', name: '菜品分析', sub: '菜品销售分析', bind: 'toFoodGoodsFenxi' },
      { icon: R + 'ingredient_analysis.png', iconBg: '#E3F2FD', name: '配料分析', sub: '毛利与成本分析', bind: 'toCostGoodsFenxi' },
      { icon: R + 'inventory_analysis.png', iconBg: '#E0F7EE', name: '库存分析', sub: '库存与周转分析', bind: 'toStock' },
    ];

    this.setData({
      menuGroups: [
        { title: '基础数据', items: purchaseItems },
        { title: '常用功能', items: commonItems },
        { title: '菜品与配料', items: foodItems },
        { title: '经营分析', items: analysisItems },
        { title: '基础管理', items: baseItems },
      ],
    });
  },

  // 统一菜单点击入口
  onMenuTap: function (e) {
    var bind = e.currentTarget.dataset.bind;
    if (bind && typeof this[bind] === 'function') {
      this[bind]();
    }
  },

  showMendianPicker() {
    this.setData({ showMendianPicker: true });
  },
  hideMendianPicker() {
    this.setData({ showMendianPicker: false });
  },
  selectMendian(e) {
    var item = e.currentTarget.dataset.item;
    if (item.gbDepartmentId === this.data.mendianInfo.gbDepartmentId) {
      this.hideMendianPicker();
      return;
    }
    wx.setStorageSync('mendianInfo', item);
    var disInfo = wx.getStorageSync('disInfo');
    if (disInfo && disInfo.mendianDepartmentList) {
      for (var i = 0; i < disInfo.mendianDepartmentList.length; i++) {
        if (disInfo.mendianDepartmentList[i].gbDepartmentId === item.gbDepartmentId) {
          disInfo.mendianDepartmentList[i] = item;
          break;
        }
      }
      wx.setStorageSync('disInfo', disInfo);
    }
    this.setData({
      mendianInfo: item,
      disId: item.gbDepartmentDisId,
      showMendianPicker: false,
    });
    wx.showToast({ title: '已选择: ' + item.gbDepartmentName, icon: 'none' });
  },

  toGroup() {
    wx.navigateTo({ url: '/subPackage-group/pages/account/disEdit/disEdit' });
  },
  toStock() {
    wx.navigateTo({ url: '/subPackage-charts/pages/stock/index/index' });
  },
  toResGoods() {
    wx.navigateTo({ url: '/subPackage-goods/pages/depGoodsIndex/depGoodsIndex' });
  },
  toGroupGoods() {
    wx.navigateTo({ url: '/subPackage-group/pages/goods/resGoods/resGoods' });
  },
  toFood() {
    wx.navigateTo({ url: '/subPackage-group/pages/food/index/index' });
  },
  toPreparation() {
    wx.navigateTo({ url: '/subPackage-preparation/pages/storeProducts/storeProducts' });
  },
  toReportStock() {
    wx.navigateTo({ url: '/subPackage-charts/pages/report/reportPage/reportPage' });
  },
  toMendian() {
    wx.navigateTo({ url: '/subPackage-mendian/pages/mendian/index/index' });
  },
  toFoodGoodsFenxi() {
    wx.navigateTo({ url: '/subPackage-charts/pages/cost/foodGoodsFenxi/foodGoodsFenxi?disId=' + this.data.disId });
  },
  toMendainFood() {
    wx.navigateTo({ url: '../../management/depFoodList/depFoodList?disId=' + this.data.disId });
  },
  toCostGoodsFenxi() {
    wx.navigateTo({ url: '/subPackage-charts/pages/cost/costGoodsFenxi/costGoodsFenxi?disId=' + this.data.disId });
  },
  toPurGoodsFenxi() {
    wx.navigateTo({ url: '/subPackage-charts/pages/cost/purGoodsFenxi/purGoodsFenxi?disId=' + this.data.disId });
  },
  toJrdh() {
    wx.navigateTo({ url: '/subPackage-mendian/pages/supplier/index/index' });
  },
  toStaffMeal() {
    wx.navigateTo({ url: '/subPackage-mendian/pages/food/index/index' });
  },
  toStaff() {
    wx.navigateTo({ url: '/subPackage-mendian/pages/management/staff/staff' });
  },
  toPurchaseDate() {
    wx.navigateTo({ url: '/subPackage-charts/pages/statistic/index/index' });
  },
  toDaily() {
    wx.navigateTo({ url: '/subPackage-charts/pages/sales/dailyTurnover/dailyTurnover' });
  },
  toFranchiseUpgrade() {
    wx.navigateTo({ url: '/subPackage-mendian/pages/management/franchiseUpgrade/franchiseUpgrade' });
  },
  toOrder() {
    wx.navigateTo({ url: '../../order/chefOrder/chefOrder' });
  },
  toBack() {
    wx.navigateBack({ delta: 1 });
  },
});
