const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('DATABASE_PATH isolates a deployment database from the project directory', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daren-db-path-'));
  const databasePath = path.join(tempDir, 'customer.db');
  const projectDatabase = path.join(__dirname, '..', 'data.db');
  const projectDatabaseBefore = fs.statSync(projectDatabase);
  const dbModulePath = path.join(__dirname, '..', 'db.js');
  const script = `const db = require(${JSON.stringify(dbModulePath)}); db.initDb().then(() => { db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('probe', 'ok'); });`;
  const result = spawnSync(process.execPath, ['-e', script], {
    env: { ...process.env, DATABASE_PATH: databasePath },
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(databasePath), true);
  const projectDatabaseAfter = fs.statSync(projectDatabase);
  assert.equal(projectDatabaseAfter.size, projectDatabaseBefore.size);
  assert.equal(projectDatabaseAfter.mtimeMs, projectDatabaseBefore.mtimeMs);
});

test('UPLOADS_DIR isolates uploaded files from the project directory', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daren-uploads-path-'));
  const storageModulePath = path.join(__dirname, '..', 'storage-paths.js');
  const script = `process.stdout.write(require(${JSON.stringify(storageModulePath)}).getUploadsDir())`;
  const result = spawnSync(process.execPath, ['-e', script], {
    env: { ...process.env, UPLOADS_DIR: tempDir },
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, tempDir);
});
