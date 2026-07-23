const test = require('node:test');
const assert = require('node:assert/strict');
const { createMemoryDatabase } = require('../test-utils/sqlite');
const { initSchema, migrateBatchSchema } = require('../db');

function row(db, sql, params = []) {
  return db.prepare(sql).get(...params);
}

function createLegacySchema(db) {
  db.run(`CREATE TABLE darens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL UNIQUE,
    organization TEXT,
    content_type TEXT,
    category TEXT,
    total_plays INTEGER DEFAULT 0,
    platform TEXT,
    is_main_platform TEXT,
    platform_nickname TEXT,
    homepage_url TEXT,
    account TEXT,
    followers INTEGER DEFAULT 0,
    confirmation_status TEXT NOT NULL DEFAULT '待确认'
  )`);
  db.run(`CREATE TABLE videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_id TEXT NOT NULL,
    daren_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    title TEXT,
    tags TEXT,
    content_url TEXT,
    duration INTEGER DEFAULT 0,
    publish_time TEXT,
    da_plays INTEGER DEFAULT 0,
    da_likes INTEGER DEFAULT 0,
    da_7d_plays INTEGER DEFAULT 0,
    da_7d_likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    violation_status TEXT,
    violation_desc TEXT,
    compliance_status TEXT,
    compliance_desc TEXT,
    is_node TEXT,
    node_name TEXT,
    is_hot TEXT,
    appeal TEXT,
    screenshot_plays TEXT,
    screenshot_likes TEXT,
    screenshot_7d_plays TEXT,
    screenshot_7d_likes TEXT,
    anomaly_data TEXT DEFAULT '',
    UNIQUE(daren_id, platform, work_id)
  )`);
}

test('migrates legacy rows into the initial current batch', async () => {
  assert.equal(typeof migrateBatchSchema, 'function');
  const db = createMemoryDatabase();
  createLegacySchema(db);
  db.run("INSERT INTO darens (id, nickname) VALUES (1, 'alice')");
  db.run("INSERT INTO videos (id, work_id, daren_id, platform) VALUES (1, 'work-1', 1, '快手')");

  migrateBatchSchema(db);

  assert.deepEqual(row(db, 'SELECT name, status FROM batches'), {
    name: '2026年05月｜ 数据核对', status: 'current'
  });
  assert.equal(row(db, 'SELECT batch_id FROM darens WHERE id = 1').batch_id, 1);
  assert.equal(row(db, 'SELECT batch_id FROM videos WHERE id = 1').batch_id, 1);
});

test('allows the same nickname and work id in separate batches', async () => {
  assert.equal(typeof migrateBatchSchema, 'function');
  const db = createMemoryDatabase();
  createLegacySchema(db);
  migrateBatchSchema(db);
  db.run("INSERT INTO batches (name, year, month, title, status) VALUES ('2026年06月｜ 数据核对', 2026, 6, '数据核对', 'history')");
  db.run("INSERT INTO darens (batch_id, nickname) VALUES (1, 'alice'), (2, 'alice')");
  db.run("INSERT INTO videos (batch_id, work_id, daren_id, platform) VALUES (1, 'work-1', 1, '快手'), (2, 'work-1', 2, '快手')");

  assert.equal(row(db, 'SELECT COUNT(*) AS count FROM darens').count, 2);
  assert.equal(row(db, 'SELECT COUNT(*) AS count FROM videos').count, 2);
});

test('batch migration is idempotent and does not duplicate the initial batch', async () => {
  const db = createMemoryDatabase();
  createLegacySchema(db);
  db.run("INSERT INTO darens (id, nickname) VALUES (1, 'alice')");

  assert.equal(migrateBatchSchema(db), true);
  assert.equal(migrateBatchSchema(db), false);
  assert.equal(row(db, 'SELECT COUNT(*) AS count FROM batches').count, 1);
  assert.equal(row(db, 'SELECT COUNT(*) AS count FROM darens').count, 1);
});

test('failed batch migration rolls back schema and data changes', async () => {
  const db = createMemoryDatabase();
  db.run('CREATE TABLE darens (id INTEGER PRIMARY KEY, nickname TEXT NOT NULL)');
  db.run('CREATE TABLE videos (id INTEGER PRIMARY KEY, daren_id INTEGER NOT NULL, platform TEXT NOT NULL)');
  db.run("INSERT INTO darens (id, nickname) VALUES (1, 'alice')");
  db.run("INSERT INTO videos (id, daren_id, platform) VALUES (1, 1, '快手')");

  assert.throws(() => migrateBatchSchema(db));
  assert.equal(row(db, "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'batches'").count, 0);
  assert.equal(row(db, "SELECT COUNT(*) AS count FROM pragma_table_info('darens') WHERE name = 'batch_id'").count, 0);
  assert.equal(row(db, 'SELECT COUNT(*) AS count FROM darens').count, 1);
  assert.equal(row(db, 'SELECT COUNT(*) AS count FROM videos').count, 1);
});

test('schema initialization records one idempotent migration baseline', async () => {
  const db = createMemoryDatabase();

  initSchema(db);
  initSchema(db);

  assert.deepEqual(row(db, 'SELECT version, name FROM schema_migrations ORDER BY version'), {
    version: 1,
    name: 'initial-schema'
  });
  assert.equal(row(db, 'SELECT COUNT(*) AS count FROM schema_migrations').count, 1);
});
