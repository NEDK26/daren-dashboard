const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');

const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const batch = fs.readFileSync(path.join(__dirname, '../public/batch-components.jsx'), 'utf8');
const daren = fs.readFileSync(path.join(__dirname, '../public/daren-components.jsx'), 'utf8');

test('frontend owns selected batch state and sends batchId with data requests', () => {
  assert.match(app, /selectedBatch/);
  assert.match(app, /batchId/);
  assert.match(batch, /BatchPicker/);
});

test('admin frontend exposes batch creation, draft import, and deletion', () => {
  assert.match(batch, /BatchManagerPage/);
  assert.match(batch, /创建批次/);
  assert.match(batch, /草稿批次/);
  assert.match(batch, /批次管理/);
  assert.match(batch, /发布批次/);
  assert.match(batch, /撤销发布/);
  assert.match(batch, /撤销后不会自动发布其他批次，需要时请手动发布/);
  assert.doesNotMatch(batch, /恢复查看上一个已发布批次/);
});

test('regular users receive an empty-current-batch state and history becomes read-only', () => {
  assert.match(app, /本期暂无数据/);
  assert.match(daren, /batch\?\.status === 'history'/);
});
