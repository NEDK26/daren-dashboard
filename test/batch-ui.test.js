const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');

const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

test('frontend owns selected batch state and sends batchId with data requests', () => {
  assert.match(app, /selectedBatch/);
  assert.match(app, /batchId/);
  assert.match(app, /BatchPicker/);
});

test('admin frontend exposes batch creation, draft import, and deletion', () => {
  assert.match(app, /BatchManagerPage/);
  assert.match(app, /创建批次/);
  assert.match(app, /草稿批次/);
  assert.match(app, /批次管理/);
});

test('regular users receive an empty-current-batch state and history becomes read-only', () => {
  assert.match(app, /本期暂无数据/);
  assert.match(app, /batch\?\.status === 'history'/);
});
