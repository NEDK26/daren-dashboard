const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const initSqlJs = require('sql.js');

const { withTransaction } = require('../db');

test('withTransaction commits once on success and persists once', async () => {
  assert.equal(typeof withTransaction, 'function');
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  let persists = 0;

  withTransaction(() => db.run('CREATE TABLE sample (value TEXT)'), {
    db,
    persist: () => { persists++; }
  });

  assert.equal(db.exec("SELECT name FROM sqlite_master WHERE name = 'sample'").length, 1);
  assert.equal(persists, 1);
});

test('withTransaction rolls back and does not persist on failure', async () => {
  assert.equal(typeof withTransaction, 'function');
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run('CREATE TABLE sample (value TEXT)');
  let persists = 0;

  assert.throws(() => withTransaction(() => {
    db.run("INSERT INTO sample (value) VALUES ('not saved')");
    throw new Error('import failed');
  }, { db, persist: () => { persists++; } }), /import failed/);

  assert.equal(db.exec('SELECT COUNT(*) AS count FROM sample')[0].values[0][0], 0);
  assert.equal(persists, 0);
});

test('import uses a transaction and the UI exposes animated stages', () => {
  const route = fs.readFileSync(path.join(__dirname, '../routes/import.js'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  const style = fs.readFileSync(path.join(__dirname, '../public/style.css'), 'utf8');

  assert.match(route, /withTransaction\(/);
  assert.match(app, /importStage/);
  assert.match(app, /import-progress/);
  assert.match(style, /@keyframes import-spin/);
});
