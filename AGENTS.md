# AGENTS.md — AI Agent 入口规则（jczb-restraunt-mini）

> 本文件是小程序仓库 `jczb-restraunt-mini` 的 Agent 入口说明，CodeBuddy / Cursor / 其它 Agent 打开本仓库时会自动加载。
> 后端仓库 `jczb-server/AGENTS.md` 含更完整的架构与仓库卫生规则，二者关于 Git 交付的要求一致，以前者为准。

---

## Mandatory Git Delivery — 强制 Git 交付

> **最高优先级**：Git 交付是**任何代码 / 文件修改任务的强制组成部分**。
> 修改完成后，不得只停留在工作区、暂存区或临时 worktree；必须进入主代码线（正式分支的 clean committed HEAD）。
> **没有 commit hash，Agent 不得向用户汇报「任务完成」。**

### 强制流程（Hard Rules）

任何 Agent 在完成「实现 / 修改 / 删除代码与配置」任务后，**必须**按顺序执行：

1. **确认正式仓库与正式分支**：明确当前所在仓库与正式分支（默认 `master` / `main`）。注意：`jczb-server` 与 `jczb-restraunt-mini` 是**两个独立 git 仓库，需分别提交**。
2. **只 stage 本任务文件**：使用 `git add <具体路径/文件>`（**禁止** `git add -A` / `git add .` / `git add -u` 无差别加）。本任务修改的文件才能进入暂存，**绝对禁止**夹带其它无关 WIP（如 `images/*.png` 等批量改动）。
3. **`git diff --cached` 复核**：确认暂存内容**仅**为本任务修改——无遗漏、无夹带、无密钥 / 构建产物。
4. **创建独立正式 commit**：commit message 描述本任务，不混入无关变更；一个任务一个 commit。
5. **给出完整 commit hash**：commit 后输出 40 位完整 SHA（`git rev-parse HEAD`）作为交付凭证。
6. **再查 `git status`**：确认本任务相关文件**没有未提交残留**（本任务文件应已 clean）。
7. **后续验收基于 clean committed HEAD**：编译、部署、运行验收必须基于包含该 commit 的已提交 HEAD；**不得**基于未提交工作区或临时 worktree 验收。

### 脏工作区处理

- 即使仓库原本有大量脏文件 / 无关 WIP，**也不能因此不提交本次修改**。
- 可以精确 `git add` 指定文件，或使用 clean worktree；但**本任务的正式实现最终必须进入主代码线**。
- 没有 commit hash，Agent **不得**汇报「任务完成」。
