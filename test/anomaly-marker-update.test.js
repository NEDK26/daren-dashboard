const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('video route exposes an admin-only screenshot anomaly update endpoint', () => {
  const route = fs.readFileSync(path.join(__dirname, '../routes/videos.js'), 'utf8');
  assert.match(route, /router\.put\('\/videos\/:id\/anomaly-markers', requireAdmin/);
  assert.match(route, /updateScreenshotAnomalies/);
});

test('video detail offers a fixed row action and screenshot anomaly drawer', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  assert.match(app, /异常标记/);
  assert.match(app, /anomaly-markers/);
  assert.match(app, /<Drawer/);
  assert.match(app, /fixed:\s*'right'/);
  for (const field of ['screenshot_plays', 'screenshot_likes', 'screenshot_7d_plays', 'screenshot_7d_likes']) {
    assert.match(app, new RegExp(field));
  }
});

test('screenshot columns expose data indexes so anomaly styling reaches the cells', () => {
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  for (const field of ['screenshot_plays', 'screenshot_likes', 'screenshot_7d_plays', 'screenshot_7d_likes']) {
    assert.match(app, new RegExp(`dataIndex: '${field}'`));
  }
});

test('screenshot anomaly update service exists', () => {
  assert.ok(fs.existsSync(path.join(__dirname, '../services/anomalyMarkers.js')));
});

test('updates only selected screenshot markers and preserves other anomaly markers', (t) => {
  if (!fs.existsSync(path.join(__dirname, '../services/anomalyMarkers.js'))) return t.skip('service not implemented');
  const { updateScreenshotAnomalies } = require('../services/anomalyMarkers');
  const result = updateScreenshotAnomalies(
    JSON.stringify({ title: '数据异常', screenshot_plays: '数据异常' }),
    ['screenshot_likes']
  );

  assert.deepEqual(JSON.parse(result.anomalyData), {
    title: '数据异常',
    screenshot_likes: '数据异常'
  });
  assert.deepEqual(result.changes, {
    screenshot_plays: { old: '数据异常', new: '' },
    screenshot_likes: { old: '', new: '数据异常' }
  });
});

test('only the four screenshot fields can be changed', (t) => {
  if (!fs.existsSync(path.join(__dirname, '../services/anomalyMarkers.js'))) return t.skip('service not implemented');
  const { updateScreenshotAnomalies, SCREENSHOT_ANOMALY_FIELDS } = require('../services/anomalyMarkers');
  assert.deepEqual(SCREENSHOT_ANOMALY_FIELDS, [
    'screenshot_plays',
    'screenshot_likes',
    'screenshot_7d_plays',
    'screenshot_7d_likes'
  ]);

  assert.throws(
    () => updateScreenshotAnomalies('{}', ['title']),
    /截图异常字段无效/
  );
});
