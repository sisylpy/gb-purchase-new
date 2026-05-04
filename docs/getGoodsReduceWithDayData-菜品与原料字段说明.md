# getGoodsReduceWithDayData — 菜品 / 菜品原料相关字段说明

供前端对接：`POST /gbdepartmentgoodsstockreduce/getGoodsReduceWithDayData` 返回体中的 `data` 对象。

---

## 一、菜品带动本原料（周期汇总）

数据仍与 Excel 上传菜品销量后写入的 **`gb_dep_food_goods_sales`** 一致。服务端在 **`buildReduceWithDayData`** 内会用 **`foodSalesIngredientPeriod`**（仅内部）汇总周期内本原料「菜品侧」消耗，用于组装 **`foodSalesStats`** / **`aiAnalysis.actualIngredientTotal`** 等，**不再**在接口顶层返回下列字段：

| 字段 | 说明 |
|------|------|
| ~~`foodSalesIngredientList`~~ | **已移除**。不再下发「按自然日的菜品消耗」`{ date, value }[]`。 |
| ~~`foodSalesIngredientTotal`~~ | **已移除**。周期合计不再单独字段返回；与菜品侧实际用量相关的数见 **`aiAnalysis.actualIngredientTotal`** / **`foodSalesStats.theoreticalVsActual.actualIngredientTotal`**（与后端实现保持一致即可）。 |

按日维度展示请使用 **`produceList` / `lossList` / `wasteList` / `itemList`** 等结构中**每条自带的完整日期** `date`（`yyyy-MM-dd`）；历史上若另有仅「日序 dd」的冗余数组也已去掉，避免与完整日期重复。

---

## 二、`foodSalesStats`（菜品分析块）

路径：**`data.foodSalesStats`**，对象。

此处提供**明细行数、与菜品销售关联、配方与理论/实际对比**；不再依赖第一节已移除的按日列表字段。

| 字段 | 类型 | 含义 |
|------|------|------|
| **`depFoodGoodsSalesRowCountInPeriod`** | `number` | 查询条件下，`gb_dep_food_goods_sales` 在 `[startDate, stopDate]` 内的**明细行数**（与按日汇总不是同一维度）。 |
| **`period`** | `{ startDate, stopDate }` | 本次统计的日期范围。 |
| **`filters`** | `{ disGoodsId, searchDepId }` | 当前批发商商品 id、部门筛选（`-1` 表示未按单部门过滤）。 |
| **`dishSales`** | `object` | 见下文 §2.1。 |
| **`recipeDishesUsingThisGood`** | `array` | 见下文 §2.2。 |
| **`periodSalesByDepAndDish`** | `array` | 见下文 §2.3。 |
| **`theoreticalVsActual`** | `object` | 见下文 §2.4。 |

### 2.1 `foodSalesStats.dishSales`

| 字段 | 类型 | 含义 |
|------|------|------|
| **`linkedSalesRowCount`** | `number` | 期内至少产生过一条「本原料消耗」的 **不同 `gb_dep_food_sales` 笔数**（按销售主表 id 去重）。 |
| **`linkedDishQtyTotal`** | `number` | 上述各笔销售里 **`gb_dfs_amount`（菜品销量）之和**；同一笔销售只计一次。 |
| **`topDishesDrivingThisIngredient`** | `array`，最多 25 条 | 按**本原料消耗额**从高到低。 |

**`topDishesDrivingThisIngredient[]` 每项：**

| 字段 | 含义 |
|------|------|
| `gbDepFoodSalesId` | 部门菜品销售主表 id（`gb_dep_food_sales`） |
| `ingredientAmount` | 该笔销售在 `gb_dep_food_goods_sales` 中、对本原料的消耗量合计 |
| `gbDfsFoodId` | 批发商菜品 id（有则返回） |
| `dishQty` | 该笔销售上的菜品销售数量（`gb_dfs_amount`） |

### 2.2 `foodSalesStats.recipeDishesUsingThisGood`

**哪些菜**的配方里用到了**当前这个批发商商品**；以及该原料在**一份菜**里的用量占比。  
占比分母为该菜**全部**配方行用量数值之和（**不同单位混用会有误差**）。

每项：

| 字段 | 含义 |
|------|------|
| `gbDfsFoodId` | 批发商菜品 id（`gb_distributer_food`） |
| `foodName` | 菜名 |
| `recipeAmountThisGoodPerDish` | 每份菜对本原料的配方用量 |
| `totalRecipeAmountAllIngredients` | 该菜全部配方行用量之和 |
| `shareOfRecipePercent` | 本原料用量 ÷ 全料用量 ×100（在一份菜里的占比，%） |

若无配方数据，该数组为空（需维护 `gb_distributer_food_goods`）。

### 2.3 `foodSalesStats.periodSalesByDepAndDish`

期内 **部门 × 菜**：实际销量，以及按配方**应耗本原料**。

每项：

| 字段 | 含义 |
|------|------|
| `gbDfsDepId` | 部门 id |
| `depName` | 部门名称 |
| `gbDfsFoodId` | 批发商菜品 id |
| `foodName` | 菜名 |
| `soldQty` | 该部门、该菜在区间内的销量合计（多笔 `gb_dep_food_sales` 汇总） |
| `recipeAmountThisGoodPerDish` | 每份菜对本原料的配方用量 |
| `theoreticalIngredientForThisRow` | **理论应耗本原料** = `soldQty × recipeAmountThisGoodPerDish` |

### 2.4 `foodSalesStats.theoreticalVsActual`

| 字段 | 含义 |
|------|------|
| **`theoreticalIngredientTotal`** | `periodSalesByDepAndDish` 中各行 `theoreticalIngredientForThisRow` 之和（按当前配方 + 销量推算应耗）。 |
| **`actualIngredientTotal`** | 周期内 `gb_dep_food_goods_sales` 对本原料的消耗汇总（与已移除的顶层 `foodSalesIngredientTotal` 同源语义；具体以后端返回为准）。 |
| **`ingredientGapActualMinusTheoretical`** | **实际 − 理论**；正数表示比推算多，负数表示比推算少。 |
| **`ingredientGapPercentOfTheoretical`** | 差距 ÷ 理论 ×100（%）；**理论为 0 时为 `null`**。 |

---

## 三、前端使用建议

1. **按日用量曲线**：使用 **`produceList` / `lossList` / `wasteList`**（每项含完整 **`date`**）；不再使用已移除的 **`foodSalesIngredientList`**。  
2. **配方、部门×菜、理论 vs 实际**：使用 **`foodSalesStats`** 中的 `recipeDishesUsingThisGood`、`periodSalesByDepAndDish`、`theoreticalVsActual`。  
3. **谁最耗这个料**：使用 **`foodSalesStats.dishSales.topDishesDrivingThisIngredient`**。  
4. **AI / 理论对比用的「实际菜品侧消耗」**：使用 **`aiAnalysis.actualIngredientTotal`**（或 stats 内 theoreticalVsActual），而非顶层合计字段。

---

## 四、相关接口（扩展阅读）

- 菜品日销售 Excel 上传：`POST /ai/daily-revenue/upload-food-sales-excel`（写入 `gb_dep_food_sales`、`gb_dep_food_goods_sales`）。  
- 其它说明见：`docs/AI日营业额Excel上传模板说明.md`（若项目中有日营业额相关文档可交叉引用）。
