const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createMemoryDatabase } = require('../test-utils/sqlite');

const { withTransaction } = require('../db');

test('withTransaction commits on success', async () => {
  assert.equal(typeof withTransaction, 'function');
  const db = createMemoryDatabase();

  withTransaction(() => db.run('CREATE TABLE sample (value TEXT)'), {
    db
  });

  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE name = 'sample'").get().count, 1);
});

test('withTransaction rolls back on failure', async () => {
  assert.equal(typeof withTransaction, 'function');
  const db = createMemoryDatabase();
  db.run('CREATE TABLE sample (value TEXT)');

  assert.throws(() => withTransaction(() => {
    db.run("INSERT INTO sample (value) VALUES ('not saved')");
    throw new Error('import failed');
  }, { db }), /import failed/);

  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM sample').get().count, 0);
});

test('import uses a transaction and the UI exposes animated stages', () => {
  const route = fs.readFileSync(path.join(__dirname, '../routes/import.js'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '../public/batch-components.jsx'), 'utf8');
  const style = fs.readFileSync(path.join(__dirname, '../public/style.css'), 'utf8');

  assert.match(route, /withTransaction\(/);
  assert.match(app, /importStage/);
  assert.match(app, /import-progress/);
  assert.match(style, /@keyframes import-spin/);
});
