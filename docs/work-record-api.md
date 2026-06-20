# 店长工作记录 API（第一阶段）

Base path: `/api/ai/work-records`（与现有 AI 接口一致，带 `server.servlet.context-path=/api` 时控制器映射为 `ai/work-records`）。

**隐私**：WORK_RECORD 为店长个人工作日记。列表与重试均强制 `recorderUserId = 当前 userId`；集团/区域/门店管理权限不代表可查看他人记录。

**sourceRunId**：响应字段表示该记录**最近一次** AI 处理对应的 Run ID；retry 成功后更新为最新 Run，历史 Run 仍在 `gb_ai_agent_run`。

## 1. 获取/创建长期会话

`GET /api/ai/work-records/conversation`

| 参数 | 必填 | 说明 |
|------|------|------|
| userId | 是 | gb_department_user 主键 |
| departmentId | 是 | 门店锚点（可传子部门，服务端归一到门店根） |
| distributerId | 否 | 缺省从部门/用户推导 |

响应 `data`：

```json
{
  "conversationId": 123,
  "conversationType": "WORK_RECORD",
  "threadKind": "WORK_RECORD",
  "title": "店长工作记录"
}
```

## 2. 新增工作记录

`POST /api/ai/work-records`

Body：

```json
{
  "userId": 1,
  "departmentId": 10,
  "distributerId": 2,
  "inputType": "TEXT",
  "content": "今天张三迟到半小时，已口头提醒。",
  "recordedAt": "2026-06-10T15:30:00"
}
```

- `inputType`: `TEXT` | `VOICE_TRANSCRIPT`（语音转写结果由前端传入）
- `recordedAt` 可选，缺省为提交时刻

响应 `data` 为完整 `WorkRecordResponse`（含 `aiStatus`）。

## 3. 列表查询

`GET /api/ai/work-records?userId=&departmentId=&startDate=2026-06-01&endDate=2026-06-10&categoryId=&page=1&pageSize=50`

服务端过滤条件（同时满足）：

- `gb_wr_recorder_user_id = userId`（仅本人日记）
- `gb_wr_department_id = 门店根`
- `gb_wr_distributer_id = 当前集团`

按 `recordedAt` 倒序。前端按日期分组展示。

## 4. 分类列表

`GET /api/ai/work-records/categories?userId=&distributerId=`

仅返回 ACTIVE 分类。

## 5. 重试 AI（可选）

`POST /api/ai/work-records/{id}/retry-ai?userId=`

- 仅 `aiStatus=FAILED` 且 `recorderUserId=userId` 的记录可重试
- 使用原子条件更新 `FAILED → PROCESSING`；并发第二个请求返回「正在处理或当前状态不可重试」
- 合法重试创建新 Run，**不**重复插入 user message；追加新 assistant message
- 成功 assistant 回执格式：

```text
已记录 · {categoryName}
{polishedContent}
```

失败 assistant 回执：`记录已保存，但 AI 暂时未完成整理和分类。`

## 前端页面建议（小程序）

路径建议：`subPackage/pages/workRecord/workRecord`

- 进入页：调用 `conversation` + `categories` + `list`
- 输入区：多行文本 + 语音按钮（复用现有 STT，将文字填入输入框，`inputType=VOICE_TRANSCRIPT`）
- 提交：POST 创建；`aiStatus=PROCESSING` 时展示 loading；`FAILED` 展示「记录已保存，AI 整理失败」+ 重试按钮
- 列表：按今天/昨天/更早分组；每条显示时间、分类标签、整理内容；原始内容折叠
- 顶部分类 chips 筛选 `categoryId`

语音：本仓库无 STT 后端，小程序侧录音→转写→`content` 文本提交即可。
