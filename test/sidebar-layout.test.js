const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../public/style.css'), 'utf8');

test('desktop workspace uses a persistent light sidebar with grouped work areas', () => {
  assert.match(app, /function WorkspaceSidebar/);
  assert.match(app, /本期工作台/);
  assert.match(app, /基础工作台/);
  assert.match(app, /达人账号管理/);
  assert.match(css, /\.workspace-shell\s*\{/);
  assert.match(css, /\.workspace-sidebar\s*\{/);
  assert.match(css, /position:\s*sticky/);
  assert.match(css, /grid-template-columns:\s*200px minmax\(0,\s*1fr\)/);
});

test('fee reconciliation is a muted clickable preview without an inline status label', () => {
  assert.match(app, /navButton\('fees', '费用核对', onFeeCheck, true\)/);
  assert.match(css, /\.workspace-nav-item\.muted\s*\{/);
  assert.doesNotMatch(app, /<small>暂未开启<\/small>/);
  assert.match(app, /message\.info\('费用核对暂未开启'\)/);
});

test('sidebar collapses into a compact mobile header', () => {
  assert.match(app, /mobile-workspace-header/);
  assert.match(css, /@media[^}]*max-width:[^}]*\.workspace-sidebar/s);
});

test('creator navigation stays focused on personal work and account settings', () => {
  assert.match(app, /isAdmin \? '本期工作台' : '我的工作台'/);
  assert.match(app, /isAdmin \? '数据核对' : '本期数据'/);
  assert.match(app, />账户设置</);
});

test('workspace navigation uses labels without decorative character icons', () => {
  assert.doesNotMatch(app, /workspace-nav-icon/);
  assert.doesNotMatch(css, /\.workspace-nav-icon/);
});

test('sidebar keeps only primary work areas while contextual tools stay out of navigation', () => {
  assert.doesNotMatch(app, /navButton\('batches', '批次管理'/);
  assert.doesNotMatch(app, /navButton\('settings', '核对设置'/);
  assert.match(app, /navButton\('audit', isAdmin \? '操作记录' : '我的记录'/);
  assert.match(app, /!isAdmin && navButton\('batch-switch', '切换批次'/);
});

test('batch management and reconciliation settings are actions inside data reconciliation', () => {
  assert.match(app, /className="admin-review-batch-picker"[\s\S]*onClick=\{onOpenBatches\}[\s\S]*?>批次管理<[\s\S]*onClick=\{onOpenSettings\}[\s\S]*?>核对设置</);
});

test('login routes directly into role data instead of a workbench card chooser', () => {
  assert.doesNotMatch(app, /function HomePage/);
  assert.doesNotMatch(app, /请选择要核对的内容/);
  assert.match(app, /const \[batchesLoaded, setBatchesLoaded\] = useState\(false\)/);
  assert.match(app, /if \(page !== 'home' \|\| !batchesLoaded\) return/);
});
