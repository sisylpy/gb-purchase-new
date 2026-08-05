# 正式小程序编译依赖审计

- 审计日期：2026-08-05
- 正式基线：`main` / `8af3b89147d288bdfbe4a97441ef02a8bcf49560`
- 维护分支：`fix/compile-dependencies-and-navigation`
- 只读归档：`/Users/lpy/Documents/javaWeb/imJava/jczb-archive-20260805`

## 结论

最初报告的 WXS 与 3 处 WXSS “缺失”均为编译器输入路径未带 `./` 时产生的虚拟根路径解析误报；目标文件在基线中已经存在、受 Git 跟踪，且内容完整。本轮没有复制、恢复或创建这些文件。真正缺失的只有 `template/jrdhFenxi/jrdhFenxi.wxml`：它从未进入任何 Git 提交，也不存在于两个归档副本；唯一引用页 `jrdhIndex` 自加入仓库起就没有站内入口，因此本轮移除该不可达且从未完整可编译的旧页及其路由。

## 逐项证据

| 依赖 | 正式引用位置 | 用户入口 | Git 历史 / 当前位置 | 归档结果 | 业务判断 | 正确处理 |
| --- | --- | --- | --- | --- | --- | --- |
| `components/inputOrder/orderEntities.wxs` | `components/inputOrder/inputOrder.wxml:1` 以 `order` 模块引用，`:87` 调用 `order.list(item)`；组件由 `subPackage-mendian/pages/order/purGoods/purGoods.json` 注册并在其 WXML 使用 | 首页管理入口进入“采购商品”页，页内使用订货输入组件 | 自 `840b092` 起受 Git 跟踪；基线文件存在，SHA-256 为 `9cb99c23189f2c9cad871b60430ce02d4f35ba223653fff84b01234afeec1ae9` | `jczb-restraunt-mini_副本` 有同指纹文件；legacy-dirty 中版本不同，未复制 | 正式业务有效，文件未缺失 | 不改代码；全仓 WXML/WXS 编译时以 `./` 前缀传入项目文件，使 `/components/...` 按小程序虚拟根解析 |
| `template/jrdhFenxi/jrdhFenxi.wxml` | `subPackage-mendian/pages/supplier/jrdhIndex/jrdhIndex.wxml:2` 导入；`:46、:73、:104` 使用模板 | 当前无站内入口；全仓运行代码只在 `app.json` 注册该页 | `git log --all -- <路径>` 无记录；页面由 `21aad11` 纳入当前分包时已带失效导入，模板从未提交；当前无移动或改名后的等价模板 | 两个归档副本均只有同一失效导入，没有目标模板 | 页面从未形成完整可编译功能，当前不可达，属于旧死页 | 从 `app.json` 移除该页注册，并删除该页自身 `.js/.json/.wxml/.wxss`；不创建空模板，不恢复旧业务，不动其服务层 |
| `/reportPage.wxss`（第 1 处） | `subPackage-goods/pages/goodsFenxi/goodsFenxi.wxss:222` | 商品列表、供应商商品等入口进入“商品分析” | 根目录 `reportPage.wxss` 自 `e411d28` 起受 Git 跟踪；基线存在，SHA-256 为 `22fd013f5a87ac7e71fc697b1b8ec17747ce26370aba85499e9de8373b7fc8fc` | 归档中存在同指纹文件 | 正式分析业务有效，样式未缺失 | 不改导入；修正全仓编译调用的项目文件路径口径后由虚拟根正常解析 |
| `/reportPage.wxss`（第 2 处） | `subPackage-goods/pages/stockGoodsList/stockGoodsList.wxss:30` | 商品卡片“库存”入口进入库存明细 | 同上，根目录正式文件存在且受跟踪 | 同上 | 正式库存业务有效，样式未缺失 | 不改导入；按小程序虚拟根编译 |
| `/template/billPay/billPay.wxss` | `subPackage-jrdh/pages/settlePageGb/settlePageGb.wxss:526` | 今日订货列表进入结算页 | `template/billPay/billPay.wxss` 自 `173b8c4` 起受 Git 跟踪；基线存在，SHA-256 为 `94a0b42cb067c5461b3998a15da4f9eb6435d842ac09b072bb1433ce8b8b4a22` | 两个归档中均存在同指纹文件 | 正式结算业务有效，样式未缺失 | 不改导入；按小程序虚拟根编译 |

## 安全说明

- 未从归档复制任何页面、模板、WXS 或 WXSS。
- 未新增空壳、占位文件或无功能路由。
- `services/depOrder.js` 属于用户在途文件，本轮没有读取后擅自修正、修改、暂存或提交。
- `jrdhIndex` 的移除不涉及后台接口、数据库或 8090 服务，也不影响已注册的 `jrdhGoodsStars`、`jrdhGoodsList`、`jrdhOrderList`、`jrdhGoodsFenxi` 页面。
