const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const initSqlJs = require('sql.js');

const { migrateVideosTable } = require('../db');

async function createLegacyDb() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run('CREATE TABLE darens (id INTEGER PRIMARY KEY AUTOINCREMENT, nickname TEXT NOT NULL UNIQUE)');
  db.run("INSERT INTO darens (id, nickname) VALUES (1, 'alice'), (2, 'bob')");
  db.run(`CREATE TABLE videos (
    work_id TEXT PRIMARY KEY,
    daren_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    title TEXT
  )`);
  db.run("INSERT INTO videos (work_id, daren_id, platform, title) VALUES ('work-1', 1, '快手', '共创视频')");
  return db;
}

function rows(db, sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const result = [];
  while (stmt.step()) result.push(stmt.getAsObject());
  stmt.free();
  return result;
}

test('migrates work_id primary key and allows co-created rows', async () => {
  const db = await createLegacyDb();

  migrateVideosTable(db);

  const columns = rows(db, 'PRAGMA table_info(videos)');
  assert.equal(columns.find(column => column.name === 'id').pk, 1);
  assert.equal(columns.find(column => column.name === 'work_id').pk, 0);

  db.run("INSERT INTO videos (batch_id, work_id, daren_id, platform, title) VALUES (1, 'work-1', 2, '快手', '共创视频')");
  assert.equal(rows(db, "SELECT id, work_id, daren_id FROM videos WHERE work_id = 'work-1'").length, 2);
});

test('deduplicates the same work for the same daren and platform', async () => {
  const db = await createLegacyDb();
  migrateVideosTable(db);

  assert.throws(
    () => db.run("INSERT INTO videos (batch_id, work_id, daren_id, platform) VALUES (1, 'work-1', 1, '快手')"),
    /UNIQUE constraint failed/
  );
});

test('updates only the selected co-created video by internal id', async () => {
  const db = await createLegacyDb();
  migrateVideosTable(db);
  db.run("INSERT INTO videos (batch_id, work_id, daren_id, platform, title) VALUES (1, 'work-1', 2, '快手', '共创视频')");

  const before = rows(db, "SELECT id, daren_id, title FROM videos WHERE work_id = 'work-1' ORDER BY id");
  db.run("UPDATE videos SET title = '仅修改达人 Alice' WHERE id = ?", [before[0].id]);
  const after = rows(db, "SELECT id, daren_id, title FROM videos WHERE work_id = 'work-1' ORDER BY id");

  assert.equal(after[0].title, '仅修改达人 Alice');
  assert.equal(after[1].title, '共创视频');
});

test('uses internal video id in route and browser row identity', () => {
  const videos = fs.readFileSync(path.join(__dirname, '../routes/videos.js'), 'utf8');
  const upload = fs.readFileSync(path.join(__dirname, '../routes/upload.js'), 'utf8');
  const video = fs.readFileSync(path.join(__dirname, '../public/video-components.jsx'), 'utf8');

  assert.match(videos, /router\.put\('\/videos\/:id'/);
  assert.match(videos, /WHERE v\.id = \?/);
  assert.match(upload, /router\.post\('\/upload\/:id\/:field'/);
  assert.match(upload, /WHERE v\.id = \?/);
  assert.match(video, /rowKey="id"/);
  assert.match(video, /editingKey === record\.id/);
});
