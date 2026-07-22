const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createSnapshot, assertSnapshotUnchanged } = require('../scripts/check-data-preservation');

test('data preservation snapshot covers database and nested upload files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'daren-preservation-'));
  const databasePath = path.join(root, 'customer.db');
  const uploadsDir = path.join(root, 'uploads');
  fs.mkdirSync(path.join(uploadsDir, 'nested'), { recursive: true });
  fs.writeFileSync(databasePath, 'database');
  fs.writeFileSync(path.join(uploadsDir, 'nested', 'proof.png'), 'proof');

  const snapshot = createSnapshot({ databasePath, uploadsDir });
  assert.equal(snapshot.database.size, 8);
  assert.deepEqual(snapshot.uploads.map(file => file.path), [path.join('nested', 'proof.png')]);
  assert.doesNotThrow(() => assertSnapshotUnchanged(snapshot, createSnapshot({ databasePath, uploadsDir })));
});

test('data preservation verification reports changed records', () => {
  const before = { database: { sha256: 'before', size: 1 }, uploads: [] };
  const after = { database: { sha256: 'after', size: 2 }, uploads: [] };
  assert.throws(() => assertSnapshotUnchanged(before, after), /发生变化/);
});
