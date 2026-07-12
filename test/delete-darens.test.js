const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const initSqlJs = require('sql.js');

let deleteDarensByIds;
try {
  ({ deleteDarensByIds } = require('../services/deleteDarens'));
} catch {
  deleteDarensByIds = null;
}

async function createDb() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON');
  db.run(`CREATE TABLE darens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL UNIQUE
  )`);
  db.run(`CREATE TABLE videos (
    work_id TEXT PRIMARY KEY,
    daren_id INTEGER NOT NULL,
    screenshot_plays TEXT,
    screenshot_likes TEXT,
    screenshot_7d_plays TEXT,
    screenshot_7d_likes TEXT,
    FOREIGN KEY (daren_id) REFERENCES darens(id)
  )`);
  db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    display_name TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'user'
  )`);
  db.run(`CREATE TABLE operation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER,
    operator_name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    subject_type TEXT NOT NULL,
    subject_id TEXT,
    subject_name TEXT NOT NULL,
    subject_nickname TEXT,
    changes_json TEXT NOT NULL
  )`);
  return db;
}

function getScalar(db, sql) {
  const stmt = db.prepare(sql);
  const value = stmt.step() ? Object.values(stmt.getAsObject())[0] : undefined;
  stmt.free();
  return value;
}

test('deletes selected darens, their videos, matching user accounts, and upload files', async () => {
  assert.ok(deleteDarensByIds, 'expected deleteDarens service');
  const db = await createDb();
  const uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daren-uploads-'));
  fs.writeFileSync(path.join(uploadsDir, 'plays.png'), 'x');

  db.run("INSERT INTO darens (nickname) VALUES ('alice'), ('bob')");
  db.run("INSERT INTO users (display_name, role) VALUES ('alice', 'user'), ('bob', 'user'), ('admin', 'admin')");
  db.run("INSERT INTO videos (work_id, daren_id, screenshot_plays, screenshot_likes) VALUES ('w1', 1, '/uploads/plays.png', '/uploads/missing.png'), ('w2', 2, '/uploads/bob.png', NULL)");

  const result = deleteDarensByIds({
    db,
    ids: [1],
    actor: 'admin',
    uploadsDir,
    saveDb: () => {}
  });

  assert.equal(result.deletedDarens, 1);
  assert.equal(result.deletedVideos, 1);
  assert.equal(result.deletedUsers, 1);
  assert.equal(getScalar(db, 'SELECT COUNT(*) FROM darens'), 1);
  assert.equal(getScalar(db, 'SELECT COUNT(*) FROM videos'), 1);
  assert.equal(getScalar(db, "SELECT COUNT(*) FROM users WHERE display_name = 'alice'"), 0);
  assert.equal(getScalar(db, "SELECT COUNT(*) FROM users WHERE display_name = 'bob'"), 1);
  assert.equal(getScalar(db, 'SELECT COUNT(*) FROM operation_logs'), 1);
  assert.equal(fs.existsSync(path.join(uploadsDir, 'plays.png')), false);
});

test('fails the whole batch when any selected daren is missing', async () => {
  assert.ok(deleteDarensByIds, 'expected deleteDarens service');
  const db = await createDb();
  const uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daren-uploads-'));
  fs.writeFileSync(path.join(uploadsDir, 'plays.png'), 'x');

  db.run("INSERT INTO darens (nickname) VALUES ('alice')");
  db.run("INSERT INTO users (display_name, role) VALUES ('alice', 'user')");
  db.run("INSERT INTO videos (work_id, daren_id, screenshot_plays) VALUES ('w1', 1, '/uploads/plays.png')");

  assert.throws(
    () => deleteDarensByIds({ db, ids: [1, 999], actor: 'admin', uploadsDir, saveDb: () => {} }),
    /部分达人不存在/
  );

  assert.equal(getScalar(db, 'SELECT COUNT(*) FROM darens'), 1);
  assert.equal(getScalar(db, 'SELECT COUNT(*) FROM videos'), 1);
  assert.equal(getScalar(db, 'SELECT COUNT(*) FROM users'), 1);
  assert.equal(fs.existsSync(path.join(uploadsDir, 'plays.png')), true);
});
