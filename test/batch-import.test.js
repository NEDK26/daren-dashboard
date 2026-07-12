const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '../routes/import.js'), 'utf8');

test('import requires a draft batch and writes batch ids', () => {
  assert.match(source, /const batchId = Number\(req\.body\.batchId\)/);
  assert.match(source, /WHERE id = \? AND status = 'draft'/);
  assert.match(source, /INSERT INTO darens \(batch_id, nickname/);
  assert.match(source, /INSERT INTO videos \(batch_id, work_id, daren_id/);
});

test('successful import keeps the batch as draft until an explicit publish', () => {
  assert.match(source, /withTransaction\(\(\) =>/);
  assert.match(source, /UPDATE batches SET source_filename = \?, imported_at = datetime\('now','localtime'\) WHERE id = \?/);
  assert.doesNotMatch(source, /UPDATE batches SET status = 'current'/);
});

test('same-batch duplicate rows update instead of being skipped', () => {
  assert.match(source, /ON CONFLICT\(batch_id, daren_id, platform, work_id\) DO UPDATE SET/);
});
