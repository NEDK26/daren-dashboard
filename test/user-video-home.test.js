const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('users enter data reconciliation without a workbench chooser', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

  assert.doesNotMatch(app, /function HomePage/);
  assert.doesNotMatch(app, /请选择要核对的内容/);
  assert.doesNotMatch(app, /function FeePlaceholderPage/);
  assert.match(app, /useState\('home'\)/);
  assert.match(app, /if \(page !== 'home' \|\| !batchesLoaded\) return/);
});

test('workspace navigation avoids decorative character badges', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../public/style.css'), 'utf8');

  assert.doesNotMatch(app, /workbench-card-icon/);
  assert.doesNotMatch(css, /\.workbench-card-icon/);
  assert.doesNotMatch(app, /workspace-nav-icon/);
  assert.doesNotMatch(css, /\.workspace-nav-icon/);
});

test('admins can manage batches before any data batch is published', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

  assert.match(app, />批次管理/);
  assert.match(app, /if \(!selectedBatch\) \{\s+if \(user\.role === 'admin'\) return setPage\('batches'\)/);
});
