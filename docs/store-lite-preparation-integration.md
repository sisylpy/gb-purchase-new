# 门店轻量备料小程序集成边界

普通门店入口为 `/subPackage-preparation/pages/storeHome/storeHome`。有效门店用户直接进入，
不请求 `PREPARATION` 部门能力。

当前轻量入口包括：新增/编辑备料品、维护配方、记录实际制作、查看配方参考成本、记录原料损耗和查看损耗记录。
“记录实际制作”会让用户按配方原料选择有库存的进货记录，填写实际领用与实际产出；提交后后台同事务扣减原料并冻结备料单位成本，页面不创建、不选择也不展示生产批次。

菜品新版配方页添加备料后，理论成本优先使用后台返回的最近一次同配方版本轻量制作参考成本。
缺少可靠成本依据时显示“—/成本待计算”，完整理论成本和毛利也显示不完整，不能静默显示为 0。

中央厨房高级页面与请求服务全部保留，普通门店导航仍不链接 `home`、`batch*`、`issue`、`complete`、
`foodUse`、`discard`、`records`、`costAnalysis` 和 `lossAnalysis`。未来重新开放中央厨房时，从经过
`PREPARATION` 能力校验的专用入口链接 `/subPackage-preparation/pages/home/home`，无需恢复任何页面或接口。
