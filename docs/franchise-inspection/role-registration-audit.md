# 巡店员注册与统一角色机制审计

记录时间：2026-08-05

审计基线：后台正式提交 `0ca55ab4074c9f25341c93a1ca724a03bad10e97`。

## 结论

巡店身份已经收口到原有 `gb_department_user` 用户体系。巡店接口不再读取或写入
`gb_fr_user_role`、`gb_fr_user_store_scope`；两张旧加盟角色表对应的实体、Mapper 和运行时双读逻辑已删除。
`GET /franchise/v1/me` 由 `gb_department_user.gb_du_admin` 及其现有配送商、部门、品牌、门店关系生成
`roleCodes`、`brandId`、`visibleStoreIds`、`departmentId` 和 `allowedActions`。

正式角色映射包括：`gb_du_admin=8 -> INSPECTOR`、`11 -> STORE_MANAGER`、`51 -> REGIONAL_MANAGER`、
`92 -> HQ_OPERATOR`、`0 -> HQ_ADMIN`。当前主权是单值角色，不支持同一 `gb_department_user` 同时拥有多个
`roleCodes`；巡店员与店长闭环必须使用两个正式微信用户。

## 原有采购员、库管员与本次巡店员的差异

- 原有采购员、库管员注册仍由邀请页传入整数 `admin`、组织参数和微信 code，最终创建
  `gb_department_user` 并写入 `gb_du_admin`。
- 巡店员不复用邀请、二维码或客户端组织参数。正式接口为
  `POST /franchise/v1/inspectors:register`，只允许 `code`、`userName`、可选 `avatarUrl`。
- 后台通过一次性微信 code 获取 OpenID；已有唯一部门用户时将该行更新为 `gb_du_admin=8`，没有用户时仅在
  品牌和总部组织可唯一确定的条件下创建同一体系中的新行。
- 前端不提交 `userId`、`gbDepartmentUserId`、`roleCode`、`brandId`、`storeId` 或 `departmentId`，也不调用已删除的
  `PUT /franchise/v1/me/roles/INSPECTOR`。

## 正式前端流程

1. 点击注册时调用第一次 `wx.login`，立即把 code 与姓名、可选头像提交到正式注册接口。
2. 不缓存或复用第一次 code。
3. 注册成功后再次调用 `wx.login`，用第二个 code 调用现有 `gbLoginIndex/{code}` 获取正式签名 Token。
4. 保存现有登录响应中的用户、配送商、部门资料和 Bearer Token。
5. 调用 `/franchise/v1/me`；只有服务端 `roleCodes` 包含 `INSPECTOR` 才进入巡店工作台。

页面不会在本地追加角色，不会用姓名或固定 ID 判定身份，注册错误按后台真实响应展示并保留姓名输入。

## 角色覆盖边界

由于正式主权为 `gb_du_admin` 单值，已有店长、采购员或库管员调用巡店员注册会把同一用户行转换为巡店员，
而不是追加第二个并存角色。这是最终后台合同的明确行为。门店店长应直接进入整改工作台，不应点击巡店员注册；
小程序入口因此允许正式 `STORE_MANAGER` 进入整改模式，只有没有任何巡店体系角色的用户进入测试注册页。

## 审计证据位置

- 后台：`FranchiseIdentityController`、`FranchiseInspectorRegistrationService`、`FranchiseIdentityService`、
  `FranchisePrincipalResolver`、`GbDepartmentUserEntity`、`GbConstants.DepartmentUserRole`。
- 小程序：`services/franchiseInspection.js`、`components/inspectionEntry`、
  `subPackage-inspection/pages/register`、`subPackage-inspection/pages/home`。
