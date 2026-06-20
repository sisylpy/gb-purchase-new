/**
 * 餐厅画像编辑：表单 ↔ 后端实体字段
 */

var STAGE_OPTIONS = ['新开业', '成长期', '成熟期', '衰退期'];
var RISK_OPTIONS = ['保守型', '稳健型', '激进型'];
var DECISION_OPTIONS = ['慢（需多次沟通）', '中（1-3天决定）', '快（当场决定）'];
var STYLE_OPTIONS = ['直接型', '细节型', '关系型', '数据型'];

function profileToFormData(profile) {
  var p = profile || {};
  return {
    restaurantName: p.gbAiRestaurantProfileRestaurantName || '',
    cuisineType: p.gbAiRestaurantProfileCuisineType || '',
    address: p.gbAiRestaurantProfileAddress || '',
    businessDistrict: p.gbAiRestaurantProfileBusinessDistrict || '',
    businessHours: p.gbAiRestaurantProfileBusinessHours || '',
    avgPrice: p.gbAiRestaurantProfileAvgPrice ? String(p.gbAiRestaurantProfileAvgPrice) : '',
    seatCount: p.gbAiRestaurantProfileSeatCount ? String(p.gbAiRestaurantProfileSeatCount) : '',
    followerCount: p.gbAiRestaurantProfileFollowerCount ? String(p.gbAiRestaurantProfileFollowerCount) : '',
    dailyCustomers: p.gbAiRestaurantProfileDailyCustomers ? String(p.gbAiRestaurantProfileDailyCustomers) : '',
    dailyRevenue: p.gbAiRestaurantProfileDailyRevenue ? String(p.gbAiRestaurantProfileDailyRevenue) : '',
    targetAgeRange: p.gbAiRestaurantProfileTargetAgeRange || '',
    targetConsumer: p.gbAiRestaurantProfileTargetConsumer || '',
    bossName: p.gbAiRestaurantProfileBossName || '',
    costSensitive: p.gbAiRestaurantProfileCostSensitive ? String(p.gbAiRestaurantProfileCostSensitive) : '3',
    kitchenCapacity: p.gbAiRestaurantProfileKitchenCapacity ? String(p.gbAiRestaurantProfileKitchenCapacity) : '3',
    staffCount: p.gbAiRestaurantProfileStaffCount ? String(p.gbAiRestaurantProfileStaffCount) : '',
    rentMonthly: p.gbAiRestaurantProfileRentMonthly ? String(p.gbAiRestaurantProfileRentMonthly) : '',
    monthlyWage: p.gbAiRestaurantProfileMonthlyWage ? String(p.gbAiRestaurantProfileMonthlyWage) : '',
    monthlyFixedCost: p.gbAiRestaurantProfileMonthlyFixedCost ? String(p.gbAiRestaurantProfileMonthlyFixedCost) : '',
  };
}

function pickerIndexesFromProfile(profile, options) {
  var p = profile || {};
  return {
    stageIndex: p.gbAiRestaurantProfileBusinessStage
      ? options.stageOptions.indexOf(p.gbAiRestaurantProfileBusinessStage) : -1,
    riskIndex: p.gbAiRestaurantProfileRiskPreference
      ? options.riskOptions.indexOf(p.gbAiRestaurantProfileRiskPreference) : -1,
    decisionIndex: p.gbAiRestaurantProfileDecisionSpeed
      ? options.decisionOptions.indexOf(p.gbAiRestaurantProfileDecisionSpeed) : -1,
    styleIndex: p.gbAiRestaurantProfileBossStyle
      ? options.styleOptions.indexOf(p.gbAiRestaurantProfileBossStyle) : -1,
  };
}

function formToSubmitPayload(formData, profile, ctx) {
  var data = {
    gbAiRestaurantProfileId: (profile && (profile.gbAiRestaurantProfileId || profile.id)) || undefined,
    gbAiRestaurantProfileDepartmentId: ctx.departmentId,
    gbAiRestaurantProfileRestaurantName: formData.restaurantName,
    gbAiRestaurantProfileCuisineType: formData.cuisineType,
    gbAiRestaurantProfileAddress: formData.address,
    gbAiRestaurantProfileBusinessDistrict: formData.businessDistrict,
    gbAiRestaurantProfileBusinessHours: formData.businessHours,
    gbAiRestaurantProfileAvgPrice: formData.avgPrice ? Number(formData.avgPrice) : null,
    gbAiRestaurantProfileSeatCount: formData.seatCount ? Number(formData.seatCount) : null,
    gbAiRestaurantProfileFollowerCount: formData.followerCount ? Number(formData.followerCount) : 0,
    gbAiRestaurantProfileDailyCustomers: formData.dailyCustomers ? Number(formData.dailyCustomers) : null,
    gbAiRestaurantProfileDailyRevenue: formData.dailyRevenue ? Number(formData.dailyRevenue) : null,
    gbAiRestaurantProfileTargetAgeRange: formData.targetAgeRange,
    gbAiRestaurantProfileTargetConsumer: formData.targetConsumer,
    gbAiRestaurantProfileBossName: formData.bossName,
    gbAiRestaurantProfileCostSensitive: formData.costSensitive ? Number(formData.costSensitive) : 3,
    gbAiRestaurantProfileKitchenCapacity: formData.kitchenCapacity ? Number(formData.kitchenCapacity) : 3,
    gbAiRestaurantProfileStaffCount: formData.staffCount ? Number(formData.staffCount) : null,
    gbAiRestaurantProfileRentMonthly: formData.rentMonthly ? Number(formData.rentMonthly) : null,
    gbAiRestaurantProfileMonthlyWage: formData.monthlyWage ? Number(formData.monthlyWage) : null,
    gbAiRestaurantProfileMonthlyFixedCost: formData.monthlyFixedCost ? Number(formData.monthlyFixedCost) : null,
  };
  if (ctx.stageIndex >= 0) {
    data.gbAiRestaurantProfileBusinessStage = ctx.stageOptions[ctx.stageIndex];
  }
  if (ctx.riskIndex >= 0) {
    data.gbAiRestaurantProfileRiskPreference = ctx.riskOptions[ctx.riskIndex];
  }
  if (ctx.decisionIndex >= 0) {
    data.gbAiRestaurantProfileDecisionSpeed = ctx.decisionOptions[ctx.decisionIndex];
  }
  if (ctx.styleIndex >= 0) {
    data.gbAiRestaurantProfileBossStyle = ctx.styleOptions[ctx.styleIndex];
  }
  return data;
}

module.exports = {
  STAGE_OPTIONS: STAGE_OPTIONS,
  RISK_OPTIONS: RISK_OPTIONS,
  DECISION_OPTIONS: DECISION_OPTIONS,
  STYLE_OPTIONS: STYLE_OPTIONS,
  profileToFormData: profileToFormData,
  pickerIndexesFromProfile: pickerIndexesFromProfile,
  formToSubmitPayload: formToSubmitPayload,
};
