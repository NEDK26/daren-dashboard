const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const initSqlJs = require('sql.js');

let lifecycle;
try { lifecycle = require('../services/batchLifecycle'); } catch { lifecycle = {}; }

function createPrepare(db) {
  return sql => ({
    get: (...params) => {
      const stmt = db.prepare(sql);
      if (params.length) stmt.bind(params);
      const row = stmt.step() ? stmt.getAsObject() : undefined;
      stmt.free();
      return row;
    },
    run: (...params) => {
      db.run(sql, params);
      return { changes: db.getRowsModified() };
    }
  });
}

function createTransaction(db) {
  return fn => {
    db.run('BEGIN');
    try { const result = fn(); db.run('COMMIT'); return result; }
    catch (error) { db.run('ROLLBACK'); throw error; }
  };
}

async function createDb() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run(`CREATE TABLE batches (
    id INTEGER PRIMARY KEY, name TEXT, status TEXT, previous_batch_id INTEGER
  )`);
  db.run("INSERT INTO batches (id, name, status) VALUES (1, '旧批次', 'current'), (2, '新批次', 'draft')");
  return db;
}

test('publishing a draft moves the old current to history and records its predecessor', async () => {
  assert.equal(typeof lifecycle.publishBatch, 'function');
  const db = await createDb();
  const prepare = createPrepare(db);
  lifecycle.publishBatch({ prepare, withTransaction: createTransaction(db), batchId: 2 });
  assert.equal(prepare('SELECT status FROM batches WHERE id = ?').get(1).status, 'history');
  assert.deepEqual(prepare('SELECT status, previous_batch_id FROM batches WHERE id = ?').get(2), { status: 'current', previous_batch_id: 1 });
});

test('revoking the current batch leaves previous batches as history', async () => {
  assert.equal(typeof lifecycle.revokeBatch, 'function');
  const db = await createDb();
  const prepare = createPrepare(db);
  lifecycle.publishBatch({ prepare, withTransaction: createTransaction(db), batchId: 2 });
  const revoked = lifecycle.revokeBatch({ prepare, withTransaction: createTransaction(db), batchId: 2 });
  assert.equal(prepare('SELECT status FROM batches WHERE id = ?').get(1).status, 'history');
  assert.deepEqual(prepare('SELECT status, previous_batch_id FROM batches WHERE id = ?').get(2), { status: 'draft', previous_batch_id: null });
  assert.equal(prepare("SELECT COUNT(*) AS count FROM batches WHERE status = 'current'").get().count, 0);
  assert.equal(revoked.status, 'draft');
});

test('revoking works when there is no previous batch', async () => {
  const db = await createDb();
  const prepare = createPrepare(db);
  db.run('DELETE FROM batches WHERE id = 1');
  db.run("UPDATE batches SET status = 'current' WHERE id = 2");
  lifecycle.revokeBatch({ prepare, withTransaction: createTransaction(db), batchId: 2 });
  assert.equal(prepare('SELECT status FROM batches WHERE id = ?').get(2).status, 'draft');
  assert.equal(prepare("SELECT COUNT(*) AS count FROM batches WHERE status = 'current'").get().count, 0);
});

test('batch route exposes publish and revoke actions', () => {
  const route = fs.readFileSync(path.join(__dirname, '../routes/batches.js'), 'utf8');
  assert.match(route, /router\.post\('\/batches\/:id\/publish'/);
  assert.match(route, /router\.post\('\/batches\/:id\/revoke'/);
  assert.match(route, /DELETE FROM videos WHERE batch_id = \?/);
  assert.match(route, /DELETE FROM darens WHERE batch_id = \?/);
});
