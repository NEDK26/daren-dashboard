# Table Readability and Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users read truncated table text and select 20, 50, or 100 rows per page.

**Architecture:** Reuse Ant Design `Tooltip` and Table pagination. Each existing paginated page owns a `pageSize` state and sends it through the current list API; no new backend route or dependency is required.

**Tech Stack:** React 18, Ant Design 5, node:test.

## Global Constraints

- Change desktop-first tables only; mobile UI optimisation is out of scope.
- Keep fixed-width truncated columns and reveal their full value on hover.
- Support exactly `20`, `50`, and `100` rows per page.
- Changing page size returns to page one and updates the existing request limit/offset.
- Do not add dependencies.

---

## File Structure

- `public/app.js`: tooltip renderers and page-size state for the daren, video, and audit tables.
- `test/table-usability.test.js`: source-level regression checks for the tooltip and pagination contract.

### Task 1: Cover the table contract

**Files:**
- Create: `test/table-usability.test.js`

**Interfaces:**
- Produces a regression test that requires `Tooltip` usage for long video text and `showSizeChanger`, `pageSizeOptions`, and a page-size request parameter.

- [ ] **Step 1: Write the failing test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

test('tables reveal truncated text and let users choose page size', () => {
  assert.match(app, /const PAGE_SIZE_OPTIONS = \['20', '50', '100'\]/);
  assert.match(app, /const textTooltip = value => value \? <Tooltip title=\{value\}>/);
  assert.match(app, /render: textTooltip/);
  assert.match(app, /showSizeChanger: true/);
  assert.match(app, /pageSizeOptions: PAGE_SIZE_OPTIONS/);
  assert.match(app, /params\.set\('pageSize', pageSize\)/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/table-usability.test.js`

Expected: FAIL because the shared page-size options and long-text tooltip renderer do not exist.

### Task 2: Implement readable text and selectable page sizes

**Files:**
- Modify: `public/app.js`
- Test: `test/table-usability.test.js`

**Interfaces:**
- `PAGE_SIZE_OPTIONS` is `['20', '50', '100']`.
- `DarenList`, `VideoDetail`, and `AuditPage` each send their own `pageSize` state to the existing APIs.

- [ ] **Step 1: Add the shared options and a minimal text renderer**

```js
const PAGE_SIZE_OPTIONS = ['20', '50', '100'];
const textTooltip = value => value ? <Tooltip title={value}><span>{value}</span></Tooltip> : '-';
```

Use `render: textTooltip` on truncated text-only columns: video title, tags, violation description, compliance description, node name, appeal, audit values, and daren text columns that are truncated.

- [ ] **Step 2: Add page-size state to each page and use it in requests**

```js
const [pageSize, setPageSize] = useState(20);

const handlePageSizeChange = (_, nextPageSize) => {
  setPage(1);
  setPageSize(nextPageSize);
};

params.set('pageSize', pageSize);
```

For `AuditPage`, replace the fixed query with:

```js
api.get('/api/audit-logs?limit=' + pageSize + '&offset=' + ((page - 1) * pageSize));
```

Include `pageSize` in every affected `useCallback` dependency list.

- [ ] **Step 3: Configure all three Table paginations**

```js
pagination={{
  total,
  current: page,
  pageSize,
  showSizeChanger: true,
  pageSizeOptions: PAGE_SIZE_OPTIONS,
  onChange: setPage,
  onShowSizeChange: handlePageSizeChange
}}
```

- [ ] **Step 4: Run focused test to verify it passes**

Run: `node --test test/table-usability.test.js`

Expected: PASS.

- [ ] **Step 5: Run full verification**

Run: `npm test && npm run build && git diff --check`

Expected: all tests pass, Babel rewrites `public/app.build.js`, and whitespace validation is clean.

- [ ] **Step 6: Commit**

```bash
git add public/app.js public/app.build.js test/table-usability.test.js
git commit -m "feat: improve table readability and pagination"
```
