# 巡店小程序合入正式工作区说明

记录时间：2026-08-04

目标分支：`feature/franchise-inspection-mini`

当前正式小程序工作区存在大量未提交历史修改，并且与本功能的 `app.json`、`pages/index/index.js`、`subPackage-mendian/pages/management/homePage/homePage.wxml` 重叠。本轮没有进入正式工作区解决冲突。后续应在独立、可回滚的合入步骤中逐段人工合并，不要用本分支整文件覆盖正式工作区。

## 一、可整体引入的新增文件

以下目录和文件是巡店功能专用，可按最终提交整体引入：

- `subPackage-inspection/**`：注册、工作台、选店、现场记录、问题确认、问题详情、巡店详情、整改与复核。
- `components/inspectionEntry/**`：原小程序的巡店管理入口。
- `components/inspectionMediaUploader/**`：巡店、整改和复核共用的鉴权媒体组件。
- `services/franchiseInspection.js`：巡店专用正式请求服务。
- `utils/franchiseInspection.js`：状态、时间线、幂等命令和表单工具。
- `docs/franchise-inspection/**`：角色审计、联调缺口和本合入说明。

这些文件依赖项目已有的 `components/back-navbar`、`lib/request.js`、`config/index.js` 和现有微信登录接口。

## 二、`app.json` 必须人工合并

修改原因：注册巡店分包页面路由。

在正式工作区现有 `subPackages` 数组中追加一个独立项，不要覆盖已有主包页面、其他分包、插件或全局窗口配置。最终巡店分包应包含：

1. `pages/register/register`
2. `pages/home/home`
3. `pages/storeSelect/storeSelect`
4. `pages/inspectionRecord/inspectionRecord`
5. `pages/issueConfirm/issueConfirm`
6. `pages/issueDetail/issueDetail`
7. `pages/inspectionDetail/inspectionDetail`
8. `pages/taskDetail/taskDetail`

分包 `root` 为 `subPackage-inspection/`，`name` 为 `inspection`。正式工作区的 `app.json` 已有历史修改，只应插入上述分包对象。

## 三、`pages/index/index.js` 必须人工合并

修改原因：巡店 API 使用后台正式 Bearer Token，需在原微信登录成功时保存后台返回的 `token` 和过期时间。

只在 `_userLogin` 的成功响应分支内，紧跟现有 `depUserInfo` 保存后合入这一段行为：

- 后台返回 `token` 时，以 `Bearer ` 前缀保存到现有 `token` Storage。
- 将 `tokenExpiresAt` 保存到 `franchiseTokenExpiresAt`。

不要覆盖正式工作区已有的登录路由、用户分流、首页数据或其他未提交修改。不要创建第二套登录页或用户 Storage。

## 四、门店管理首页必须人工合并

### `subPackage-mendian/pages/management/homePage/homePage.json`

在现有 `usingComponents` 中追加：

- 组件名：`inspection-entry`
- 路径：`/components/inspectionEntry/inspectionEntry`

保留正式工作区当时已有的所有组件声明。

### `subPackage-mendian/pages/management/homePage/homePage.wxml`

修改原因：向门店管理页增加“巡店管理”入口。

在已有 `<preparation-entry />` 后插入 `<inspection-entry />`。不要整文件覆盖；正式工作区的该页 `js`、`wxml`、`wxss` 均有未提交历史修改，本功能只需上述组件声明和标签，不需要复制本分支的其他页面内容。

## 五、`lib/request.js` 必须逐段合并

巡店请求服务依赖以下能力：

- 统一将 Storage 中的 Token 规范为 Bearer Authorization Header。
- `POST`、`PUT`、`PATCH`、`DELETE` 默认使用 JSON。
- 2xx 统一视为 HTTP 成功，业务码由巡店专用服务再校验。
- 只对 401 或明确的 Token 失效 403 清理鉴权，不把普通越权 403 当成未登录。
- 上传和下载携带同一 Authorization Header，并向巡店媒体服务暴露只读的 Header 构造函数。

如果正式工作区已继续演进了共享请求层，应把上述能力合并到新实现，不要直接替换整个 `lib/request.js`。

## 六、合入前配置和验证

1. 确认本地开发配置指向 `http://192.168.0.102:8090/api/`，不要把个人本地配置作为通用生产配置覆盖。
2. 确认合入后的 `app.json` 同时保留正式工作区历史分包和新巡店分包。
3. 确认门店管理页只出现一个巡店入口，进入时由 `/franchise/v1/me` 真实角色判定工作台或测试注册页。
4. 重新执行 JavaScript、JSON、WXML、WXSS、路由和组件检查。
5. 使用正式微信登录用户验证 Token 刷新、角色、门店范围、媒体鉴权和完整整改复核闭环。

在统一角色主权和巡店员注册合同就绪前，可以合并非注册页面和静态代码，但不应宣布正向注册与端到端闭环已验收通过。
