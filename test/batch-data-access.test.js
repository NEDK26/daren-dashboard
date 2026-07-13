const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('daren, video, and export queries accept a batch id and filter batch_id', () => {
  for (const file of ['routes/darens.js', 'routes/videos.js', 'routes/export.js']) {
    const source = read(file);
    assert.match(source, /batchId/);
    assert.match(source, /batch_id/);
    assert.match(source, /getVisibleBatch/);
  }
});

test('history batches cannot be mutated through video, daren, or screenshot routes', () => {
  const darens = read('routes/darens.js');
  const videos = read('routes/videos.js');
  const upload = read('routes/upload.js');
  assert.match(darens, /batch_status !== 'current'/);
  assert.match(videos, /batch_status !== 'current'/);
  assert.match(upload, /batch_status !== 'current'/);
});

test('batch daren deletion preserves users that still have records in other batches', () => {
  const deletion = read('services/deleteDarens.js');
  assert.match(deletion, /batch_id = \?/);
  assert.match(deletion, /SELECT 1 FROM darens WHERE nickname = \? LIMIT 1/);
  assert.match(deletion, /batchId/);
});

test('category filter options come from distinct non-empty categories in the selected batch', () => {
  const route = read('routes/darens.js');
  const app = read('public/app.js');
  assert.match(route, /router\.get\('\/daren-categories', requireAdmin/);
  assert.match(route, /SELECT category FROM darens WHERE batch_id = \? AND TRIM\(category\) != '' GROUP BY category ORDER BY MIN\(id\)/);
  assert.match(app, /api\.get\('\/api\/daren-categories\?batchId=' \+ batch\.id\)/);
  assert.match(app, /isAdmin && <Select placeholder="达人分类"/);
  assert.doesNotMatch(app, /const categoryOptions = \[/);
});

test('content type filter options come from the selected batch and filter list and export', () => {
  const darens = read('routes/darens.js');
  const exportRoute = read('routes/export.js');
  const app = read('public/app.js');
  assert.match(darens, /router\.get\('\/daren-content-types', requireAdmin/);
  assert.match(darens, /SELECT content_type FROM darens WHERE batch_id = \? AND TRIM\(content_type\) != '' GROUP BY content_type ORDER BY MIN\(id\)/);
  assert.match(darens, /if \(contentType\) \{ conditions\.push\('d\.content_type = \?'\); params\.push\(contentType\); \}/);
  assert.match(exportRoute, /if \(contentType\) \{ conditions\.push\('d\.content_type = \?'\); params\.push\(contentType\); \}/);
  assert.match(app, /api\.get\('\/api\/daren-content-types\?batchId=' \+ batch\.id\)/);
  assert.match(app, /isAdmin && <Select placeholder="内容类型"/);
});
