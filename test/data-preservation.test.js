const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

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

test('data preservation CLI detects a changed upload file', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'daren-preservation-cli-'));
  const databasePath = path.join(root, 'customer.db');
  const uploadsDir = path.join(root, 'uploads');
  const snapshotPath = path.join(root, 'before.json');
  const scriptPath = path.join(__dirname, '..', 'scripts', 'check-data-preservation.js');
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(databasePath, 'database');
  fs.writeFileSync(path.join(uploadsDir, 'proof.png'), 'before');
  const env = { ...process.env, DATABASE_PATH: databasePath, UPLOADS_DIR: uploadsDir };

  const snapshot = spawnSync(process.execPath, [scriptPath, 'snapshot', snapshotPath], { env, encoding: 'utf8' });
  assert.equal(snapshot.status, 0, snapshot.stderr);
  fs.writeFileSync(path.join(uploadsDir, 'proof.png'), 'after');
  const verify = spawnSync(process.execPath, [scriptPath, 'verify', snapshotPath], { env, encoding: 'utf8' });
  assert.notEqual(verify.status, 0);
  assert.match(verify.stderr, /发生变化/);
});
