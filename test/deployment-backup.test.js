const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const Database = require('better-sqlite3');

const script = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'backup-deployment.js'), 'utf8');

test('deployment backup copies database and uploads to a timestamped directory', () => {
  assert.match(script, /data\.db/);
  assert.match(script, /DATABASE_PATH/);
  assert.match(script, /uploads/);
  assert.match(script, /UPLOADS_DIR/);
  assert.match(script, /toISOString/);
  assert.match(script, /DEPLOYMENT_BACKUP_DIR/);
});

test('deployment backup includes committed data that is still in the WAL', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daren-backup-wal-'));
  const databasePath = path.join(tempDir, 'live.db');
  const backupRoot = path.join(tempDir, 'backups');
  const uploadsDir = path.join(tempDir, 'uploads');
  fs.mkdirSync(uploadsDir);

  const liveDb = new Database(databasePath);
  liveDb.pragma('journal_mode = WAL');
  liveDb.pragma('wal_autocheckpoint = 0');
  liveDb.exec("CREATE TABLE probes (value TEXT); INSERT INTO probes (value) VALUES ('latest');");

  const result = spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'backup-deployment.js')], {
    env: {
      ...process.env,
      DATABASE_PATH: databasePath,
      DEPLOYMENT_BACKUP_DIR: backupRoot,
      UPLOADS_DIR: uploadsDir
    },
    encoding: 'utf8'
  });

  liveDb.close();
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  const backupDb = new Database(path.join(report.backupDir, 'data.db'), { readonly: true });
  assert.equal(backupDb.prepare('SELECT value FROM probes').get().value, 'latest');
  backupDb.close();
});

test('deployment restore requires an explicit confirmation flag', () => {
  const restore = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'restore-deployment.js'), 'utf8');
  assert.match(restore, /--confirm/);
  assert.match(restore, /data\.db/);
  assert.match(restore, /DATABASE_PATH/);
  assert.match(restore, /uploads/);
  assert.match(restore, /UPLOADS_DIR/);
});

test('deployment workflows run backups before restarting the service', () => {
  for (const file of ['deploy.yml', 'deploy-sj-prod.yml']) {
    const workflow = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', file), 'utf8');
    assert.match(workflow, /node-version: 22/);
    assert.match(workflow, /process\.versions\.node/);
    assert.match(workflow, /backup-deployment\.js/);
    assert.ok(workflow.indexOf('backup-deployment.js') < workflow.indexOf('git reset'));
    assert.ok(workflow.indexOf('backup-deployment.js') < workflow.indexOf('pm2 restart'));
  }
});
