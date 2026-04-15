# 项目规范

## 禁止事项

### 1. 禁止在子包中创建 lib 文件夹
所有公共工具库必须放在根目录的 `lib/` 文件夹中，子包应通过相对路径引用：
```javascript
// 正确
var dateUtils = require('../../lib/dateUtil.js');

// 错误 - 禁止在子包中创建 lib
// var dateUtils = require('../lib/dateUtil.js'); // 禁止
```

### 2. 禁止重复的工具库
不要复制相同的工具函数到多个位置，应统一使用根目录 `lib/` 中的公共模块。

## 目录结构规范

```
项目根目录/
├── lib/                    # 公共工具库（必须）
│   ├── dateUtil.js        # 日期工具
│   ├── load.js            # 加载提示
│   ├── request.js         # 请求封装
│   ├── storage.js         # 存储工具
│   ├── util.js            # 通用工具
│   ├── constants.js       # 常量
│   └── formatter.js       # 格式化
├── pages/                 # 主包页面
│   └── common/            # 公共页面
├── subPackage-ai/         # AI 子包
├── subPackage-charts/     # 统计子包
├── subPackage-goods/      # 商品子包
├── subPackage-mendian/    # 门店子包
└── subPackage-supplier/   # 供应商子包
```

## 路径引用规范

子包引用根目录 lib：
```javascript
// 子包引用根目录 lib（正确）
var load = require('../../lib/load.js');
var dateUtils = require('../../lib/dateUtil.js');
```

主包引用根目录 lib：
```javascript
// 主包引用根目录 lib（正确）
var load = require('../lib/load.js');
var dateUtils = require('../lib/dateUtil.js');
```
