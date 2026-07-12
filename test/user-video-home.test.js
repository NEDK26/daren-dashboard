const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('users enter a two-card workbench before opening data reconciliation', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

  assert.match(app, /function HomePage/);
  assert.match(app, /本期数据核对/);
  assert.match(app, /本期费用核对/);
  assert.match(app, /功能正在开发中/);
  assert.match(app, /useState\('home'\)/);
  assert.match(app, /user\.role === 'admin' \? '达人数据管理' : '达人数据'/);
});

test('admins can manage batches before any data batch is published', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

  assert.match(app, /function HomePage\(\{ onDataCheck \}\)/);
  assert.match(app, /label: '批次管理'/);
  assert.match(app, /if \(!selectedBatch\) \{\s+if \(user\.role === 'admin'\) return setPage\('batches'\)/);
});
