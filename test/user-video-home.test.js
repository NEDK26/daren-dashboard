const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('users enter a two-card workbench before opening data reconciliation', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

  assert.match(app, /function HomePage\(\{ onDataCheck, onFeeCheck \}\)/);
  assert.match(app, /本期数据核对/);
  assert.match(app, /本期费用核对/);
  assert.match(app, /function FeePlaceholderPage/);
  assert.match(app, /useState\('home'\)/);
  assert.match(app, /user\.role === 'admin' \? '达人数据管理' : '达人数据'/);
});

test('workbench cards start with content instead of decorative character badges', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../public/style.css'), 'utf8');

  assert.doesNotMatch(app, /workbench-card-icon/);
  assert.doesNotMatch(css, /\.workbench-card-icon/);
  assert.match(css, /\.workbench-card\s+\.ant-card-body\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column/s);
  assert.match(css, /\.workbench-card-action\s*\{[^}]*margin-top:\s*auto/s);
});

test('admins can manage batches before any data batch is published', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

  assert.match(app, /function HomePage\(\{ onDataCheck, onFeeCheck \}\)/);
  assert.match(app, /label: '批次'/);
  assert.match(app, /if \(!selectedBatch\) \{\s+if \(user\.role === 'admin'\) return setPage\('batches'\)/);
});
