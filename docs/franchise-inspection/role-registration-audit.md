# 巡店员注册与角色机制审计

记录时间：2026-08-04

审计范围包括门店小程序现有采购员、库管员、店长注册与入口，以及巡店后台的身份表、鉴权服务和 `/franchise/v1/me` 合同。本轮只修改小程序，未修改后台。

## 审计结论

当前不能安全地将巡店员注册实现为前端直接调用某个现有角色接口，因为项目已存在两套角色存储和读取主权：

1. 原有门店用户角色保存在 `gb_department_user.gb_du_admin` 单值字段。
2. 巡店后台新增 `gb_fr_user_role` 和 `gb_fr_user_store_scope` 表，可为同一用户保存多个加盟角色和门店范围。
3. `/franchise/v1/me` 只从新增加盟角色表读取 `roleCodes`，没有把 `gb_du_admin` 映射到同一角色集合。

因此，前端已删除猜测的 `PUT /franchise/v1/me/roles/INSPECTOR`，注册页不会写本地角色、不会伪造 `/me` 响应，也不会通过新表接口掩盖两套主权。

## 原有采购员和库管员机制

- 原有整数角色常量中，门店采购员为 1、集团采购员为 2、库管员为 3、店长为 11，另有仓库采购员 31 等细分编码。
- 小程序采购员注册调用 `POST /gbdepartmentuser/gbPurchaserRegitsteWithFile`，提交微信登录 `code`、姓名、头像以及邀请页带入的 `admin`、部门和配送商参数。
- 邀请页将采购员和库管员编码放入二维码路径；后台将整数角色写入新建的 `GbDepartmentUserEntity.gbDuAdmin` 行。
- 该接口依赖邀请参数、客户端传入的组织 ID 和微信 `code`，不是“当前 Bearer Token 用户追加角色”合同，不适合复用为本轮巡店员注册。
- 工作台入口主要根据登录返回的 `userInfo.gbDuAdmin` 单值分支，不是根据通用 `roleCodes` 数组分支。

## 用户、角色与组织关系

- 原有用户实体是 `gb_department_user`；角色是其 `gb_du_admin` 单值字段。
- 用户与部门、父部门、配送商的关系也保存在同一行的现有字段。
- 原有注册查重按 OpenID 和角色查询，表面上可能为不同角色创建多行；但登录链路按 OpenID 读取单个 `GbDepartmentUserEntity`。因此现有实现不能被认定为安全、明确的“一个登录用户多角色”机制。
- 巡店新表支持多角色，但这与原有单值角色并行，并且已重复表达店长等角色。

## 当前巡店身份合同

- `FranchiseIdentityService.loadPrincipal` 先校验原有 `gb_department_user` 用户存在，再只查询 `gb_fr_user_role`。
- 没有有效加盟角色行时返回 `FRANCHISE_ROLE_MISSING`。
- 品牌、当前门店和可见门店分别来自 `gb_fr_user_role`、`gb_fr_user_store_scope` 以及后台对高级角色的范围扩展。
- 当前后台只提供 `GET /franchise/v1/me`、门店目录和业务接口，没有当前用户角色追加或绑定接口。

## 最小后台收口需求

不新增邀请注册流程。后台需先明确并实施统一角色主权，然后在该主权下提供以下最小能力：

1. 由现有登录 Token 唯一识别 `gb_department_user`，请求体不接受用户 ID。
2. 为当前用户追加巡店员角色，不创建第二个用户，不删除或覆盖已有角色。
3. 品牌、部门和门店范围由后台按现有组织关系确定，前端不传固定 ID。
4. 命令幂等；成功后 `/franchise/v1/me.roleCodes` 必须从同一统一主权读取并包含巡店员角色。

在该合同由后台确认前，前端不命名、不调用一个自行推测的注册 URI。当前测试注册页仅展示真实登录用户信息、校验 `/me`；只有返回的 `roleCodes` 真实包含巡店员角色时才进入工作台。

## 主要审计证据位置

- 小程序：`services/apiDistributerGbUser.js`、`subPackage-mendian/pages/mendian/depUserRegister`、`subPackage-group/pages/account/invitePage`、`pages/index/index.js`。
- 原有后台：`GbDepartmentUserController`、`GbDepartmentUserEntity`、`GbConstants.DepartmentUserRole`、`GbDepartmentUserMapper.xml`。
- 巡店后台：`FranchiseIdentityController`、`FranchiseIdentityService`、`FranchiseIdentityDirectoryService`、`FrUserRoleEntity`、`FrUserStoreScopeEntity` 和巡店 SQL 迁移。
