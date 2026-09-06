# 京采平台子包 `subPackage-platform/`

**可复制到任意宿主小程序**（正式产品、测试壳等），不修改宿主饭店业务页。

## 目录

```
subPackage-platform/
├── config.js                 # 子包配置（DEFAULT_MARKET_ID 等）
├── components/platform-tab-bar/   # 自定义 Tab（子包页不能用原生 tabBar）
├── pages/
│   home/                     # 平台首页
│   categoryGoods/            # 全部类别
│   snapshotGoods/            # 快照商品
│   orders/                   # 订货 / 购物车
│   checkout/                 # 结算
│   billPending/              # 待付 / 采购单详情
│   mine/                     # 我的
│   landing/                  # 引导（可选）
│   register/                 # 饭店注册
├── services/                 # platform/* API
├── utils/                    # routes / nav / platformCart / platformBillUi
└── styles/platform-tab-page.wxss
```

## 宿主依赖（复制后需在宿主中存在）

| 路径 | 说明 |
|------|------|
| `lib/request.js` | HTTP |
| `lib/load.js` | Loading |
| `lib/pageLayout.js` | 平台 Tab 布局 |
| `config/index.js` | `apiUrl` / `nxServer` |
| `utils/dateUtil.js` / `utils/priceUtil.js` | 工具 |
| `/components/navbar-dual` 等 | 页面 json 引用的组件 |
| `/images/tab/*` 等 | Tab 图标 |

## 接入步骤

1. 将整个 `subPackage-platform/` 复制到宿主项目根目录  
2. 在宿主 `app.json` 的 `subPackages` 注册（见本仓库 `jingcaiMarket/app.json`）  
3. 增加主包入口页（可选），例如 `pages/platformEntry` → `reLaunch` 到 `/subPackage-platform/pages/home/home`  
4. **不要**把平台页放进主包 `pages` 或原生 `tabBar`（微信限制 tab 必须在主包）

## 路由

见 `utils/routes.js`。Tab 切换用 `utils/nav.js` 的 `switchTab`（内部 `reLaunch`）。

## 注册策略

- 首页 / 分类：**游客可浏览**  
- **点击商品加购**时调用 `services/platformAuth.ensureRegisteredForGoods()` → 未注册跳转 `pages/register/register`

## 测试（jingcaiMarket）

开发者工具打开 `jingcaiMarket/`，首屏 `pages/platformEntry` 会进入子包首页。饭店原入口仍为 `pages/index/index`。
