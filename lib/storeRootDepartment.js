/**
 * 门店根部门 canonical 解析（SSOT，单一事实来源）。
 *
 * 与后端 GbDepFoodSalesExcelImportServiceImpl#requireStoreRoot 的正式合同一致：
 * 菜品销量事实唯一归属「门店根部门」，所送部门必须满足 gbDepartmentFatherId == 0（即其自身为根）。
 *
 * 解析规则（与后端 2 级门店模型一致）：
 *  - 若当前登录部门的 father（gbDepartmentFatherId）存在且 > 0，说明 gbDepartmentId 是子部门，
 *    根部门取其 father；
 *  - 否则 gbDepartmentId 自身即为根部门（其 father == 0）。
 *
 * 所有销量录入入口（新增 / 员工餐 / 编辑 / 日销量查询）必须统一消费本函数，
 * 不得各自保留根部门算法，也不得依赖“当前恰好都是单级门店”的偶然拓扑。
 *
 * @param {Object|null} mi mendianInfo（含 gbDepartmentId / gbDepartmentFatherId）
 * @returns {number|null} canonical 门店根部门 ID；无法解析时返回 null
 */
function storeRootDepartmentId(mi) {
  if (!mi || mi.gbDepartmentId == null || mi.gbDepartmentId === '') {
    return null;
  }
  var father = Number(mi.gbDepartmentFatherId);
  if (!isNaN(father) && father > 0) {
    return father;
  }
  return Number(mi.gbDepartmentId);
}

module.exports = {
  storeRootDepartmentId: storeRootDepartmentId,
};
