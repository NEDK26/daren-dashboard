const test = require('node:test');
const assert = require('node:assert/strict');
const initSqlJs = require('sql.js');
const { verifyPassword, hashPassword } = require('../auth');
const { initializeBatchAccounts, resetUserPassword, changeUserPassword } = require('../services/userAccounts');

function makeDb() {
  let db;
  const ready = initSqlJs().then(SQL => {
    db = new SQL.Database();
    db.run(`CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, display_name TEXT UNIQUE, password_hash TEXT,
      role TEXT, must_change_password INTEGER DEFAULT 0, credential_version INTEGER DEFAULT 1,
      initial_password_issued_at TEXT, password_changed_at TEXT
    )`);
    db.run('CREATE TABLE darens (id INTEGER PRIMARY KEY AUTOINCREMENT, batch_id INTEGER, nickname TEXT)');
  });
  const prepare = sql => ({
    get: (...params) => { const stmt = db.prepare(sql); stmt.bind(params); const row = stmt.step() ? stmt.getAsObject() : undefined; stmt.free(); return row; },
    all: (...params) => { const stmt = db.prepare(sql); stmt.bind(params); const rows = []; while (stmt.step()) rows.push(stmt.getAsObject()); stmt.free(); return rows; },
    run: (...params) => { const stmt = db.prepare(sql); stmt.bind(params); stmt.step(); const changes = db.getRowsModified(); stmt.free(); return { changes, lastInsertRowid: db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] || 0 }; }
  });
  const withTransaction = fn => { db.run('BEGIN'); try { const result = fn(); db.run('COMMIT'); return result; } catch (error) { db.run('ROLLBACK'); throw error; } };
  return { ready, prepare, withTransaction };
}

test('initialization creates only missing accounts and marks them for first-login change', async () => {
  const memory = makeDb();
  await memory.ready;
  memory.prepare('INSERT INTO darens (batch_id, nickname) VALUES (?, ?)').run(1, '已存在达人');
  memory.prepare('INSERT INTO darens (batch_id, nickname) VALUES (?, ?)').run(1, '新达人');
  memory.prepare('INSERT INTO users (display_name, password_hash, role) VALUES (?, ?, ?)').run('已存在达人', hashPassword('old-pass'), 'user');

  const accounts = initializeBatchAccounts({ ...memory, batchId: 1 });
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].display_name, '新达人');
  assert.equal(memory.prepare('SELECT must_change_password FROM users WHERE display_name = ?').get('新达人').must_change_password, 1);
  assert.equal(memory.prepare('SELECT COUNT(*) AS count FROM users').get().count, 2);
});

test('reset increments credential version and changed password clears first-login status', async () => {
  const memory = makeDb();
  await memory.ready;
  memory.prepare('INSERT INTO users (display_name, password_hash, role, must_change_password) VALUES (?, ?, ?, 1)').run('达人', hashPassword('old-pass'), 'user');
  const reset = resetUserPassword({ ...memory, userId: 1 });
  assert.match(reset.password, /^[A-Za-z0-9]{10}$/);
  assert.equal(memory.prepare('SELECT credential_version FROM users WHERE id = 1').get().credential_version, 2);
  const changed = changeUserPassword({ ...memory, userId: 1, currentPassword: reset.password, newPassword: 'new-pass-8' });
  assert.equal(changed.ok, true);
  const user = memory.prepare('SELECT must_change_password, credential_version, password_hash FROM users WHERE id = 1').get();
  assert.equal(user.must_change_password, 0);
  assert.equal(user.credential_version, 3);
  assert.equal(verifyPassword('new-pass-8', user.password_hash), true);
});
