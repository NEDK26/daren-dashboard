const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const section = (start, end) => app.slice(app.indexOf(start), app.indexOf(end));

test('page toolbars keep local actions and remove duplicated primary navigation', () => {
  const home = section('function HomePage', 'function BatchManagerPage');
  const darens = section('function DarenList', 'function VideoDetail');
  const videos = section('function VideoDetail', 'const allColumns');

  assert.doesNotMatch(home, /批次管理/);
  assert.doesNotMatch(darens, /功能首页|onBatchManagement|onSettings|onAudit/);
  assert.doesNotMatch(videos, /功能首页/);
  assert.match(darens, /导出/);
  assert.doesNotMatch(darens, /删除选中/);
  assert.match(videos, /← 返回/);
});
