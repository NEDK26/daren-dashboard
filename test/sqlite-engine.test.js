const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const dbModulePath = path.join(__dirname, '..', 'db.js');
const packageJson = require('../package.json');

function runDatabaseScript(script, databasePath) {
  return spawnSync(process.execPath, ['-e', script], {
    env: { ...process.env, DATABASE_PATH: databasePath },
    encoding: 'utf8'
  });
}

test('the project requires the Node.js baseline used by better-sqlite3', () => {
  assert.equal(packageJson.engines.node, '>=22');
});

test('database writes directly to SQLite without rewriting the whole file through fs', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daren-sqlite-direct-'));
  const databasePath = path.join(tempDir, 'data.db');
  const script = `
    const fs = require('node:fs');
    const originalWrite = fs.writeFileSync;
    fs.writeFileSync = (target, ...args) => {
      if (require('node:path').resolve(target) === ${JSON.stringify(databasePath)}) {
        throw new Error('whole database rewrite detected');
      }
      return originalWrite(target, ...args);
    };
    const db = require(${JSON.stringify(dbModulePath)});
    db.initDb().then(() => {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('probe', 'ok');
    });
  `;

  const result = runDatabaseScript(script, databasePath);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(databasePath), true);
});

test('file-backed databases enable WAL and a busy timeout', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daren-sqlite-wal-'));
  const databasePath = path.join(tempDir, 'data.db');
  const script = `
    const db = require(${JSON.stringify(dbModulePath)});
    db.initDb().then(() => {
      const journal = db.prepare('PRAGMA journal_mode').get();
      const timeout = db.prepare('PRAGMA busy_timeout').get();
      process.stdout.write(JSON.stringify({ journal, timeout }));
    });
  `;

  const result = runDatabaseScript(script, databasePath);

  assert.equal(result.status, 0, result.stderr);
  const settings = JSON.parse(result.stdout);
  assert.equal(String(settings.journal.journal_mode).toLowerCase(), 'wal');
  assert.equal(settings.timeout.timeout, 5000);
});
