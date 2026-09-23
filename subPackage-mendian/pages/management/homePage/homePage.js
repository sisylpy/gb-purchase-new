var globalData = getApp().globalData;
var apiUrl = require('../../../../config/index');
var purchaseContext = require('../../../../lib/purchaseContext');

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
    var userInfo = wx.getStorageSync('userInfo') || {};
    var isGroupManager = purchaseContext.isGroupManagerUser(userInfo);
    this.setData({
      userInfo: userInfo,
      isGroupManager: isGroupManager,
      isStoreManager: Number(userInfo.gbDuAdmin) === 11,
    });
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

    var H = '/subPackage-mendian/images/homePage/';
    var baseItems = [
      { icon: H + 'icon_company_management.png', iconBg: '#FFF4E8', name: '公司管理', sub: '公司信息', bind: 'toGroup' },
      { icon: H + 'icon_store_management.png', iconBg: '#E6F7EE', name: '门店管理', sub: '门店与设置', bind: 'toMendian' },
      { icon: H + 'icon_franchise_upgrade.png', iconBg: '#F2EAFE', name: '升级加盟', sub: '保留本店数据升级', bind: 'toFranchiseUpgrade' },
        { icon: H + 'icon_reports.png', iconBg: '#FFF8E1', name: '报表', sub: '经营报表', bind: 'toReportStock' },
    ];
    if (!d.isGroupManager) {
      baseItems = baseItems.filter(function(item) {
        return item.bind !== 'toGroup' && item.bind !== 'toFranchiseUpgrade';
      });
    }
    if (d.isGroupManager && mendianList.length > 1) {
      baseItems.unshift({ icon: H + 'icon_store_management.png', iconBg: '#E8F4FD', name: '选择分店', sub: '切换分店', bind: 'showMendianPicker' });
    }

    var purchaseItems = [
      { icon: H + 'icon_intermediate_ingredient.png', iconBg: '#E0F2F1', name: '中间料', sub: '', bind: 'toPreparation' },
      { icon: H + 'icon_menu.png', iconBg: '#EDE7F6', name: '菜单', sub: '', bind: 'toFood' },
      { icon: H + 'icon_purchase_team.png', iconBg: '#E3F2FD', name: '采购组', sub: '', bind: 'toStaff' },
      { icon: H + 'icon_supplier.png', iconBg: '#E3F2FD', name: '供应商', sub: '', bind: 'toJrdh' },
    ];

    // 常用功能：从基础数据抽出的高频入口，置于第二个模块
    var commonItems = [
      { icon: H + 'icon_revenue.png', iconBg: '#FFF3E0', name: '营业额', sub: '营业额录入', bind: 'toDaily' },

      { icon: H + 'icon_product_management.png', iconBg: '#F3E8FD', name: '商品管理', sub: goodsSub, bind: goodsBind },
      { icon: H + 'icon_business_dashboard.png', iconBg: '#E8F5E9', name: '经营看板',  bind: 'toPurchaseDate' },
      { icon: H + 'icon_purchase_analysis.png', iconBg: '#FFF3E0', name: '采购分析', sub: '采购统计分析', bind: 'toPurGoodsFenxi' },
    ];

    var analysisItems = [
      { icon: H + 'icon_dish_operations.png', iconBg: '#E0F7FA', name: '菜品经营', sub: '菜品经营概览', bind: 'toMendainFood' },
      { icon: H + 'icon_dish_analysis.png', iconBg: '#F3E8FD', name: '菜品分析', sub: '菜品销售分析', bind: 'toFoodGoodsFenxi' },
      { icon: H + 'icon_ingredient_analysis.png', iconBg: '#E3F2FD', name: '配料分析', sub: '毛利与成本分析', bind: 'toCostGoodsFenxi' },
      { icon: H + 'icon_inventory_analysis.png', iconBg: '#E0F7EE', name: '库存分析', sub: '库存与周转分析', bind: 'toStock' },
    ];

    this.setData({
      menuGroups: [
        { title: '基础数据', items: purchaseItems },
        { title: '常用功能', items: commonItems },
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

  _requireGroupManager() {
    if (this.data.isGroupManager) return true;
    wx.showToast({ title: '店长只能管理本店', icon: 'none' });
    return false;
  },

  showMendianPicker() {
    if (!this._requireGroupManager()) return;
    this.setData({ showMendianPicker: true });
  },
  hideMendianPicker() {
    this.setData({ showMendianPicker: false });
  },
  selectMendian(e) {
    if (!this._requireGroupManager()) {
      this.hideMendianPicker();
      return;
    }
    var item = e.currentTarget.dataset.item;
    if (item.gbDepartmentId === this.data.mendianInfo.gbDepartmentId) {
      this.hideMendianPicker();
      return;
    }
    purchaseContext.setGroupSelectedStoreDepartment(item);
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
    if (!this._requireGroupManager()) return;
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
    wx.navigateTo({ url: '/subPackage-charts/pages/cost/costGoodsFenxiList/costGoodsFenxiList?disId=' + this.data.disId });
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
    if (!this._requireGroupManager()) return;
    wx.navigateTo({ url: '/subPackage-mendian/pages/management/franchiseUpgrade/franchiseUpgrade' });
  },
  toOrder() {
    wx.navigateTo({ url: '../../order/chefOrder/chefOrder' });
  },
  toBack() {
    wx.navigateBack({ delta: 1 });
  },
});
