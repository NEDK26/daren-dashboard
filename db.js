const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');

let _db = null;
let transactionDepth = 0;

async function initDb() {
  if (_db) return _db;
  const SQL = await initSqlJs();

  let buffer;
  try { buffer = fs.readFileSync(DB_PATH); } catch { buffer = null; }
  _db = buffer ? new SQL.Database(buffer) : new SQL.Database();

  _db.run('PRAGMA foreign_keys = ON');
  initSchema();
  saveDb();
  return _db;
}

function getDb() {
  if (!_db) throw new Error('DB not initialized. Call await initDb() first.');
  return _db;
}

function saveDb() {
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function maybeSaveDb() {
  if (transactionDepth === 0) saveDb();
}

function withTransaction(fn, options = {}) {
  const db = options.db || getDb();
  const persist = options.persist || saveDb;
  const outermost = transactionDepth === 0;
  transactionDepth++;
  if (outermost) db.run('BEGIN');
  let result;
  try {
    result = fn();
    if (outermost) db.run('COMMIT');
  } catch (error) {
    if (outermost) {
      try { db.run('ROLLBACK'); } catch {}
    }
    throw error;
  } finally {
    transactionDepth--;
  }
  if (outermost) persist();
  return result;
}

const INITIAL_BATCH = {
  name: '2026年05月｜ 数据核对',
  year: 2026,
  month: 5,
  title: '数据核对',
  status: 'current'
};

const DAREN_COLUMNS = [
  'id', 'nickname', 'organization', 'content_type', 'category', 'total_plays', 'platform',
  'platform_nickname', 'homepage_url', 'account', 'followers', 'confirmation_status'
];

const VIDEO_COLUMNS = [
  'id', 'work_id', 'daren_id', 'platform', 'is_main_platform', 'title', 'tags', 'content_url', 'duration', 'publish_time',
  'da_plays', 'da_likes', 'da_7d_plays', 'da_7d_likes', 'comments', 'saves', 'shares',
  'violation_status', 'violation_desc', 'compliance_status', 'compliance_desc', 'is_node',
  'node_name', 'is_hot', 'appeal', 'screenshot_plays', 'screenshot_likes',
  'screenshot_7d_plays', 'screenshot_7d_likes', 'anomaly_data'
];

function createBatchesTable(db) {
  db.run(`CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'current', 'history')),
    previous_batch_id INTEGER,
    source_filename TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    imported_at TEXT
  )`);
}

function createDarensTable(db, tableName = 'darens') {
  db.run(`CREATE TABLE ${tableName} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    nickname TEXT NOT NULL,
    organization TEXT,
    content_type TEXT,
    category TEXT,
    total_plays INTEGER DEFAULT 0,
    platform TEXT,
    platform_nickname TEXT,
    homepage_url TEXT,
    account TEXT,
    followers INTEGER DEFAULT 0,
    confirmation_status TEXT NOT NULL DEFAULT '待确认' CHECK (confirmation_status IN ('待确认', '已确认', '已提交申诉')),
    FOREIGN KEY (batch_id) REFERENCES batches(id),
    UNIQUE(batch_id, nickname)
  )`);
}

function createVideosTable(db, tableName = 'videos') {
  db.run(`CREATE TABLE ${tableName} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    work_id TEXT NOT NULL,
    daren_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    is_main_platform TEXT,
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
    FOREIGN KEY (batch_id) REFERENCES batches(id),
    FOREIGN KEY (daren_id) REFERENCES darens(id),
    UNIQUE(batch_id, daren_id, platform, work_id)
  )`);
}

function tableColumns(db, tableName) {
  const stmt = db.prepare(`PRAGMA table_info(${tableName})`);
  const columns = [];
  while (stmt.step()) columns.push(stmt.getAsObject());
  stmt.free();
  return columns;
}

function tableExists(db, tableName) {
  const stmt = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?");
  stmt.bind([tableName]);
  const exists = stmt.step();
  stmt.free();
  return exists;
}

function copyRows(db, sourceTable, targetTable, columns, extra = {}) {
  const existingNames = new Set(tableColumns(db, sourceTable).map(column => column.name));
  const copyColumns = columns.filter(column => existingNames.has(column));
  const targetColumns = [...copyColumns, ...Object.keys(extra)];
  const selectColumns = [...copyColumns.map(column => `"${column}"`), ...Object.keys(extra).map(() => '?')];
  if (!copyColumns.length) throw new Error(`${sourceTable} 表缺少迁移所需字段`);
  db.run(
    `INSERT INTO ${targetTable} (${targetColumns.map(column => `"${column}"`).join(', ')}) SELECT ${selectColumns.join(', ')} FROM ${sourceTable}`,
    Object.values(extra)
  );
}

function migrateVideosTable(db = _db) {
  const currentColumns = tableColumns(db, 'videos');
  if (currentColumns.length === 0 || currentColumns.some(column => column.name === 'id' && Number(column.pk) === 1)) return false;
  if (!currentColumns.some(column => column.name === 'batch_id')) return migrateBatchSchema(db);

  db.run('PRAGMA foreign_keys = OFF');
  try {
    db.run('BEGIN');
    createVideosTable(db, 'videos_new');
    copyRows(db, 'videos', 'videos_new', VIDEO_COLUMNS);
    db.run('DROP TABLE videos');
    db.run('ALTER TABLE videos_new RENAME TO videos');
    db.run('COMMIT');
  } catch (error) {
    try { db.run('ROLLBACK'); } catch {}
    throw error;
  } finally {
    db.run('PRAGMA foreign_keys = ON');
  }
  return true;
}

function migrateBatchSchema(db = _db) {
  const darenColumns = tableColumns(db, 'darens');
  const videoColumns = tableColumns(db, 'videos');
  if (darenColumns.some(column => column.name === 'batch_id') && videoColumns.some(column => column.name === 'batch_id')) {
    createBatchesTable(db);
    return false;
  }

  db.run('PRAGMA foreign_keys = OFF');
  try {
    db.run('BEGIN');
    createBatchesTable(db);
    db.run(
      'INSERT OR IGNORE INTO batches (name, year, month, title, status) VALUES (?, ?, ?, ?, ?)',
      [INITIAL_BATCH.name, INITIAL_BATCH.year, INITIAL_BATCH.month, INITIAL_BATCH.title, INITIAL_BATCH.status]
    );
    const batchId = db.exec("SELECT id FROM batches WHERE name = '2026年05月｜ 数据核对'")[0].values[0][0];
    createDarensTable(db, 'darens_new');
    copyRows(db, 'darens', 'darens_new', DAREN_COLUMNS, { batch_id: batchId });
    createVideosTable(db, 'videos_new');
    copyRows(db, 'videos', 'videos_new', VIDEO_COLUMNS, { batch_id: batchId });
    db.run('DROP TABLE videos');
    db.run('DROP TABLE darens');
    db.run('ALTER TABLE darens_new RENAME TO darens');
    db.run('ALTER TABLE videos_new RENAME TO videos');
    db.run('COMMIT');
  } catch (error) {
    try { db.run('ROLLBACK'); } catch {}
    throw error;
  } finally {
    db.run('PRAGMA foreign_keys = ON');
  }
  return true;
}

function initSchema() {
  createBatchesTable(_db);
  try { _db.run('ALTER TABLE batches ADD COLUMN previous_batch_id INTEGER'); } catch {}
  if (!tableExists(_db, 'darens')) createDarensTable(_db);
  if (!tableExists(_db, 'videos')) createVideosTable(_db);
  else if (tableColumns(_db, 'darens').some(column => column.name === 'batch_id') && tableColumns(_db, 'videos').some(column => column.name === 'batch_id')) migrateVideosTable(_db);
  else migrateBatchSchema(_db);

  _db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    display_name TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user'))
  )`);

  _db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);

  _db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_nickname TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    column_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  )`);

  // Keep one complete user-visible operation per row.  The old audit_logs table
  // remains in place so existing installations can upgrade without data loss.
  _db.run(`CREATE TABLE IF NOT EXISTS operation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER,
    batch_name TEXT,
    operator_name TEXT NOT NULL,
    action_type TEXT NOT NULL,
    subject_type TEXT NOT NULL,
    subject_id TEXT,
    subject_name TEXT NOT NULL,
    subject_nickname TEXT,
    changes_json TEXT NOT NULL DEFAULT '[]',
    result TEXT NOT NULL DEFAULT '成功',
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  )`);

  try { _db.run("ALTER TABLE videos ADD COLUMN anomaly_data TEXT DEFAULT ''"); } catch {}
  try { _db.run('ALTER TABLE videos ADD COLUMN is_main_platform TEXT'); } catch {}
  try { _db.run("ALTER TABLE darens ADD COLUMN confirmation_status TEXT NOT NULL DEFAULT '待确认'"); } catch {}
  _db.run(`CREATE TRIGGER IF NOT EXISTS validate_darens_confirmation_status_insert
    BEFORE INSERT ON darens
    FOR EACH ROW WHEN NEW.confirmation_status NOT IN ('待确认', '已确认', '已提交申诉')
    BEGIN SELECT RAISE(ABORT, 'invalid confirmation status'); END`);
  _db.run(`CREATE TRIGGER IF NOT EXISTS validate_darens_confirmation_status_update
    BEFORE UPDATE OF confirmation_status ON darens
    FOR EACH ROW WHEN NEW.confirmation_status NOT IN ('待确认', '已确认', '已提交申诉')
    BEGIN SELECT RAISE(ABORT, 'invalid confirmation status'); END`);
  _db.run('CREATE INDEX IF NOT EXISTS idx_videos_daren_id ON videos(daren_id)');
  _db.run('CREATE INDEX IF NOT EXISTS idx_darens_batch_id ON darens(batch_id)');
  _db.run('CREATE INDEX IF NOT EXISTS idx_videos_batch_id ON videos(batch_id)');
  _db.run('CREATE INDEX IF NOT EXISTS idx_videos_platform ON videos(platform)');
  _db.run('CREATE INDEX IF NOT EXISTS idx_audit_table_record ON audit_logs(table_name, record_id)');
  _db.run('CREATE INDEX IF NOT EXISTS idx_operation_logs_created ON operation_logs(created_at DESC)');
  _db.run('CREATE INDEX IF NOT EXISTS idx_operation_logs_subject ON operation_logs(subject_nickname, created_at DESC)');
  _db.run('CREATE INDEX IF NOT EXISTS idx_operation_logs_batch ON operation_logs(batch_id, created_at DESC)');
}

// Prepare wrapper mimicking better-sqlite3 sync API
function prepare(sql) {
  const stmt = _db.prepare(sql);
  return {
    get: (...params) => {
      if (params.length) stmt.bind(params);
      const row = stmt.step() ? stmt.getAsObject() : undefined;
      stmt.free();
      return row;
    },
    all: (...params) => {
      if (params.length) stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    },
    run: (...params) => {
      if (params.length) stmt.bind(params);
      stmt.step();
      const changes = _db.getRowsModified();
      stmt.free();
      // Get last insert rowid
      const lastId = prepare('SELECT last_insert_rowid() as id').get();
      maybeSaveDb();
      return { changes, lastInsertRowid: lastId ? lastId.id : 0 };
    }
  };
}

// Escape column names for dynamic SQL (sql.js doesn't allow param binding for column names)
function escapeColumn(col) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col)) throw new Error('Invalid column name: ' + col);
  return col;
}

module.exports = { initDb, getDb, saveDb, prepare, escapeColumn, migrateVideosTable, migrateBatchSchema, withTransaction };
