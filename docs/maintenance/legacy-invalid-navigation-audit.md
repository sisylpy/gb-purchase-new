# 正式小程序历史失效跳转审计

- 审计日期：2026-08-05
- 正式仓库：`/Users/lpy/Documents/javaWeb/imJava/jczb/jczb-restraunt-mini`
- 基线分支与提交：`main` / `53186a90aaec34ff85daa7c2c61e1eccdca67b1c`
- 修复分支：`fix/legacy-invalid-navigation`
- 范围：此前清理报告中的 18 个活动失效跳转条目，以及 2 个仅存在于注释中的独立旧路径

## 口径说明

基线代码中共命中 19 次活动调用；其中 `couponList.js` 的 `toShixian1` 和 `toShixian` 位于同一来源文件并指向同一旧页面，因此按“来源文件 + 旧目标页面”合并为第 11 条，形成 18 条审计清单。第 11 条之外，同一个优惠券旧入口还有 2 次相对路径跳转，随该已作废入口一并清理。

“路由是否注册”以基线 `app.json` 的主包和全部分包为准；“目标文件是否存在”同时检查当前文件树与 `git log --all -- <path>`。所有行号均为修复前基线行号。

## 18 条活动失效跳转

| 序号 | 来源文件、行号或方法 | 页面名称 | 用户触发入口 | 原目标路径 | Query 参数 | 路由注册 / 文件存在 | 当前可替代页面 | 业务判断 | 建议与实际动作 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `pages/inviteTro/inviteTro.js:178`，`_doRegisterToServer` | 邀请注册介绍（京采账本） | 无；该示例方法未被 WXML 或组件绑定。可见“去注册”按钮调用的是 `toNext` | `/pages/home/index` | 无 | 未注册 / 不存在；历史上仅有后来被删除的 `pages/home/home`，从无 `pages/home/index` | `/pages/inviteRegister/inviteRegister?disId=...`，当前 `toNext` 已使用 | 已被正式注册入口替代 | B：删除未绑定的示例授权、模拟注册和跳转代码；保留正式 `toNext` 注册流程 |
| 2 | `subPackage-charts/pages/cost/goodsFenxiPurchase/goodsFenxiPurchase.js:703`，`toFenxi` | 商品采购分析 | 无；方法未绑定 | `/subPackage-charts/pages/cost/goodsPurList/goodsPurList` | `disGoodsId`、`purGoodsId` | 未注册 / 当前和历史均无目标文件 | 无需替代；当前页面使用 `showDetail` 展开采购记录 | 旧钻取逻辑已作废 | C：删除未绑定方法，不创建空壳页 |
| 3 | 同文件 `:733`，`toFilter` | 商品采购分析 | 无；方法未绑定，相关筛选视图也已注释 | `/subPackage-charts/pages/sel/filterData/filterData` | 无 | 未注册 / 当前和历史均无目标文件 | 无 | 旧筛选入口已作废 | C：删除未绑定方法，不补路由 |
| 4 | `subPackage-charts/pages/statistic/costGoodsByDate/costGoodsByDate.js:643`，`toFenxi` | 按日期成本商品分析 | 无；方法未绑定 | `/subPackage-goods/pages/goods/goodsFenxiPurchase/goodsFenxiPurchase` | `disGoodsId`、`purGoodsId`、`purchaseDate` | 未注册 / 不存在 | `/subPackage-charts/pages/cost/goodsFenxiPurchase/goodsFenxiPurchase` 存在，但当前无该入口，不能仅凭名称改接 | 旧钻取逻辑已作废 | C：删除未绑定方法 |
| 5 | 同文件 `:655`，`toCost` | 按日期成本商品分析 | 无；方法未绑定 | `/subPackage-goods/pages/goods/stockGoodsList/stockGoodsList` | `disGoodsId` | 未注册 / 不存在 | `/subPackage-goods/pages/stockGoodsList/stockGoodsList` | 旧钻取逻辑已作废；无可点击入口，不擅自恢复 | C：删除未绑定方法 |
| 6 | `subPackage-charts/pages/statistic/purchaseDeatil/purchaseDeatil.js:468`，`toFenxi` | 采购明细（进出库记录） | 无；方法未绑定 | `/subPackage-goods/pages/goods/goodsFenxiPurchase/goodsFenxiPurchase` | `disGoodsId` | 未注册 / 不存在 | `/subPackage-charts/pages/cost/goodsFenxiPurchase/goodsFenxiPurchase` 存在，但当前无该入口 | 旧钻取逻辑已作废 | C：删除未绑定方法 |
| 7 | `subPackage-charts/pages/statistic/purGoodsByDate/purGoodsByDate.js:277`，`toFenxi` | 按日期采购商品分析 | 无；方法未绑定 | `/subPackage-goods/pages/goods/goodsFenxiPurchase/goodsFenxiPurchase` | `disGoodsId` | 未注册 / 不存在 | `/subPackage-charts/pages/cost/goodsFenxiPurchase/goodsFenxiPurchase` 存在，但当前无该入口 | 旧钻取逻辑已作废 | C：删除未绑定方法 |
| 8 | 同文件 `:495`，`toCost` | 按日期采购商品分析 | 无；方法未绑定 | `/subPackage-goods/pages/goods/stockGoodsList/stockGoodsList` | `disGoodsId`、`stockId` | 未注册 / 不存在 | `/subPackage-goods/pages/stockGoodsList/stockGoodsList` | 旧钻取逻辑已作废；无可点击入口 | C：删除未绑定方法 |
| 9 | `subPackage-charts/pages/statistic/stockPurGoods/stockPurGoods.js:489`，`toFenxi` | 库存采购商品统计 | 无；方法未绑定 | `/subPackage-goods/pages/goods/goodsFenxiPurchase/goodsFenxiPurchase` | `disGoodsId` | 未注册 / 不存在 | `/subPackage-charts/pages/cost/goodsFenxiPurchase/goodsFenxiPurchase` 存在，但当前无该入口 | 旧钻取逻辑已作废 | C：删除未绑定方法 |
| 10 | `subPackage-goods/pages/disGoodsPage/disGoodsPage.js:1021`，`toLiziMarket` | 商品设置（goods 分包） | 操作弹层中的“查看市场供应” | `/subPackage-yishang/pages/yishang/map/map` | `nxGoodsId`、`nxGoodsName` | 未注册 / 文件在 `21aad11` 中随整个废弃分包删除 | 无；市场供应分包及专用服务已正式移除 | 业务已作废 | C：删除“查看市场供应”入口和专用跳转方法 |
| 11 | `subPackage-group/pages/account/couponList/couponList.js:100、120`，`toShixian1`、`toShixian` | 京京送货优惠券 | `toShixian1` 无绑定；有效优惠券卡片的“去使用”按钮可触发 `toShixian` | `/subPackage-yishang/pages/yishang/nxDistributerGoods/nxDistributerGoods` | 第一处无；第二处含 `depId`、`disId`、`depName`、`nxDisId` | 未注册 / 文件在 `21aad11` 中随整个废弃分包删除 | 无；旧异商下单功能已移除 | 业务已作废 | C：删除“去使用”按钮、选择门店弹层及仅服务该入口的 4 次跳转逻辑；优惠券展示保留 |
| 12 | `subPackage-group/pages/goods/disGoodsPage/disGoodsPage.js:996`，`toLiziMarket` | 商品设置（group 分包） | 操作弹层中的“查看市场供应” | `/subPackage-yishang/pages/yishang/map/map` | `nxGoodsId`、`nxGoodsName` | 未注册 / 文件在 `21aad11` 中随整个废弃分包删除 | 无 | 业务已作废 | C：删除“查看市场供应”入口和专用跳转方法 |
| 13 | `subPackage-mendian/pages/management/purUserDayDeatil/purUserDayDeatil.js:177`，`toCost` | 采购员日明细（进出库记录） | 无；方法未绑定 | `/subPackage-goods/pages/goods/stockGoodsList/stockGoodsList` | `disGoodsId`、`stockId` | 未注册 / 不存在 | `/subPackage-goods/pages/stockGoodsList/stockGoodsList` | 旧钻取逻辑已作废；当前无入口 | C：删除未绑定方法 |
| 14 | `subPackage-mendian/pages/supplier/myPurchaseDetail/myPurchaseDetail.js:206`，`toCost` | 采购批次明细 | 无；方法未绑定 | `/subPackage-goods/pages/goods/stockGoodsList/stockGoodsList` | `disGoodsId`、`stockId` | 未注册 / 不存在 | `/subPackage-goods/pages/stockGoodsList/stockGoodsList` | 旧钻取逻辑已作废；当前无入口 | C：删除未绑定方法 |
| 15 | `subPackage-mendian/pages/supplier/resGoods/resGoods.js:532`，`toOrderList` | 供应商自动订货商品 | 商品卡片底部的订货记录（时钟）图标 | `/subPackage-goods/pages/goods/goodsOrderList/goodsOrderList` | `disGoodsId`、`type=1` | 未注册 / 不存在 | `/subPackage-goods/pages/goodsOrderList/goodsOrderList` | 有效功能，页面路径曾多出旧 `goods/` 层级 | A：改到正式路径；保留全部参数。目标页读取 `disGoodsId`，`type=1` 原样保留 |
| 16 | 同文件 `:540`，`toFenxi` | 供应商自动订货商品 | 商品卡片底部的统计图标 | `/subPackage-goods/pages/goods/goodsFenxi/goodsFenxi` | `id` | 未注册 / 不存在 | `/subPackage-goods/pages/goodsFenxi/goodsFenxi` | 有效功能，页面路径曾多出旧 `goods/` 层级 | A：改到正式路径；目标页继续以 `options.id` 接收商品 ID |
| 17 | 同文件 `:546`，`toGoods` | 供应商自动订货商品 | 商品卡片底部的商品设置（蔬果）图标 | `/subPackage-goods/pages/goods/disGoodsPage/disGoodsPage` | `disGoodsId` | 未注册 / 不存在 | `/subPackage-goods/pages/disGoodsPage/disGoodsPage` | 有效功能，页面路径曾多出旧 `goods/` 层级 | A：改到正式路径；保留 `disGoodsId` 和跳转前的 `disGoods` 缓存 |
| 18 | 同文件 `:555`，`toStock` | 供应商自动订货商品 | 商品卡片底部的库存图标 | `/subPackage-goods/pages/goods/stockGoodsList/stockGoodsList` | `disGoodsId` | 未注册 / 不存在 | `/subPackage-goods/pages/stockGoodsList/stockGoodsList` | 有效功能，页面路径曾多出旧 `goods/` 层级 | A：改到正式路径；保留 `disGoodsId` 和跳转前的 `disGoods` 缓存 |

## 2 个仅存在于注释中的旧路径

| 路径 | 注释位置 | 历史含义 | 处理 |
| --- | --- | --- | --- |
| `/pages/common/searchDate/searchDate?startDate=...&stopDate=...&dateType=...` | `subPackage-goods/pages/stockGoodsList/stockGoodsList.js:538-540` | 库存商品列表的旧日期选择页；紧随其后的活动代码已使用正式 `/pages/common/selectDate/selectDate` | 删除过期注释，正式入口不变 |
| `/pages/settings/index` | `subPackage-group/pages/account/disEdit/disEdit.js:417、434` | 订阅设置提示中的旧页面设想；当前正式行为是调用 `wx.openSetting()` | 删除两处过期注释，保留 `wx.openSetting()` |

活动失效路径的同路径注释（例如 `couponList.js` 里的旧异商页面和 `inviteTro.js` 的伪代码）随对应死代码一起清理，不另计入上述 2 个独立路径。

## Git 历史和业务证据

1. `21aad119900a0fe9ae480a2a6fce06023b595e39` 的提交说明明确包含“移除废弃 `subPackage-yishang`”，并删除 `map`、`nxDistributerGoods`、分包服务和路由。当前仓库也没有功能等价的新市场供应/异商下单页面，因此不恢复路由。
2. `/pages/home/index` 从未存在。当前邀请介绍页的可见“去注册”按钮在基线中已经调用注册页面 `../inviteRegister/inviteRegister?disId=...`；旧路径仅位于未绑定的模拟注册示例中。
3. `goodsPurList`、`subPackage-charts/pages/sel/filterData` 以及带旧 `subPackage-goods/pages/goods/` 层级的目标在历史中没有可恢复的完整正式页面。对应方法均无 WXML/组件绑定，因此删除孤立方法，不猜测接到相似页面。
4. 第 15～18 条的 4 个目标页文件完整、已在 `app.json` 注册，且参数合同分别核对为 `disGoodsId`、`id`、`disGoodsId`、`disGoodsId`。修复只移除多余的旧路径层级，没有改变 query 名称和值。

## 分类和处置汇总

| 分类 | 数量 | 处置 |
| --- | ---: | --- |
| A：页面路径移动或旧层级失效 | 4 | 改到已注册正式页面，保留参数合同 |
| B：已有正式入口的重复旧逻辑 | 1 | 删除邀请注册页未绑定的模拟注册示例；正式注册入口不变 |
| C：已作废业务或不可触发死代码 | 13 | 删除 10 个未绑定方法，以及 3 个指向已废弃异商分包的入口/逻辑 |
| D：完整页面漏注册 | 0 | 未新增任何页面注册 |
| E：无法确认 | 0 | 本轮 18 条内无需要猜测修改的条目 |

## 扩展扫描边界

为避免把“此前 18 条”误报成全仓全部问题，本轮另外对 `wx.navigateTo`、`wx.redirectTo`、`wx.reLaunch`、`wx.switchTab`、`navigator` 的字面量和拼接首段做了相对路径解析。修复前扩展扫描可识别 74 次未注册目标调用：其中 19 次属于本表 18 条，2 次属于第 11 条同一优惠券入口的相对路径分支；处置这些条目后仍有 53 次不在此前清理报告 18 条范围内的历史相对路径候选。

这 53 次候选未经过逐条业务历史和可达性审计，本轮未批量改动，也不纳入上述 A～E 统计。最终报告必须同时给出“本轮 18 条基准剩余数”和“扩展扫描额外候选数”，不能将两种口径混为一谈。

## 修复后验证记录

- 本轮 18 条基准活动失效跳转：`0`
- 本轮 2 个注释旧路径：`0`
- 扩展扫描额外历史相对路径候选：`53`（未纳入本轮修改）
- JavaScript：排除第三方 `miniprogram_npm` 后全仓 `268` 个文件通过 `node --check`
- JSON：全仓 `212` 个文件解析通过
- 路由：`151` 个注册路由，重复路由 `0`；所有注册页面的 `.js/.json/.wxml/.wxss` 文件齐全
- 组件：核对 `265` 个本地组件引用，组件核心文件均存在
- 受保护功能：巡店、巡店员注册、门店轻量备料及中央厨房高级备料共 `20` 个代表性路由均保留；`services/franchiseInspection.js` 继续使用 `POST inspectors:register`；正式地址仍为 `http://192.168.0.102:8090/api/`
- 旧端口：`18090`、`18096`、`18097` 在运行代码与配置中均为 `0`
- WXSS：本轮涉及页面的 3 个样式文件通过微信开发者工具自带 `wcsc -lc`；全仓直接编译仍报告 3 个本轮前已存在的缺失导入：`/reportPage.wxss` 两处、`/template/billPay/billPay.wxss` 一处
- WXML：全仓直接调用开发者工具 `wcc` 时被本轮前已存在的 `components/inputOrder/orderEntities.wxs` 缺失阻断；静态模板引用检查另发现 `subPackage-mendian/pages/supplier/jrdhIndex/jrdhIndex.wxml` 引用的 `template/jrdhFenxi/jrdhFenxi.wxml` 不存在。两项均不在本轮 18 条文件内，未越界修复
- 模拟器：两次通过官方 CLI 请求打开正式路径，当前开发者工具窗口仍保持在另一个 `nxl-boss / BOSS-MINI` 项目；内置自动化接口又因当前项目未配置 `agent.skills` 拒绝执行。为避免修改 `app.json` 或打断其他项目，本轮没有声称完成真实点击验证

因此，4 条改路径入口已完成路由、文件、参数和调用绑定的静态闭环；运行时点击、返回和刷新验证仍需在微信开发者工具实际切换到本正式目录后执行。
