const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

let batches;
try {
  batches = require('../services/batches');
} catch {
  batches = {};
}

test('builds the required batch name and validates each input', () => {
  assert.equal(typeof batches.buildBatchName, 'function');
  assert.equal(batches.buildBatchName(2026, 5, '数据核对'), '2026年05月｜ 数据核对');
  assert.throws(() => batches.buildBatchName(2026, 13, '数据核对'), /月份/);
  assert.throws(() => batches.buildBatchName(2026, 5, ' '), /标题/);
});

test('only draft batches are mutable', () => {
  assert.equal(typeof batches.isMutableBatch, 'function');
  assert.equal(batches.isMutableBatch({ status: 'draft' }), true);
  assert.equal(batches.isMutableBatch({ status: 'current' }), false);
  assert.equal(batches.isMutableBatch({ status: 'history' }), false);
});

test('batch routes expose login-protected list and admin-only create/delete', () => {
  const route = fs.readFileSync(path.join(__dirname, '../routes/batches.js'), 'utf8');
  assert.match(route, /router\.get\('\/batches', requireLogin/);
  assert.match(route, /router\.post\('\/batches', requireAdmin/);
  assert.match(route, /router\.delete\('\/batches\/:id', requireAdmin/);
  assert.match(route, /已有草稿批次/);
});
