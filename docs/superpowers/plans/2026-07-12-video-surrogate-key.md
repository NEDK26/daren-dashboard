# Video Surrogate Key Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 允许共创达人共享同一作品 ID，同时让编辑、截图上传和前端定位使用内部视频 ID。

**Architecture:** SQLite 启动时检测旧版 `videos.work_id` 主键并重建为 `id` 自增主键，保留字段和数据；`(daren_id, platform, work_id)` 作为业务去重键。API 和前端用 `id` 定位，Excel 导入导出继续使用 `work_id`。

**Tech Stack:** Node.js、Express、sql.js、SQLite、React 18、Node test runner。

## Global Constraints

- 不改变 Excel 的“作品ID”列名和导出格式。
- 同一达人、同一平台、同一作品重复导入必须被跳过。
- 不同达人即使作品 ID 相同也必须保留独立记录。
- 迁移失败必须阻止服务继续启动，不得静默使用半迁移结构。
- 保留当前未提交用户改动，不使用破坏性 git 操作。

### Task 1: Add failing data-model regression tests

**Files:**
- Create: `test/video-surrogate-key.test.js`
- Modify: `db.js` only after the test is observed failing

- [x] **Step 1: Write the failing test**

测试直接用 sql.js 创建旧版表并验证迁移后结构：相同作品不同达人可插入，完全相同的达人/平台/作品被唯一约束拦截。

- [x] **Step 2: Run the test to verify it fails**

Run: `node --test test/video-surrogate-key.test.js`

Expected: FAIL because `videos.work_id` is currently the primary key and the migration helper does not exist.

### Task 2: Implement SQLite migration and schema

**Files:**
- Modify: `db.js:50-82, initSchema`
- Test: `test/video-surrogate-key.test.js`

- [x] **Step 1: Implement `migrateVideosTable()`**

检测 `PRAGMA table_info(videos)` 是否存在名为 `id` 且为主键；旧结构下执行 `BEGIN`，创建 `videos_new`（`id INTEGER PRIMARY KEY AUTOINCREMENT`、原字段、`UNIQUE(daren_id, platform, work_id)`），按原字段复制数据，删除旧表并重命名，重建索引，提交；任意异常回滚并重新抛出。

- [x] **Step 2: Call migration before indexes are created**

在 `initSchema()` 创建基础表后调用迁移，使已有 `data.db` 和全新数据库都得到同一结构。

- [x] **Step 3: Run the focused test**

Run: `node --test test/video-surrogate-key.test.js`

Expected: PASS.

### Task 3: Switch import, API, upload, audit, and frontend identifiers

**Files:**
- Modify: `routes/import.js`
- Modify: `routes/videos.js`
- Modify: `routes/upload.js`
- Modify: `public/app.js`
- Regenerate: `public/app.build.js` with `npm run build`
- Modify: `CONTEXT.md`, `AGENTS.md`, `CLAUDE.md`

- [x] **Step 1: Update import insert and conflict handling**

保留 `work_id` 为导入业务值，使用新唯一约束处理冲突，不再假设它是主键；返回的 `imported/skipped` 语义保持不变。

- [x] **Step 2: Update video and upload routes**

将路由参数命名为 `id`，使用 `WHERE v.id = ?` 查询和更新；审计 `record_id` 记录内部 ID 字符串。

- [x] **Step 3: Update frontend row and edit state**

将 `editingKey`、`rowKey`、保存 URL、截图上传 URL 改为 `record.id`；`work_id` 继续作为展示/导入导出字段。

- [x] **Step 4: Regenerate browser bundle and docs**

运行 `npm run build`，同步项目文档中的表结构和接口描述。

### Task 4: Add endpoint isolation tests and verify all behavior

**Files:**
- Modify: `test/video-surrogate-key.test.js`
- Modify: `test/screenshot-edit-permissions.test.js` if assertions refer to old key

- [x] **Step 1: Add tests for update isolation**

创建两个不同达人、相同 `work_id` 的视频，按第一个内部 ID 更新，断言第二条记录未变化；按不存在 ID 返回无记录条件。

- [x] **Step 2: Add tests for frontend identifier usage**

断言源码和编译产物使用 `rowKey="id"`、`record.id`，并保留 `record.work_id` 作为业务字段展示。

- [x] **Step 3: Run complete verification**

Run: `npm test && npm run build && git diff --check`

Expected: all tests pass, Babel build exits 0, diff check has no output.
