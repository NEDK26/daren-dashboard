# 达人确认状态 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让普通用户确认本人视频数据，并让管理员在达人列表查看“待确认 / 已确认 / 已提交申诉”状态。

**Architecture:** 状态保存在 `darens.confirmation_status`，默认“待确认”。后端在任何视频字段或截图实际变更时重置该状态；普通用户通过受归属校验的确认接口把状态提交为“已确认”或“已提交申诉”。前端根据保存或上传的结果决定是否弹出提交修改确认框，管理员列表只读展示状态。

**Tech Stack:** Node.js、Express、sql.js、React 18、Ant Design、node:test。

## Global Constraints

- 不新增依赖；继续使用现有 Express、sql.js、Ant Design 与 `node:test`。
- 状态仅属于达人，取值仅为“待确认”“已确认”“已提交申诉”。
- 普通用户只能操作 `nickname = display_name` 的达人；管理员只查看状态。
- 所有业务源码改动后运行 `npm run build` 更新 `public/app.build.js`。

---

### Task 1: 数据库状态字段与确认接口

**Files:**
- Modify: `db.js:24-41,104-105`
- Modify: `routes/darens.js:8-48,50-80`
- Create: `test/daren-confirmation-status.test.js`

**Interfaces:**
- Produces: `darens.confirmation_status`，默认值“待确认”。
- Produces: `PUT /api/darens/:id/confirmation`，请求体 `{ status: '已确认' | '已提交申诉' }`，返回 `{ ok: true, status }`。

- [ ] **Step 1: 写失败测试**

```js
test('confirmation status has the three allowed states and a user can only submit their own daren', () => {
  const source = fs.readFileSync(path.join(__dirname, '../routes/darens.js'), 'utf8');
  const schema = fs.readFileSync(path.join(__dirname, '../db.js'), 'utf8');
  assert.match(schema, /confirmation_status TEXT NOT NULL DEFAULT '待确认'/);
  assert.match(source, /router\.put\('\/darens\/:id\/confirmation', requireLogin,/);
  assert.match(source, /\['已确认', '已提交申诉'\]/);
  assert.match(source, /daren\.nickname !== req\.session\.user\.display_name/);
});
```

- [ ] **Step 2: 验证测试失败**

Run: `npm test -- test/daren-confirmation-status.test.js`

Expected: FAIL，因为状态字段和确认接口尚不存在。

- [ ] **Step 3: 最小实现**

在 `darens` 建表 SQL 增加：

```js
confirmation_status TEXT NOT NULL DEFAULT '待确认'
```

并在 `initSchema()` 中增加兼容迁移：

```js
try { _db.run("ALTER TABLE darens ADD COLUMN confirmation_status TEXT NOT NULL DEFAULT '待确认'"); } catch {}
```

在达人列表 SELECT 中返回 `d.confirmation_status`。在 `routes/darens.js` 添加确认接口：读取目标达人，拒绝不存在目标、非本人普通用户和不在允许集合内的状态；更新状态，并通过 `auditLog` 写入 `darens` 的 `confirmation_status` 变更。

- [ ] **Step 4: 验证通过**

Run: `npm test -- test/daren-confirmation-status.test.js`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add db.js routes/darens.js test/daren-confirmation-status.test.js
git commit -m "feat: add daren confirmation status"
```

### Task 2: 修改视频或截图时重置状态

**Files:**
- Modify: `routes/videos.js:30-59`
- Modify: `routes/upload.js:17-45`
- Modify: `test/daren-confirmation-status.test.js`

**Interfaces:**
- Consumes: `darens.confirmation_status`。
- Produces: 实际保存视频字段或实际上传截图后，所属达人状态为“待确认”。

- [ ] **Step 1: 扩展失败测试**

```js
test('video saves and screenshot uploads reset the owning daren to pending confirmation', () => {
  const videos = fs.readFileSync(path.join(__dirname, '../routes/videos.js'), 'utf8');
  const upload = fs.readFileSync(path.join(__dirname, '../routes/upload.js'), 'utf8');
  const reset = /UPDATE darens SET confirmation_status = '待确认' WHERE id = \?/;
  assert.match(videos, reset);
  assert.match(upload, reset);
});
```

- [ ] **Step 2: 验证测试失败**

Run: `npm test -- test/daren-confirmation-status.test.js`

Expected: FAIL，因为两个写入路径尚未重置达人状态。

- [ ] **Step 3: 最小实现**

在 `routes/videos.js` 仅当 `changes` 非空时，更新 `video.daren_id` 对应达人为“待确认”，再返回成功结果。截图路由的查询补充 `v.daren_id`，仅在成功写入截图后更新同一达人为“待确认”。两处均使用既有 `prepare(...).run(...)`，保证 sql.js 持久化。

- [ ] **Step 4: 验证通过**

Run: `npm test -- test/daren-confirmation-status.test.js`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add routes/videos.js routes/upload.js test/daren-confirmation-status.test.js
git commit -m "feat: reset confirmation after data changes"
```

### Task 3: 用户确认流程与管理员状态列

**Files:**
- Modify: `public/app.js:120-210,215-390`
- Modify: `public/app.build.js`
- Modify: `test/daren-confirmation-ui.test.js`

**Interfaces:**
- Consumes: 达人列表的 `confirmation_status` 与确认接口。
- Produces: 用户状态标签、无误确认按钮、修改确认弹窗、管理员状态列。

- [ ] **Step 1: 写失败测试**

```js
test('confirmation UI shows the three statuses and submits the correct user actions', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  assert.match(app, /title: '状态', dataIndex: 'confirmation_status'/);
  assert.match(app, /确认数据无误/);
  assert.match(app, /是否确认提交修改/);
  assert.match(app, /'已确认'/);
  assert.match(app, /'已提交申诉'/);
});
```

- [ ] **Step 2: 验证测试失败**

Run: `npm test -- test/daren-confirmation-ui.test.js`

Expected: FAIL，因为当前前端没有状态列、确认按钮或确认弹窗。

- [ ] **Step 3: 最小实现**

在 `DarenList` 的管理员列定义中增加只读“状态”列，用 `Tag` 展示三种中文状态。在 `VideoDetail` 增加当前状态 state，并从当前 `daren.confirmation_status` 初始化；新增确认请求函数：普通用户点击“确认数据无误”提交“已确认”。

在 `save(workId)` 的成功分支中，先刷新数据，再用 `Modal.confirm` 提示“是否确认提交修改”；确认时提交“已提交申诉”，取消时保留“待确认”。将截图上传逻辑提取为成功回调，在上传成功后复用同一确认弹窗。管理员不显示确认按钮和确认弹窗。

- [ ] **Step 4: 构建并验证通过**

Run: `npm test -- test/daren-confirmation-ui.test.js && npm run build`

Expected: 测试 PASS，Babel 成功更新 `public/app.build.js`。

- [ ] **Step 5: 提交**

```bash
git add public/app.js public/app.build.js test/daren-confirmation-ui.test.js
git commit -m "feat: add confirmation submission UI"
```

### Task 4: 回归验证与文档收尾

**Files:**
- Modify: `CONTEXT.md:44-46`（仅在术语与实现不一致时）
- Verify: `test/*.test.js`

**Interfaces:**
- Consumes: 前三项的数据库、路由和前端行为。
- Produces: 全量回归验证记录。

- [ ] **Step 1: 检查源码和文档一致性**

确认数据库默认值、三种状态文案、确认接口允许值、状态重置路径和前端标签文案均为“待确认 / 已确认 / 已提交申诉”。如有差异，仅修正 `CONTEXT.md` 的术语定义。

- [ ] **Step 2: 运行完整验证**

Run: `npm test && npm run build && git diff --check`

Expected: 所有测试通过、Babel 构建成功、无空白错误。

- [ ] **Step 3: 提交收尾**

```bash
git add CONTEXT.md
git commit -m "docs: align confirmation status terminology"
```
