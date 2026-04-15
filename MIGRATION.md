# 项目迁移文档

## 项目路径

| 项目 | 路径 |
|------|------|
| 老项目（仅参考，禁止修改） | `/Users/lpy/Documents/wxProjectAi/jjPurchaseAi` |
| 新项目（迁移目标） | `/Users/lpy/Documents/wxProjectAi/jjPurchaseAi/jj-purchase-new` |

---

## 业务模式

B2B 采购平台：
- **采购端（门店/饭店）** → 下单 → 转发给供货商
- **供货商（市场）** → 登录直接看账单/接单

---

## 子模块结构

| 模块包 | 说明 | 角色 |
|--------|------|------|
| `subPackage-store/` | 门店端（采购方） | 采购方（饭店/门店） |
| `subPackage-market/` | 市场端（供货商） | 供货商（市场） |
| `subPackage-ai/` | AI智能 | 所有用户 |
| `subPackage-charts/` | 统计管理 | 所有用户 |
| `subPackage-goods/` | 商品管理 | 采购方 |

---

### 一、主包 (pages/)

| 页面 | 说明 |
|------|------|
| splash | 启动页 |
| index | 首页 |
| register | 注册 |
| tro | 微信订货 |

---

### 二、subPackage-mendian/ 门店端（采购方）

```
pages/
├── order/      # 采购单管理,采购商品，（发起采购）
├── gbMarket/      # 采购流程（选商品、确认、转发给供货商）
├── account/       # 账户、支付、优惠券
```

对应老项目：`subPackage/` + 部分 `subPackage-charts/`

---

### 三、subPackage-market/ 市场端（供货商）

```
pages/
├── gbMarket/      # 接单、出货、发货
├── supplier/      # 供货商商品管理
└── ...            # 账单、对账
```

对应老项目：`subPackage-supplier/` + `subPackage-yishang/`（去掉配送部分）

---

### 四、subPackage-ai/ AI智能（4-5个功能）

```
pages/ai/
├── aiAnalysis/   # AI经营分析（销售、采购、成本分析）
├── aiChat/       # AI对话（智能客服）
├── aiCoupon/     # AI优惠券（智能发券）
├── aiWechat/     # AI公众号（内容生成）
└── aiSearch/     # 智能搜索（可选）
```

对应老项目：`subPackage-ai/` 中的 AI 相关页面

---

### 五、subPackage-charts/ 统计管理

```
pages/
├── management/   # 员工管理、用户分析
├── statistic/     # 采购统计
└── stock/         # 库存
```

对应老项目：`subPackage-charts/` 中的管理/统计页面

---

### 六、subPackage-goods/ 商品管理

```
pages/
├── goods/        # 商品列表、库存、货架
└── sel/          # 筛选
```

对应老项目：`subPackage-goods/`

---

## 迁移原则

### 核心要求
1. **完全复制** - 老项目内容 100% 原样复制到新项目，不自己猜想
2. **禁止修改老项目** - 老项目仅供参考，任何情况下都不要修改
3. **不增加新功能/页面** - 不在迁移过程中添加老项目没有的内容
4. **先迁移页面** - 按照老项目的页面结构逐个迁移

### 唯一可优化的地方
迁移时可以使用新项目已有的：
- 工具类（`styles/` 目录下的样式工具类）
- 共用样式（全局样式）
- 接口封装（`lib/` 目录下的请求方法等）
- 公共组件（`components/` 目录）

> 注意：优化时保持原有视觉效果一致，不可改变功能逻辑

---

## 迁移检查清单

- [ ] 确认老项目对应页面/组件存在
- [ ] 复制 wxml/js/json/wxss 文件内容
- [ ] 替换资源引用路径（图片、组件等）
- [ ] 替换 API 调用为新项目封装的方法
- [ ] 检查页面是否正常显示
- [ ] 验证功能逻辑是否一致

---

## 目录对应关系

```
老项目: /Users/lpy/Documents/wxProjectAi/jjPurchaseAi/
新项目: /Users/lpy/Documents/wxProjectAi/jjPurchaseAi/jj-purchase-new/

老 subPackage/       → 新 subPackage-store/
老 subPackage-supplier/ → 新 subPackage-market/
老 subPackage-ai/     → 新 subPackage-ai/
老 subPackage-charts/ → 新 subPackage-charts/
老 subPackage-goods/  → 新 subPackage-goods/
老 subPackage-yishang/ → 新 subPackage-market/（去除配送部分）
```

---

## 注意事项

1. 迁移前先确认新项目是否已有相同文件，如有则对比后合并
2. 图片路径引用需根据实际目录结构调整
3. 接口请求优先使用新项目的 `lib/request.js` 封装
4. 样式优先使用 `styles/` 下的工具类，减少重复代码
5. 下单功能属于采购端（门店），应放在 `subPackage-store/` 中
