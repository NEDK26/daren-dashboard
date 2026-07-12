# Batch Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add isolated Excel data batches with draft import, current/history switching, and batch-scoped data access.

**Architecture:** Store batch metadata in a new `batches` table and add `batch_id` directly to `darens` and `videos`. A small batch service resolves the selected batch and validates visibility; existing list, video, export, edit, confirmation, upload, and delete flows become batch-scoped. The React app keeps one selected batch and passes its ID to every data request.

**Tech Stack:** Node.js, Express, sql.js/SQLite, React 18, Ant Design, ExcelJS, node:test.

## Global Constraints

- Work directly on `master`; do not create a worktree.
- Do not add dependencies.
- Batch name format is `YYYY年MM月｜ 自定义标题`; name is globally unique.
- Keep at most one `draft` and one `current` batch; any number of `history` batches.
- Migrate existing rows into current batch `2026年05月｜ 数据核对`.
- A failed draft import rolls back rows and newly created users but leaves the draft batch retryable.
- A successful batch is immutable; current/history batches cannot be imported again or deleted.
- Use test-first development and run `npm test`, `npm run build`, and `git diff --check` before completion.

---

## File Structure

- `db.js`: create and migrate batch-aware SQLite tables.
- `services/batches.js`: validate batch names, resolve current/selected batches, and enforce visibility/editability.
- `routes/batches.js`: admin batch creation, listing, and draft deletion API.
- `routes/import.js`: draft-bound transactional import and current-batch activation.
- `routes/darens.js`, `routes/videos.js`, `routes/export.js`, `routes/upload.js`: batch-scoped reads and writes.
- `services/deleteDarens.js`: delete only selected batch records; retain a global user if their nickname remains in another batch.
- `server.js`: mount batch routes.
- `public/app.js`, `public/style.css`: batch picker, admin batch manager, and selected-batch requests.
- `test/batch-schema.test.js`, `test/batch-service.test.js`, `test/batch-routes.test.js`, `test/batch-ui.test.js`: regression coverage.

### Task 1: Batch schema and legacy migration

**Files:**
- Modify: `db.js`
- Create: `test/batch-schema.test.js`

**Interfaces:**
- Produces `migrateBatchSchema(db)` exported from `db.js`.
- Produces tables `batches(id, name, year, month, title, status, source_filename, created_at, imported_at)` and batch-aware `darens`/`videos`.

- [ ] **Step 1: Write the failing migration tests**

```js
test('migrates legacy rows into the initial current batch', async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  createLegacySchema(db);
  db.run("INSERT INTO darens (id, nickname) VALUES (1, 'alice')");
  db.run("INSERT INTO videos (work_id, daren_id, platform) VALUES ('work-1', 1, '快手')");

  migrateBatchSchema(db);

  assert.deepEqual(row(db, 'SELECT name, status FROM batches'), {
    name: '2026年05月｜ 数据核对', status: 'current'
  });
  assert.equal(row(db, 'SELECT batch_id FROM darens WHERE id = 1').batch_id, 1);
  assert.equal(row(db, 'SELECT batch_id FROM videos WHERE work_id = ?', ['work-1']).batch_id, 1);
});

test('allows a nickname and work id to repeat in different batches', async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  createBatchSchema(db);
  db.run("INSERT INTO batches (name, year, month, title, status) VALUES ('2026年05月｜ 数据核对', 2026, 5, '数据核对', 'current')");
  db.run("INSERT INTO batches (name, year, month, title, status) VALUES ('2026年06月｜ 数据核对', 2026, 6, '数据核对', 'history')");
  db.run("INSERT INTO darens (batch_id, nickname) VALUES (1, 'alice'), (2, 'alice')");
  db.run("INSERT INTO videos (batch_id, daren_id, platform, work_id) VALUES (1, 1, '快手', 'work-1'), (2, 2, '快手', 'work-1')");
  assert.equal(row(db, 'SELECT COUNT(*) AS count FROM darens').count, 2);
});
```

- [ ] **Step 2: Run the migration test to verify it fails**

Run: `node --test test/batch-schema.test.js`

Expected: FAIL because `migrateBatchSchema` and batch columns do not exist.

- [ ] **Step 3: Implement the batch schema and migration**

```js
const INITIAL_BATCH = {
  name: '2026年05月｜ 数据核对', year: 2026, month: 5,
  title: '数据核对', status: 'current'
};

function migrateBatchSchema(db = _db) {
  if (tableColumns(db, 'darens').some(column => column.name === 'batch_id')) return false;
  db.run('PRAGMA foreign_keys = OFF');
  try {
    db.run('BEGIN');
    createBatchesTable(db);
    db.run('INSERT INTO batches (name, year, month, title, status) VALUES (?, ?, ?, ?, ?)', Object.values(INITIAL_BATCH));
    const batchId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
    createDarensTable(db, 'darens_new');
    db.run(`INSERT INTO darens_new (id, batch_id, nickname, organization, content_type, category, total_plays, platform, is_main_platform, platform_nickname, homepage_url, account, followers, confirmation_status)
      SELECT id, ?, nickname, organization, content_type, category, total_plays, platform, is_main_platform, platform_nickname, homepage_url, account, followers, confirmation_status FROM darens`, [batchId]);
    createVideosTable(db, 'videos_new');
    db.run(`INSERT INTO videos_new (id, batch_id, work_id, daren_id, platform, title, tags, content_url, duration, publish_time, da_plays, da_likes, da_7d_plays, da_7d_likes, comments, saves, shares, violation_status, violation_desc, compliance_status, compliance_desc, is_node, node_name, is_hot, appeal, screenshot_plays, screenshot_likes, screenshot_7d_plays, screenshot_7d_likes, anomaly_data)
      SELECT id, ?, work_id, daren_id, platform, title, tags, content_url, duration, publish_time, da_plays, da_likes, da_7d_plays, da_7d_likes, comments, saves, shares, violation_status, violation_desc, compliance_status, compliance_desc, is_node, node_name, is_hot, appeal, screenshot_plays, screenshot_likes, screenshot_7d_plays, screenshot_7d_likes, anomaly_data FROM videos`, [batchId]);
    db.run('DROP TABLE videos');
    db.run('DROP TABLE darens');
    db.run('ALTER TABLE darens_new RENAME TO darens');
    db.run('ALTER TABLE videos_new RENAME TO videos');
    db.run('COMMIT');
  } catch (error) {
    try { db.run('ROLLBACK'); } catch {}
    throw error;
  } finally {
    db.run('PRAGMA foreign_keys = ON');
  }
  return true;
}
```

`createDarensTable` must use `UNIQUE(batch_id, nickname)`. `createVideosTable` must include `batch_id INTEGER NOT NULL`, foreign keys to both `batches(id)` and `darens(id)`, and `UNIQUE(batch_id, daren_id, platform, work_id)`. Fresh installations create the same batch-aware tables but no initial batch until migration is needed.

- [ ] **Step 4: Run the migration test to verify it passes**

Run: `node --test test/batch-schema.test.js`

Expected: PASS with both migration and duplicate-isolation tests.

- [ ] **Step 5: Commit**

```bash
git add db.js test/batch-schema.test.js
git commit -m "feat: add batch schema migration"
```

### Task 2: Batch service and management API

**Files:**
- Create: `services/batches.js`
- Create: `routes/batches.js`
- Modify: `server.js`
- Create: `test/batch-service.test.js`
- Create: `test/batch-routes.test.js`

**Interfaces:**
- `buildBatchName(year, month, title)` returns `YYYY年MM月｜ ${title.trim()}`.
- `resolveBatch(req, batchId)` returns the requested visible batch or `{ error, status }`.
- `GET /api/batches`, `POST /api/batches`, `DELETE /api/batches/:id`.

- [ ] **Step 1: Write failing tests for naming and lifecycle guards**

```js
test('builds the required batch name and rejects invalid input', () => {
  assert.equal(buildBatchName(2026, 5, '数据核对'), '2026年05月｜ 数据核对');
  assert.throws(() => buildBatchName(2026, 13, '数据核对'), /月份/);
  assert.throws(() => buildBatchName(2026, 5, ' '), /标题/);
});

test('only a draft batch may be deleted or imported', () => {
  assert.equal(isMutableBatch({ status: 'draft' }), true);
  assert.equal(isMutableBatch({ status: 'current' }), false);
  assert.equal(isMutableBatch({ status: 'history' }), false);
});

test('batch routes expose create, list, and draft deletion', () => {
  const source = fs.readFileSync(path.join(__dirname, '../routes/batches.js'), 'utf8');
  assert.match(source, /router\.post\('\/batches', requireAdmin/);
  assert.match(source, /router\.get\('\/batches', requireLogin/);
  assert.match(source, /router\.delete\('\/batches\/:id', requireAdmin/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/batch-service.test.js test/batch-routes.test.js`

Expected: FAIL because batch service and route files do not exist.

- [ ] **Step 3: Implement the service and routes**

```js
function buildBatchName(year, month, title) {
  const normalizedTitle = String(title || '').trim();
  if (!Number.isInteger(Number(year)) || Number(year) < 2000) throw new Error('年份不合法');
  if (!Number.isInteger(Number(month)) || Number(month) < 1 || Number(month) > 12) throw new Error('月份不合法');
  if (!normalizedTitle) throw new Error('请输入自定义标题');
  return `${year}年${String(month).padStart(2, '0')}月｜ ${normalizedTitle}`;
}

router.post('/batches', requireAdmin, (req, res) => {
  if (prepare("SELECT 1 FROM batches WHERE status = 'draft'").get()) return res.status(400).json({ error: '已有草稿批次' });
  const name = buildBatchName(Number(req.body.year), Number(req.body.month), req.body.title);
  const info = prepare('INSERT INTO batches (name, year, month, title, status) VALUES (?, ?, ?, ?, ?)')
    .run(name, Number(req.body.year), Number(req.body.month), String(req.body.title).trim(), 'draft');
  res.json({ ok: true, batch: prepare('SELECT * FROM batches WHERE id = ?').get(info.lastInsertRowid) });
});
```

`GET /batches` returns all current/history batches for admins, plus a draft for batch management; ordinary users receive current plus only history batches containing a same-nickname daren. `DELETE /batches/:id` rejects non-drafts and deletes only the draft metadata.

- [ ] **Step 4: Mount and verify routes**

Add `app.use('/api', require('./routes/batches'));` before data routes in `server.js`, then run:

Run: `node --test test/batch-service.test.js test/batch-routes.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/batches.js routes/batches.js server.js test/batch-service.test.js test/batch-routes.test.js
git commit -m "feat: add batch management api"
```

### Task 3: Draft-bound transactional import

**Files:**
- Modify: `routes/import.js`
- Create: `test/batch-import.test.js`

**Interfaces:**
- `POST /api/import` receives multipart `file` and `batchId`.
- A successful import changes the draft to `current` and any old current to `history` inside `withTransaction`.

- [ ] **Step 1: Write failing tests**

```js
test('import requires a draft batch and stores batch_id on both record types', () => {
  const source = fs.readFileSync(path.join(__dirname, '../routes/import.js'), 'utf8');
  assert.match(source, /const batchId = Number\(req\.body\.batchId\)/);
  assert.match(source, /WHERE id = \? AND status = 'draft'/);
  assert.match(source, /INSERT INTO darens \(batch_id, nickname/);
  assert.match(source, /INSERT INTO videos \(batch_id, work_id, daren_id/);
});

test('successful import switches the current batch atomically', () => {
  const source = fs.readFileSync(path.join(__dirname, '../routes/import.js'), 'utf8');
  assert.match(source, /UPDATE batches SET status = 'history' WHERE status = 'current'/);
  assert.match(source, /UPDATE batches SET status = 'current', source_filename = \?, imported_at = datetime\('now','localtime'\) WHERE id = \?/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/batch-import.test.js`

Expected: FAIL because import has no batch validation or batch column writes.

- [ ] **Step 3: Implement batch-bound import**

```js
const batchId = Number(req.body.batchId);
const batch = prepare("SELECT * FROM batches WHERE id = ? AND status = 'draft'").get(batchId);
if (!batch) return res.status(400).json({ error: '请选择可导入的草稿批次' });

withTransaction(() => {
  const darenCache = new Map(
    prepare('SELECT id, nickname FROM darens WHERE batch_id = ?').all(batchId).map(row => [row.nickname, row.id])
  );
  // Insert each daren with batch_id, then upsert each video using
  // ON CONFLICT(batch_id, daren_id, platform, work_id) DO UPDATE SET
  // title = excluded.title, tags = excluded.tags, content_url = excluded.content_url,
  // duration = excluded.duration, publish_time = excluded.publish_time,
  // da_plays = excluded.da_plays, da_likes = excluded.da_likes,
  // da_7d_plays = excluded.da_7d_plays, da_7d_likes = excluded.da_7d_likes,
  // comments = excluded.comments, saves = excluded.saves, shares = excluded.shares,
  // violation_status = excluded.violation_status, violation_desc = excluded.violation_desc,
  // compliance_status = excluded.compliance_status, compliance_desc = excluded.compliance_desc,
  // is_node = excluded.is_node, node_name = excluded.node_name, is_hot = excluded.is_hot,
  // appeal = excluded.appeal, screenshot_plays = excluded.screenshot_plays,
  // screenshot_likes = excluded.screenshot_likes, screenshot_7d_plays = excluded.screenshot_7d_plays,
  // screenshot_7d_likes = excluded.screenshot_7d_likes, anomaly_data = excluded.anomaly_data.
  prepare("UPDATE batches SET status = 'history' WHERE status = 'current'").run();
  prepare("UPDATE batches SET status = 'current', source_filename = ?, imported_at = datetime('now','localtime') WHERE id = ?")
    .run(req.file.originalname, batchId);
});
```

Keep workbook parsing outside the transaction. Move the cache construction inside it. On any error return a 400/500 error after `withTransaction` rolls back, leaving the draft row intact. Do not create any failure status.

- [ ] **Step 4: Run the import test to verify it passes**

Run: `node --test test/batch-import.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add routes/import.js test/batch-import.test.js
git commit -m "feat: import data into draft batches"
```

### Task 4: Batch-scope all data reads and mutations

**Files:**
- Modify: `routes/darens.js`
- Modify: `routes/videos.js`
- Modify: `routes/export.js`
- Modify: `routes/upload.js`
- Modify: `services/deleteDarens.js`
- Create: `test/batch-data-access.test.js`

**Interfaces:**
- Data routes accept `batchId`; omitted IDs resolve to the current batch.
- Only `current` batches are editable; `history` is read-only.
- Deletes operate on a single batch's daren records and only remove a user account when no other daren row has that nickname.

- [ ] **Step 1: Write failing batch-isolation tests**

```js
test('data routes apply batch_id to reads, summaries, and exports', () => {
  for (const file of ['routes/darens.js', 'routes/videos.js', 'routes/export.js']) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.match(source, /batchId/);
    assert.match(source, /batch_id/);
  }
});

test('history data cannot be edited and deletion preserves users in other batches', () => {
  const videos = fs.readFileSync(path.join(__dirname, '../routes/videos.js'), 'utf8');
  const upload = fs.readFileSync(path.join(__dirname, '../routes/upload.js'), 'utf8');
  const deletion = fs.readFileSync(path.join(__dirname, '../services/deleteDarens.js'), 'utf8');
  assert.match(videos, /status !== 'current'/);
  assert.match(upload, /status !== 'current'/);
  assert.match(deletion, /SELECT 1 FROM darens WHERE nickname = \? LIMIT 1/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/batch-data-access.test.js`

Expected: FAIL because current data routes have no batch checks.

- [ ] **Step 3: Add batch resolution and route guards**

```js
const batch = resolveBatch(req, req.query.batchId);
if (batch.error) return res.status(batch.status).json({ error: batch.error });

conditions.push('d.batch_id = ?');
params.push(batch.id);
```

For video, upload, daren update, confirmation, and delete handlers, join `batches` with the target daren/video and reject `status !== 'current'` for mutations. Keep admin history reads allowed; ordinary users may read current or their own history. Export adds `d.batch_id = ?` before category/search filters.

For `deleteDarensByIds`, query selected rows in the given batch, delete only their videos and darens, then delete a matching user only if `SELECT 1 FROM darens WHERE nickname = ? LIMIT 1` returns no remaining row. Continue to clean only screenshots referenced by the selected video rows.

- [ ] **Step 4: Run the batch access test to verify it passes**

Run: `node --test test/batch-data-access.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add routes/darens.js routes/videos.js routes/export.js routes/upload.js services/deleteDarens.js test/batch-data-access.test.js
git commit -m "feat: scope data operations by batch"
```

### Task 5: Batch-aware workbench and management interface

**Files:**
- Modify: `public/app.js`
- Modify: `public/style.css`
- Regenerate: `public/app.build.js`
- Create: `test/batch-ui.test.js`

**Interfaces:**
- `App` owns `batches` and `selectedBatch` state.
- `BatchPicker({ batches, value, onChange })` renders only selectable current/history batches.
- `BatchManagerPage({ onSelectBatch, onBack })` creates a draft, imports its Excel, and deletes the draft.

- [ ] **Step 1: Write failing UI contract tests**

```js
test('frontend keeps a selected batch and sends it with data requests', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  assert.match(app, /selectedBatch/);
  assert.match(app, /batchId/);
  assert.match(app, /BatchPicker/);
});

test('admin frontend exposes batch creation and draft import', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  assert.match(app, /BatchManagerPage/);
  assert.match(app, /创建批次/);
  assert.match(app, /草稿批次/);
  assert.match(app, /本期暂无数据/);
});
```

- [ ] **Step 2: Run the UI test to verify it fails**

Run: `node --test test/batch-ui.test.js`

Expected: FAIL because there is no batch state, picker, or manager.

- [ ] **Step 3: Implement selected-batch state and picker**

```jsx
const [batches, setBatches] = useState([]);
const [selectedBatch, setSelectedBatch] = useState(null);

const loadBatches = useCallback(async () => {
  const res = await api.get('/api/batches');
  setBatches(res.batches || []);
  setSelectedBatch(current => current && res.batches.some(batch => batch.id === current.id)
    ? current
    : res.current || null);
}, []);

function BatchPicker({ batches, value, onChange }) {
  return <Select value={value?.id} options={batches.map(batch => ({ value: batch.id, label: batch.name }))}
    onChange={id => onChange(batches.find(batch => batch.id === id))} />;
}
```

Load batches after login, show the picker in the logged-in header, and append `batchId=${selectedBatch.id}` to daren, video, and export calls. On regular-user data entry with no daren in the selected current batch, render `本期暂无数据` while leaving the picker available.

- [ ] **Step 4: Implement `BatchManagerPage`**

Use a small `Modal` form containing year, month, and title. On successful `POST /api/batches`, refresh `batches`; render the sole draft card with an Excel `Upload` calling `/api/import` with `batchId` in `FormData`; render a delete button calling `DELETE /api/batches/:id`. Move the existing import progress modal into this page. Keep current/history in a read-only table and let admins select them through the global picker.

- [ ] **Step 5: Scope existing pages**

Pass `selectedBatch` to `DarenList` and `VideoDetail`. Disable row editing, screenshots, and batch daren deletion when `selectedBatch.status === 'history'`. Keep top status cards and anomaly cards unchanged except that their data comes from batch-scoped responses. Add a `批次管理` button for admins next to settings/audit.

- [ ] **Step 6: Run tests and build**

Run: `node --test test/batch-ui.test.js`

Expected: PASS.

Run: `npm run build`

Expected: exit code 0 and regenerated `public/app.build.js`.

- [ ] **Step 7: Commit**

```bash
git add public/app.js public/style.css public/app.build.js test/batch-ui.test.js
git commit -m "feat: add batch selection and management ui"
```

### Task 6: Full regression verification

**Files:**
- Modify: any test file whose assertions must reference batch-aware SQL or UI copy.

- [ ] **Step 1: Run the entire suite**

Run: `npm test`

Expected: every existing regression test and each batch test passes.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: exit code 0.

- [ ] **Step 3: Check the worktree**

Run: `git diff --check`

Expected: no output and exit code 0.

- [ ] **Step 4: Commit any verification fixes**

```bash
git add db.js services routes public test
git commit -m "test: verify batch management"
```

## Self-Review

- Spec coverage: Tasks 1-5 cover schema migration, single-draft lifecycle, transactional import, current/history transition, global user access, selected-batch reads, batch export, batch-scoped metrics, and React management/switching. Task 6 covers regression verification.
- No placeholders: all tasks name exact files, commands, tests, and expected behavior.
- Naming consistency: `batchId`, `batch_id`, `selectedBatch`, `draft`, `current`, and `history` are used consistently across tasks.
