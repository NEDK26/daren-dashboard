const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(process.env.DATABASE_PATH || path.join(__dirname, 'data.db'));

let _db = null;
const CURRENT_SCHEMA_VERSION = 1;

async function initDb() {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('foreign_keys = ON');
  _db.pragma('journal_mode = WAL');
  _db.pragma('busy_timeout = 5000');
  initSchema();
  return _db;
}

function getDb() {
  if (!_db) throw new Error('DB not initialized. Call await initDb() first.');
  return _db;
}

function withTransaction(fn, options = {}) {
  const db = options.db || getDb();
  return db.transaction(fn)();
}

function execute(db, sql, params = []) {
  const values = Array.isArray(params) ? params : [params];
  return db.prepare(sql).run(...values);
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
  execute(db, `CREATE TABLE IF NOT EXISTS batches (
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

function createSchemaMigrationsTable(db) {
  execute(db, `CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  )`);
}

function recordSchemaBaseline(db) {
  execute(db, 'INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (?, ?)', [
    CURRENT_SCHEMA_VERSION,
    'initial-schema'
  ]);
}

function createDarensTable(db, tableName = 'darens') {
  execute(db, `CREATE TABLE ${tableName} (
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
  execute(db, `CREATE TABLE ${tableName} (
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

function createVideoAppealsTable(db = _db) {
  execute(db, `CREATE TABLE IF NOT EXISTS video_appeals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    group_no INTEGER NOT NULL CHECK (group_no BETWEEN 1 AND 3),
    appeal_text TEXT,
    image_path TEXT,
    submitted_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    UNIQUE(video_id, group_no)
  )`);
  execute(db, `INSERT OR IGNORE INTO video_appeals (video_id, group_no, appeal_text)
    SELECT id, 1, appeal FROM videos WHERE TRIM(COALESCE(appeal, '')) <> ''`);
}

function tableColumns(db, tableName) {
  return db.prepare(`PRAGMA table_info(${tableName})`).all();
}

function tableExists(db, tableName) {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName));
}

function copyRows(db, sourceTable, targetTable, columns, extra = {}) {
  const existingNames = new Set(tableColumns(db, sourceTable).map(column => column.name));
  const copyColumns = columns.filter(column => existingNames.has(column));
  const targetColumns = [...copyColumns, ...Object.keys(extra)];
  const selectColumns = [...copyColumns.map(column => `"${column}"`), ...Object.keys(extra).map(() => '?')];
  if (!copyColumns.length) throw new Error(`${sourceTable} 表缺少迁移所需字段`);
  execute(db,
    `INSERT INTO ${targetTable} (${targetColumns.map(column => `"${column}"`).join(', ')}) SELECT ${selectColumns.join(', ')} FROM ${sourceTable}`,
    Object.values(extra)
  );
}

function migrateVideosTable(db = _db) {
  const currentColumns = tableColumns(db, 'videos');
  if (currentColumns.length === 0 || currentColumns.some(column => column.name === 'id' && Number(column.pk) === 1)) return false;
  if (!currentColumns.some(column => column.name === 'batch_id')) return migrateBatchSchema(db);

  execute(db, 'PRAGMA foreign_keys = OFF');
  try {
    execute(db, 'BEGIN');
    createVideosTable(db, 'videos_new');
    copyRows(db, 'videos', 'videos_new', VIDEO_COLUMNS);
    execute(db, 'DROP TABLE videos');
    execute(db, 'ALTER TABLE videos_new RENAME TO videos');
    execute(db, 'COMMIT');
  } catch (error) {
    try { execute(db, 'ROLLBACK'); } catch {}
    throw error;
  } finally {
    execute(db, 'PRAGMA foreign_keys = ON');
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

  execute(db, 'PRAGMA foreign_keys = OFF');
  try {
    execute(db, 'BEGIN');
    createBatchesTable(db);
    execute(db,
      'INSERT OR IGNORE INTO batches (name, year, month, title, status) VALUES (?, ?, ?, ?, ?)',
      [INITIAL_BATCH.name, INITIAL_BATCH.year, INITIAL_BATCH.month, INITIAL_BATCH.title, INITIAL_BATCH.status]
    );
    const batchId = db.prepare('SELECT id FROM batches WHERE name = ?').get(INITIAL_BATCH.name).id;
    createDarensTable(db, 'darens_new');
    copyRows(db, 'darens', 'darens_new', DAREN_COLUMNS, { batch_id: batchId });
    createVideosTable(db, 'videos_new');
    copyRows(db, 'videos', 'videos_new', VIDEO_COLUMNS, { batch_id: batchId });
    execute(db, 'DROP TABLE videos');
    execute(db, 'DROP TABLE darens');
    execute(db, 'ALTER TABLE darens_new RENAME TO darens');
    execute(db, 'ALTER TABLE videos_new RENAME TO videos');
    execute(db, 'COMMIT');
  } catch (error) {
    try { execute(db, 'ROLLBACK'); } catch {}
    throw error;
  } finally {
    execute(db, 'PRAGMA foreign_keys = ON');
  }
  return true;
}

function initSchema(db = _db) {
  createSchemaMigrationsTable(db);
  createBatchesTable(db);
  try { execute(db, 'ALTER TABLE batches ADD COLUMN previous_batch_id INTEGER'); } catch {}
  if (!tableExists(db, 'darens')) createDarensTable(db);
  if (!tableExists(db, 'videos')) createVideosTable(db);
  else if (tableColumns(db, 'darens').some(column => column.name === 'batch_id') && tableColumns(db, 'videos').some(column => column.name === 'batch_id')) migrateVideosTable(db);
  else migrateBatchSchema(db);
  createVideoAppealsTable(db);

  execute(db, `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    display_name TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user')),
    must_change_password INTEGER NOT NULL DEFAULT 0,
    credential_version INTEGER NOT NULL DEFAULT 1,
    initial_password_issued_at TEXT,
    password_changed_at TEXT
  )`);
  try { execute(db, 'ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0'); } catch {}
  try { execute(db, 'ALTER TABLE users ADD COLUMN credential_version INTEGER NOT NULL DEFAULT 1'); } catch {}
  try { execute(db, 'ALTER TABLE users ADD COLUMN initial_password_issued_at TEXT'); } catch {}
  try { execute(db, 'ALTER TABLE users ADD COLUMN password_changed_at TEXT'); } catch {}

  execute(db, `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);

  execute(db, `CREATE TABLE IF NOT EXISTS audit_logs (
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
  execute(db, `CREATE TABLE IF NOT EXISTS operation_logs (
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

  try { execute(db, "ALTER TABLE videos ADD COLUMN anomaly_data TEXT DEFAULT ''"); } catch {}
  try { execute(db, 'ALTER TABLE videos ADD COLUMN is_main_platform TEXT'); } catch {}
  try { execute(db, "ALTER TABLE darens ADD COLUMN confirmation_status TEXT NOT NULL DEFAULT '待确认'"); } catch {}
  execute(db, `CREATE TRIGGER IF NOT EXISTS validate_darens_confirmation_status_insert
    BEFORE INSERT ON darens
    FOR EACH ROW WHEN NEW.confirmation_status NOT IN ('待确认', '已确认', '已提交申诉')
    BEGIN SELECT RAISE(ABORT, 'invalid confirmation status'); END`);
  execute(db, `CREATE TRIGGER IF NOT EXISTS validate_darens_confirmation_status_update
    BEFORE UPDATE OF confirmation_status ON darens
    FOR EACH ROW WHEN NEW.confirmation_status NOT IN ('待确认', '已确认', '已提交申诉')
    BEGIN SELECT RAISE(ABORT, 'invalid confirmation status'); END`);
  execute(db, 'CREATE INDEX IF NOT EXISTS idx_videos_daren_id ON videos(daren_id)');
  execute(db, 'CREATE INDEX IF NOT EXISTS idx_darens_batch_id ON darens(batch_id)');
  execute(db, 'CREATE INDEX IF NOT EXISTS idx_videos_batch_id ON videos(batch_id)');
  execute(db, 'CREATE INDEX IF NOT EXISTS idx_videos_platform ON videos(platform)');
  execute(db, 'CREATE INDEX IF NOT EXISTS idx_video_appeals_video_id ON video_appeals(video_id)');
  execute(db, 'CREATE INDEX IF NOT EXISTS idx_audit_table_record ON audit_logs(table_name, record_id)');
  execute(db, 'CREATE INDEX IF NOT EXISTS idx_operation_logs_created ON operation_logs(created_at DESC)');
  execute(db, 'CREATE INDEX IF NOT EXISTS idx_operation_logs_subject ON operation_logs(subject_nickname, created_at DESC)');
  execute(db, 'CREATE INDEX IF NOT EXISTS idx_operation_logs_batch ON operation_logs(batch_id, created_at DESC)');
  recordSchemaBaseline(db);
}

function prepare(sql) {
  return getDb().prepare(sql);
}

// Dynamic identifiers cannot use SQLite parameter binding.
function escapeColumn(col) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col)) throw new Error('Invalid column name: ' + col);
  return col;
}

module.exports = {
  CURRENT_SCHEMA_VERSION,
  initDb,
  initSchema,
  getDb,
  prepare,
  escapeColumn,
  migrateVideosTable,
  migrateBatchSchema,
  createVideoAppealsTable,
  withTransaction
};
