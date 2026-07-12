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
