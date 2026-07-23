const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const video = fs.readFileSync(path.join(__dirname, '../public/video-components.jsx'), 'utf8');
const darens = fs.readFileSync(path.join(__dirname, '../routes/darens.js'), 'utf8');
const videos = fs.readFileSync(path.join(__dirname, '../routes/videos.js'), 'utf8');

test('daren list aggregates anomaly data in one query and exposes pagination', () => {
  assert.match(darens, /SELECT daren_id, anomaly_data FROM videos/);
  assert.match(darens, /LIMIT \? OFFSET \?/);
  assert.match(darens, /total/);
});

test('video list exposes server pagination', () => {
  assert.match(videos, /COUNT\(\*\) AS total FROM videos/);
  assert.match(videos, /LIMIT \? OFFSET \?/);
  assert.match(videos, /pageSize/);
});

test('frontend debounces filters and cancels stale requests', () => {
  assert.match(video, /AbortController/);
  assert.match(video, /setTimeout\(/);
  assert.match(video, /pageSize/);
});

test('admin list does not render deletion controls', () => {
  assert.doesNotMatch(app, /删除选中/);
  assert.doesNotMatch(app, /render: \(_, record\) => <Button danger size="small" onClick=\{\(\) => handleDelete\(\[record\]\)\}>删除<\/Button>/);
});
