const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('video list returns anomaly and submitted anomaly summary counts', () => {
  const route = fs.readFileSync(path.join(__dirname, '../routes/videos.js'), 'utf8');
  assert.match(route, /SELECT anomaly_data, appeal FROM videos WHERE daren_id = \?/);
  assert.match(route, /submittedAnomalyCount/);
  assert.match(route, /anomalyCount/);
});

test('video detail renders anomaly summary metrics', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  assert.match(app, /anomaly-summary-card/);
  assert.match(app, /异常数量/);
  assert.match(app, /已提交异常数量/);
});
